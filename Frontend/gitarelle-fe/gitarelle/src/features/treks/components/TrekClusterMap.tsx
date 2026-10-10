import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L, { type LatLngLiteral } from "leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import { TILE_ATTRIBUTION, TILE_MAX_ZOOM, TILE_URL, pinIconFor } from "../../../shared/map";
import type { ParsedGpx } from "../../../shared/gpx";
import TrackLayer from "../../../shared/TrackLayer";

// da questo zoom in su i gruppi si sciolgono e compaiono le tracce dei trek inquadrati
export const TRACK_ZOOM = 10;

export type ClusterItem = {
  key: string;
  label: string;
  color: string;
  point: LatLngLiteral | null; // dove sta il pin (punto del trek o partenza del gpx)
  gpx: ParsedGpx | null;       // disegnata solo se il trek è inquadrato e lo zoom è sufficiente
};

export type MapView = { zoom: number; bounds: L.LatLngBounds };

// Pin di tutti i trek, raggruppati in un cerchio col numero quando sono vicini sullo schermo
function ClusterLayer({ items }: { items: ClusterItem[] }) {
  const map = useMap();
  const group = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    const g = L.markerClusterGroup({
      disableClusteringAtZoom: TRACK_ZOOM,
      showCoverageOnHover: false,
      maxClusterRadius: 60,
      iconCreateFunction: (cluster) => {
        const n = cluster.getChildCount();
        const size = n < 10 ? 36 : n < 100 ? 44 : 52;
        return L.divIcon({
          className: "gt-cluster",
          html: `<span>${n}</span>`,
          iconSize: [size, size],
        });
      },
    });
    group.current = g;
    map.addLayer(g);
    return () => {
      map.removeLayer(g);
      group.current = null;
    };
  }, [map]);

  // i pin si ricreano solo se cambia qualcosa che li riguarda (non quando arriva una traccia)
  const pins = items.filter((i) => i.point);
  const pinsKey = pins.map((i) => `${i.key}:${i.point!.lat},${i.point!.lng}:${i.color}:${i.label}`).join("|");
  useEffect(() => {
    const g = group.current;
    if (!g) return;
    g.clearLayers();
    g.addLayers(pins.map((i) => L.marker(i.point!, { icon: pinIconFor(i.color) })
      .bindTooltip(i.label, { direction: "top", offset: [0, -30] })));
  }, [pinsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

// inquadra tutti i pin: all'apertura e quando cambia fitKey (es. cambio cartella), non ad ogni selezione
function FitAll({ items, fitKey }: { items: ClusterItem[]; fitKey: string }) {
  const map = useMap();
  const fitted = useRef<string | null>(null);
  useEffect(() => {
    if (fitted.current === fitKey) return;
    const bounds = L.latLngBounds([]);
    for (const i of items) if (i.point) bounds.extend(i.point);
    if (!bounds.isValid()) return;
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    fitted.current = fitKey;
  }, [map, items, fitKey]);
  return null;
}

// comunica al genitore zoom e area visibile, per scaricare solo le tracce che servono
function ViewWatcher({ onChange }: { onChange: (view: MapView) => void }) {
  const map = useMapEvents({
    moveend: () => onChange({ zoom: map.getZoom(), bounds: map.getBounds() }),
  });
  useEffect(() => {
    onChange({ zoom: map.getZoom(), bounds: map.getBounds() });
  }, [map]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

type Props = {
  items: ClusterItem[];
  tracks: ClusterItem[]; // sottoinsieme di items di cui disegnare la traccia
  fitKey: string;
  onViewChange: (view: MapView) => void;
};

// Mappa dello storico: numeri per zona da lontano, tracce da vicino
export default function TrekClusterMap({ items, tracks, fitKey, onViewChange }: Props) {
  return (
    <MapContainer center={[42.5, 12.5]} zoom={6} maxZoom={TILE_MAX_ZOOM} style={{ height: "100%", width: "100%" }}>
      <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} maxZoom={TILE_MAX_ZOOM} />
      <ClusterLayer items={items} />
      {tracks.map((i) => i.gpx && (
        <TrackLayer key={i.key} gpx={i.gpx} trackKey={i.key} color={i.color} label={i.label} fit={false} pin={false} />
      ))}
      <FitAll items={items} fitKey={fitKey} />
      <ViewWatcher onChange={onViewChange} />
    </MapContainer>
  );
}
