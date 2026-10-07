import { useEffect, useRef, useState } from "react";
import { parseGpx, type ParsedGpx } from "./gpx";
import { errorMessage } from "./api";

type Id = string | number;

// Scarica (una volta sola) le tracce gpx richieste e le tiene in cache per id,
// così riselezionare un elemento o cambiare vista non rifà la richiesta.
// fetchText va definita fuori dal componente (es. una funzione di api.ts), non inline.
export function useGpxTracks(ids: Id[], fetchText: (id: Id) => Promise<string>) {
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
      fetchText(id)
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
  }, [idsKey, tracks]); // eslint-disable-line react-hooks/exhaustive-deps

  // da chiamare quando la traccia di un id cambia sul server (es. gpx sostituito o rimosso):
  // togliendola dalla cache, l'effect la riscarica se l'id è ancora richiesto
  function forget(id: Id) {
    const k = String(id);
    setTracks((prev) => {
      if (!(k in prev)) return prev;
      const next = { ...prev };
      delete next[k];
      return next;
    });
  }

  const trackOf = (id: Id) => tracks[String(id)] ?? null;
  const errorOf = (id: Id) => errors[String(id)] ?? null;
  const isLoading = (id: Id) => !trackOf(id) && !errorOf(id);

  return { trackOf, errorOf, isLoading, forget };
}
