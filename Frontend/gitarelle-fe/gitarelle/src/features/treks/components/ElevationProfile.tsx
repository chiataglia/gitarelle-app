import { useEffect, useId, useRef, useState } from "react";
import { slopeColor, type Profile, type ProfilePoint } from "../../../shared/elevation";
import styles from "./ElevationProfile.module.css";

const fmt = (n: number, digits = 0) => n.toLocaleString("it-IT", { maximumFractionDigits: digits });

// passo "tondo" (1, 2, 2.5, 5 × 10^n) per avere circa `count` tacche su un intervallo
function niceStep(span: number, count: number) {
  const raw = span / Math.max(count, 1);
  const pow = 10 ** Math.floor(Math.log10(raw));
  return ([1, 2, 2.5, 5, 10].find((m) => m * pow >= raw) ?? 10) * pow;
}

const MAX_GRADIENT_STOPS = 240;
const LINE_WIDTH = 3.5;       // spessore del bordo del profilo
const SEPARATOR_WIDTH = 0.5;    // contorno scuro attorno al bordo, sopra e sotto (px)
const AREA_OPACITY = 0.35;   // opacità dell'area sotto il bordo (1 = piena come il bordo, 0 = invisibile)

// scala della pendenza nella legenda: da piano a 35% (oltre il colore non cambia più)
const LEGEND_MAX = 35;
const LEGEND_TICKS: [string, number][] = [["piano", 0], ["10%", 10], ["20%", 20], ["30%+", 30]];

// punto notevole da segnare sul profilo (es. le tappe di un percorso disegnato), con lo stesso numero e
// colore del pin sulla mappa. Sta sull'asse x (distanza), con una guida fino alla linea del profilo
export type ProfileMarker = { d: number; label: string; kind: "start" | "via" | "end" };

const MARKER_FILL: Record<ProfileMarker["kind"], string> = { start: "var(--fresh)", via: "var(--text)", end: "var(--accent)" };

type Props = {
  profile: Profile;
  onHover?: (point: ProfilePoint | null) => void; // per mostrare il punto sulla mappa
  markers?: ProfileMarker[];
  // con questi le tappe si cliccano e si trascinano lungo l'asse: al rilascio arriva il punto della
  // traccia alla nuova distanza (chi usa il profilo ci sposta la tappa)
  onMarkerClick?: (index: number) => void;
  onMarkerMove?: (index: number, point: ProfilePoint) => void;
};

// tappa in trascinamento: distanza di partenza e attuale
type Drag = { i: number; from: number; d: number };

