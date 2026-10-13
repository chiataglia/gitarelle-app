import { Fragment } from "react";
import { Marker, Polyline, useMapEvents } from "react-leaflet";
import L, { type LatLngLiteral } from "leaflet";
import type { RoutePlanner } from "../useRoutePlanner";
import { darken } from "../../../shared/map";

// pin numerati dei punti di passaggio: il primo verde (partenza), l'ultimo ambra (arrivo)
function waypointIcon(n: number, kind: "start" | "end" | "via") {
  return L.divIcon({ className: `gt-wp gt-wp-${kind}`, html: `<span>${n}</span>`, iconSize: [26, 26] });
}

function AddOnClick({ onAdd }: { onAdd: (p: LatLngLiteral) => void }) {
  useMapEvents({ click: (e) => onAdd({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

type Props = {
  planner: RoutePlanner;
  color: string;
};

// Disegno del percorso sulla mappa (dentro un <MapContainer>): clic per aggiungere una tappa,
// tappe trascinabili, clic su una tappa per toglierla; tratti calcolati, in calcolo o senza sentiero
export default function PlannerLayers({ planner, color }: Props) {
  const { waypoints, pairs, states } = planner;
  return (
    <>
      <AddOnClick onAdd={planner.add} />

      {pairs.map(({ a, b, key }, i) => {
        const s = states[i];
        if (s.status === "ok") {
          const positions = s.coords.map(([lon, lat]) => [lat, lon] as [number, number]);
          return (
            <Fragment key={key}>
              <Polyline positions={positions} interactive={false}
                pathOptions={{ color: darken(color, 0.5), weight: 7, opacity: 1, lineCap: "round", lineJoin: "round" }} />
              <Polyline positions={positions} interactive={false}
                pathOptions={{ color, weight: 4.5, opacity: 1, lineCap: "round", lineJoin: "round" }} />
            </Fragment>
          );
        }
        return (
          // tratto in calcolo (tratteggiato) o senza sentiero (rosso)
          <Polyline key={key} positions={[a, b]}
            pathOptions={{ color: s.status === "error" ? "#ff7b72" : "#ffffff", weight: 3, opacity: 0.8, dashArray: "4 8" }} />
        );
      })}

      {waypoints.map((w, i) => (
        <Marker
          key={i}
          position={w}
          draggable
          icon={waypointIcon(i + 1, i === 0 ? "start" : i === waypoints.length - 1 && i > 0 ? "end" : "via")}
          eventHandlers={{
            click: () => planner.remove(i),
            dragend: (e) => {
              const p = (e.target as L.Marker).getLatLng();
              planner.move(i, { lat: p.lat, lng: p.lng });
            },
          }}
        />
      ))}
    </>
  );
}
