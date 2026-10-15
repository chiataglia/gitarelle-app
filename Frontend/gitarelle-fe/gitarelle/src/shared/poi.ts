// Punti di interesse da OpenStreetMap (Overpass API): cime, rifugi, acqua, panorami...
// Il server pubblico è gratuito e condiviso (limiti per IP, circa 10.000 richieste al giorno), quindi:
// - si scarica solo da POI_MIN_ZOOM in su (chi chiama aspetta anche che la mappa si fermi);
// - la mappa è divisa in celle fisse da CELL gradi: ogni cella si scarica una volta sola, con tutte
//   le categorie insieme (accendere o spegnere una categoria non rifà richieste);
// - una richiesta per volta; con 429/504 si aspetta 30 secondi prima di riprovare.

export const POI_MIN_ZOOM = 12;

// server pubblici, in ordine: se uno è sovraccarico o ci limita si passa al successivo
const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter", // VK Maps
];
const FETCH_TIMEOUT_MS = 60_000;
const CELL = 0.1; // gradi, circa 10 km
const MAX_CELLS = 200; // celle tenute in memoria (le più vecchie si scartano): pochi MB al massimo
const MAX_CELLS_PER_REQUEST = 40; // oltre (schermo enorme) non si chiede nulla
const RETRY_MS = 30_000;

export type PoiCategoryId = "peak" | "hut" | "water" | "viewpoint" | "pass" | "nature" | "history";

type Tags = Record<string, string>;

export type PoiCategory = {
  id: PoiCategoryId;
  label: string;
  icon: string;
  query: string[]; // statement overpass (la bbox è globale)
  match: (t: Tags) => boolean;
};

const HISTORIC = /^(castle|ruins|archaeological_site|monastery|fort|tower)$/;

export const POI_CATEGORIES: PoiCategory[] = [
  {
    id: "peak", label: "Cime", icon: "⛰️",
    query: ['node["natural"="peak"]'],
    match: (t) => t.natural === "peak",
  },
  {
    id: "hut", label: "Rifugi e bivacchi", icon: "🛖",
    query: ['nwr["tourism"~"^(alpine_hut|wilderness_hut)$"]'],
    match: (t) => t.tourism === "alpine_hut" || t.tourism === "wilderness_hut",
  },
  {
    id: "water", label: "Sorgenti e fontane", icon: "💧",
    query: ['node["natural"="spring"]', 'node["amenity"="drinking_water"]'],
    match: (t) => t.natural === "spring" || t.amenity === "drinking_water",
  },
  {
    id: "viewpoint", label: "Panorami", icon: "🔭",
    query: ['node["tourism"="viewpoint"]'],
    match: (t) => t.tourism === "viewpoint",
  },
  {
    id: "pass", label: "Passi e selle", icon: "🚩",
    query: ['node["mountain_pass"="yes"]'],
    match: (t) => t.mountain_pass === "yes",
  },
  {
    id: "nature", label: "Cascate e grotte", icon: "🌊",
    query: ['node["waterway"="waterfall"]', 'node["natural"="cave_entrance"]'],
    match: (t) => t.waterway === "waterfall" || t.natural === "cave_entrance",
  },
  {
    id: "history", label: "Castelli e rovine", icon: "🏰",
    query: [`nwr["historic"~"${HISTORIC.source}"]`],
    match: (t) => HISTORIC.test(t.historic ?? ""),
  },
];

export type Poi = {
  key: string; // "node/123"
  lat: number;
  lng: number;
  cat: PoiCategoryId;
  tags: Tags;
};

export type PoiStatus = "idle" | "loading" | "limited" | "error";

export type Bbox = { south: number; west: number; north: number; east: number };

// ---------- celle ----------

const cellOf = (lat: number, lng: number) => `${Math.floor(lat / CELL)}:${Math.floor(lng / CELL)}`;

export function cellsIn(b: Bbox): string[] {
  const keys: string[] = [];
  for (let y = Math.floor(b.south / CELL); y <= Math.floor(b.north / CELL); y++) {
    for (let x = Math.floor(b.west / CELL); x <= Math.floor(b.east / CELL); x++) keys.push(`${y}:${x}`);
  }
  return keys;
}

