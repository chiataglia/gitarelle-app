import { useEffect, useRef, useState } from "react";
import type { Trek } from "./types";
import { fetchGpxText } from "./api";
import { parseGpx, type ParsedGpx } from "../../shared/gpx";
import { errorMessage } from "../../shared/api";

// Scarica (una volta sola) le tracce gpx dei trek richiesti e le tiene in cache per id,
// così passare da dettaglio a confronto o riselezionare un trek non rifà la richiesta.
export function useGpxTracks(ids: Trek["id"][]) {
  const [tracks, setTracks] = useState<Record<string, ParsedGpx>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const inFlight = useRef(new Set<string>());

  const idsKey = ids.map(String).join(",");
  useEffect(() => {
    for (const id of ids) {
      const k = String(id);
      if (tracks[k] || inFlight.current.has(k)) continue;
      inFlight.current.add(k);
      // se in passato era fallito si riprova (l'errore resta visibile finché non va a buon fine)
      fetchGpxText(id)
        .then((text) => {
          setTracks((prev) => ({ ...prev, [k]: parseGpx(text) }));
          setErrors((prev) => {
            if (!(k in prev)) return prev;
            const next = { ...prev };
            delete next[k];
            return next;
          });
        })
        .catch((e) => setErrors((prev) => ({ ...prev, [k]: errorMessage(e, "Errore nel caricamento del GPX") })))
        .finally(() => inFlight.current.delete(k));
    }
  }, [idsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const trackOf = (id: Trek["id"]) => tracks[String(id)] ?? null;
  const errorOf = (id: Trek["id"]) => errors[String(id)] ?? null;
  const isLoading = (id: Trek["id"]) => !trackOf(id) && !errorOf(id);

  return { trackOf, errorOf, isLoading };
}
