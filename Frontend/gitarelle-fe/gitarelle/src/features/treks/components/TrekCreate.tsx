import { useState } from "react";
import type { LatLngLiteral } from "leaflet";
import MapPicker from "./MapPicker";
import styles from "./TrekCreate.module.css";

type TrekPayload = {
  title: string;
  trekDate: string;   // "YYYY-MM-DD"
  amichetti: string;
  notes: string;
  lat: number;
  lon: number;
};

export default function TrekCreate() {
  const today = new Date().toISOString().split("T")[0];
 
  const [title, setTitle] = useState(""); //useState restituire array con due elementi, valore corrente e funzione per aggiornarlo
  const [trekDate, setTrekDate] = useState(today);
  const [amichetti, setAmichetti] = useState("");
  const [notes, setNotes] = useState("");

  const [pos, setPos] = useState<LatLngLiteral | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault(); //evita che il browser ricarichi la pagina
    setOk(false);
    setError(null);

    if (!pos) {
      setError("Seleziona un punto sulla mappa.");
      return;
    }

    const payload: TrekPayload = {
      title,
      trekDate,
      amichetti,
      notes,
      lat: pos.lat,
      lon: pos.lng,
    };

    try {
      setLoading(true);
      const res = await fetch("http://localhost:8080/api/treks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Errore ${res.status}. ${text}`);
      }

      setOk(true);
      setTitle(""); setNotes(""); setAmichetti(""); setPos(null); //ripulisce
    } catch (err: any) {
      setError(err.message ?? "Errore nella POST");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2>Nuova escursione</h2>

      <MapPicker value={pos} onChange={setPos} />

      <div className={styles.coordinates}>
        <div><b>Lat:</b> {pos ? pos.lat.toFixed(6) : "-"}</div>
        <div><b>Lon:</b> {pos ? pos.lng.toFixed(6) : "-"}</div>
      </div>

      <form onSubmit={handleSubmit} style={{ marginTop: 16, display: "grid", gap: 10 }}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titolo" />
        <input type="date" value={trekDate} onChange={(e) => setTrekDate(e.target.value)} />
        <input value={amichetti} onChange={(e) => setAmichetti(e.target.value)} placeholder="Amichetti" />
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Note" rows={4} />

        <button disabled={loading}>
          {loading ? "Salvataggio..." : "Crea Trek"}
        </button>

        {error && <div style={{ color: "crimson" }}>{error}</div>}
        {ok && <div style={{ color: "green" }}>Inserito </div>}
      </form>
    </div>
  );
}