import { useState } from "react";
import { Link } from "react-router-dom";
import type { LatLngLiteral } from "leaflet";
import MapPicker from "../../../shared/MapPicker";
import TrackLayer from "../../../shared/TrackLayer";
import FolderSelect from "./FolderSelect";
import GpxBulkImport from "../../gpx/components/GpxBulkImport";
import { readGpxFiles, type BulkItem } from "../../gpx/bulk";
import { useTreks } from "../TreksContext";
import { createTrek, createTrekWithGpx, uploadGpx } from "../api";
import { parseGpx, type ParsedGpx } from "../../../shared/gpx";
import { errorMessage } from "../../../shared/api";
import { formatDate } from "../../../shared/format";
import styles from "./TrekCreate.module.css";
import gpxStyles from "../../gpx/components/GpxViewer.module.css";

// con un gpx caricato lo si può usare per un trek nuovo o collegarlo a uno già nel diario
type Mode = "new" | "existing";

// Nuova escursione: a mano (punto scelto sulla mappa) oppure partendo da una traccia GPX,
// che precompila titolo, data e punto. Più GPX insieme passano alla revisione in blocco.
export default function TrekCreate() {
  const { treks, upsertTrek } = useTreks();
  const today = new Date().toISOString().split("T")[0];

  const [title, setTitle] = useState("");
  const [trekDate, setTrekDate] = useState(today);
  const [amichetti, setAmichetti] = useState("");
  const [notes, setNotes] = useState("");
  const [folderIds, setFolderIds] = useState<number[]>([]);
  const [pos, setPos] = useState<LatLngLiteral | null>(null);

  // traccia gpx (facoltativa)
  const [gpx, setGpx] = useState<ParsedGpx | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [gpxTitle, setGpxTitle] = useState("");
  const [mode, setMode] = useState<Mode>("new");
  const [existingId, setExistingId] = useState("");
  const [dragging, setDragging] = useState(false);
  const [bulkItems, setBulkItems] = useState<BulkItem[] | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const linking = gpx != null && mode === "existing";
  const canSave = linking ? Boolean(existingId) : Boolean(title.trim());
  const atGpxStart = gpx?.info.start != null && pos != null
    && pos.lat === gpx.info.start.lat && pos.lng === gpx.info.start.lng;

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // permette di ricaricare lo stesso file dopo un reset
    await loadFiles(files);
  }

  function onDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragging(false);
    loadFiles(Array.from(e.dataTransfer.files ?? []));
  }

  // un file: precompila il form qui; più file: revisione in blocco
  async function loadFiles(files: File[]) {
    const gpxFiles = files.filter((f) => /\.gpx$/i.test(f.name));
    if (gpxFiles.length > 1) {
      setBulkItems(await readGpxFiles(gpxFiles, treks, today));
      return;
    }
    if (gpxFiles.length === 0) return;
    const file = gpxFiles[0];
    const parsed = parseGpx(await file.text());
    setOk(null);
    setError(null);
    setRawFile(file);
    setGpx(parsed);
    // il punto di partenza diventa il punto del trek (si può spostare cliccando la mappa)
    setTitle(parsed.info.name ?? file.name.replace(/\.gpx$/i, ""));
    setTrekDate(parsed.info.date ?? today);
    setPos(parsed.info.start ?? null);
  }

  function removeGpx() {
    setGpx(null);
    setRawFile(null);
    setGpxTitle("");
    setMode("new");
    setExistingId("");
    setPos(null);
  }

  // dopo il salvataggio si riparte da un form vuoto (data e cartella restano, spesso si inseriscono più trek di fila)
  function clearForm() {
    removeGpx();
    setTitle("");
    setAmichetti("");
    setNotes("");
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault(); // evita che il browser ricarichi la pagina
    if (!canSave) return;
    setOk(null);
    setError(null);
    try {
      setSaving(true);
      if (linking && rawFile) {
        const updated = await uploadGpx(existingId, rawFile, gpxTitle);
        upsertTrek(updated);
        setOk(`GPX collegato a "${updated.title}"`);
      } else {
        // il punto è facoltativo: si potrà aggiungere dopo dallo storico
        const payload = { title: title.trim(), trekDate, amichetti, notes, lat: pos?.lat ?? null, lon: pos?.lng ?? null, folderIds };
        const created = rawFile ? await createTrekWithGpx(payload, rawFile, gpxTitle) : await createTrek(payload);
        upsertTrek(created);
        setOk(`Escursione "${created.title}" inserita${rawFile ? " con il suo GPX" : ""}`);
      }
      clearForm();
    } catch (err) {
      setError(errorMessage(err, "Errore nel salvataggio"));
    } finally {
      setSaving(false);
    }
  }

  if (bulkItems) {
    return (
      <div>
        <Head />
        <GpxBulkImport items={bulkItems} onClose={() => setBulkItems(null)} />
      </div>
    );
  }

  return (
    <div>
      <Head />

      <div className={styles.layout}>
        <div className={`map-frame ${styles.map}`}>
          <MapPicker value={pos} onChange={setPos}>
            {gpx && <TrackLayer gpx={gpx} trackKey={rawFile?.name ?? "gpx"} pin={false} />}
          </MapPicker>
          {!linking && (
            <div className={`${styles.coordinates} ${pos ? styles.coordinatesSet : ""}`}>
              {pos ? (
                <>
                  <span>📍</span>
                  <span>{pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}{atGpxStart ? " · partenza GPX" : ""}</span>
                  <button type="button" className={styles.clearPoint} onClick={() => setPos(null)} aria-label="Rimuovi punto">✕</button>
                </>
              ) : (
                <span>Clicca sulla mappa per scegliere il punto (facoltativo)</span>
              )}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className={`card ${styles.form}`}>
          {!gpx ? (
            <label
              className={`${gpxStyles.dropzone} ${styles.dropzone} ${dragging ? gpxStyles.dropzoneActive : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <input type="file" accept=".gpx" multiple onChange={onPickFile} className={gpxStyles.fileInput} />
              <span className={styles.dropIcon} aria-hidden="true">⤒</span>
              <span>
                <strong>Hai la traccia GPX?</strong> Trascinala qui o <u>sfoglia</u>
                <small>Titolo, data e punto si compilano da soli. Puoi caricare anche più file insieme.</small>
              </span>
            </label>
          ) : (
            <div className={styles.gpxBox}>
              <div className={gpxStyles.fileChip}>
                <span aria-hidden="true">🗺️</span>
                <b title={rawFile?.name}>{rawFile?.name}</b>
                <button type="button" className={gpxStyles.resetBtn} onClick={removeGpx} aria-label="Togli il GPX">✕</button>
              </div>
              <div className={gpxStyles.segmented} role="tablist" aria-label="Dove salvare il GPX">
                <button type="button" role="tab" aria-selected={mode === "new"} className={mode === "new" ? gpxStyles.segActive : ""} onClick={() => setMode("new")}>
                  Nuova escursione
                </button>
                <button type="button" role="tab" aria-selected={mode === "existing"} className={mode === "existing" ? gpxStyles.segActive : ""} onClick={() => setMode("existing")}>
                  Collega a una esistente
                </button>
              </div>
            </div>
          )}

          {linking ? (
            <label className="field">
              <span>Collega al trek</span>
              <select value={existingId} onChange={(e) => setExistingId(e.target.value)}>
                <option value="">-- seleziona un trek --</option>
                {treks.map((t) => (
                  <option key={t.id} value={t.id} disabled={t.hasGpx}>
                    {t.title}{t.trekDate ? ` (${formatDate(t.trekDate)})` : ""}{t.hasGpx ? " · ha già un GPX" : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <>
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
              <FolderSelect value={folderIds} onChange={setFolderIds} />
              <label className="field">
                <span>Note</span>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Panorama, fatica, merenda al rifugio..." rows={4} />
              </label>
            </>
          )}

          {gpx && (
            <label className="field">
              <span>Titolo GPX</span>
              <input value={gpxTitle} onChange={(e) => setGpxTitle(e.target.value)} placeholder="Opzionale" />
            </label>
          )}

          <button className="btn btn-primary" disabled={saving || !canSave}>
            {saving ? "Salvataggio..." : linking ? "Collega GPX" : gpx ? "Crea escursione con GPX" : "Crea escursione"}
          </button>

          {error && <div className="alert alert-error">{error}</div>}
          {ok && (
            <div className="alert alert-success">
              ✓ {ok} · <Link to="/storico">Vai allo storico →</Link>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

function Head() {
  return (
    <div className="section-head">
      <span className="eyebrow">Nuova avventura</span>
      <h2>Nuova escursione</h2>
      <p>Racconta com'è andata. Se hai la traccia GPX caricala qui; il punto sulla mappa è facoltativo e puoi aggiungerlo anche dopo, dallo storico.</p>
    </div>
  );
}
