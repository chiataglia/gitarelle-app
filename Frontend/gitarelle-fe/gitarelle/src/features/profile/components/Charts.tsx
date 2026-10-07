import { useState } from "react";
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
