import { useMemo, useRef, useState, type ReactNode } from "react";
import { useComune } from "../../../shared/useComune";
import { CircleMarker, MapContainer, Marker, useMapEvents } from "react-leaflet";
import type { LatLngLiteral } from "leaflet";
import type { Trek, TrekPayload } from "../types";
import { useTreks } from "../TreksContext";
import { updateTrek, updateTrekLocation, uploadGpx } from "../api";
import type { ParsedGpx } from "../../../shared/gpx";
import { errorMessage } from "../../../shared/api";
import Modal from "../../../shared/Modal";
import TrackLayer from "../../../shared/TrackLayer";
import FitWhenSized from "../../../shared/FitWhenSized";
import { TILE_MAX_ZOOM, pinIconFor } from "../../../shared/map";
import { formatDate, formatGain, formatKm, formatTrackDuration, trackDurationLabel } from "../../../shared/format";
import { AlertIcon, CalendarIcon, ClockIcon, DistanceIcon, EyeIcon, ElevationIcon, ElevationLossIcon, FolderIcon, PencilIcon, PeopleIcon, PinIcon, StarIcon, TrashIcon } from "../../../shared/icons";
import { computeProfile, slopeColor, trackDuration, trackStats, type ProfilePoint } from "../../../shared/elevation";
import ElevationProfile from "./ElevationProfile";
import FolderSelect from "./FolderSelect";
import DurationDialog from "./DurationDialog";
import ReviewDialog from "./ReviewDialog";
import StarRating from "./StarRating";
import { SCALE_MAX, effortText, formatRating, hasReview, sceneryText } from "../review";
import reviewStyles from "./Review.module.css";
import styles from "./TrekDialogs.module.css";
import MapLayers from "../../../shared/MapLayers";

type Props = {
  trek: Trek;
  gpx: ParsedGpx | null; // traccia già scaricata (null se non c'è o è ancora in arrivo)
  color: string;         // stesso colore della traccia sulla mappa del confronto
  onClose: () => void;
  onEdit: () => void;    // modifica completa (anche punto sulla mappa e cartelle insieme)
  onDelete: () => void;
  // pannello a destra della mappa a schermo intero dello storico (invece del dialog): la traccia
  // la mostra già la mappa grande, quindi qui niente mappa (resta solo per scegliere il punto dei trek senza gpx)
  panel?: boolean;
  onProfileHover?: (point: ProfilePoint | null) => void; // punto del profilo sotto il mouse, per la mappa grande
};

// campi modificabili con un click (distanza e dislivello vengono dal gpx; le note si scrivono nella valutazione)
type Field = "title" | "trekDate" | "folderIds" | "amichetti";

