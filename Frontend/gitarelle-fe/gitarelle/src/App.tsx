import { useEffect, useRef } from "react";
import { Link, NavLink, Navigate, Route, Routes } from "react-router-dom";
import HomePage from "./HomePage";
import ProfilePage from "./features/profile/ProfilePage";
import Avatar from "./features/profile/components/Avatar";
import { useAuth } from "./features/auth/AuthContext";
import { displayName } from "./features/auth/api";
import BrandMark from "./shared/BrandMark";
import styles from "./App.module.css";

function App() {
  const { user, logout } = useAuth();

  // altezza vera dell'header (su mobile va su due righe) in --header-h: le sezioni a tutto schermo
  // e lo scroll verso le ancore ne tengono conto
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
            <Link to="/#storico">Storico</Link>
            <Link to="/#nuova">Nuova</Link>
            <Link to="/#gpx">GPX</Link>
            <Link to="/#idee">Da fare</Link>
          </nav>
          {user && (
            <div className={styles.account}>
              <NavLink
                to="/profilo"
                className={({ isActive }) => `${styles.profileLink} ${isActive ? styles.profileLinkActive : ""}`}
                title="Il tuo profilo"
              >
                <Avatar user={user} size={30} />
                <span className={styles.username}>{displayName(user)}</span>
              </NavLink>
              <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>Esci</button>
            </div>
          )}
        </div>
      </header>

      <div className="app-container" id="top">
        <Routes>
          <Route path="/" element={<HomePage />} />
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
