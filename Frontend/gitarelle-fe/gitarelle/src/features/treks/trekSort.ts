import type { Trek } from "./types";

// Ordinamento dello storico (lista accanto alla mappa ed elenco)
export type TrekSortKey = "created" | "date" | "title" | "gain" | "distance" | "effort" | "scenery" | "rating";
export type TrekSort = { key: TrekSortKey; desc: boolean };

// verso iniziale di ogni voce: quello più utile (più recenti, A→Z, più alti in cima)
export const SORT_OPTIONS: { key: TrekSortKey; label: string; desc: boolean }[] = [
  { key: "date", label: "Data del trek", desc: true },
  { key: "created", label: "Data di inserimento", desc: true },
  { key: "title", label: "Nome (A–Z)", desc: false },
  { key: "gain", label: "Dislivello", desc: true },
  { key: "distance", label: "Distanza", desc: true },
  { key: "effort", label: "Fatica", desc: true },
  { key: "scenery", label: "Paesaggio", desc: true },
  { key: "rating", label: "Voto", desc: true },
];

export const DEFAULT_SORT: TrekSort = { key: "date", desc: true };

const sortValue = (t: Trek, key: TrekSortKey): string | number | null => {
  switch (key) {
    case "created": return t.createdAt;
    case "date": return t.trekDate ?? null;
    case "title": return t.title.toLocaleLowerCase("it-IT");
    case "gain": return t.elevationGainMeters;
    case "distance": return t.distanceMeters;
    case "effort": return t.effort;
    case "scenery": return t.scenery;
    case "rating": return t.rating;
  }
};

// i trek senza il dato (es. senza gpx, senza voto) finiscono sempre in fondo, in qualunque verso
export function sortTreks(treks: Trek[], sort: TrekSort): Trek[] {
  return [...treks].sort((a, b) => {
    const va = sortValue(a, sort.key);
    const vb = sortValue(b, sort.key);
    if (va == null || vb == null) return va == null ? (vb == null ? 0 : 1) : -1;
    const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "it-IT");
    return sort.desc ? -cmp : cmp;
  });
}
