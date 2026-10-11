import { useEffect, useRef, useState } from "react";

// Schermo intero per un elemento (es. il riquadro di una mappa).
// Usa la Fullscreen API del browser; dove manca (iPhone) l'elemento si allarga solo alla finestra
// tramite la classe che il chiamante applica quando `fallback` è true.
export function useFullscreen<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [native, setNative] = useState(false);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const onChange = () => setNative(document.fullscreenElement != null && document.fullscreenElement === ref.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Esc chiude il fallback (quello nativo lo gestisce già il browser)
  useEffect(() => {
    if (!fallback) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFallback(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [fallback]);

  function toggle() {
    if (native) {
      void document.exitFullscreen();
    } else if (fallback) {
      setFallback(false);
    } else if (ref.current?.requestFullscreen && document.fullscreenEnabled) {
      ref.current.requestFullscreen().catch(() => setFallback(true));
    } else {
      setFallback(true);
    }
  }

  return { ref, isFullscreen: native || fallback, fallback, toggle };
}
