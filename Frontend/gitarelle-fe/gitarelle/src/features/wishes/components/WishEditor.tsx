import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CircleMarker, useMap } from "react-leaflet";
import { LeafletContext, createLeafletContext } from "@react-leaflet/core";
import type { LatLngLiteral, Map as LeafletMap } from "leaflet";
import type { Wish } from "../types";
import { createWish, deleteWishGpx, fetchWishGpxText, saveWishGpx, updateWish } from "../api";
import { errorMessage } from "../../../shared/api";
import { parseGpx, type ParsedGpx } from "../../../shared/gpx";
import { computeProfile, slopeColor, trackDuration, trackStats, type ProfilePoint } from "../../../shared/elevation";
import { formatGain, formatKm, formatTrackDuration, trackDurationLabel } from "../../../shared/format";
import TrackLayer from "../../../shared/TrackLayer";
import DirectionArrows from "../../../shared/DirectionArrows";
import ElevationProfile, { type ProfileMarker } from "../../treks/components/ElevationProfile";
import PlannerLayers from "../../routes/components/PlannerLayers";
import { useRoutePlanner } from "../../routes/useRoutePlanner";
import { toGpxFile } from "../../routes/route";
import PlaceSearch from "./PlaceSearch";
import { WISH_DRAW_COLOR } from "../theme";
import { ClockIcon, DistanceIcon, ElevationIcon, ElevationLossIcon, InfoIcon, PencilIcon, EraserIcon, TrashIcon, UndoIcon, UploadIcon } from "../../../shared/icons";
import styles from "./Wishes.module.css";

type Props = {
  wish: Wish | null; // null = nuova idea
  map: LeafletMap; // la mappa della sezione: il disegno ci si appoggia sopra
  mapOverlay: HTMLElement | null; // riquadro della mappa: ricerca luoghi e suggerimenti
  onClose: () => void;
  onSaved: (wish: Wish, gpxChanged: boolean) => void;
};

function FlyTo({ target }: { target: LatLngLiteral | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, Math.max(map.getZoom(), 14), { duration: 0.8 });
  }, [map, target]);
  return null;
}

