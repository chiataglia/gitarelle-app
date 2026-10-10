import { apiFetch, apiJson } from "../../shared/api";
import type { Wish, WishPayload } from "./types";

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const fetchWishes = () => apiJson<Wish[]>("/wishes");

export const createWish = (payload: WishPayload) => apiJson<Wish>("/wishes", json("POST", payload));

export const updateWish = (id: Wish["id"], payload: WishPayload) =>
  apiJson<Wish>(`/wishes/${id}`, json("PUT", payload));

// elimina il tour e l'eventuale gpx
export const deleteWish = (id: Wish["id"]) =>
  apiFetch(`/wishes/${id}`, { method: "DELETE" }).then(() => undefined);

export async function fetchWishGpxText(id: Wish["id"] | string, signal?: AbortSignal) {
  const res = await apiFetch(`/wishes/${id}/gpx`, { signal });
  return res.text();
}

// carica o sostituisce la traccia
export function saveWishGpx(id: Wish["id"], file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return apiJson<Wish>(`/wishes/${id}/gpx`, { method: "PUT", body: formData });
}

export const deleteWishGpx = (id: Wish["id"]) => apiJson<Wish>(`/wishes/${id}/gpx`, { method: "DELETE" });
