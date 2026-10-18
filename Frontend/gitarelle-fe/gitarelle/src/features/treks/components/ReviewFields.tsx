import { useEffect, useRef, useState } from "react";
import type { TrekReview } from "../types";
import { SCALE_MAX, TAG_GROUPS, effortLabel, sceneryLabel } from "../review";
import { TagIcon } from "../../../shared/icons";
import StarRating from "./StarRating";
import styles from "./Review.module.css";

const LABEL_MAX = 40;

type ScaleProps = {
  label: string;
  describe: (value: number) => string; // significato automatico del voto
  value: number | null;
  custom: string | null;               // scritta propria al posto di quella automatica
  onChange: (value: number | null) => void;
  onCustomChange: (custom: string | null) => void;
};

const STEPS = Array.from({ length: SCALE_MAX }, (_, i) => i + 1);

// voto da 1 a 10 a pulsanti; un click sul voto già scelto lo toglie.
// La scritta del voto si cambia cliccandoci sopra (vuota = torna quella automatica)
function Scale({ label, describe, value, custom, onChange, onCustomChange }: ScaleProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  function startEdit() {
    if (value == null) return;
    setDraft(custom ?? describe(value));
    setEditing(true);
  }

  function commit() {
    setEditing(false);
    const text = draft.trim();
    // uguale a quella automatica = nessuna scritta propria
    onCustomChange(!text || (value != null && text === describe(value)) ? null : text);
  }

  return (
    <div className={styles.group} role="group" aria-label={label}>
      <div className={styles.groupHead}>
        <span>{label}</span>
        {value == null ? (
          <small>—</small>
        ) : editing ? (
          <small className={styles.scaleLabelEdit}>
            {value}/{SCALE_MAX} ·
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); commit(); }
                if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setEditing(false); }
              }}
              maxLength={LABEL_MAX}
              aria-label={`Descrizione del voto di ${label.toLowerCase()}`}
              autoFocus
            />
          </small>
        ) : (
          <small className={styles.scaleLabel}>
            {value}/{SCALE_MAX} ·{" "}
            <button type="button" onClick={startEdit} title="Clicca per scrivere una descrizione tua">
              {custom ?? describe(value)}
            </button>
            {custom != null && (
              <button type="button" className={styles.scaleLabelReset} onClick={() => onCustomChange(null)} title={`Torna a “${describe(value)}”`} aria-label="Torna alla descrizione automatica">
                ↺
              </button>
            )}
          </small>
        )}
      </div>
      <div className={styles.scale}>
        {STEPS.map((n) => (
          <button
            key={n}
            type="button"
            className={value != null && n <= value ? styles.on : undefined}
            aria-pressed={value === n}
            title={describe(n)}
            onClick={() => {
              const next = value === n ? null : n;
              onChange(next);
              if (next == null) onCustomChange(null); // senza voto la scritta propria non ha senso
            }}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

// Etichette raccolte in un'icona: il click apre un pannellino con i gruppi da accendere e spegnere.
// Accanto all'icona restano visibili quelle scelte. Click fuori o Esc chiudono il pannello
function TagPicker({ value, onChange }: { value: string[]; onChange: (tags: string[]) => void }) {
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

  const toggle = (tag: string) => onChange(value.includes(tag) ? value.filter((t) => t !== tag) : [...value, tag]);

  return (
    <div
      ref={box}
      className={styles.tagBox}
      onKeyDown={(e) => {
        // Esc chiude solo il pannello, non il dialog che lo contiene
        if (open && e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setOpen(false); }
      }}
    >
      <button
        type="button"
        className={`${styles.tagBtn} ${open ? styles.tagBtnOpen : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Etichette del percorso"
      >
        <TagIcon size={15} />
        Etichette
        {value.length > 0 && <span className={styles.tagCount}>{value.length}</span>}
      </button>
      {value.map((tag) => (
        <span key={tag} className={styles.label}>{tag}</span>
      ))}
      {open && (
        <div className={styles.tagPanel} role="dialog" aria-label="Etichette">
          {TAG_GROUPS.map((g) => (
            <div key={g.name} className={styles.tagPanelGroup}>
              <small>{g.name}</small>
              <div className={styles.tagPicker}>
                {g.tags.map((tag) => (
                  <button key={tag} type="button" className={value.includes(tag) ? styles.on : undefined} aria-pressed={value.includes(tag)} onClick={() => toggle(tag)}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type Props = {
  value: TrekReview;
  onChange: (review: TrekReview) => void;
  compact?: boolean; // fatica e paesaggio affiancati, separati da una linea (form di creazione)
};

// Campi della valutazione (stelle, recensione, fatica, paesaggio, etichette, tratti pericolosi), tutti facoltativi:
// nel dialog "Valuta" dello storico e nella creazione di un trek
export default function ReviewFields({ value, onChange, compact = false }: Props) {
  const set = (patch: Partial<TrekReview>) => onChange({ ...value, ...patch });

  const scales = (
    <>
      <Scale
        label="Fatica"
        describe={effortLabel}
        value={value.effort}
        custom={value.effortLabel}
        onChange={(effort) => set({ effort })}
        onCustomChange={(effortLabel) => set({ effortLabel })}
      />
      {compact && <span className={styles.scalesDivider} aria-hidden="true" />}
      <Scale
        label="Paesaggio"
        describe={sceneryLabel}
        value={value.scenery}
        custom={value.sceneryLabel}
        onChange={(scenery) => set({ scenery })}
        onCustomChange={(sceneryLabel) => set({ sceneryLabel })}
      />
    </>
  );

  return (
    <>
      <div className={styles.ratingRow}>
        <span className={styles.ratingRowLabel}>Voto</span>
        <StarRating value={value.rating} onChange={(rating) => set({ rating })} size={24} />
      </div>

      <label className="field">
        <span>Recensione</span>
        <textarea value={value.notes} onChange={(e) => set({ notes: e.target.value })} rows={3} placeholder="Com'è andata? Panorama, sentiero, merenda al rifugio..." />
      </label>

      {compact ? <div className={styles.scalesRow}>{scales}</div> : scales}

      <div className={styles.tagsRow}>
        <TagPicker value={value.tags} onChange={(tags) => set({ tags })} />
        {/* finché non si tocca l'interruttore resta "non indicato" (null) */}
        <label className={styles.switch}>
          <input type="checkbox" role="switch" checked={value.dangerous === true} onChange={(e) => set({ dangerous: e.target.checked })} />
          <span aria-hidden="true" />
          Tratti pericolosi
        </label>
      </div>
    </>
  );
}
