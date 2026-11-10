import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { useSesion } from './lib/sesion'
import { GuardiaRutas, BarraInferior, BarraLateral, HuecoBarra, usePapel } from './components/Navegacion'
import CierrePorInactividad from './components/CierrePorInactividad'
import Launch from './screens/Launch'
import Portal from './screens/Portal'
import Modo from './screens/Modo'
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
/* El panel se carga aparte, y solo cuando alguien entra en /admin.
 *
 * Son 224 K de fuente —tablas, graficas, moderacion, finanzas— que usan diez
 * personas como mucho, y hasta hoy viajaban en el mismo paquete que abre
 * cualquiera que entre a la portada desde el telefono. */
const Admin = lazy(() => import('./screens/Admin'))
import Niveles from './estudio/Niveles'
import EncargosRedirige from './estudio/EncargosRedirige'
import Blog from './estudio/Blog'
import ClipsEstudio from './estudio/Clips'
import Cobro from './estudio/Cobro'
import Retirar from './estudio/Retirar'
import Estudio from './screens/Estudio'
import NuevaClave from './screens/NuevaClave'
import Verificar from './screens/Verificar'
import { Privacidad, Terminos } from './screens/Legal'
import { Contacto, Preguntas } from './screens/Ayuda'
import Consultas from './screens/Consultas'
import Avisos from './screens/Avisos'
import UploadAlbum from './screens/UploadAlbum'
import CampanaAvisos from './components/CampanaAvisos'
/* Tambien solo para administracion, y tambien se lleva medio `lib/admin`
   consigo: dar de alta una creadora sube expediente, publica por ella y le
   fija avatar. */
const AltaCreadora = lazy(() => import('./screens/AltaCreadora'))
import { SIN_PUERTA_DE_EDAD, EXIGE_SESION, RUTAS_ENTRADA } from './lib/rutas'
import { modoElegido } from './lib/modo'
import { edadConfirmada } from './lib/edad'
import { COLOR } from './lib/diseño'
import { Pulsable } from './components/Pulsable'

