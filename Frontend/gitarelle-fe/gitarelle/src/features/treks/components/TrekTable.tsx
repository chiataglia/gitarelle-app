import type { Folder, Trek } from "../types";
import { SORT_OPTIONS, type TrekSort, type TrekSortKey } from "../trekSort";
import styles from "./TrekTable.module.css";
import { formatDate, formatGain, formatKm } from "../../../shared/format";
import { trekColor } from "../../../shared/map";
import { DistanceIcon, ElevationIcon, EyeIcon, FolderIcon, PencilIcon, PinIcon, TrashIcon } from "../../../shared/icons";

const hasPlace = (t: Trek) => t.hasGpx || (t.lat != null && t.lon != null);

type Props = {
  treks: Trek[]; // già filtrati (anche per nome) e ordinati dallo storico
  folders: Folder[];
  sort: TrekSort;                       // lo stesso "Ordina per" dello storico:
  onSortChange: (sort: TrekSort) => void; // il click su un'intestazione lo cambia
  onView: (t: Trek) => void;
  onEdit: (t: Trek) => void;
  onDelete: (t: Trek) => void;
  onShowOnMap: (t: Trek) => void; // passa alla mappa e inquadra il trek
};

// Elenco completo dello storico, senza mappa: tutti i trek della cartella (con i filtri), ordinabili per colonna
export default function TrekTable({ treks, folders, sort, onSortChange, onView, onEdit, onDelete, onShowOnMap }: Props) {
  const rows = treks;

  // cartelle del trek, nello stesso ordine (alfabetico) della barra delle cartelle
  const foldersOf = (t: Trek) => folders.filter((f) => t.folderIds.includes(f.id));

  // click sulla stessa colonna inverte il verso; su una nuova parte dal verso più utile
  function sortBy(key: TrekSortKey) {
    const desc = SORT_OPTIONS.find((o) => o.key === key)?.desc ?? true;
    onSortChange(sort.key === key ? { key, desc: !sort.desc } : { key, desc });
  }

  const header = (key: TrekSortKey, label: string, className?: string) => (
    <th className={className} aria-sort={sort.key === key ? (sort.desc ? "descending" : "ascending") : "none"}>
      <button type="button" className={styles.sortBtn} onClick={() => sortBy(key)}>
        {label}
        <span className={styles.sortArrow} aria-hidden="true">{sort.key === key ? (sort.desc ? "▼" : "▲") : ""}</span>
      </button>
    </th>
  );

  return (
    <div className={styles.wrap}>
      {rows.length === 0 ? (
        <div className={styles.empty}>Nessuna escursione con questi filtri in questa cartella.</div>
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
                // il colore è quello della traccia sulla mappa
                <tr key={t.id} style={{ "--row-color": trekColor(t) } as React.CSSProperties}>
                  <td className={styles.date}>
                    <div className={styles.dateBadge}>
                      <span>{formatDate(t.trekDate, { day: "2-digit" }) || "–"}</span>
                      <small>{formatDate(t.trekDate, { month: "short" })}</small>
                      <em>{formatDate(t.trekDate, { year: "numeric" })}</em>
                    </div>
                  </td>
                  <td className={styles.titleCell}>
                    <button type="button" className={styles.titleBtn} onClick={() => onView(t)} title="Vedi i dettagli">
                      {t.title}
                    </button>
                    {t.amichetti && <small>con {t.amichetti}</small>}
                  </td>
                  <td className={styles.colFolder}>
                    {foldersOf(t).length > 0 ? (
                      <div className={styles.folderChips}>
                        {foldersOf(t).map((f) => <span key={f.id} className={styles.folderChip}><FolderIcon size={11} />{f.name}</span>)}
                      </div>
                    ) : <span className={styles.muted}>—</span>}
                  </td>
                  <td className={styles.colFolder}>
                    {t.region ? <span className={styles.region}><PinIcon size={13} />{t.region}</span> : <span className={styles.muted}>—</span>}
                  </td>
                  <td className={styles.num}>
                    {t.distanceMeters != null
                      ? <span className={styles.metric}><DistanceIcon size={13} />{formatKm(t.distanceMeters)}</span>
                      : <span className={styles.muted}>—</span>}
                  </td>
                  <td className={styles.num}>
                    {t.elevationGainMeters != null
                      ? <span className={styles.metric}><ElevationIcon size={13} />{formatGain(t.elevationGainMeters)}</span>
                      : <span className={styles.muted}>—</span>}
                  </td>
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
