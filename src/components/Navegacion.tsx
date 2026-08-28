// Barra inferior y guardias de ruta.
//
// Sustituye al indice de pantallas, que era andamio de desarrollo: mostraba las
// 15 pantallas a cualquiera, incluidas las de entrada y la de administracion.
import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSesion } from '../lib/sesion'
import { soyAdmin } from '../lib/admin'
import {
  BARRA, RUTAS_ENTRADA, RUTAS_PANEL, REDIRIGE_SI_HAY_SESION, EXIGE_SESION,
  papelDe, visiblesPara, type Papel,
} from '../lib/rutas'
import { COLOR, FUENTE } from '../lib/diseño'


/** El papel se resuelve una vez y se comparte; consultar es_admin() en cada
 *  pantalla seria una ida a la base por render. */
export function usePapel(): { papel: Papel; cargando: boolean } {
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
    papel: papelDe(!!sesion, perfil?.is_creator, admin === true),
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

export function BarraInferior() {
  const nav = useNavigate()
  const aqui = useLocation().pathname
  const { papel } = usePapel()

  // Las pantallas de entrada son a pantalla completa: una barra ahi rompe su
  // intencion y ofrece destinos que todavia no aplican.
  if (papel === 'visitante') return null
  if (RUTAS_ENTRADA.includes(aqui)) return null
  // El panel trae barra lateral propia; la de abajo tapa filas de tabla.
  if (RUTAS_PANEL.some(r => aqui.startsWith(r))) return null

  const destinos = visiblesPara(BARRA, papel)

  return (
    <nav style={{
      position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 900,
      display: 'flex', background: 'rgba(8,8,10,.96)',
      backdropFilter: 'blur(12px)',
      borderTop: '1px solid rgba(255,255,255,.09)',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {destinos.map(d => {
        const activo = aqui === d.path || aqui.startsWith(d.path + '/')
        return (
          <div key={d.path} onClick={() => nav(d.path)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 5, padding: '11px 4px 13px', cursor: 'pointer',
            color: activo ? COLOR.acento : COLOR.textoTenue,
            borderTop: `2px solid ${activo ? COLOR.acento : 'transparent'}`,
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
  const { papel } = usePapel()
  if (papel === 'visitante' || RUTAS_ENTRADA.includes(aqui)) return null
  if (RUTAS_PANEL.some(r => aqui.startsWith(r))) return null
  return (
    <div style={{
      flex: '0 0 auto',
      height: 'calc(64px + env(safe-area-inset-bottom))',
    }} />
  )
}
