import { useEffect } from "react";
import { useMap } from "react-leaflet";
import type { LatLngLiteral } from "leaflet";
import type { ParsedGpx } from "./gpx";

// Per mappe dentro un dialog: la mappa nasce prima che il dialog si apra (a dimensione zero).
// Quando il contenitore prende la sua misura si avvisa leaflet (altrimenti le tile restano grigie)
// e si inquadra la traccia, o il punto se la traccia non c'è. Da mettere dentro un <MapContainer>.
export default function FitWhenSized({ gpx, point }: { gpx: ParsedGpx | null; point: LatLngLiteral | null }) {
  const map = useMap();
  useEffect(() => {
    const fit = () => {
      map.invalidateSize();
      if (gpx?.bounds) map.fitBounds(gpx.bounds, { padding: [24, 24] });
      else if (point) map.setView(point, 13);
    };
    const ro = new ResizeObserver(fit);
    ro.observe(map.getContainer());
    return () => ro.disconnect();
  }, [map, gpx]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
