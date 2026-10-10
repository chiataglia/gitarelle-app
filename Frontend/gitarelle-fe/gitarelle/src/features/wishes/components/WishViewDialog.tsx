import { useMemo, useState, type ReactNode } from "react";
import { CircleMarker, MapContainer, Marker, TileLayer } from "react-leaflet";
import type { Wish } from "../types";
import type { ParsedGpx } from "../../../shared/gpx";
import Modal from "../../../shared/Modal";
import TrackLayer from "../../../shared/TrackLayer";
import FitWhenSized from "../../../shared/FitWhenSized";
import { TILE_ATTRIBUTION, TILE_MAX_ZOOM, TILE_URL, pinIconFor } from "../../../shared/map";
import { computeProfile, slopeColor, trackStats, type ProfilePoint } from "../../../shared/elevation";
import { formatGain, formatKm } from "../../../shared/format";
import { CalendarIcon, DistanceIcon, ElevationIcon, ExternalIcon, NotesIcon } from "../../../shared/icons";
import ElevationProfile from "../../treks/components/ElevationProfile";
import { WISH_COLOR } from "../theme";
// stessa impaginazione della scheda dei trek (info a sinistra, mappa a destra, profilo sotto)
import dialogStyles from "../../treks/components/TrekDialogs.module.css";
import styles from "./Wishes.module.css";

type Props = {
  wish: Wish;
  gpx: ParsedGpx | null; // traccia già scaricata (null se non c'è o è ancora in arrivo)
  onEdit: () => void;
  onClose: () => void;
};

// Scheda di un'idea: per valutare un percorso prima di farlo (km, dislivello, pendenze)
export default function WishViewDialog({ wish, gpx, onEdit, onClose }: Props) {
  const point = wish.lat != null && wish.lon != null ? { lat: wish.lat, lng: wish.lon } : gpx?.info.start ?? null;
  const stats = gpx ? trackStats(gpx) : null;
  const profile = useMemo(() => (gpx ? computeProfile(gpx) : null), [gpx]);
  const [profilePoint, setProfilePoint] = useState<ProfilePoint | null>(null);

  const rows: { label: string; icon: ReactNode; value: ReactNode }[] = [
    { label: "Periodo ideale", icon: <CalendarIcon />, value: wish.idealPeriod },
    {
      label: "Link",
      icon: <ExternalIcon />,
      value: wish.link && (
        <a className={styles.viewLink} href={wish.link} target="_blank" rel="noopener noreferrer">{wish.link}</a>
      ),
    },
    { label: "Distanza", icon: <DistanceIcon />, value: stats ? formatKm(stats.distance) : null },
    { label: "Dislivello", icon: <ElevationIcon />, value: stats?.gain != null ? `+${formatGain(stats.gain)}` : null },
  ];

  return (
    <Modal title={wish.name} onClose={onClose} wide>
      <div className={`${dialogStyles.editLayout} ${styles.viewLayout}`}>
        <div className={dialogStyles.fields}>
          <dl className={dialogStyles.facts}>
            {rows.map((r) => (
              <div key={r.label} title={r.label}>
                <dt>{r.icon}<span className="sr-only">{r.label}</span></dt>
                <dd className={r.value ? undefined : dialogStyles.factEmpty}>{r.value || "—"}</dd>
              </div>
            ))}
          </dl>
          <div className={dialogStyles.notes} title="Note">
            <NotesIcon />
            <span className="sr-only">Note</span>
            <p className={wish.notes ? styles.viewNotes : `${styles.viewNotes} ${dialogStyles.factEmpty}`}>{wish.notes || "Nessuna nota"}</p>
          </div>
        </div>

        <div className={`map-frame ${dialogStyles.map}`}>
          {/* l'altezza la dà il riquadro (min-height): qui la si eredita */}
          <div style={{ height: "100%", minHeight: "inherit", width: "100%" }}>
            <MapContainer center={point ?? [42.5, 12.5]} zoom={point ? 12 : 6} maxZoom={TILE_MAX_ZOOM} style={{ height: "100%", width: "100%" }}>
              <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_URL} maxZoom={TILE_MAX_ZOOM} />
              {gpx ? (
                <TrackLayer gpx={gpx} trackKey={`wish-${wish.id}`} color={WISH_COLOR} dashed />
              ) : point ? (
                <Marker position={point} icon={pinIconFor(WISH_COLOR)} />
              ) : null}
              {profilePoint && (
                <CircleMarker
                  center={[profilePoint.lat, profilePoint.lng]}
                  radius={7}
                  pathOptions={{ color: "#fff", weight: 3, fillColor: slopeColor(profilePoint.slope), fillOpacity: 1 }}
                />
              )}
              <FitWhenSized gpx={gpx} point={point} />
            </MapContainer>
          </div>
        </div>

        {wish.hasGpx && (
          <div className={`${dialogStyles.full} ${dialogStyles.profile}`}>
            {profile ? (
              <ElevationProfile profile={profile} onHover={setProfilePoint} />
            ) : (
              <p className={dialogStyles.hint}>
                {gpx ? "Questo GPX non contiene le quote: il profilo altimetrico non è disponibile." : "Caricamento del profilo altimetrico…"}
              </p>
            )}
          </div>
        )}

        <div className={`${dialogStyles.footer} ${dialogStyles.full}`}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Chiudi</button>
          <button type="button" className={`btn ${styles.btnWish}`} onClick={onEdit}>Modifica idea</button>
        </div>
      </div>
    </Modal>
  );
}
