import TrekList from "./components/TrekList";

// Pagina /storico: lista dei trek, dettaglio e confronto sulla mappa
export default function HistoryPage() {
  return (
    <section className="section page page-compact">
      <TrekList />
    </section>
  );
}
