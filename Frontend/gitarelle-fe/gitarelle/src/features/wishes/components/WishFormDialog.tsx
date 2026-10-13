import { useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, useMap } from "react-leaflet";
import type { LatLngLiteral } from "leaflet";
import type { Wish } from "../types";
import { createWish, deleteWishGpx, fetchWishGpxText, saveWishGpx, updateWish } from "../api";
import { errorMessage } from "../../../shared/api";
import { parseGpx, type ParsedGpx } from "../../../shared/gpx";
import { computeProfile, slopeColor, trackDuration, trackStats, type ProfilePoint } from "../../../shared/elevation";
import { formatGain, formatKm, formatTrackDuration, trackDurationLabel } from "../../../shared/format";
import { TILE_MAX_ZOOM } from "../../../shared/map";
import Modal from "../../../shared/Modal";
import MapLayers from "../../../shared/MapLayers";
import TrackLayer from "../../../shared/TrackLayer";
import ItalyView from "../../../shared/ItalyView";
import InvalidateOnResize from "../../../shared/InvalidateOnResize";
import ElevationProfile, { type ProfileMarker } from "../../treks/components/ElevationProfile";
import PlannerLayers from "../../routes/components/PlannerLayers";
import { useRoutePlanner } from "../../routes/useRoutePlanner";
import { toGpxFile } from "../../routes/route";
import PlaceSearch from "./PlaceSearch";
import { WISH_DRAW_COLOR } from "../theme";
import { ClockIcon, DistanceIcon, ElevationIcon, InfoIcon, PencilIcon, RestartIcon, TrashIcon, UndoIcon, UploadIcon } from "../../../shared/icons";
import styles from "./Wishes.module.css";

