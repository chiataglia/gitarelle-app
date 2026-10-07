import L from "leaflet";

export const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
export const TILE_ATTRIBUTION = "&copy; OpenStreetMap contributors";
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
