import { useState } from "react";
import styles from "./RangeSlider.module.css";

type Props = {
  min: number;
  max: number;
  step: number;
  // null = nessun limite da quel lato (maniglia in fondo alla barra)
  value: [number | null, number | null];
  onChange: (value: [number | null, number | null]) => void;
  format: (v: number) => string;
  label: string; // per i lettori di schermo: "Dislivello", "Distanza"...
};

// Barra con due maniglie trascinabili per scegliere un intervallo. Mentre si trascina cambia solo
// l'etichetta: il valore si comunica al rilascio, così chi la usa non ricalcola a ogni pixel
export default function RangeSlider({ min, max, step, value, onChange, format, label }: Props) {
  const clamp = (v: number) => Math.min(Math.max(v, min), max);
  // intervallo in trascinamento; fuori dal trascinamento vale quello ricevuto (es. dopo "Azzera filtri")
  const [draft, setDraft] = useState<[number, number] | null>(null);
  const [lo, hi] = draft ?? [clamp(value[0] ?? min), clamp(value[1] ?? max)];
  const setLo = (v: number) => setDraft([Math.min(v, hi), hi]);
  const setHi = (v: number) => setDraft([lo, Math.max(v, lo)]);

  const commit = () => {
    if (!draft) return;
    setDraft(null);
    onChange([lo <= min ? null : lo, hi >= max ? null : hi]);
  };
  const pct = (v: number) => (max > min ? ((v - min) / (max - min)) * 100 : 0);
  const commitProps = { onPointerUp: commit, onKeyUp: commit, onTouchEnd: commit };

  return (
    <div className={styles.slider}>
      <div className={styles.values} aria-hidden="true">
        <span>{format(lo)}</span>
        <span>{hi >= max ? `${format(hi)}+` : format(hi)}</span>
      </div>
      <div className={styles.track} style={{ "--lo": `${pct(lo)}%`, "--hi": `${pct(hi)}%` } as React.CSSProperties}>
        <input
          type="range" min={min} max={max} step={step} value={lo}
          onChange={(e) => setLo(Number(e.target.value))}
          // maniglie sovrapposte in fondo alla barra: sopra va la minima, se no non si sposterebbe più
          style={pct(lo) > 50 ? { zIndex: 2 } : undefined}
          aria-label={`${label}: minimo`} aria-valuetext={format(lo)}
          {...commitProps}
        />
        <input
          type="range" min={min} max={max} step={step} value={hi}
          onChange={(e) => setHi(Number(e.target.value))}
          aria-label={`${label}: massimo`} aria-valuetext={format(hi)}
          {...commitProps}
        />
      </div>
    </div>
  );
}
