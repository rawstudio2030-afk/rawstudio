// Barra inferior y guardias de ruta.
//
// Sustituye al indice de pantallas, que era andamio de desarrollo: mostraba las
// 15 pantallas a cualquiera, incluidas las de entrada y la de administracion.
import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSesion } from '../lib/sesion'
import { soyAdmin } from '../lib/admin'
import type { Destino } from '../lib/rutas'
import {
  BARRA, ESTUDIO, RUTAS_ENTRADA, RUTAS_PANEL, REDIRIGE_SI_HAY_SESION, EXIGE_SESION,
  papelDe, visiblesPara, type Papel,
} from '../lib/rutas'
import { COLOR, LINEA, FUENTE } from '../lib/diseño'
import { elegirModo } from '../lib/modo'


/** El papel y el permiso de administrar se resuelven una vez y se comparten;
 *  consultar es_admin() en cada pantalla seria una ida a la base por render.
 *
 *  Van SEPARADOS. Antes `papelDe` devolvia 'admin' y con eso se perdia si la
 *  persona ademas era creadora, que es justo lo que hay que saber para armarle
 *  la barra. */
export function usePapel(): { papel: Papel; esAdmin: boolean; cargando: boolean } {
  const { sesion, perfil, cargando } = useSesion()
  const [admin, setAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    let vivo = true
    if (cargando) return
    if (!sesion) { setAdmin(false); return }
    soyAdmin().then(v => { if (vivo) setAdmin(v) })
    return () => { vivo = false }
  }, [sesion, cargando])

  return {
    papel: papelDe(!!sesion, perfil?.is_creator),
    esAdmin: admin === true,
    cargando: cargando || (!!sesion && admin === null),
  }
}

/** Manda a cada quien donde le toca. Sin esto, una visitante podia abrir
 *  /admin o /upload y toparse con una pantalla que no le corresponde, y quien
 *  ya entro seguia viendo la puerta de acceso. */
export function GuardiaRutas() {
  const { sesion, cargando } = useSesion()
  const nav = useNavigate()
  const aqui = useLocation().pathname

  useEffect(() => {
    if (cargando) return
    // Durante una recuperacion hay sesion pero la persona AUN no termina de
    // entrar: falta poner la contraseña. Expulsarla al contenido aqui es lo que
    // hacia parecer que el enlace del correo no servia.
    if (sessionStorage.getItem('rawstudio.recuperando') === '1') {
      if (aqui !== '/nueva-clave') nav('/nueva-clave', { replace: true })
      return
    }
    if (sesion && REDIRIGE_SI_HAY_SESION.includes(aqui)) {
      nav('/clip', { replace: true }); return
    }
    if (!sesion && EXIGE_SESION.includes(aqui)) {
      nav('/entrar', { replace: true })
    }
  }, [sesion, cargando, aqui, nav])

  return null
}

/** El destino activo se pinta en magenta, salvo la puerta al panel, que va en
 *  cian: es el color que el panel usa entero para decir «esto es
 *  privilegiado», y la puerta tiene que verse como lo que abre. */
const resalte = (d: { soloAdmin?: boolean }) => d.soloAdmin ? COLOR.admin : COLOR.acento

export function BarraInferior() {
  const nav = useNavigate()
  const aqui = useLocation().pathname
  const { papel, esAdmin } = usePapel()

  // Las pantallas de entrada son a pantalla completa: una barra ahi rompe su
  // intencion y ofrece destinos que todavia no aplican.
  //
  // Quien no ha entrado SI lleva barra, con tres destinos suyos: explorar,
  // publicar y entrar. Antes no llevaba ninguna, asi que al llegar al
  // catalogo sin cuenta se quedaba sin manera de ir a ningun lado.
  if (RUTAS_ENTRADA.includes(aqui)) return null
  // El panel trae barra lateral propia; la de abajo tapa filas de tabla.
  if (RUTAS_PANEL.some(r => aqui.startsWith(r))) return null

  const destinos = visiblesPara(BARRA, papel, esAdmin)

  return (
    /* `display: flex` va en la hoja de estilos y NO aqui: un estilo en linea
       le gana a la regla del @media, y la barra seguia pintandose debajo del
       riel en pantalla ancha. */
    <nav className="barra-abajo" style={{
      position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 900,
      background: 'rgba(8,8,10,.96)',
      backdropFilter: 'blur(12px)',
      borderTop: '1px solid rgba(255,255,255,.09)',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {destinos.map(d => {
        const activo = aqui === d.path || aqui.startsWith(d.path + '/')
        return (
          <div key={d.path} onClick={() => {
            // Tocar la barra tambien deja apuntado el sombrero. Sin esto, quien
            // entro al panel y volvio por aqui seguiria aterrizando en el panel
            // la proxima vez, sin haberlo vuelto a pedir.
            elegirModo(d.soloAdmin ? 'panel' : 'app')
            nav(d.path)
          }} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 5, padding: '11px 4px 13px', cursor: 'pointer',
            color: activo ? resalte(d) : d.soloAdmin ? COLOR.admin : COLOR.textoTenue,
            borderTop: `2px solid ${activo ? resalte(d) : 'transparent'}`,
            marginTop: -1,
          }}>
            <span style={{ fontSize: 17, lineHeight: 1 }}>{d.icono}</span>
            <span style={{
              font: `700 9px/1 ${FUENTE.ui}`, letterSpacing: 1.2, textTransform: 'uppercase',
            }}>{d.titulo}</span>
          </div>
        )
      })}
    </nav>
  )
}

