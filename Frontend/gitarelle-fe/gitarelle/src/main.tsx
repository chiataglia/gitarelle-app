import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import "leaflet/dist/leaflet.css";
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { TreksProvider } from './features/treks/TreksContext'
import { AuthProvider } from './features/auth/AuthContext'
import AuthGate from './features/auth/AuthGate'


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        {/* i dati si caricano solo dopo il login, e vengono buttati via al logout */}
        <AuthGate>
          <TreksProvider>
            <App />
          </TreksProvider>
        </AuthGate>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
