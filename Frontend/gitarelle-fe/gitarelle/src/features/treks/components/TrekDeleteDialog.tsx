import { useState } from "react";
import type { Trek } from "../types";
import { deleteTrek } from "../api";
import { useTreks } from "../TreksContext";
import { errorMessage } from "../../../shared/api";
import { formatDate } from "../../../shared/format";
import { TrashIcon } from "../../../shared/icons";
import Modal from "../../../shared/Modal";
import styles from "./TrekDialogs.module.css";

type Props = {
  trek: Trek;
  onClose: () => void;
  onDeleted: (id: Trek["id"]) => void;
};

export default function TrekDeleteDialog({ trek, onClose, onDeleted }: Props) {
  const { removeTrek } = useTreks();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => { if (!deleting) onClose(); };

  async function onConfirm() {
    try {
      setDeleting(true);
      setError(null);
      await deleteTrek(trek.id);
      removeTrek(trek.id);
      onDeleted(trek.id);
    } catch (err) {
      setError(errorMessage(err, "Errore nell'eliminazione"));
      setDeleting(false);
    }
  }

  return (
    <Modal title="Eliminare l'escursione?" onClose={close}>
      <div className={styles.deleteBody}>
        <div className={styles.deleteTrek}>
          <strong>{trek.title}</strong>
          {trek.trekDate && <small>{formatDate(trek.trekDate)}</small>}
        </div>
        <p>
          {trek.hasGpx ? "Verrà eliminata anche la traccia GPX associata. " : ""}
          L'operazione non si può annullare.
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <div className={styles.footer}>
          <button type="button" className="btn btn-ghost" onClick={close} disabled={deleting} autoFocus>Annulla</button>
          <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={deleting}>
            <TrashIcon /> {deleting ? "Eliminazione..." : "Elimina"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
