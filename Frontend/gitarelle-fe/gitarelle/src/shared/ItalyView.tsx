import { useEffect } from "react";
import { useMap } from "react-leaflet";
import { italyView } from "./map";

// Inquadratura di partenza sull'Italia intera; poi la mappa si sposta liberamente, anche fuori.
// Da mettere dentro un <MapContainer>, prima di chi inquadra altro (traccia, ultimo trek...).
// Prima di inquadrare si fa rileggere la misura a leaflet: una mappa nata dentro un dialog ancora chiuso
// misura 0 pixel e leaflet se la ricorda (inquadrare con quella misura porta allo zoom minimo: il mondo intero).
// Con la misura già presa si inquadra subito, così chi viene dopo (ultimo trek, punto, traccia) ha l'ultima
// parola; solo se il contenitore è ancora a 0 si aspetta che la prenda
export default function ItalyView() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const sized = () => container.clientWidth > 0 && container.clientHeight > 0;
    const fit = () => {
      map.invalidateSize();
      const { center, zoom } = italyView(map);
      map.setView(center, zoom, { animate: false });
    };
    if (sized()) {
      fit();
      return;
    }
    const ro = new ResizeObserver(() => {
      if (!sized()) return;
      ro.disconnect();
      fit();
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [map]);
  return null;
}