/** Espacio para que el contenido no quede debajo de la barra.
 *
 *  flex 0 0 auto NO es decorativo: index.css tiene "#root > * { flex: 1 }"
 *  para que las pantallas ocupen el alto completo, y esa regla le pone
 *  flex-basis 0% a este div. Con el contenido desbordando no hay espacio
 *  libre que repartir, asi que el alto se ignoraba y el hueco MEDIA CERO.
 *  El espaciador existia, se dibujaba, y no separaba nada: la barra tapaba
 *  los ultimos 64px de todas las pantallas. */
export function HuecoBarra() {
  const aqui = useLocation().pathname
  if (RUTAS_ENTRADA.includes(aqui)) return null
  if (RUTAS_PANEL.some(r => aqui.startsWith(r))) return null
  return (
    <div className="hueco-barra" style={{
      flex: '0 0 auto',
      height: 'calc(64px + env(safe-area-inset-bottom))',
    }} />
  )
}


/* ---------- Riel de la izquierda ---------- */

/** La misma navegacion, en columna, para pantalla ancha.
 *
 *  La barra de abajo es un patron de telefono: en una pantalla de computadora
 *  queda repartida a lo ancho de 1280 pixeles con tres iconos perdidos, y la
 *  columna que sobra a la izquierda se desperdicia. Es lo que hace TikTok —y
 *  casi todo lo demas— al pasar de la aplicacion a la web.
 *
 *  Quien decide cual se ve es la hoja de estilos, no este componente: los dos
 *  se pintan siempre y el corte de 1024 apaga el que no toca. Hacerlo con
 *  JavaScript obligaria a escuchar el tamaño de la ventana y a repintar al
 *  arrastrar el borde.
 *
 *  El riel reserva su propio espacio: al montarse le pone una clase al body y
 *  al desmontarse se la quita. Asi nadie mas tiene que acordarse de dejarle
 *  hueco, y en las pantallas donde no sale —la entrada, el panel— no lo pide.
 */
export function BarraLateral() {
  const nav = useNavigate()
  const aqui = useLocation().pathname
  const { papel, esAdmin } = usePapel()

  const fuera = RUTAS_ENTRADA.includes(aqui) || RUTAS_PANEL.some(r => aqui.startsWith(r))

  useEffect(() => {
    if (fuera) return
    document.body.classList.add('con-riel')
    return () => document.body.classList.remove('con-riel')
  }, [fuera])

  if (fuera) return null

  const principales = visiblesPara(BARRA, papel, esAdmin)
    .filter(d => d.path !== '/estudio' && d.path !== '/admin')
  const estudio = visiblesPara(ESTUDIO, papel, esAdmin)
  const panel = visiblesPara(BARRA, papel, esAdmin).find(d => d.path === '/admin')

  return (
    <nav className="barra-lado" style={{
      position: 'fixed', left: 0, top: 0, bottom: 0, width: ANCHO_RIEL, zIndex: 900,
      boxSizing: 'border-box', background: COLOR.superficie,
      borderRight: `1px solid ${LINEA.tenue}`,
      flexDirection: 'column', overflowY: 'auto',
    }}>
      <div onClick={() => nav('/clip')} style={{
        padding: '20px 18px 16px', cursor: 'pointer',
        font: `400 19px/1 ${FUENTE.display}`, textTransform: 'uppercase',
        letterSpacing: .5, color: COLOR.texto,
      }}>RAWstudio</div>

      <div style={{ padding: '4px 0 10px' }}>
        {principales.map(d => <Renglon key={d.path} d={d} aqui={aqui} nav={nav} />)}
      </div>

      {estudio.length > 0 && (
        <>
          {/* El rotulo es el enlace al estudio completo: ahi siguen estando las
              descripciones y el estado de cada canal, que en el riel no caben. */}
          <div onClick={() => nav('/estudio')} style={{
            padding: '14px 18px 8px', cursor: 'pointer',
            borderTop: `1px solid ${LINEA.tenue}`, marginTop: 4,
            font: `700 9px/1 ${FUENTE.ui}`, letterSpacing: 2,
            textTransform: 'uppercase',
            color: aqui.startsWith('/estudio') ? COLOR.dinero : COLOR.textoTenue,
          }}>Estudio</div>
          <div style={{ paddingBottom: 10 }}>
            {estudio.map(d => <Renglon key={d.path} d={d} aqui={aqui} nav={nav} tono={COLOR.dinero} />)}
          </div>
        </>
      )}

      <div style={{ flex: 1 }} />

      {panel && (
        <div style={{ borderTop: `1px solid ${LINEA.tenue}`, padding: '8px 0 14px' }}>
          <Renglon d={panel} aqui={aqui} nav={nav} tono={COLOR.admin} />
        </div>
      )}
    </nav>
  )
}

const ANCHO_RIEL = 228

function Renglon({ d, aqui, nav, tono = COLOR.acento }: {
  d: Destino; aqui: string; nav: (p: string) => void; tono?: string
}) {
  const activo = aqui === d.path || aqui.startsWith(d.path + '/')
  return (
    <div onClick={() => { elegirModo(d.soloAdmin ? 'panel' : 'app'); nav(d.path) }} style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px',
      cursor: 'pointer',
      background: activo ? 'rgba(255,255,255,.04)' : 'transparent',
      borderLeft: `2px solid ${activo ? tono : 'transparent'}`,
      color: activo ? COLOR.texto : COLOR.textoSuave,
    }}>
      <span style={{ width: 16, textAlign: 'center', fontSize: 14,
        color: activo ? tono : COLOR.textoApagado }}>{d.icono}</span>
      <span style={{ font: `${activo ? 600 : 400} 13px/1 ${FUENTE.ui}` }}>{d.titulo}</span>
    </div>
  )
}
