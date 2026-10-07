import { useEffect } from "react";
import { useAuth } from "../auth/AuthContext";
import { displayName } from "../auth/api";
import ProfileCard from "./components/ProfileCard";
import StatsPanel from "./components/StatsPanel";

// Pagina /profilo: dati personali e statistiche del diario
export default function ProfilePage() {
  const { user } = useAuth();

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  if (!user) return null; // AuthGate mostra questa pagina solo da collegati

  return (
    <>
      <section className="section">
        <div className="section-head">
          <span className="eyebrow">Il tuo profilo</span>
          <h2>{displayName(user)}</h2>
          <p>@{user.username}</p>
        </div>
        <ProfileCard key={user.id} user={user} />
      </section>

      <section className="section">
        <div className="section-head">
          <span className="eyebrow">I tuoi numeri</span>
          <h2>Statistiche</h2>
          <p>Raccolte dalle escursioni del diario. Distanze e dislivelli vengono dalle tracce GPX.</p>
        </div>
        <StatsPanel />
      </section>
    </>
  );
}
