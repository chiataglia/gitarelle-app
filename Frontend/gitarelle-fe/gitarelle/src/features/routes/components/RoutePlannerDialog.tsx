import { useEffect, useMemo, useRef, useState } from "react";
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L, { type LatLngLiteral } from "leaflet";
import Modal from "../../../shared/Modal";
import { TILE_ATTRIBUTION, TILE_MAX_ZOOM, TILE_URL, TRACK_COLOR } from "../../../shared/map";
import { computeProfile, slopeColor, trackStats, type ProfilePoint } from "../../../shared/elevation";
import { formatGain, formatKm } from "../../../shared/format";
import { errorMessage } from "../../../shared/api";
import ElevationProfile from "../../treks/components/ElevationProfile";
import PlaceSearch from "../../wishes/components/PlaceSearch";
import { asParsedGpx, fetchSegment, joinSegments, segmentKey, toGpxFile, type Segment } from "../route";
import styles from "./RoutePlanner.module.css";

type SegmentState = { status: "loading" } | { status: "ok"; coords: Segment } | { status: "error"; message: string };

export type PlannedRoute = { file: File; start: LatLngLiteral };

type Props = {
  name: string;                  // nome del file gpx (es. il nome dell'idea)
  center?: LatLngLiteral | null; // dove aprire la mappa (es. il punto già scelto)
  onDone: (route: PlannedRoute) => void;
  onClose: () => void;
};

// pin numerati dei punti di passaggio: il primo verde (partenza), l'ultimo ambra (arrivo)
function waypointIcon(n: number, kind: "start" | "end" | "via") {
  return L.divIcon({ className: `gt-wp gt-wp-${kind}`, html: `<span>${n}</span>`, iconSize: [26, 26] });
}

// il dialog si apre dopo che la mappa è nata: quando il contenitore prende misura si avvisa leaflet
function KeepSize() {
  const map = useMap();
  useEffect(() => {
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(map.getContainer());
    return () => ro.disconnect();
  }, [map]);
  return null;
}

