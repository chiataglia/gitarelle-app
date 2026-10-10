export function formatDate(iso?: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("it-IT", opts);
}

// "12,4 km" (da metri)
export function formatKm(meters: number) {
  return `${(meters / 1000).toLocaleString("it-IT", { maximumFractionDigits: 1 })} km`;
}

// "820 m" (dislivello positivo, da metri)
export function formatGain(meters: number) {
  return `${Math.round(meters).toLocaleString("it-IT")} m`;
}
