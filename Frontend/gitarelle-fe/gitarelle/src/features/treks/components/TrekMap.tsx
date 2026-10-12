import { MapContainer, Marker, useMap, useMapEvents } from "react-leaflet";
import { useEffect } from "react";
import type { LatLngLiteral } from "leaflet";
import { TILE_MAX_ZOOM, pinIcon } from "../../../shared/map";
import type { ParsedGpx } from "../../../shared/gpx";
import TrackLayer from "../../../shared/TrackLayer";
import InvalidateOnResize from "../../../shared/InvalidateOnResize";
import ItalyView from "../../../shared/ItalyView";
import MapLayers from "../../../shared/MapLayers";

const ITALY: LatLngLiteral = { lat: 42.5, lng: 12.5 };

type Props = {
  point: LatLngLiteral | null;   // punto del trek (o punto in bozza durante la scelta)
  gpx: ParsedGpx | null;         // traccia associata, se presente: ha la precedenza sul punto
  trackKey: string;
  onPick?: (pos: LatLngLiteral) => void; // se presente, un click sulla mappa sceglie il punto
};

//ricentra mappa intorno al punto in input
function Recenter({ pos }: { pos: LatLngLiteral }) {
  const map = useMap();
  useEffect(() => {
    map.setView(pos, Math.max(map.getZoom(), 13)); // <-- zoom
  }, [map, pos.lat, pos.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function ClickHandler({ onPick }: { onPick: (pos: LatLngLiteral) => void }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

// Mappa di dettaglio di un trek: traccia gpx se c'è, altrimenti il punto, altrimenti l'Italia
export default function TrekMap({ point, gpx, trackKey, onPick }: Props) {
  return (
    <div style={{ height: "100%", minHeight: "var(--map-h)", width: "100%", cursor: onPick ? "crosshair" : undefined }}>
      <MapContainer center={point ?? ITALY} zoom={point ? 12 : 6} maxZoom={TILE_MAX_ZOOM} maxBoundsViscosity={1} style={{ height: "100%", width: "100%", cursor: "inherit" }}>
        <MapLayers />
        <ItalyView />
        {gpx && <TrackLayer gpx={gpx} trackKey={trackKey} />}
        {point && (!gpx || onPick) && <Marker position={point} icon={pinIcon} />}
        {point && !gpx && <Recenter pos={point} />}
        {onPick && <ClickHandler onPick={onPick} />}
        <InvalidateOnResize />
      </MapContainer>
    </div>
  );
}
