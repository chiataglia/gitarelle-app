import { useMemo, useRef, useState, type ReactNode } from "react";
import { CircleMarker, MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import type { LatLngLiteral } from "leaflet";
import type { Trek, TrekPayload } from "../types";
import { useTreks } from "../TreksContext";
import { updateTrek, updateTrekLocation } from "../api";
import type { ParsedGpx } from "../../../shared/gpx";
import { errorMessage } from "../../../shared/api";
import Modal from "../../../shared/Modal";
import TrackLayer from "../../../shared/TrackLayer";
import FitWhenSized from "../../../shared/FitWhenSized";
import { TILE_ATTRIBUTION, TILE_MAX_ZOOM, TILE_URL, pinIconFor } from "../../../shared/map";
import { formatDate, formatGain, formatKm } from "../../../shared/format";
import { CalendarIcon, DistanceIcon, ElevationIcon, FolderIcon, NotesIcon, PencilIcon, PeopleIcon } from "../../../shared/icons";
import { computeProfile, slopeColor, type ProfilePoint } from "../../../shared/elevation";
import ElevationProfile from "./ElevationProfile";
import styles from "./TrekDialogs.module.css";

type Props = {
  trek: Trek;
  gpx: ParsedGpx | null; // traccia già scaricata (null se non c'è o è ancora in arrivo)
  color: string;         // stesso colore della traccia sulla mappa del confronto
  onClose: () => void;
};

// campi modificabili con un click (distanza e dislivello vengono dal gpx)
type Field = "title" | "trekDate" | "folderId" | "amichetti" | "notes";

function PickPoint({ onPick }: { onPick: (pos: LatLngLiteral) => void }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

// Scheda di un trek: si legge tutto e si corregge un campo alla volta cliccandoci sopra
export default function TrekViewDialog({ trek, gpx, color, onClose }: Props) {
  const { folders, upsertTrek } = useTreks();
  const folder = trek.folderId != null ? folders.find((f) => f.id === trek.folderId) : undefined;
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
      folderId: trek.folderId,
      ...patch,
    };
    try {
      setSaving(true);
      setError(null);
      upsertTrek(await updateTrek(trek.id, payload));
      setEditing(null);
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

  const rows: { field?: Field; label: string; icon: ReactNode; text: string | null; editor?: ReactNode; value?: string }[] = [
    {
      field: "trekDate", label: "Data", icon: <CalendarIcon />,
      text: trek.trekDate ? formatDate(trek.trekDate) : null, value: trek.trekDate ?? "",
      editor: <input type="date" {...editorProps} />,
    },
    {
      field: "folderId", label: "Cartella", icon: <FolderIcon />,
      text: folder?.name ?? null, value: trek.folderId != null ? String(trek.folderId) : "",
      // la cartella si salva appena scelta
      editor: (
        <select
          className={styles.inlineInput}
          value={draft}
          autoFocus
          disabled={saving}
          onChange={(e) => save({ folderId: e.target.value ? Number(e.target.value) : null })}
          onBlur={() => { if (!saving) setEditing(null); }}
          onKeyDown={onKeyDown}
        >
          <option value="">— nessuna —</option>
          {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      ),
    },
    {
      field: "amichetti", label: "Amichetti", icon: <PeopleIcon />,
      text: trek.amichetti || null, value: trek.amichetti ?? "",
      editor: <input {...editorProps} placeholder="Chi c'era?" />,
    },
    { label: "Distanza", icon: <DistanceIcon />, text: trek.distanceMeters != null ? formatKm(trek.distanceMeters) : null },
    { label: "Dislivello", icon: <ElevationIcon />, text: trek.elevationGainMeters != null ? `+${formatGain(trek.elevationGainMeters)}` : null },
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
    <Modal title={trek.title} heading={heading} onClose={onClose} wide>
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
            <MapContainer center={shownPoint ?? [42.5, 12.5]} zoom={shownPoint ? 12 : 6} maxZoom={TILE_MAX_ZOOM} style={{ height: "100%", width: "100%", cursor: "inherit" }}>
              <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} maxZoom={TILE_MAX_ZOOM} />
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
          <div className={styles.mapActions}>
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
          </div>
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
    </Modal>
  );
}
