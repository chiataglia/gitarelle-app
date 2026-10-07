import { useEffect, useRef, type ReactNode } from "react";
import styles from "./Modal.module.css";

type Props = {
  title: string;
  onClose: () => void;  // Esc, click fuori o ✕
  children: ReactNode;
  wide?: boolean;
};

// Finestra modale basata su <dialog>: si apre quando viene montata, si chiude smontandola
export default function Modal({ title, onClose, children, wide }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className={`${styles.dialog} ${wide ? styles.wide : ""}`}
      aria-label={title}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === ref.current) onClose(); }} // click sullo sfondo
    >
      <div className={styles.inner}>
        <header className={styles.header}>
          <h3>{title}</h3>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Chiudi">✕</button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