const parseCell = (key: string) => key.split(":").map(Number) as [number, number];

// ---------- memoria e stato (condivisi da tutte le mappe) ----------

const cache = new Map<string, Poi[]>(); // ordine di inserimento = dal meno al più recente
let status: PoiStatus = "idle";
let version = 0;
const listeners = new Set<() => void>();

function changed(next?: PoiStatus) {
  if (next) status = next;
  version++;
  listeners.forEach((l) => l());
}

export const subscribePoi = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const poiVersion = () => version;
export const poiStatus = () => status;

// punti già scaricati delle celle indicate (le segna come usate di recente)
export function cachedPois(keys: string[]): Poi[] {
  const out: Poi[] = [];
  for (const k of keys) {
    const pois = cache.get(k);
    if (!pois) continue;
    cache.delete(k);
    cache.set(k, pois);
    out.push(...pois);
  }
  return out;
}

// ---------- richieste: una per volta, conta solo l'ultima vista chiesta ----------

let busy = false;
let pending: string[] | null = null;
let pausedUntil = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

export function requestCells(keys: string[]) {
  pending = keys;
  void pump();
}

async function pump() {
  if (busy || retryTimer) return;
  const missing = (pending ?? []).filter((k) => !cache.has(k));
  pending = null;
  if (missing.length === 0 || missing.length > MAX_CELLS_PER_REQUEST) return;

  const wait = pausedUntil - Date.now();
  if (wait > 0) {
    pending = missing;
    retryTimer = setTimeout(() => { retryTimer = null; void pump(); }, wait);
    return;
  }

  busy = true;
  changed("loading");
  try {
    await download(missing);
    changed("idle");
  } catch (e) {
    // limite o server sovraccarico: si riprova la stessa zona fra 30 secondi (se nel frattempo
    // non se n'è chiesta un'altra)
    const limited = e instanceof OverpassBusy;
    pausedUntil = Date.now() + RETRY_MS;
    pending ??= missing;
    changed(limited ? "limited" : "error");
  } finally {
    busy = false;
  }
  void pump();
}

class OverpassBusy extends Error {}

async function download(keys: string[]) {
  // un solo riquadro che contiene tutte le celle mancanti
  const cells = keys.map(parseCell);
  const south = Math.min(...cells.map(([y]) => y)) * CELL;
  const north = (Math.max(...cells.map(([y]) => y)) + 1) * CELL;
  const west = Math.min(...cells.map(([, x]) => x)) * CELL;
  const east = (Math.max(...cells.map(([, x]) => x)) + 1) * CELL;

  const statements = POI_CATEGORIES.flatMap((c) => c.query).map((q) => `${q};`).join("");
  const query = `[out:json][timeout:25][bbox:${south},${west},${north},${east}];(${statements});out center tags;`;

  const json = await overpass(query);

  // tutte le celle del riquadro risultano scaricate, anche quelle rimaste vuote
  const fresh = new Map<string, Poi[]>();
  for (const k of cellsIn({ south: south + 1e-9, west: west + 1e-9, north: north - 1e-9, east: east - 1e-9 })) fresh.set(k, []);
  for (const el of json.elements) {
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    const tags = el.tags ?? {};
    const cat = POI_CATEGORIES.find((c) => c.match(tags));
    if (lat == null || lng == null || !cat) continue;
    fresh.get(cellOf(lat, lng))?.push({ key: `${el.type}/${el.id}`, lat, lng, cat: cat.id, tags });
  }
  for (const [k, pois] of fresh) {
    cache.delete(k);
    cache.set(k, pois);
  }
  while (cache.size > MAX_CELLS) cache.delete(cache.keys().next().value!);
}

// prova i server in ordine; OverpassBusy se nessuno risponde (limite, sovraccarico o rete)
async function overpass(query: string): Promise<{ elements: OverpassElement[] }> {
  let lastLimited = false;
  for (const url of OVERPASS_URLS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (res.ok) return await res.json();
      lastLimited = res.status === 429 || res.status === 406;
    } catch {
      lastLimited = false; // rete, CORS o timeout: si passa al server successivo
    }
  }
  throw lastLimited ? new OverpassBusy() : new Error("Overpass non raggiungibile");
}

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Tags;
};
