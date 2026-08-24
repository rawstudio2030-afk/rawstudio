import { useEffect, useRef, useState } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { useSesion } from './lib/sesion'
import { GuardiaRutas, BarraInferior, HuecoBarra } from './components/Navegacion'
import CierrePorInactividad from './components/CierrePorInactividad'
import Launch from './screens/Launch'
import AgeGate from './screens/AgeGate'
import ClipDetail from './screens/ClipDetail'
import Explorar from './screens/Explorar'
import Wallet from './screens/Wallet'
import CreatorProfile from './screens/CreatorProfile'
import Upload from './screens/Upload'
import Earnings from './screens/Earnings'
import Library from './screens/Library'
import Chat from './screens/Chat'
import Creators from './screens/Creators'
import Acceso from './screens/Acceso'
import Entrar from './screens/Entrar'
import PerfilPropio from './screens/Perfil'
import Admin from './screens/Admin'
import Estudio from './screens/Estudio'
import NuevaClave from './screens/NuevaClave'
import Verificar from './screens/Verificar'
import { Privacidad, Terminos } from './screens/Legal'
import AltaCreadora from './screens/AltaCreadora'

export const SCREENS = [
  { path: '/',          n: '00', title: 'Launch',         el: <Launch /> },
  { path: '/age',       n: '01', title: 'Age gate',       el: <AgeGate /> },
  { path: '/clip',      n: '02', title: 'Explorar',       el: <Explorar /> },
  { path: '/wallet',    n: '03', title: 'Wallet',         el: <Wallet /> },
  { path: '/creator',   n: '04', title: 'Creator',        el: <CreatorProfile /> },
  { path: '/perfil',    n: '13', title: 'Mi perfil',      el: <PerfilPropio /> },
  { path: '/admin',     n: '14', title: 'Administración', el: <Admin /> },
  { path: '/estudio',   n: '15', title: 'Estudio',        el: <Estudio /> },
  { path: '/nueva-clave', n: '16', title: 'Contraseña nueva', el: <NuevaClave /> },
  { path: '/verificar', n: '17', title: 'Verificar identidad', el: <Verificar /> },
  { path: '/privacidad', n: '18', title: 'Aviso de privacidad', el: <Privacidad /> },
  { path: '/terminos',  n: '19', title: 'Términos',        el: <Terminos /> },
  { path: '/alta-creadora', n: '20', title: 'Alta de creadora', el: <AltaCreadora /> },
  { path: '/upload',    n: '05', title: 'Upload',         el: <Upload /> },
  { path: '/earnings',  n: '06', title: 'Earnings',       el: <Earnings /> },
  { path: '/library',   n: '07', title: 'Library',        el: <Library /> },
  { path: '/chat',      n: '08', title: 'Chat',           el: <Chat /> },
  { path: '/creadoras', n: '09', title: 'Para creadoras', el: <Creators /> },
  { path: '/entrar',    n: '10', title: 'La puerta',      el: <Entrar /> },
  { path: '/registro',  n: '11', title: 'Crear cuenta',   el: <Acceso modo="registro" /> },
  { path: '/acceso',    n: '12', title: 'Ya tengo cuenta', el: <Acceso modo="acceso" /> },
]

/* Indice de pantallas: SOLO herramienta de desarrollo. Se abre agregando
   ?dev=1 a la URL. Antes salia siempre y a todo el mundo, con las 15 pantallas
   revueltas —incluidas Launch, el age gate y Administracion—, que es justo lo
   contrario de ayudar a encontrar las cosas. */
function IndiceDesarrollo() {
  const [open, setOpen] = useState(false)
  const nav = useNavigate()
  const here = useLocation().pathname
  const activo = new URLSearchParams(window.location.search).get('dev') === '1'
  if (!activo) return null

  const go = (p: string) => { nav(p); setOpen(false) }

  return (
    <>
      <button onClick={() => setOpen(!open)} aria-label="Indice de pantallas"
        style={{
          position: 'fixed', right: 14, bottom: 84, zIndex: 9999,
          width: 40, height: 40, borderRadius: '50%', border: 'none',
          background: open ? '#C8FF3D' : 'rgba(110,106,114,.9)',
          color: open ? '#08080A' : '#fff', cursor: 'pointer',
          font: "700 13px/1 'Space Grotesk', system-ui, sans-serif",
        }}>{open ? '×' : 'dev'}</button>

      {open && (
        <div onClick={() => setOpen(false)} style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(8,8,10,.95)', backdropFilter: 'blur(6px)',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '24px 18px 78px', boxSizing: 'border-box', overflowY: 'auto',
        }}>
          <div style={{
            font: "700 10px/1 'Space Grotesk', system-ui, sans-serif",
            letterSpacing: 2.4, textTransform: 'uppercase',
            color: '#6E6A72', marginBottom: 14,
          }}>Índice de desarrollo · {SCREENS.length} pantallas</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {SCREENS.map(s => {
              const act = s.path === here
              return (
                <div key={s.path} onClick={e => { e.stopPropagation(); go(s.path) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '11px 12px', cursor: 'pointer',
                    background: act ? 'rgba(255,43,209,.14)' : 'transparent',
                    borderLeft: `2px solid ${act ? '#FF2BD1' : 'transparent'}`,
                  }}>
                  <span style={{
                    font: "700 10px/1 'Space Mono', monospace",
                    color: '#08080A', background: act ? '#FF2BD1' : '#C8FF3D',
                    padding: '5px 6px',
                  }}>{s.n}</span>
                  <span style={{
                    font: "500 14px/1 'Space Grotesk', system-ui, sans-serif",
                    color: act ? '#fff' : '#9C979F',
                  }}>{s.title}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}

/* Al aterrizar con sesion recien hecha, si el perfil no tiene confirmada la
   mayoria de edad se manda al age gate.

   Por que no basta con localStorage: los enlaces de correo se abren muy seguido
   en el navegador interno de la app de correo, que es otro contexto. La marca
   local se pierde y la puerta quedaria sin cruzar. El perfil es estado del
   servidor y viaja con la cuenta, no con el dispositivo. */
function GuardiaEdad() {
  const { sesion, perfil, cargando } = useSesion()
  const nav = useNavigate()
  const aqui = useLocation().pathname
  const yaMandado = useRef(false)

  useEffect(() => {
    if (cargando || !sesion || !perfil) return
    if (perfil.adult_confirmed_at) return
    if (yaMandado.current) return
    // El indice de pantallas del prototipo debe seguir sirviendo para saltar
    // libremente, asi que esto corre una sola vez por sesion, no en cada ruta.
    yaMandado.current = true
    if (aqui !== '/age') nav('/age')
  }, [cargando, sesion, perfil, aqui, nav])

  return null
}

export default function App() {
  return (
    <>
      <Routes>
        {SCREENS.map(s => <Route key={s.path} path={s.path} element={s.el} />)}
        {/* Perfil publico por handle. No entra al indice de pantallas porque
            necesita un parametro y ahi no habria cual usar. */}
        <Route path="/creator/:handle" element={<CreatorProfile />} />
        <Route path="/clip/:id" element={<ClipDetail />} />
        <Route path="*" element={<Launch />} />
      </Routes>
      <GuardiaRutas />
      <CierrePorInactividad />
      <GuardiaEdad />
      <HuecoBarra />
      <BarraInferior />
      <IndiceDesarrollo />
    </>
  )
}
