import { useState } from "react";
import type { Trek } from "../types";
import { useTreks } from "../TreksContext";
import { updateTrekReview } from "../api";
import { errorMessage } from "../../../shared/api";
import Modal from "../../../shared/Modal";
import { reviewOf } from "../review";
import ReviewFields from "./ReviewFields";
import styles from "./Review.module.css";

type Props = {
  trek: Trek;
  onClose: () => void;
};

// Valutazione di un trek: stelle, recensione (le note), fatica, paesaggio, etichette, tratti pericolosi. Tutto facoltativo
export default function ReviewDialog({ trek, onClose }: Props) {
  const { upsertTrek } = useTreks();
  const [review, setReview] = useState(() => reviewOf(trek));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      upsertTrek(await updateTrekReview(trek.id, review));
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
        <ReviewFields value={review} onChange={setReview} />

        {error && <div className="alert alert-error">{error}</div>}

        <div className={styles.footer}>
          <button type="button" className="btn btn-ghost" onClick={close} disabled={saving}>Annulla</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Salvataggio..." : "Salva valutazione"}</button>
        </div>
      </form>
    </Modal>
  );
}
