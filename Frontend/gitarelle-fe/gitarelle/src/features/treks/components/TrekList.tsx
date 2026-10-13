import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { LatLngBounds, LatLngLiteral } from "leaflet";
import { ABROAD, type FolderFilter, type Trek } from "../types";
import TrekMap from "./TrekMap";
import TrekClusterMap, { TRACK_ZOOM, type ClusterItem, type FocusRequest, type MapView } from "./TrekClusterMap";
import TrekEditDialog from "./TrekEditDialog";
import TrekViewDialog from "./TrekViewDialog";
import TrekDeleteDialog from "./TrekDeleteDialog";
import TrekTable from "./TrekTable";
import FolderBar from "./FolderBar";
import { useTreks } from "../TreksContext";
import { startTrekDrag } from "../trekDrag";
import { useGpxTracks } from "../../../shared/useGpxTracks";
import { addTreksToFolder, fetchGpxText, updateTrekLocation, uploadGpx } from "../api";
import styles from "./TrekList.module.css";
import { formatDate, formatGain, formatKm } from "../../../shared/format";
import { errorMessage } from "../../../shared/api";
import { colorForId } from "../../../shared/map";
import { CollapseIcon, DistanceIcon, ElevationIcon, ExpandIcon, EyeIcon, PencilIcon, PinIcon, TrashIcon } from "../../../shared/icons";
import { useFullscreen } from "../../../shared/useFullscreen";

const pointOf = (t: Trek): LatLngLiteral | null =>
  t.lat != null && t.lon != null ? { lat: t.lat, lng: t.lon } : null;

// compare: mappa con i trek inquadrati; detail: un trek alla volta; all: elenco completo senza mappa
type Mode = "detail" | "compare" | "all";

const colorOf = colorForId;

