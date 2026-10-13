import type { Folder } from "../types";
import { useTreks } from "../TreksContext";
import { FolderIcon } from "../../../shared/icons";
import styles from "./FolderBar.module.css";

type Props = {
  value: Folder["id"][];
  onChange: (ids: Folder["id"][]) => void;
  label?: string | null; // null = senza etichetta (es. nella scheda del trek)
  disabled?: boolean;
  className?: string;
};

// Campo "Cartelle" per i form dei trek: un trek può stare in più cartelle, si accendono e spengono con un click
export default function FolderSelect({ value, onChange, label = "Cartelle", disabled, className }: Props) {
  const { folders } = useTreks();

  const toggle = (id: Folder["id"]) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  const chips = folders.length === 0 ? (
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
