import { useRef, useState } from "react";
import type { LatLngLiteral } from "leaflet";
import type { FolderFilter, Trek } from "../types";
import TrekMap from "./TrekMap";
import TrekCompareMap, { type CompareItem } from "./TrekCompareMap";
import TrekEditDialog from "./TrekEditDialog";
import TrekDeleteDialog from "./TrekDeleteDialog";
import FolderBar from "./FolderBar";
import { useTreks } from "../TreksContext";
import { useGpxTracks } from "../useGpxTracks";
import { updateTrekLocation, uploadGpx } from "../api";
import styles from "./TrekList.module.css";
import { formatDate } from "../../../shared/format";
import { errorMessage } from "../../../shared/api";
import { TRACK_PALETTE } from "../../../shared/map";
import { PencilIcon, TrashIcon } from "../../../shared/icons";

const pointOf = (t: Trek): LatLngLiteral | null =>
  t.lat != null && t.lon != null ? { lat: t.lat, lng: t.lon } : null;

type Mode = "detail" | "compare";

// trek scelto per il confronto, col colore assegnato al momento della selezione
// (così togliendone uno gli altri non cambiano colore)
type Compared = { id: Trek["id"]; color: string };

function nextColor(used: Compared[]) {
  return TRACK_PALETTE.find((c) => !used.some((u) => u.color === c))
    ?? TRACK_PALETTE[used.length % TRACK_PALETTE.length];
}

