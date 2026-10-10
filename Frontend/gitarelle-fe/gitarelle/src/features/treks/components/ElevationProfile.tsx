import { useEffect, useId, useRef, useState } from "react";
import { SLOPE_STOPS, slopeColor, type Profile, type ProfilePoint } from "../../../shared/elevation";
import styles from "./ElevationProfile.module.css";

const fmt = (n: number, digits = 0) => n.toLocaleString("it-IT", { maximumFractionDigits: digits });

// passo "tondo" (1, 2, 2.5, 5 × 10^n) per avere circa `count` tacche su un intervallo
function niceStep(span: number, count: number) {
  const raw = span / Math.max(count, 1);
  const pow = 10 ** Math.floor(Math.log10(raw));
  return ([1, 2, 2.5, 5, 10].find((m) => m * pow >= raw) ?? 10) * pow;
}

const MAX_GRADIENT_STOPS = 240;

// scala della pendenza nella legenda: da piano a 35% (oltre il colore non cambia più)
const LEGEND_MAX = 35;
const LEGEND_TICKS: [string, number][] = [["piano", 0], ["10%", 10], ["20%", 20], ["30%+", 30]];

type Props = {
  profile: Profile;
  onHover?: (point: ProfilePoint | null) => void; // per mostrare il punto sulla mappa
};

// Profilo altimetrico: quota (y) sulla distanza (x, km), area colorata secondo la pendenza.
// Una sola serie: niente legenda di serie, solo la scala dei colori della pendenza sotto.
export default function ElevationProfile({ profile, onHover }: Props) {
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
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
  const H = 200, top = 12, bottom = 24, left = 48, right = 12;
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

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (innerW <= 0) return;
    const mx = e.clientX - e.currentTarget.getBoundingClientRect().left;
    const d = Math.min(Math.max((mx - left) / innerW, 0), 1) * distance;
    // i punti sono a passo costante: l'indice si ricava direttamente
    const i = Math.round((d / distance) * (points.length - 1));
    setHoverIndex(Math.min(Math.max(i, 0), points.length - 1));
  };

  const hp = hover != null ? points[hover] : null;
  const summary = `Profilo altimetrico: ${fmt(km, 1)} km, quota da ${fmt(minEle)} a ${fmt(maxEle)} metri`;
  const legendGradient = `linear-gradient(90deg, ${SLOPE_STOPS.map(([s, c]) => `${c} ${(s / LEGEND_MAX) * 100}%`).join(", ")})`;

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
            onPointerLeave={() => setHoverIndex(null)}
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

            <path d={area} fill={`url(#${gradientId})`} fillOpacity={0.85} />
            <path d={line} fill="none" stroke={`url(#${gradientId})`} strokeWidth={2} strokeLinejoin="round" />

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
