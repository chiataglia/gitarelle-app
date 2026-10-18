import { useState } from "react";
import type { Trek } from "../types";
import { useTreks } from "../TreksContext";
import { fetchGpxText } from "../api";
import { useGpxTracks } from "../../../shared/useGpxTracks";
import { trekColor } from "../../../shared/map";
import TrekViewDialog from "./TrekViewDialog";
import TrekEditDialog from "./TrekEditDialog";
import TrekDeleteDialog from "./TrekDeleteDialog";

// Scheda di un trek aperta fuori dallo storico (home, calendario): scarica da sola la traccia
// e gestisce da sé modifica ed eliminazione (che si aprono sopra la scheda)
export default function TrekQuickView({ trekId, onClose }: { trekId: Trek["id"]; onClose: () => void }) {
  const { treks } = useTreks();
  const trek = treks.find((t) => t.id === trekId) ?? null;
  const gpxTracks = useGpxTracks(trek?.hasGpx ? [trek.id] : [], fetchGpxText);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  if (!trek) return null;
  return (
    <>
      <TrekViewDialog
        trek={trek}
        gpx={trek.hasGpx ? gpxTracks.trackOf(trek.id) : null}
        color={trekColor(trek)}
        onClose={onClose}
        onEdit={() => setEditing(true)}
        onDelete={() => setDeleting(true)}
      />
      {editing && <TrekEditDialog trek={trek} onClose={() => setEditing(false)} />}
      {deleting && <TrekDeleteDialog treks={[trek]} onClose={() => setDeleting(false)} onDeleted={onClose} />}
    </>
  );
}
