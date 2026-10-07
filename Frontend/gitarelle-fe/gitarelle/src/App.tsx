import GpxViewer from "./features/gpx/components/GpxViewer";
import TrekCreate from "./features/treks/components/TrekCreate";
import Trek from "./features/treks/components/TrekList"
import styles from "./App.module.css";

function App() {
  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <a href="#top" className={styles.brand}>
            <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
              <rect width="32" height="32" rx="8" fill="var(--accent)" />
              <path d="M4 25 L13 10 L18 18 L21 14 L28 25 Z" fill="var(--bg-2)" />
            </svg>
            Gitarelle
          </a>
          <nav className={styles.nav}>
            <a href="#storico">Storico</a>
            <a href="#nuova">Nuova</a>
            <a href="#gpx">GPX</a>
          </nav>
        </div>
      </header>

      <div className="app-container" id="top">
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

        <section id="storico" className="section">
          <Trek />
        </section>

        <section id="nuova" className="section">
          <TrekCreate />
        </section>

        <section id="gpx" className="section">
          <div className="section-head">
            <span className="eyebrow">Tracce</span>
            <h2>Carica un GPX</h2>
            <p>Trascina il file, controlla il percorso e crea subito l'escursione, oppure collegalo a una già esistente.</p>
          </div>
          <GpxViewer />
        </section>
      </div>

      <footer className={styles.footer}>
        Gitarelle · mappe © OpenStreetMap
      </footer>
    </>
  )
}

export default App
