import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { TileLayer } from "react-leaflet";
import L from "leaflet";
import { LayersIcon } from "./icons";
import { TILE_MAX_ZOOM } from "./map";
import PoiLayer from "./PoiLayer";
import { POI_CATEGORIES, POI_MIN_ZOOM, type PoiCategoryId } from "./poi";

// Viste disponibili (tile gratuite, senza chiave). maxNativeZoom: oltre, Leaflet ingrandisce le tile
// dell'ultimo livello invece di mostrare la mappa vuota
type Base = {
  id: string;
  label: string;
  url: string;
  attribution: string;
  maxNativeZoom: number;
  subdomains?: string;
  labelsUrl?: string; // nomi e confini sopra (satellite)
};

const BASES: Base[] = [
  {
    id: "standard",
    label: "Standard",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
    maxNativeZoom: 19,
  },
  {
    id: "topo",
    label: "Topografica",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors, SRTM · stile &copy; OpenTopoMap (CC-BY-SA)",
    maxNativeZoom: 17,
  },
  {
    id: "satellite",
    label: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri, Maxar, Earthstar Geographics",
    maxNativeZoom: 18,
    labelsUrl: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
  },
  {
    id: "dark",
    label: "Scura",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    maxNativeZoom: 19,
    subdomains: "abcd",
  },
];

// sentieri segnati (CAI e simili), trasparente: si sovrappone a qualsiasi vista
const TRAILS = {
  url: "https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png",
  attribution: "sentieri &copy; waymarkedtrails.org",
  maxNativeZoom: 18,
};

// anteprima di ogni vista: la stessa tile sulle Dolomiti (zoom 9)
const thumbOf = (b: Base) =>
  b.url.replace("{s}", "a").replace("{z}", "9").replace("{x}", "272").replace("{y}", "181").replace("{r}", "");

// Scelta condivisa da tutte le mappe dell'app e ricordata nel browser
type Prefs = { base: string; trails: boolean; poi: PoiCategoryId[] };
const STORAGE_KEY = "gt-map-layers";

function load(): Prefs {
  try {
    const p = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<Prefs> | null;
    return {
      base: BASES.some((b) => b.id === p?.base) ? p!.base! : "standard",
      trails: p?.trails === true,
      poi: Array.isArray(p?.poi) ? p.poi.filter((id) => POI_CATEGORIES.some((c) => c.id === id)) : [],
    };
  } catch {
    return { base: "standard", trails: false, poi: [] };
  }
}

let prefs = load();
const listeners = new Set<() => void>();

function setPrefs(next: Partial<Prefs>) {
  prefs = { ...prefs, ...next };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // senza storage la scelta vale solo fino al ricaricamento
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

// Tile della vista scelta + selettore in alto a destra; da mettere dentro un <MapContainer>
export default function MapLayers() {
  const { base: baseId, trails, poi } = useSyncExternalStore(subscribe, () => prefs);
  const base = BASES.find((b) => b.id === baseId) ?? BASES[0];
  const [open, setOpen] = useState(false);

  // i click sul selettore non devono arrivare alla mappa (es. scelta del punto)
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!box.current) return;
    L.DomEvent.disableClickPropagation(box.current);
    L.DomEvent.disableScrollPropagation(box.current);
  }, []);

  // chiude il pannello cliccando fuori
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  return (
    <>
      <TileLayer
        key={base.id} // TileLayer non cambia url/opzioni dopo la creazione: si ricrea
        url={base.url}
        attribution={base.attribution}
        maxNativeZoom={base.maxNativeZoom}
        maxZoom={TILE_MAX_ZOOM}
        {...(base.subdomains ? { subdomains: base.subdomains } : {})}
      />
      {base.labelsUrl && <TileLayer key={`${base.id}-labels`} url={base.labelsUrl} maxNativeZoom={base.maxNativeZoom} maxZoom={TILE_MAX_ZOOM} />}
      {trails && <TileLayer url={TRAILS.url} attribution={TRAILS.attribution} maxNativeZoom={TRAILS.maxNativeZoom} maxZoom={TILE_MAX_ZOOM} />}

      <div ref={box} className="gt-layers">
        <button
          type="button"
          className="gt-layers-btn"
          onClick={() => setOpen((o) => !o)}
          title="Cambia vista della mappa"
          aria-label="Cambia vista della mappa"
          aria-expanded={open}
        >
          <LayersIcon size={18} />
        </button>
        {open && (
          <div className="gt-layers-panel" role="group" aria-label="Vista della mappa">
            <div className="gt-layers-grid">
              {BASES.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className={`gt-layers-opt ${b.id === base.id ? "is-active" : ""}`}
                  onClick={() => setPrefs({ base: b.id })}
                  aria-pressed={b.id === base.id}
                >
                  <img src={thumbOf(b)} alt="" loading="lazy" />
                  <span>{b.label}</span>
                </button>
              ))}
            </div>
            <label className="gt-layers-toggle">
              <input type="checkbox" checked={trails} onChange={(e) => setPrefs({ trails: e.target.checked })} />
              Sentieri segnati
            </label>
            <div className="gt-layers-poi" role="group" aria-label="Punti di interesse">
              <span className="gt-layers-title" title={`Dati OpenStreetMap, visibili da zoom ${POI_MIN_ZOOM}`}>Punti di interesse</span>
              {POI_CATEGORIES.map((c) => (
                <label key={c.id} className="gt-layers-toggle">
                  <input
                    type="checkbox"
                    checked={poi.includes(c.id)}
                    onChange={(e) => setPrefs({ poi: e.target.checked ? [...poi, c.id] : poi.filter((id) => id !== c.id) })}
                  />
                  <span aria-hidden="true">{c.icon}</span> {c.label}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <PoiLayer categories={poi} />
    </>
  );
}
