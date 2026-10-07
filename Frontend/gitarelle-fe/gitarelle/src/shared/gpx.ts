import type { FeatureCollection, Geometry } from "geojson";
import * as toGeoJSON from "@tmcw/togeojson";
import L, { type LatLngLiteral } from "leaflet";

export type Geo = FeatureCollection<Geometry>;

// Dati letti dal file gpx (usati per precompilare un nuovo trek)
export type GpxInfo = {
  name?: string;
  date?: string; // "YYYY-MM-DD"
  start?: LatLngLiteral;
};

export type ParsedGpx = {
  geojson: Geo;
  info: GpxInfo;
  bounds: L.LatLngBounds | null;
};

export function parseGpx(text: string): ParsedGpx {
  const xml = new DOMParser().parseFromString(text, "text/xml");
  const geojson = toGeoJSON.gpx(xml) as Geo;
  return { geojson, info: readGpxInfo(xml), bounds: computeBounds(geojson) };
}

function computeBounds(geo: Geo): L.LatLngBounds | null {
  const bounds = L.latLngBounds([]);
  let hasAny = false;

  const pushCoord = (lng: number, lat: number) => {
    bounds.extend([lat, lng]);
    hasAny = true;
  };

  const walkCoords = (coords: unknown) => {
    if (!Array.isArray(coords)) return;
    if (typeof coords[0] === "number" && typeof coords[1] === "number") {
      pushCoord(coords[0], coords[1]);
      return;
    }
    for (const c of coords) walkCoords(c);
  };

  for (const f of geo.features) {
    if (!f.geometry || !("coordinates" in f.geometry)) continue;
    walkCoords(f.geometry.coordinates);
  }

  return hasAny ? bounds : null;
}

function readGpxInfo(xml: Document): GpxInfo {
  const first = (tag: string) => xml.getElementsByTagName(tag)[0];
  const text = (el?: Element) => el?.textContent?.trim() || undefined;

  // nome: traccia → rotta → metadata
  const name = text(first("trk")?.getElementsByTagName("name")[0])
    ?? text(first("rte")?.getElementsByTagName("name")[0])
    ?? text(first("metadata")?.getElementsByTagName("name")[0]);

  const startEl = first("trkpt") ?? first("rtept") ?? first("wpt");
  const lat = Number(startEl?.getAttribute("lat"));
  const lon = Number(startEl?.getAttribute("lon"));
  const start = startEl && !isNaN(lat) && !isNaN(lon) ? { lat, lng: lon } : undefined;

  // data: primo punto con orario, altrimenti metadata
  const time = text(startEl?.getElementsByTagName("time")[0])
    ?? text(first("metadata")?.getElementsByTagName("time")[0]);
  const date = time && /^\d{4}-\d{2}-\d{2}/.test(time) ? time.slice(0, 10) : undefined;

  return { name, date, start };
}
