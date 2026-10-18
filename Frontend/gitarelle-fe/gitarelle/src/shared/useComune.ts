import { useEffect, useState } from "react";
import type { LatLngLiteral } from "leaflet";
import { cachedComune, comuneOf } from "./geocode";

// Comune in cui cade un punto: undefined mentre si cerca (o se il servizio non risponde), null se non c'è
export function useComune(point: LatLngLiteral | null): string | null | undefined {
  const lat = point?.lat;
  const lng = point?.lng;
  const [found, setFound] = useState<{ key: string; comune: string | null } | null>(null);
  const key = lat != null && lng != null ? `${lat},${lng}` : null;

  useEffect(() => {
    if (lat == null || lng == null) return;
    if (cachedComune({ lat, lng }) !== undefined) return;
    let alive = true;
    comuneOf({ lat, lng })
      .then((comune) => { if (alive) setFound({ key: `${lat},${lng}`, comune }); })
      .catch(() => {}); // senza rete resta la regione
    return () => { alive = false; };
  }, [lat, lng]);

  if (lat == null || lng == null) return null;
  const cached = cachedComune({ lat, lng });
  if (cached !== undefined) return cached;
  return found?.key === key ? found.comune : undefined;
}
