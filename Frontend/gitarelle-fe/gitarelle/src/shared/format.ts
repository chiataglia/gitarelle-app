export function formatDate(iso?: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("it-IT", opts);
}

// "12,4 km" (da metri)
export function formatKm(meters: number) {
  return `${(meters / 1000).toLocaleString("it-IT", { maximumFractionDigits: 1 })} km`;
}

// "3 h 15 min" (da minuti); di default arrotondato ai 5 minuti come sui cartelli dei sentieri,
// step = 1 per i tempi registrati dal gps
export function formatDuration(minutes: number, step = 5) {
  const total = Math.max(step, Math.round(minutes / step) * step);
  const h = Math.floor(total / 60), m = total % 60;
  return h ? (m ? `${h} h ${m} min` : `${h} h`) : `${m} min`;
}

// tempo di una traccia (vedi trackDuration): registrato al minuto; la stima ai 5 minuti e con "≈" davanti
export const formatTrackDuration = (d: { minutes: number; recorded: boolean }) =>
  d.recorded ? formatDuration(d.minutes, 1) : `≈ ${formatDuration(d.minutes)}`;

export const trackDurationLabel = (d: { recorded: boolean }) =>
  d.recorded ? "Tempo in movimento registrato nel GPX (soste escluse)" : "Tempo di percorrenza stimato (DIN 33466, soste escluse)";

// "820 m" (dislivello positivo, da metri)
export function formatGain(meters: number) {
  return `${Math.round(meters).toLocaleString("it-IT")} m`;
}
