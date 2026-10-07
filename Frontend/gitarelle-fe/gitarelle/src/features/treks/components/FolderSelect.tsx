import type { Folder } from "../types";
import { useTreks } from "../TreksContext";

type Props = {
  value: Folder["id"] | null;
  onChange: (id: Folder["id"] | null) => void;
  className?: string;
};

// Campo "Cartella" per i form di creazione/modifica trek
export default function FolderSelect({ value, onChange, className }: Props) {
  const { folders } = useTreks();
  return (
    <label className={`field ${className ?? ""}`}>
      <span>Cartella</span>
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}>
        <option value="">— nessuna —</option>
        {folders.map((f) => (
          <option key={f.id} value={f.id}>{f.name}</option>
        ))}
      </select>
    </label>
  );
}
