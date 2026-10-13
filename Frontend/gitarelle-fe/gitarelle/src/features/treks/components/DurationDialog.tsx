import type { ParsedGpx } from "../../../shared/gpx";
import { hikingMinutes, recordedTimes, trackStats } from "../../../shared/elevation";
import { formatDuration } from "../../../shared/format";
import Modal from "../../../shared/Modal";
import styles from "./DurationDialog.module.css";

type Props = {
  gpx: ParsedGpx;
  onClose: () => void;
};

const clock = (ms: number) => new Date(ms).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
const day = (ms: number) => new Date(ms).toLocaleDateString("it-IT", { day: "numeric", month: "short" });

// Dettaglio del tempo di un trek registrato col gps: partenza, arrivo, soste e confronto con la stima DIN 33466
export default function DurationDialog({ gpx, onClose }: Props) {
  const rec = recordedTimes(gpx);
  const stats = trackStats(gpx);
  const din = hikingMinutes(stats);
  if (!rec) return null;

  // al minuto, così movimento + soste fa esattamente la durata totale mostrata
  const total = Math.round((rec.end - rec.start) / 60000);
  const moving = Math.min(Math.round(rec.movingMinutes), total);
  const pauses = total - moving;
  // se l'uscita è durata più di un giorno (es. trekking con pernotto) gli orari portano anche la data
  const multiDay = new Date(rec.start).toDateString() !== new Date(rec.end).toDateString();
  const when = (ms: number) => (multiDay ? `${day(ms)}, ${clock(ms)}` : clock(ms));

  // barre proporzionali al più lungo tra durata totale e stima
  const max = Math.max(total, din ?? 0);
  const pct = (m: number) => `${max > 0 ? (m / max) * 100 : 0}%`;

  const diff = din != null ? moving - din : null;
  const diffPct = din ? Math.round((Math.abs(diff!) / din) * 100) : 0;

  return (
    <Modal title="Tempo di percorrenza" onClose={onClose}>
      <div className={styles.body}>
        <div className={styles.times}>
          <div>
            <span>Partenza</span>
            <b>{when(rec.start)}</b>
          </div>
          <div className={styles.arrow} aria-hidden="true">→</div>
          <div>
            <span>Arrivo</span>
            <b>{when(rec.end)}</b>
          </div>
        </div>

        <dl className={styles.bars}>
          <div>
            <dt>Durata totale</dt>
            <dd>{formatDuration(total, 1)}</dd>
            <div className={styles.track}>
              <div className={styles.barMoving} style={{ width: pct(moving) }} />
              <div className={styles.barPause} style={{ width: pct(pauses) }} />
            </div>
          </div>
          <div className={styles.legend}>
            <span><i className={styles.dotMoving} />In movimento <b>{formatDuration(moving, 1)}</b></span>
            <span><i className={styles.dotPause} />Soste <b>{formatDuration(pauses, 1)}</b></span>
          </div>
          {din != null && (
            <div>
              <dt>Stima DIN 33466</dt>
              <dd>{formatDuration(din, 1)}</dd>
              <div className={styles.track}>
                <div className={styles.barEstimate} style={{ width: pct(din) }} />
              </div>
            </div>
          )}
        </dl>

        {diff != null && (
          <p className={styles.verdict}>
            {Math.abs(diff) < 5
              ? "In movimento ci hai messo quanto la stima."
              : diff < 0
                ? <>In movimento ci hai messo <b>{formatDuration(-diff, 1)} in meno</b> della stima (−{diffPct}%).</>
                : <>In movimento ci hai messo <b>{formatDuration(diff, 1)} in più</b> della stima (+{diffPct}%).</>}
          </p>
        )}

        <p className={styles.note}>
          Soste: i tratti percorsi a meno di ~0,9 km/h senza salire né scendere.
          {din != null && " La stima DIN 33466 considera 4 km/h in piano, 300 m/h in salita e 500 m/h in discesa, senza soste."}
        </p>
      </div>
    </Modal>
  );
}
