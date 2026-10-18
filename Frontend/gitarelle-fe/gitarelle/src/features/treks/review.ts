import type { Trek, TrekReview } from "./types";

// valutazione vuota (nuovo trek) e valutazione attuale di un trek, da modificare con ReviewFields
export const EMPTY_REVIEW: TrekReview = {
  rating: null, effort: null, scenery: null, effortLabel: null, sceneryLabel: null, dangerous: null, tags: [], notes: "",
};

export const reviewOf = (t: Trek): TrekReview => ({
  rating: t.rating,
  effort: t.effort,
  scenery: t.scenery,
  effortLabel: t.effortLabel,
  sceneryLabel: t.sceneryLabel,
  dangerous: t.dangerous,
  tags: t.tags ?? [],
  notes: t.notes ?? "",
});

// niente da salvare (alla creazione il trek nasce allora senza valutazione)
export const isReviewEmpty = (r: TrekReview) =>
  r.rating == null && r.effort == null && r.scenery == null && r.dangerous !== true && r.tags.length === 0 && !r.notes.trim();

// voti di fatica e paesaggio: da 1 a 10
export const SCALE_MAX = 10;

// significato dei voti a coppie (1–2, 3–4, ... 9–10), mostrato sotto le scale e nella scheda
const EFFORT_LABELS = ["Passeggiata", "Facile", "Impegnativa", "Faticosa", "Durissima"];
const SCENERY_LABELS = ["Anonimo", "Carino", "Bello", "Molto bello", "Spettacolare"];
const labelOf = (labels: string[], value: number) => labels[Math.ceil(value / 2) - 1] ?? "";
export const effortLabel = (value: number) => labelOf(EFFORT_LABELS, value);
export const sceneryLabel = (value: number) => labelOf(SCENERY_LABELS, value);

// scritta da mostrare per il voto di un trek: quella scelta dall'utente o, se manca, quella automatica
export const effortText = (t: Pick<Trek, "effort" | "effortLabel">) =>
  t.effort == null ? "" : t.effortLabel ?? effortLabel(t.effort);
export const sceneryText = (t: Pick<Trek, "scenery" | "sceneryLabel">) =>
  t.scenery == null ? "" : t.sceneryLabel ?? sceneryLabel(t.scenery);

// etichette che si possono dare a un trek, a gruppi; si salva il testo così com'è
export const TAG_GROUPS: { name: string; tags: string[] }[] = [
  { name: "Ambiente", tags: ["Lago", "Fiume", "Cascata", "Mare", "Bosco", "Prato", "Roccia", "Cresta", "Neve", "Ghiacciaio"] },
  { name: "Fondo", tags: ["Sentiero", "Sterrato", "Asfalto", "Pietraia", "Ferrata"] },
  { name: "Soste", tags: ["Rifugio", "Malga", "Ristorante", "Bivacco", "Fontana"] },
];

// "4,5"
export const formatRating = (rating: number) => rating.toLocaleString("it-IT", { maximumFractionDigits: 1 });

export const hasReview = (t: Trek) =>
  t.rating != null || t.effort != null || t.scenery != null || t.dangerous === true || t.tags?.length > 0 || !!t.notes?.trim();
