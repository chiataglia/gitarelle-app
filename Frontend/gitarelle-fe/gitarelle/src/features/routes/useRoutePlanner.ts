import { useEffect, useMemo, useRef, useState } from "react";
import type { LatLngLiteral } from "leaflet";
import { errorMessage } from "../../shared/api";
import type { ParsedGpx } from "../../shared/gpx";
import { lineDistance } from "../../shared/elevation";
import { asParsedGpx, fetchSegment, joinSegments, segmentKey, type Segment } from "./route";

export type SegmentState = { status: "loading" } | { status: "ok"; coords: Segment } | { status: "error"; message: string };

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

// distanza (m) di ogni tappa dalla partenza lungo il tracciato, per segnarle sul profilo altimetrico:
// somma dei tratti che la precedono (vuota finché il percorso non è completo)
function distancesOf(points: LatLngLiteral[], segments: Record<string, SegmentState>): number[] {
  const out = [0];
  for (const p of pairsOf(points)) {
    const s = segments[p.key];
    if (s?.status !== "ok") return [];
    out.push(out[out.length - 1] + lineDistance(s.coords));
  }
  return out.length > 1 ? out : [];
}

// Disegno di un percorso: tappe cliccate sulla mappa, tracciato tra una e l'altra calcolato lungo
// i sentieri (BRouter). La mappa lo disegna con <PlannerLayers>; a fine disegno "line" diventa un gpx.
export function useRoutePlanner() {
  const [waypoints, setWaypoints] = useState<LatLngLiteral[]>([]);
  const [history, setHistory] = useState<LatLngLiteral[][]>([]); // per "Annulla"
  const [segments, setSegments] = useState<Record<string, SegmentState>>({});
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
  // scambia due tappe (es. trascinando una sull'altra nel profilo): il percorso si ricalcola nel nuovo ordine
  const swap = (a: number, b: number) => change(waypoints.map((w, k) => (k === a ? waypoints[b] : k === b ? waypoints[a] : w)));
  const clear = () => change([]);

  // l'arrivo coincide già con la partenza (anello chiuso o andata e ritorno)
  const first = waypoints[0], last = waypoints[waypoints.length - 1];
  const endsAtStart = waypoints.length > 1 && first.lat === last.lat && first.lng === last.lng;

  // Andata e ritorno: si ripercorrono le tappe al contrario. I tratti del ritorno sono quelli dell'andata
  // capovolti (già calcolati): si torna davvero per lo stesso sentiero, senza chiedere un nuovo percorso
  // a BRouter, che potrebbe sceglierne un altro
  function returnSameWay() {
    if (waypoints.length < 2 || endsAtStart) return;
    setSegments((prev) => {
      const next = { ...prev };
      for (const { a, b, key } of pairsOf(waypoints)) {
        const s = prev[key];
        if (s?.status === "ok") next[segmentKey(b, a)] = { status: "ok", coords: [...s.coords].reverse() };
      }
      return next;
    });
    change([...waypoints, ...waypoints.slice(0, -1).reverse()]);
  }

  // Ultima tappa = punto di partenza: il tratto finale si calcola lungo i sentieri (anello)
  function endAtStart() {
    if (waypoints.length < 2 || endsAtStart) return;
    change([...waypoints, first]);
  }

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

  // chiudendo chi usa il disegno si interrompono le richieste ancora in corso
  useEffect(() => {
    const all = controllers.current;
    return () => all.forEach((c) => c.abort());
  }, []);

  const states = pairs.map((p) => segments[p.key] ?? { status: "loading" as const });
  const loading = states.some((s) => s.status === "loading");
  const error = states.find((s): s is Extract<SegmentState, { status: "error" }> => s.status === "error")?.message ?? null;
  const complete = pairs.length > 0 && states.every((s) => s.status === "ok");

  // linea completa (solo quando tutti i tratti sono calcolati): ricalcolata solo se cambiano punti o tratti
  const line = useMemo(() => buildLine(waypoints, segments), [waypoints, segments]);
  const track: ParsedGpx | null = useMemo(() => (line.length > 1 ? asParsedGpx(line) : null), [line]);

  const waypointDistances = useMemo(() => distancesOf(waypoints, segments), [waypoints, segments]);

  return {
    waypoints, addAt, setAddAt, add, move, remove, swap, clear, undo, canUndo: history.length > 0,
    returnSameWay, endAtStart, endsAtStart,
    pairs, states, loading, error, complete, line, track, waypointDistances,
  };
}

export type RoutePlanner = ReturnType<typeof useRoutePlanner>;
