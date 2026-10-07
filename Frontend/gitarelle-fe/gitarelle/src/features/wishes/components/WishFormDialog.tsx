import { useState } from "react";
import type { LatLngLiteral } from "leaflet";
import type { Wish } from "../types";
import { createWish, deleteWishGpx, saveWishGpx, updateWish } from "../api";
import { errorMessage } from "../../../shared/api";
import { parseGpx } from "../../../shared/gpx";
import Modal from "../../../shared/Modal";
import MapPicker from "../../../shared/MapPicker";
import PlaceSearch from "./PlaceSearch";
import { WISH_COLOR } from "../theme";
import styles from "./Wishes.module.css";

type Props = {
  wish: Wish | null; // null = nuova idea
  onClose: () => void;
  onSaved: (wish: Wish, gpxChanged: boolean) => void;
};

// Creazione e modifica di un'idea: basta il nome, il resto (punto, link, gpx) è facoltativo
export default function WishFormDialog({ wish, onClose, onSaved }: Props) {
  const [name, setName] = useState(wish?.name ?? "");
  const [idealPeriod, setIdealPeriod] = useState(wish?.idealPeriod ?? "");
  const [link, setLink] = useState(wish?.link ?? "");
  const [notes, setNotes] = useState(wish?.notes ?? "");
  const [pos, setPos] = useState<LatLngLiteral | null>(
    wish?.lat != null && wish?.lon != null ? { lat: wish.lat, lng: wish.lon } : null
  );
  const [flyTo, setFlyTo] = useState<LatLngLiteral | null>(null);

  // gpx: nuovo file da caricare, oppure rimozione di quello esistente
  const [gpxFile, setGpxFile] = useState<File | null>(null);
  const [removeGpx, setRemoveGpx] = useState(false);
  const hasGpx = gpxFile != null || (wish?.hasGpx === true && !removeGpx);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // se l'idea è stata creata ma il gpx è fallito, un nuovo "Salva" deve aggiornarla, non ricrearla
  const [savedId, setSavedId] = useState<Wish["id"] | null>(wish?.id ?? null);

  const close = () => { if (!saving) onClose(); };

  async function onPickGpx(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setGpxFile(file);
    setRemoveGpx(false);
    // precompila nome e punto con i dati della traccia, se mancano
    const parsed = parseGpx(await file.text());
    if (!name.trim()) setName(parsed.info.name ?? file.name.replace(/\.gpx$/i, ""));
    if (!pos && parsed.info.start) {
      setPos(parsed.info.start);
      setFlyTo(parsed.info.start);
    }
  }

  async function onSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const payload = {
      name: name.trim(),
      idealPeriod: idealPeriod.trim() || null,
      link: link.trim() || null,
      notes: notes.trim() || null,
      lat: pos?.lat ?? null,
      lon: pos?.lng ?? null,
    };
    try {
      setSaving(true);
      setError(null);
      let saved = savedId == null ? await createWish(payload) : await updateWish(savedId, payload);
      setSavedId(saved.id);
      let gpxChanged = false;
      if (gpxFile) {
        saved = await saveWishGpx(saved.id, gpxFile);
        gpxChanged = true;
      } else if (removeGpx && saved.hasGpx) {
        saved = await deleteWishGpx(saved.id);
        gpxChanged = true;
      }
      onSaved(saved, gpxChanged);
    } catch (err) {
      setError(errorMessage(err, "Errore nel salvataggio"));
      setSaving(false);
    }
  }

  return (
    <Modal title={wish ? "Modifica idea" : "Nuova idea di tour"} onClose={close} wide>
      <form onSubmit={onSubmit} className={styles.formLayout}>
        <div className={styles.formFields}>
          <label className="field">
            <span>Nome *</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="Es. Alta Via n.1 delle Dolomiti" required autoFocus />
          </label>
          <div className={styles.formRow}>
            <label className="field">
              <span>Periodo ideale</span>
              <input value={idealPeriod} onChange={(e) => setIdealPeriod(e.target.value)} maxLength={60} placeholder="Es. fine giugno" />
            </label>
            <label className="field">
              <span>Link</span>
              <input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://www.komoot.com/..." />
            </label>
          </div>
          <label className="field">
            <span>Note</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Perché ci vuoi andare, con chi, cosa serve..." />
          </label>

          <div className={styles.gpxRow}>
            {hasGpx ? (
              <div className={styles.gpxChip}>
                <span aria-hidden="true">〰</span>
                <span className={styles.gpxName}>{gpxFile ? gpxFile.name : "Traccia GPX caricata"}</span>
                <label className={styles.gpxLink}>
                  Sostituisci
                  <input type="file" accept=".gpx" hidden onChange={onPickGpx} />
                </label>
                <button
                  type="button"
                  className={styles.gpxLink}
                  onClick={() => { setGpxFile(null); setRemoveGpx(true); }}
                >
                  Rimuovi
                </button>
              </div>
            ) : (
              <label className={styles.gpxDrop}>
                <input type="file" accept=".gpx" hidden onChange={onPickGpx} />
                + Aggiungi una traccia GPX <small>(facoltativa)</small>
              </label>
            )}
          </div>
        </div>

        <div className={styles.formMapCol}>
          <PlaceSearch
            onPick={(p) => {
              setPos(p.pos);
              setFlyTo(p.pos);
              if (!name.trim()) setName(p.name);
            }}
          />
          <div className={`map-frame ${styles.formMap}`}>
            <MapPicker value={pos} onChange={setPos} flyTo={flyTo} color={WISH_COLOR} />
            <div className={`${styles.coords} ${pos ? styles.coordsSet : ""}`}>
              {pos ? (
                <>
                  <span>📍 {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}</span>
                  <button type="button" className={styles.coordsClear} onClick={() => setPos(null)} aria-label="Rimuovi punto">✕</button>
                </>
              ) : (
                <span>Cerca un luogo o clicca sulla mappa (facoltativo)</span>
              )}
            </div>
          </div>
        </div>

        {error && <div className={`alert alert-error ${styles.full}`}>{error}</div>}

        <div className={`${styles.formFooter} ${styles.full}`}>
          <button type="button" className="btn btn-ghost" onClick={close} disabled={saving}>Annulla</button>
          <button type="submit" className={`btn ${styles.btnWish}`} disabled={saving || !name.trim()}>
            {saving ? "Salvataggio..." : wish ? "Salva modifiche" : "Aggiungi alla lista"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
