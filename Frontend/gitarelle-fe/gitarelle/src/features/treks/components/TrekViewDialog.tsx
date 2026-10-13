import { useMemo, useRef, useState, type ReactNode } from "react";
import { CircleMarker, MapContainer, Marker, useMapEvents } from "react-leaflet";
import type { LatLngLiteral } from "leaflet";
import type { Trek, TrekPayload } from "../types";
import { useTreks } from "../TreksContext";
import { updateTrek, updateTrekLocation } from "../api";
import type { ParsedGpx } from "../../../shared/gpx";
import { errorMessage } from "../../../shared/api";
import Modal from "../../../shared/Modal";
import TrackLayer from "../../../shared/TrackLayer";
import FitWhenSized from "../../../shared/FitWhenSized";
import { TILE_MAX_ZOOM, pinIconFor } from "../../../shared/map";
import { formatDate, formatGain, formatKm, formatTrackDuration, trackDurationLabel } from "../../../shared/format";
import { CalendarIcon, ClockIcon, DistanceIcon, EyeIcon, ElevationIcon, ElevationLossIcon, FolderIcon, NotesIcon, PencilIcon, PeopleIcon, PinIcon, TrashIcon } from "../../../shared/icons";
import { computeProfile, slopeColor, trackDuration, trackStats, type ProfilePoint } from "../../../shared/elevation";
import ElevationProfile from "./ElevationProfile";
import FolderSelect from "./FolderSelect";
import DurationDialog from "./DurationDialog";
import styles from "./TrekDialogs.module.css";
import MapLayers from "../../../shared/MapLayers";

type Props = {
  trek: Trek;
  gpx: ParsedGpx | null; // traccia già scaricata (null se non c'è o è ancora in arrivo)
  color: string;         // stesso colore della traccia sulla mappa del confronto
  onClose: () => void;
  onEdit: () => void;    // modifica completa (anche punto sulla mappa e cartelle insieme)
  onDelete: () => void;
};

// campi modificabili con un click (distanza e dislivello vengono dal gpx)
type Field = "title" | "trekDate" | "folderIds" | "amichetti" | "notes";

