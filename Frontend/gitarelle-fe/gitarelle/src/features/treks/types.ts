export type Trek = {
  id: string | number;
  title: string;
  trekDate?: string;
  amichetti?: string;
  notes?: string;
  lat: number | null; // un trek può non avere ancora un punto sulla mappa
  lon: number | null;
  region: string | null; // regione italiana o "Estero", calcolata dal backend; null senza punto né gpx
  color: string | null;  // colore della traccia scelto dall'utente ("#rrggbb"); null = automatico (vedi trekColor)
  folderIds: Folder["id"][]; // cartelle in cui sta il trek: nessuna, una o più
  createdAt: string; // quando è stato aggiunto al diario (ISO)
  // valutazione (null finché non data): il testo della recensione sono le note
  rating: number | null;      // stelle da 1 a 5, a mezzi punti
  effort: number | null;      // fatica da 1 a 10
  scenery: number | null;     // paesaggio da 1 a 10
  effortLabel: string | null;  // scritta propria del voto di fatica (null = automatica, vedi effortText)
  sceneryLabel: string | null; // idem per il paesaggio
  dangerous: boolean | null;  // tratti pericolosi (null = non indicato)
  tags: string[];             // etichette del percorso (vedi TAG_GROUPS)
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
  // solo alla creazione (dopo si cambiano con updateTrekReview e updateTrekColor; la modifica li ignora)
  review?: TrekReview;
  color?: string | null;
};

// Corpo per salvare la valutazione di un trek
export type TrekReview = Pick<Trek, "rating" | "effort" | "scenery" | "effortLabel" | "sceneryLabel" | "dangerous" | "tags"> & { notes: string };

// Cartella per raggruppare i trek a piacere (es. Weekend, Dolomiti); la regione invece la calcola il backend
export type Folder = {
  id: number;
  name: string;
};

// Filtro dello storico: tutte, solo quelle senza cartella, o una cartella precisa
export type FolderFilter = "all" | "none" | Folder["id"];

// regione dei trek fuori dall'Italia (stesso valore di RegionLocator.ABROAD nel backend)
export const ABROAD = "Estero";
