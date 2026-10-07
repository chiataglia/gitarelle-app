export type Trek = {
  id: string | number;
  title: string;
  trekDate?: string;
  amichetti?: string;
  notes?: string;
  lat: number | null; // un trek può non avere ancora un punto sulla mappa
  lon: number | null;
  folderId: Folder["id"] | null; // un trek può non stare in nessuna cartella
  hasGpx: boolean;
};

// Corpo per creare/modificare un trek (lat/lon facoltativi, ma entrambi o nessuno)
export type TrekPayload = {
  title: string;
  trekDate: string | null; // "YYYY-MM-DD"
  amichetti: string;
  notes: string;
  lat: number | null;
  lon: number | null;
  folderId: Folder["id"] | null;
};

// Cartella per raggruppare i trek (es. per regione)
export type Folder = {
  id: number;
  name: string;
};

// Filtro dello storico: tutte, solo quelle senza cartella, o una cartella precisa
export type FolderFilter = "all" | "none" | Folder["id"];
