import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import { useEffect } from "react";
import type { LatLngLiteral } from "leaflet";

function Recenter({ pos }: { pos: LatLngLiteral }) {
  const map = useMap();
  useEffect(() => {
    map.setView(pos, 13); // <-- zoom
  }, [map, pos.lat, pos.lng]);
  return null;
}

export default function TrekMap({ lat, lon }: { lat: number; lon: number }) {
  const pos: LatLngLiteral = { lat, lng: lon };

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