function PickPoint({ onPick }: { onPick: (pos: LatLngLiteral) => void }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

// Scheda di un trek: si legge tutto e si corregge un campo alla volta cliccandoci sopra
export default function TrekViewDialog({ trek, gpx, color, onClose, onEdit, onDelete, panel, onProfileHover }: Props) {
  const { folders, upsertTrek } = useTreks();
  const folderNames = folders.filter((f) => trek.folderIds.includes(f.id)).map((f) => f.name).join(", ");
  const savedPoint = trek.lat != null && trek.lon != null ? { lat: trek.lat, lng: trek.lon } : null;

  const [editing, setEditing] = useState<Field | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const skipCommit = useRef(false); // Esc: il blur che segue non deve salvare

  // spostamento del punto: click sulla mappa, poi "Salva punto"
  const [picking, setPicking] = useState(false);
  const [draftPoint, setDraftPoint] = useState<LatLngLiteral | null>(null);
  const shownPoint = picking ? draftPoint : savedPoint ?? gpx?.info.start ?? null;

  // profilo altimetrico dal gpx; il punto sotto il mouse nel grafico compare anche sulla mappa
  const profile = useMemo(() => (gpx ? computeProfile(gpx) : null), [gpx]);
  const [profilePoint, setProfilePoint] = useState<ProfilePoint | null>(null);
  const hoverProfile = (p: ProfilePoint | null) => {
    setProfilePoint(p);
    onProfileHover?.(p);
  };
  const showMap = !panel || !trek.hasGpx;
  const elevationLoss = gpx ? trackStats(gpx).loss : null;
  // dal gpx registrato (soste escluse) se ha gli orari, altrimenti stimato
  const duration = gpx ? trackDuration(gpx) : null;
  const [showDuration, setShowDuration] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const reviewed = hasReview(trek);

  function start(field: Field, value: string) {
    if (saving) return;
    setEditing(field);
    setDraft(value);
    setError(null);
  }

  // PUT sostituisce tutti i campi: si parte da quelli attuali e si cambia solo quello modificato
  async function save(patch: Partial<TrekPayload>) {
    const payload: TrekPayload = {
      title: trek.title,
      trekDate: trek.trekDate ?? null,
      amichetti: trek.amichetti ?? "",
      notes: trek.notes ?? "",
      lat: trek.lat,
      lon: trek.lon,
      folderIds: trek.folderIds,
      ...patch,
    };
    try {
      setSaving(true);
      setError(null);
      upsertTrek(await updateTrek(trek.id, payload));
      // le cartelle si accendono e spengono una alla volta: l'editor resta aperto finché non si preme "Fatto"
      if (!patch.folderIds) setEditing(null);
    } catch (err) {
      setError(errorMessage(err, "Errore nel salvataggio"));
    } finally {
      setSaving(false);
    }
  }

  // salva il campo in modifica, se è cambiato (un titolo vuoto non è valido: si annulla)
  function commit() {
    if (skipCommit.current) {
      skipCommit.current = false;
      setEditing(null);
      return;
    }
    if (editing === "title") {
      const title = draft.trim();
      if (title && title !== trek.title) save({ title });
      else setEditing(null);
    } else if (editing === "trekDate") {
      if (draft !== (trek.trekDate ?? "")) save({ trekDate: draft || null });
      else setEditing(null);
    } else if (editing === "amichetti") {
      if (draft !== (trek.amichetti ?? "")) save({ amichetti: draft });
      else setEditing(null);
    }
  }

  // tasti comuni agli editor: Invio salva, Esc annulla senza chiudere la scheda
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault(); // altrimenti il dialog si chiude
      skipCommit.current = true;
      e.currentTarget.blur();
    } else if (e.key === "Enter") {
      e.preventDefault();
      e.currentTarget.blur();
    }
  }

  const editorProps = {
    value: draft,
    autoFocus: true,
    disabled: saving,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setDraft(e.target.value),
    onBlur: commit,
    onKeyDown,
    className: styles.inlineInput,
  };

  // valore cliccabile (con la matita che compare al passaggio del mouse)
  const editable = (field: Field, text: string | null, value: string, label: string) => (
    <button type="button" className={styles.factValue} onClick={() => start(field, value)} aria-label={`Modifica ${label.toLowerCase()}`}>
      <span className={text ? undefined : styles.factEmpty}>{text ?? "Aggiungi…"}</span>
      <PencilIcon size={12} />
    </button>
  );

  // trek senza traccia: si può caricare il gpx da qui (il trek passa a hasGpx e la scheda mostra la traccia)
  async function onGpxPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setSaving(true);
      setError(null);
      upsertTrek(await uploadGpx(trek.id, file));
      setPicking(false);
    } catch (err) {
      setError(errorMessage(err, "Errore nel caricamento del GPX"));
    } finally {
      setSaving(false);
    }
  }

  async function savePoint() {
    if (!draftPoint) return;
    try {
      setSaving(true);
      setError(null);
      upsertTrek(await updateTrekLocation(trek.id, draftPoint.lat, draftPoint.lng));
      setPicking(false);
    } catch (err) {
      setError(errorMessage(err, "Errore nel salvataggio del punto"));
    } finally {
      setSaving(false);
    }
  }

  // comune del punto di partenza (partenza del gpx o, senza traccia, il punto sulla mappa); finché non arriva
  // (o se il servizio non risponde) si mostra la regione calcolata dal backend
  const startPoint = trek.hasGpx ? gpx?.info.start ?? null : savedPoint;
  const comune = useComune(startPoint);
  const place = comune ?? trek.region;

  // un dato su una riga condensata: icona + valore (l'etichetta resta nel tooltip e per gli screen reader)
  const fact = (label: string, icon: ReactNode, content: ReactNode, grow = false) => (
    <div className={`${styles.fact} ${grow ? styles.factGrow : ""}`} title={label}>
      {icon}
      <span className="sr-only">{label}</span>
      {content}
    </div>
  );
  const readOnly = (text: string | null | undefined) => (
    <span className={text ? styles.readOnly : styles.factEmpty}>{text ?? "—"}</span>
  );
  const hasMetrics = trek.distanceMeters != null || trek.elevationGainMeters != null || duration != null;

  const heading = editing === "title" ? (
    <input {...editorProps} className={`${styles.inlineInput} ${styles.titleInput}`} aria-label="Titolo" />
  ) : (
    <button type="button" className={`${styles.factValue} ${styles.titleValue}`} onClick={() => start("title", trek.title)} aria-label="Modifica titolo">
      <span className={styles.titleText}>{trek.title}</span>
      <PencilIcon size={14} />
    </button>
  );

  // cartelle, modifica completa ed eliminazione: icone accanto alla ✕ (modifica ed eliminazione si aprono sopra la scheda)
  const actions = (
    <>
      <button
        type="button"
        className={`modal-icon-btn ${folderNames ? styles.folderBtnOn : ""} ${editing === "folderIds" ? styles.folderBtnOpen : ""}`}
        onClick={() => (editing === "folderIds" ? setEditing(null) : start("folderIds", ""))}
        disabled={saving && editing !== "folderIds"}
        title={folderNames ? `Cartelle: ${folderNames}` : "Aggiungi a una cartella"}
        aria-label={folderNames ? `Cartelle: ${folderNames}` : "Aggiungi a una cartella"}
        aria-expanded={editing === "folderIds"}
      >
        <FolderIcon size={15} />
      </button>
      <button type="button" className="modal-icon-btn" onClick={onEdit} disabled={saving} title="Modifica" aria-label="Modifica escursione">
        <PencilIcon size={15} />
      </button>
      <button type="button" className="modal-icon-btn is-danger" onClick={onDelete} disabled={saving} title="Elimina" aria-label="Elimina escursione">
        <TrashIcon size={15} />
      </button>
    </>
  );

  const body = (
    <>
      <div className={`${styles.editLayout} ${panel ? styles.editLayoutPanel : ""}`}>
        <div className={styles.fields}>
          {/* cartelle: si aprono dall'icona in alto; ogni cartella si salva appena accesa o spenta */}
          {editing === "folderIds" && (
            <div className={styles.folderEditor}>
              <span className={styles.folderEditorTitle}><FolderIcon size={15} />Cartelle</span>
              <div className={styles.inlineFolders}>
                <FolderSelect label={null} value={trek.folderIds} onChange={(folderIds) => save({ folderIds })} disabled={saving} />
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(null)} disabled={saving}>Fatto</button>
              </div>
            </div>
          )}
          {/* dati condensati: data e luogo, amichetti, distanza con dislivelli e tempo */}
          <div className={styles.facts}>
            <div className={styles.factLine}>
              {fact("Data", <CalendarIcon />, editing === "trekDate"
                ? <input type="date" {...editorProps} />
                : editable("trekDate", trek.trekDate ? formatDate(trek.trekDate) : null, trek.trekDate ?? "", "Data"))}
              {/* calcolato dalla partenza: non si modifica a mano */}
              {fact(comune ? "Comune di partenza" : "Regione", <PinIcon />, readOnly(place), true)}
            </div>
            <div className={styles.factLine}>
              {fact("Amichetti", <PeopleIcon />, editing === "amichetti"
                ? <input {...editorProps} placeholder="Chi c'era?" />
                : editable("amichetti", trek.amichetti || null, trek.amichetti ?? "", "Amichetti"), true)}
            </div>
            {hasMetrics && (
              <div className={styles.factLine}>
                {trek.distanceMeters != null && fact("Distanza", <DistanceIcon />, readOnly(formatKm(trek.distanceMeters)))}
                {/* il negativo non è salvato nel backend: si calcola dal gpx già scaricato */}
                {trek.elevationGainMeters != null && fact("Dislivello positivo", <ElevationIcon />, readOnly(formatGain(trek.elevationGainMeters)))}
                {elevationLoss != null && fact("Dislivello negativo", <ElevationLossIcon />, readOnly(formatGain(elevationLoss)))}
                {/* con gli orari del gps si apre il dettaglio (partenza, arrivo, soste e confronto con la stima) */}
                {duration && fact(trackDurationLabel(duration), <ClockIcon />, duration.recorded ? (
                  <button type="button" className={styles.detailLink} onClick={() => setShowDuration(true)} aria-label={`${formatTrackDuration(duration)}: vedi il dettaglio`}>
                    {formatTrackDuration(duration)}
                    <EyeIcon size={14} />
                  </button>
                ) : readOnly(formatTrackDuration(duration)))}
              </div>
            )}
          </div>
          {/* valutazione: si compila in un dialog a parte, qui solo il riepilogo. Una volta data resta solo
              la valutazione con la matita per modificarla; prima, titolo e pulsante "Valuta" */}
          <section className={`${reviewStyles.summary} ${reviewed ? reviewStyles.summaryDone : ""}`} aria-label="Valutazione">
            {reviewed ? (
              <>
                <button type="button" className={reviewStyles.editPen} onClick={() => setShowReview(true)} disabled={saving} title="Modifica valutazione" aria-label="Modifica valutazione">
                  <PencilIcon size={14} />
                </button>
                {trek.rating != null && (
                  <div className={reviewStyles.ratingLine}>
                    <StarRating value={trek.rating} size={18} />
                    {formatRating(trek.rating)}
                  </div>
                )}
                {(trek.effort != null || trek.scenery != null || trek.dangerous === true) && (
                  <div className={reviewStyles.tags}>
                    {trek.effort != null && <span className={reviewStyles.tag}>Fatica <b>{trek.effort}/{SCALE_MAX}</b> {effortText(trek)}</span>}
                    {trek.scenery != null && <span className={reviewStyles.tag}>Paesaggio <b>{trek.scenery}/{SCALE_MAX}</b> {sceneryText(trek)}</span>}
                    {trek.dangerous === true && <span className={`${reviewStyles.tag} ${reviewStyles.tagDanger}`}><AlertIcon size={13} />Tratti pericolosi</span>}
                  </div>
                )}
                {trek.tags?.length > 0 && (
                  <div className={reviewStyles.tags} aria-label="Etichette">
                    {trek.tags.map((tag) => <span key={tag} className={reviewStyles.label}>{tag}</span>)}
                  </div>
                )}
                {trek.notes?.trim() && <p className={reviewStyles.reviewText}>{trek.notes}</p>}
              </>
            ) : (
              <>
                <div className={reviewStyles.summaryHead}>
                  <span className={reviewStyles.summaryTitle}><StarIcon size={18} fill="empty" />Valutazione</span>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowReview(true)} disabled={saving}>Valuta</button>
                </div>
                <p className={reviewStyles.summaryEmpty}>Com'è andata? Dai un voto, racconta l'uscita, segna fatica e paesaggio e scegli le etichette.</p>
              </>
            )}
          </section>
          {saving && <p className={styles.hint}>Salvataggio…</p>}
          {error && <div className="alert alert-error">{error}</div>}
        </div>

        {showMap && <div className={`map-frame ${styles.map}`}>
          {/* l'altezza la dà il riquadro (min-height): qui la si eredita, come in MapPicker */}
          <div style={{ height: "100%", minHeight: "inherit", width: "100%", cursor: picking ? "crosshair" : undefined }}>
            {/* con la traccia si parte già dal suo centro (non dalla partenza); FitWhenSized poi sistema lo zoom */}
            <MapContainer center={gpx?.bounds?.getCenter() ?? shownPoint ?? [42.5, 12.5]} zoom={gpx?.bounds || shownPoint ? 12 : 6} maxZoom={TILE_MAX_ZOOM} style={{ height: "100%", width: "100%", cursor: "inherit" }}>
              <MapLayers />
              {gpx && <TrackLayer gpx={gpx} trackKey={String(trek.id)} color={color} fit={false} pin={!picking} />}
              {shownPoint && (!gpx || picking) && <Marker position={shownPoint} icon={pinIconFor(color)} />}
              {picking && <PickPoint onPick={setDraftPoint} />}
              {profilePoint && (
                <CircleMarker
                  center={[profilePoint.lat, profilePoint.lng]}
                  radius={7}
                  pathOptions={{ color: "#fff", weight: 3, fillColor: slopeColor(profilePoint.slope), fillOpacity: 1 }}
                />
              )}
              <FitWhenSized gpx={gpx} point={savedPoint ?? gpx?.info.start ?? null} />
            </MapContainer>
          </div>
          {/* con il gpx la posizione è la traccia: il punto si sceglie a mano solo per i trek senza */}
          {!trek.hasGpx && <div className={styles.mapActions}>
            {picking ? (
              <>
                <span>{draftPoint ? "Clicca di nuovo per spostarlo" : "Clicca sulla mappa"}</span>
                <button type="button" className="btn btn-primary btn-sm" onClick={savePoint} disabled={saving || !draftPoint}>Salva punto</button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPicking(false)} disabled={saving}>Annulla</button>
              </>
            ) : (
              <>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setDraftPoint(savedPoint); setPicking(true); }} disabled={saving}>
                  📍 {savedPoint ? "Sposta punto" : "Aggiungi punto"}
                </button>
                <label className="btn btn-ghost btn-sm">
                  ⤒ Carica GPX
                  <input type="file" accept=".gpx" hidden onChange={onGpxPicked} disabled={saving} />
                </label>
              </>
            )}
          </div>}
        </div>}

        {/* profilo altimetrico a tutta larghezza sotto info e mappa */}
        {trek.hasGpx && (
          <div className={`${styles.full} ${styles.profile}`}>
            {profile ? (
              <ElevationProfile profile={profile} onHover={hoverProfile} />
            ) : (
              <p className={styles.hint}>
                {gpx ? "Questo GPX non contiene le quote: il profilo altimetrico non è disponibile." : "Caricamento del profilo altimetrico…"}
              </p>
            )}
          </div>
        )}
      </div>
      {showDuration && gpx && <DurationDialog gpx={gpx} onClose={() => setShowDuration(false)} />}
      {showReview && <ReviewDialog trek={trek} onClose={() => setShowReview(false)} />}
    </>
  );

  if (panel) {
    return (
      <aside className={styles.panel} aria-label={trek.title}>
        <header className={styles.panelHeader}>
          {heading}
          <div className={styles.panelActions}>
            {actions}
            <button type="button" className="modal-icon-btn" onClick={onClose} aria-label="Chiudi" title="Chiudi">✕</button>
          </div>
        </header>
        {body}
      </aside>
    );
  }

  return (
    <Modal title={trek.title} heading={heading} onClose={onClose} wide actions={actions}>
      {body}
    </Modal>
  );
}
