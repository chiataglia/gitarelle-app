import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Folder, Trek } from "./types";
import { fetchFolders, fetchTreks } from "./api";
import { errorMessage } from "../../shared/api";

// Stato condiviso dei trek: lista, mappa GPX e form leggono/aggiornano la stessa lista,
// così un trek appena creato o modificato compare ovunque senza ricaricare la pagina.
type TreksContextValue = {
  treks: Trek[];
  folders: Folder[]; // in ordine alfabetico
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  upsertTrek: (trek: Trek) => void; // aggiunge un trek nuovo o sostituisce quello con lo stesso id
  removeTrek: (id: Trek["id"]) => void;
  upsertFolder: (folder: Folder) => void;
  removeFolder: (id: Folder["id"]) => void; // i suoi trek restano, senza cartella
};

const TreksContext = createContext<TreksContextValue | null>(null);

const byName = (a: Folder, b: Folder) => a.name.localeCompare(b.name, "it", { sensitivity: "base" });

export function TreksProvider({ children }: { children: ReactNode }) {
  const [treks, setTreks] = useState<Trek[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [t, f] = await Promise.all([fetchTreks(), fetchFolders()]);
      setTreks(t);
      setFolders(f);
    } catch (e) {
      setError(errorMessage(e, "Errore fetch"));
    } finally {
      setLoading(false);
    }
  }, []);

  const upsertTrek = useCallback((trek: Trek) => {
    setTreks((prev) =>
      prev.some((t) => t.id === trek.id)
        ? prev.map((t) => (t.id === trek.id ? trek : t))
        : [...prev, trek]
    );
  }, []);

  const removeTrek = useCallback((id: Trek["id"]) => {
    setTreks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const upsertFolder = useCallback((folder: Folder) => {
    setFolders((prev) => [...prev.filter((f) => f.id !== folder.id), folder].sort(byName));
  }, []);

  const removeFolder = useCallback((id: Folder["id"]) => {
    setFolders((prev) => prev.filter((f) => f.id !== id));
    setTreks((prev) => prev.map((t) => (t.folderId === id ? { ...t, folderId: null } : t)));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <TreksContext.Provider value={{ treks, folders, loading, error, reload, upsertTrek, removeTrek, upsertFolder, removeFolder }}>
      {children}
    </TreksContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTreks() {
  const ctx = useContext(TreksContext);
  if (!ctx) throw new Error("useTreks va usato dentro <TreksProvider>");
  return ctx;
}
