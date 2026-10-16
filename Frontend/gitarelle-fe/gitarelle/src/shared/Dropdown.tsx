import { useEffect, useId, useRef, useState } from "react";
import styles from "./Dropdown.module.css";

export type DropdownOption = { value: string; label: string; count?: number };

type Props = {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  label: string; // per i lettori di schermo
};

// Tendina con l'aspetto dell'app al posto del <select> nativo (che apre l'elenco bianco del sistema).
// Tastiera: frecce, Invio/Spazio per scegliere, Esc per chiudere (senza chiudere chi la contiene)
export default function Dropdown({ value, options, onChange, label }: Props) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();
  const current = options.find((o) => o.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // l'opzione evidenziata resta visibile scorrendo con le frecce
  useEffect(() => {
    if (open) list.current?.children[hover]?.scrollIntoView({ block: "nearest" });
  }, [open, hover]);

  function openList() {
    setHover(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  }

  function pick(o: DropdownOption) {
    onChange(o.value);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHover((h) => Math.min(options.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHover((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick(options[hover]);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div ref={box} className={`${styles.wrap} ${open ? styles.open : ""}`}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={id}
        aria-label={`${label}: ${current?.label ?? ""}`}
      >
        <span className={styles.value}>{current?.label}</span>
        {current?.count != null && <span className={styles.count}>{current.count}</span>}
        <svg className={styles.chevron} viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <ul ref={list} id={id} className={styles.list} role="listbox" aria-label={label}>
          {options.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              className={`${styles.option} ${i === hover ? styles.optionHover : ""}`}
              onPointerEnter={() => setHover(i)}
              onClick={() => pick(o)}
            >
              <span className={styles.value}>{o.label}</span>
              {o.count != null && <span className={styles.count}>{o.count}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
