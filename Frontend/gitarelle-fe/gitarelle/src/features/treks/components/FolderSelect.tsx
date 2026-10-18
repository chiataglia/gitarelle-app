import { useState } from "react";
import type { Folder } from "../types";
import { useTreks } from "../TreksContext";
import { createFolder } from "../api";
import { errorMessage } from "../../../shared/api";
import { FolderIcon } from "../../../shared/icons";
import styles from "./FolderBar.module.css";

type Props = {
  value: Folder["id"][];
  onChange: (ids: Folder["id"][]) => void;
  label?: string | null; // null = senza etichetta (es. nella scheda del trek)
  disabled?: boolean;
  className?: string;
  allowCreate?: boolean; // in fondo un "+ Nuova" per creare una cartella al volo (già scelta per il trek)
};

// Campo "Cartelle" per i form dei trek: un trek può stare in più cartelle, si accendono e spengono con un click
export default function FolderSelect({ value, onChange, label = "Cartelle", disabled, className, allowCreate = false }: Props) {
  const { folders, upsertFolder } = useTreks();
  // nome della cartella nuova mentre la si scrive (null = chiuso)
  const [draft, setDraft] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: Folder["id"]) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  async function create() {
    const name = draft?.trim();
    if (!name) {
      setDraft(null);
      return;
    }
    try {
      setCreating(true);
      setError(null);
      const folder = await createFolder(name);
      upsertFolder(folder);
      onChange([...value, folder.id]);
      setDraft(null);
    } catch (err) {
      setError(errorMessage(err, "Errore nella creazione della cartella"));
    } finally {
      setCreating(false);
    }
  }

  const createChip = allowCreate && (draft == null ? (
    <button type="button" className={`${styles.chip} ${styles.pickChip} ${styles.pickNew}`} onClick={() => { setDraft(""); setError(null); }} disabled={disabled}>
      + Nuova
    </button>
  ) : (
    <input
      className={styles.pickNewInput}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        // Invio crea senza inviare il form; Esc chiude senza chiudere un eventuale dialog
        if (e.key === "Enter") { e.preventDefault(); create(); }
        if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setDraft(null); setError(null); }
      }}
      onBlur={() => { if (!creating && !draft.trim()) setDraft(null); }}
      maxLength={60}
      placeholder="Nome e Invio"
      aria-label="Nome della nuova cartella"
      disabled={creating}
      autoFocus
    />
  ));

  const chips = folders.length === 0 && !allowCreate ? (
    <span className={styles.pickEmpty}>Nessuna cartella: creale dallo storico</span>
  ) : (
    <div className={styles.pickChips}>
      {folders.map((f) => {
        const on = value.includes(f.id);
        return (
          <button
            key={f.id}
            type="button"
            role="checkbox"
            aria-checked={on}
            className={`${styles.chip} ${styles.pickChip} ${on ? styles.chipActive : ""}`}
            onClick={() => toggle(f.id)}
            disabled={disabled}
          >
            <FolderIcon size={13} />
            <span className={styles.chipLabel}>{f.name}</span>
          </button>
        );
      })}
      {createChip}
      {error && <span className={styles.pickError}>{error}</span>}
    </div>
  );

  if (label === null) return chips;
  return (
    <div className={`field ${className ?? ""}`} role="group" aria-label={label}>
      <span>{label}</span>
      {chips}
    </div>
  );
}
