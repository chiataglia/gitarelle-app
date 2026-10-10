import { useState } from "react";
import { Link } from "react-router-dom";
import type { Trek } from "./features/treks/types";
import { useTreks } from "./features/treks/TreksContext";
import TrekQuickView from "./features/treks/components/TrekQuickView";
import { colorForId } from "./shared/map";
import { formatDate, formatGain, formatKm } from "./shared/format";
import { CalendarIcon, DistanceIcon, ElevationIcon, FlagIcon } from "./shared/icons";
import styles from "./App.module.css";
import home from "./Home.module.css";

const RECENT = 5;

// Pagina principale: benvenuto, qualche numero e le ultime escursioni
export default function HomePage() {
  const { treks, loading } = useTreks();
  const [viewingId, setViewingId] = useState<Trek["id"] | null>(null);

  const year = new Date().getFullYear();
  const totalMeters = treks.reduce((s, t) => s + (t.distanceMeters ?? 0), 0);
  const totalGain = treks.reduce((s, t) => s + (t.elevationGainMeters ?? 0), 0);
  const thisYear = treks.filter((t) => t.trekDate?.startsWith(String(year))).length;
  // più recenti per data (le date "YYYY-MM-DD" si ordinano come stringhe); senza data in fondo
  const recent = [...treks]
    .sort((a, b) => (b.trekDate ?? "").localeCompare(a.trekDate ?? ""))
    .slice(0, RECENT);

  return (
    <>
      <section className={styles.hero}>
        <span className="eyebrow">Diario di escursioni</span>
        <h1>
          Ogni sentiero,<br />
          <em>una storia da ricordare.</em>
        </h1>
        <p>
          Segna dove sei stato, con chi e cosa hai visto. Carica la traccia GPX e
          ritrova il percorso sulla mappa quando vuoi.
        </p>
        <div className={styles.heroActions}>
          <Link to="/nuova" className="btn btn-primary">+ Nuova escursione</Link>
          <Link to="/storico" className="btn btn-ghost">Sfoglia lo storico</Link>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <span className="eyebrow">Il diario in breve</span>
          <h2>Riepilogo</h2>
        </div>

        {loading ? (
          <div className={home.tiles}>
            {[0, 1, 2, 3].map((i) => <div key={i} className={`${home.tile} ${home.tileSkeleton}`} />)}
          </div>
        ) : treks.length === 0 ? (
          <div className={home.empty}>
            Ancora nessuna escursione nel diario. <Link to="/nuova">Aggiungi la prima →</Link>
          </div>
        ) : (
          <>
            <div className={home.tiles}>
              <Tile label="Escursioni" value={treks.length.toLocaleString("it-IT")} />
              <Tile label={`Nel ${year}`} value={thisYear.toLocaleString("it-IT")} />
              <Tile label="Km percorsi" value={formatKm(totalMeters)} />
              <Tile label="Dislivello positivo" value={formatGain(totalGain)} />
            </div>

            <div className={home.grid}>
              <div className={`card ${home.recent}`}>
                <h3 className={home.cardTitle}>Ultime escursioni</h3>
                <ul className={home.recentList}>
                  {recent.map((t) => (
                    <li key={t.id}>
                      <button type="button" className={home.recentItem} onClick={() => setViewingId(t.id)} title="Apri la scheda">
                        <span className={home.swatch} style={{ background: colorForId(t.id) }} aria-hidden="true" />
                        <span className={home.recentBody}>
                          <span className={home.recentTitle}>{t.title}</span>
                          <span className={home.recentMeta}>
                            {t.trekDate ? formatDate(t.trekDate) : "senza data"}
                            {t.amichetti ? ` · con ${t.amichetti}` : ""}
                          </span>
                        </span>
                        {t.distanceMeters != null && (
                          <span className={home.recentMetrics}>
                            <span><DistanceIcon size={13} />{formatKm(t.distanceMeters)}</span>
                            <span><ElevationIcon size={13} />{formatGain(t.elevationGainMeters ?? 0)}</span>
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
                <Link to="/storico" className={home.more}>Tutto lo storico →</Link>
              </div>

              <div className={home.shortcuts}>
                <Link to="/idee" className={`card ${home.shortcut}`}>
                  <FlagIcon size={22} />
                  <span>
                    <strong>Da fare</strong>
                    <small>Le idee per le prossime escursioni, con percorsi e mappa.</small>
                  </span>
                </Link>
                <Link to="/profilo" className={`card ${home.shortcut}`}>
                  <CalendarIcon size={22} />
                  <span>
                    <strong>Statistiche e calendario</strong>
                    <small>Km, dislivelli e i giorni passati sui sentieri, mese per mese.</small>
                  </span>
                </Link>
              </div>
            </div>
          </>
        )}
      </section>

      {viewingId != null && <TrekQuickView trekId={viewingId} onClose={() => setViewingId(null)} />}
    </>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className={home.tile}>
      <span className={home.tileLabel}>{label}</span>
      <span className={home.tileValue}>{value}</span>
    </div>
  );
}
