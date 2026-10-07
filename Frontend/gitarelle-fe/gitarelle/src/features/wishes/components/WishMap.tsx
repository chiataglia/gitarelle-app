import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from "react-leaflet";
import L, { type LatLngLiteral } from "leaflet";
import { TILE_ATTRIBUTION, TILE_MAX_ZOOM, TILE_URL, pinIconFor } from "../../../shared/map";
import type { ParsedGpx } from "../../../shared/gpx";
import TrackLayer from "../../../shared/TrackLayer";
import { WISH_COLOR, WISH_FOCUS_COLOR } from "../theme";

export type WishMapItem = {
  id: number;
  name: string;
  gpx: ParsedGpx | null;
  point: LatLngLiteral | null;
};

type Props = {
  items: WishMapItem[];
  selectedId: number | null;
  onSelect: (id: number) => void;
};

// senza selezione inquadra tutte le idee (quando cambia ciò che è sulla mappa)
function FitAll({ items, active }: { items: WishMapItem[]; active: boolean }) {
  const map = useMap();
  const shown = items.filter((i) => i.gpx?.bounds || i.point);
  const shownKey = shown.map((i) => `${i.id}:${i.gpx ? "g" : "p"}`).join(",");
  useEffect(() => {
    if (!active) return;
    const bounds = L.latLngBounds([]);
    for (const i of shown) {
      if (i.gpx?.bounds) bounds.extend(i.gpx.bounds);
      else if (i.point) bounds.extend(i.point);
    }
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
  }, [map, shownKey, active]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

// con un'idea selezionata ci vola sopra
function Focus({ item }: { item: WishMapItem }) {
  const map = useMap();
  const bounds = item.gpx?.bounds ?? null;
  const point = item.point;
  useEffect(() => {
    if (bounds) map.flyToBounds(bounds, { padding: [40, 40], duration: 0.8 });
    else if (point) map.flyTo(point, Math.max(map.getZoom(), 13), { duration: 0.8 });
  }, [map, item.id, bounds, point?.lat, point?.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

// Mappa panoramica di tutte le idee: tracce tratteggiate (percorsi ancora da fare) e pin
export default function WishMap({ items, selectedId, onSelect }: Props) {
  const selected = items.find((i) => i.id === selectedId) ?? null;
  return (
    <MapContainer center={[42.5, 12.5]} zoom={6} maxZoom={TILE_MAX_ZOOM} style={{ height: "100%", width: "100%" }}>
      <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} maxZoom={TILE_MAX_ZOOM} />
      {items.map((i) => {
        const color = i.id === selectedId ? WISH_FOCUS_COLOR : WISH_COLOR;
        if (i.gpx) {
          return (
            <TrackLayer key={i.id} gpx={i.gpx} trackKey={String(i.id)} color={color} label={i.name} fit={false} dashed onClick={() => onSelect(i.id)} />
          );
        }
        if (i.point) {
          return (
            <Marker key={`${i.id}-${color}`} position={i.point} icon={pinIconFor(color)} eventHandlers={{ click: () => onSelect(i.id) }}>
              <Tooltip direction="top" offset={[0, -30]}>{i.name}</Tooltip>
            </Marker>
          );
        }
        return null;
      })}
      <FitAll items={items} active={selected == null} />
      {selected && <Focus item={selected} />}
    </MapContainer>
  );
}
