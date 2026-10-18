import { useState } from "react";
import type { LatLngLiteral } from "leaflet";
import type { Trek } from "../types";
import { updateTrek, updateTrekColor } from "../api";
import { useTreks } from "../TreksContext";
import { errorMessage } from "../../../shared/api";
import { colorForId } from "../../../shared/map";
import ColorPicker from "../../../shared/ColorPicker";
import Modal from "../../../shared/Modal";
import MapPicker from "../../../shared/MapPicker";
import FolderSelect from "./FolderSelect";
import FriendsInput from "./FriendsInput";
import createStyles from "./TrekCreate.module.css";
import styles from "./TrekDialogs.module.css";

// Modifica di tutti i campi inseriti alla creazione del trek
export default function TrekEditDialog({ trek, onClose }: { trek: Trek; onClose: () => void }) {
  const { upsertTrek } = useTreks();

  const [title, setTitle] = useState(trek.title);
  const [trekDate, setTrekDate] = useState(trek.trekDate ?? "");
  const [amichetti, setAmichetti] = useState(trek.amichetti ?? "");
  const [notes, setNotes] = useState(trek.notes ?? "");
  const [folderIds, setFolderIds] = useState(trek.folderIds);
  const [color, setColor] = useState(trek.color);
  const [pos, setPos] = useState<LatLngLiteral | null>(
    trek.lat != null && trek.lon != null ? { lat: trek.lat, lng: trek.lon } : null
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => { if (!saving) onClose(); };

  async function onSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      setSaving(true);
      setError(null);
      let saved = await updateTrek(trek.id, {
        title: title.trim(),
        trekDate: trekDate || null,
        amichetti,
        notes,
        lat: pos?.lat ?? null,
        lon: pos?.lng ?? null,
        folderIds,
      });
      // il colore ha un suo endpoint: si salva solo se è cambiato
      if (color !== trek.color) saved = await updateTrekColor(trek.id, color);
      upsertTrek(saved);
      onClose();
    } catch (err) {
      setError(errorMessage(err, "Errore nel salvataggio"));
      setSaving(false);
    }
  }

  return (
    <Modal title="Modifica escursione" onClose={close} wide>
      <form onSubmit={onSubmit} className={styles.editLayout}>
        <div className={styles.fields}>
          <label className="field">
            <span>Titolo</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
          </label>
          <label className="field">
            <span>Data</span>
            <input type="date" value={trekDate} onChange={(e) => setTrekDate(e.target.value)} />
          </label>
          <FriendsInput value={amichetti} onChange={setAmichetti} />
          <FolderSelect value={folderIds} onChange={setFolderIds} />
          <div className="field">
            <span>{trek.hasGpx ? "Colore della traccia" : "Colore sulla mappa"}</span>
            <ColorPicker value={color} onChange={(c) => setColor(c ?? null)} autoColor={colorForId(trek.id)} />
          </div>
          <label className="field">
            <span>Recensione</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={6} placeholder="Panorama, fatica, merenda al rifugio..." />
          </label>
          {trek.hasGpx && <p className={styles.hint}>🥾 La traccia GPX associata resta invariata.</p>}
        </div>

        <div className={`map-frame ${styles.map}`}>
          <MapPicker value={pos} onChange={setPos} />
          <div className={`${createStyles.coordinates} ${pos ? createStyles.coordinatesSet : ""}`}>
            {pos ? (
              <>
                <span>📍</span>
                <span>{pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}</span>
                <button type="button" className={createStyles.clearPoint} onClick={() => setPos(null)} aria-label="Rimuovi punto">✕</button>
              </>
            ) : (
              <span>Clicca sulla mappa per scegliere il punto</span>
            )}
          </div>
        </div>

        {error && <div className={`alert alert-error ${styles.full}`}>{error}</div>}

        <div className={`${styles.footer} ${styles.full}`}>
          <button type="button" className="btn btn-ghost" onClick={close} disabled={saving}>Annulla</button>
          <button type="submit" className="btn btn-primary" disabled={saving || !title.trim()}>
            {saving ? "Salvataggio..." : "Salva modifiche"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
