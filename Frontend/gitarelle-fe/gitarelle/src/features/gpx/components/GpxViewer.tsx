import { useMemo, useState } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import type { FeatureCollection, Geometry } from "geojson";
import * as toGeoJSON from "@tmcw/togeojson";
import L from "leaflet";

type Geo = FeatureCollection<Geometry>;

function computeBounds(geo: Geo): L.LatLngBounds | null {
  const bounds = L.latLngBounds([]);
  let hasAny = false;

  const pushCoord = (lng: number, lat: number) => {
    bounds.extend([lat, lng]);
    hasAny = true;
  };

  const walkCoords = (coords: any) => {
    if (!coords) return;
    // Point: [lng, lat]
    if (typeof coords[0] === "number" && typeof coords[1] === "number") {
      pushCoord(coords[0], coords[1]);
      return;
    }
    // Nested arrays (LineString, MultiLineString, etc.)
    for (const c of coords) walkCoords(c);
  };

  for (const f of geo.features) {
    if (!f.geometry) continue;
    walkCoords((f.geometry as any).coordinates);
  }

  return hasAny ? bounds : null;
}

export default function GpxViewer() {
  const [geojson, setGeojson] = useState<Geo | null>(null);
  const [fileName, setFileName] = useState<string>("");

  const center: [number, number] = [41.944, 12.456]; // La mia stanza come default

  const bounds = useMemo(() => (geojson ? computeBounds(geojson) : null), [geojson]);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const text = await file.text();
    const xml = new DOMParser().parseFromString(text, "text/xml");

    // Converte GPX (XML) -> GeoJSON (FeatureCollection)
    const converted = toGeoJSON.gpx(xml) as Geo;

    // TODO VD Se vuoi: filtrare solo le LineString (track/route) e ignorare waypoint
    // const onlyLines = {
    //   ...converted,
    //   features: converted.features.filter(f =>
    //     f.geometry?.type === "LineString" || f.geometry?.type === "MultiLineString"
    //   ),
    // } as Geo;

    setGeojson(converted);
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <input type="file" accept=".gpx" onChange={onPickFile} />
        {fileName ? <span>Caricato: <b>{fileName}</b></span> : <span>Nessun file</span>}
        {geojson && (
          <button onClick={() => { setGeojson(null); setFileName(""); }}>
            Reset
          </button>
        )}
      </div>

      <div style={{ height: 520, borderRadius: 12, overflow: "hidden" }}>
        <MapContainer
          center={center}
          zoom={11}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {geojson && (
            <>
              <GeoJSON
                data={geojson}
                // Styling semplice della traccia
                style={(feature) => {
                  const t = feature?.geometry?.type;
                  if (t === "LineString" || t === "MultiLineString") {
                    return { weight: 4 };
                  }
                  return { weight: 2, opacity: 0.8 };
                }}
              />

              {/* Fit bounds “manuale” senza componenti extra */}
              {bounds && <FitBounds bounds={bounds} />}
            </>
          )}
        </MapContainer>
      </div>
    </div>
  );
}

// Piccolo helper per fare fitBounds quando cambia la traccia
import { useMap } from "react-leaflet";
function FitBounds({ bounds }: { bounds: L.LatLngBounds }) {
  const map = useMap();
  // appena renderizza, inquadra
  map.fitBounds(bounds, { padding: [20, 20] });
  return null;
}