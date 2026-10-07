// MapPicker.tsx
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import type { LatLngLiteral } from "leaflet";
import { TILE_ATTRIBUTION, TILE_MAX_ZOOM, TILE_URL, pinIcon, pinIconFor } from "./map";

type Props = {
  value: LatLngLiteral | null; //posiz attuale
  onChange: (pos: LatLngLiteral) => void; //funz che parte al click -- LatLngLiteral (lat: number; lng: number)
  flyTo?: LatLngLiteral | null; // se cambia (nuovo oggetto), la mappa ci vola sopra (es. luogo cercato)
  color?: string; // colore del pin (default: accento)
};

function ClickHandler({ onChange }: { onChange: Props["onChange"] }) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

// leaflet calcola le dimensioni solo all'avvio: se il contenitore cambia (es. dentro un dialog
// che si apre dopo il montaggio) bisogna dirglielo, altrimenti le tile restano grigie
function KeepSize() {
  const map = useMap();
  useEffect(() => {
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(map.getContainer());
    return () => ro.disconnect();
  }, [map]);
  return null;
}

function FlyTo({ target }: { target: LatLngLiteral }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(target, Math.max(map.getZoom(), 12), { duration: 0.8 });
  }, [map, target]);
  return null;
}

export default function MapPicker({ value, onChange, flyTo, color }: Props) {
  const center: LatLngLiteral = { lat: 42.5, lng: 12.5 }; // Italia circa

  return (
    // l'altezza la decide il contenitore (sezione o dialog): qui si eredita la sua altezza minima
    <div style={{ height: "100%", minHeight: "inherit", width: "100%" }}>
      <MapContainer center={value ?? center} zoom={value ? 12 : 6} maxZoom={TILE_MAX_ZOOM} style={{ height: "100%", width: "100%" }}>
        <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} maxZoom={TILE_MAX_ZOOM} />
        <ClickHandler onChange={onChange} />
        <KeepSize />
        {flyTo && <FlyTo target={flyTo} />}
        {value && <Marker position={value} icon={color ? pinIconFor(color) : pinIcon} />}
      </MapContainer>
    </div>
  );
}
