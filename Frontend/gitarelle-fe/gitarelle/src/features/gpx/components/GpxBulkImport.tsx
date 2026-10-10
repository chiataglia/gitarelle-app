import { useMemo, useState } from "react";
import { useTreks } from "../../treks/TreksContext";
import { createTrekWithGpx } from "../../treks/api";
import { errorMessage } from "../../../shared/api";
import { TRACK_PALETTE } from "../../../shared/map";
import FolderSelect from "../../treks/components/FolderSelect";
import TrekCompareMap, { type CompareItem } from "../../treks/components/TrekCompareMap";
import { hasTrack, type BulkItem } from "../bulk";
import styles from "./GpxViewer.module.css";

const colorOf = (i: number) => TRACK_PALETTE[i % TRACK_PALETTE.length];

type Props = {
  items: BulkItem[];
  onClose: () => void;
};

// Revisione di più gpx insieme: si correggono titolo e data, poi si creano tutti i trek in un colpo.
// Note e altri dettagli si aggiungono dopo dallo storico.
export default function GpxBulkImport({ items: initial, onClose }: Props) {
  const { upsertTrek } = useTreks();
  const [items, setItems] = useState(initial);
  const [amichetti, setAmichetti] = useState("");
  const [folderId, setFolderId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const update = (key: string, patch: Partial<BulkItem>) =>
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));

  const toCreate = items.filter((it) => it.selected && it.status !== "done" && it.title.trim());
  const doneCount = items.filter((it) => it.status === "done").length;
  const errorCount = items.filter((it) => it.status === "error").length;
  const selectable = items.filter((it) => it.status !== "done");
  const allSelected = selectable.length > 0 && selectable.every((it) => it.selected);

  const mapItems: CompareItem[] = useMemo(() => items
    .map((it, i) => ({ it, color: colorOf(i) }))
    .filter(({ it }) => it.selected && it.gpx)
    .map(({ it, color }) => ({ key: it.key, label: it.title || it.file.name, color, gpx: it.gpx, point: null })),
  [items]);

  function toggleAll() {
    setItems((prev) => prev.map((it) => (it.status === "done" ? it : { ...it, selected: !allSelected })));
  }

  // uno alla volta: ogni file ha il suo esito e un errore non blocca gli altri
  async function onCreateAll() {
    setSaving(true);
    for (const it of toCreate) {
      update(it.key, { status: "saving", error: undefined });
      try {
        const start = it.gpx?.info.start;
        const created = await createTrekWithGpx(
          { title: it.title.trim(), trekDate: it.trekDate || null, amichetti, notes: "", lat: start?.lat ?? null, lon: start?.lng ?? null, folderId },
          it.file,
        );
        upsertTrek(created);
        update(it.key, { status: "done", selected: false });
      } catch (err) {
        update(it.key, { status: "error", error: errorMessage(err, "Errore nel salvataggio") });
      }
    }
    setSaving(false);
  }

  return (
    <div className={styles.wrapper}>
      <div className={`card ${styles.toolbar}`}>
        <div className={styles.toolbarTop}>
          <div className={styles.fileChip}>
            <span aria-hidden="true">🗺️</span>
            <b>{items.length} file GPX</b>
            <button type="button" className={styles.resetBtn} onClick={onClose} disabled={saving} aria-label="Annulla caricamento">✕</button>
          </div>
          <span className={styles.bulkHint}>Controlla titolo e data: note e altri dettagli potrai aggiungerli dopo dallo storico.</span>
        </div>

        <div className={styles.saveRow}>
          <label className="field">
            <span>Amichetti (per tutti)</span>
            <input value={amichetti} onChange={(e) => setAmichetti(e.target.value)} placeholder="Chi c'era?" />
          </label>
          <FolderSelect value={folderId} onChange={setFolderId} />
        </div>

        <div className={styles.bulkList}>
          <div className={`${styles.bulkRow} ${styles.bulkHead}`}>
            <input type="checkbox" checked={allSelected} onChange={toggleAll} disabled={saving} aria-label="Seleziona tutti" />
            <span />
            <span>Titolo</span>
            <span>Data</span>
            <span />
          </div>
          {items.map((it, i) => {
            const locked = saving || it.status === "done";
            return (
              <div key={it.key} className={`${styles.bulkRow} ${it.status === "done" ? styles.bulkDone : ""}`}>
                <input
                  type="checkbox"
                  checked={it.selected}
                  disabled={locked}
                  onChange={(e) => update(it.key, { selected: e.target.checked })}
                  aria-label={`Includi ${it.file.name}`}
                />
                <span className={styles.bulkDot} style={{ background: colorOf(i) }} title={it.file.name} />
                <input
                  className={styles.bulkInput}
                  value={it.title}
                  disabled={locked}
                  onChange={(e) => update(it.key, { title: e.target.value })}
                  aria-label="Titolo"
                />
                <input
                  className={styles.bulkInput}
                  type="date"
                  value={it.trekDate}
                  disabled={locked}
                  onChange={(e) => update(it.key, { trekDate: e.target.value })}
                  aria-label="Data"
                />
                <span className={styles.bulkStatus}>
                  {it.status === "done" && <span className={styles.ok}>✓ creata</span>}
                  {it.status === "saving" && <span>Salvataggio…</span>}
                  {it.status === "error" && <span className={styles.ko} title={it.error}>✕ {it.error}</span>}
                  {it.status === "pending" && !hasTrack(it.gpx) && <span className={styles.warn}>nessuna traccia nel file</span>}
                  {it.status === "pending" && hasTrack(it.gpx) && it.duplicate && <span className={styles.warn}>già presente?</span>}
                  {it.status === "pending" && it.selected && !it.title.trim() && <span className={styles.warn}>manca il titolo</span>}
                </span>
              </div>
            );
          })}
        </div>

        <div className={styles.actions}>
          <button className="btn btn-primary" onClick={onCreateAll} disabled={saving || toCreate.length === 0}>
            {saving ? "Salvataggio..." : `Crea ${toCreate.length} escursion${toCreate.length === 1 ? "e" : "i"}`}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
            {doneCount > 0 ? "Carica altri GPX" : "Annulla"}
          </button>
        </div>

        {!saving && doneCount > 0 && (
          <div className="alert alert-success">✓ {doneCount} escursion{doneCount === 1 ? "e creata" : "i create"}</div>
        )}
        {!saving && errorCount > 0 && (
          <div className="alert alert-error">{errorCount} file non salvat{errorCount === 1 ? "o" : "i"}: puoi riprovare</div>
        )}
      </div>

      <div className={`map-frame ${styles.map}`}>
        <TrekCompareMap items={mapItems} />
      </div>
    </div>
  );
}
