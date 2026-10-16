import type { Trek } from "./types";

// Filtri dello storico, da combinare con la cartella. Range vuoti = nessun limite
export type TrekFilterState = {
  region: string | null;
  friends: string[];   // almeno uno di questi amici
  year: number | null;
  gainMin: number | null; gainMax: number | null; // metri
  distMin: number | null; distMax: number | null; // km
};

export const NO_FILTERS: TrekFilterState = {
  region: null, friends: [], year: null, gainMin: null, gainMax: null, distMin: null, distMax: null,
};

// "Marco, Giulia e Luca" → ["Marco", "Giulia", "Luca"]
export function friendsOf(t: Trek): string[] {
  return (t.amichetti ?? "")
    .split(/,|;|&|\+|\s+e\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

export const yearOf = (t: Trek) => (t.trekDate ? Number(t.trekDate.slice(0, 4)) : null);

const inRange = (v: number | null, min: number | null, max: number | null) =>
  (min == null && max == null) || (v != null && (min == null || v >= min) && (max == null || v <= max));

export function applyTrekFilters(treks: Trek[], f: TrekFilterState): Trek[] {
  const friends = f.friends.map((x) => x.toLowerCase());
  return treks.filter((t) =>
    (f.region == null || t.region === f.region) &&
    (f.year == null || yearOf(t) === f.year) &&
    (friends.length === 0 || friendsOf(t).some((x) => friends.includes(x.toLowerCase()))) &&
    inRange(t.elevationGainMeters, f.gainMin, f.gainMax) &&
    inRange(t.distanceMeters != null ? t.distanceMeters / 1000 : null, f.distMin, f.distMax));
}

// voci brevi dei filtri attivi, per il sottotitolo dello storico
export function filterLabels(f: TrekFilterState): string[] {
  const range = (min: number | null, max: number | null, unit: string) =>
    min != null && max != null ? `${min}–${max} ${unit}` : min != null ? `≥ ${min} ${unit}` : `≤ ${max} ${unit}`;
  return [
    f.region,
    f.friends.length > 0 && `con ${f.friends.join(", ")}`,
    f.year != null && String(f.year),
    (f.gainMin != null || f.gainMax != null) && `D+ ${range(f.gainMin, f.gainMax, "m")}`,
    (f.distMin != null || f.distMax != null) && range(f.distMin, f.distMax, "km"),
  ].filter((x): x is string => Boolean(x));
}
