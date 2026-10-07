import { apiFetch, apiJson } from "../../shared/api";
import type { Folder, Trek, TrekPayload } from "./types";

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

// i trek della cartella restano, senza cartella
export const deleteFolder = (id: Folder["id"]) =>
  apiFetch(`/folders/${id}`, { method: "DELETE" }).then(() => undefined);

export const createTrek = (payload: TrekPayload) => apiJson<Trek>("/treks", json(payload));

// sostituisce tutti i campi del trek (il gpx resta com'è)
export const updateTrek = (trekId: Trek["id"], payload: TrekPayload) =>
  apiJson<Trek>(`/treks/${trekId}`, { ...json(payload), method: "PUT" });

// elimina il trek e l'eventuale gpx
export const deleteTrek = (trekId: Trek["id"]) =>
  apiFetch(`/treks/${trekId}`, { method: "DELETE" }).then(() => undefined);

export const updateTrekLocation = (trekId: Trek["id"], lat: number, lon: number) =>
  apiJson<Trek>(`/treks/${trekId}/location`, { ...json({ lat, lon }), method: "PUT" });

export function uploadGpx(trekId: Trek["id"], file: File, title?: string) {
  const formData = new FormData();
  formData.append("file", file);
  if (title?.trim()) formData.append("title", title.trim());
  return apiJson<Trek>(`/treks/${trekId}/gpx`, { method: "POST", body: formData });
}

export function createTrekWithGpx(payload: TrekPayload, file: File, gpxTitle?: string) {
  const formData = new FormData();
  formData.append("trek", new Blob([JSON.stringify(payload)], { type: "application/json" }));
  formData.append("file", file);
  if (gpxTitle?.trim()) formData.append("gpxTitle", gpxTitle.trim());
  return apiJson<Trek>("/treks/with-gpx", { method: "POST", body: formData });
}

export async function fetchGpxText(trekId: Trek["id"], signal?: AbortSignal) {
  const res = await apiFetch(`/treks/${trekId}/gpx`, { signal });
  return res.text();
}
