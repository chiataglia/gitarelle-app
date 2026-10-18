import { useState } from "react";
import type { Trek } from "../../treks/types";
import { useTreks } from "../../treks/TreksContext";
import TrekQuickView from "../../treks/components/TrekQuickView";
import { trekColor } from "../../../shared/map";
import { formatGain, formatKm } from "../../../shared/format";
import { DistanceIcon, ElevationIcon } from "../../../shared/icons";
import styles from "./Profile.module.css";

const WEEKDAYS = ["lun", "mar", "mer", "gio", "ven", "sab", "dom"];
const MONTHS_LONG = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];

const pad = (n: number) => String(n).padStart(2, "0");
const dayKey = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

// Calendario di un mese: ogni giorno mostra i trek fatti, nel colore della loro traccia;
// un click sul trek apre la sua scheda
export default function TrekCalendar() {
  const { treks, loading } = useTreks();
  const today = new Date();
  const todayKey = dayKey(today.getFullYear(), today.getMonth(), today.getDate());
  // mese mostrato: anno e mese (0-11)
  const [shown, setShown] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const { y, m } = shown;

  const [viewingId, setViewingId] = useState<Trek["id"] | null>(null);

  // trek per giorno ("YYYY-MM-DD"); quelli senza data non stanno sul calendario
  const byDay = new Map<string, Trek[]>();
  for (const t of treks) {
    if (!t.trekDate) continue;
    const k = t.trekDate.slice(0, 10);
    byDay.set(k, [...(byDay.get(k) ?? []), t]);
  }

  // griglia da lunedì: celle vuote prima del giorno 1, poi i giorni del mese; sempre 6 settimane,
  // così l'altezza del calendario non cambia da un mese all'altro
  const lead = (new Date(y, m, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length < 42) cells.push(null);

  const monthPrefix = `${y}-${pad(m + 1)}-`;
  const monthTreks = treks.filter((t) => t.trekDate?.startsWith(monthPrefix));
  const monthMeters = monthTreks.reduce((s, t) => s + (t.distanceMeters ?? 0), 0);

  const move = (delta: number) => setShown(({ y, m }) => {
    const d = new Date(y, m + delta, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const isCurrentMonth = y === today.getFullYear() && m === today.getMonth();

  return (
    <div className={`card ${styles.calendar}`}>
      <div className={styles.calHead}>
        <div>
          <h3 className={styles.trendTitle}>{MONTHS_LONG[m][0].toUpperCase() + MONTHS_LONG[m].slice(1)} {y}</h3>
          <span className={styles.trendTotal}>
            {loading
              ? "Caricamento..."
              : monthTreks.length === 0
                ? "Nessuna escursione"
                : `${monthTreks.length} ${monthTreks.length === 1 ? "escursione" : "escursioni"}${monthMeters > 0 ? ` · ${formatKm(monthMeters)}` : ""}`}
          </span>
        </div>
        <div className={styles.calNav}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => move(-1)} aria-label="Mese precedente">‹</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShown({ y: today.getFullYear(), m: today.getMonth() })} disabled={isCurrentMonth}>
            Oggi
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => move(1)} aria-label="Mese successivo">›</button>
        </div>
      </div>

      <div className={styles.calGrid}>
        {WEEKDAYS.map((d) => <div key={d} className={styles.calWeekday}>{d}</div>)}
        {cells.map((day, i) => {
          if (day == null) return <div key={`e${i}`} className={styles.calEmpty} aria-hidden="true" />;
          const k = dayKey(y, m, day);
          const dayTreks = byDay.get(k) ?? [];
          // la cella ha altezza fissa: un trek mostra anche i dati, più trek solo i titoli (al massimo 2,
          // il resto finisce in "+N")
          const single = dayTreks.length === 1;
          const shown = dayTreks.length > 2 ? dayTreks.slice(0, 1) : dayTreks;
          const rest = dayTreks.slice(shown.length);
          return (
            <div
              key={k}
              className={`${styles.calDay} ${dayTreks.length ? styles.calDayTrek : ""} ${k === todayKey ? styles.calToday : ""}`}
            >
              <span className={styles.calNum}>{day}</span>
              {shown.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={styles.calTrek}
                  style={{ "--trek-color": trekColor(t) } as React.CSSProperties}
                  onClick={() => setViewingId(t.id)}
                  title={`${t.title}${t.distanceMeters != null ? ` · ${formatKm(t.distanceMeters)}` : ""}${t.elevationGainMeters != null ? ` · ${formatGain(t.elevationGainMeters)}` : ""}`}
                  aria-label={`Apri ${t.title}`}
                >
                  <span className={styles.calTrekTitle}>{t.title}</span>
                  {single && t.hasGpx && t.distanceMeters != null && (
                    <span className={styles.calTrekMetrics}>
                      <span><DistanceIcon size={10} />{formatKm(t.distanceMeters)}</span>
                      <span><ElevationIcon size={10} />{formatGain(t.elevationGainMeters ?? 0)}</span>
                    </span>
                  )}
                </button>
              ))}
              {rest.length > 0 && (
                <button
                  type="button"
                  className={styles.calMore}
                  onClick={() => setViewingId(rest[0].id)}
                  title={rest.map((t) => t.title).join("\n")}
                  aria-label={`Altre ${rest.length} escursioni: apri ${rest[0].title}`}
                >
                  +{rest.length} {rest.length === 1 ? "altra" : "altre"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {viewingId != null && <TrekQuickView trekId={viewingId} onClose={() => setViewingId(null)} />}
    </div>
  );
}
