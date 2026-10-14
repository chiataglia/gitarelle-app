import { useState } from "react";
import type { Trek } from "../types";
import { useTreks } from "../TreksContext";
import { updateTrekReview } from "../api";
import { SCALE_MAX, TAG_GROUPS, effortLabel, sceneryLabel } from "../review";
import { errorMessage } from "../../../shared/api";
import Modal from "../../../shared/Modal";
import StarRating from "./StarRating";
import styles from "./Review.module.css";

type Props = {
  trek: Trek;
  onClose: () => void;
};

type ScaleProps = {
  label: string;
  describe: (value: number) => string; // significato del voto
  value: number | null;
  onChange: (value: number | null) => void;
};

const STEPS = Array.from({ length: SCALE_MAX }, (_, i) => i + 1);

// voto da 1 a 10 a pulsanti; un click sul voto già scelto lo toglie
function Scale({ label, describe, value, onChange }: ScaleProps) {
  return (
    <div className={styles.group} role="group" aria-label={label}>
      <div className={styles.groupHead}>
        <span>{label}</span>
        <small>{value != null ? `${value}/${SCALE_MAX} · ${describe(value)}` : "—"}</small>
      </div>
      <div className={styles.scale}>
        {STEPS.map((n) => (
          <button
            key={n}
            type="button"
            className={value != null && n <= value ? styles.on : undefined}
            aria-pressed={value === n}
            title={describe(n)}
            onClick={() => onChange(value === n ? null : n)}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

// Valutazione di un trek: stelle, recensione (le note), fatica, paesaggio, etichette, tratti pericolosi. Tutto facoltativo
export default function ReviewDialog({ trek, onClose }: Props) {
  const { upsertTrek } = useTreks();
  const [rating, setRating] = useState(trek.rating);
  const [notes, setNotes] = useState(trek.notes ?? "");
  const [effort, setEffort] = useState(trek.effort);
  const [scenery, setScenery] = useState(trek.scenery);
  const [tags, setTags] = useState<string[]>(trek.tags ?? []);
  // finché non si tocca l'interruttore resta "non indicato" (null)
  const [dangerous, setDangerous] = useState(trek.dangerous);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleTag = (tag: string) =>
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      upsertTrek(await updateTrekReview(trek.id, { rating, effort, scenery, dangerous, tags, notes }));
      onClose();
    } catch (err) {
      setError(errorMessage(err, "Errore nel salvataggio della valutazione"));
      setSaving(false);
    }
  }

  const close = () => { if (!saving) onClose(); };

  return (
    <Modal title={`Valuta “${trek.title}”`} onClose={close}>
      <form onSubmit={onSubmit} className={styles.form}>
        <div className={styles.group}>
          <div className={styles.groupHead}><span>Voto</span></div>
          <StarRating value={rating} onChange={setRating} size={30} />
        </div>

        <label className="field">
          <span>Recensione</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Com'è andata? Panorama, sentiero, merenda al rifugio..." />
        </label>

        <Scale label="Fatica" describe={effortLabel} value={effort} onChange={setEffort} />
        <Scale label="Paesaggio" describe={sceneryLabel} value={scenery} onChange={setScenery} />

        <div className={styles.group} role="group" aria-label="Etichette">
          <div className={styles.groupHead}><span>Etichette</span></div>
          {TAG_GROUPS.map((g) => (
            <div key={g.name} className={styles.tagGroup}>
              <small>{g.name}</small>
              <div className={styles.tagPicker}>
                {g.tags.map((tag) => (
                  <button key={tag} type="button" className={tags.includes(tag) ? styles.on : undefined} aria-pressed={tags.includes(tag)} onClick={() => toggleTag(tag)}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <label className={styles.switch}>
          <input type="checkbox" role="switch" checked={dangerous === true} onChange={(e) => setDangerous(e.target.checked)} />
          <span aria-hidden="true" />
          Tratti pericolosi
        </label>

        {error && <div className="alert alert-error">{error}</div>}

        <div className={styles.footer}>
          <button type="button" className="btn btn-ghost" onClick={close} disabled={saving}>Annulla</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Salvataggio..." : "Salva valutazione"}</button>
        </div>
      </form>
    </Modal>
  );
}
