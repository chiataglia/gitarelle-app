import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

// Italia intera, isole comprese
export const ITALY_BOUNDS = L.latLngBounds([36.6, 6.6], [47.1, 18.6]);

// Mappa tenuta sull'Italia: parte inquadrandola, non si allontana oltre (zoom minimo = Italia intera)
// e non si trascina lontano. Da mettere dentro un <MapContainer maxBoundsViscosity={1}>, prima di chi inquadra altro.
export default function ItalyView() {
  const map = useMap();
  useEffect(() => {
    map.setMaxBounds(ITALY_BOUNDS.pad(0.15));
    map.fitBounds(ITALY_BOUNDS, { animate: false });
    // lo zoom minimo dipende dalla forma della mappa: si ricalcola quando cambia misura (es. schermo intero)
    const updateMinZoom = () => map.setMinZoom(map.getBoundsZoom(ITALY_BOUNDS));
    updateMinZoom();
    const ro = new ResizeObserver(updateMinZoom);
    ro.observe(map.getContainer());
    return () => ro.disconnect();
  }, [map]);
  return null;
}
