import GpxViewer from "./features/gpx/components/GpxViewer";
import EscursioniTest from "./features/treks/components/EscursioniTest";
import TrekCreate from "./features/treks/components/TrekCreate";
import Trek from "./features/treks/components/TrekList"

function App() {
  return (
    <div className="app-container">
      <h1>Gitarelle</h1>
       <EscursioniTest />
       <TrekCreate />
       <Trek />
       <h2>GPX → GeoJSON → Leaflet</h2>
       <GpxViewer />
    </div>
  )
}

export default App
