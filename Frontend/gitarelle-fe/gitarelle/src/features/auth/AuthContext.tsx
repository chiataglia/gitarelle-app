import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import * as authApi from "./api";
import type { User } from "./api";
import { errorMessage, setUnauthorizedHandler } from "../../shared/api";

// "checking": all'avvio si chiede al backend se c'è già una sessione (cookie) valida
type Status = "checking" | "anonymous" | "authenticated";

type AuthContextValue = {
  status: Status;
  user: User | null;
  startupError: string | null; // es. backend spento al primo controllo
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  retry: () => void;
  updateUser: (user: User) => void; // dopo una modifica del profilo
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>("checking");
  const [startupError, setStartupError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    authApi.fetchMe()
      .then((me) => {
        if (cancelled) return;
        setUser(me);
        setStatus(me ? "authenticated" : "anonymous");
      })
      .catch((e) => {
        if (cancelled) return;
        setStartupError(errorMessage(e, "Impossibile verificare la sessione"));
        setStatus("anonymous");
      });
    return () => { cancelled = true; };
  }, [attempt]);

  // sessione scaduta mentre si usa l'app (qualsiasi API risponde 401) → di nuovo al login
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setStatus("anonymous");
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const me = await authApi.login(username, password);
    setStartupError(null);
    setUser(me);
    setStatus("authenticated");
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    const me = await authApi.register(username, password);
    setStartupError(null);
    setUser(me);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      // anche se il server non risponde, lato app si esce comunque
      setUser(null);
      setStatus("anonymous");
    }
  }, []);

  const retry = useCallback(() => {
    setStartupError(null);
    setStatus("checking");
    setAttempt((n) => n + 1);
  }, []);

  return (
    <AuthContext.Provider value={{ status, user, startupError, login, register, logout, retry, updateUser: setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth va usato dentro <AuthProvider>");
  return ctx;
}
