import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './deck.css'
import './index.css'
import App from './App'

// HashRouter y no BrowserRouter: GitHub Pages sirve estatico, sin reescritura
// de rutas, asi que /clip daria 404 al recargar o al abrir el enlace directo.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
