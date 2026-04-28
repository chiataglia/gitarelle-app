import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import { useEffect } from "react";
import type { LatLngLiteral } from "leaflet";

//ricentra mappa intorno al punto in input
function Recenter({ pos }: { pos: LatLngLiteral }) {
  const map = useMap();
  useEffect(() => {
    map.setView(pos, 13); // <-- zoom
  }, [map, pos.lat, pos.lng]);
  return null;
}

//Riceve punto, converte in pos, restituisce div coon mappa centrata sul punto e pin su esso
export default function TrekMap({ lat, lon }: { lat: number; lon: number }) {
  const pos: LatLngLiteral = { lat, lng: lon };// pos, di tipo LatLngLiteral, sarà
  // un oggetto con proprietà lat presa da lat e lng presa dalla variabile lon

  return (
    <div style={{ height: 420, width: "100%" }}>
      <MapContainer center={pos} zoom={12} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Recenter pos={pos} />
        <Marker position={pos} />
      </MapContainer>
    </div>
  );
}