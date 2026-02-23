// MapPicker.tsx
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import type { LatLngLiteral } from "leaflet";

type Props = {
  value: LatLngLiteral | null; //posiz attuale
  onChange: (pos: LatLngLiteral) => void; //funz che parte al click -- LatLngLiteral (lat: number; lng: number)
};

function ClickHandler({ onChange }: { onChange: Props["onChange"] }) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function MapPicker({ value, onChange }: Props) {
  const center: LatLngLiteral = { lat: 42.5, lng: 12.5 }; // Italia circa

  return (
    <div style={{ height: 420, width: "100%" }}>
      <MapContainer center={value ?? center} zoom={5} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onChange={onChange} />
        {value && <Marker position={value} />}
      </MapContainer>
    </div>
  );
}