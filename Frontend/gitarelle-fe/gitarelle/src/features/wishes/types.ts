// Tour da fare (wish list): separato dai trek dello storico.
// Può essere solo un nome, oppure avere un punto, un link esterno e/o una traccia gpx.
export type Wish = {
  id: number;
  name: string;
  notes: string | null;
  link: string | null;        // es. Komoot, Wikiloc, AllTrails...
  idealPeriod: string | null; // testo libero: "estate", "ottobre"...
  lat: number | null;
  lon: number | null;
  createdAt: string;
  hasGpx: boolean;
};

export type WishPayload = {
  name: string;
  notes: string | null;
  link: string | null;
  idealPeriod: string | null;
  lat: number | null;
  lon: number | null;
};
