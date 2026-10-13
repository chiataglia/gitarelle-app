import { useEffect, useRef, type ReactNode } from "react";
import styles from "./Modal.module.css";

type Props = {
  title: string;
  onClose: () => void;  // Esc, click fuori o ✕
  children: ReactNode;
  wide?: boolean;
  xl?: boolean;        // ancora più largo, per mappe grandi
  heading?: ReactNode; // al posto del titolo semplice (es. titolo modificabile); title resta per gli screen reader
  actions?: ReactNode; // pulsanti a icona accanto alla ✕ (usare la classe modal-icon-btn per lo stesso aspetto)
};

// Finestra modale basata su <dialog>: si apre quando viene montata, si chiude smontandola
export default function Modal({ title, onClose, children, wide, xl, heading, actions }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className={`${styles.dialog} ${wide ? styles.wide : ""} ${xl ? styles.xl : ""}`}
      aria-label={title}
      // Esc: React fa risalire l'evento anche ai dialog che contengono questo (modale sopra modale):
      // si chiude solo quello in cima, che è il bersaglio
      onCancel={(e) => { e.preventDefault(); if (e.target === ref.current) onClose(); }}
      onClick={(e) => { if (e.target === ref.current) onClose(); }} // click sullo sfondo
    >
      <div className={styles.inner}>
        <header className={styles.header}>
          {heading ?? <h3>{title}</h3>}
          <div className={styles.headerActions}>
            {actions}
            <button type="button" className={`modal-icon-btn ${styles.close}`} onClick={onClose} aria-label="Chiudi" title="Chiudi">✕</button>
          </div>
        </header>
        {children}
      </div>
    </dialog>
  );
}
