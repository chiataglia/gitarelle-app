import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { displayName, type User } from "../../auth/api";
import Avatar from "./Avatar";
import { ChevronDownIcon } from "../../../shared/icons";
import styles from "../../../App.module.css";

// sezioni della pagina /profilo (gli id sono in ProfilePage)
const SECTIONS = [
  { hash: "#dati", label: "Il tuo profilo" },
  { hash: "#numeri", label: "I tuoi numeri" },
  { hash: "#calendario", label: "Calendario" },
];

const CLOSE_DELAY_MS = 150; // margine per passare dal nome alla tendina senza chiuderla

type Props = { user: User; onLogout: () => void };

// Avatar nell'header (il nome sta in cima alla tendina): al passaggio del mouse apre la tendina con le sezioni del profilo e "Esci".
// Su touch (niente hover) il primo tocco apre la tendina invece di andare al profilo
export default function AccountMenu({ user, onLogout }: Props) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const pointerType = useRef<string>("mouse");

  const show = () => {
    window.clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const hideSoon = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };
  const close = () => {
    window.clearTimeout(closeTimer.current);
    setOpen(false);
  };

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  // tocco fuori o Esc: chiude
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={box}
      className={`${styles.account} ${open ? styles.accountOpen : ""}`}
      onPointerEnter={(e) => { if (e.pointerType === "mouse") show(); }}
      onPointerLeave={(e) => { if (e.pointerType === "mouse") hideSoon(); }}
      onFocus={show}
      onBlur={(e) => { if (!box.current?.contains(e.relatedTarget as Node)) hideSoon(); }}
    >
      <NavLink
        to="/profilo"
        className={({ isActive }) => `${styles.profileLink} ${isActive ? styles.profileLinkActive : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Profilo di ${displayName(user)}`}
        onPointerDown={(e) => { pointerType.current = e.pointerType; }}
        onClick={(e) => {
          if (pointerType.current !== "mouse" && !open) {
            e.preventDefault();
            setOpen(true);
          } else {
            close();
          }
        }}
      >
        <Avatar user={user} size={32} />
        <span className={styles.accountChevron}><ChevronDownIcon size={16} /></span>
      </NavLink>

      <div className={styles.accountMenu} role="menu" aria-label="Profilo">
        <div className={styles.accountPanel}>
          <div className={styles.accountWho} style={{ "--i": 0 } as React.CSSProperties}>
            <strong>{displayName(user)}</strong>
            <small>@{user.username}</small>
          </div>
          {/* --i: ritardo dell'ingresso a cascata delle voci */}
          {SECTIONS.map((s, i) => (
            <Link key={s.hash} to={`/profilo${s.hash}`} role="menuitem" tabIndex={open ? 0 : -1} onClick={close}
              style={{ "--i": i + 1 } as React.CSSProperties}>
              {s.label}
            </Link>
          ))}
          <hr />
          <button
            type="button"
            role="menuitem"
            tabIndex={open ? 0 : -1}
            className={styles.accountLogout}
            style={{ "--i": SECTIONS.length + 1 } as React.CSSProperties}
            onClick={() => { close(); onLogout(); }}
          >
            Esci
          </button>
        </div>
      </div>
    </div>
  );
}
