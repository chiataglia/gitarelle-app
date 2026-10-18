import { useEffect, useRef, useState } from "react";
import { TRACK_PALETTE } from "./map";
import styles from "./ColorPicker.module.css";

type Props = {
  // colore scelto ("#rrggbb"); null = automatico; undefined = invariato (solo con keepLabel)
  value: string | null | undefined;
  onChange: (color: string | null | undefined) => void;
  autoColor?: string; // colore che si avrebbe con "Auto", mostrato nel suo pallino
  keepLabel?: string; // se c'è, prima opzione "lascia com'è" (es. colore delle tracce di una cartella)
  disabled?: boolean;
};

// Scelta del colore di una traccia: automatico, uno della tavolozza delle mappe o uno qualsiasi
export default function ColorPicker({ value, onChange, autoColor, keepLabel, disabled = false }: Props) {
  const custom = value != null && !TRACK_PALETTE.includes(value);
  return (
    <div className={styles.picker} role="radiogroup">
      {keepLabel && (
        <button
          type="button"
          role="radio"
          aria-checked={value === undefined}
          className={`${styles.chip} ${value === undefined ? styles.on : ""}`}
          onClick={() => onChange(undefined)}
          disabled={disabled}
        >
          {keepLabel}
        </button>
      )}
      <button
        type="button"
        role="radio"
        aria-checked={value === null}
        className={`${styles.chip} ${value === null ? styles.on : ""}`}
        onClick={() => onChange(null)}
        disabled={disabled}
        title="Colore automatico"
      >
        {autoColor && <span className={styles.dot} style={{ background: autoColor }} />}
        Auto
      </button>
      {TRACK_PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          aria-label={c}
          className={`${styles.swatch} ${value === c ? styles.on : ""}`}
          style={{ background: c }}
          onClick={() => onChange(c)}
          disabled={disabled}
        />
      ))}
      {/* colore a piacere: il pallino arcobaleno apre il selettore del sistema */}
      <label
        className={`${styles.swatch} ${styles.custom} ${custom ? styles.on : ""}`}
        style={custom ? { background: value } : undefined}
        title="Altro colore"
      >
        <input
          type="color"
          value={value ?? autoColor ?? TRACK_PALETTE[0]}
          onChange={(e) => onChange(e.target.value.toLowerCase())}
          disabled={disabled}
          aria-label="Altro colore"
        />
      </label>
    </div>
  );
}

// Colore compresso in un pallino: il click apre un pannellino con ColorPicker, che si chiude scegliendo
// (o con click fuori / Esc). Per i form dove lo spazio conta
export function ColorButton({ value, onChange, autoColor, label = "Colore" }: {
  value: string | null;
  onChange: (color: string | null) => void;
  autoColor: string; // colore mostrato quando è automatico
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  return (
    <div
      ref={box}
      className={styles.buttonBox}
      onKeyDown={(e) => {
        if (open && e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setOpen(false); }
      }}
    >
      <button
        type="button"
        className={`${styles.button} ${open ? styles.buttonOpen : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={value ? `${label}: ${value}` : `${label}: automatico`}
        aria-label={label}
      >
        <span className={styles.buttonDot} style={{ background: value ?? autoColor }} />
      </button>
      {open && (
        <div className={styles.panel} role="dialog" aria-label={label}>
          <ColorPicker
            value={value}
            autoColor={autoColor}
            // con il selettore del sistema si resta aperti (lo si trascina), con un pallino si chiude
            onChange={(c) => {
              onChange(c ?? null);
              if (c == null || TRACK_PALETTE.includes(c)) setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
