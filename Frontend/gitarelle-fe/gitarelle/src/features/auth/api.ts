import { ApiError, apiFetch, apiJson } from "../../shared/api";

// Utente collegato, con i dati del profilo
export type User = {
  id: number;
  username: string;
  firstName: string | null;
  lastName: string | null;
  avatarVersion: number | null; // null = nessun avatar; cambia a ogni nuova immagine
  createdAt: string;
};

// "Mario Rossi", oppure lo username se nome e cognome mancano
export const displayName = (u: User) => [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username;

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

// utente della sessione corrente, null se non c'è una sessione valida
export async function fetchMe(): Promise<User | null> {
  try {
    return await apiJson<User>("/auth/me");
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null;
    throw e;
  }
}

export const login = (username: string, password: string) => apiJson<User>("/auth/login", json({ username, password }));

export const register = (username: string, password: string) => apiJson<User>("/auth/register", json({ username, password }));

export const logout = () => apiFetch("/auth/logout", { method: "POST" }).then(() => undefined);
