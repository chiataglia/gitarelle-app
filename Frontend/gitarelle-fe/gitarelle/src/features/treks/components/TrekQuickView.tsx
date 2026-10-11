import type { Trek } from "../types";
import { useTreks } from "../TreksContext";
import { fetchGpxText } from "../api";
import { useGpxTracks } from "../../../shared/useGpxTracks";
import { colorForId } from "../../../shared/map";
import TrekViewDialog from "./TrekViewDialog";

// Scheda di un trek aperta fuori dallo storico (home, calendario): scarica da sola la traccia
export default function TrekQuickView({ trekId, onClose }: { trekId: Trek["id"]; onClose: () => void }) {
  const { treks } = useTreks();
  const trek = treks.find((t) => t.id === trekId) ?? null;
  const gpxTracks = useGpxTracks(trek?.hasGpx ? [trek.id] : [], fetchGpxText);
  if (!trek) return null;
  return (
    <TrekViewDialog
      trek={trek}
      gpx={trek.hasGpx ? gpxTracks.trackOf(trek.id) : null}
      color={colorForId(trek.id)}
      onClose={onClose}
    />
  );
}
