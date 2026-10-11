import { useEffect } from "react";
import { useMap } from "react-leaflet";

// Avvisa leaflet quando il contenitore cambia misura (es. schermo intero),
// altrimenti restano zone grigie senza tile. Da mettere dentro un <MapContainer>.
export default function InvalidateOnResize() {
  const map = useMap();
  useEffect(() => {
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(map.getContainer());
    return () => ro.disconnect();
  }, [map]);
  return null;
}
