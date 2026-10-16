import { useEffect, useRef } from "react";
import { Link, NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import HomePage from "./HomePage";
import HistoryPage from "./features/treks/HistoryPage";
import NewTrekPage from "./features/treks/NewTrekPage";
import WishesPage from "./features/wishes/WishesPage";
import ProfilePage from "./features/profile/ProfilePage";
import AccountMenu from "./features/profile/components/AccountMenu";
import { useAuth } from "./features/auth/AuthContext";
import BrandMark from "./shared/BrandMark";
import styles from "./App.module.css";

const NAV = [
  { to: "/storico", label: "Storico" },
  { to: "/nuova", label: "Nuova" },
  { to: "/idee", label: "Da fare" },
];

function App() {
  const { user, logout } = useAuth();

  // cambiando pagina si riparte dall'alto; con un #sezione (menu del profilo) si scende lì.
  // Dipende da key: un nuovo clic sulla stessa sezione riporta comunque lì
  const { pathname, hash, key } = useLocation();
  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0 });
      return;
    }
    const target = () => document.getElementById(hash.slice(1));
    const frame = requestAnimationFrame(() => target()?.scrollIntoView({ block: "start" }));
    // scorrimento morbido da index.css (scroll-behavior), che lo spegne con "riduci movimento".
    // I dati sopra la sezione arrivano dopo e la spostano: un secondo aggiustamento, se serve
    const retry = window.setTimeout(() => {
      const top = target()?.getBoundingClientRect().top;
      const headerH = headerRef.current?.offsetHeight ?? 0;
      if (top != null && Math.abs(top - headerH) > 8) target()?.scrollIntoView({ block: "start" });
    }, 700);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(retry);
    };
  }, [pathname, hash, key]);

  // altezza vera dell'header (su mobile va su due righe) in --header-h: l'altezza delle mappe ne tiene conto
  const headerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const update = () => document.documentElement.style.setProperty("--header-h", `${header.offsetHeight}px`);
    const observer = new ResizeObserver(update);
    observer.observe(header);
    update();
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <header ref={headerRef} className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.brand}>
            <BrandMark />
            Gitarelle
          </Link>
          <nav className={styles.nav}>
            {NAV.map(({ to, label }) => (
              <NavLink key={to} to={to} className={({ isActive }) => (isActive ? styles.navActive : undefined)}>
                {label}
              </NavLink>
            ))}
          </nav>
          {user && <AccountMenu user={user} onLogout={logout} />}
        </div>
      </header>

      <div className="app-container" id="top">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/storico" element={<HistoryPage />} />
          <Route path="/nuova" element={<NewTrekPage />} />
          <Route path="/idee" element={<WishesPage />} />
          <Route path="/profilo" element={<ProfilePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      <footer className={styles.footer}>
        Gitarelle · mappe © OpenStreetMap
      </footer>
    </>
  )
}

export default App
