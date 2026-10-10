import { useEffect, useState } from "react";
import type { Wish } from "../types";
import { fetchWishes, fetchWishGpxText } from "../api";
import { errorMessage } from "../../../shared/api";
import { useGpxTracks } from "../../../shared/useGpxTracks";
import { trackStats } from "../../../shared/elevation";
import { formatGain, formatKm } from "../../../shared/format";
import { DistanceIcon, ElevationIcon, ExternalIcon, EyeIcon, FlagIcon, PencilIcon, PinIcon, TrashIcon } from "../../../shared/icons";
import WishMap, { type WishMapItem } from "./WishMap";
import WishViewDialog from "./WishViewDialog";
import WishFormDialog from "./WishFormDialog";
import WishDeleteDialog from "./WishDeleteDialog";
import styles from "./Wishes.module.css";

const pointOf = (w: Wish) => (w.lat != null && w.lon != null ? { lat: w.lat, lng: w.lon } : null);

const hostOf = (link: string) => {
  try {
    return new URL(link).hostname.replace(/^www\./, "");
  } catch {
    return link;
  }
};

// Sezione "Prossime avventure": wish list dei tour da fare, separata dallo storico ma con lo stesso
// impianto (lista a sinistra, mappa a destra)
export default function WishBoard() {
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<Wish["id"] | null>(null);
  const [editing, setEditing] = useState<Wish | "new" | null>(null);
  const [deleting, setDeleting] = useState<Wish | null>(null);
  const [viewingId, setViewingId] = useState<Wish["id"] | null>(null); // scheda con profilo altimetrico

  useEffect(() => {
    fetchWishes()
      .then(setWishes)
      .catch((e) => setError(errorMessage(e, "Errore nel caricamento delle idee")))
      .finally(() => setLoading(false));
  }, []);

  // tutte le tracce: servono alla mappa panoramica e per km e dislivello della lista
  const gpxTracks = useGpxTracks(wishes.filter((w) => w.hasGpx).map((w) => w.id), fetchWishGpxText);
  const viewing = wishes.find((w) => w.id === viewingId) ?? null;

  const q = query.trim().toLowerCase();
  const visible = q
    ? wishes.filter((w) => [w.name, w.notes, w.idealPeriod].some((s) => s?.toLowerCase().includes(q)))
    : wishes;

  const mapItems: WishMapItem[] = visible.map((w) => ({
    id: w.id,
    name: w.name,
    gpx: w.hasGpx ? gpxTracks.trackOf(w.id) : null,
    point: pointOf(w),
  }));
  const onMapCount = visible.filter((w) => w.hasGpx || pointOf(w)).length;

  function select(id: Wish["id"], from: "list" | "map") {
    const next = from === "list" && selectedId === id ? null : id;
    setSelectedId(next);
    // cliccando sulla mappa la lista scorre fino all'idea
    if (next != null && from === "map") document.getElementById(`wish-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function onSaved(saved: Wish, gpxChanged: boolean) {
    setWishes((prev) => (prev.some((w) => w.id === saved.id) ? prev.map((w) => (w.id === saved.id ? saved : w)) : [saved, ...prev]));
    if (gpxChanged) gpxTracks.forget(saved.id);
    setEditing(null);
    setSelectedId(saved.id);
  }

  function onDeleted(id: Wish["id"]) {
    setWishes((prev) => prev.filter((w) => w.id !== id));
    setDeleting(null);
    if (selectedId === id) setSelectedId(null);
  }

  return (
    <div className={styles.board}>
      <div className={styles.head}>
        <div className="section-head">
          <span className="eyebrow">Da fare</span>
          <h2>Prossime avventure</h2>
          <p>
            I tour che vuoi fare, prima o poi. Basta un nome; se vuoi aggiungi il punto, un link (Komoot, Wikiloc...) o la traccia GPX, anche disegnandola sulla mappa.
          </p>
        </div>
        <button type="button" className={`btn ${styles.btnWish}`} onClick={() => setEditing("new")}>
          + Nuova idea
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {!loading && !error && wishes.length === 0 ? (
        <button type="button" className={styles.emptyCard} onClick={() => setEditing("new")}>
          {/* stessa icona "montagna" dello storico, con una bandierina: meta da raggiungere */}
          <svg className={styles.emptyIcon} viewBox="0 0 64 64" width="52" height="52" aria-hidden="true">
            <path d="M6 54 L24 24 L34 40 L40 32 L58 54 Z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
            <path d="M40 32 V10 L52 15 L40 20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
          </svg>
          <strong>La lista è ancora vuota</strong>
          <span>Aggiungi il primo tour che sogni di fare →</span>
        </button>
      ) : (
        <>
          {!loading && !error && (
            <div className={styles.filterRow}>
              <input
                className={styles.filter}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filtra per nome, note o periodo..."
                aria-label="Filtra le idee"
              />
              <span className={styles.filterCount}>
                {visible.length === wishes.length ? `${wishes.length} idee` : `${visible.length} di ${wishes.length}`}
              </span>
            </div>
          )}

          <div className={styles.layout}>
            <div className={styles.listCol}>
              {loading && [0, 1, 2].map((i) => <div key={i} className={styles.skeleton} />)}
              {!loading && wishes.length > 0 && visible.length === 0 && (
                <div className={styles.noMatch}>Nessuna idea corrisponde a "{query}"</div>
              )}

              <ul className={styles.list}>
                {visible.map((w) => {
                  const active = w.id === selectedId;
                  const gpx = w.hasGpx ? gpxTracks.trackOf(w.id) : null;
                  const stats = gpx ? trackStats(gpx) : null;
                  const gpxError = w.hasGpx && gpxTracks.errorOf(w.id);
                  const kind = w.hasGpx ? "Traccia GPX" : pointOf(w) ? "Solo il punto" : "Solo l'idea";
                  const tools = w.link ? 4 : 3;
                  return (
                    <li key={w.id} id={`wish-${w.id}`} className={styles.row}>
                      <button
                        type="button"
                        className={`${styles.item} ${active ? styles.itemActive : ""}`}
                        style={{ "--tools": tools } as React.CSSProperties}
                        onClick={() => select(w.id, "list")}
                        aria-pressed={active}
                      >
                        <span className={styles.kind} title={kind} aria-label={kind}>
                          {w.hasGpx ? <DistanceIcon size={20} /> : pointOf(w) ? <PinIcon size={20} /> : <FlagIcon size={20} />}
                        </span>
                        <div className={styles.itemBody}>
                          {/* il titolo apre la scheda invece di selezionare l'idea (da tastiera c'è l'occhio) */}
                          <div
                            className={`${styles.itemTitle} ${styles.itemTitleLink}`}
                            onClick={(e) => { e.stopPropagation(); setViewingId(w.id); }}
                            title="Vedi i dettagli"
                          >
                            {w.name}
                          </div>
                          <div className={styles.itemMeta}>
                            {w.idealPeriod ? `🗓 ${w.idealPeriod}` : "quando capita"}
                            {w.notes && ` · ${w.notes}`}
                          </div>
                        </div>
                        {stats ? (
                          <div className={styles.metrics}>
                            {stats.gain != null && <span title="Dislivello positivo"><ElevationIcon size={13} />{formatGain(stats.gain)}</span>}
                            <span title="Distanza"><DistanceIcon size={13} />{formatKm(stats.distance)}</span>
                          </div>
                        ) : gpxError ? (
                          <span className={styles.badgeError}>GPX non caricato</span>
                        ) : null}
                      </button>
                      <div className={styles.tools}>
                        <button type="button" className={styles.toolBtn} onClick={() => setViewingId(w.id)} title="Dettagli" aria-label={`Dettagli di ${w.name}`}>
                          <EyeIcon size={15} />
                        </button>
                        {w.link && (
                          <a className={styles.toolBtn} href={w.link} target="_blank" rel="noopener noreferrer" title={`Apri ${hostOf(w.link)}`} aria-label={`Apri il link di ${w.name} (${hostOf(w.link)})`}>
                            <ExternalIcon size={15} />
                          </a>
                        )}
                        <button type="button" className={styles.toolBtn} onClick={() => setEditing(w)} title="Modifica" aria-label={`Modifica ${w.name}`}>
                          <PencilIcon size={15} />
                        </button>
                        <button type="button" className={`${styles.toolBtn} ${styles.toolDanger}`} onClick={() => setDeleting(w)} title="Elimina" aria-label={`Elimina ${w.name}`}>
                          <TrashIcon size={15} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className={`map-frame ${styles.map}`}>
              <WishMap items={mapItems} selectedId={selectedId} onSelect={(id) => select(id, "map")} />
              {!loading && onMapCount === 0 && <div className={styles.mapHint}>Nessuna idea ha ancora un punto o una traccia</div>}
            </div>
          </div>
        </>
      )}

      {editing && (
        <WishFormDialog
          key={editing === "new" ? "new" : editing.id}
          wish={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={onSaved}
        />
      )}
      {deleting && <WishDeleteDialog wish={deleting} onClose={() => setDeleting(null)} onDeleted={onDeleted} />}
      {viewing && !editing && (
        <WishViewDialog
          wish={viewing}
          gpx={viewing.hasGpx ? gpxTracks.trackOf(viewing.id) : null}
          onEdit={() => setEditing(viewing)}
          onClose={() => setViewingId(null)}
        />
      )}
    </div>
  );
}
