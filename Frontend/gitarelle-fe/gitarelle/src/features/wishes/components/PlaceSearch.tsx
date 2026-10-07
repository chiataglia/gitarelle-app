import { useRef, useState } from "react";
import { searchPlaces, type Place } from "../../../shared/geocode";
import { errorMessage } from "../../../shared/api";
import styles from "./Wishes.module.css";

// Cerca un luogo per nome (OpenStreetMap) e restituisce quello scelto.
// Niente <form>: vive dentro il form del dialog, quindi si cerca con Invio o col bottone.
export default function PlaceSearch({ onPick }: { onPick: (place: Place) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ctrl = useRef<AbortController | null>(null);

  async function search() {
    const q = query.trim();
    if (q.length < 2 || searching) return;
    ctrl.current?.abort();
    ctrl.current = new AbortController();
    try {
      setSearching(true);
      setError(null);
      setResults(await searchPlaces(q, ctrl.current.signal));
    } catch (e) {
      if (!ctrl.current.signal.aborted) setError(errorMessage(e, "Ricerca non riuscita"));
    } finally {
      setSearching(false);
    }
  }

  function pick(p: Place) {
    onPick(p);
    setResults(null);
    setQuery(p.name);
  }

  return (
    <div className={styles.placeSearch}>
      <div className={styles.placeRow}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); search(); } }}
          placeholder="Cerca un luogo: rifugio, cima, paese..."
          aria-label="Cerca un luogo"
        />
        <button type="button" className={styles.placeBtn} onClick={search} disabled={searching || query.trim().length < 2}>
          {searching ? "..." : "Cerca"}
        </button>
      </div>

      {error && <div className={styles.placeMsg}>{error}</div>}
      {results && results.length === 0 && <div className={styles.placeMsg}>Nessun luogo trovato</div>}
      {results && results.length > 0 && (
        <ul className={styles.placeResults}>
          {results.map((p) => (
            <li key={p.key}>
              <button type="button" onClick={() => pick(p)}>
                <strong>{p.name}</strong>
                <small>{p.description}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
