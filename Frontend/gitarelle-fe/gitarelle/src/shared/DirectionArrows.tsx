import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import type { ParsedGpx } from "./gpx";

const SPACING = 90; // pixel tra una freccia e l'altra, a qualsiasi zoom

// tutte le linee della traccia come [lat, lng]
function linesOf(gpx: ParsedGpx): [number, number][][] {
  const lines: [number, number][][] = [];
  const add = (coords: GeoJSON.Position[]) => lines.push(coords.map(([lng, lat]) => [lat, lng]));
  for (const f of gpx.geojson.features) {
    const g = f.geometry;
    if (g?.type === "LineString") add(g.coordinates);
    else if (g?.type === "MultiLineString") g.coordinates.forEach(add);
  }
  return lines;
}

const arrowIcon = (angle: number) =>
  L.divIcon({
    className: "gt-arrow",
    html: `<svg viewBox="0 0 10 10" width="10" height="10" style="transform: rotate(${angle}deg)"><path d="M3 1.5 L7 5 L3 8.5" /></svg>`,
    iconSize: [10, 10],
  });

// Frecce leggere sopra la traccia con il verso di percorrenza, da mettere dentro un <MapContainer>.
// Distanziate in pixel (si ricalcolano a ogni zoom) e solo nella parte di mappa visibile
export default function DirectionArrows({ gpx }: { gpx: ParsedGpx }) {
  const map = useMap();
  useEffect(() => {
    const lines = linesOf(gpx);
    const group = L.layerGroup().addTo(map);

    const draw = () => {
      group.clearLayers();
      const view = map.getBounds().pad(0.2);
      for (const line of lines) {
        let carry = SPACING / 2; // la prima freccia a metà passo dalla partenza
        for (let i = 1; i < line.length; i++) {
          const a = map.latLngToLayerPoint(line[i - 1]);
          const b = map.latLngToLayerPoint(line[i]);
          const len = a.distanceTo(b);
          if (len === 0) continue;
          const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
          let at = carry;
          for (; at <= len; at += SPACING) {
            const t = at / len;
            const pos = map.layerPointToLatLng(L.point(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t));
            if (view.contains(pos)) group.addLayer(L.marker(pos, { icon: arrowIcon(angle), interactive: false, keyboard: false, zIndexOffset: -1000 }));
          }
          carry = at - len;
        }
      }
    };

    draw();
    map.on("zoomend moveend", draw);
    return () => {
      map.off("zoomend moveend", draw);
      group.remove();
    };
  }, [map, gpx]);
  return null;
}
