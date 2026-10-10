import type { Position } from "geojson";
import type { LatLngLiteral } from "leaflet";
import type { ParsedGpx } from "../../shared/gpx";

// Calcolo dei percorsi lungo i sentieri con BRouter (open source, dati OpenStreetMap).
// Server pubblico gratuito, senza chiave: si chiama solo quando cambiano i punti, un tratto alla volta.
const BROUTER_URL = "https://brouter.de/brouter";
const PROFILE = "hiking-mountain"; // escursionismo: preferisce sentieri e mulattiere, accetta pendenze forti

// Tratto calcolato tra due punti di passaggio: [lon, lat, quota]
export type Segment = Position[];

const coord = (p: LatLngLiteral) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`;

// chiave del tratto tra due punti (i tratti già calcolati si riusano spostando altri punti)
export const segmentKey = (a: LatLngLiteral, b: LatLngLiteral) => `${coord(a)}|${coord(b)}`;

export async function fetchSegment(a: LatLngLiteral, b: LatLngLiteral, signal?: AbortSignal): Promise<Segment> {
  const url = `${BROUTER_URL}?lonlats=${coord(a)}|${coord(b)}&profile=${PROFILE}&alternativeidx=0&format=geojson`;
  let res: Response;
  try {
    res = await fetch(url, { signal });
  } catch (e) {
    if (signal?.aborted) throw e;
    throw new Error("Servizio dei percorsi non raggiungibile");
  }
  // se non trova un percorso BRouter risponde con un testo d'errore (es. punto lontano da qualsiasi sentiero)
  if (!res.ok) throw new Error("Nessun sentiero trovato tra questi punti: prova ad avvicinarli a un sentiero");
  const data = await res.json();
  const coords: Position[] | undefined = data?.features?.[0]?.geometry?.coordinates;
  if (!coords?.length) throw new Error("Nessun sentiero trovato tra questi punti");
  return coords;
}

// unisce i tratti in un'unica linea (il primo punto di ogni tratto coincide con l'ultimo del precedente)
export function joinSegments(segments: Segment[]): Position[] {
  const out: Position[] = [];
  for (const seg of segments) out.push(...(out.length ? seg.slice(1) : seg));
  return out;
}

// stessa forma di un gpx letto da file, così grafico e statistiche funzionano uguali
export function asParsedGpx(line: Position[]): ParsedGpx {
  return {
    geojson: { type: "FeatureCollection", features: [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: line } }] },
    info: line.length ? { start: { lat: line[0][1], lng: line[0][0] } } : {},
    bounds: null,
  };
}

const escapeXml = (s: string) =>
  s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!);

// File gpx 1.1 con una traccia: è quello che si salva, come se fosse stato caricato dal computer
export function toGpxFile(line: Position[], name: string): File {
  const title = name.trim() || "Percorso disegnato";
  const points = line
    .map(([lon, lat, ele]) =>
      `      <trkpt lat="${lat.toFixed(6)}" lon="${lon.toFixed(6)}">${ele != null ? `<ele>${ele.toFixed(1)}</ele>` : ""}</trkpt>`)
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Gitarelle (percorso calcolato con BRouter, dati © OpenStreetMap contributors)" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${escapeXml(title)}</name></metadata>
  <trk>
    <name>${escapeXml(title)}</name>
    <trkseg>
${points}
    </trkseg>
  </trk>
</gpx>
`;
  const fileName = `${title.replace(/[^\p{L}\p{N} _-]+/gu, "").trim().replace(/\s+/g, "-") || "percorso"}.gpx`;
  return new File([xml], fileName, { type: "application/gpx+xml" });
}
