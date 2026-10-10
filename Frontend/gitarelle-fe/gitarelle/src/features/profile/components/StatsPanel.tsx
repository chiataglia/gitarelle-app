import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchStats, type MonthStat, type Stats, type TrekRecord } from "../api";
import { errorMessage } from "../../../shared/api";
import { formatDate } from "../../../shared/format";
import { BarList, ColumnChart, LineChart, type Datum } from "./Charts";
import styles from "./Profile.module.css";

const MONTHS = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
const MONTHS_LONG = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

const fmt = (n: number, digits = 1) => n.toLocaleString("it-IT", { maximumFractionDigits: digits });
const plural = (n: number, one: string, many: string) => `${fmt(n, 0)} ${n === 1 ? one : many}`;

// Statistiche raccolte dai trek dell'utente
export default function StatsPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats().then(setStats).catch((e) => setError(errorMessage(e, "Errore nel caricamento delle statistiche")));
  }, []);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!stats) {
    return (
      <div className={styles.tiles}>
        {[0, 1, 2, 3].map((i) => <div key={i} className={`${styles.tile} ${styles.tileSkeleton}`} />)}
      </div>
    );
  }
  if (stats.totalTreks === 0) {
    return (
      <div className={styles.statsEmpty}>
        Ancora nessuna escursione nel diario: le statistiche appariranno qui. <Link to="/#nuova">Aggiungi la prima →</Link>
      </div>
    );
  }

  const years: Datum[] = stats.byYear.map((y) => ({
    key: String(y.year),
    label: String(y.year),
    value: y.treks,
    tip: `${y.year}: ${plural(y.treks, "escursione", "escursioni")}${y.distanceKm > 0 ? ` · ${fmt(y.distanceKm)} km` : ""}`,
  }));
  const months: Datum[] = stats.byMonth.map((n, i) => ({
    key: MONTHS[i],
    label: MONTHS[i],
    value: n,
    tip: `${MONTHS_LONG[i]}: ${plural(n, "escursione", "escursioni")}`,
  }));
  const topMonth = stats.byMonth.indexOf(Math.max(...stats.byMonth));
  const toData = (list: Stats["topCompanions"]): Datum[] =>
    list.map((c) => ({ key: c.name, label: c.name, value: c.count, tip: `${c.name}: ${plural(c.count, "escursione", "escursioni")}` }));

  return (
    <div className={styles.stats}>
      <div className={styles.tiles}>
        <Tile label="Escursioni" value={fmt(stats.totalTreks, 0)} hint={stats.firstTrekDate ? `dal ${formatDate(stats.firstTrekDate)}` : undefined} />
        <Tile label="Km percorsi" value={fmt(stats.totalDistanceKm)} hint={gpxHint(stats)} />
        <Tile label="Dislivello positivo" value={`${fmt(stats.totalElevationGainM, 0)} m`} hint={gpxHint(stats)} />
        <Tile label="Media per escursione" value={stats.averageDistanceKm != null ? `${fmt(stats.averageDistanceKm)} km` : "–"} hint="sulle tracce GPX" />
      </div>

      {stats.byYearMonth.length > 0 && stats.treksWithGpx > 0 && <TrendCard stats={stats} />}

      <div className={styles.chartsGrid}>
        <div className={`card ${styles.chartCard}`}>
          <ColumnChart
            title="Escursioni per anno"
            data={years}
            summary={`Escursioni per anno dal ${years[0]?.label ?? ""} al ${years[years.length - 1]?.label ?? ""}`}
          />
        </div>
        <div className={`card ${styles.chartCard}`}>
          <ColumnChart
            title="In che mesi cammini"
            data={months}
            summary={`Escursioni per mese, il più frequente è ${MONTHS_LONG[topMonth]}`}
          />
        </div>
        <div className={`card ${styles.chartCard}`}>
          <BarList title="Compagni di cammino" data={toData(stats.topCompanions)} empty="Compila il campo Amichetti dei trek per vederli qui." />
        </div>
        <div className={`card ${styles.chartCard}`}>
          <BarList title="Cartelle più usate" data={toData(stats.topFolders)} empty="Nessun trek in una cartella." />
        </div>
      </div>

      <div className={styles.records}>
        <RecordCard label="Il più lungo" record={stats.longestTrek} value={(r) => `${fmt(r.value)} km`} />
        <RecordCard label="Il più in salita" record={stats.biggestClimb} value={(r) => `${fmt(r.value, 0)} m D+`} />
        <div className={`card ${styles.recordCard}`}>
          <span className={styles.recordLabel}>Ancora da fare</span>
          <strong>{plural(stats.totalWishes, "idea", "idee")}</strong>
          <Link to="/#idee" className={styles.recordLink}>Vai alla lista →</Link>
        </div>
      </div>
    </div>
  );
}

type Metric = "km" | "gain";
const METRICS: Record<Metric, { label: string; unit: string; digits: number; pick: (m: MonthStat | Stats["byYear"][number]) => number }> = {
  km: { label: "Km", unit: " km", digits: 1, pick: (m) => m.distanceKm },
  gain: { label: "Dislivello", unit: " m", digits: 0, pick: (m) => m.elevationGainM },
};

