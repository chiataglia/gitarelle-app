import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from "react-leaflet";
import L, { type LatLngLiteral } from "leaflet";
import { TILE_ATTRIBUTION, TILE_MAX_ZOOM, TILE_URL, pinIconFor } from "../../../shared/map";
import type { ParsedGpx } from "../../../shared/gpx";
import TrackLayer from "../../../shared/TrackLayer";

export type CompareItem = {
  key: string;
  label: string;
  color: string;
  gpx: ParsedGpx | null;        // traccia, se c'è ed è già stata scaricata
  point: LatLngLiteral | null;  // altrimenti il punto del trek
};

// inquadra tutte le tracce/punti insieme, solo quando cambia l'insieme di ciò che è sulla mappa
function FitAll({ items }: { items: CompareItem[] }) {
  const map = useMap();
  const shown = items.filter((i) => i.gpx?.bounds || i.point);
  const shownKey = shown.map((i) => `${i.key}:${i.gpx ? "g" : "p"}`).join(",");
  useEffect(() => {
    const bounds = L.latLngBounds([]);
    for (const i of shown) {
      if (i.gpx?.bounds) bounds.extend(i.gpx.bounds);
      else if (i.point) bounds.extend(i.point);
    }
    if (!bounds.isValid()) return;
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [map, shownKey]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

// Mappa con più trek sovrapposti, ognuno col suo colore
export default function TrekCompareMap({ items }: { items: CompareItem[] }) {
  return (
    <MapContainer center={[42.5, 12.5]} zoom={6} maxZoom={TILE_MAX_ZOOM} style={{ height: "100%", width: "100%" }}>
      <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} maxZoom={TILE_MAX_ZOOM} />
      {items.map((i) =>
        i.gpx ? (
          <TrackLayer key={i.key} gpx={i.gpx} trackKey={i.key} color={i.color} label={i.label} fit={false} />
        ) : i.point ? (
          <Marker key={i.key} position={i.point} icon={pinIconFor(i.color)}>
            <Tooltip direction="top" offset={[0, -30]}>{i.label}</Tooltip>
          </Marker>
        ) : null
      )}
      <FitAll items={items} />
    </MapContainer>
  );
}