// Profilo altimetrico: quota (y) sulla distanza (x, km), area colorata secondo la pendenza.
// Una sola serie: niente legenda di serie, solo la scala dei colori della pendenza sotto.
export default function ElevationProfile({ profile, onHover, markers, onMarkerClick, onMarkerMove }: Props) {
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const movable = onMarkerMove != null;
  const wrapRef = useRef<HTMLDivElement>(null);
  const gradientId = useId();

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { points, distance, minEle, maxEle } = profile;
  // con le tappe sull'asse serve un po' più di spazio sotto, tra i cerchietti e le etichette dei km
  const H = markers?.length ? 210 : 200, top = 12, bottom = markers?.length ? 34 : 24, left = 48, right = 12;
  const innerW = Math.max(width - left - right, 0), innerH = H - top - bottom;

  // asse y: da poco sotto il minimo a poco sopra il massimo (un profilo non parte da quota 0)
  const yStep = niceStep(Math.max(maxEle - minEle, 20), 4);
  const yLo = Math.floor(minEle / yStep) * yStep;
  const yHi = Math.max(Math.ceil(maxEle / yStep) * yStep, yLo + yStep);
  const yTicks: number[] = [];
  for (let v = yLo; v <= yHi + 1e-6; v += yStep) yTicks.push(v);

  // asse x in km: una tacca ogni ~80px
  const km = distance / 1000;
  const xStep = niceStep(km, Math.max(2, Math.floor(innerW / 80)));
  const xTicks: number[] = [];
  for (let v = 0; v <= km + 1e-6; v += xStep) xTicks.push(v);

  const x = (d: number) => left + (distance > 0 ? (d / distance) * innerW : 0);
  const y = (e: number) => top + innerH - ((e - yLo) / (yHi - yLo)) * innerH;

  const line = points.map((p, i) => `${i ? "L" : "M"}${x(p.d).toFixed(1)},${y(p.ele).toFixed(1)}`).join("");
  const area = `${line}L${x(distance)},${top + innerH}L${left},${top + innerH}Z`;

  // sfumatura lungo x: un colore per gruppo di punti (la pendenza media del gruppo)
  const per = Math.ceil(points.length / MAX_GRADIENT_STOPS);
  const stops: { offset: number; color: string }[] = [];
  for (let i = 0; i < points.length; i += per) {
    const group = points.slice(i, i + per);
    const slope = group.reduce((s, p) => s + p.slope, 0) / group.length;
    stops.push({ offset: distance > 0 ? group[Math.floor(group.length / 2)].d / distance : 0, color: slopeColor(slope) });
  }

  function setHoverIndex(i: number | null) {
    setHover(i);
    onHover?.(i == null ? null : points[i]);
  }

  // i punti sono a passo costante: l'indice si ricava direttamente dalla distanza
  const indexAt = (d: number) => Math.min(Math.max(Math.round((d / distance) * (points.length - 1)), 0), points.length - 1);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (innerW <= 0) return;
    const mx = e.clientX - e.currentTarget.getBoundingClientRect().left;
    let d = Math.min(Math.max((mx - left) / innerW, 0), 1) * distance;
    if (drag && markers) {
      // una tappa non scavalca le vicine: resta tra la precedente e la successiva
      const gap = distance * 0.005;
      const lo = drag.i > 0 ? markers[drag.i - 1].d + gap : 0;
      const hi = drag.i < markers.length - 1 ? markers[drag.i + 1].d - gap : distance;
      d = Math.min(Math.max(d, lo), hi);
      setDrag({ ...drag, d });
    }
    setHoverIndex(indexAt(d));
  };

  function startDrag(e: React.PointerEvent, i: number, d: number) {
    if (!movable && !onMarkerClick) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ i, from: d, d });
  }

  // rilascio: spostata di poco è un clic, altrimenti la tappa va al punto della traccia sotto il cursore
  function endDrag() {
    if (!drag) return;
    setDrag(null);
    if (movable && Math.abs(drag.d - drag.from) > distance * 0.003) onMarkerMove(drag.i, points[indexAt(drag.d)]);
    else onMarkerClick?.(drag.i);
  }

  const hp = hover != null ? points[hover] : null;

  // quota alla distanza d: i punti sono a passo costante, quindi l'indice si ricava direttamente
  const eleAt = (d: number) => points[indexAt(d)]?.ele ?? minEle;
  const summary = `Profilo altimetrico: ${fmt(km, 1)} km, quota da ${fmt(minEle)} a ${fmt(maxEle)} metri`;
  // la legenda campiona slopeColor ogni 0,5%, così mostra gli stessi passaggi netti del grafico
  const legendStops = Array.from({ length: LEGEND_MAX * 2 + 1 }, (_, i) => `${slopeColor(i / 2)} ${(i / 2 / LEGEND_MAX) * 100}%`);
  const legendGradient = `linear-gradient(90deg, ${legendStops.join(", ")})`;

  return (
    <figure className={styles.chart}>
      <figcaption className={styles.head}>
        <span className={styles.title}>Profilo altimetrico</span>
        <span className={styles.range}>min {fmt(minEle)} m · max {fmt(maxEle)} m</span>
      </figcaption>

      <div ref={wrapRef} className={styles.wrap}>
        {width > 0 && (
          <svg
            width={width}
            height={H}
            role="img"
            aria-label={summary}
            onPointerMove={onMove}
            onPointerLeave={() => { if (!drag) setHoverIndex(null); }}
          >
            <defs>
              <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1={left} x2={left + innerW} y1="0" y2="0">
                {stops.map((s, i) => <stop key={i} offset={s.offset} stopColor={s.color} />)}
              </linearGradient>
            </defs>

            {/* griglia e asse y (quota) */}
            {yTicks.map((v) => (
              <g key={v}>
                <line x1={left} x2={left + innerW} y1={y(v)} y2={y(v)} className={styles.grid} />
                <text x={left - 8} y={y(v)} className={styles.axisLabel} textAnchor="end" dominantBaseline="middle">{fmt(v)} m</text>
              </g>
            ))}
            {/* asse x (km) */}
            {xTicks.map((v) => (
              <text key={v} x={x(v * 1000)} y={H - 6} className={styles.axisLabel} textAnchor="middle">{fmt(v, 1)}{v === 0 ? "" : " km"}</text>
            ))}

            <path d={area} fill={`url(#${gradientId})`} fillOpacity={AREA_OPACITY} />
            {/* contorno del bordo: linea scura più larga sotto quella colorata, sporge sopra e sotto */}
            <path d={line} fill="none" stroke="#223a2d" strokeWidth={LINE_WIDTH + 2 * SEPARATOR_WIDTH}
              strokeLinejoin="round" strokeLinecap="round" />
            <path d={line} fill="none" stroke={`url(#${gradientId})`} strokeWidth={LINE_WIDTH} strokeLinejoin="round" strokeLinecap="round" />

            {/* tappe: cerchietto numerato sull'asse x, con una guida tenue fino alla linea del profilo */}
            {markers?.map((m, i) => {
              const d = drag?.i === i ? drag.d : m.d;
              const cx = x(Math.min(Math.max(d, 0), distance)), cy = y(eleAt(d)), base = top + innerH;
              const active = drag?.i === i;
              return (
                <g key={i} pointerEvents="none">
                  <line x1={cx} x2={cx} y1={cy} y2={base} className={`${styles.markerGuide} ${active ? styles.markerGuideActive : ""}`} />
                  <circle cx={cx} cy={cy} r={3} fill={MARKER_FILL[m.kind]} className={styles.markerDot} />
                  <g
                    className={`${movable || onMarkerClick ? styles.markerHandle : ""} ${active ? styles.markerDragging : ""}`}
                    pointerEvents={movable || onMarkerClick ? "all" : "none"}
                    onPointerDown={(e) => startDrag(e, i, m.d)}
                    onPointerUp={endDrag}
                    onPointerCancel={() => setDrag(null)}
                  >
                    {movable && <title>{`Tappa ${m.label}: trascina per spostarla lungo il percorso`}</title>}
                    <circle cx={cx} cy={base} r={active ? 11 : 9} fill={MARKER_FILL[m.kind]} className={styles.marker} />
                    <text x={cx} y={base} className={styles.markerLabel} textAnchor="middle" dominantBaseline="central">{m.label}</text>
                  </g>
                </g>
              );
            })}

            {/* mirino */}
            {hp && (
              <g pointerEvents="none">
                <line x1={x(hp.d)} x2={x(hp.d)} y1={top} y2={top + innerH} className={styles.crosshair} />
                <circle cx={x(hp.d)} cy={y(hp.ele)} r={5} fill={slopeColor(hp.slope)} className={styles.dot} />
              </g>
            )}
          </svg>
        )}

        {hp && (
          <div
            className={styles.tooltip}
            role="presentation"
            // il tooltip sta dalla parte opposta al bordo più vicino, per non uscire dal grafico
            style={x(hp.d) > width / 2 ? { right: width - x(hp.d) + 10 } : { left: x(hp.d) + 10 }}
          >
            <b>{fmt(hp.d / 1000, 2)} km</b>
            <span>{fmt(hp.ele)} m</span>
            <span>
              <i className={styles.swatch} style={{ background: slopeColor(hp.slope) }} aria-hidden="true" />
              {hp.slope >= 0.5 ? "↗" : hp.slope <= -0.5 ? "↘" : "→"} {fmt(Math.abs(hp.slope))}%
            </span>
          </div>
        )}
      </div>

      {/* scala dei colori della pendenza */}
      <div className={styles.legend} aria-hidden="true">
        <span>Pendenza</span>
        <div className={styles.legendBar}>
          <div style={{ background: legendGradient }} />
          <div className={styles.legendTicks}>
            {LEGEND_TICKS.map(([label, s]) => (
              <span key={label} style={{ left: `${(s / LEGEND_MAX) * 100}%` }}>{label}</span>
            ))}
          </div>
        </div>
      </div>
    </figure>
  );
}
