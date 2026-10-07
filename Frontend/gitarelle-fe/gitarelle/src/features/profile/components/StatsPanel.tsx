import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchStats, type Stats, type TrekRecord } from "../api";
import { errorMessage } from "../../../shared/api";
import { formatDate } from "../../../shared/format";
import { BarList, ColumnChart, type Datum } from "./Charts";
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
