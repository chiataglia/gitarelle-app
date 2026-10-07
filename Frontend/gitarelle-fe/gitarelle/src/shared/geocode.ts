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