function PickPoint({ onPick }: { onPick: (pos: LatLngLiteral) => void }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

// Scheda di un trek: si legge tutto e si corregge un campo alla volta cliccandoci sopra
export default function TrekViewDialog({ trek, gpx, color, onClose, onEdit, onDelete }: Props) {
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
  const elevationLoss = gpx ? trackStats(gpx).loss : null;
  // dal gpx registrato (soste escluse) se ha gli orari, altrimenti stimato
  const duration = gpx ? trackDuration(gpx) : null;
  const [showDuration, setShowDuration] = useState(false);

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
    } else if (editing === "amichetti" || editing === "notes") {
      if (draft !== (trek[editing] ?? "")) save({ [editing]: draft });
      else setEditing(null);
    }
  }

  // tasti comuni agli editor: Invio salva (nelle note Ctrl+Invio), Esc annulla senza chiudere la scheda
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    if (e.key === "Escape") {
      e.preventDefault(); // altrimenti il dialog si chiude
      skipCommit.current = true;
      e.currentTarget.blur();
    } else if (e.key === "Enter" && (e.currentTarget.tagName !== "TEXTAREA" || e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      e.currentTarget.blur();
    }
  }

  const editorProps = {
    value: draft,
    autoFocus: true,
    disabled: saving,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
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

  // onOpen: valore non modificabile ma cliccabile, apre un dettaglio (es. il tempo registrato)
  const rows: { field?: Field; label: string; icon: ReactNode; text: string | null; editor?: ReactNode; value?: string; onOpen?: () => void }[] = [
    {
      field: "trekDate", label: "Data", icon: <CalendarIcon />,
      text: trek.trekDate ? formatDate(trek.trekDate) : null, value: trek.trekDate ?? "",
      editor: <input type="date" {...editorProps} />,
    },
    {
      field: "folderIds", label: "Cartelle", icon: <FolderIcon />,
      text: folderNames || null, value: "",
      // ogni cartella si salva appena accesa o spenta (un trek può stare in più cartelle)
      editor: (
        <div className={styles.inlineFolders}>
          <FolderSelect label={null} value={trek.folderIds} onChange={(folderIds) => save({ folderIds })} disabled={saving} />
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(null)} disabled={saving}>Fatto</button>
        </div>
      ),
    },
    {
      field: "amichetti", label: "Amichetti", icon: <PeopleIcon />,
      text: trek.amichetti || null, value: trek.amichetti ?? "",
      editor: <input {...editorProps} placeholder="Chi c'era?" />,
    },
    // calcolata dal backend dal punto (o dalla partenza del gpx): non si modifica a mano
    { label: "Regione", icon: <PinIcon />, text: trek.region },
    { label: "Distanza", icon: <DistanceIcon />, text: trek.distanceMeters != null ? formatKm(trek.distanceMeters) : null },
    { label: "Dislivello positivo", icon: <ElevationIcon />, text: trek.elevationGainMeters != null ? `+${formatGain(trek.elevationGainMeters)}` : null },
    // il negativo non è salvato nel backend: si calcola dal gpx già scaricato
    { label: "Dislivello negativo", icon: <ElevationLossIcon />, text: elevationLoss != null ? `−${formatGain(elevationLoss)}` : null },
    {
      label: duration ? trackDurationLabel(duration) : "Tempo di percorrenza", icon: <ClockIcon />, text: duration ? formatTrackDuration(duration) : null,
      // con gli orari del gps si apre il dettaglio: partenza, arrivo, soste e confronto con la stima
      onOpen: duration?.recorded ? () => setShowDuration(true) : undefined,
    },
  ];

  const heading = editing === "title" ? (
    <input {...editorProps} className={`${styles.inlineInput} ${styles.titleInput}`} aria-label="Titolo" />
  ) : (
    <button type="button" className={`${styles.factValue} ${styles.titleValue}`} onClick={() => start("title", trek.title)} aria-label="Modifica titolo">
      <span className={styles.titleText}>{trek.title}</span>
      <PencilIcon size={14} />
    </button>
  );

  return (
    <Modal
      title={trek.title}
      heading={heading}
      onClose={onClose}
      wide
      // modifica completa ed eliminazione: icone accanto alla ✕, si aprono sopra la scheda
      actions={
        <>
          <button type="button" className="modal-icon-btn" onClick={onEdit} disabled={saving} title="Modifica" aria-label="Modifica escursione">
            <PencilIcon size={15} />
          </button>
          <button type="button" className="modal-icon-btn is-danger" onClick={onDelete} disabled={saving} title="Elimina" aria-label="Elimina escursione">
            <TrashIcon size={15} />
          </button>
        </>
      }
    >
      <div className={styles.editLayout}>
        <div className={styles.fields}>
          <dl className={styles.facts}>
            {rows.map((r) => (
              <div key={r.label} title={r.label}>
                <dt>{r.icon}<span className="sr-only">{r.label}</span></dt>
                <dd>
                  {r.field && editing === r.field
                    ? r.editor
                    : r.field
                      ? editable(r.field, r.text, r.value ?? "", r.label)
                      : r.onOpen
                        ? (
                          <button type="button" className={styles.factValue} onClick={r.onOpen} aria-label={`${r.label}: dettagli`}>
                            <span>{r.text}</span>
                            <EyeIcon size={12} />
                          </button>
                        )
                        : <span className={r.text ? styles.readOnly : styles.factEmpty}>{r.text ?? "—"}</span>}
                </dd>
              </div>
            ))}
          </dl>
          <div className={styles.notes} title="Note">
            <NotesIcon />
            <span className="sr-only">Note</span>
            {editing === "notes" ? (
              <textarea {...editorProps} rows={6} placeholder="Panorama, fatica, merenda al rifugio... (Ctrl+Invio per salvare)" />
            ) : (
              <button type="button" className={`${styles.factValue} ${styles.notesValue}`} onClick={() => start("notes", trek.notes ?? "")} aria-label="Modifica note">
                <span className={trek.notes ? undefined : styles.factEmpty}>{trek.notes || "Aggiungi una nota…"}</span>
                <PencilIcon size={12} />
              </button>
            )}
          </div>
          {saving && <p className={styles.hint}>Salvataggio…</p>}
          {error && <div className="alert alert-error">{error}</div>}
        </div>

        <div className={`map-frame ${styles.map}`}>
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
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setDraftPoint(savedPoint); setPicking(true); }} disabled={saving}>
                📍 {savedPoint ? "Sposta punto" : "Aggiungi punto"}
              </button>
            )}
          </div>}
        </div>

        {/* profilo altimetrico a tutta larghezza sotto info e mappa */}
        {trek.hasGpx && (
          <div className={`${styles.full} ${styles.profile}`}>
            {profile ? (
              <ElevationProfile profile={profile} onHover={setProfilePoint} />
            ) : (
              <p className={styles.hint}>
                {gpx ? "Questo GPX non contiene le quote: il profilo altimetrico non è disponibile." : "Caricamento del profilo altimetrico…"}
              </p>
            )}
          </div>
        )}
      </div>
      {showDuration && gpx && <DurationDialog gpx={gpx} onClose={() => setShowDuration(false)} />}
    </Modal>
  );
}
