import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { italyView } from "./map";
import { HomeIcon } from "./icons";

// Pulsante in basso a sinistra che riporta la mappa sull'Italia intera. Da mettere dentro un <MapContainer>;
// la posizione la decide chi lo usa (className), l'aspetto è .gt-map-btn in index.css
export default function HomeButton({ className = "" }: { className?: string }) {
  const map = useMap();
  const ref = useRef<HTMLButtonElement>(null);

  // i click sul pulsante non devono arrivare alla mappa
  useEffect(() => {
    if (ref.current) L.DomEvent.disableClickPropagation(ref.current);
  }, []);

  return (
    <button
      ref={ref}
      type="button"
      className={`gt-map-btn gt-home-btn ${className}`}
      onClick={() => {
        const { center, zoom } = italyView(map);
        map.flyTo(center, zoom, { duration: 0.8 });
      }}
      title="Torna all'Italia intera"
      aria-label="Torna all'Italia intera"
    >
      <HomeIcon />
    </button>
  );
}