export default function TrekList() {
  const { treks, folders, loading, error, upsertTrek, upsertTreks } = useTreks();
  const [mode, setMode] = useState<Mode>("compare");

  // filtro per cartella: lista, dettaglio e confronto mostrano solo i trek visibili
  const [folderFilter, setFolderFilter] = useState<FolderFilter>("all");
  const activeFolder = typeof folderFilter === "number" ? folders.find((f) => f.id === folderFilter) : undefined;

  // modalità "Aggiungi" della cartella aperta: lista e mappa mostrano i trek che NON ci sono ancora,
  // ognuno con un "+" (sulla mappa accanto al pin); il filtro per regione aiuta a restringere la zona
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

  // filtro per regione (calcolata dal backend), da combinare con la cartella; null = tutte
  const [regionFilter, setRegionFilter] = useState<string | null>(null);
  const visibleTreks = regionFilter ? folderTreks.filter((t) => t.region === regionFilter) : folderTreks;
  // regioni con almeno un trek nella cartella scelta, in ordine alfabetico ed "Estero" in fondo
  const regionCounts = new Map<string, number>();
  for (const t of folderTreks) if (t.region) regionCounts.set(t.region, (regionCounts.get(t.region) ?? 0) + 1);
  const regions = [...regionCounts.keys()].sort((a, b) =>
    a === ABROAD ? 1 : b === ABROAD ? -1 : a.localeCompare(b, "it"));

  // trek scelti con Ctrl/⌘+clic (o Maiusc+clic per un intervallo) da trascinare insieme su una cartella
  const [picked, setPicked] = useState<Set<Trek["id"]>>(new Set());
  const [pickAnchor, setPickAnchor] = useState<Trek["id"] | null>(null);
  const [dragging, setDragging] = useState(false);
  const clearPicked = () => { setPicked(new Set()); setPickAnchor(null); };

  // si tiene l'id (non l'oggetto) così il dettaglio segue gli aggiornamenti della lista
  const [selectedId, setSelectedId] = useState<Trek["id"] | null>(null);
  const selected = visibleTreks.find((t) => t.id === selectedId) ?? null;

  // confronto: tutti i trek sono sulla mappa tranne quelli tolti a mano (così anche i nuovi compaiono subito)
  const [hidden, setHidden] = useState<Set<Trek["id"]>>(new Set());
  // (aggiungendo a una cartella si vedono tutti i candidati, anche quelli tolti a mano dalla mappa)
  const comparedTreks = visibleTreks.filter((t) => (addingTo || !hidden.has(t.id)) && (t.hasGpx || pointOf(t)));

  // zoom e area inquadrata dalla mappa del confronto
  const [view, setView] = useState<MapView | null>(null);
  // zoom dalla lista o dall'elenco: la mappa vola sulla traccia di quel trek
  const [focus, setFocus] = useState<FocusRequest | null>(null);
  const focusOn = (id: Trek["id"]) => setFocus((prev) => ({ key: String(id), seq: (prev?.seq ?? 0) + 1 }));
  const zoomedIn = view != null && view.zoom >= TRACK_ZOOM;
  const inView = (p: LatLngLiteral | null | undefined) => zoomedIn && p != null && view.bounds.pad(0.5).contains(p);

  // trek aperti nei dialog: scheda (click sulla mappa del confronto, si modifica campo per campo),
  // modifica completa (matita nella lista o nella scheda), eliminazione di uno o di quelli scelti
  const [viewingId, setViewingId] = useState<Trek["id"] | null>(null);
  const [editingId, setEditingId] = useState<Trek["id"] | null>(null);
  const [deletingIds, setDeletingIds] = useState<Trek["id"][] | null>(null);
  const viewing = treks.find((t) => t.id === viewingId) ?? null;
  const editing = treks.find((t) => t.id === editingId) ?? null;
  const deleting = deletingIds ? treks.filter((t) => deletingIds.includes(t.id)) : [];

  // tracce gpx da scaricare: quella del trek selezionato, oppure nel confronto quelle inquadrate
  // (più quelle dei trek senza punto, anche se tolti dalla mappa: servono per sapere dove stanno
  // e quindi se elencarli a sinistra) e quella della scheda aperta
  const gpxIds = mode === "detail"
    ? (selected?.hasGpx ? [selected.id] : [])
    : mode === "compare"
      ? visibleTreks.filter((t) => t.hasGpx && (!pointOf(t) || (!hidden.has(t.id) && inView(pointOf(t))))).map((t) => t.id)
      : [];
  if (viewing?.hasGpx && !gpxIds.includes(viewing.id)) gpxIds.push(viewing.id);
  // anche quella del trek su cui si fa zoom, così la mappa inquadra la traccia intera
  const focused = mode === "compare" && focus ? visibleTreks.find((t) => String(t.id) === focus.key) : undefined;
  if (focused?.hasGpx && !gpxIds.includes(focused.id)) gpxIds.push(focused.id);
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
    setHidden((prev) => {
      const next = new Set(prev);
      if (!next.delete(t.id)) next.add(t.id);
      return next;
    });
  }

  // "Tutti" / "Deseleziona" valgono per i trek della cartella attiva
  function showAllVisible(show: boolean) {
    setHidden((prev) => {
      const next = new Set(prev);
      for (const t of visibleTreks) {
        if (show) next.delete(t.id);
        else next.add(t.id);
      }
      return next;
    });
  }

  function onDeleted(ids: Trek["id"][]) {
    setDeletingIds(null);
    clearPicked();
    if (viewingId != null && ids.includes(viewingId)) setViewingId(null);
    if (selectedId != null && ids.includes(selectedId)) {
      setSelectedId(null);
      setPicking(false);
      setDraftPoint(null);
    }
  }

  // ogni scelta di cartella o regione reinquadra la mappa sui suoi trek, anche se è quella già attiva
  // (es. "Tutti" dopo l'apertura sull'ultimo trek aggiunto: si vedono tutti)
  const [fitSeq, setFitSeq] = useState(0);

  function changeFolderFilter(f: FolderFilter) {
    setFolderFilter(f);
    setAddingId(null);
    setFitSeq((s) => s + 1);
    setPicking(false);
    setDraftPoint(null);
    clearPicked();
  }

  // "+ Aggiungi" della cartella: si passa alla mappa con i trek che mancano, inquadrati tutti
  function startAdding(folderId: number) {
    if (mode !== "compare") changeMode("compare");
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

  function changeRegionFilter(r: string | null) {
    setRegionFilter(r);
    setFitSeq((s) => s + 1);
    setPicking(false);
    setDraftPoint(null);
    clearPicked();
  }

  function changeMode(m: Mode) {
    setMode(m);
    if (m !== "compare") setAddingId(null); // l'aggiunta dalla mappa vive nel confronto
    setPicking(false);
    setDraftPoint(null);
    clearPicked();
    setFocus(null); // la mappa si ricrea: non deve rivolare sull'ultimo trek cercato
  }

  // rimette il trek sulla mappa (se era stato tolto) e lo inquadra
  function zoomTo(t: Trek) {
    setHidden((prev) => {
      if (!prev.has(t.id)) return prev;
      const next = new Set(prev);
      next.delete(t.id);
      return next;
    });
    focusOn(t.id);
  }

  // dall'elenco completo: torna alla mappa e inquadra il trek
  function showOnMap(t: Trek) {
    changeMode("compare");
    zoomTo(t);
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
  const listing = mode === "all";

  const showableCount = visibleTreks.filter((t) => t.hasGpx || pointOf(t)).length;

  // pin di tutti i trek del confronto; il pin dei trek senza punto è la partenza del gpx
  const compareItems: (ClusterItem & { trek: Trek })[] = comparedTreks.map((t) => {
    const gpx = t.hasGpx ? gpxTracks.trackOf(t.id) : null;
    return {
      key: String(t.id),
      label: t.title,
      color: colorOf(t.id),
      gpx,
      point: pointOf(t) ?? gpx?.info.start ?? null,
      trek: t,
    };
  });
  // la mappa si apre sulla zona dell'ultimo trek aggiunto (tra quelli che hanno qualcosa da mostrare)
  const lastAdded = compareItems.reduce<(typeof compareItems)[number] | null>(
    (latest, i) => (!latest || i.trek.createdAt > latest.trek.createdAt ? i : latest), null);
  const lastAddedKey = lastAdded?.key ?? null;

  // da vicino: tracce dei trek inquadrati
  const trackItems = zoomedIn
    ? compareItems.filter((i) => i.trek.hasGpx && fallsIn(i.trek, view.bounds.pad(0.5)))
    : [];

  // nel confronto la lista mostra solo i trek che cadono nell'area inquadrata (anche quelli tolti
  // dalla mappa, per poterli rimettere); per vederli tutti c'è l'elenco
  const listedTreks = comparing
    ? visibleTreks.filter((t) => (view == null ? placeOf(t) != null : fallsIn(t, view.bounds)))
    : visibleTreks;

  // click su una card: con Ctrl/⌘ la sceglie per il trascinamento, con Maiusc sceglie l'intervallo
  // dall'ultima scelta; un click normale fa il solito (zoom o dettaglio) e azzera la scelta
  function onItemClick(e: React.MouseEvent, t: Trek) {
    if (e.ctrlKey || e.metaKey) {
      setPicked((prev) => {
        const next = new Set(prev);
        if (!next.delete(t.id)) next.add(t.id);
        return next;
      });
      setPickAnchor(t.id);
      return;
    }
    if (e.shiftKey && pickAnchor != null) {
      const ids = listedTreks.map((x) => x.id);
      const [a, b] = [ids.indexOf(pickAnchor), ids.indexOf(t.id)].sort((x, y) => x - y);
      if (a >= 0) {
        setPicked((prev) => new Set([...prev, ...ids.slice(a, b + 1)]));
        return;
      }
    }
    clearPicked();
    if (comparing) zoomTo(t);
    else select(t);
  }

  // si trascinano tutti i trek scelti se la card fa parte della scelta, altrimenti solo lei
  function onItemDragStart(e: React.DragEvent, t: Trek) {
    const ids = picked.has(t.id) ? listedTreks.filter((x) => picked.has(x.id)).map((x) => x.id) : [t.id];
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
                ? [`${visibleTreks.length} escursioni non ancora in "${addingTo.name}"`, regionFilter].filter(Boolean).join(" · ")
              : folderFilter === "all" && !regionFilter
                ? `${treks.length} escursioni nel diario`
                : [
                    `${visibleTreks.length} di ${treks.length} escursioni`,
                    folderFilter !== "all" && (activeFolder?.name ?? "senza cartella"),
                    regionFilter,
                  ].filter(Boolean).join(" · ")}
          </span>
        </div>
        {treks.length > 0 && (
          <div className={styles.segmented} role="tablist" aria-label="Modalità di visualizzazione">
            {([["detail", "Dettaglio"], ["compare", "Confronta percorsi"], ["all", "Elenco"]] as const).map(([m, label]) => (
              <button key={m} type="button" role="tab" aria-selected={mode === m} className={mode === m ? styles.segActive : ""} onClick={() => changeMode(m)}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {!loading && !error && (
        <div className={styles.toolbar}>
          <FolderBar
            value={folderFilter}
            onChange={changeFolderFilter}
            dragging={dragging}
            onTreksAdded={clearPicked}
            onAdd={(f) => startAdding(f.id)}
            adding={addingTo != null}
          />
          {(regions.length > 0 || regionFilter) && (
            <label className={`${styles.regionFilter} ${regionFilter ? styles.regionFilterOn : ""}`} title="Filtra per regione">
              <PinIcon size={14} />
              <span className="sr-only">Regione</span>
              <select value={regionFilter ?? ""} onChange={(e) => changeRegionFilter(e.target.value || null)}>
                <option value="">Tutte le regioni</option>
                {/* la regione scelta resta tra le opzioni anche se nella cartella attuale non ha trek */}
                {regionFilter && !regionCounts.has(regionFilter) && <option value={regionFilter}>{regionFilter} (0)</option>}
                {regions.map((r) => <option key={r} value={r}>{r} ({regionCounts.get(r)})</option>)}
              </select>
            </label>
          )}
          {comparing && treks.length > 0 && (
            <div className={styles.toolbarActions}>
              <span className={styles.counter}>{comparedTreks.length} sulla mappa</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => showAllVisible(true)} disabled={comparedTreks.length === showableCount}>
                Tutti
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => showAllVisible(false)} disabled={comparedTreks.length === 0}>
                Deseleziona
              </button>
            </div>
          )}
        </div>
      )}

      {/* elenco: tabella di tutti i trek della cartella, senza mappa */}
      {listing && !loading && !error && treks.length > 0 ? (
        <TrekTable
          treks={visibleTreks}
          folders={folders}
          onView={(t) => setViewingId(t.id)}
          onEdit={(t) => setEditingId(t.id)}
          onDelete={(t) => setDeletingIds([t.id])}
          onShowOnMap={showOnMap}
        />
      ) : (
      <div className={`${styles.layout} ${comparing ? styles.layoutCompare : ""}`}>
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
                ? `Tutte le escursioni${regionFilter ? ` in ${regionFilter === ABROAD ? "estero" : regionFilter}` : ""} sono già in "${addingTo.name}".`
                : regionFilter
                ? `Nessuna escursione in ${regionFilter === ABROAD ? "estero" : regionFilter}${activeFolder ? ` nella cartella "${activeFolder.name}"` : folderFilter === "none" ? " senza cartella" : ""}.`
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

          {/* scelta multipla: da trascinare su una cartella o da eliminare insieme */}
          {!addingTo && listedTreks.length > 0 && (
            picked.size > 0 ? (
              <div className={styles.pickBar}>
                <span>
                  <b>{picked.size}</b> {picked.size === 1 ? "scelta" : "scelte"}{folders.length > 0 && ": trascinale su una cartella"}
                </span>
                <div className={styles.pickActions}>
                  {picked.size < listedTreks.length && (
                    <button type="button" className={styles.linkBtn} onClick={() => setPicked(new Set(listedTreks.map((t) => t.id)))}>
                      Tutte ({listedTreks.length})
                    </button>
                  )}
                  <button type="button" className={styles.linkBtn} onClick={clearPicked}>Deseleziona</button>
                  <button type="button" className={`btn btn-sm ${styles.pickDelete}`} onClick={() => setDeletingIds([...picked])}>
                    <TrashIcon size={14} /> Elimina
                  </button>
                </div>
              </div>
            ) : (
              <p className={styles.pickTip}>
                Ctrl+clic (o Maiusc+clic) per sceglierne più d'una: {folders.length > 0 ? "trascinale su una cartella o eliminale insieme" : "eliminale insieme"}
              </p>
            )
          )}
          {comparing && visibleTreks.length > 0 && listedTreks.length === 0 && (
            <div className={styles.empty}>
              Nessuna escursione nell'area inquadrata. Sposta la mappa o apri l'
              <button type="button" className={styles.linkBtn} onClick={() => changeMode("all")}>elenco completo</button>.
            </div>
          )}

          <ul className={styles.list}>
            {listedTreks.map((t) => {
              const nothingToShow = !t.hasGpx && !pointOf(t);
              const compareColor = !hidden.has(t.id) && !nothingToShow ? colorOf(t.id) : undefined;
              const active = comparing ? compareColor != null : selectedId === t.id;
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
                    className={`${styles.item} ${active ? styles.itemActive : ""} ${picked.has(t.id) ? styles.itemPicked : ""} ${addingTo ? styles.itemWithTwo : comparing ? styles.itemWithEye : styles.itemWithTools}`}
                    aria-pressed={comparing ? undefined : active}
                    disabled={comparing && nothingToShow}
                    title={comparing ? (nothingToShow ? "Nessun punto né traccia da mostrare" : "Zoom sul percorso") : undefined}
                    style={comparing && compareColor ? ({ "--item-color": compareColor } as React.CSSProperties) : undefined}
                  >
                    {/* nel confronto il click sulla card fa zoom; la spunta mette o toglie il trek dalla mappa */}
                    {comparing && (
                      <span
                        className={`${styles.check} ${styles.checkToggle} ${active ? styles.checkOn : ""}`}
                        onClick={(e) => { e.stopPropagation(); toggleCompared(t); }}
                        title={active ? "Togli dalla mappa" : "Mostra sulla mappa"}
                      >
                        {active && "✓"}
                      </span>
                    )}
                    <div className={styles.dateBadge}>
                      <span>{formatDate(t.trekDate, { day: "2-digit" }) || "–"}</span>
                      <small>{formatDate(t.trekDate, { month: "short" })}</small>
                    </div>
                    <div className={styles.itemBody}>
                      {/* il titolo apre la scheda invece di selezionare il trek (da tastiera c'è l'occhio) */}
                      <div
                        className={`${styles.itemTitle} ${styles.itemTitleLink}`}
                        onClick={(e) => { e.stopPropagation(); setViewingId(t.id); }}
                        title="Vedi i dettagli"
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
                    {!comparing && (
                      <>
                        <button type="button" className={styles.toolBtn} onClick={() => setEditingId(t.id)} title="Modifica" aria-label={`Modifica ${t.title}`}>
                          <PencilIcon />
                        </button>
                        <button type="button" className={`${styles.toolBtn} ${styles.toolDanger}`} onClick={() => setDeletingIds([t.id])} title="Elimina" aria-label={`Elimina ${t.title}`}>
                          <TrashIcon />
                        </button>
                      </>
                    )}
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
          {/* la mappa c'è sempre, anche senza trek scelti: cambiano solo i suggerimenti sopra */}
          {comparing ? (
            <>
              <TrekClusterMap
                items={compareItems}
                tracks={trackItems}
                fitKey={String(fitSeq)}
                startKey={lastAddedKey}
                onViewChange={setView}
                onSelect={(key) => setViewingId(comparedTreks.find((t) => String(t.id) === key)?.id ?? null)}
                onAdd={addingTo ? (key) => {
                  const t = comparedTreks.find((x) => String(x.id) === key);
                  if (t) addToFolder(t);
                } : undefined}
                focus={focus}
              />
              {compareItems.length === 0 ? (
                <div className={styles.mapHint}>Seleziona dalla lista i trek da vedere sulla mappa</div>
              ) : !zoomedIn && view && (
                <div className={styles.mapHint}>Zooma su un gruppo per vedere le tracce</div>
              )}
            </>
          ) : (
            <>
              <TrekMap
                // con il gpx inquadra la traccia intera: niente punto, che centrerebbe sulla partenza mentre la traccia arriva
                point={picking ? draftPoint : selected?.hasGpx ? null : selectedPoint}
                gpx={selectedGpx}
                trackKey={selected ? String(selected.id) : "none"}
                onPick={picking ? setDraftPoint : undefined}
              />
              {!selected && <div className={styles.mapHint}>Seleziona un trek dalla lista per vederlo sulla mappa</div>}
              {selected && (
                <>
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
                        // con il gpx la posizione è la traccia: punto e caricamento servono solo ai trek senza
                        !selected.hasGpx && (
                          <>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={startPicking} disabled={busy}>
                              📍 {selectedPoint ? "Sposta punto" : "Aggiungi punto"}
                            </button>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileInput.current?.click()} disabled={busy}>
                              {busy ? "Caricamento..." : "⤒ Carica GPX"}
                            </button>
                          </>
                        )
                      )}
                      <input ref={fileInput} type="file" accept=".gpx" hidden onChange={onGpxPicked} />
                    </div>

                    {(actionError || gpxError) && <div className={`alert alert-error ${styles.detailAlert}`}>{actionError ?? gpxError}</div>}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
      )}

      {viewing && (
        <TrekViewDialog
          trek={viewing}
          gpx={viewing.hasGpx ? gpxTracks.trackOf(viewing.id) : null}
          color={colorOf(viewing.id)}
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
