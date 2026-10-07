import { useState } from "react";
import type { LatLngLiteral } from "leaflet";
import MapPicker from "./MapPicker";
import FolderSelect from "./FolderSelect";
import styles from "./TrekCreate.module.css";
import { useTreks } from "../TreksContext";
import type { TrekPayload } from "../types";
import { createTrek } from "../api";
import { errorMessage } from "../../../shared/api";

export default function TrekCreate() {
  const { upsertTrek } = useTreks();
  const today = new Date().toISOString().split("T")[0];
 
  const [title, setTitle] = useState(""); //useState restituire array con due elementi, valore corrente e funzione per aggiornarlo
  const [trekDate, setTrekDate] = useState(today);
  const [amichetti, setAmichetti] = useState("");
  const [notes, setNotes] = useState("");
  const [folderId, setFolderId] = useState<number | null>(null);

  const [pos, setPos] = useState<LatLngLiteral | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault(); //evita che il browser ricarichi la pagina
    setOk(false);
    setError(null);

    // il punto è facoltativo: si potrà aggiungere dopo dallo storico
    const payload: TrekPayload = {
      title,
      trekDate,
      amichetti,
      notes,
      lat: pos?.lat ?? null,
      lon: pos?.lng ?? null,
      folderId,
    };

    try {
      setLoading(true);
      upsertTrek(await createTrek(payload));
      setOk(true);
      setTitle(""); setNotes(""); setAmichetti(""); setPos(null); //ripulisce
    } catch (err) {
      setError(errorMessage(err, "Errore nella POST"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="section-head">
        <span className="eyebrow">Nuova avventura</span>
        <h2>Nuova escursione</h2>
        <p>Racconta com'è andata. Il punto sulla mappa è facoltativo: puoi aggiungerlo (o caricare il GPX) anche dopo, dallo storico.</p>
      </div>

      <div className={styles.layout}>
        <div className={`map-frame ${styles.map}`}>
          <MapPicker value={pos} onChange={setPos} />
          <div className={`${styles.coordinates} ${pos ? styles.coordinatesSet : ""}`}>
            {pos ? (
              <>
                <span>📍</span>
                <span>{pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}</span>
                <button type="button" className={styles.clearPoint} onClick={() => setPos(null)} aria-label="Rimuovi punto">✕</button>
              </>
            ) : (
              <span>Clicca sulla mappa per scegliere il punto (facoltativo)</span>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className={`card ${styles.form}`}>
          <label className="field">
            <span>Titolo</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Es. Anello del Monte Gennaro" />
          </label>
          <div className={styles.row}>
            <label className="field">
              <span>Data</span>
              <input type="date" value={trekDate} onChange={(e) => setTrekDate(e.target.value)} />
            </label>
            <label className="field">
              <span>Amichetti</span>
              <input value={amichetti} onChange={(e) => setAmichetti(e.target.value)} placeholder="Chi c'era?" />
            </label>
          </div>
          <FolderSelect value={folderId} onChange={setFolderId} />
          <label className="field">
            <span>Note</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Panorama, fatica, merenda al rifugio..." rows={5} />
          </label>

          <button className="btn btn-primary" disabled={loading}>
            {loading ? "Salvataggio..." : "Crea Trek"}
          </button>

          {error && <div className="alert alert-error">{error}</div>}
          {ok && <div className="alert alert-success">✓ Escursione inserita</div>}
        </form>
      </div>
    </div>
  );
}