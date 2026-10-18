import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { LatLngBounds, LatLngLiteral } from "leaflet";
import type { FolderFilter, Trek } from "../types";
import TrekClusterMap, { TRACK_ZOOM, type ClusterItem, type FocusRequest, type MapView } from "./TrekClusterMap";
import TrekEditDialog from "./TrekEditDialog";
import TrekViewDialog from "./TrekViewDialog";
import TrekDeleteDialog from "./TrekDeleteDialog";
import TrekTable from "./TrekTable";
import FolderBar from "./FolderBar";
import TrekFilters from "./TrekFilters";
import TrekSortSelect from "./TrekSortSelect";
import { DEFAULT_SORT, sortTreks, type TrekSort } from "../trekSort";
import { NO_FILTERS, applyTrekFilters, filterLabels, type TrekFilterState } from "../trekFilters";
import { useTreks } from "../TreksContext";
import { startTrekDrag } from "../trekDrag";
import { useGpxTracks } from "../../../shared/useGpxTracks";
import { addTreksToFolder, fetchGpxText } from "../api";
import styles from "./TrekList.module.css";
import { formatDate, formatGain, formatKm } from "../../../shared/format";
import { errorMessage } from "../../../shared/api";
import { trekColor } from "../../../shared/map";
import { CollapseIcon, DistanceIcon, ElevationIcon, ExpandIcon, EyeIcon, FolderIcon, TrashIcon } from "../../../shared/icons";
import { useFullscreen } from "../../../shared/useFullscreen";

const pointOf = (t: Trek): LatLngLiteral | null =>
  t.lat != null && t.lon != null ? { lat: t.lat, lng: t.lon } : null;

// map: lista e mappa con i percorsi (click sul trek → zoom, sul titolo → scheda modificabile);
// all: elenco completo senza mappa
type Mode = "map" | "all";

