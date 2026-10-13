import type { Trek } from "./types";

// Trascinamento dei trek dalla lista dello storico alle cartelle: il dato trasportato sono gli id dei trek
const MIME = "application/x-gitarelle-treks";

export function startTrekDrag(e: React.DragEvent, ids: Trek["id"][], label: string) {
  e.dataTransfer.setData(MIME, JSON.stringify(ids));
  e.dataTransfer.effectAllowed = "copy";

  // immagine che segue il mouse: un'etichetta col numero di escursioni invece della card intera
  const ghost = document.createElement("div");
  ghost.textContent = label;
  ghost.className = "trek-drag-ghost";
  document.body.appendChild(ghost);
  e.dataTransfer.setDragImage(ghost, 16, 16);
  setTimeout(() => ghost.remove(), 0);
}

// durante il trascinamento i dati non sono leggibili (solo al rilascio): si guarda solo il tipo
export const isTrekDrag = (e: React.DragEvent) => e.dataTransfer.types.includes(MIME);

export function readTrekDrag(e: React.DragEvent): Trek["id"][] {
  try {
    const ids: unknown = JSON.parse(e.dataTransfer.getData(MIME));
    return Array.isArray(ids) ? ids.filter((id): id is Trek["id"] => typeof id === "number" || typeof id === "string") : [];
  } catch {
    return [];
  }
}
