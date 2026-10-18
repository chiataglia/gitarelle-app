import { apiFetch, apiJson } from "../../shared/api";
import type { Folder, Trek, TrekPayload, TrekReview } from "./types";

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const fetchTreks = () => apiJson<Trek[]>("/treks");

// ---------- cartelle ----------
export const fetchFolders = () => apiJson<Folder[]>("/folders");

export const createFolder = (name: string) => apiJson<Folder>("/folders", json({ name }));

export const renameFolder = (id: Folder["id"], name: string) =>
  apiJson<Folder>(`/folders/${id}`, { ...json({ name }), method: "PUT" });

// i trek della cartella restano (nelle altre cartelle o senza)
export const deleteFolder = (id: Folder["id"]) =>
  apiFetch(`/folders/${id}`, { method: "DELETE" }).then(() => undefined);

// aggiunge i trek alla cartella (quelli già dentro restano): restituisce i trek aggiornati
export const addTreksToFolder = (id: Folder["id"], trekIds: Trek["id"][]) =>
  apiJson<Trek[]>(`/folders/${id}/treks`, json({ trekIds }));

// stesso colore (null = automatico) per le tracce di tutti i trek della cartella: restituisce i trek aggiornati
export const colorFolderTreks = (id: Folder["id"], color: string | null) =>
  apiJson<Trek[]>(`/folders/${id}/color`, { ...json({ color }), method: "PUT" });

export const createTrek =(payload: TrekPayload) => apiJson<Trek>("/treks", json(payload));

// sostituisce tutti i campi del trek (il gpx resta com'è)
export const updateTrek = (trekId: Trek["id"], payload: TrekPayload) =>
  apiJson<Trek>(`/treks/${trekId}`, { ...json(payload), method: "PUT" });

// elimina il trek e l'eventuale gpx
export const deleteTrek = (trekId: Trek["id"]) =>
  apiFetch(`/treks/${trekId}`, { method: "DELETE" }).then(() => undefined);

// elimina più trek (e i loro gpx) in una volta: tutti o nessuno
export const deleteTreks = (trekIds: Trek["id"][]) =>
  apiFetch("/treks/delete", json({ trekIds })).then(() => undefined);

export const updateTrekLocation = (trekId: Trek["id"], lat: number, lon: number) =>
  apiJson<Trek>(`/treks/${trekId}/location`, { ...json({ lat, lon }), method: "PUT" });

// colore della traccia (null = automatico)
export const updateTrekColor = (trekId: Trek["id"], color: string | null) =>
  apiJson<Trek>(`/treks/${trekId}/color`, { ...json({ color }), method: "PUT" });

// valutazione: stelle, fatica, paesaggio, tratti pericolosi e recensione (le note)
export const updateTrekReview = (trekId: Trek["id"], review: TrekReview) =>
  apiJson<Trek>(`/treks/${trekId}/review`, { ...json(review), method: "PUT" });

export function uploadGpx(trekId: Trek["id"], file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return apiJson<Trek>(`/treks/${trekId}/gpx`, { method: "POST", body: formData });
}

export function createTrekWithGpx(payload: TrekPayload, file: File) {
  const formData = new FormData();
  formData.append("trek", new Blob([JSON.stringify(payload)], { type: "application/json" }));
  formData.append("file", file);
  return apiJson<Trek>("/treks/with-gpx", { method: "POST", body: formData });
}

export async function fetchGpxText(trekId: Trek["id"], signal?: AbortSignal) {
  const res = await apiFetch(`/treks/${trekId}/gpx`, { signal });
  return res.text();
}
