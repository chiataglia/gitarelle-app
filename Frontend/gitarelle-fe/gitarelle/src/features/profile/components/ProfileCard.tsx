import { useRef, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import type { User } from "../../auth/api";
import { deleteAvatar, updateProfile, uploadAvatar } from "../api";
import { errorMessage } from "../../../shared/api";
import { formatDate } from "../../../shared/format";
import { resizeToSquare } from "../../../shared/image";
import Avatar from "./Avatar";
import styles from "./Profile.module.css";

// Dati personali: foto, nome, cognome (lo username per ora non si cambia)
export default function ProfileCard({ user }: { user: User }) {
  const { updateUser } = useAuth();
  const [firstName, setFirstName] = useState(user.firstName ?? "");
  const [lastName, setLastName] = useState(user.lastName ?? "");
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const dirty = firstName.trim() !== (user.firstName ?? "") || lastName.trim() !== (user.lastName ?? "");

  async function onSave(e: React.SyntheticEvent) {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      updateUser(await updateProfile(firstName.trim(), lastName.trim()));
      setSaved(true);
    } catch (err) {
      setError(errorMessage(err, "Errore nel salvataggio del profilo"));
    } finally {
      setSaving(false);
    }
  }

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setAvatarBusy(true);
      setError(null);
      updateUser(await uploadAvatar(await resizeToSquare(file)));
    } catch (err) {
      setError(errorMessage(err, "Errore nel caricamento della foto"));
    } finally {
      setAvatarBusy(false);
    }
  }

  async function onRemoveAvatar() {
    try {
      setAvatarBusy(true);
      setError(null);
      updateUser(await deleteAvatar());
    } catch (err) {
      setError(errorMessage(err, "Errore nella rimozione della foto"));
    } finally {
      setAvatarBusy(false);
    }
  }

  return (
    <form className={`card ${styles.profileCard}`} onSubmit={onSave}>
      <div className={styles.avatarBlock}>
        <button
          type="button"
          className={styles.avatarButton}
          onClick={() => fileInput.current?.click()}
          disabled={avatarBusy}
          aria-label="Cambia foto del profilo"
        >
          <Avatar user={user} size={112} />
          <span className={styles.avatarOverlay}>{avatarBusy ? "..." : "Cambia"}</span>
        </button>
        <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onPickAvatar} />
        <div className={styles.avatarActions}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileInput.current?.click()} disabled={avatarBusy}>
            {user.avatarVersion != null ? "Cambia foto" : "Aggiungi foto"}
          </button>
          {user.avatarVersion != null && (
            <button type="button" className={styles.linkBtn} onClick={onRemoveAvatar} disabled={avatarBusy}>
              Rimuovi
            </button>
          )}
        </div>
      </div>

      <div className={styles.profileFields}>
        <div className={styles.row2}>
          <label className="field">
            <span>Nome</span>
            <input value={firstName} onChange={(e) => { setFirstName(e.target.value); setSaved(false); }} maxLength={60} autoComplete="given-name" />
          </label>
          <label className="field">
            <span>Cognome</span>
            <input value={lastName} onChange={(e) => { setLastName(e.target.value); setSaved(false); }} maxLength={60} autoComplete="family-name" />
          </label>
        </div>
        <label className="field">
          <span>Username</span>
          <input value={user.username} readOnly disabled />
        </label>
        <p className={styles.memberSince}>Nel diario da {formatDate(user.createdAt, { month: "long", year: "numeric" })}</p>

        {error && <div className="alert alert-error">{error}</div>}

        <div className={styles.profileActions}>
          {saved && !dirty && <span className={styles.savedMsg}>✓ Salvato</span>}
          <button type="submit" className="btn btn-primary" disabled={saving || !dirty}>
            {saving ? "Salvataggio..." : "Salva profilo"}
          </button>
        </div>
      </div>
    </form>
  );
}
