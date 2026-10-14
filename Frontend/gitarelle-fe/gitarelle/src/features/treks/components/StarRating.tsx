import { useState } from "react";
import { StarIcon } from "../../../shared/icons";
import { formatRating } from "../review";
import styles from "./Review.module.css";

type Props = {
  value: number | null;
  onChange?: (value: number | null) => void; // senza: solo lettura
  size?: number;
};

const STARS = [1, 2, 3, 4, 5];
const fillOf = (star: number, value: number) => (value >= star ? "full" : value >= star - 0.5 ? "half" : "empty");

// Stelle da 1 a 5 a mezzi punti: metà sinistra di una stella = mezzo voto. Con la tastiera frecce ±½,
// Canc azzera; un click sul voto già scelto lo toglie
export default function StarRating({ value, onChange, size = 16 }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;

  if (!onChange) {
    return (
      <span className={styles.stars} role="img" aria-label={value != null ? `${formatRating(value)} stelle su 5` : "Nessun voto"}>
        {STARS.map((s) => <StarIcon key={s} size={size} fill={fillOf(s, value ?? 0)} />)}
      </span>
    );
  }

  // stella sotto il puntatore: metà sinistra → mezzo voto (mai sotto 1)
  const valueAt = (e: React.MouseEvent<HTMLSpanElement>, star: number) => {
    const r = e.currentTarget.getBoundingClientRect();
    return Math.max(1, e.clientX - r.left < r.width / 2 ? star - 0.5 : star);
  };

  function onKeyDown(e: React.KeyboardEvent) {
    const step = ({ ArrowRight: 0.5, ArrowUp: 0.5, ArrowLeft: -0.5, ArrowDown: -0.5 } as Record<string, number>)[e.key];
    if (step) onChange!(Math.min(5, Math.max(1, (value ?? (step > 0 ? 0.5 : 1.5)) + step)));
    else if (e.key === "Home") onChange!(1);
    else if (e.key === "End") onChange!(5);
    else if (e.key === "Delete" || e.key === "Backspace") onChange!(null);
    else return;
    e.preventDefault();
  }

  return (
    <div className={styles.starInput}>
      <span
        className={`${styles.stars} ${styles.starsEditable}`}
        role="slider"
        tabIndex={0}
        aria-label="Voto"
        aria-valuemin={1}
        aria-valuemax={5}
        aria-valuenow={value ?? undefined}
        aria-valuetext={value != null ? `${formatRating(value)} stelle su 5` : "Nessun voto"}
        onKeyDown={onKeyDown}
        onPointerLeave={() => setHover(null)}
      >
        {STARS.map((s) => (
          <span
            key={s}
            onPointerMove={(e) => setHover(valueAt(e, s))}
            onClick={(e) => { const v = valueAt(e, s); onChange(v === value ? null : v); }}
          >
            <StarIcon size={size} fill={fillOf(s, shown)} />
          </span>
        ))}
      </span>
      <span className={styles.starValue}>{shown ? `${formatRating(shown)} / 5` : "Nessun voto"}</span>
    </div>
  );
}