export default function TrekList() {
  const { treks, folders, loading, error, upsertTreks } = useTreks();
  const [mode, setMode] = useState<Mode>("map");

  // filtro per cartella: lista e mappa mostrano solo i trek visibili
  const [folderFilter, setFolderFilter] = useState<FolderFilter>("all");
  const activeFolder = typeof folderFilter === "number" ? folders.find((f) => f.id === folderFilter) : undefined;

  // modalità "Aggiungi" della cartella aperta: lista e mappa mostrano i trek che NON ci sono ancora,
  // ognuno con un "+" (sulla mappa accanto al pin); i filtri (es. la regione) aiutano a restringere la zona
  const [addingId, setAddingId] = useState<number | null>(null);
  const addingTo = addingId != null && addingId === activeFolder?.id ? activeFolder : undefined;
  const [addedCount, setAddedCount] = useState(0);
  const [addBusy, setAddBusy] = useState<Set<Trek["id"]>>(new Set());
  const [addError, setAddError] = useState<string | null>(null);

  const folderTreks = addingTo
    ? treks.filter((t) => !t.folderIds.includes(addingTo.id))
    : folderFilter === "all"
      ? treks
      : folderFilter === "none"
        ? treks.filter((t) => t.folderIds.length === 0)
        : treks.filter((t) => t.folderIds.includes(folderFilter));

  // filtri (nome, regione, amici, anno, dislivello, distanza), da combinare con la cartella;
  // l'ordine scelto vale per la lista accanto alla mappa e per l'elenco
  const [filters, setFilters] = useState<TrekFilterState>(NO_FILTERS);
  const [sort, setSort] = useState<TrekSort>(DEFAULT_SORT);
  const visibleTreks = sortTreks(applyTrekFilters(folderTreks, filters), sort);
  const filtersSummary = filterLabels(filters).join(" · ");

  // trek selezionati nella lista (clic, Ctrl/⌘+clic, Maiusc+clic): la mappa mostra solo loro e si
  // trascinano insieme su una cartella. Si parte con tutti selezionati (allPicked): la lista segue
  // la mappa e ogni trek visibile è spuntato; la casella in cima alla lista seleziona tutti o nessuno
  const [allPicked, setAllPicked] = useState(true);
  const [picked, setPicked] = useState<Set<Trek["id"]>>(new Set());
  const [pickAnchor, setPickAnchor] = useState<Trek["id"] | null>(null);
  // finché c'è una selezione la lista resta quella di quando è iniziata (la mappa si sposta sui
  // selezionati, ma la lista non deve seguirla, se no Maiusc+clic non trova più i trek)
  const [frozenIds, setFrozenIds] = useState<Set<Trek["id"]> | null>(null);
  const [dragging, setDragging] = useState(false);
  // torna a "tutti selezionati" (cambio cartella, filtri, Esc...)
  const clearPicked = () => { setAllPicked(true); setPicked(new Set()); setPickAnchor(null); setFrozenIds(null); };
  const pickNone = () => { setAllPicked(false); setPicked(new Set()); setPickAnchor(null); setFrozenIds(null); };
  const isPickedTrek = (t: Trek) => allPicked || picked.has(t.id);
  // le caselle ci sono solo dentro una cartella aperta: nello storico intero il clic porta al trek sulla mappa
  const pickable = activeFolder != null && !addingTo;

  const onMap = (t: Trek) => addingTo != null || isPickedTrek(t);
  const comparedTreks = visibleTreks.filter((t) => onMap(t) && (t.hasGpx || pointOf(t)));

  // zoom e area inquadrata dalla mappa
  const [view, setView] = useState<MapView | null>(null);
  // zoom dalla lista, dall'elenco o da un gruppo sulla mappa: la mappa vola sulle tracce di quei trek
  const [focus, setFocus] = useState<FocusRequest | null>(null);
  const focusOnKeys = (keys: string[]) => setFocus((prev) => ({ keys, seq: (prev?.seq ?? 0) + 1 }));
  const focusOn = (id: Trek["id"]) => focusOnKeys([String(id)]);
  const zoomedIn = view != null && view.zoom >= TRACK_ZOOM;
  const inView = (p: LatLngLiteral | null | undefined) => zoomedIn && p != null && view.bounds.pad(0.5).contains(p);

  // trek aperti nei dialog: scheda (si modifica campo per campo), modifica completa,
  // eliminazione di uno o di quelli scelti
  const [viewingId, setViewingId] = useState<Trek["id"] | null>(null);
  const [editingId, setEditingId] = useState<Trek["id"] | null>(null);
  const [deletingIds, setDeletingIds] = useState<Trek["id"][] | null>(null);
  const viewing = treks.find((t) => t.id === viewingId) ?? null;
  const editing = treks.find((t) => t.id === editingId) ?? null;
  const deleting = deletingIds ? treks.filter((t) => deletingIds.includes(t.id)) : [];

  // tracce gpx da scaricare: quelle inquadrate (più quelle dei trek senza punto, anche se tolti
  // dalla mappa: servono per sapere dove stanno e quindi se elencarli a sinistra) e quella della scheda aperta
  const gpxIds = mode === "map"
    ? visibleTreks.filter((t) => t.hasGpx && (!pointOf(t) || (onMap(t) && inView(pointOf(t))))).map((t) => t.id)
    : [];
  if (viewing?.hasGpx && !gpxIds.includes(viewing.id)) gpxIds.push(viewing.id);
  // anche quelle dei trek su cui si fa zoom, così la mappa inquadra le tracce intere
  const focused = mode === "map" && focus ? visibleTreks.filter((t) => focus.keys.includes(String(t.id))) : [];
  for (const t of focused) if (t.hasGpx && !gpxIds.includes(t.id)) gpxIds.push(t.id);
  const gpxTracks = useGpxTracks(gpxIds, fetchGpxText);

  // dove sta un trek sulla mappa: il suo punto o, se manca, la partenza del gpx
  const placeOf = (t: Trek): LatLngLiteral | null =>
    pointOf(t) ?? (t.hasGpx ? gpxTracks.trackOf(t.id)?.info.start ?? null : null);

  // un trek cade in un'area se ci cade una parte qualunque della sua traccia (non solo la partenza):
  // così zoomando su un tratto lontano dal pin la traccia resta disegnata e il trek resta in lista.
  // Finché la traccia non è scaricata si guarda il punto
  const fallsIn = (t: Trek, area: LatLngBounds) => {
    const bounds = t.hasGpx ? gpxTracks.trackOf(t.id)?.bounds : null;
    if (bounds) return area.intersects(bounds);
    const p = placeOf(t);
    return p != null && area.contains(p);
  };

  function onDeleted(ids: Trek["id"][]) {
    setDeletingIds(null);
    clearPicked();
    if (viewingId != null && ids.includes(viewingId)) setViewingId(null);
  }

  // ogni scelta di cartella o filtro reinquadra la mappa sui suoi trek, anche se è quella già attiva
  const [fitSeq, setFitSeq] = useState(0);

  function changeFolderFilter(f: FolderFilter) {
    setFolderFilter(f);
    setAddingId(null);
    setFitSeq((s) => s + 1);
    clearPicked();
  }

  // "+ Aggiungi" della cartella: si passa alla mappa con i trek che mancano, inquadrati tutti
  function startAdding(folderId: number) {
    if (mode !== "map") changeMode("map");
    setAddingId(folderId);
    setAddedCount(0);
    setAddError(null);
    setFitSeq((s) => s + 1);
    clearPicked();
  }

  // "Fatto": si torna alla cartella, inquadrata con i trek appena aggiunti
  function stopAdding() {
    setAddingId(null);
    setAddError(null);
    setFitSeq((s) => s + 1);
  }

  async function addToFolder(t: Trek) {
    if (!addingTo || addBusy.has(t.id)) return;
    setAddBusy((prev) => new Set(prev).add(t.id));
    setAddError(null);
    try {
      upsertTreks(await addTreksToFolder(addingTo.id, [t.id])); // esce dai candidati: sparisce da lista e mappa
      setAddedCount((n) => n + 1);
    } catch (err) {
      setAddError(errorMessage(err, `Errore nell'aggiunta di "${t.title}"`));
    } finally {
      setAddBusy((prev) => {
        const next = new Set(prev);
        next.delete(t.id);
        return next;
      });
    }
  }

  function changeFilters(f: TrekFilterState) {
    setFilters(f);
    setFitSeq((s) => s + 1);
    clearPicked();
  }

  function changeMode(m: Mode) {
    setMode(m);
    if (m !== "map") setAddingId(null); // l'aggiunta dalla mappa vive nella vista con la mappa
    clearPicked();
    setFocus(null); // la mappa si ricrea: non deve rivolare sull'ultimo trek cercato
  }

  // dall'elenco completo: torna alla mappa e inquadra il trek
  function showOnMap(t: Trek) {
    changeMode("map");
    focusOn(t.id);
  }

  // pin di tutti i trek sulla mappa; il pin dei trek senza punto è la partenza del gpx
  const compareItems: (ClusterItem & { trek: Trek })[] = comparedTreks.map((t) => {
    const gpx = t.hasGpx ? gpxTracks.trackOf(t.id) : null;
    return {
      key: String(t.id),
      label: t.title,
      color: trekColor(t),
      gpx,
      point: pointOf(t) ?? gpx?.info.start ?? null,
      trackPending: t.hasGpx && gpxTracks.isLoading(t.id),
      trek: t,
    };
  });
  // da vicino: tracce dei trek inquadrati
  const trackItems = zoomedIn
    ? compareItems.filter((i) => i.trek.hasGpx && fallsIn(i.trek, view.bounds.pad(0.5)))
    : [];

  // la lista mostra solo i trek che cadono nell'area inquadrata; per vederli tutti c'è l'elenco.
  // Con una selezione in corso resta ferma (vedi frozenIds)
  const listedTreks = frozenIds
    ? visibleTreks.filter((t) => frozenIds.has(t.id))
    : visibleTreks.filter((t) => (view == null ? placeOf(t) != null : fallsIn(t, view.bounds)));

  // nuova selezione: la mappa inquadra i selezionati (uno solo: la sua traccia intera)
  function select(next: Set<Trek["id"]>, anchor: Trek["id"]) {
    setAllPicked(false);
    setPicked(next);
    setPickAnchor(anchor);
    if (next.size === 0) {
      setFrozenIds(null);
      return;
    }
    if (!frozenIds) setFrozenIds(new Set(listedTreks.map((x) => x.id)));
    if (next.size === 1) focusOn([...next][0]);
    else setFitSeq((s) => s + 1);
  }

  // selezione classica: clic = solo questo (di nuovo = nessuno), Ctrl/⌘+clic o spunta = aggiunge/toglie,
  // Maiusc+clic = intervallo dall'ultimo cliccato
  function onItemClick(e: React.MouseEvent, t: Trek) {
    if (!pickable) {
      focusOn(t.id);
      return;
    }
    if (e.shiftKey && pickAnchor != null) {
      const ids = listedTreks.map((x) => x.id);
      const [a, b] = [ids.indexOf(pickAnchor), ids.indexOf(t.id)].sort((x, y) => x - y);
      if (a >= 0) {
        select(new Set(ids.slice(a, b + 1)), pickAnchor);
        return;
      }
    }
    if (e.ctrlKey || e.metaKey) {
      toggle(t);
      return;
    }
    // di nuovo sull'unico selezionato: si torna a tutti
    if (!allPicked && picked.size === 1 && picked.has(t.id)) clearPicked();
    else select(new Set([t.id]), t.id);
  }

  // da "tutti" la spunta toglie solo questo: restano selezionati gli altri della lista
  function toggle(t: Trek) {
    const next = new Set(allPicked ? listedTreks.map((x) => x.id) : picked);
    if (!next.delete(t.id)) next.add(t.id);
    select(next, t.id);
  }

  // Esc azzera la selezione (se non c'è un dialog aperto: lì Esc chiude il dialog)
  const dialogOpen = viewingId != null || editingId != null || deletingIds != null;
  const customPick = !allPicked;
  useEffect(() => {
    if (!customPick || dialogOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") clearPicked();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [customPick, dialogOpen]);

  // cartelle: icona a destra della mappa che si apre in un riquadro alto quanto serve; si apre da solo mentre si
  // trascinano trek, così le cartelle sono pronte come destinazione. Un clic fuori lo chiude
  // (i dialog di rinomina/eliminazione stanno dentro il riquadro, quindi non lo chiudono)
  const [foldersOpen, setFoldersOpen] = useState(false);
  const foldersShown = foldersOpen || dragging;
  const foldersBox = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!foldersOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!foldersBox.current?.contains(e.target as Node)) setFoldersOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [foldersOpen]);

  // si trascinano tutti i trek scelti se la card fa parte della scelta, altrimenti solo lei
  // (con "tutti selezionati" solo lei: trascinare l'intero storico per sbaglio sarebbe scomodo)
  function onItemDragStart(e: React.DragEvent, t: Trek) {
    const ids = !allPicked && picked.has(t.id) ? listedTreks.filter((x) => picked.has(x.id)).map((x) => x.id) : [t.id];
    startTrekDrag(e, ids, ids.length === 1 ? t.title : `${ids.length} escursioni`);
    setDragging(true);
  }

  // mappa allargabile a schermo intero
  const full = useFullscreen<HTMLDivElement>();

  // intestazione compatta (titolo, modalità, cartelle in due righe): lo spazio va alla mappa
  return (
    <div>
      <div className={styles.head}>
        <div className={styles.headTitle}>
          <h2>Storico trek</h2>
          <span>
            {treks.length === 0
              ? "Le escursioni salvate appariranno qui."
              : addingTo
                ? [`${visibleTreks.length} escursioni non ancora in "${addingTo.name}"`, filtersSummary].filter(Boolean).join(" · ")
              : folderFilter === "all" && !filtersSummary
                ? `${treks.length} escursioni nel diario`
                : [
                    `${visibleTreks.length} di ${treks.length} escursioni`,
                    folderFilter !== "all" && (activeFolder?.name ?? "senza cartella"),
                    filtersSummary,
                  ].filter(Boolean).join(" · ")}
          </span>
        </div>
        {treks.length > 0 && (
          <div className={styles.headTools}>
            <TrekSortSelect value={sort} onChange={setSort} />
            <TrekFilters treks={folderTreks} value={filters} onChange={changeFilters} />
            <div className={styles.segmented} role="tablist" aria-label="Modalità di visualizzazione">
              {([["map", "Mappa"], ["all", "Elenco"]] as const).map(([m, label]) => (
                <button key={m} type="button" role="tab" aria-selected={mode === m} className={mode === m ? styles.segActive : ""} onClick={() => changeMode(m)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* elenco: tabella di tutti i trek della cartella, senza mappa */}
      {mode === "all" && !loading && !error && treks.length > 0 ? (
        <>
        <div className={styles.listFolders}>
          <FolderBar value={folderFilter} onChange={changeFolderFilter} onAdd={(f) => startAdding(f.id)} />
        </div>
        <TrekTable
          treks={visibleTreks}
          sort={sort}
          onSortChange={setSort}
          folders={folders}
          onView={(t) => setViewingId(t.id)}
          onEdit={(t) => setEditingId(t.id)}
          onDelete={(t) => setDeletingIds([t.id])}
          onShowOnMap={showOnMap}
        />
        </>
      ) : (
      <div className={`${styles.layout} ${styles.layoutCompare} ${foldersShown ? styles.layoutFoldersOpen : ""}`}>
        <div className={styles.listCol}>
          {loading && (
            <div className={styles.skeletons}>
              {[0, 1, 2].map((i) => <div key={i} className={styles.skeleton} />)}
            </div>
          )}
          {error && <div className="alert alert-error">{error}</div>}
          {!loading && !error && treks.length === 0 && (
            <div className={styles.empty}>
              Ancora nessuna escursione. <Link to="/nuova">Aggiungi la prima →</Link>
            </div>
          )}
          {!loading && !error && treks.length > 0 && visibleTreks.length === 0 && (
            <div className={styles.empty}>
              {addingTo
                ? `Tutte le escursioni${filtersSummary ? ` (${filtersSummary})` : ""} sono già in "${addingTo.name}".`
                : filtersSummary
                ? `Nessuna escursione con questi filtri${activeFolder ? ` nella cartella "${activeFolder.name}"` : folderFilter === "none" ? " senza cartella" : ""}.`
                : activeFolder
                  ? `Nessuna escursione in "${activeFolder.name}". Aggiungile con "+ Aggiungi" o trascinale sulla cartella da "Tutti".`
                  : "Nessuna escursione senza cartella."}
            </div>
          )}

          {addingTo && (
            <div className={styles.addBar}>
              <span>
                Aggiungi a <b>"{addingTo.name}"</b>: premi <b className={styles.addPlus}>+</b> sulla mappa o nella lista
                {addedCount > 0 && <> · <b>{addedCount}</b> {addedCount === 1 ? "aggiunta" : "aggiunte"}</>}
              </span>
              <button type="button" className="btn btn-primary btn-sm" onClick={stopAdding}>Fatto</button>
            </div>
          )}
          {addError && <div className="alert alert-error">{addError}</div>}

          {/* scelta multipla dentro una cartella: da trascinare su un'altra cartella o da eliminare insieme.
              La casella riporta a tutte (o, se lo sono già, a nessuna) */}
          {pickable && !allPicked && listedTreks.length > 0 && (() => {
            const pickedCount = listedTreks.filter((t) => picked.has(t.id)).length;
            const all = pickedCount === listedTreks.length;
            const some = pickedCount > 0 && !all;
            return (
              <div className={`${styles.pickBar} ${pickedCount === 0 ? styles.pickBarIdle : ""}`}>
                <button
                  type="button"
                  className={`${styles.check} ${styles.checkToggle} ${styles.checkAll} ${all ? styles.checkOn : ""}`}
                  onClick={all ? pickNone : clearPicked}
                  role="checkbox"
                  aria-checked={all ? true : some ? "mixed" : false}
                  title={all ? "Deseleziona tutte" : "Seleziona tutte"}
                  aria-label={all ? "Deseleziona tutte" : "Seleziona tutte"}
                >
                  {all ? "✓" : some ? "–" : ""}
                </button>
                {pickedCount === 0 ? (
                  <span className={styles.pickHint}>Nessuna selezionata: la mappa è vuota</span>
                ) : (
                  <>
                    <span className={styles.pickCount}>
                      <b>{pickedCount}</b> {pickedCount === 1 ? "selezionata" : "selezionate"}{folders.length > 0 && ": trascinale su una cartella"}
                    </span>
                    <button type="button" className={`btn btn-sm ${styles.pickDelete}`} onClick={() => setDeletingIds(listedTreks.filter((t) => picked.has(t.id)).map((t) => t.id))}>
                      <TrashIcon size={14} /> Elimina
                    </button>
                  </>
                )}
              </div>
            );
          })()}
          {visibleTreks.length > 0 && listedTreks.length === 0 && (
            <div className={styles.empty}>
              Nessuna escursione nell'area inquadrata. Sposta la mappa o apri l'
              <button type="button" className={styles.linkBtn} onClick={() => changeMode("all")}>elenco completo</button>.
            </div>
          )}

          {/* nuova chiave a ogni cartella: la lista si ricrea ed entra con una breve dissolvenza */}
          <ul key={String(addingTo ? `add-${addingTo.id}` : folderFilter)} className={styles.list}>
            {listedTreks.map((t) => {
              const nothingToShow = !t.hasGpx && !pointOf(t);
              const isPicked = isPickedTrek(t);
              const compareColor = onMap(t) && !nothingToShow ? trekColor(t) : undefined;
              const active = compareColor != null;
              return (
                <li
                  key={t.id}
                  className={styles.row}
                  draggable={folders.length > 0}
                  onDragStart={(e) => onItemDragStart(e, t)}
                  onDragEnd={() => setDragging(false)}
                >
                  <button
                    type="button"
                    onClick={(e) => onItemClick(e, t)}
                    className={`${styles.item} ${active ? styles.itemActive : ""} ${isPicked && !allPicked ? styles.itemPicked : ""} ${nothingToShow ? styles.itemNoPlace : ""} ${addingTo ? styles.itemWithTwo : styles.itemWithEye}`}
                    aria-pressed={isPicked}
                    title={nothingToShow ? "Nessun punto né traccia da mostrare" : pickable ? undefined : "Mostra sulla mappa"}
                    style={compareColor ? ({ "--item-color": compareColor } as React.CSSProperties) : undefined}
                  >
                    {/* la spunta aggiunge o toglie dalla selezione, come Ctrl+clic */}
                    {pickable && <span
                      className={`${styles.check} ${styles.checkToggle} ${isPicked ? styles.checkOn : ""}`}
                      onClick={(e) => { e.stopPropagation(); toggle(t); }}
                      title={isPicked ? "Togli dalla selezione" : "Aggiungi alla selezione"}
                    >
                      {isPicked && "✓"}
                    </span>}
                    <div className={styles.dateBadge}>
                      <span>{formatDate(t.trekDate, { day: "2-digit" }) || "–"}</span>
                      <small>{formatDate(t.trekDate, { month: "short" })}</small>
                    </div>
                    <div className={styles.itemBody}>
                      {/* il titolo porta sempre la mappa sulla traccia, anche dove il clic sulla card seleziona;
                          la scheda si apre con l'occhio */}
                      <div
                        className={`${styles.itemTitle} ${styles.itemTitleLink}`}
                        onClick={(e) => { e.stopPropagation(); focusOn(t.id); }}
                        title="Mostra sulla mappa"
                      >
                        {t.title}
                      </div>
                      <div className={styles.itemMeta}>
                        {t.amichetti ? `con ${t.amichetti}` : formatDate(t.trekDate, { year: "numeric" })}
                      </div>
                    </div>
                    {t.hasGpx && t.distanceMeters != null ? (
                      <div className={styles.metrics}>
                        <span title="Dislivello positivo"><ElevationIcon size={13} />{formatGain(t.elevationGainMeters ?? 0)}</span>
                        <span title="Distanza"><DistanceIcon size={13} />{formatKm(t.distanceMeters)}</span>
                      </div>
                    ) : (
                      <div className={styles.tags}>
                        {t.hasGpx && <span className={styles.tag} title="Traccia GPX associata">GPX</span>}
                        {nothingToShow && <span className={`${styles.tag} ${styles.tagMuted}`} title="Nessun punto né traccia">—</span>}
                      </div>
                    )}
                  </button>
                  <div className={styles.tools}>
                    {addingTo && (
                      <button
                        type="button"
                        className={`${styles.toolBtn} ${styles.toolAdd}`}
                        onClick={() => addToFolder(t)}
                        disabled={addBusy.has(t.id)}
                        title={`Aggiungi a "${addingTo.name}"`}
                        aria-label={`Aggiungi ${t.title} a ${addingTo.name}`}
                      >
                        +
                      </button>
                    )}
                    <button type="button" className={styles.toolBtn} onClick={() => setViewingId(t.id)} title="Dettagli" aria-label={`Dettagli di ${t.title}`}>
                      <EyeIcon />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div ref={full.ref} className={`map-frame ${styles.mapCol} ${full.fallback ? styles.mapColFull : ""}`}>
          <button
            type="button"
            className={`gt-map-btn ${styles.fullBtn}`}
            onClick={full.toggle}
            title={full.isFullscreen ? "Esci da schermo intero (Esc)" : "Schermo intero"}
            aria-label={full.isFullscreen ? "Esci da schermo intero" : "Mappa a schermo intero"}
          >
            {full.isFullscreen ? <CollapseIcon /> : <ExpandIcon />}
          </button>
          <TrekClusterMap
            items={compareItems}
            tracks={trackItems}
            fitKey={String(fitSeq)}
            onViewChange={setView}
            onSelect={(key) => setViewingId(comparedTreks.find((t) => String(t.id) === key)?.id ?? null)}
            onAdd={addingTo ? (key) => {
              const t = comparedTreks.find((x) => String(x.id) === key);
              if (t) addToFolder(t);
            } : undefined}
            focus={focus}
            onFocus={focusOnKeys}
          />
          {compareItems.length === 0 && visibleTreks.length > 0 && (
            <div className={styles.mapHint}>
              {allPicked
                ? "Nessuna escursione da mostrare sulla mappa"
                : picked.size === 0 ? "Nessuna escursione selezionata" : "Le escursioni selezionate non hanno punto né traccia"}
            </div>
          )}
        </div>


        <aside ref={foldersBox} className={`${styles.folders} ${foldersShown ? styles.foldersOpen : ""}`} aria-label="Cartelle">
          <button
            type="button"
            className={`${styles.foldersBtn} ${activeFolder ? styles.foldersBtnActive : ""}`}
            onClick={() => setFoldersOpen((o) => !o)}
            aria-expanded={foldersShown}
            title={foldersShown ? "Chiudi le cartelle" : activeFolder ? `Cartella: ${activeFolder.name}` : "Cartelle"}
            aria-label={foldersShown ? "Chiudi le cartelle" : "Apri le cartelle"}
          >
            <FolderIcon size={18} />
            {foldersShown && <span>Cartelle</span>}
          </button>
          {foldersShown && (
            <div className={styles.foldersBody}>
              <FolderBar
                value={folderFilter}
                onChange={changeFolderFilter}
                dragging={dragging}
                onTreksAdded={clearPicked}
                onAdd={(f) => startAdding(f.id)}
                adding={addingTo != null}
                vertical
              />
            </div>
          )}
        </aside>
      </div>
      )}

      {viewing && (
        <TrekViewDialog
          trek={viewing}
          gpx={viewing.hasGpx ? gpxTracks.trackOf(viewing.id) : null}
          color={trekColor(viewing)}
          onClose={() => setViewingId(null)}
          // modifica ed eliminazione si aprono sopra la scheda, che resta (e si aggiorna) sotto
          onEdit={() => setEditingId(viewing.id)}
          onDelete={() => setDeletingIds([viewing.id])}
        />
      )}
      {editing && <TrekEditDialog key={editing.id} trek={editing} onClose={() => setEditingId(null)} />}
      {deleting.length > 0 && <TrekDeleteDialog treks={deleting} onClose={() => setDeletingIds(null)} onDeleted={onDeleted} />}
    </div>
  );
}
