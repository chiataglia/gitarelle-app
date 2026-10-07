import { API_URL } from "../../../shared/api";
import type { User } from "../../auth/api";
import styles from "./Profile.module.css";

const initials = (u: User) =>
  ((u.firstName?.[0] ?? "") + (u.lastName?.[0] ?? "")).toUpperCase() || u.username[0].toUpperCase();

// Foto del profilo, o le iniziali su sfondo menta se non c'è.
// ?v= cambia a ogni nuova immagine, così il browser non mostra quella vecchia dalla cache.
export default function Avatar({ user, size = 30 }: { user: User; size?: number }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.42) };
  if (user.avatarVersion != null) {
    return <img className={styles.avatar} style={style} src={`${API_URL}/profile/avatar?v=${user.avatarVersion}`} alt="" />;
  }
  return (
    <span className={`${styles.avatar} ${styles.avatarInitials}`} style={style} aria-hidden="true">
      {initials(user)}
    </span>
  );
}
