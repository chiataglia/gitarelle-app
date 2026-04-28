import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import type { FeatureCollection, Geometry } from "geojson";
import * as toGeoJSON from "@tmcw/togeojson";
import L from "leaflet";
import type { Trek } from "../../treks/types";

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
    if (typeof coords[0] === "number" && typeof coords[1] === "number") {
      pushCoord(coords[0], coords[1]);
      return;
    }
    for (const c of coords) walkCoords(c);
  };

  for (const f of geo.features) {
    if (!f.geometry) continue;
    walkCoords((f.geometry as any).coordinates);
  }

  return hasAny ? bounds : null;
}

function FitBounds({ bounds }: { bounds: L.LatLngBounds }) {
  const map = useMap();
  map.fitBounds(bounds, { padding: [20, 20] });
  return null;
}

export default function GpxViewer() {
  const [treks, setTreks] = useState<Trek[]>([]);
  const [selectedTrekId, setSelectedTrekId] = useState<string>("");

  const [geojson, setGeojson] = useState<Geo | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [gpxTitle, setGpxTitle] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const center: [number, number] = [41.944, 12.456];
  const bounds = useMemo(() => (geojson ? computeBounds(geojson) : null), [geojson]);

  useEffect(() => {
    fetch("http://localhost:8080/api/treks")
      .then((r) => r.json())
      .then((data: Trek[]) => setTreks(data))
      .catch(() => {});
  }, []);

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setSaveOk(false);
    setSaveError(null);
    setFileName(file.name);
    setRawFile(file);

    const text = await file.text();
    const xml = new DOMParser().parseFromString(text, "text/xml");
    const converted = toGeoJSON.gpx(xml) as Geo;
    setGeojson(converted);
  }

  async function onSave() {
    if (!rawFile || !selectedTrekId) return;

    setSaving(true);
    setSaveOk(false);
    setSaveError(null);

    try {
      const formData = new FormData();
      formData.append("file", rawFile);
      if (gpxTitle.trim()) formData.append("title", gpxTitle.trim());

      const res = await fetch(`http://localhost:8080/api/treks/${selectedTrekId}/gpx`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Errore ${res.status}. ${text}`);
      }

      setSaveOk(true);
    } catch (err: any) {
      setSaveError(err.message ?? "Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  }

  function onReset() {
    setGeojson(null);
    setFileName("");
    setRawFile(null);
    setGpxTitle("");
    setSaveOk(false);
    setSaveError(null);
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <input type="file" accept=".gpx" onChange={onPickFile} />

        {fileName ? (
          <span>Caricato: <b>{fileName}</b></span>
        ) : (
          <span>Nessun file</span>
        )}

        {geojson && (
          <button onClick={onReset}>Reset</button>
        )}
      </div>

      {geojson && (
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <label htmlFor="gpxTrekSelect">Trek:</label>
            <select
              id="gpxTrekSelect"
              value={selectedTrekId}
              onChange={(e) => {
                setSelectedTrekId(e.target.value);
                setSaveOk(false);
                setSaveError(null);
              }}
            >
              <option value="">-- seleziona un trek --</option>
              {treks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}{t.trekDate ? ` (${t.trekDate})` : ""}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Titolo GPX (opzionale)"
              value={gpxTitle}
              onChange={(e) => setGpxTitle(e.target.value)}
              style={{ minWidth: 200 }}
            />

            <button onClick={onSave} disabled={saving || !selectedTrekId}>
              {saving ? "Salvataggio..." : "Salva nel DB"}
            </button>

            {saveOk && <span style={{ color: "green" }}>GPX salvato!</span>}
            {saveError && <span style={{ color: "crimson" }}>{saveError}</span>}
          </div>
        </div>
      )}

      <div style={{ height: 520, borderRadius: 12, overflow: "hidden" }}>
        <MapContainer center={center} zoom={11} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {geojson && (
            <>
              <GeoJSON
                data={geojson}
                style={(feature) => {
                  const t = feature?.geometry?.type;
                  if (t === "LineString" || t === "MultiLineString") return { weight: 4 };
                  return { weight: 2, opacity: 0.8 };
                }}
              />
              {bounds && <FitBounds bounds={bounds} />}
            </>
          )}
        </MapContainer>
      </div>
    </div>
  );
}
