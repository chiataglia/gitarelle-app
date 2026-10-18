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
import HomeButton from "../../../shared/HomeButton";

// da questo zoom in su i gruppi si sciolgono e compaiono le tracce dei trek inquadrati
export const TRACK_ZOOM = 10;

export type ClusterItem = {
  key: string;
  label: string;
  color: string;
  point: LatLngLiteral | null; // dove sta il pin (punto del trek o partenza del gpx)
  gpx: ParsedGpx | null;       // disegnata solo se il trek è inquadrato e lo zoom è sufficiente
  trackPending?: boolean;      // traccia ancora in download
};

export type MapView = { zoom: number; bounds: L.LatLngBounds };

// Pin di tutti i trek, raggruppati in un cerchio col numero quando sono vicini sullo schermo.
// Con onAdd ogni pin ha un "+" accanto: il click sul "+" aggiunge, quello sul pin apre la scheda
function ClusterLayer({ items, onSelect, onAdd, onClusterClick }: {
  items: ClusterItem[];
  onSelect: (key: string) => void;
  onAdd?: (key: string) => void;
  onClusterClick: (keys: string[]) => void;
}) {
  const map = useMap();
  const group = useRef<L.MarkerClusterGroup | null>(null);
  // trek di ogni marker, per sapere quali trek stanno in un gruppo cliccato
  const keyOf = useRef(new WeakMap<L.Marker, string>());
  // i marker non si ricreano a ogni render: leggono sempre le ultime onSelect/onAdd da qui
  const select = useRef(onSelect);
  const add = useRef(onAdd);
  const clusterClick = useRef(onClusterClick);
  useEffect(() => {
    select.current = onSelect;
    add.current = onAdd;
    clusterClick.current = onClusterClick;
  });
  const adding = onAdd != null;

  useEffect(() => {
    const g = L.markerClusterGroup({
      disableClusteringAtZoom: TRACK_ZOOM,
      showCoverageOnHover: false,
      maxClusterRadius: 60,
      // niente "ventaglio" dei pin: il click sul numero vola sulla zona (vedi clusterclick)
      zoomToBoundsOnClick: false,
      spiderfyOnMaxZoom: false,
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
    // il genitore inquadra le tracce intere dei trek del gruppo (vedi FocusOn)
    g.on("clusterclick", (e) => {
      const cluster = (e as L.LeafletEvent & { layer: L.MarkerCluster }).layer;
      const keys = cluster.getAllChildMarkers().map((m: L.Marker) => keyOf.current.get(m)).filter((k: string | undefined): k is string => k != null);
      if (keys.length > 0) clusterClick.current(keys);
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
    g.addLayers(pins.map((i) => {
      const m = L.marker(i.point!, { icon: adding ? pinAddIconFor(i.color) : pinIconFor(i.color) })
        .bindTooltip(i.label, { direction: "top", offset: [0, -30] })
        .on("click", (e) => {
          if (add.current && isPinAddClick(e)) add.current(i.key);
          else select.current(i.key);
        });
      keyOf.current.set(m, i.key);
      return m;
    }));
  }, [pinsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

// All'apertura resta l'Italia intera (ItalyView); quando cambia fitKey (es. cambio cartella)
// inquadra tutti i pin. Non ad ogni selezione: per il resto la mappa si muove liberamente
function FitView({ items, fitKey }: { items: ClusterItem[]; fitKey: string }) {
  const map = useMap();
  const fitted = useRef(fitKey);
  useEffect(() => {
    if (fitted.current === fitKey) return;
    // pin e, se già scaricate, tracce intere: così le tracce non escono dal bordo
    const bounds = L.latLngBounds([]);
    for (const i of items) {
      if (i.point) bounds.extend(i.point);
      if (i.gpx?.bounds) bounds.extend(i.gpx.bounds);
    }
    if (!bounds.isValid()) return;
    // volo morbido verso la nuova zona (fitBounds, da lontano, salta di colpo)
    map.flyToBounds(bounds, { padding: [40, 40], maxZoom: 13, duration: 0.9, easeLinearity: 0.2 });
    fitted.current = fitKey;
  }, [map, items, fitKey]);
  return null;
}

// Richiesta di inquadrare uno o più trek (es. click sul nome in lista o su un gruppo sulla mappa);
// seq cambia a ogni click, così si può reinquadrare gli stessi trek dopo aver spostato la mappa
export type FocusRequest = { keys: string[]; seq: number };

// volo sulle tracce dei trek richiesti (o sui loro punti, se la traccia non c'è). Se qualche traccia è
// ancora in download si aspetta che arrivi, così il volo è uno solo e finisce già sulle tracce intere
function FocusOn({ items, focus }: { items: ClusterItem[]; focus: FocusRequest | null }) {
  const map = useMap();
  const targets = focus != null ? items.filter((i) => focus.keys.includes(i.key)) : [];
  const ready = targets.length > 0 && targets.every((i) => !i.trackPending);
  useEffect(() => {
    if (!focus || !ready) return;
    const bounds = L.latLngBounds([]);
    for (const i of items) {
      if (!focus.keys.includes(i.key)) continue;
      if (i.gpx?.bounds) bounds.extend(i.gpx.bounds);
      else if (i.point) bounds.extend(i.point);
    }
    if (!bounds.isValid()) return;
    // un punto solo (nessuna traccia): zoom fisso, se no si andrebbe allo zoom massimo
    if (bounds.getNorthEast().equals(bounds.getSouthWest())) map.flyTo(bounds.getCenter(), 14, { duration: 1.1, easeLinearity: 0.2 });
    else map.flyToBounds(bounds, { padding: [40, 40], duration: 1.1, easeLinearity: 0.2 });
  }, [map, focus, ready]); // eslint-disable-line react-hooks/exhaustive-deps
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
  onViewChange: (view: MapView) => void;
  onSelect: (key: string) => void; // click su un pin o su una traccia
  onAdd?: (key: string) => void;   // modalità "Aggiungi": "+" accanto a ogni pin per metterlo nella cartella
  focus: FocusRequest | null;      // trek da inquadrare
  onFocus: (keys: string[]) => void; // click su un gruppo: inquadrare i suoi trek
};

// Mappa dello storico: numeri per zona da lontano, tracce da vicino
export default function TrekClusterMap({ items, tracks, fitKey, onViewChange, onSelect, onAdd, focus, onFocus }: Props) {
  return (
    <MapContainer center={[42.5, 12.5]} zoom={6} maxZoom={TILE_MAX_ZOOM} style={{ height: "100%", width: "100%" }}>
      <ViewWatcher onChange={onViewChange} />
      <MapLayers />
      <ItalyView />
      <HomeButton />
      <ClusterLayer items={items} onSelect={onSelect} onAdd={onAdd} onClusterClick={onFocus} />
      {tracks.map((i) => i.gpx && (
        <TrackLayer key={i.key} gpx={i.gpx} trackKey={i.key} color={i.color} label={i.label} fit={false} pin={false} onClick={() => onSelect(i.key)} />
      ))}
      <FitView items={items} fitKey={fitKey} />
      <FocusOn items={items} focus={focus} />
      <InvalidateOnResize />
    </MapContainer>
  );
}
