import type { ReactNode } from "react";
import { useAuth } from "./AuthContext";
import AuthScreen from "./AuthScreen";
import BrandMark from "../../shared/BrandMark";
import styles from "./Auth.module.css";

// Mostra l'app solo con una sessione valida. Al logout i figli vengono smontati,
// così i dati dell'utente precedente (trek, cartelle, idee) non restano in memoria.
export default function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAuth();

  if (status === "checking") {
    return (
      <div className={styles.screen} aria-busy="true">
        <div className={styles.splash}>
          <BrandMark size={44} />
          <span>Caricamento...</span>
        </div>
      </div>
    );
  }
  if (status === "anonymous") return <AuthScreen />;
  return <>{children}</>;
}
