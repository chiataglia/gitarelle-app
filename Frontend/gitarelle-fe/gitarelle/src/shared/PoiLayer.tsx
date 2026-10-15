import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import {
  POI_CATEGORIES, POI_MIN_ZOOM, cachedPois, cellsIn, poiStatus, poiVersion, requestCells, subscribePoi,
  type Bbox, type Poi, type PoiCategory, type PoiCategoryId,
} from "./poi";

const DEBOUNCE_MS = 500; // si chiede solo quando la mappa si è fermata

const CATEGORY = new Map(POI_CATEGORIES.map((c) => [c.id, c]));

// un'icona per categoria, riusata (stile in index.css → .gt-poi)
const icons = new Map<PoiCategoryId, L.DivIcon>();
function iconFor(c: PoiCategory) {
  let icon = icons.get(c.id);
  if (!icon) {
    icon = L.divIcon({ className: "gt-poi", html: `<span>${c.icon}</span>`, iconSize: [24, 24] });
    icons.set(c.id, icon);
  }
  return icon;
}

// "it:Monte Rosa" → link alla voce
function wikipediaUrl(tag?: string) {
  const m = tag?.match(/^([a-z-]+):(.+)$/);
  return m ? `https://${m[1]}.wikipedia.org/wiki/${encodeURIComponent(m[2].replace(/ /g, "_"))}` : null;
}

function PoiPopup({ poi, category }: { poi: Poi; category: PoiCategory }) {
  const t = poi.tags;
  const wiki = wikipediaUrl(t.wikipedia);
  const website = t.website ?? t["contact:website"];
  return (
    <div className="gt-poi-popup">
      <strong>{t.name ?? category.label}</strong>
      <span className="gt-poi-meta">
        {category.icon} {category.label}
        {t.ele && ` · ${Math.round(Number(t.ele)) || t.ele} m`}
      </span>
      {t.operator && <span className="gt-poi-meta">Gestito da {t.operator}</span>}
      {t.capacity && <span className="gt-poi-meta">{t.capacity} posti letto</span>}
      <span className="gt-poi-links">
        {website && <a href={website} target="_blank" rel="noopener noreferrer">Sito</a>}
        {wiki && <a href={wiki} target="_blank" rel="noopener noreferrer">Wikipedia</a>}
        <a href={`https://www.openstreetmap.org/${poi.key}`} target="_blank" rel="noopener noreferrer">OpenStreetMap</a>
      </span>
    </div>
  );
}

type View = { bbox: Bbox; zoom: number };

function viewOf(map: L.Map): View {
  const b = map.getBounds();
  return { bbox: { south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() }, zoom: map.getZoom() };
}

// Punti di interesse OpenStreetMap delle categorie attive, da POI_MIN_ZOOM in su. Dentro un <MapContainer>
export default function PoiLayer({ categories }: { categories: PoiCategoryId[] }) {
  const map = useMap();
  const [view, setView] = useState<View>(() => viewOf(map));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useMapEvents({
    moveend: () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setView(viewOf(map)), DEBOUNCE_MS);
    },
  });
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const version = useSyncExternalStore(subscribePoi, poiVersion);
  const status = useSyncExternalStore(subscribePoi, poiStatus);

  const active = categories.length > 0 && view.zoom >= POI_MIN_ZOOM;
  const cells = useMemo(() => (active ? cellsIn(view.bbox) : []), [active, view.bbox]);

  useEffect(() => {
    if (cells.length) requestCells(cells);
  }, [cells]);

  const pois = useMemo(() => {
    if (!cells.length) return [];
    const wanted = new Set(categories);
    const { south, west, north, east } = view.bbox;
    return cachedPois(cells).filter((p) => wanted.has(p.cat) && p.lat >= south && p.lat <= north && p.lng >= west && p.lng <= east);
  }, [cells, categories, view.bbox, version]); // eslint-disable-line react-hooks/exhaustive-deps

  if (categories.length === 0) return null;

  const hint =
    view.zoom < POI_MIN_ZOOM ? "Avvicinati per vedere i punti di interesse"
    : status === "loading" ? "Carico i punti di interesse…"
    : status === "limited" ? "Punti di interesse non disponibili, riprovo tra poco"
    : status === "error" ? "Errore nei punti di interesse, riprovo tra poco"
    : null;

  return (
    <>
      {active && pois.map((p) => {
        const category = CATEGORY.get(p.cat)!;
        return (
          <Marker key={p.key} position={[p.lat, p.lng]} icon={iconFor(category)} title={p.tags.name ?? category.label}>
            <Popup>
              <PoiPopup poi={p} category={category} />
            </Popup>
          </Marker>
        );
      })}
      {hint && <div className="gt-poi-status">{hint}</div>}
    </>
  );
}
