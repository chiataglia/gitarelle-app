import { useEffect } from "react";
import { GeoJSON, Marker, Tooltip, useMap } from "react-leaflet";
import type L from "leaflet";
import type { ParsedGpx } from "./gpx";
import { TRACK_COLOR, darken, pinIcon, pinIconFor } from "./map";

const isLine = (feature?: GeoJSON.Feature) => {
  const t = feature?.geometry?.type;
  return t === "LineString" || t === "MultiLineString";
};

// ricentra solo quando cambia la traccia (non ad ogni render). Prima fa rileggere la misura a leaflet:
// in un dialog la mappa nasce a 0 pixel e, con quella misura, inquadrerebbe allo zoom massimo
function FitBounds({ bounds }: { bounds: L.LatLngBounds }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
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
  dashed?: boolean; // tratteggiata (es. percorso ancora da fare)
  pin?: boolean;    // false quando il pin lo disegna già qualcun altro (es. i gruppi della mappa storico)
  onClick?: () => void; // click su traccia o pin
};

// Traccia gpx + pin sul punto di partenza, da mettere dentro un <MapContainer>
export default function TrackLayer({ gpx, trackKey, color, label, fit = true, dashed, pin = true, onClick }: Props) {
  const stroke = color ?? TRACK_COLOR;
  const dashArray = dashed ? "2 10" : undefined;
  const eventHandlers = onClick ? { click: onClick } : undefined;
  return (
    <>
      {/* contorno sottile più scuro sotto la linea: la stacca dalle tile; non cliccabile */}
      <GeoJSON
        key={`${trackKey}-${stroke}-outline`}
        data={gpx.geojson}
        interactive={false}
        filter={(feature) => isLine(feature)}
        style={{ color: darken(stroke, 0.5), weight: 6.5, opacity: 1, lineCap: "round", lineJoin: "round", dashArray }}
      />
      <GeoJSON
        key={`${trackKey}-${stroke}`} // GeoJSON di react-leaflet non si aggiorna se cambia solo "data" o lo stile
        data={gpx.geojson}
        eventHandlers={eventHandlers}
        // cliccabile: il click resta alla traccia e non arriva anche alla mappa sotto (che magari lo usa per altro)
        bubblingMouseEvents={!onClick}
        style={(feature) => {
          if (isLine(feature)) {
            return { color: stroke, weight: 3.5, opacity: 0.95, lineCap: "round", lineJoin: "round", dashArray };
          }
          return { color: stroke, weight: 2, opacity: 0.8 };
        }}
      >
        {label && !onClick && <Tooltip sticky>{label}</Tooltip>}
      </GeoJSON>
      {/* linea larga e invisibile sopra la traccia: la rende facile da cliccare senza centrarla al pixel */}
      {onClick && (
        <GeoJSON
          key={`${trackKey}-${stroke}-hit`}
          data={gpx.geojson}
          filter={(feature) => isLine(feature)}
          eventHandlers={eventHandlers}
          bubblingMouseEvents={false}
          style={{ color: stroke, weight: 20, opacity: 0, lineCap: "round", lineJoin: "round" }}
        >
          {label && <Tooltip sticky>{label}</Tooltip>}
        </GeoJSON>
      )}
      {pin && gpx.info.start && (
        <Marker position={gpx.info.start} icon={color ? pinIconFor(color) : pinIcon} eventHandlers={eventHandlers}>
          {label && <Tooltip direction="top" offset={[0, -30]}>{label}</Tooltip>}
        </Marker>
      )}
      {fit && gpx.bounds && <FitBounds bounds={gpx.bounds} />}
    </>
  );
}
