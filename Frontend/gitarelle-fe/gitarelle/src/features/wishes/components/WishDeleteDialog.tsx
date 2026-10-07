import { useState } from "react";
import type { Wish } from "../types";
import { deleteWish } from "../api";
import { errorMessage } from "../../../shared/api";
import { TrashIcon } from "../../../shared/icons";
import Modal from "../../../shared/Modal";
import styles from "./Wishes.module.css";

type Props = {
  wish: Wish;
  onClose: () => void;
  onDeleted: (id: Wish["id"]) => void;
};

export default function WishDeleteDialog({ wish, onClose, onDeleted }: Props) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => { if (!deleting) onClose(); };

  async function onConfirm() {
    try {
      setDeleting(true);
      setError(null);
      await deleteWish(wish.id);
      onDeleted(wish.id);
    } catch (err) {
      setError(errorMessage(err, "Errore nell'eliminazione"));
      setDeleting(false);
    }
  }

  return (
    <Modal title="Togliere dalla lista?" onClose={close}>
      <div className={styles.confirmBody}>
        <div className={styles.confirmCard}>
          <strong>{wish.name}</strong>
          {wish.idealPeriod && <small>🗓 {wish.idealPeriod}</small>}
        </div>
        <p>
          {wish.hasGpx ? "Verrà eliminata anche la traccia GPX. " : ""}
          L'operazione non si può annullare.
        </p>
        {error && <div className="alert alert-error">{error}</div>}
        <div className={styles.formFooter}>
          <button type="button" className="btn btn-ghost" onClick={close} disabled={deleting} autoFocus>Annulla</button>
          <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={deleting}>
            <TrashIcon /> {deleting ? "Eliminazione..." : "Elimina idea"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