export const SCREENS = [
  { path: '/',          n: '00', title: 'Portada',        el: <Portal /> },
  { path: '/intro',     n: '00b', title: 'Intro',          el: <Launch /> },
  { path: '/age',       n: '01', title: 'Age gate',       el: <AgeGate /> },
  { path: '/modo',      n: '01b', title: 'Cómo entras',    el: <Modo /> },
  { path: '/clip',      n: '02', title: 'Explorar',       el: <Explorar /> },
  { path: '/wallet',    n: '03', title: 'Wallet',         el: <Wallet /> },
  { path: '/creator',   n: '04', title: 'Creator',        el: <CreatorProfile /> },
  /* `/yo` es la MISMA pantalla sin handle, que ya mostraba el perfil propio
     —era el «ver como se ve» del formulario—. Tiene ruta propia y no se
     reusa `/creator` a secas porque la barra marca el destino activo con
     `startsWith(path + '/')`: con la pestaña apuntando a `/creator`, mirar
     el perfil de otra creadora encenderia «Yo». */
  { path: '/yo',        n: '04b', title: 'Yo',             el: <CreatorProfile /> },
  { path: '/perfil',    n: '13', title: 'Ajustes de cuenta', el: <PerfilPropio /> },
  { path: '/admin',     n: '14', title: 'Administración', el: <Admin /> },
  { path: '/estudio',   n: '15', title: 'Estudio',        el: <Estudio /> },
  { path: '/nueva-clave', n: '16', title: 'Contraseña nueva', el: <NuevaClave /> },
  { path: '/verificar', n: '17', title: 'Verificar identidad', el: <Verificar /> },
  { path: '/privacidad', n: '18', title: 'Aviso de privacidad', el: <Privacidad /> },
  { path: '/terminos',  n: '19', title: 'Términos',        el: <Terminos /> },
  { path: '/contacto',  n: '26', title: 'Contacto',        el: <Contacto /> },
  { path: '/preguntas', n: '27', title: 'Preguntas frecuentes', el: <Preguntas /> },
  { path: '/upload/album', n: '30', title: 'Nuevo álbum',    el: <UploadAlbum /> },
  { path: '/avisos',    n: '29', title: 'Avisos',         el: <Avisos /> },
  { path: '/consultas', n: '28', title: 'Consultas por Telegram', el: <Consultas /> },
  { path: '/alta-creadora', n: '20', title: 'Alta de creadora', el: <AltaCreadora /> },
  { path: '/estudio/niveles',  n: '21', title: 'Suscripción mensual', el: <Niveles /> },
  { path: '/estudio/encargos', n: '22', title: 'Contenido a la medida', el: <EncargosRedirige /> },
  { path: '/estudio/blog',     n: '23', title: 'Blog', el: <Blog /> },
  { path: '/estudio/clips',    n: '31', title: 'Tus clips', el: <ClipsEstudio /> },
  { path: '/estudio/cobro',    n: '24', title: 'Cuenta para cobrar', el: <Cobro /> },
  { path: '/estudio/retirar',  n: '25', title: 'Retirar', el: <Retirar /> },
  { path: '/upload',    n: '05', title: 'Upload',         el: <Upload /> },
  { path: '/earnings',  n: '06', title: 'Earnings',       el: <Earnings /> },
  { path: '/library',   n: '07', title: 'Library',        el: <Library /> },
  { path: '/chat',      n: '08', title: 'Encargos',       el: <Chat /> },
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
          background: open ? COLOR.dinero : 'rgba(110,106,114,.9)',
          color: open ? COLOR.fondo : '#fff', cursor: 'pointer',
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
            letterSpacing: 2.2, textTransform: 'uppercase',
            color: COLOR.textoTenue, marginBottom: 14,
          }}>Índice de desarrollo · {SCREENS.length} pantallas</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {SCREENS.map(s => {
              const act = s.path === here
              return (
                <Pulsable key={s.path} al={() => go(s.path)}
                  style={{
                    boxSizing: 'border-box', width: '100%', textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '11px 12px', cursor: 'pointer',
                    background: act ? 'rgba(255,43,209,.14)' : 'transparent',
                    borderLeft: `2px solid ${act ? COLOR.acento : 'transparent'}`,
                  }}>
                  <span style={{
                    font: "700 10px/1 'IBM Plex Mono', ui-monospace, monospace",
                    color: COLOR.fondo, background: act ? COLOR.acento : COLOR.dinero,
                    padding: '5px 6px',
                  }}>{s.n}</span>
                  <span style={{
                    font: "500 13px/1 'Space Grotesk', system-ui, sans-serif",
                    color: act ? '#fff' : COLOR.textoSuave,
                  }}>{s.title}</span>
                </Pulsable>
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
/* Manda al porton a quien administra y todavia no ha elegido sombrero.
 *
 * Una sola vez por sesion: en cuanto elige, `modoElegido()` deja de ser nulo y
 * esto no vuelve a disparar hasta la proxima sesion. Despues se cambia de
 * sombrero con el cambiador, sin pasar por aqui.
 *
 * Solo dispara en las rutas de contenido. Si disparara en las de entrada, el
 * porton se pondria delante de la portada publica y del acceso. */
function GuardiaModo() {
  const { sesion, cargando } = useSesion()
  const { esAdmin, cargando: cargandoPapel } = usePapel()
  const nav = useNavigate()
  const aqui = useLocation().pathname

  useEffect(() => {
    if (cargando || cargandoPapel || !sesion || !esAdmin) return
    if (RUTAS_ENTRADA.includes(aqui)) return
    if (modoElegido()) return
    nav('/modo', { replace: true })
  }, [cargando, cargandoPapel, sesion, esAdmin, aqui, nav])

  return null
}

function GuardiaEdad() {
  const { sesion, perfil, cargando } = useSesion()
  const nav = useNavigate()
  const aqui = useLocation().pathname
  const yaMandado = useRef(false)

  useEffect(() => {
    if (cargando) return
    if (SIN_PUERTA_DE_EDAD.includes(aqui)) return

    // Sin sesion la unica constancia es la local. Antes este caso no existia:
    // la intro mandaba sola a la puerta y no habia manera de llegar al
    // catalogo sin cruzarla. Hoy la raiz es una portada, asi que alguien
    // puede escribir /clip directo y hay que devolverlo a la puerta.
    //
    // Las rutas que ya exigen sesion se saltan: de esas se encarga
    // GuardiaRutas mandando a /entrar, y si las dos empujan a la vez gana la
    // ultima y la persona acaba donde no pidio.
    if (!sesion) {
      if (EXIGE_SESION.includes(aqui)) return
      if (edadConfirmada()) return
      nav('/age', { replace: true })
      return
    }

    if (!perfil) return
    if (perfil.adult_confirmed_at) return
    if (yaMandado.current) return
    // El indice de pantallas del prototipo debe seguir sirviendo para saltar
    // libremente, asi que esto corre una sola vez por sesion, no en cada ruta.
    yaMandado.current = true
    nav('/age')
  }, [cargando, sesion, perfil, aqui, nav])

  return null
}

/* Al cambiar de pantalla se vuelve arriba.
 *
 * El router no toca el scroll: cambia el contenido y deja la pagina donde
 * estaba. Con pantallas de una pantallada casi no se notaba. La portada mide
 * seis mil pixeles, asi que quien la lee entera y toca «crear mi cuenta»
 * aterrizaba a la mitad del formulario, con el titulo fuera de vista. */
function VolverArriba() {
  const aqui = useLocation().pathname
  useEffect(() => { window.scrollTo(0, 0) }, [aqui])
  return null
}

/** Lo que se ve mientras llega un trozo que no venia en el paquete. Sobrio a
 *  proposito: si parpadea medio segundo, un cartel grande molesta mas que
 *  ayuda. */
function CargandoPantalla() {
  return (
    <div style={{
      minHeight: '100vh', display: 'grid', placeItems: 'center',
      background: COLOR.fondo, color: COLOR.textoTenue,
      font: '400 13px/1 system-ui',
    }}>Cargando…</div>
  )
}

export default function App() {
  return (
    <>
      <VolverArriba />
      {/* El fallback solo se ve al entrar al panel, que es la unica pantalla
          que llega aparte. En las demas el elemento ya esta cargado y
          Suspense no se interpone. */}
      <Suspense fallback={<CargandoPantalla />}>
      <Routes>
        {SCREENS.map(s => <Route key={s.path} path={s.path} element={s.el} />)}
        {/* Perfil publico por handle. No entra al indice de pantallas porque
            necesita un parametro y ahi no habria cual usar. */}
        <Route path="/creator/:handle" element={<CreatorProfile />} />
        <Route path="/clip/:id" element={<ClipDetail />} />
        {/* El panel enruta sus modulos por parametro; /admin a secas cae en el Resumen. */}
        <Route path="/admin/:modulo" element={<Admin />} />
        <Route path="*" element={<Portal />} />
      </Routes>
      </Suspense>
      <GuardiaRutas />
      <GuardiaModo />
      <CierrePorInactividad />
      <GuardiaEdad />
      <HuecoBarra />
      <CampanaAvisos />
      <BarraInferior />
      <BarraLateral />
      <IndiceDesarrollo />
    </>
  )
}