// Creazione e modifica di un'idea dentro la sezione: il pannello prende il posto della lista e il
// percorso si disegna sulla stessa mappa delle idee (tappe lungo i sentieri) oppure si carica un gpx.
// La ricerca luoghi sta sopra la mappa, il profilo nel pannello sotto il percorso. La posizione dell'idea è la partenza del percorso
export default function WishEditor({ wish, map, mapOverlay, onClose, onSaved }: Props) {
  const [name, setName] = useState(wish?.name ?? "");
  const [notes, setNotes] = useState(wish?.notes ?? "");
  // un'idea col solo punto parte inquadrata lì (con la traccia ci pensa TrackLayer)
  const [flyTo, setFlyTo] = useState<LatLngLiteral | null>(
    wish && !wish.hasGpx && wish.lat != null && wish.lon != null ? { lat: wish.lat, lng: wish.lon } : null,
  );
  const [showHelp, setShowHelp] = useState(false); // istruzioni del disegno, dietro l'icona "i"
  const [toolsOpen, setToolsOpen] = useState(true); // tendina dei comandi sulla mappa

  // traccia "caricata": quella già salvata dell'idea o un file gpx scelto ora (gpxFile)
  const [loaded, setLoaded] = useState<ParsedGpx | null>(null);
  const [loadedKey, setLoadedKey] = useState(0); // cambia a ogni nuova traccia: la mappa la reinquadra
  const [gpxFile, setGpxFile] = useState<File | null>(null);
  const [removedSaved, setRemovedSaved] = useState(false); // "Rimuovi" sulla traccia già salvata
  const hasLoaded = gpxFile != null || (wish?.hasGpx === true && !removedSaved);

  // disegno: è la modalità di partenza; con una traccia caricata si entra con "Ridisegna"
  const planner = useRoutePlanner();
  const [redrawing, setRedrawing] = useState(false);
  const drawing = !hasLoaded || redrawing;
  const useDrawn = drawing && planner.complete;
  // tappe messe ma percorso non ancora pronto (in calcolo, senza sentiero o una tappa sola)
  const drawingIncomplete = drawing && planner.waypoints.length > 0 && !planner.complete;

  function showLoaded(parsed: ParsedGpx) {
    setLoaded(parsed);
    setLoadedKey((k) => k + 1);
  }

  useEffect(() => {
    if (!wish?.hasGpx) return;
    const ctrl = new AbortController();
    fetchWishGpxText(wish.id, ctrl.signal)
      .then((text) => showLoaded(parseGpx(text)))
      .catch(() => { /* senza anteprima il form funziona lo stesso */ });
    return () => ctrl.abort();
  }, [wish?.id, wish?.hasGpx]);

  // i livelli del disegno vivono qui ma si agganciano alla mappa della sezione
  const leaflet = useMemo(() => createLeafletContext(map), [map]);

  // cursore a mirino finché si disegna
  useEffect(() => {
    const el = map.getContainer();
    el.style.cursor = drawing ? "crosshair" : "";
    return () => { el.style.cursor = ""; };
  }, [map, drawing]);

  // la tendina del disegno sta sotto il selettore delle viste: quando questo si apre la si sposta giù,
  // così si vedono entrambe senza sovrapporsi
  const [layersH, setLayersH] = useState(34);
  useEffect(() => {
    const layers = map.getContainer().querySelector<HTMLElement>(".gt-layers");
    if (!layers) return;
    const ro = new ResizeObserver(() => setLayersH(layers.offsetHeight));
    ro.observe(layers);
    return () => ro.disconnect();
  }, [map]);

  async function onPickGpx(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const parsed = parseGpx(await file.text());
    setGpxFile(file);
    setRemovedSaved(false);
    setRedrawing(false);
    planner.clear();
    showLoaded(parsed); // la mappa inquadra la traccia intera
    if (!name.trim()) setName(parsed.info.name ?? file.name.replace(/\.gpx$/i, ""));
  }

  function removeLoaded() {
    if (gpxFile) setGpxFile(null);
    else setRemovedSaved(true);
    setLoaded(null);
    setRedrawing(false);
  }

  function stopRedrawing() {
    setRedrawing(false);
    planner.clear();
  }

  // traccia mostrata e misurata: il disegno in corso oppure quella caricata
  const liveTrack = drawing ? planner.track : loaded;
  // le tappe del disegno anche sul profilo (sull'asse della distanza), numerate come sulla mappa
  const liveMarkers = useMemo<ProfileMarker[] | undefined>(() => (drawing
    ? planner.waypointDistances.map((d, i, all) => ({ d, label: String(i + 1), kind: i === 0 ? "start" : i === all.length - 1 ? "end" : "via" }))
    : undefined), [drawing, planner.waypointDistances]);

  // Mentre il percorso si ricalcola (es. una tappa spostata) la traccia nuova non c'è ancora: profilo e
  // numeri restano quelli di prima, un po' spenti, invece di sparire e ricomparire. La tappa spostata
  // dal profilo resta già dove è stata lasciata
  const [kept, setKept] = useState<{ track: ParsedGpx; markers?: ProfileMarker[] } | null>(null);
  if (liveTrack && (kept?.track !== liveTrack || kept.markers !== liveMarkers)) setKept({ track: liveTrack, markers: liveMarkers });
  const recalculating = drawing && planner.loading && liveTrack == null && kept != null;
  const [moved, setMoved] = useState<{ i: number; d: number } | null>(null);
  if (moved && !recalculating) setMoved(null);

  const track = liveTrack ?? (recalculating ? kept.track : null);
  const stats = track ? trackStats(track) : null;
  const duration = track ? trackDuration(track) : null;
  const profile = useMemo(() => (track ? computeProfile(track) : null), [track]);
  const [profilePoint, setProfilePoint] = useState<ProfilePoint | null>(null);
  const profileMarkers = recalculating
    ? kept.markers?.map((m, i) => (moved?.i === i ? { ...m, d: moved.d } : m))
    : liveMarkers;

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // se l'idea è stata creata ma il gpx è fallito, un nuovo "Salva" deve aggiornarla, non ricrearla
  const [savedId, setSavedId] = useState<Wish["id"] | null>(wish?.id ?? null);

  const close = () => { if (!saving) onClose(); };

  async function onSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!name.trim() || drawingIncomplete) return;
    const upload = useDrawn ? toGpxFile(planner.line, name) : gpxFile;
    const remove = !upload && removedSaved && wish?.hasGpx === true;
    // posizione = partenza del percorso; senza percorso resta quella che l'idea aveva già (vecchie idee col solo punto)
    const start = useDrawn ? planner.waypoints[0] : hasLoaded ? loaded?.info.start : undefined;
    const payload = {
      name: name.trim(),
      idealPeriod: wish?.idealPeriod ?? null, // non più nel form: si conserva quello già salvato
      link: wish?.link ?? null, // non più nel form: si conserva quello già salvato
      notes: notes.trim() || null,
      lat: start?.lat ?? (remove ? null : wish?.lat ?? null),
      lon: start?.lng ?? (remove ? null : wish?.lon ?? null),
    };
    try {
      setSaving(true);
      setError(null);
      let saved = savedId == null ? await createWish(payload) : await updateWish(savedId, payload);
      setSavedId(saved.id);
      let gpxChanged = false;
      if (upload) {
        saved = await saveWishGpx(saved.id, upload);
        gpxChanged = true;
      } else if (remove && saved.hasGpx) {
        saved = await deleteWishGpx(saved.id);
        gpxChanged = true;
      }
      onSaved(saved, gpxChanged);
    } catch (err) {
      setError(errorMessage(err, "Errore nel salvataggio"));
      setSaving(false);
    }
  }

  const n = planner.waypoints.length;

  return (
    <>
      <LeafletContext.Provider value={leaflet}>
        <FlyTo target={flyTo} />
        {drawing ? (
          <PlannerLayers planner={planner} color={WISH_DRAW_COLOR} />
        ) : (
          loaded && <TrackLayer gpx={loaded} trackKey={`wish-form-${loadedKey}`} color={WISH_DRAW_COLOR} />
        )}
        {/* verso di percorrenza, sia sul disegno sia sulla traccia caricata */}
        {liveTrack && <DirectionArrows gpx={liveTrack} />}
        {profilePoint && (
          <CircleMarker center={[profilePoint.lat, profilePoint.lng]} radius={7}
            pathOptions={{ color: "#fff", weight: 3, fillColor: slopeColor(profilePoint.slope), fillOpacity: 1 }} />
        )}
      </LeafletContext.Provider>

      {/* sopra la mappa ma fuori dal contenitore di leaflet: i clic qui non mettono tappe */}
      {mapOverlay && createPortal(
        <>
          <div className={styles.mapSearch}>
            <PlaceSearch
              onPick={(p) => {
                setFlyTo(p.pos);
                if (!name.trim()) setName(p.name);
              }}
            />
          </div>

          {/* comandi del disegno: tendina verticale a destra, sotto il pulsante delle viste */}
          {drawing && (
            <div
              className={`${styles.drawPanel} ${toolsOpen ? "" : styles.drawPanelClosed}`}
              style={{ top: 10 + layersH + 10 }} // 10px dal bordo come le viste, poi 10px di stacco
            >
              <div className={styles.drawHeadRow}>
                <button
                  type="button"
                  className={styles.drawHead}
                  onClick={() => setToolsOpen((v) => !v)}
                  aria-expanded={toolsOpen}
                  title={toolsOpen ? "Chiudi i comandi" : "Apri i comandi del disegno"}
                >
                  <PencilIcon size={13} />
                  {toolsOpen && <span>Disegno</span>}
                  <span className={styles.drawChevron} aria-hidden="true">{toolsOpen ? "▴" : "▾"}</span>
                </button>
                {toolsOpen && (
                  <button
                    type="button"
                    className={styles.drawInfo}
                    onClick={() => setShowHelp((v) => !v)}
                    aria-expanded={showHelp}
                    aria-pressed={showHelp}
                    title="Come si disegna"
                    aria-label="Come si disegna"
                  >
                    <InfoIcon size={12} />
                  </button>
                )}
              </div>

              {toolsOpen && (
                <>
                  {showHelp && (
                    <div className={styles.routeHelp}>
                      <p><b>Clic</b> sulla mappa: aggiunge una tappa {planner.addAt === "start" ? "prima della partenza" : "dopo l'arrivo"}.</p>
                      <p><b>Trascina</b> una tappa per spostarla, <b>clic</b> per toglierla.</p>
                      <p className={styles.routeCredit}>Percorsi con BRouter, dati © OpenStreetMap</p>
                    </div>
                  )}

                  <div className={styles.drawGroup} role="radiogroup" aria-label="Dove aggiungere le nuove tappe">
                    <button type="button" role="radio" aria-checked={planner.addAt === "start"} onClick={() => planner.setAddAt("start")} title="Le nuove tappe vanno prima della partenza">
                      <span className={styles.drawIcon}>⇤</span> All'inizio
                    </button>
                    <button type="button" role="radio" aria-checked={planner.addAt === "end"} onClick={() => planner.setAddAt("end")} title="Le nuove tappe vanno dopo l'arrivo">
                      <span className={styles.drawIcon}>⇥</span> Alla fine
                    </button>
                  </div>

                  <div className={styles.drawGroup}>
                    <button type="button" onClick={planner.undo} disabled={!planner.canUndo} title="Annulla l'ultima modifica">
                      <span className={styles.drawIcon}><UndoIcon size={14} /></span> Annulla
                    </button>
                    <button type="button" onClick={planner.clear} disabled={!n} title="Cancella tutte le tappe e ricomincia">
                      <span className={styles.drawIcon}><EraserIcon size={14} /></span> Ricomincia
                    </button>
                  </div>

                  {/* chiusure rapide del percorso (una sola azione: "Annulla" le toglie) */}
                  <div className={styles.drawGroup}>
                    <button type="button" onClick={planner.returnSameWay} disabled={n < 2 || planner.endsAtStart} title="Aggiunge il ritorno lungo lo stesso sentiero dell'andata">
                      <span className={styles.drawIcon}>↩</span> Ritorno uguale
                    </button>
                    <button type="button" onClick={planner.endAtStart} disabled={n < 2 || planner.endsAtStart} title="Aggiunge come ultima tappa il punto di partenza (giro ad anello)">
                      <span className={styles.drawIcon}>⟲</span> Ad anello
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          {drawing && n < 2 && (
            <div className={`${styles.mapHint} ${styles.planHint}`}>
              {n === 0 ? "Clicca sulla mappa per mettere la partenza" : "Clicca per aggiungere la prossima tappa"}
            </div>
          )}
        </>,
        mapOverlay,
      )}

      {/* il pannello prende il posto della lista delle idee */}
      <form onSubmit={onSubmit} className={styles.planSide}>
        <div className={styles.planTitle}>
          <h3>{wish ? "Modifica idea" : "Nuova idea di tour"}</h3>
          <button type="button" className="modal-icon-btn" onClick={close} disabled={saving} title="Chiudi" aria-label="Chiudi">
            ✕
          </button>
        </div>

        {/* campi compatti: etichetta a sinistra, campo accanto */}
        <div className={styles.compactFields}>
          <label className={styles.compactField}>
            <span>Nome *</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="Es. Alta Via n.1 delle Dolomiti" required autoFocus />
          </label>
          <label className={styles.compactField}>
            <span>Note</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Perché ci vuoi andare, con chi..." />
          </label>
        </div>

        {/* percorso: riquadro a parte, con più spazio ora che sta nella colonna della lista */}
        <section className={styles.routeBox} aria-label="Percorso">
          <h4 className={styles.routeTitle}>Percorso</h4>
          {!drawing ? (
            <div className={styles.routeBar}>
              <span className={styles.routeFile} title={gpxFile ? gpxFile.name : "Traccia GPX salvata"}>
                〰 {gpxFile ? gpxFile.name : "Traccia GPX salvata"}
              </span>
              <button type="button" className="modal-icon-btn" onClick={() => setRedrawing(true)} title="Ridisegna sulla mappa" aria-label="Ridisegna sulla mappa">
                <PencilIcon size={15} />
              </button>
              <label className="modal-icon-btn" title="Sostituisci con un altro GPX" aria-label="Sostituisci GPX">
                <UploadIcon size={15} />
                <input type="file" accept=".gpx" hidden onChange={onPickGpx} />
              </label>
              <button type="button" className="modal-icon-btn is-danger" onClick={removeLoaded} title="Rimuovi la traccia" aria-label="Rimuovi la traccia">
                <TrashIcon size={15} />
              </button>
            </div>
          ) : (
            <>
              {redrawing ? (
                <button type="button" className={styles.gpxDrop} onClick={stopRedrawing} title="Torna alla traccia caricata">
                  ↩ Torna alla traccia GPX
                </button>
              ) : (
                <label className={styles.gpxDrop} title="Carica un file GPX invece di disegnare">
                  <UploadIcon size={18} />
                  <span>
                    <b>Carica un file GPX</b>
                    <small>oppure disegna il percorso cliccando sulla mappa</small>
                  </span>
                  <input type="file" accept=".gpx" hidden onChange={onPickGpx} />
                </label>
              )}
            </>
          )}

          <div className={styles.routeStats}>
            <span title="Distanza"><DistanceIcon size={14} />{stats ? formatKm(stats.distance) : "—"}</span>
            <span title="Dislivello positivo"><ElevationIcon size={14} />{stats?.gain != null ? `+${formatGain(stats.gain)}` : "—"}</span>
            <span title="Dislivello negativo"><ElevationLossIcon size={14} />{stats?.loss != null ? `−${formatGain(stats.loss)}` : "—"}</span>
            <span title={duration ? trackDurationLabel(duration) : "Tempo di percorrenza"}><ClockIcon size={14} />{duration ? formatTrackDuration(duration) : "—"}</span>
          </div>

          {drawing && planner.loading && <p className={styles.routeStatus}>Calcolo del percorso lungo i sentieri…</p>}
          {drawing && planner.error && <p className={`${styles.routeStatus} ${styles.routeError}`}>{planner.error}</p>}

          {profile && (
            <div className={recalculating ? styles.profileBusy : styles.profileLive}>
            <ElevationProfile
              profile={profile}
              onHover={setProfilePoint}
              markers={profileMarkers}
              // clic su una tappa: la mappa ci vola; trascinata lungo l'asse: si sposta sul punto della traccia
              // a quella distanza e il percorso si ricalcola
              onMarkerClick={drawing && !recalculating ? (i) => setFlyTo({ ...planner.waypoints[i] }) : undefined}
              onMarkerMove={drawing && !recalculating ? (i, p) => {
                planner.move(i, { lat: p.lat, lng: p.lng });
                setMoved({ i, d: p.d });
                setProfilePoint(null);
              } : undefined}
            />
            </div>
          )}
        </section>

        {error && <div className="alert alert-error">{error}</div>}

        <div className={styles.formFooter}>
          {drawingIncomplete && (
            <span className={styles.footerHint}>
              {planner.loading ? "Attendi il calcolo del percorso…" : n === 1 ? "Aggiungi almeno un'altra tappa o ricomincia" : "Sistema le tappe senza sentiero o ricomincia"}
            </span>
          )}
          <button type="button" className="btn btn-ghost" onClick={close} disabled={saving}>Annulla</button>
          <button type="submit" className={`btn ${styles.btnWish}`} disabled={saving || !name.trim() || drawingIncomplete}>
            {saving ? "Salvataggio..." : wish ? "Salva modifiche" : "Aggiungi alla lista"}
          </button>
        </div>
      </form>
    </>
  );
}