function AddOnClick({ onAdd }: { onAdd: (p: LatLngLiteral) => void }) {
  useMapEvents({ click: (e) => onAdd({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

function FlyTo({ target }: { target: LatLngLiteral | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, Math.max(map.getZoom(), 14), { duration: 0.8 });
  }, [map, target]);
  return null;
}

// coppie di punti consecutivi, ognuna è un tratto da calcolare
const pairsOf = (points: LatLngLiteral[]) =>
  points.slice(1).map((b, i) => ({ a: points[i], b, key: segmentKey(points[i], b) }));

// tracciato intero, solo se tutti i tratti sono calcolati (altrimenti vuoto)
function buildLine(points: LatLngLiteral[], segments: Record<string, SegmentState>): Segment {
  const parts: Segment[] = [];
  for (const p of pairsOf(points)) {
    const s = segments[p.key];
    if (s?.status !== "ok") return [];
    parts.push(s.coords);
  }
  return joinSegments(parts);
}

// Disegno di un percorso: si cliccano i punti di passaggio e il tracciato tra uno e l'altro
// viene calcolato lungo i sentieri (BRouter). Alla fine diventa un file gpx come uno caricato.
export default function RoutePlannerDialog({ name, center, onDone, onClose }: Props) {
  const [waypoints, setWaypoints] = useState<LatLngLiteral[]>([]);
  const [history, setHistory] = useState<LatLngLiteral[][]>([]); // per "Annulla"
  const [segments, setSegments] = useState<Record<string, SegmentState>>({});
  const [flyTo, setFlyTo] = useState<LatLngLiteral | null>(null);
  const [profilePoint, setProfilePoint] = useState<ProfilePoint | null>(null);
  const controllers = useRef(new Set<AbortController>());

  function change(next: LatLngLiteral[]) {
    setHistory((h) => [...h, waypoints]);
    setWaypoints(next);
  }
  // le nuove tappe si aggiungono in fondo (allungano l'arrivo) o all'inizio (anticipano la partenza)
  const [addAt, setAddAt] = useState<"end" | "start">("end");
  const add = (p: LatLngLiteral) => change(addAt === "start" ? [p, ...waypoints] : [...waypoints, p]);
  const move = (i: number, p: LatLngLiteral) => change(waypoints.map((w, k) => (k === i ? p : w)));
  const remove = (i: number) => change(waypoints.filter((_, k) => k !== i));
  function undo() {
    if (!history.length) return;
    setWaypoints(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
  }

  // tratti tra punti consecutivi: si calcolano solo quelli nuovi (gli altri restano in memoria).
  // Un tratto non ancora in "segments" è in calcolo.
  const pairs = pairsOf(waypoints);
  const pairsKey = pairs.map((p) => p.key).join(";");
  const inFlight = useRef(new Set<string>());
  useEffect(() => {
    for (const { a, b, key } of pairs) {
      if (segments[key] || inFlight.current.has(key)) continue;
      inFlight.current.add(key);
      const ctrl = new AbortController();
      controllers.current.add(ctrl);
      fetchSegment(a, b, ctrl.signal)
        .then((coords) => setSegments((s) => ({ ...s, [key]: { status: "ok", coords } })))
        .catch((e) => {
          if (!ctrl.signal.aborted) setSegments((s) => ({ ...s, [key]: { status: "error", message: errorMessage(e) } }));
        })
        .finally(() => {
          controllers.current.delete(ctrl);
          inFlight.current.delete(key);
        });
    }
  }, [pairsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // chiudendo il dialog si interrompono le richieste ancora in corso
  useEffect(() => {
    const all = controllers.current;
    return () => all.forEach((c) => c.abort());
  }, []);

  const states = pairs.map((p) => segments[p.key] ?? { status: "loading" as const });
  const loading = states.some((s) => s.status === "loading");
  const errorState = states.find((s): s is Extract<SegmentState, { status: "error" }> => s.status === "error");
  const complete = pairs.length > 0 && states.every((s) => s.status === "ok");

  // linea completa (solo quando tutti i tratti sono calcolati): ricalcolata solo se cambiano punti o tratti
  const line = useMemo(() => buildLine(waypoints, segments), [waypoints, segments]);
  const track = useMemo(() => (line.length > 1 ? asParsedGpx(line) : null), [line]);
  const profile = useMemo(() => (track ? computeProfile(track) : null), [track]);
  const gain = track ? trackStats(track).gain ?? 0 : 0;

  function onUse() {
    if (!complete) return;
    onDone({ file: toGpxFile(line, name), start: waypoints[0] });
  }

  return (
    <Modal title="Disegna un percorso" onClose={onClose} xl>
      <div className={styles.layout}>
        <div className={`map-frame ${styles.map}`}>
          <MapContainer
            center={center ?? { lat: 42.5, lng: 12.5 }}
            zoom={center ? 13 : 6}
            maxZoom={TILE_MAX_ZOOM}
            style={{ height: "100%", width: "100%", cursor: "crosshair" }}
          >
            <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} maxZoom={TILE_MAX_ZOOM} />
            <KeepSize />
            <AddOnClick onAdd={add} />
            <FlyTo target={flyTo} />

            {pairs.map(({ a, b, key }, i) => {
              const s = states[i];
              return s.status === "ok" ? (
                <Polyline key={key} positions={s.coords.map(([lon, lat]) => [lat, lon] as [number, number])}
                  pathOptions={{ color: TRACK_COLOR, weight: 5, opacity: 0.95, lineCap: "round", lineJoin: "round" }} />
              ) : (
                // tratto in calcolo (tratteggiato) o senza sentiero (rosso)
                <Polyline key={key} positions={[a, b]}
                  pathOptions={{ color: s.status === "error" ? "#ff7b72" : "#ffffff", weight: 3, opacity: 0.8, dashArray: "4 8" }} />
              );
            })}

            {waypoints.map((w, i) => (
              <Marker
                key={i}
                position={w}
                draggable
                icon={waypointIcon(i + 1, i === 0 ? "start" : i === waypoints.length - 1 && i > 0 ? "end" : "via")}
                eventHandlers={{
                  click: () => remove(i),
                  dragend: (e) => {
                    const p = (e.target as L.Marker).getLatLng();
                    move(i, { lat: p.lat, lng: p.lng });
                  },
                }}
              />
            ))}

            {profilePoint && (
              <CircleMarker center={[profilePoint.lat, profilePoint.lng]} radius={7}
                pathOptions={{ color: "#fff", weight: 3, fillColor: slopeColor(profilePoint.slope), fillOpacity: 1 }} />
            )}
          </MapContainer>
          {waypoints.length === 0 && <div className={styles.mapHint}>Clicca sulla mappa per mettere la partenza</div>}
          {waypoints.length === 1 && <div className={styles.mapHint}>Clicca per aggiungere la prossima tappa</div>}
        </div>

        <aside className={styles.side}>
          <PlaceSearch onPick={(p) => setFlyTo(p.pos)} />

          <div className={styles.addAt}>
            <span>Nuove tappe</span>
            <div className={styles.segmented} role="radiogroup" aria-label="Dove aggiungere le nuove tappe">
              <button type="button" role="radio" aria-checked={addAt === "start"} className={addAt === "start" ? styles.segActive : ""} onClick={() => setAddAt("start")}>
                ⇤ All'inizio
              </button>
              <button type="button" role="radio" aria-checked={addAt === "end"} className={addAt === "end" ? styles.segActive : ""} onClick={() => setAddAt("end")}>
                In fondo ⇥
              </button>
            </div>
          </div>

          <ul className={styles.help}>
            <li><b>Clic</b> sulla mappa: aggiunge una tappa {addAt === "start" ? "prima della partenza" : "dopo l'arrivo"}</li>
            <li><b>Trascina</b> una tappa per spostarla</li>
            <li><b>Clic</b> su una tappa per toglierla</li>
          </ul>

          <div className={styles.stats}>
            <div><span>Distanza</span><b>{profile ? formatKm(profile.distance) : "—"}</b></div>
            <div><span>Salita</span><b>{complete ? `+${formatGain(gain)}` : "—"}</b></div>
            <div><span>Tappe</span><b>{waypoints.length}</b></div>
          </div>

          <div className={styles.tools}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={undo} disabled={!history.length}>↶ Annulla</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => change([])} disabled={!waypoints.length}>Ricomincia</button>
          </div>

          {loading && <p className={styles.status}>Calcolo del percorso lungo i sentieri…</p>}
          {errorState && <div className="alert alert-error">{errorState.message}</div>}

          <p className={styles.credit}>Percorsi calcolati con BRouter su dati © OpenStreetMap contributors</p>
        </aside>

        {profile && (
          <div className={styles.profile}>
            <ElevationProfile profile={profile} onHover={setProfilePoint} />
          </div>
        )}

        <div className={styles.footer}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Annulla</button>
          <button type="button" className="btn btn-primary" onClick={onUse} disabled={!complete}>
            Usa questo percorso
          </button>
        </div>
      </div>
    </Modal>
  );
}
