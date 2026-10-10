import type { Trek } from "../treks/types";
import { parseGpx, type ParsedGpx } from "../../shared/gpx";

// Un file del caricamento multiplo, con i dati del trek che verrà creato
export type BulkItem = {
  key: string;
  file: File;
  gpx: ParsedGpx | null; // null se il file non si legge
  title: string;
  trekDate: string;
  selected: boolean;
  duplicate: boolean; // esiste già un trek con stesso titolo e data
  status: "pending" | "saving" | "done" | "error";
  error?: string;
};

export const hasTrack = (gpx: ParsedGpx | null) => Boolean(gpx?.bounds);

const sameTrek = (t: Trek, title: string, date: string) =>
  t.title.trim().toLowerCase() === title.trim().toLowerCase() && (t.trekDate ?? "") === date;

// Legge i file e precompila titolo/data come nel caricamento singolo
export async function readGpxFiles(files: File[], treks: Trek[], today: string): Promise<BulkItem[]> {
  return Promise.all(files.map(async (file, i) => {
    let gpx: ParsedGpx | null = null;
    try {
      gpx = parseGpx(await file.text());
    } catch {
      // file illeggibile: resta in lista, deselezionato
    }
    const title = gpx?.info.name ?? file.name.replace(/\.gpx$/i, "");
    const trekDate = gpx?.info.date ?? today;
    const duplicate = treks.some((t) => sameTrek(t, title, trekDate));
    return {
      key: `${i}-${file.name}`,
      file,
      gpx,
      title,
      trekDate,
      selected: hasTrack(gpx) && !duplicate,
      duplicate,
      status: "pending" as const,
    };
  }));
}