type Props = {
  wish: Wish | null; // null = nuova idea
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

// Creazione e modifica di un'idea: basta il nome. Il percorso si disegna direttamente sulla mappa
// (tappe lungo i sentieri) oppure si carica un gpx; la ricerca luoghi sta sopra la mappa.
// La posizione dell'idea è la partenza del percorso
export default function WishFormDialog({ wish, onClose, onSaved }: Props) {
  const [name, setName] = useState(wish?.name ?? "");
  const [link, setLink] = useState(wish?.link ?? "");
  const [notes, setNotes] = useState(wish?.notes ?? "");
  const [flyTo, setFlyTo] = useState<LatLngLiteral | null>(null);
  const [showHelp, setShowHelp] = useState(false); // istruzioni del disegno, dietro l'icona "i"

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
  const track = drawing ? planner.track : loaded;
  const stats = track ? trackStats(track) : null;
  const duration = track ? trackDuration(track) : null;
  const profile = useMemo(() => (track ? computeProfile(track) : null), [track]);
  const [profilePoint, setProfilePoint] = useState<ProfilePoint | null>(null);
  // le tappe del disegno anche sul profilo, numerate come sulla mappa
  const profileMarkers: ProfileMarker[] | undefined = drawing
    ? planner.waypointDistances.map((d, i, all) => ({ d, label: String(i + 1), kind: i === 0 ? "start" : i === all.length - 1 ? "end" : "via" }))
    : undefined;

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
      link: link.trim() || null,
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

  const center = wish?.lat != null && wish?.lon != null ? { lat: wish.lat, lng: wish.lon } : null;
  const n = planner.waypoints.length;

  return (
    <Modal title={wish ? "Modifica idea" : "Nuova idea di tour"} onClose={close} xl>
      <form onSubmit={onSubmit} className={styles.planLayout}>
        {/* colonna sinistra: mappa e, subito sotto, il profilo altimetrico (stessa larghezza) */}
        <div className={styles.planMain}>
          <div className={`map-frame ${styles.planMap}`}>
            <MapContainer
              center={center ?? { lat: 42.5, lng: 12.5 }}
              zoom={center ? 13 : 6}
              maxZoom={TILE_MAX_ZOOM}
              style={{ height: "100%", width: "100%", cursor: drawing ? "crosshair" : undefined }}
            >
              <MapLayers />
              {!center && <ItalyView />}
              <InvalidateOnResize />
              <FlyTo target={flyTo} />
              {drawing ? (
                <PlannerLayers planner={planner} color={WISH_DRAW_COLOR} />
              ) : (
                loaded && <TrackLayer gpx={loaded} trackKey={`wish-form-${loadedKey}`} color={WISH_DRAW_COLOR} />
              )}
              {profilePoint && (
                <CircleMarker center={[profilePoint.lat, profilePoint.lng]} radius={7}
                  pathOptions={{ color: "#fff", weight: 3, fillColor: slopeColor(profilePoint.slope), fillOpacity: 1 }} />
              )}
            </MapContainer>

            {/* sopra la mappa ma fuori dal contenitore di leaflet: i clic qui non mettono tappe */}
            <div className={styles.mapSearch}>
              <PlaceSearch
                onPick={(p) => {
                  setFlyTo(p.pos);
                  if (!name.trim()) setName(p.name);
                }}
              />
            </div>
            {drawing && n < 2 && (
              <div className={`${styles.mapHint} ${styles.planHint}`}>
                {n === 0 ? "Clicca sulla mappa per mettere la partenza" : "Clicca per aggiungere la prossima tappa"}
              </div>
            )}
          </div>

          {profile ? (
            <div className={styles.planProfile}>
              <ElevationProfile profile={profile} onHover={setProfilePoint} markers={profileMarkers} />
            </div>
          ) : (
            <div className={styles.planProfileEmpty}>
              {track ? "Questa traccia non ha le quote: profilo altimetrico non disponibile" : "Qui comparirà il profilo altimetrico del percorso"}
            </div>
          )}
        </div>

        <aside className={styles.planSide}>
          <label className={`field ${styles.compactField}`}>
            <span>Nome *</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="Es. Alta Via n.1 delle Dolomiti" required autoFocus />
          </label>
          <label className={`field ${styles.compactField}`}>
            <span>Link</span>
            <input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://www.komoot.com/..." />
          </label>
          <label className={`field ${styles.compactField}`}>
            <span>Note</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Perché ci vuoi andare, con chi, cosa serve..." />
          </label>

          {/* percorso: riquadro a parte, solo icone (il nome dell'azione è nel tooltip) */}
          <section className={styles.routeBox} aria-label="Percorso">
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
              <div className={styles.routeBar}>
                {redrawing ? (
                  <button type="button" className={styles.gpxPill} onClick={stopRedrawing} title="Torna alla traccia caricata">↩ GPX</button>
                ) : (
                  <label className={styles.gpxPill} title="Carica un file GPX invece di disegnare">
                    <UploadIcon size={14} /> GPX
                    <input type="file" accept=".gpx" hidden onChange={onPickGpx} />
                  </label>
                )}
                <span className={styles.routeSpacer} />
                <button type="button" className="modal-icon-btn" onClick={planner.undo} disabled={!planner.canUndo} title="Annulla" aria-label="Annulla">
                  <UndoIcon size={15} />
                </button>
                <button type="button" className="modal-icon-btn" onClick={planner.clear} disabled={!n} title="Ricomincia" aria-label="Ricomincia">
                  <RestartIcon size={15} />
                </button>
                <button
                  type="button"
                  className={`modal-icon-btn ${showHelp ? styles.iconOn : ""}`}
                  onClick={() => setShowHelp((v) => !v)}
                  title="Come si disegna"
                  aria-label="Come si disegna"
                  aria-expanded={showHelp}
                >
                  <InfoIcon size={15} />
                </button>
              </div>
            )}

            {drawing && (
              <div className={styles.addAt} role="radiogroup" aria-label="Dove aggiungere le nuove tappe">
                <button type="button" role="radio" aria-checked={planner.addAt === "start"} onClick={() => planner.setAddAt("start")} title="Le nuove tappe vanno prima della partenza">
                  ⇤ Aggiungi all'inizio
                </button>
                <button type="button" role="radio" aria-checked={planner.addAt === "end"} onClick={() => planner.setAddAt("end")} title="Le nuove tappe vanno dopo l'arrivo">
                  Aggiungi alla fine ⇥
                </button>
              </div>
            )}

            {/* chiusure rapide del percorso (una sola azione: "Annulla" le toglie) */}
            {drawing && (
              <div className={styles.routeExtras}>
                <button
                  type="button"
                  onClick={planner.returnSameWay}
                  disabled={n < 2 || planner.endsAtStart}
                  title="Aggiunge il ritorno lungo lo stesso sentiero dell'andata"
                >
                  ↩ Ritorno stesso percorso
                </button>
                <button
                  type="button"
                  onClick={planner.endAtStart}
                  disabled={n < 2 || planner.endsAtStart}
                  title="Aggiunge come ultima tappa il punto di partenza (giro ad anello)"
                >
                  ⟲ Termina alla partenza
                </button>
              </div>
            )}

            {drawing && showHelp && (
              <div className={styles.routeHelp}>
                <p><b>Clic</b> sulla mappa: aggiunge una tappa {planner.addAt === "start" ? "prima della partenza" : "dopo l'arrivo"}.</p>
                <p><b>Trascina</b> una tappa per spostarla, <b>clic</b> per toglierla.</p>
                <p className={styles.routeCredit}>Percorsi calcolati con BRouter su dati © OpenStreetMap contributors</p>
              </div>
            )}

            <div className={styles.routeStats}>
              <span title="Distanza"><DistanceIcon size={14} />{stats ? formatKm(stats.distance) : "—"}</span>
              <span title="Dislivello positivo"><ElevationIcon size={14} />{stats?.gain != null ? `+${formatGain(stats.gain)}` : "—"}</span>
              <span title={duration ? trackDurationLabel(duration) : "Tempo di percorrenza"}><ClockIcon size={14} />{duration ? formatTrackDuration(duration) : "—"}</span>
            </div>

            {drawing && planner.loading && <p className={styles.routeStatus}>Calcolo del percorso lungo i sentieri…</p>}
            {drawing && planner.error && <p className={`${styles.routeStatus} ${styles.routeError}`}>{planner.error}</p>}
          </section>
        </aside>

        {error &&<div className={`alert alert-error ${styles.full}`}>{error}</div>}

        <div className={`${styles.formFooter} ${styles.full}`}>
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
    </Modal>
  );
}
