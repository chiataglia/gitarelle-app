import { useEffect, useState } from "react";
import type { Folder, FolderFilter } from "../types";
import { useTreks } from "../TreksContext";
import { addTreksToFolder, createFolder, deleteFolder, renameFolder } from "../api";
import { isTrekDrag, readTrekDrag } from "../trekDrag";
import { errorMessage } from "../../../shared/api";
import { FolderIcon, PencilIcon, TrashIcon } from "../../../shared/icons";
import Modal from "../../../shared/Modal";
import styles from "./FolderBar.module.css";
import dialogStyles from "./TrekDialogs.module.css";

type Props = {
  value: FolderFilter;
  onChange: (f: FolderFilter) => void;
  dragging?: boolean;       // si stanno trascinando trek dalla lista: le cartelle si evidenziano come destinazioni
  onTreksAdded?: () => void; // dopo un rilascio andato a buon fine (la lista azzera la selezione)
  onAdd: (folder: Folder) => void; // "+ Aggiungi": lo storico mostra i trek non ancora nella cartella, con un "+"
  adding?: boolean;                // modalità "Aggiungi" in corso (il pulsante si nasconde)
  vertical?: boolean;              // una cartella per riga (pannello accanto alla mappa)
};

const escursioni = (n: number) => (n === 1 ? "1 escursione" : `${n} escursioni`);

// Filtro dello storico per cartella + gestione delle cartelle (crea, rinomina, elimina, aggiungi trek).
// Le cartelle accettano i trek trascinati dalla lista
export default function FolderBar({ value, onChange, dragging = false, onTreksAdded, onAdd, adding = false, vertical = false }: Props) {
  const { treks, folders, upsertTreks } = useTreks();
  // "new" = creazione, Folder = rinomina
  const [naming, setNaming] = useState<"new" | Folder | null>(null);
  const [deleting, setDeleting] = useState<Folder | null>(null);

  // cartella sotto il mouse durante il trascinamento, ed esito dell'ultimo rilascio
  const [dropOver, setDropOver] = useState<Folder["id"] | null>(null);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const countIn = (id: Folder["id"]) => treks.filter((t) => t.folderIds.includes(id)).length;
  const withoutFolder = treks.filter((t) => t.folderIds.length === 0).length;
  const active = typeof value === "number" ? folders.find((f) => f.id === value) ?? null : null;

  async function onDrop(e: React.DragEvent, folder: Folder) {
    e.preventDefault();
    setDropOver(null);
    const ids = readTrekDrag(e);
    if (!ids.length) return;
    const fresh = ids.filter((id) => !treks.find((t) => t.id === id)?.folderIds.includes(folder.id));
    if (!fresh.length) {
      setNotice({ text: ids.length === 1 ? `Già in "${folder.name}"` : `Erano già tutte in "${folder.name}"` });
      return;
    }
    try {
      upsertTreks(await addTreksToFolder(folder.id, fresh));
      setNotice({ text: `${escursioni(fresh.length)} in "${folder.name}"` });
      onTreksAdded?.();
    } catch (err) {
      setNotice({ text: errorMessage(err, "Errore nell'aggiunta alla cartella"), error: true });
    }
  }

  const chip = (key: FolderFilter, label: string, count: number, folder?: Folder) => {
    const droppable = folder != null && dragging;
    return (
      <button
        key={key}
        type="button"
        role="tab"
        aria-selected={value === key}
        className={`${styles.chip} ${value === key ? styles.chipActive : ""} ${droppable ? styles.chipDrop : ""} ${droppable && dropOver === folder.id ? styles.chipDropOver : ""}`}
        onClick={() => onChange(key)}
        {...(folder && {
          onDragOver: (e: React.DragEvent) => {
            if (!isTrekDrag(e)) return;
            e.preventDefault(); // senza, il browser non permette il rilascio
            e.dataTransfer.dropEffect = "copy";
            setDropOver(folder.id);
          },
          onDragLeave: () => setDropOver((cur) => (cur === folder.id ? null : cur)),
          onDrop: (e: React.DragEvent) => onDrop(e, folder),
        })}
      >
        {folder && <FolderIcon size={14} />}
        <span className={styles.chipLabel}>{label}</span>
        <span className={styles.count}>{count}</span>
      </button>
    );
  };

  return (
    <div className={`${styles.bar} ${vertical ? styles.vertical : ""}`}>
      <div className={styles.chips} role="tablist" aria-label="Filtra per cartella">
        {chip("all", "Tutti", treks.length)}
        {folders.map((f) => chip(f.id, f.name, countIn(f.id), f))}
        {folders.length > 0 && withoutFolder > 0 && chip("none", "Senza cartella", withoutFolder)}
        <button type="button" className={`${styles.chip} ${styles.chipAdd}`} onClick={() => setNaming("new")}>
          + Cartella
        </button>
        {notice && (
          <span className={`${styles.notice} ${notice.error ? styles.noticeError : ""}`} role="status">{notice.text}</span>
        )}
      </div>

      {active && (
        <div className={styles.activeTools}>
          {!adding && (
            <button type="button" className={`btn btn-ghost btn-sm ${styles.addBtn}`} onClick={() => onAdd(active)} title={`Aggiungi escursioni a "${active.name}" dalla mappa`}>
              + Aggiungi
            </button>
          )}
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
              ? "La sua escursione non verrà eliminata: resterà nello storico (e nelle altre cartelle in cui si trova)."
              : `Le sue ${trekCount} escursioni non verranno eliminate: resteranno nello storico (e nelle altre cartelle in cui si trovano).`}
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
