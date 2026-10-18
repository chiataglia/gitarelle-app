import { SORT_OPTIONS, type TrekSort, type TrekSortKey } from "../trekSort";
import Dropdown from "../../../shared/Dropdown";
import styles from "./TrekSortSelect.module.css";

type Props = {
  value: TrekSort;
  onChange: (sort: TrekSort) => void;
};

// "Ordina per" dello storico, accanto ai filtri: la voce parte dal verso più utile, la freccia lo inverte
export default function TrekSortSelect({ value, onChange }: Props) {
  const pick = (key: string) => {
    const option = SORT_OPTIONS.find((o) => o.key === key)!;
    onChange({ key: option.key as TrekSortKey, desc: option.desc });
  };
  // per i nomi "decrescente" è Z→A, per le date "più recenti", per i numeri "dal più alto"
  const dirLabel = value.key === "title"
    ? (value.desc ? "Z→A" : "A→Z")
    : value.key === "date" || value.key === "created"
      ? (value.desc ? "Prima i più recenti" : "Prima i più vecchi")
      : (value.desc ? "Prima i più alti" : "Prima i più bassi");

  return (
    <div className={styles.wrap}>
      <span className={styles.label}>Ordina per</span>
      <div className={styles.select}>
        <Dropdown
          label="Ordina per"
          value={value.key}
          onChange={pick}
          options={SORT_OPTIONS.map((o) => ({ value: o.key, label: o.label }))}
        />
      </div>
      <button
        type="button"
        className={styles.dir}
        onClick={() => onChange({ ...value, desc: !value.desc })}
        title={`${dirLabel} (clic per invertire)`}
        aria-label={`Verso: ${dirLabel}. Inverti`}
      >
        {value.desc ? "↓" : "↑"}
      </button>
    </div>
  );
}
