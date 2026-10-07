import { useState } from "react";
import { useAuth } from "./AuthContext";
import { errorMessage } from "../../shared/api";
import BrandMark from "../../shared/BrandMark";
import styles from "./Auth.module.css";

type Mode = "login" | "register";

// Schermata di accesso / registrazione, mostrata finché non c'è una sessione valida
export default function AuthScreen() {
  const { login, register, startupError, retry } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRegister = mode === "register";
  const mismatch = isRegister && confirm.length > 0 && confirm !== password;
  const canSubmit = username.trim().length > 0 && password.length > 0 && (!isRegister || (confirm === password && password.length >= 8));

  function changeMode(m: Mode) {
    setMode(m);
    setError(null);
    setConfirm("");
  }

  async function onSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      setBusy(true);
      setError(null);
      if (isRegister) await register(username.trim(), password);
      else await login(username.trim(), password);
      // al successo questo componente viene smontato: niente altro da fare
    } catch (err) {
      setError(errorMessage(err, isRegister ? "Registrazione non riuscita" : "Accesso non riuscito"));
      setBusy(false);
    }
  }

  return (
    <div className={styles.screen}>
      <div className={styles.panel}>
        <div className={styles.brand}>
          <BrandMark size={40} />
          <span>Gitarelle</span>
        </div>
        <p className={styles.tagline}>Il tuo diario di escursioni, e quelle ancora da fare.</p>

        <div className={`card ${styles.card}`}>
          <div className={styles.segmented} role="tablist" aria-label="Accedi o crea un account">
            <button type="button" role="tab" aria-selected={!isRegister} className={!isRegister ? styles.segActive : ""} onClick={() => changeMode("login")}>
              Accedi
            </button>
            <button type="button" role="tab" aria-selected={isRegister} className={isRegister ? styles.segActive : ""} onClick={() => changeMode("register")}>
              Crea account
            </button>
          </div>

          {startupError && (
            <div className={`alert alert-error ${styles.startup}`}>
              {startupError}
              <button type="button" className="btn btn-ghost btn-sm" onClick={retry}>Riprova</button>
            </div>
          )}

          <form onSubmit={onSubmit} className={styles.form}>
            <label className="field">
              <span>Username</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={30}
                placeholder={isRegister ? "3-30 caratteri: lettere, numeri, . _ -" : ""}
                required
                autoFocus
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isRegister ? "new-password" : "current-password"}
                maxLength={72}
                placeholder={isRegister ? "Almeno 8 caratteri" : ""}
                required
              />
            </label>
            {isRegister && (
              <label className="field">
                <span>Conferma password</span>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  maxLength={72}
                  aria-invalid={mismatch}
                  required
                />
                {mismatch && <small className={styles.hint}>Le password non coincidono</small>}
              </label>
            )}

            {error && <div className="alert alert-error">{error}</div>}

            <button type="submit" className="btn btn-primary" disabled={busy || !canSubmit}>
              {busy ? "Attendi..." : isRegister ? "Crea account" : "Accedi"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
