export type Trek = {
  id: string | number;
  title: string;
  trekDate?: string;
  amichetti?: string;
  notes?: string;
  lat: number | null; // un trek può non avere ancora un punto sulla mappa
  lon: number | null;
  region: string | null; // regione italiana o "Estero", calcolata dal backend; null senza punto né gpx
  folderIds: Folder["id"][]; // cartelle in cui sta il trek: nessuna, una o più
  createdAt: string; // quando è stato aggiunto al diario (ISO)
  hasGpx: boolean;
  distanceMeters: number | null;      // dal gpx (null se non c'è)
  elevationGainMeters: number | null; // dislivello positivo, dal gpx
};

// Corpo per creare/modificare un trek (lat/lon facoltativi, ma entrambi o nessuno)
export type TrekPayload = {
  title: string;
  trekDate: string | null; // "YYYY-MM-DD"
  amichetti: string;
  notes: string;
  lat: number | null;
  lon: number | null;
  folderIds: Folder["id"][];
};

// Cartella per raggruppare i trek a piacere (es. Weekend, Dolomiti); la regione invece la calcola il backend
export type Folder = {
  id: number;
  name: string;
};

// Filtro dello storico: tutte, solo quelle senza cartella, o una cartella precisa
export type FolderFilter = "all" | "none" | Folder["id"];

// regione dei trek fuori dall'Italia (stesso valore di RegionLocator.ABROAD nel backend)
export const ABROAD = "Estero";
