import { useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import type { LatLngLiteral } from "leaflet";
import { useTreks } from "../../treks/TreksContext";
import { createTrekWithGpx, uploadGpx } from "../../treks/api";
import { TILE_ATTRIBUTION, TILE_MAX_ZOOM, TILE_URL } from "../../../shared/map";
import { formatDate } from "../../../shared/format";
import { parseGpx, type ParsedGpx } from "../../../shared/gpx";
import { errorMessage } from "../../../shared/api";
import TrackLayer from "../../../shared/TrackLayer";
import FolderSelect from "../../treks/components/FolderSelect";
import GpxBulkImport from "./GpxBulkImport";
import { readGpxFiles, type BulkItem } from "../bulk";
import styles from "./GpxViewer.module.css";

type Mode = "new" | "existing";

export default function GpxViewer() {
  const { treks, upsertTrek } = useTreks();
  const today = new Date().toISOString().split("T")[0];

  const [mode, setMode] = useState<Mode>("new");
  const [selectedTrekId, setSelectedTrekId] = useState<string>("");

  // campi del nuovo trek
  const [title, setTitle] = useState("");
  const [trekDate, setTrekDate] = useState(today);
  const [amichetti, setAmichetti] = useState("");
  const [notes, setNotes] = useState("");
  const [folderId, setFolderId] = useState<number | null>(null);
  const [start, setStart] = useState<LatLngLiteral | null>(null);

  const [gpx, setGpx] = useState<ParsedGpx | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [gpxTitle, setGpxTitle] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [bulkItems, setBulkItems] = useState<BulkItem[] | null>(null);

  const center: [number, number] = [41.944, 12.456];

  const canSave = mode === "new"
    ? Boolean(title.trim())
    : Boolean(selectedTrekId);

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

  // un file: form completo qui sotto; più file: revisione in blocco
  async function loadFiles(files: File[]) {
    const gpxFiles = files.filter((f) => /\.gpx$/i.test(f.name));
    if (gpxFiles.length === 1) await loadFile(gpxFiles[0]);
    else if (gpxFiles.length > 1) setBulkItems(await readGpxFiles(gpxFiles, treks, today));
  }

  async function loadFile(file: File) {
    setSaveOk(null);
    setSaveError(null);
    setFileName(file.name);
    setRawFile(file);

    const parsed = parseGpx(await file.text());
    setGpx(parsed);

    // precompila il nuovo trek con i dati del gpx (il punto di partenza diventa il punto del trek)
    setTitle(parsed.info.name ?? file.name.replace(/\.gpx$/i, ""));
    setTrekDate(parsed.info.date ?? today);
    setStart(parsed.info.start ?? null);
  }

  async function onSave() {
    if (!rawFile || !canSave) return;

    setSaving(true);
    setSaveOk(null);
    setSaveError(null);

    try {
      if (mode === "new") {
        const created = await createTrekWithGpx(
          { title: title.trim(), trekDate, amichetti, notes, lat: start?.lat ?? null, lon: start?.lng ?? null, folderId },
          rawFile,
          gpxTitle,
        );
        upsertTrek(created);
        setSaveOk(`Escursione "${created.title}" creata con il suo GPX!`);
      } else {
        upsertTrek(await uploadGpx(selectedTrekId, rawFile, gpxTitle));
        setSaveOk("GPX salvato!");
      }
    } catch (err) {
      setSaveError(errorMessage(err, "Errore nel salvataggio"));
    } finally {
      setSaving(false);
    }
  }

  function onReset() {
    setGpx(null);
    setFileName("");
    setRawFile(null);
    setGpxTitle("");
    setTitle("");
    setTrekDate(today);
    setAmichetti("");
    setNotes("");
    setStart(null);
    setFolderId(null);
    setSelectedTrekId("");
    setSaveOk(null);
    setSaveError(null);
  }

  function changeMode(m: Mode) {
    setMode(m);
    setSaveOk(null);
    setSaveError(null);
  }

  if (bulkItems) {
    return <GpxBulkImport items={bulkItems} onClose={() => setBulkItems(null)} />;
  }

  return (
    <div className={styles.wrapper}>
      {!gpx ? (
        <label
          className={`${styles.dropzone} ${dragging ? styles.dropzoneActive : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <input type="file" accept=".gpx" multiple onChange={onPickFile} className={styles.fileInput} />
          <span className={styles.dropIcon} aria-hidden="true">⤒</span>
          <strong>Trascina qui uno o più file .gpx</strong>
          <span>oppure <u>sfoglia</u> dal computer</span>
        </label>
      ) : (
        <div className={`card ${styles.toolbar}`}>
          <div className={styles.toolbarTop}>
            <div className={styles.fileChip}>
              <span aria-hidden="true">🗺️</span>
              <b title={fileName}>{fileName}</b>
              <button type="button" className={styles.resetBtn} onClick={onReset} aria-label="Rimuovi file">✕</button>
            </div>

            <div className={styles.segmented} role="tablist" aria-label="Dove salvare il GPX">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "new"}
                className={mode === "new" ? styles.segActive : ""}
                onClick={() => changeMode("new")}
              >
                + Nuova escursione
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "existing"}
                className={mode === "existing" ? styles.segActive : ""}
                onClick={() => changeMode("existing")}
              >
                Escursione esistente
              </button>
            </div>
          </div>

          {mode === "new" ? (
            <div className={styles.newGrid}>
              <label className="field">
                <span>Titolo</span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Es. Anello del Monte Gennaro" />
              </label>
              <label className="field">
                <span>Data</span>
                <input type="date" value={trekDate} onChange={(e) => setTrekDate(e.target.value)} />
              </label>
              <label className="field">
                <span>Amichetti</span>
                <input value={amichetti} onChange={(e) => setAmichetti(e.target.value)} placeholder="Chi c'era?" />
              </label>
              <label className="field">
                <span>Titolo GPX</span>
                <input value={gpxTitle} onChange={(e) => setGpxTitle(e.target.value)} placeholder="Opzionale" />
              </label>
              <FolderSelect value={folderId} onChange={setFolderId} className={styles.full} />
              <label className={`field ${styles.full}`}>
                <span>Note</span>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Panorama, fatica, merenda al rifugio..." rows={3} />
              </label>
              <div className={`${styles.full} ${styles.startInfo}`}>
                📍 Punto del trek (partenza del GPX): {start ? `${start.lat.toFixed(5)}, ${start.lng.toFixed(5)}` : "non disponibile, il trek verrà creato senza punto"}
              </div>
            </div>
          ) : (
            <div className={styles.saveRow}>
              <label className="field">
                <span>Collega al trek</span>
                <select
                  id="gpxTrekSelect"
                  value={selectedTrekId}
                  onChange={(e) => {
                    setSelectedTrekId(e.target.value);
                    setSaveOk(null);
                    setSaveError(null);
                  }}
                >
                  <option value="">-- seleziona un trek --</option>
                  {treks.map((t) => (
                    <option key={t.id} value={t.id} disabled={t.hasGpx}>
                      {t.title}{t.trekDate ? ` (${formatDate(t.trekDate)})` : ""}{t.hasGpx ? " · ha già un GPX" : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Titolo GPX</span>
                <input
                  type="text"
                  placeholder="Opzionale"
                  value={gpxTitle}
                  onChange={(e) => setGpxTitle(e.target.value)}
                />
              </label>
            </div>
          )}

          <div className={styles.actions}>
            <button className="btn btn-primary" onClick={onSave} disabled={saving || !canSave || saveOk !== null}>
              {saving ? "Salvataggio..." : mode === "new" ? "Crea escursione con GPX" : "Salva nel DB"}
            </button>
            {saveOk && (
              <button type="button" className="btn btn-ghost" onClick={onReset}>
                Carica un altro GPX
              </button>
            )}
          </div>

          {saveOk && <div className="alert alert-success">✓ {saveOk}</div>}
          {saveError && <div className="alert alert-error">{saveError}</div>}
        </div>
      )}

      <div className={`map-frame ${styles.map}`}>
        <MapContainer center={center} zoom={11} maxZoom={TILE_MAX_ZOOM} style={{ height: "100%", width: "100%" }}>
          <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} maxZoom={TILE_MAX_ZOOM} />

          {gpx && <TrackLayer gpx={gpx} trackKey={fileName} />}
        </MapContainer>
        {!gpx && <div className={styles.mapHint}>L'anteprima del percorso apparirà qui</div>}
      </div>
    </div>
  );
}
