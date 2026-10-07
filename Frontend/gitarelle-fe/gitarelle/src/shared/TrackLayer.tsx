import { useEffect } from "react";
import { GeoJSON, Marker, Tooltip, useMap } from "react-leaflet";
import type L from "leaflet";
import type { ParsedGpx } from "./gpx";
import { TRACK_COLOR, pinIcon, pinIconFor } from "./map";

// ricentra solo quando cambia la traccia (non ad ogni render)
function FitBounds({ bounds }: { bounds: L.LatLngBounds }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [24, 24] });
  }, [map, bounds]);
  return null;
}

type Props = {
  gpx: ParsedGpx;
  trackKey: string;
  color?: string;  // default: colore accento
  label?: string;  // tooltip su traccia e pin (utile con più tracce)
  fit?: boolean;   // false quando è la mappa a inquadrare più tracce insieme
};

// Traccia gpx + pin sul punto di partenza, da mettere dentro un <MapContainer>
export default function TrackLayer({ gpx, trackKey, color, label, fit = true }: Props) {
  const stroke = color ?? TRACK_COLOR;
  return (
    <>
      <GeoJSON
        key={`${trackKey}-${stroke}`} // GeoJSON di react-leaflet non si aggiorna se cambia solo "data" o lo stile
        data={gpx.geojson}
        style={(feature) => {
          const t = feature?.geometry?.type;
          if (t === "LineString" || t === "MultiLineString") {
            return { color: stroke, weight: 5, opacity: 0.95, lineCap: "round", lineJoin: "round" };
          }
          return { color: stroke, weight: 2, opacity: 0.8 };
        }}
      >
        {label && <Tooltip sticky>{label}</Tooltip>}
      </GeoJSON>
      {gpx.info.start && (
        <Marker position={gpx.info.start} icon={color ? pinIconFor(color) : pinIcon}>
          {label && <Tooltip direction="top" offset={[0, -30]}>{label}</Tooltip>}
        </Marker>
      )}
      {fit && gpx.bounds && <FitBounds bounds={gpx.bounds} />}
    </>
  );
}
