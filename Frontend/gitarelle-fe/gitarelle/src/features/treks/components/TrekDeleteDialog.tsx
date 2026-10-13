import { useState } from "react";
import type { Trek } from "../types";
import { deleteTrek, deleteTreks } from "../api";
import { useTreks } from "../TreksContext";
import { errorMessage } from "../../../shared/api";
import { formatDate } from "../../../shared/format";
import { TrashIcon } from "../../../shared/icons";
import Modal from "../../../shared/Modal";
import styles from "./TrekDialogs.module.css";

type Props = {
  treks: Trek[]; // uno (cestino o scheda) o più (scelti nello storico)
  onClose: () => void;
  onDeleted: (ids: Trek["id"][]) => void;
};

const MAX_LISTED = 6; // oltre si elencano i primi e "e altre N"

// Conferma dell'eliminazione di uno o più trek (con le loro tracce gpx): tutti o nessuno
export default function TrekDeleteDialog({ treks, onClose, onDeleted }: Props) {
  const { removeTrek } = useTreks();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const many = treks.length > 1;
  const withGpx = treks.filter((t) => t.hasGpx).length;

  const close = () => { if (!deleting) onClose(); };

  async function onConfirm() {
    const ids = treks.map((t) => t.id);
    try {
      setDeleting(true);
      setError(null);
      await (many ? deleteTreks(ids) : deleteTrek(ids[0]));
      ids.forEach(removeTrek);
      onDeleted(ids);
    } catch (err) {
      setError(errorMessage(err, "Errore nell'eliminazione"));
      setDeleting(false);
    }
  }

  return (
    <Modal title={many ? `Eliminare ${treks.length} escursioni?` : "Eliminare l'escursione?"} onClose={close}>
      <div className={styles.deleteBody}>
        <div className={styles.deleteTrek}>
          {many ? (
            <ul className={styles.deleteList}>
              {treks.slice(0, MAX_LISTED).map((t) => (
                <li key={t.id}>
                  <strong>{t.title}</strong>
                  {t.trekDate && <small> · {formatDate(t.trekDate)}</small>}
                </li>
              ))}
              {treks.length > MAX_LISTED && <li><small>e altre {treks.length - MAX_LISTED}</small></li>}
            </ul>
          ) : (
            <>
              <strong>{treks[0].title}</strong>
              {treks[0].trekDate && <small>{formatDate(treks[0].trekDate)}</small>}
            </>
          )}
        </div>
        <p>
          {withGpx === 0
            ? ""
            : !many
              ? "Verrà eliminata anche la traccia GPX associata. "
              : withGpx === 1
                ? "Verrà eliminata anche la traccia GPX di una di queste. "
                : `Verranno eliminate anche le ${withGpx} tracce GPX associate. `}
          L'operazione non si può annullare.
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <div className={styles.footer}>
          <button type="button" className="btn btn-ghost" onClick={close} disabled={deleting} autoFocus>Annulla</button>
          <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={deleting}>
            <TrashIcon /> {deleting ? "Eliminazione..." : many ? `Elimina ${treks.length}` : "Elimina"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