export default function TrekList() {
  const { treks, folders, loading, error, upsertTrek } = useTreks();
  const [mode, setMode] = useState<Mode>("detail");

  // filtro per cartella: lista, dettaglio e confronto mostrano solo i trek visibili
  const [folderFilter, setFolderFilter] = useState<FolderFilter>("all");
  const visibleTreks = folderFilter === "all"
    ? treks
    : treks.filter((t) => t.folderId === (folderFilter === "none" ? null : folderFilter));
  const activeFolder = typeof folderFilter === "number" ? folders.find((f) => f.id === folderFilter) : undefined;

  // si tiene l'id (non l'oggetto) così il dettaglio segue gli aggiornamenti della lista
  const [selectedId, setSelectedId] = useState<Trek["id"] | null>(null);
  const selected = visibleTreks.find((t) => t.id === selectedId) ?? null;

  // trek da confrontare sulla stessa mappa (quelli fuori dal filtro restano scelti ma nascosti)
  const [compared, setCompared] = useState<Compared[]>([]);
  const comparedTreks = compared
    .map((c) => ({ ...c, trek: visibleTreks.find((t) => t.id === c.id) }))
    .filter((c): c is Compared & { trek: Trek } => c.trek != null);

  // tracce gpx da scaricare: quella del trek selezionato o quelle del confronto
  const gpxIds = mode === "detail"
    ? (selected?.hasGpx ? [selected.id] : [])
    : comparedTreks.filter((c) => c.trek.hasGpx).map((c) => c.id);
  const gpxTracks = useGpxTracks(gpxIds);

  // trek aperti nei dialog di modifica / eliminazione
  const [editingId, setEditingId] = useState<Trek["id"] | null>(null);
  const [deletingId, setDeletingId] = useState<Trek["id"] | null>(null);
  const editing = treks.find((t) => t.id === editingId) ?? null;
  const deleting = treks.find((t) => t.id === deletingId) ?? null;

  // azioni: scelta punto e caricamento gpx
  const [picking, setPicking] = useState(false);
  const [draftPoint, setDraftPoint] = useState<LatLngLiteral | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const selectedGpx = selected?.hasGpx ? gpxTracks.trackOf(selected.id) : null;
  const gpxLoading = selected?.hasGpx ? gpxTracks.isLoading(selected.id) : false;
  const gpxError = selected?.hasGpx ? gpxTracks.errorOf(selected.id) : null;

  function select(t: Trek) {
    setSelectedId(t.id);
    setPicking(false);
    setDraftPoint(null);
    setActionError(null);
  }

  function toggleCompared(t: Trek) {
    setCompared((prev) =>
      prev.some((c) => c.id === t.id)
        ? prev.filter((c) => c.id !== t.id)
        : [...prev, { id: t.id, color: nextColor(prev) }]
    );
  }

  function compareAllWithGpx() {
    setCompared((prev) => {
      const next = [...prev];
      for (const t of visibleTreks) {
        if (t.hasGpx && !next.some((c) => c.id === t.id)) next.push({ id: t.id, color: nextColor(next) });
      }
      return next;
    });
  }

  function onDeleted(id: Trek["id"]) {
    setDeletingId(null);
    setCompared((prev) => prev.filter((c) => c.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
      setPicking(false);
      setDraftPoint(null);
    }
  }

  function changeFolderFilter(f: FolderFilter) {
    setFolderFilter(f);
    setPicking(false);
    setDraftPoint(null);
  }

  function changeMode(m: Mode) {
    setMode(m);
    setPicking(false);
    setDraftPoint(null);
    // entrando nel confronto si parte dal trek che si stava guardando
    if (m === "compare" && comparedTreks.length === 0 && selected && (selected.hasGpx || pointOf(selected))) {
      setCompared([{ id: selected.id, color: TRACK_PALETTE[0] }]);
    }
  }

  function startPicking() {
    if (!selected) return;
    setDraftPoint(pointOf(selected) ?? selectedGpx?.info.start ?? null);
    setActionError(null);
    setPicking(true);
  }

  async function savePoint() {
    if (!selected || !draftPoint) return;
    try {
      setBusy(true);
      upsertTrek(await updateTrekLocation(selected.id, draftPoint.lat, draftPoint.lng));
      setPicking(false);
      setDraftPoint(null);
    } catch (e) {
      setActionError(errorMessage(e, "Errore nel salvataggio del punto"));
    } finally {
      setBusy(false);
    }
  }

  async function onGpxPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !selected) return;
    try {
      setBusy(true);
      setActionError(null);
      upsertTrek(await uploadGpx(selected.id, file)); // hasGpx → true: l'hook scarica e mostra la traccia
    } catch (err) {
      setActionError(errorMessage(err, "Errore nel caricamento del GPX"));
    } finally {
      setBusy(false);
    }
  }

  const selectedPoint = selected ? pointOf(selected) : null;
  const comparing = mode === "compare";

  const compareItems: CompareItem[] = comparedTreks.map((c) => ({
    key: String(c.id),
    label: c.trek.title,
    color: c.color,
    gpx: c.trek.hasGpx ? gpxTracks.trackOf(c.id) : null,
    point: pointOf(c.trek),
  }));

  return (
    <div>
      <div className="section-head">
        <span className="eyebrow">I nostri ricordi</span>
        <h2>Storico trek</h2>
        <p>
          {treks.length === 0
            ? "Le escursioni salvate appariranno qui."
            : folderFilter === "all"
              ? `${treks.length} escursioni nel diario`
              : `${visibleTreks.length} di ${treks.length} escursioni · ${activeFolder?.name ?? "senza cartella"}`}
        </p>
      </div>

      {!loading && !error && <FolderBar value={folderFilter} onChange={changeFolderFilter} />}

      {treks.length > 0 && (
        <div className={styles.toolbar}>
          <div className={styles.segmented} role="tablist" aria-label="Modalità di visualizzazione">
            <button type="button" role="tab" aria-selected={!comparing} className={!comparing ? styles.segActive : ""} onClick={() => changeMode("detail")}>
              Dettaglio
            </button>
            <button type="button" role="tab" aria-selected={comparing} className={comparing ? styles.segActive : ""} onClick={() => changeMode("compare")}>
              Confronta percorsi
            </button>
          </div>
          {comparing && (
            <div className={styles.toolbarActions}>
              <span className={styles.counter}>{comparedTreks.length} selezionati</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={compareAllWithGpx}>Tutti con GPX</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCompared([])} disabled={comparedTreks.length === 0}>
                Deseleziona
              </button>
            </div>
          )}
        </div>
      )}

      <div className={`${styles.layout} ${comparing ? styles.layoutWide : ""}`}>
        <div className={styles.listCol}>
          {loading && (
            <div className={styles.skeletons}>
              {[0, 1, 2].map((i) => <div key={i} className={styles.skeleton} />)}
            </div>
          )}
          {error && <div className="alert alert-error">{error}</div>}
          {!loading && !error && treks.length === 0 && (
            <div className={styles.empty}>
              Ancora nessuna escursione. <a href="#nuova">Aggiungi la prima →</a>
            </div>
          )}
          {!loading && !error && treks.length > 0 && visibleTreks.length === 0 && (
            <div className={styles.empty}>
              Nessuna escursione {activeFolder ? `in "${activeFolder.name}"` : "senza cartella"}. Spostale qui con la ✎ su ogni trek.
            </div>
          )}

          <ul className={styles.list}>
            {visibleTreks.map((t) => {
              const compareColor = compared.find((c) => c.id === t.id)?.color;
              const active = comparing ? compareColor != null : selectedId === t.id;
              const nothingToShow = !t.hasGpx && !pointOf(t);
              return (
                <li key={t.id} className={styles.row}>
                  <button
                    type="button"
                    onClick={() => (comparing ? toggleCompared(t) : select(t))}
                    className={`${styles.item} ${active ? styles.itemActive : ""} ${!comparing ? styles.itemWithTools : ""}`}
                    aria-pressed={active}
                    disabled={comparing && nothingToShow}
                    title={comparing && nothingToShow ? "Nessun punto né traccia da mostrare" : undefined}
                    style={comparing && compareColor ? ({ "--item-color": compareColor } as React.CSSProperties) : undefined}
                  >
                    {comparing && (
                      <span className={`${styles.check} ${active ? styles.checkOn : ""}`} aria-hidden="true">
                        {active && "✓"}
                      </span>
                    )}
                    <div className={styles.dateBadge}>
                      <span>{formatDate(t.trekDate, { day: "2-digit" }) || "–"}</span>
                      <small>{formatDate(t.trekDate, { month: "short" })}</small>
                    </div>
                    <div className={styles.itemBody}>
                      <div className={styles.itemTitle}>{t.title}</div>
                      <div className={styles.itemMeta}>
                        {t.amichetti ? `con ${t.amichetti}` : formatDate(t.trekDate, { year: "numeric" })}
                      </div>
                    </div>
                    <div className={styles.tags}>
                      {t.hasGpx && <span className={styles.tag} title="Traccia GPX associata">GPX</span>}
                      {nothingToShow && <span className={`${styles.tag} ${styles.tagMuted}`} title="Nessun punto né traccia">—</span>}
                    </div>
                  </button>
                  {!comparing && (
                    <div className={styles.tools}>
                      <button type="button" className={styles.toolBtn} onClick={() => setEditingId(t.id)} title="Modifica" aria-label={`Modifica ${t.title}`}>
                        <PencilIcon />
                      </button>
                      <button type="button" className={`${styles.toolBtn} ${styles.toolDanger}`} onClick={() => setDeletingId(t.id)} title="Elimina" aria-label={`Elimina ${t.title}`}>
                        <TrashIcon />
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div className={`map-frame ${styles.mapCol}`}>
          {comparing ? (
            compareItems.length > 0 ? (
              <>
                <TrekCompareMap items={compareItems} />
                <ul className={styles.legend} aria-label="Legenda percorsi">
                  {comparedTreks.map((c) => {
                    const status = !c.trek.hasGpx
                      ? "solo punto"
                      : gpxTracks.errorOf(c.id)
                        ? "errore GPX"
                        : gpxTracks.isLoading(c.id)
                          ? "caricamento..."
                          : null;
                    return (
                      <li key={c.id}>
                        <span className={styles.swatch} style={{ background: c.color }} aria-hidden="true" />
                        <span className={styles.legendTitle} title={c.trek.title}>{c.trek.title}</span>
                        {c.trek.trekDate && <small>{formatDate(c.trek.trekDate)}</small>}
                        {status && <small className={styles.legendStatus}>· {status}</small>}
                        <button type="button" className={styles.legendRemove} onClick={() => toggleCompared(c.trek)} aria-label={`Togli ${c.trek.title} dal confronto`}>
                          ✕
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <div className={styles.placeholder}>
                <svg viewBox="0 0 64 64" width="56" height="56" aria-hidden="true">
                  <path d="M6 48 C18 30 26 44 34 26 S52 20 58 12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  <path d="M6 30 C16 40 30 18 40 34 S54 44 58 40" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
                </svg>
                <div>Seleziona dalla lista i trek da vedere insieme sulla mappa.</div>
              </div>
            )
          ) : selected ? (
            <>
              <TrekMap
                point={picking ? draftPoint : selectedPoint}
                gpx={selectedGpx}
                trackKey={String(selected.id)}
                onPick={picking ? setDraftPoint : undefined}
              />

              {picking && (
                <div className={styles.mapHint}>
                  {draftPoint ? "Clicca di nuovo per spostare il punto" : "Clicca sulla mappa per scegliere il punto"}
                </div>
              )}
              {!picking && !selectedPoint && !selected.hasGpx && (
                <div className={styles.mapHint}>Nessun punto né traccia per questa escursione</div>
              )}

              <div className={styles.detail}>
                <h3>{selected.title}</h3>
                <div className={styles.detailMeta}>
                  {selected.trekDate && <span>📅 {formatDate(selected.trekDate)}</span>}
                  {selected.amichetti && <span>👥 {selected.amichetti}</span>}
                  {selectedPoint && <span>📍 {selectedPoint.lat.toFixed(4)}, {selectedPoint.lng.toFixed(4)}</span>}
                  {selected.hasGpx && <span>🥾 {gpxLoading ? "Caricamento traccia..." : "Traccia GPX"}</span>}
                </div>
                {selected.notes && <p>{selected.notes}</p>}

                <div className={styles.actions}>
                  {picking ? (
                    <>
                      <button type="button" className="btn btn-primary btn-sm" onClick={savePoint} disabled={busy || !draftPoint}>
                        {busy ? "Salvataggio..." : "Salva punto"}
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPicking(false)} disabled={busy}>
                        Annulla
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={startPicking} disabled={busy}>
                        📍 {selectedPoint ? "Sposta punto" : "Aggiungi punto"}
                      </button>
                      {!selected.hasGpx && (
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileInput.current?.click()} disabled={busy}>
                          {busy ? "Caricamento..." : "⤒ Carica GPX"}
                        </button>
                      )}
                    </>
                  )}
                  <input ref={fileInput} type="file" accept=".gpx" hidden onChange={onGpxPicked} />
                </div>

                {(actionError || gpxError) && <div className={`alert alert-error ${styles.detailAlert}`}>{actionError ?? gpxError}</div>}
              </div>
            </>
          ) : (
            <div className={styles.placeholder}>
              <svg viewBox="0 0 64 64" width="56" height="56" aria-hidden="true">
                <path d="M6 52 L24 22 L34 38 L40 30 L58 52 Z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
                <circle cx="46" cy="16" r="5" fill="currentColor" />
              </svg>
              <div>Seleziona un trek dalla lista per vederlo sulla mappa.</div>
            </div>
          )}
        </div>
      </div>

      {editing && <TrekEditDialog key={editing.id} trek={editing} onClose={() => setEditingId(null)} />}
      {deleting && <TrekDeleteDialog trek={deleting} onClose={() => setDeletingId(null)} onDeleted={onDeleted} />}
    </div>
  );
}
