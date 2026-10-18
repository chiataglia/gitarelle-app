import type { LatLngLiteral } from "leaflet";

// Ricerca di un luogo per nome con Nominatim (OpenStreetMap): gratuito e senza chiave API.
// Regole d'uso: max 1 richiesta al secondo, niente ricerca "mentre scrivi" → si cerca solo su invio/click.
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

export type Place = {
  key: string;
  name: string;        // nome breve (es. "Monte Rosa")
  description: string; // indirizzo completo
  pos: LatLngLiteral;
};

type NominatimResult = {
  place_id: number;
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
};

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const params = new URLSearchParams({ q: query, format: "jsonv2", limit: "6", "accept-language": "it" });
  let res: Response;
  try {
    res = await fetch(`${NOMINATIM_URL}?${params}`, { signal });
  } catch (e) {
    if (signal?.aborted) throw e;
    throw new Error("Servizio di ricerca luoghi non raggiungibile");
  }
  if (!res.ok) throw new Error(`Ricerca luoghi non riuscita (${res.status})`);
  const results = (await res.json()) as NominatimResult[];
  return results.map((r) => ({
    key: String(r.place_id),
    name: r.name || r.display_name.split(",")[0],
    description: r.display_name,
    pos: { lat: Number(r.lat), lng: Number(r.lon) },
  }));
}

// ---------- comune di un punto (reverse geocoding Nominatim) ----------
// Risultati in memoria e in localStorage: lo stesso punto non si chiede due volte (regole d'uso di Nominatim)
const REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";
const COMUNE_CACHE_KEY = "gt-comuni";
const comuneCache = new Map<string, string | null>();
const comunePending = new Map<string, Promise<string | null>>();

try {
  const saved = JSON.parse(localStorage.getItem(COMUNE_CACHE_KEY) ?? "{}") as Record<string, string | null>;
  for (const [k, v] of Object.entries(saved)) comuneCache.set(k, v);
} catch {
  // localStorage non disponibile o illeggibile: si riparte senza cache
}

type NominatimAddress = {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  hamlet?: string;
  country?: string;
  country_code?: string;
  "ISO3166-2-lvl6"?: string; // provincia, es. "IT-BL"
  "ISO3166-2-lvl4"?: string; // regione, es. "IT-23" (Valle d'Aosta)
};

// ~10 m: punti praticamente uguali condividono la risposta
const comuneKey = (p: LatLngLiteral) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;

export function cachedComune(p: LatLngLiteral): string | null | undefined {
  return comuneCache.get(comuneKey(p));
}

// "Courmayeur (AO)" in Italia, "Chamonix-Mont-Blanc (Francia)" all'estero; null se non è in nessun comune (es. in mare)
export function comuneOf(p: LatLngLiteral): Promise<string | null> {
  const key = comuneKey(p);
  if (comuneCache.has(key)) return Promise.resolve(comuneCache.get(key)!);
  const pending = comunePending.get(key);
  if (pending) return pending;
  const params = new URLSearchParams({ lat: String(p.lat), lon: String(p.lng), format: "jsonv2", zoom: "10", addressdetails: "1", "accept-language": "it" });
  const req = fetch(`${REVERSE_URL}?${params}`)
    .then((res) => {
      if (!res.ok) throw new Error(`Comune non trovato (${res.status})`);
      return res.json() as Promise<{ address?: NominatimAddress }>;
    })
    .then(({ address: a }) => {
      const name = a && (a.city ?? a.town ?? a.village ?? a.municipality ?? a.hamlet);
      let comune: string | null = null;
      if (name) {
        // la Valle d'Aosta non ha province in OSM: la sigla è AO
        const province = a["ISO3166-2-lvl6"]?.startsWith("IT-") ? a["ISO3166-2-lvl6"].slice(3) : a["ISO3166-2-lvl4"] === "IT-23" ? "AO" : null;
        comune = a.country_code === "it" ? (province ? `${name} (${province})` : name) : `${name}${a.country ? ` (${a.country})` : ""}`;
      }
      comuneCache.set(key, comune);
      try {
        localStorage.setItem(COMUNE_CACHE_KEY, JSON.stringify(Object.fromEntries(comuneCache)));
      } catch {
        // spazio esaurito o storage bloccato: resta la cache in memoria
      }
      return comune;
    })
    .finally(() => comunePending.delete(key));
  comunePending.set(key, req);
  return req;
}
