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
    </div>
  )
}

export default App