// Km e dislivello nel tempo: colonne per mese (o per anno) e linea progressiva.
// Un grafico per misura, mai due scale sullo stesso asse: si sceglie la misura col selettore.
function TrendCard({ stats }: { stats: Stats }) {
  const years = stats.byYear.map((y) => y.year);
  const [metric, setMetric] = useState<Metric>("km");
  const [year, setYear] = useState<number | "all">(years[years.length - 1]);
  const { label, unit, digits, pick } = METRICS[metric];
  const val = (n: number) => `${fmt(n, digits)}${unit}`;
  const byMonth = new Map(stats.byYearMonth.map((m) => [m.month, m]));
  const monthTip = (m: MonthStat | undefined, name: string) =>
    `${name}: ${val(m ? pick(m) : 0)}${m?.treks ? ` · ${plural(m.treks, "escursione", "escursioni")}` : ""}`;

  let columns: Datum[];
  let months: { key: string; label: string; name: string; m?: MonthStat }[];
  if (year === "all") {
    columns = stats.byYear.map((y) => ({
      key: String(y.year),
      label: String(y.year),
      value: pick(y),
      tip: `${y.year}: ${val(pick(y))} · ${plural(y.treks, "escursione", "escursioni")}`,
    }));
    months = stats.byYearMonth.map((m) => {
      const [yy, mm] = m.month.split("-").map(Number);
      return { key: m.month, label: `${MONTHS[mm - 1]} ${String(yy).slice(2)}`, name: `${MONTHS_LONG[mm - 1]} ${yy}`, m };
    });
  } else {
    const all = MONTHS.map((short, i) => {
      const key = `${year}-${String(i + 1).padStart(2, "0")}`;
      return { key, label: short, name: `${MONTHS_LONG[i]} ${year}`, m: byMonth.get(key) };
    });
    columns = all.map((d) => ({ key: d.key, label: d.label, value: d.m ? pick(d.m) : 0, tip: monthTip(d.m, d.name) }));
    // la linea si ferma all'ultimo mese con dati (l'anno in corso non è finito)
    const lastKey = stats.byYearMonth[stats.byYearMonth.length - 1].month;
    months = all.filter((d) => d.key <= lastKey);
  }

  const cumulative: Datum[] = [];
  for (const d of months) {
    const value = (cumulative.at(-1)?.value ?? 0) + (d.m ? pick(d.m) : 0);
    cumulative.push({ key: d.key, label: d.label, value, tip: `fino a ${d.name}: ${val(value)}` });
  }
  const running = cumulative.at(-1)?.value ?? 0;
  const total = columns.reduce((s, d) => s + d.value, 0);
  const period = year === "all" ? "in totale" : `nel ${year}`;

  return (
    <div className={`card ${styles.trendCard}`}>
      <div className={styles.trendHead}>
        <div>
          <h3 className={styles.trendTitle}>Nel tempo</h3>
          <span className={styles.trendTotal}>{val(total)} {period}</span>
        </div>
        <div className={styles.trendControls}>
          <div className={styles.segmented} role="group" aria-label="Misura">
            {(Object.keys(METRICS) as Metric[]).map((k) => (
              <button key={k} type="button" aria-pressed={metric === k} onClick={() => setMetric(k)}>{METRICS[k].label}</button>
            ))}
          </div>
          <select aria-label="Periodo" value={year} onChange={(e) => setYear(e.target.value === "all" ? "all" : Number(e.target.value))}>
            {[...years].reverse().map((y) => <option key={y} value={y}>{y}</option>)}
            {years.length > 1 && <option value="all">Tutti gli anni</option>}
          </select>
        </div>
      </div>
      <div className={styles.trendCharts}>
        <ColumnChart
          title={`${label} ${year === "all" ? "per anno" : "per mese"}`}
          data={columns}
          summary={`${label} ${year === "all" ? "per anno" : `per mese nel ${year}`}, ${val(total)} ${period}`}
        />
        <LineChart
          title={`${label} progressivi`}
          data={cumulative}
          unit={unit}
          summary={`${label} accumulati ${year === "all" ? "dal primo trek" : `nel ${year}`}: ${val(running)}`}
        />
      </div>
    </div>
  );
}

const gpxHint = (s: Stats) =>
  s.treksWithGpx === s.totalTreks ? "da tutte le tracce GPX" : `da ${s.treksWithGpx} tracce GPX su ${s.totalTreks} escursioni`;

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className={styles.tile}>
      <span className={styles.tileLabel}>{label}</span>
      <span className={styles.tileValue}>{value}</span>
      {hint && <span className={styles.tileHint}>{hint}</span>}
    </div>
  );
}

function RecordCard({ label, record, value }: { label: string; record: TrekRecord | null; value: (r: TrekRecord) => string }) {
  return (
    <div className={`card ${styles.recordCard}`}>
      <span className={styles.recordLabel}>{label}</span>
      {record ? (
        <>
          <strong>{value(record)}</strong>
          <span className={styles.recordTrek}>
            {record.title}{record.date ? ` · ${formatDate(record.date)}` : ""}
          </span>
        </>
      ) : (
        <span className={styles.recordTrek}>Serve almeno un trek con traccia GPX</span>
      )}
    </div>
  );
}
