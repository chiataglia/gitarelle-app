import { useEffect, useRef } from "react";
import { MapContainer, useMap } from "react-leaflet";
import L, { type LatLngLiteral } from "leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import { TILE_MAX_ZOOM, isPinAddClick, pinAddIconFor, pinIconFor } from "../../../shared/map";
import type { ParsedGpx } from "../../../shared/gpx";
import TrackLayer from "../../../shared/TrackLayer";
import InvalidateOnResize from "../../../shared/InvalidateOnResize";
import ItalyView from "../../../shared/ItalyView";
import MapLayers from "../../../shared/MapLayers";

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

// Pin di tutti i trek, raggruppati in un cerchio col numero quando sono vicini sullo schermo.
// Con onAdd ogni pin ha un "+" accanto: il click sul "+" aggiunge, quello sul pin apre la scheda
function ClusterLayer({ items, onSelect, onAdd }: { items: ClusterItem[]; onSelect: (key: string) => void; onAdd?: (key: string) => void }) {
  const map = useMap();
  const group = useRef<L.MarkerClusterGroup | null>(null);
  // i marker non si ricreano a ogni render: leggono sempre le ultime onSelect/onAdd da qui
  const select = useRef(onSelect);
  const add = useRef(onAdd);
  useEffect(() => {
    select.current = onSelect;
    add.current = onAdd;
  });
  const adding = onAdd != null;

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
  const pinsKey = `${adding}|` + pins.map((i) => `${i.key}:${i.point!.lat},${i.point!.lng}:${i.color}:${i.label}`).join("|");
  useEffect(() => {
    const g = group.current;
    if (!g) return;
    g.clearLayers();
    g.addLayers(pins.map((i) => L.marker(i.point!, { icon: adding ? pinAddIconFor(i.color) : pinIconFor(i.color) })
      .bindTooltip(i.label, { direction: "top", offset: [0, -30] })
      .on("click", (e) => {
        if (add.current && isPinAddClick(e)) add.current(i.key);
        else select.current(i.key);
      })));
  }, [pinsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

// zoom di partenza sull'ultimo trek aggiunto: abbastanza vicino da vedere le tracce della zona
const START_ZOOM = 12;

// All'apertura inquadra la zona dell'ultimo trek aggiunto (startKey); quando cambia fitKey (es. cambio
// cartella) inquadra tutti i pin. Non ad ogni selezione: per il resto la mappa si muove liberamente
function FitView({ items, fitKey, startKey }: { items: ClusterItem[]; fitKey: string; startKey: string | null }) {
  const map = useMap();
  const fitted = useRef<string | null>(null);
  useEffect(() => {
    if (fitted.current === fitKey) return;
    if (fitted.current === null && startKey != null) {
      const start = items.find((i) => i.key === startKey);
      // trek senza punto: il pin è la partenza del gpx, che si aspetta finché non è scaricato
      if (start && !start.point) return;
      if (start?.point) {
        map.setView(start.point, START_ZOOM, { animate: false });
        fitted.current = fitKey;
        return;
      }
    }
    // pin e, se già scaricate, tracce intere: così le tracce non escono dal bordo
    const bounds = L.latLngBounds([]);
    for (const i of items) {
      if (i.point) bounds.extend(i.point);
      if (i.gpx?.bounds) bounds.extend(i.gpx.bounds);
    }
    if (!bounds.isValid()) return;
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    fitted.current = fitKey;
  }, [map, items, fitKey, startKey]);
  return null;
}

// Richiesta di inquadrare un trek (es. click sul nome in legenda); seq cambia a ogni click,
// così si può reinquadrare lo stesso trek dopo aver spostato la mappa
export type FocusRequest = { key: string; seq: number };

// zoom sulla traccia del trek richiesto (o sul suo punto, se la traccia non c'è);
// se la traccia arriva dopo (era ancora da scaricare) si reinquadra sulla traccia intera
function FocusOn({ items, focus }: { items: ClusterItem[]; focus: FocusRequest | null }) {
  const map = useMap();
  const hasTrack = focus != null && items.some((i) => i.key === focus.key && i.gpx?.bounds);
  useEffect(() => {
    if (!focus) return;
    const item = items.find((i) => i.key === focus.key);
    if (item?.gpx?.bounds) map.flyToBounds(item.gpx.bounds, { padding: [40, 40], duration: 0.8 });
    else if (item?.point) map.flyTo(item.point, 14, { duration: 0.8 });
  }, [map, focus, hasTrack]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

// comunica al genitore zoom e area visibile, per scaricare e disegnare solo le tracce che servono.
// L'ascolto si registra una volta sola (useMapEvents lo ricollega a ogni render, e un salto della mappa
// fatto proprio in quell'istante, es. il cambio cartella, andava perso: pin spostati ma tracce assenti).
// Va messo per primo nel <MapContainer>, così ascolta già quando gli altri inquadrano all'apertura
function ViewWatcher({ onChange }: { onChange: (view: MapView) => void }) {
  const map = useMap();
  const report = useRef(onChange);
  useEffect(() => {
    report.current = onChange;
  });
  useEffect(() => {
    const onMove = () => report.current({ zoom: map.getZoom(), bounds: map.getBounds() });
    onMove();
    map.on("moveend", onMove);
    return () => {
      map.off("moveend", onMove);
    };
  }, [map]);
  return null;
}

type Props = {
  items: ClusterItem[];
  tracks: ClusterItem[]; // sottoinsieme di items di cui disegnare la traccia
  fitKey: string;
  startKey: string | null; // trek su cui si apre la mappa (l'ultimo aggiunto)
  onViewChange: (view: MapView) => void;
  onSelect: (key: string) => void; // click su un pin o su una traccia
  onAdd?: (key: string) => void;   // modalità "Aggiungi": "+" accanto a ogni pin per metterlo nella cartella
  focus: FocusRequest | null;      // trek da inquadrare
};

// Mappa dello storico: numeri per zona da lontano, tracce da vicino
export default function TrekClusterMap({ items, tracks, fitKey, startKey, onViewChange, onSelect, onAdd, focus }: Props) {
  return (
    <MapContainer center={[42.5, 12.5]} zoom={6} maxZoom={TILE_MAX_ZOOM} style={{ height: "100%", width: "100%" }}>
      <ViewWatcher onChange={onViewChange} />
      <MapLayers />
      <ItalyView />
      <ClusterLayer items={items} onSelect={onSelect} onAdd={onAdd} />
      {tracks.map((i) => i.gpx && (
        <TrackLayer key={i.key} gpx={i.gpx} trackKey={i.key} color={i.color} label={i.label} fit={false} pin={false} onClick={() => onSelect(i.key)} />
      ))}
      <FitView items={items} fitKey={fitKey} startKey={startKey} />
      <FocusOn items={items} focus={focus} />
      <InvalidateOnResize />
    </MapContainer>
  );
}
