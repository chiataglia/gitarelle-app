import { useState } from "react";
import type { Folder, FolderFilter } from "../types";
import { useTreks } from "../TreksContext";
import { createFolder, deleteFolder, renameFolder } from "../api";
import { errorMessage } from "../../../shared/api";
import { FolderIcon, PencilIcon, TrashIcon } from "../../../shared/icons";
import Modal from "../../../shared/Modal";
import styles from "./FolderBar.module.css";
import dialogStyles from "./TrekDialogs.module.css";

type Props = {
  value: FolderFilter;
  onChange: (f: FolderFilter) => void;
};

// Filtro dello storico per cartella + gestione delle cartelle (crea, rinomina, elimina)
export default function FolderBar({ value, onChange }: Props) {
  const { treks, folders } = useTreks();
  // "new" = creazione, Folder = rinomina
  const [naming, setNaming] = useState<"new" | Folder | null>(null);
  const [deleting, setDeleting] = useState<Folder | null>(null);

  const countIn = (id: Folder["id"] | null) => treks.filter((t) => t.folderId === id).length;
  const withoutFolder = countIn(null);
  const active = typeof value === "number" ? folders.find((f) => f.id === value) ?? null : null;

  const chip = (key: FolderFilter, label: string, count: number, icon = false) => (
    <button
      key={key}
      type="button"
      role="tab"
      aria-selected={value === key}
      className={`${styles.chip} ${value === key ? styles.chipActive : ""}`}
      onClick={() => onChange(key)}
    >
      {icon && <FolderIcon size={14} />}
      <span className={styles.chipLabel}>{label}</span>
      <span className={styles.count}>{count}</span>
    </button>
  );

  return (
    <div className={styles.bar}>
      <div className={styles.chips} role="tablist" aria-label="Filtra per cartella">
        {chip("all", "Tutti", treks.length)}
        {folders.map((f) => chip(f.id, f.name, countIn(f.id), true))}
        {folders.length > 0 && withoutFolder > 0 && chip("none", "Senza cartella", withoutFolder)}
        <button type="button" className={`${styles.chip} ${styles.chipAdd}`} onClick={() => setNaming("new")}>
          + Cartella
        </button>
      </div>

      {active && (
        <div className={styles.activeTools}>
          <button type="button" className={styles.toolBtn} onClick={() => setNaming(active)} title="Rinomina cartella" aria-label={`Rinomina ${active.name}`}>
            <PencilIcon size={15} />
          </button>
          <button type="button" className={`${styles.toolBtn} ${styles.toolDanger}`} onClick={() => setDeleting(active)} title="Elimina cartella" aria-label={`Elimina ${active.name}`}>
            <TrashIcon size={15} />
          </button>
        </div>
      )}

      {naming && (
        <FolderNameDialog
          folder={naming === "new" ? null : naming}
          onClose={() => setNaming(null)}
          onSaved={(f) => { setNaming(null); onChange(f.id); }}
        />
      )}
      {deleting && (
        <FolderDeleteDialog
          folder={deleting}
          trekCount={countIn(deleting.id)}
          onClose={() => setDeleting(null)}
          onDeleted={() => { setDeleting(null); onChange("all"); }}
        />
      )}
    </div>
  );
}

// Creazione (folder = null) o rinomina di una cartella
function FolderNameDialog({ folder, onClose, onSaved }: { folder: Folder | null; onClose: () => void; onSaved: (f: Folder) => void }) {
  const { upsertFolder } = useTreks();
  const [name, setName] = useState(folder?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => { if (!saving) onClose(); };

  async function onSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setSaving(true);
      setError(null);
      const saved = folder ? await renameFolder(folder.id, name.trim()) : await createFolder(name.trim());
      upsertFolder(saved);
      onSaved(saved);
    } catch (err) {
      setError(errorMessage(err, "Errore nel salvataggio della cartella"));
      setSaving(false);
    }
  }

  return (
    <Modal title={folder ? "Rinomina cartella" : "Nuova cartella"} onClose={close}>
      <form onSubmit={onSubmit} className={dialogStyles.deleteBody}>
        <label className="field">
          <span>Nome</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Es. Lombardia, Dolomiti, Weekend al lago..." required autoFocus />
        </label>
        {error && <div className="alert alert-error">{error}</div>}
        <div className={dialogStyles.footer}>
          <button type="button" className="btn btn-ghost" onClick={close} disabled={saving}>Annulla</button>
          <button type="submit" className="btn btn-primary" disabled={saving || !name.trim()}>
            {saving ? "Salvataggio..." : folder ? "Rinomina" : "Crea cartella"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function FolderDeleteDialog({ folder, trekCount, onClose, onDeleted }: { folder: Folder; trekCount: number; onClose: () => void; onDeleted: () => void }) {
  const { removeFolder } = useTreks();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => { if (!deleting) onClose(); };

  async function onConfirm() {
    try {
      setDeleting(true);
      setError(null);
      await deleteFolder(folder.id);
      removeFolder(folder.id);
      onDeleted();
    } catch (err) {
      setError(errorMessage(err, "Errore nell'eliminazione della cartella"));
      setDeleting(false);
    }
  }

  return (
    <Modal title="Eliminare la cartella?" onClose={close}>
      <div className={dialogStyles.deleteBody}>
        <div className={dialogStyles.deleteTrek}>
          <strong>📁 {folder.name}</strong>
        </div>
        <p>
          {trekCount === 0
            ? "La cartella è vuota."
            : trekCount === 1
              ? "La sua escursione non verrà eliminata: resterà nello storico senza cartella."
              : `Le sue ${trekCount} escursioni non verranno eliminate: resteranno nello storico senza cartella.`}
        </p>
        {error && <div className="alert alert-error">{error}</div>}
        <div className={dialogStyles.footer}>
          <button type="button" className="btn btn-ghost" onClick={close} disabled={deleting} autoFocus>Annulla</button>
          <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={deleting}>
            <TrashIcon /> {deleting ? "Eliminazione..." : "Elimina cartella"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
