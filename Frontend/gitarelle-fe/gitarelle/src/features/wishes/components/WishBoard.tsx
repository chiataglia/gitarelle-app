import { useEffect, useRef, useState } from "react";
import type { Wish } from "../types";
import { fetchWishes, fetchWishGpxText } from "../api";
import { errorMessage } from "../../../shared/api";
import { useGpxTracks } from "../../../shared/useGpxTracks";
import { PencilIcon, TrashIcon } from "../../../shared/icons";
import WishMap, { type WishMapItem } from "./WishMap";
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

// Sezione "Prossime avventure": wish list dei tour da fare, separata dallo storico
export default function WishBoard() {
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<Wish["id"] | null>(null);
  const [editing, setEditing] = useState<Wish | "new" | null>(null);
  const [deleting, setDeleting] = useState<Wish | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchWishes()
      .then(setWishes)
      .catch((e) => setError(errorMessage(e, "Errore nel caricamento delle idee")))
      .finally(() => setLoading(false));
  }, []);

  // tutte le tracce, per la mappa panoramica
  const gpxTracks = useGpxTracks(wishes.filter((w) => w.hasGpx).map((w) => w.id), fetchWishGpxText);

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

  function select(id: Wish["id"], from: "card" | "map") {
    const next = from === "card" && selectedId === id ? null : id;
    setSelectedId(next);
    if (next == null) return;
    // porta in vista l'altra metà: la mappa se si clicca la scheda, la scheda se si clicca la mappa
    if (from === "card") mapRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    else document.getElementById(`wish-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
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
            I tour che vuoi fare, prima o poi. Basta un nome; se vuoi aggiungi il punto, un link (Komoot, Wikiloc...) o la traccia GPX.
          </p>
        </div>
        <button type="button" className={`btn ${styles.btnWish}`} onClick={() => setEditing("new")}>
          + Nuova idea
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {!loading && !error && wishes.length > 0 && (
        <>
          <div ref={mapRef} className={`map-frame ${styles.map}`}>
            <WishMap items={mapItems} selectedId={selectedId} onSelect={(id) => select(id, "map")} />
            {onMapCount === 0 && <div className={styles.mapHint}>Nessuna idea ha ancora un punto o una traccia</div>}
          </div>

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
        </>
      )}

      {loading && (
        <div className={styles.grid}>
          {[0, 1, 2].map((i) => <div key={i} className={`${styles.card} ${styles.cardSkeleton}`} />)}
        </div>
      )}

      {!loading && !error && wishes.length === 0 && (
        <button type="button" className={styles.emptyCard} onClick={() => setEditing("new")}>
          {/* stessa icona "montagna" dello storico, con una bandierina: meta da raggiungere */}
          <svg className={styles.emptyIcon} viewBox="0 0 64 64" width="52" height="52" aria-hidden="true">
            <path d="M6 54 L24 24 L34 40 L40 32 L58 54 Z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
            <path d="M40 32 V10 L52 15 L40 20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
          </svg>
          <strong>La lista è ancora vuota</strong>
          <span>Aggiungi il primo tour che sogni di fare →</span>
        </button>
      )}

      <div className={styles.grid}>
        {visible.map((w) => {
          const active = w.id === selectedId;
          const kind = w.hasGpx ? "Traccia" : pointOf(w) ? "Punto" : "Solo idea";
          return (
            <article
              key={w.id}
              id={`wish-${w.id}`}
              className={`${styles.card} ${active ? styles.cardActive : ""}`}
              onClick={() => select(w.id, "card")}
            >
              <div className={styles.cardTop}>
                <span className={styles.stamp}>{w.idealPeriod ? `🗓 ${w.idealPeriod}` : "quando capita"}</span>
                <div className={styles.cardTools}>
                  <button type="button" className={styles.toolBtn} onClick={(e) => { e.stopPropagation(); setEditing(w); }} title="Modifica" aria-label={`Modifica ${w.name}`}>
                    <PencilIcon size={15} />
                  </button>
                  <button type="button" className={`${styles.toolBtn} ${styles.toolDanger}`} onClick={(e) => { e.stopPropagation(); setDeleting(w); }} title="Elimina" aria-label={`Elimina ${w.name}`}>
                    <TrashIcon size={15} />
                  </button>
                </div>
              </div>

              <h3>
                <button type="button" className={styles.cardTitle} onClick={(e) => { e.stopPropagation(); select(w.id, "card"); }} aria-pressed={active}>
                  {w.name}
                </button>
              </h3>
              {w.notes && <p className={styles.cardNotes}>{w.notes}</p>}

              <div className={styles.cardFoot}>
                <span className={`${styles.badge} ${kind === "Solo idea" ? styles.badgeMuted : ""}`}>
                  {kind === "Traccia" ? "〰 Traccia" : kind === "Punto" ? "📍 Punto" : "✎ Solo idea"}
                </span>
                {w.hasGpx && gpxTracks.errorOf(w.id) && <span className={styles.badgeError}>GPX non caricato</span>}
                {w.link && (
                  <a className={styles.linkChip} href={w.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} title={w.link}>
                    ↗ {hostOf(w.link)}
                  </a>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {!loading && wishes.length > 0 && visible.length === 0 && (
        <div className={styles.noMatch}>Nessuna idea corrisponde a "{query}"</div>
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
    </div>
  );
}
