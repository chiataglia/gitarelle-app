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

export type TrackStats = { distance: number; gain: number | null }; // metri; gain null se mancano le quote

const statsCache = new WeakMap<ParsedGpx, TrackStats>();

// Distanza e dislivello positivo di una traccia, con lo stesso metodo del backend (GpxMetrics):
// niente distanza tra un segmento e l'altro, variazioni di quota sotto i 3 m ignorate (rumore del gps).
// Il risultato resta in memoria per ogni traccia: si può chiamare a ogni render.
export function trackStats(gpx: ParsedGpx): TrackStats {
  const cached = statsCache.get(gpx);
  if (cached) return cached;
  let distance = 0, gain = 0, hasEle = false;
  let ref: number | null = null;
  for (const seg of segments(gpx)) {
    for (let i = 0; i < seg.length; i++) {
      if (i > 0) distance += haversine(seg[i - 1], seg[i]);
      const ele = seg[i][2];
      if (typeof ele !== "number" || !Number.isFinite(ele)) continue;
      hasEle = true;
      if (ref == null) ref = ele;
      else if (ele - ref >= 3) { gain += ele - ref; ref = ele; }
      else if (ref - ele >= 3) ref = ele;
    }
  }
  const stats = { distance, gain: hasEle ? gain : null };
  statsCache.set(gpx, stats);
  return stats;
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
// verde del tema in piano, poi rosso sempre più scuro. Sfumatura continua tra questi punti.
export const SLOPE_STOPS: [number, string][] = [
  [0, "#7fd8a0"],  // piano (--fresh)
  [3, "#7fd8a0"],
  [8, "#ff9a8a"],  // si comincia a salire
  [15, "#e5484d"], // ripido
  [25, "#a3202a"], // molto ripido
  [35, "#6e1018"], // durissimo
];

const hexToRgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

export function slopeColor(slope: number): string {
  const s = Math.abs(slope);
  for (let i = 1; i < SLOPE_STOPS.length; i++) {
    const [s1, c1] = SLOPE_STOPS[i];
    if (s <= s1) {
      const [s0, c0] = SLOPE_STOPS[i - 1];
      const t = s1 > s0 ? (s - s0) / (s1 - s0) : 0;
      const a = hexToRgb(c0), b = hexToRgb(c1);
      return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * t)).join(",")})`;
    }
  }
  return SLOPE_STOPS[SLOPE_STOPS.length - 1][1];
}
