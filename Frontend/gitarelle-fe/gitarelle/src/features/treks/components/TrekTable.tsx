import { useState } from "react";
import type { Folder, Trek } from "../types";
import styles from "./TrekTable.module.css";
import { formatDate, formatGain, formatKm } from "../../../shared/format";
import { EyeIcon, PencilIcon, PinIcon, TrashIcon } from "../../../shared/icons";

type SortKey = "date" | "title" | "distance" | "gain";
type Sort = { key: SortKey; desc: boolean };

// valore su cui ordinare; i trek senza dato finiscono sempre in fondo
const sortValue = (t: Trek, key: SortKey): string | number | null => {
  switch (key) {
    case "date": return t.trekDate ?? null;
    case "title": return t.title.toLocaleLowerCase("it-IT");
    case "distance": return t.distanceMeters;
    case "gain": return t.elevationGainMeters;
  }
};

const hasPlace = (t: Trek) => t.hasGpx || (t.lat != null && t.lon != null);

type Props = {
  treks: Trek[];
  folders: Folder[];
  onView: (t: Trek) => void;
  onEdit: (t: Trek) => void;
  onDelete: (t: Trek) => void;
  onShowOnMap: (t: Trek) => void; // passa alla mappa e inquadra il trek
};

// Elenco completo dello storico, senza mappa: ricerca e ordinamento su tutti i trek della cartella
export default function TrekTable({ treks, folders, onView, onEdit, onDelete, onShowOnMap }: Props) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>({ key: "date", desc: true });

  const q = query.trim().toLocaleLowerCase("it-IT");
  const filtered = q
    ? treks.filter((t) => `${t.title} ${t.amichetti ?? ""} ${t.notes ?? ""}`.toLocaleLowerCase("it-IT").includes(q))
    : treks;
  const rows = [...filtered].sort((a, b) => {
    const va = sortValue(a, sort.key);
    const vb = sortValue(b, sort.key);
    if (va == null || vb == null) return va == null ? (vb == null ? 0 : 1) : -1;
    const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "it-IT");
    return sort.desc ? -cmp : cmp;
  });

  // nomi delle cartelle del trek, nello stesso ordine (alfabetico) della barra delle cartelle
  const folderNames = (t: Trek) => folders.filter((f) => t.folderIds.includes(f.id)).map((f) => f.name).join(", ") || null;

  // click sulla stessa colonna inverte il verso; su una nuova parte dal verso più utile
  function sortBy(key: SortKey) {
    setSort((prev) => prev.key === key ? { key, desc: !prev.desc } : { key, desc: key !== "title" });
  }

  const header = (key: SortKey, label: string, className?: string) => (
    <th className={className} aria-sort={sort.key === key ? (sort.desc ? "descending" : "ascending") : "none"}>
      <button type="button" className={styles.sortBtn} onClick={() => sortBy(key)}>
        {label}
        <span className={styles.sortArrow} aria-hidden="true">{sort.key === key ? (sort.desc ? "▼" : "▲") : ""}</span>
      </button>
    </th>
  );

  return (
    <div className={styles.wrap}>
      <div className={styles.searchRow}>
        <input
          type="search"
          className={styles.search}
          placeholder="Cerca per titolo, compagni o note..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Cerca nello storico"
        />
        <span className={styles.count}>
          {q ? `${rows.length} di ${treks.length}` : `${treks.length} escursioni`}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className={styles.empty}>{q ? "Nessuna escursione corrisponde alla ricerca." : "Nessuna escursione in questa cartella."}</div>
      ) : (
        <div className={styles.scroller}>
          <table className={styles.table}>
            <thead>
              <tr>
                {header("date", "Data")}
                {header("title", "Escursione")}
                <th className={styles.colFolder}>Cartelle</th>
                <th className={styles.colFolder}>Regione</th>
                {header("distance", "Distanza", styles.num)}
                {header("gain", "Dislivello", styles.num)}
                <th className={styles.colActions}><span className="sr-only">Azioni</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td className={styles.date}>
                    {formatDate(t.trekDate, { day: "2-digit", month: "short", year: "numeric" }) || "–"}
                  </td>
                  <td className={styles.titleCell}>
                    <button type="button" className={styles.titleBtn} onClick={() => onView(t)} title="Vedi i dettagli">
                      {t.title}
                    </button>
                    {t.amichetti && <small>con {t.amichetti}</small>}
                  </td>
                  <td className={styles.colFolder}>{folderNames(t) ?? <span className={styles.muted}>—</span>}</td>
                  <td className={styles.colFolder}>{t.region ?? <span className={styles.muted}>—</span>}</td>
                  <td className={styles.num}>{t.distanceMeters != null ? formatKm(t.distanceMeters) : <span className={styles.muted}>—</span>}</td>
                  <td className={styles.num}>{t.elevationGainMeters != null ? formatGain(t.elevationGainMeters) : <span className={styles.muted}>—</span>}</td>
                  <td className={styles.colActions}>
                    <div className={styles.tools}>
                      <button
                        type="button"
                        className={styles.toolBtn}
                        onClick={() => onShowOnMap(t)}
                        disabled={!hasPlace(t)}
                        title={hasPlace(t) ? "Mostra sulla mappa" : "Nessun punto né traccia"}
                        aria-label={`Mostra ${t.title} sulla mappa`}
                      >
                        <PinIcon />
                      </button>
                      <button type="button" className={styles.toolBtn} onClick={() => onView(t)} title="Dettagli" aria-label={`Dettagli di ${t.title}`}>
                        <EyeIcon />
                      </button>
                      <button type="button" className={styles.toolBtn} onClick={() => onEdit(t)} title="Modifica" aria-label={`Modifica ${t.title}`}>
                        <PencilIcon />
                      </button>
                      <button type="button" className={`${styles.toolBtn} ${styles.toolDanger}`} onClick={() => onDelete(t)} title="Elimina" aria-label={`Elimina ${t.title}`}>
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
