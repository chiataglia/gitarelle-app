import type { Position } from "geojson";
import type { ParsedGpx } from "./gpx";

// Un punto del profilo altimetrico, a distanza costante dal precedente
export type ProfilePoint = {
  d: number;     // metri dalla partenza
  ele: number;   // quota (m), smussata
  slope: number; // pendenza in % (positiva in salita, negativa in discesa)
  lat: number;
  lng: number;
};

export type Profile = {
  points: ProfilePoint[];
  distance: number; // metri
  minEle: number;
  maxEle: number;
};

const EARTH_RADIUS_M = 6_371_000;
const MAX_SAMPLES = 800;     // abbastanza per un grafico fluido, pochi per restare leggero
const SMOOTH_M = 30;         // media mobile sulla quota: toglie i saltelli del gps
const SLOPE_WINDOW_M = 100;  // la pendenza si misura su ~100 m, non punto per punto

function haversine(a: Position, b: Position) {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

// lunghezza (m) di una linea [lon, lat, ...], misurata come nel profilo
export function lineDistance(coords: Position[]): number {
  let d = 0;
  for (let i = 1; i < coords.length; i++) d += haversine(coords[i - 1], coords[i]);
  return d;
}

// segmenti della traccia (o della rotta) in ordine; i waypoint isolati non contano
function segments(gpx: ParsedGpx): Position[][] {
  const out: Position[][] = [];
  for (const f of gpx.geojson.features) {
    const g = f.geometry;
    if (g?.type === "LineString") out.push(g.coordinates);
    else if (g?.type === "MultiLineString") out.push(...g.coordinates);
  }
  return out;
}

export type TrackStats = { distance: number; gain: number | null; loss: number | null }; // metri; gain/loss null se mancano le quote

const statsCache = new WeakMap<ParsedGpx, TrackStats>();

// Distanza e dislivello positivo e negativo di una traccia, con lo stesso metodo del backend (GpxMetrics):
// niente distanza tra un segmento e l'altro, variazioni di quota sotto i 3 m ignorate (rumore del gps).
// Il risultato resta in memoria per ogni traccia: si può chiamare a ogni render.
export function trackStats(gpx: ParsedGpx): TrackStats {
  const cached = statsCache.get(gpx);
  if (cached) return cached;
  let distance = 0, gain = 0, loss = 0, hasEle = false;
  let ref: number | null = null;
  for (const seg of segments(gpx)) {
    for (let i = 0; i < seg.length; i++) {
      if (i > 0) distance += haversine(seg[i - 1], seg[i]);
      const ele = seg[i][2];
      if (typeof ele !== "number" || !Number.isFinite(ele)) continue;
      hasEle = true;
      if (ref == null) ref = ele;
      else if (ele - ref >= 3) { gain += ele - ref; ref = ele; }
      else if (ref - ele >= 3) { loss += ref - ele; ref = ele; }
    }
  }
  const stats = { distance, gain: hasEle ? gain : null, loss: hasEle ? loss : null };
  statsCache.set(gpx, stats);
  return stats;
}

// Tempo di percorrenza secondo la DIN 33466 (quella dei club alpini tedesco e austriaco):
// 4 km/h in piano, 300 m/h in salita, 500 m/h in discesa; si somma il tempo maggiore
// tra orizzontale e verticale con metà del minore. Escluse le soste.
// null se la traccia non ha quote: senza dislivello la stima sarebbe fuorviante.
export function hikingMinutes(stats: TrackStats): number | null {
  if (stats.gain == null || stats.loss == null) return null;
  const horizontal = (stats.distance / 1000 / 4) * 60;
  const vertical = (stats.gain / 300 + stats.loss / 500) * 60;
  return Math.max(horizontal, vertical) + Math.min(horizontal, vertical) / 2;
}

const MOVE_WINDOW_S = 30; // la velocità si misura su tratti di almeno 30 s: i saltelli del gps da fermi non sono cammino
const MIN_SPEED = 0.25;   // m/s in pianta (~0,9 km/h): sotto si è fermi...
const MIN_CLIMB = 0.04;   // ...a meno di salire o scendere di almeno ~150 m/h (ferrate, salite ripide: si avanza poco in pianta)

// segmenti della traccia con l'orario di ogni punto (ms), dove il gpx lo registra
function timedSegments(gpx: ParsedGpx): { p: Position; t: number }[][] {
  const out: { p: Position; t: number }[][] = [];
  const add = (coords: Position[], times: unknown) => {
    if (!Array.isArray(times)) return;
    const seg: { p: Position; t: number }[] = [];
    coords.forEach((p, i) => {
      const t = typeof times[i] === "string" ? Date.parse(times[i]) : NaN;
      if (Number.isFinite(t)) seg.push({ p, t });
    });
    out.push(seg);
  };
  for (const f of gpx.geojson.features) {
    const g = f.geometry;
    const times = f.properties?.coordinateProperties?.times; // togeojson: un array per linea
    if (g?.type === "LineString") add(g.coordinates, times);
    else if (g?.type === "MultiLineString") g.coordinates.forEach((c, k) => add(c, Array.isArray(times) ? times[k] : undefined));
  }
  return out;
}

const movingCache = new WeakMap<ParsedGpx, number | null>();

// Tempo in movimento registrato nel gpx (minuti), soste escluse; null se i punti non hanno l'orario
// (percorsi disegnati o esportati senza tempi). Un tratto conta se ci si è spostati abbastanza in pianta
// o in quota; le pause, anche con la registrazione sospesa e ripresa nello stesso punto, restano fuori
export function movingMinutes(gpx: ParsedGpx): number | null {
  if (movingCache.has(gpx)) return movingCache.get(gpx)!;
  let moving = 0, timed = false;
  for (const pts of timedSegments(gpx)) {
    let i = 0;
    while (i < pts.length - 1) {
      let j = i + 1;
      while (j < pts.length - 1 && pts[j].t - pts[i].t < MOVE_WINDOW_S * 1000) j++;
      const dt = (pts[j].t - pts[i].t) / 1000;
      if (dt > 0) {
        timed = true;
        const [a, b] = [pts[i].p, pts[j].p];
        const climb = typeof a[2] === "number" && typeof b[2] === "number" ? Math.abs(b[2] - a[2]) : 0;
        if (haversine(a, b) / dt >= MIN_SPEED || climb / dt >= MIN_CLIMB) moving += dt;
      }
      i = j;
    }
  }
  const result = timed ? moving / 60 : null;
  movingCache.set(gpx, result);
  return result;
}

// Orari registrati nel gpx: partenza e arrivo (ms) e tempo in movimento; null se i punti non hanno l'orario
export type RecordedTimes = { start: number; end: number; movingMinutes: number };

export function recordedTimes(gpx: ParsedGpx): RecordedTimes | null {
  let start = Infinity, end = -Infinity;
  for (const seg of timedSegments(gpx)) {
    for (const { t } of seg) {
      if (t < start) start = t;
      if (t > end) end = t;
    }
  }
  const moving = movingMinutes(gpx);
  return end > start && moving != null ? { start, end, movingMinutes: moving } : null;
}

// Tempo da mostrare per una traccia: quello registrato nel gpx se ci sono gli orari, altrimenti la stima DIN 33466
export type TrackDuration = { minutes: number; recorded: boolean };

export function trackDuration(gpx: ParsedGpx): TrackDuration | null {
  const recorded = movingMinutes(gpx);
  if (recorded != null && recorded > 0) return { minutes: recorded, recorded: true };
  const estimate = hikingMinutes(trackStats(gpx));
  return estimate != null ? { minutes: estimate, recorded: false } : null;
}

// Profilo altimetrico ricampionato a passo costante, con quota smussata e pendenza.
// null se il gpx non ha (abbastanza) quote: alcuni percorsi pianificati non le hanno.
export function computeProfile(gpx: ParsedGpx): Profile | null {
  // punti grezzi con distanza cumulata; tra un segmento e l'altro non si aggiunge distanza (come nel backend)
  const raw: { d: number; ele: number; lat: number; lng: number }[] = [];
  let total = 0, count = 0;
  for (const seg of segments(gpx)) {
    for (let i = 0; i < seg.length; i++) {
      count++;
      if (i > 0) total += haversine(seg[i - 1], seg[i]);
      const ele = seg[i][2];
      if (typeof ele === "number" && Number.isFinite(ele)) raw.push({ d: total, ele, lat: seg[i][1], lng: seg[i][0] });
    }
  }
  if (raw.length < 2 || raw.length < count / 2 || total < 50) return null;

  // ricampionamento a passo costante (interpolazione lineare tra i punti grezzi)
  const step = Math.max(10, total / MAX_SAMPLES);
  const n = Math.floor(total / step) + 1;
  const d: number[] = [], ele: number[] = [], lat: number[] = [], lng: number[] = [];
  let j = 0;
  for (let i = 0; i < n; i++) {
    const di = Math.min(i * step, total);
    while (j < raw.length - 2 && raw[j + 1].d < di) j++;
    const a = raw[j], b = raw[j + 1];
    const t = b.d > a.d ? Math.min(Math.max((di - a.d) / (b.d - a.d), 0), 1) : 0;
    d.push(di);
    ele.push(a.ele + (b.ele - a.ele) * t);
    lat.push(a.lat + (b.lat - a.lat) * t);
    lng.push(a.lng + (b.lng - a.lng) * t);
  }

  // quota smussata con una media mobile
  const w = Math.max(1, Math.round(SMOOTH_M / step));
  const smooth = ele.map((_, i) => {
    let sum = 0, k = 0;
    for (let x = Math.max(0, i - w); x <= Math.min(n - 1, i + w); x++) { sum += ele[x]; k++; }
    return sum / k;
  });

  // pendenza centrata su una finestra di ~100 m
  const half = Math.max(1, Math.round(SLOPE_WINDOW_M / 2 / step));
  const points: ProfilePoint[] = smooth.map((e, i) => {
    const a = Math.max(0, i - half), b = Math.min(n - 1, i + half);
    const run = d[b] - d[a];
    return { d: d[i], ele: e, slope: run > 0 ? ((smooth[b] - smooth[a]) / run) * 100 : 0, lat: lat[i], lng: lng[i] };
  });

  return {
    points,
    distance: total,
    minEle: Math.min(...smooth),
    maxEle: Math.max(...smooth),
  };
}

// Colore della pendenza (in valore assoluto: salite e discese ripide sono entrambe rosse):
// verde → giallo → arancione → bordeaux, sfumatura continua tra questi punti (oltre il 30% resta bordeaux).
export const SLOPE_STOPS: [number, string][] = [
  [0, "#4caf50"],  // piano
  [10, "#fdd835"], // si comincia a salire
  [20, "#fb8c00"], // ripido
  [30, "#7b1626"], // molto ripido
];

// Quanta parte di ogni intervallo tra due colori è sfumata (al centro dell'intervallo);
// il resto è colore pieno. 1 = sfumatura continua, 0 = cambi netti a gradino.
export const SLOPE_BLEND = 0.3;

const hexToRgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

export function slopeColor(slope: number): string {
  const s = Math.abs(slope);
  for (let i = 1; i < SLOPE_STOPS.length; i++) {
    const [s1, c1] = SLOPE_STOPS[i];
    if (s <= s1) {
      const [s0, c0] = SLOPE_STOPS[i - 1];
      const lin = s1 > s0 ? (s - s0) / (s1 - s0) : 0;
      const t = SLOPE_BLEND > 0
        ? Math.min(Math.max((lin - 0.5) / SLOPE_BLEND + 0.5, 0), 1)
        : lin < 0.5 ? 0 : 1;
      const a = hexToRgb(c0), b = hexToRgb(c1);
      return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * t)).join(",")})`;
    }
  }
  return SLOPE_STOPS[SLOPE_STOPS.length - 1][1];
}
