import { useEffect, useRef, useState } from "react";
import { ABROAD, type Trek } from "../types";
import { NO_FILTERS, filterLabels, friendsOf, yearOf, type TrekFilterState } from "../trekFilters";
import { FilterIcon } from "../../../shared/icons";
import RangeSlider from "../../../shared/RangeSlider";
import Dropdown from "../../../shared/Dropdown";
import { formatGain } from "../../../shared/format";
import styles from "./TrekFilters.module.css";

type Props = {
  treks: Trek[]; // trek della cartella: da qui le opzioni (regioni, amici, anni) con i conteggi
  value: TrekFilterState;
  onChange: (f: TrekFilterState) => void;
};

// estremi della barra: dal valore più basso al più alto tra i trek, arrotondati al passo
function boundsOf(values: number[], step: number): [number, number] | null {
  if (values.length < 2) return null;
  const lo = Math.floor(Math.min(...values) / step) * step;
  const hi = Math.ceil(Math.max(...values) / step) * step;
  return hi > lo ? [lo, hi] : null;
}

// Pulsante "Filtri" con il pannello a tendina: regione, amici, anno, dislivello, distanza
export default function TrekFilters({ treks, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const set = (patch: Partial<TrekFilterState>) => onChange({ ...value, ...patch });
  const active = filterLabels(value).length;

  // clic fuori o Esc: chiude
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // opzioni con quanti trek hanno ciascuna; "Estero" in fondo alle regioni
  const count = (keys: (string | number)[]) => {
    const m = new Map<string | number, number>();
    for (const k of keys) m.set(k, (m.get(k) ?? 0) + 1);
    return m;
  };
  const regionCounts = count(treks.map((t) => t.region).filter((r): r is string => r != null));
  const regions = [...regionCounts.keys()].map(String).sort((a, b) =>
    a === ABROAD ? 1 : b === ABROAD ? -1 : a.localeCompare(b, "it"));
  // amici senza distinguere maiuscole: si mostra la prima grafia incontrata
  const friendNames = new Map<string, string>();
  const friendCounts = new Map<string, number>();
  for (const t of treks) {
    for (const f of new Set(friendsOf(t).map((x) => x.toLowerCase()))) {
      friendCounts.set(f, (friendCounts.get(f) ?? 0) + 1);
    }
    for (const f of friendsOf(t)) if (!friendNames.has(f.toLowerCase())) friendNames.set(f.toLowerCase(), f);
  }
  const friends = [...friendCounts.keys()].sort((a, b) => friendCounts.get(b)! - friendCounts.get(a)! || a.localeCompare(b, "it"));
  const yearCounts = count(treks.map(yearOf).filter((y): y is number => y != null));
  const years = [...yearCounts.keys()].map(Number).sort((a, b) => b - a);

  const gainBounds = boundsOf(treks.flatMap((t) => (t.elevationGainMeters != null ? [t.elevationGainMeters] : [])), 50);
  const distBounds = boundsOf(treks.flatMap((t) => (t.distanceMeters != null ? [t.distanceMeters / 1000] : [])), 1);

  const isPicked = (f: string) => value.friends.some((x) => x.toLowerCase() === f);
  const toggleFriend = (f: string) =>
    set({ friends: isPicked(f) ? value.friends.filter((x) => x.toLowerCase() !== f) : [...value.friends, friendNames.get(f) ?? f] });

  return (
    <div ref={box} className={`${styles.wrap} ${open ? styles.open : ""}`}>
      <button
        type="button"
        className={`${styles.btn} ${active ? styles.btnOn : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <FilterIcon size={14} />
        Filtri
        {active > 0 && <span className={styles.badge}>{active}</span>}
      </button>

      <div className={styles.menu} role="dialog" aria-label="Filtri">
        <div className={styles.panel}>
          <div className={styles.field}>
            <span>Regione</span>
            <Dropdown
              label="Regione"
              value={value.region ?? ""}
              onChange={(v) => set({ region: v || null })}
              options={[
                { value: "", label: "Tutte" },
                // la regione scelta resta tra le opzioni anche se nella cartella attuale non ha trek
                ...(value.region && !regionCounts.has(value.region) ? [{ value: value.region, label: value.region, count: 0 }] : []),
                ...regions.map((r) => ({ value: r, label: r, count: regionCounts.get(r) })),
              ]}
            />
          </div>

          <div className={styles.field}>
            <span>Anno</span>
            <Dropdown
              label="Anno"
              value={value.year != null ? String(value.year) : ""}
              onChange={(v) => set({ year: v ? Number(v) : null })}
              options={[
                { value: "", label: "Tutti" },
                ...(value.year != null && !yearCounts.has(value.year) ? [{ value: String(value.year), label: String(value.year), count: 0 }] : []),
                ...years.map((y) => ({ value: String(y), label: String(y), count: yearCounts.get(y) })),
              ]}
            />
          </div>

          {gainBounds && (
            <div className={styles.field}>
              <span>Dislivello positivo</span>
              <RangeSlider
                min={gainBounds[0]} max={gainBounds[1]} step={50}
                value={[value.gainMin, value.gainMax]}
                onChange={([gainMin, gainMax]) => set({ gainMin, gainMax })}
                format={formatGain}
                label="Dislivello positivo"
              />
            </div>
          )}

          {distBounds && (
            <div className={styles.field}>
              <span>Distanza</span>
              <RangeSlider
                min={distBounds[0]} max={distBounds[1]} step={0.5}
                value={[value.distMin, value.distMax]}
                onChange={([distMin, distMax]) => set({ distMin, distMax })}
                format={(v) => `${v.toLocaleString("it-IT")} km`}
                label="Distanza"
              />
            </div>
          )}

          {friends.length > 0 && (
            <div className={styles.field}>
              <span>Amici</span>
              <div className={styles.chips}>
                {friends.map((f) => (
                  <button key={f} type="button" className={styles.chip} aria-pressed={isPicked(f)} onClick={() => toggleFriend(f)}>
                    {friendNames.get(f)} <small>{friendCounts.get(f)}</small>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={styles.foot}>
            <button type="button" className={styles.reset} onClick={() => onChange(NO_FILTERS)} disabled={!active}>
              Azzera filtri
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
