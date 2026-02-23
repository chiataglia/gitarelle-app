import { useEffect, useState } from "react";
import type { Trek } from "../types";
import TrekMap from "./TrekMap";

export default function TrekList() {
  const [treks, setTreks] = useState<Trek[]>([]);
  const [selected, setSelected] = useState<Trek | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("http://localhost:8080/api/treks");
        if (!res.ok) throw new Error(`Errore ${res.status}`);
        const data: Trek[] = await res.json();
        setTreks(data);
      } catch (e: any) {
        setError(e.message ?? "Errore fetch");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16 }}>
      <div>
        <h2>Storico trek</h2>
        {loading && <div>Caricamento...</div>}
        {error && <div style={{ color: "crimson" }}>{error}</div>}

        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
          {treks.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setSelected(t)}
                style={{ width: "100%", textAlign: "left", padding: 10 }}
              >
                <div style={{ fontWeight: 700 }}>{t.title}</div>
                <div style={{ opacity: 0.8, fontSize: 12 }}>
                  {t.trekDate ?? ""} ({t.lat.toFixed(4)}, {t.lon.toFixed(4)})
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2>Mappa</h2>
        {selected ? (
          <TrekMap lat={selected.lat} lon={selected.lon} />
        ) : (
          <div>Seleziona un trek dalla lista.</div>
        )}
      </div>
    </div>
  );
}