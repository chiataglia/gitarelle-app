import L from "leaflet";

// le tile (vista standard, topografica, satellite...) sono in MapLayers
export const TILE_MAX_ZOOM = 19;

// Pin a goccia nel colore accento (stile in index.css → .gt-pin)
export const pinIcon = L.divIcon({
  className: "gt-pin",
  html: "<span></span>",
  iconSize: [28, 28],
  iconAnchor: [14, 34],
});

export const TRACK_COLOR = "#f2a541";

// Colori per più tracce sulla stessa mappa: ben distinguibili sulle tile OSM
export const TRACK_PALETTE = [
  "#f2a541", // ambra (accento)
  "#e5484d", // rosso
  "#3e8ef7", // blu
  "#8e4ec6", // viola
  "#12a594", // turchese
  "#d6409f", // fucsia
  "#a15c2a", // marrone
  "#1d3557", // blu notte
];

// colore fisso per elemento (dall'id): togliendone o aggiungendone uno gli altri non cambiano colore
export function colorForId(id: string | number) {
  let h = 0;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TRACK_PALETTE[h % TRACK_PALETTE.length];
}

// colore della traccia di un trek: quello scelto dall'utente o, se manca, quello automatico dall'id
export function trekColor(t: { id: string | number; color?: string | null }) {
  return t.color ?? colorForId(t.id);
}

// Stesso colore più scuro (es. contorno delle tracce): amount 0..1 verso il nero
export function darken(hex: string, amount = 0.35) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift: number) => Math.round(((n >> shift) & 0xff) * (1 - amount));
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, "0")}`;
}

// Pin a goccia di un colore qualsiasi (un'icona per colore, riusata)
const coloredPins = new Map<string, L.DivIcon>();
export function pinIconFor(color: string) {
  let icon = coloredPins.get(color);
  if (!icon) {
    icon = L.divIcon({
      className: "gt-pin",
      html: `<span style="background:${color}"></span>`,
      iconSize: [28, 28],
      iconAnchor: [14, 34],
    });
    coloredPins.set(color, icon);
  }
  return icon;
}

// Stesso pin con un "+" accanto (aggiunta alla cartella dalla mappa dello storico): chi gestisce il click
// del marker riconosce il "+" dal bersaglio, con isPinAddClick
const addPins = new Map<string, L.DivIcon>();
export function pinAddIconFor(color: string) {
  let icon = addPins.get(color);
  if (!icon) {
    icon = L.divIcon({
      className: "gt-pin",
      html: `<span style="background:${color}"></span><b class="gt-pin-add" title="Aggiungi alla cartella">+</b>`,
      iconSize: [28, 28],
      iconAnchor: [14, 34],
    });
    addPins.set(color, icon);
  }
  return icon;
}

export const isPinAddClick = (e: L.LeafletMouseEvent) =>
  (e.originalEvent.target as HTMLElement | null)?.closest(".gt-pin-add") != null;

// Italia intera, isole comprese
export const ITALY_BOUNDS = L.latLngBounds([36.6, 6.6], [47.1, 18.6]);

// Centro e zoom per vedere l'Italia. fitBounds arrotonda lo zoom per difetto (a scatti interi) e
// su molte finestre si vedeva mezza Europa: qui si arrotonda al più vicino, a costo di tagliare un filo i bordi
export function italyView(map: L.Map): { center: L.LatLng; zoom: number } {
  const size = map.getSize();
  const nw = map.project(ITALY_BOUNDS.getNorthWest(), 0);
  const se = map.project(ITALY_BOUNDS.getSouthEast(), 0);
  const scale = Math.min(size.x / (se.x - nw.x), size.y / (se.y - nw.y));
  return { center: ITALY_BOUNDS.getCenter(), zoom: Math.round(map.getScaleZoom(scale, 0)) };
}
