import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import GpxViewer from "./features/gpx/components/GpxViewer";
import TrekCreate from "./features/treks/components/TrekCreate";
import Trek from "./features/treks/components/TrekList";
import WishBoard from "./features/wishes/components/WishBoard";
import styles from "./App.module.css";

// Pagina principale: diario, nuova escursione, GPX e idee
export default function HomePage() {
  const { hash, key } = useLocation();

  // arrivando da un'altra pagina con un link tipo "/#storico" il router non scorre da solo alla sezione
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash, key]);

  return (
    <>
      <section className={styles.hero}>
        <span className="eyebrow">Diario di escursioni</span>
        <h1>
          Ogni sentiero,<br />
          <em>una storia da ricordare.</em>
        </h1>
        <p>
          Segna dove sei stato, con chi e cosa hai visto. Carica la traccia GPX e
          ritrova il percorso sulla mappa quando vuoi.
        </p>
        <div className={styles.heroActions}>
          <a href="#nuova" className="btn btn-primary">+ Nuova escursione</a>
          <a href="#storico" className="btn btn-ghost">Sfoglia lo storico</a>
        </div>
      </section>

      <section id="storico" className="section section-screen">
        <Trek />
      </section>

      <section id="nuova" className="section section-screen">
        <TrekCreate />
      </section>

      <section id="gpx" className="section section-screen">
        <div className="section-head">
          <span className="eyebrow">Tracce</span>
          <h2>Carica un GPX</h2>
          <p>Trascina il file, controlla il percorso e crea subito l'escursione, oppure collegalo a una già esistente. Puoi anche caricare più GPX insieme.</p>
        </div>
        <GpxViewer />
      </section>

      <section id="idee" className="section section-screen">
        <WishBoard />
      </section>
    </>
  );
}
