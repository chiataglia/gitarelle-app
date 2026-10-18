import { useMemo } from "react";
import { useTreks } from "../TreksContext";
import { friendsOf } from "../trekFilters";
import styles from "./FriendsInput.module.css";

const MAX_SUGGESTIONS = 8;
const SEPARATOR = /,|;|&|\+|\s+e\s+/i; // come friendsOf

type Props = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
};

// Campo "Amichetti" con sotto gli amici più frequenti negli altri trek: un click li aggiunge.
// Mentre si scrive un nome si vedono solo quelli che iniziano così, e il click lo completa
export default function FriendsInput({ value, onChange, label = "Amichetti" }: Props) {
  const { treks } = useTreks();

  // amici di tutti i trek, dal più frequente (senza distinguere maiuscole: vale la prima grafia incontrata)
  const known = useMemo(() => {
    const names = new Map<string, string>();
    const counts = new Map<string, number>();
    for (const t of treks) {
      for (const f of friendsOf(t)) {
        const k = f.toLowerCase();
        if (!names.has(k)) names.set(k, f);
        counts.set(k, (counts.get(k) ?? 0) + 1);
      }
    }
    return [...counts.keys()]
      .sort((a, b) => counts.get(b)! - counts.get(a)! || a.localeCompare(b, "it"))
      .map((k) => names.get(k)!);
  }, [treks]);

  // nomi già scritti e l'eventuale nome a metà (l'ultimo, se non è ancora uno conosciuto)
  const parts = value.split(SEPARATOR).map((s) => s.trim());
  const last = parts[parts.length - 1] ?? "";
  const knownLower = new Set(known.map((k) => k.toLowerCase()));
  const partial = last && !knownLower.has(last.toLowerCase()) ? last : "";
  const written = new Set(parts.filter(Boolean).map((p) => p.toLowerCase()));

  const suggestions = known
    .filter((k) => !written.has(k.toLowerCase()))
    .filter((k) => !partial || k.toLowerCase().startsWith(partial.toLowerCase()))
    .slice(0, MAX_SUGGESTIONS);

  function add(name: string) {
    // al posto del nome a metà, se c'è; i separatori scritti a mano diventano virgole
    const kept = parts.filter(Boolean);
    if (partial) kept.pop();
    onChange([...kept, name].join(", "));
  }

  return (
    <div className="field">
      <label className={styles.label}>
        <span>{label}</span>
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Chi c'era?" />
      </label>
      {suggestions.length > 0 && (
        <div className={styles.suggestions} aria-label="Amici frequenti">
          {suggestions.map((name) => (
            <button key={name} type="button" onClick={() => add(name)} title={`Aggiungi ${name}`}>
              + {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
