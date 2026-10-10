import { useEffect, useId, useRef, useState } from "react";
import styles from "./Profile.module.css";

export type Datum = {
  key: string;
  label: string;  // etichetta sull'asse (breve)
  value: number;
  tip: string;    // testo del tooltip / della tabella (completo)
};

const fmt = (n: number) => n.toLocaleString("it-IT", { maximumFractionDigits: 1 });

// Colonne verticali, una sola serie: niente legenda (il titolo dice cosa c'è),
// valore scritto solo sulla colonna più alta, il resto nel tooltip e nella tabella per screen reader.
export function ColumnChart({ title, data, summary }: { title: string; data: Datum[]; summary: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.value), 0);
  const maxIdx = data.findIndex((d) => d.value === max);

  return (
    <figure className={styles.chart}>
      <figcaption className={styles.chartTitle}>{title}</figcaption>
      <div className={styles.columns} role="img" aria-label={summary} onMouseLeave={() => setHover(null)}>
        {data.map((d, i) => (
          // tutta la colonna (non solo la barra) è l'area di hover: più facile da prendere
          <div key={d.key} className={styles.colSlot} onMouseEnter={() => setHover(i)}>
            {i === maxIdx && max > 0 && <span className={styles.capValue}>{fmt(d.value)}</span>}
            <div className={`${styles.colBar} ${hover === i ? styles.colBarHover : ""}`} style={{ height: max > 0 ? `${(d.value / max) * 100}%` : 0 }} />
            {hover === i && <div className={styles.tooltip} role="presentation">{d.tip}</div>}
          </div>
        ))}
      </div>
      <div className={styles.colAxis} aria-hidden="true">
        {data.map((d) => <span key={d.key}>{d.label}</span>)}
      </div>
      <DataTable title={title} data={data} />
    </figure>
  );
}

// Linea nel tempo, una sola serie: griglia leggera, mirino + tooltip al passaggio,
// valore scritto solo sull'ultimo punto. Larghezza misurata dal contenitore (testi e tratti non si deformano).
export function LineChart({ title, data, summary, unit = "" }: { title: string; data: Datum[]; summary: string; unit?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const [width, setWidth] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const gradientId = useId();

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const H = 180, top = 22, bottom = 22, left = 44, right = 12;
  const innerW = Math.max(width - left - right, 0), innerH = H - top - bottom;
  const ticks = niceTicks(Math.max(...data.map((d) => d.value), 0));
  const yMax = ticks[ticks.length - 1];
  const x = (i: number) => left + (data.length > 1 ? (i * innerW) / (data.length - 1) : innerW / 2);
  const y = (v: number) => top + innerH - (yMax > 0 ? (v / yMax) * innerH : 0);

  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d.value)}`).join("");
  const area = data.length ? `${line}L${x(data.length - 1)},${top + innerH}L${x(0)},${top + innerH}Z` : "";
  // etichette sull'asse x diradate: circa una ogni 52px
  const every = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(innerW / 52))));
  const last = data.length - 1;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (data.length === 0) return;
    const mx = e.clientX - e.currentTarget.getBoundingClientRect().left;
    const i = data.length > 1 ? Math.round(((mx - left) / innerW) * (data.length - 1)) : 0;
    setHover(Math.min(Math.max(i, 0), last));
  };

  return (
    <figure className={styles.chart}>
      <figcaption className={styles.chartTitle}>{title}</figcaption>
      <div ref={wrapRef} className={styles.lineWrap}>
        {width > 0 && (
          <svg width={width} height={H} role="img" aria-label={summary} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                {/* var() funziona solo come stile, non come attributo svg */}
                <stop offset="0%" style={{ stopColor: "var(--chart)", stopOpacity: 0.28 }} />
                <stop offset="100%" style={{ stopColor: "var(--chart)", stopOpacity: 0 }} />
              </linearGradient>
            </defs>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={left} x2={width - right} y1={y(t)} y2={y(t)} className={t === 0 ? styles.lineBase : styles.lineGrid} />
                <text x={left - 8} y={y(t)} dy="0.35em" textAnchor="end" className={styles.lineTick}>{fmt(t)}</text>
              </g>
            ))}
            {data.map((d, i) =>
              i % every === 0 || i === last ? (
                // l'ultima etichetta vince sulla penultima se si toccano
                i !== last && last - i < every ? null : (
                  <text key={d.key} x={x(i)} y={H - 6} textAnchor={i === 0 && data.length > 1 ? "start" : i === last && data.length > 1 ? "end" : "middle"} className={styles.lineTick}>
                    {d.label}
                  </text>
                )
              ) : null,
            )}
            <path d={area} fill={`url(#${gradientId})`} />
            <path d={line} className={styles.linePath} />
            {last >= 0 && hover === null && (
              <>
                <circle cx={x(last)} cy={y(data[last].value)} r={4} className={styles.lineDot} />
                <text x={x(last)} y={y(data[last].value) - 10} textAnchor={data.length > 1 ? "end" : "middle"} className={styles.lineValue}>
                  {fmt(data[last].value)}{unit}
                </text>
              </>
            )}
            {hover !== null && (
              <>
                <line x1={x(hover)} x2={x(hover)} y1={top} y2={top + innerH} className={styles.lineCrosshair} />
                <circle cx={x(hover)} cy={y(data[hover].value)} r={4} className={styles.lineDot} />
              </>
            )}
          </svg>
        )}
        {hover !== null && (
          <div className={styles.tooltip} role="presentation" style={{ left: x(hover), bottom: "auto", top: -8, transform: tooltipShift(x(hover), width) }}>
            {data[hover].tip}
          </div>
        )}
      </div>
      <DataTable title={title} data={data} />
    </figure>
  );
}

// il tooltip resta dentro il grafico vicino ai bordi
const tooltipShift = (px: number, width: number) =>
  px < width * 0.2 ? "translateX(-10%)" : px > width * 0.8 ? "translateX(-90%)" : "translateX(-50%)";

// 0 e 3-4 valori "tondi" (1, 2, 5 × 10ⁿ) che coprono il massimo
function niceTicks(max: number): number[] {
  if (max <= 0) return [0];
  const raw = max / 3;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const r = raw / pow;
  const step = (r <= 1 ? 1 : r <= 2 ? 2 : r <= 5 ? 5 : 10) * pow;
  const ticks = [];
  for (let t = 0; t < max + step; t += step) ticks.push(Math.round(t * 10) / 10);
  return ticks;
}

// Barre orizzontali per classifiche brevi (es. top 5): etichetta, barra, valore in punta
export function BarList({ title, data, empty }: { title: string; data: Datum[]; empty: string }) {
  const max = Math.max(...data.map((d) => d.value), 0);
  return (
    <figure className={styles.chart}>
      <figcaption className={styles.chartTitle}>{title}</figcaption>
      {data.length === 0 ? (
        <p className={styles.chartEmpty}>{empty}</p>
      ) : (
        <ul className={styles.barList}>
          {data.map((d) => (
            <li key={d.key} title={d.tip}>
              <span className={styles.barLabel}>{d.label}</span>
              <span className={styles.barTrack}>
                <span className={styles.barFill} style={{ width: `${(d.value / max) * 100}%` }} />
              </span>
              <span className={styles.barValue}>{fmt(d.value)}</span>
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}

function DataTable({ title, data }: { title: string; data: Datum[] }) {
  return (
    <table className="sr-only">
      <caption>{title}</caption>
      <tbody>
        {data.map((d) => (
          <tr key={d.key}>
            <th scope="row">{d.label}</th>
            <td>{d.tip}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
