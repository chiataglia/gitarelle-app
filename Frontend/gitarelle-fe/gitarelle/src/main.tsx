import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import "leaflet/dist/leaflet.css";
import App from './App.tsx'
import { TreksProvider } from './features/treks/TreksContext'


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TreksProvider>
      <App />
    </TreksProvider>
  </StrictMode>,
)
