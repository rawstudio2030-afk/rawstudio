/* El porton. Solo lo ve quien administra.
 *
 * Una cuenta con permiso de administracion hace dos trabajos distintos:
 * publicar como creadora y administrar la plataforma. Hasta ahora los dos
 * vivian revueltos en la misma navegacion, con el panel entero escondido en un
 * renglon dentro de «Yo». Esto separa los dos sombreros en la puerta.
 *
 * Se cruza UNA vez por sesion. Despues se cambia desde la barra de abajo —la
 * pestaña «Panel»— y desde «Volver a la aplicacion» en la barra lateral del
 * panel, sin volver a pasar por aqui. Un porton obligatorio en cada entrada
 * seria friccion diaria para una sola persona.
 */
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSesion } from '../lib/sesion'
import { usePapel } from '../components/Navegacion'
import { elegirModo, type Modo as TipoModo } from '../lib/modo'
import Wordmark from '../components/Wordmark'
import { COLOR, FUENTE } from '../lib/diseño'
import { Pulsable } from '../components/Pulsable'

export default function Modo() {
  const nav = useNavigate()
  const { sesion, cargando } = useSesion()
  const { papel, esAdmin, cargando: cargandoPapel } = usePapel()

  // Quien no administra no tiene nada que elegir: para esa persona la
  // aplicacion es el unico lugar que existe.
  useEffect(() => {
    if (cargando || cargandoPapel) return
    if (!sesion) { nav('/entrar', { replace: true }); return }
    if (!esAdmin) nav('/clip', { replace: true })
  }, [cargando, cargandoPapel, sesion, esAdmin, nav])

  const ir = (m: TipoModo) => {
    elegirModo(m)
    nav(m === 'panel' ? '/admin' : '/clip', { replace: true })
  }

  if (cargando || cargandoPapel || !esAdmin) {
    return (
      <div style={{ minHeight: '100%', display: 'grid', placeItems: 'center',
        background: COLOR.fondo, color: COLOR.textoTenue,
        font: `400 13px/1 ${FUENTE.mono}` }}>Un momento…</div>
    )
  }

  return (
    <div style={{
      minHeight: '100%', boxSizing: 'border-box', padding: '56px 26px 44px',
      background: COLOR.fondo, color: COLOR.texto, fontFamily: FUENTE.ui,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
    }}>
      <Wordmark ancho={142} glow={14} />

      <div style={{ width: '100%', maxWidth: 560, marginTop: 40 }}>
        <div style={{ width: 48, height: 3, background: COLOR.acento }} />
        <h1 style={{
          margin: '18px 0 0', fontFamily: FUENTE.display, fontWeight: 400,
          fontSize: 'clamp(34px, 9vw, 46px)', lineHeight: 1, textTransform: 'uppercase',
        }}>¿Cómo entras hoy?</h1>
        <p style={{
          margin: '12px 0 0', fontFamily: FUENTE.serif, fontStyle: 'italic',
          fontSize: 19, lineHeight: 1.3, color: COLOR.textoSuave,
        }}>
          Tu cuenta hace dos trabajos. Elige uno y el otro se quita de en medio.
        </p>

        <div style={{ display: 'grid', gap: 12, marginTop: 30 }}>
          <Puerta
            color={COLOR.acento}
            titulo={papel === 'creadora' ? 'Como creadora' : 'A la aplicación'}
            que={papel === 'creadora'
              ? 'Tu estudio, tus clips, tus ganancias y el catálogo.'
              : 'El catálogo, tu biblioteca y tus mensajes.'}
            al={() => ir('app')} />

          <Puerta
            color={COLOR.admin}
            titulo="Administración"
            que="Usuarias, moderación, contenido, finanzas, retiros, verificación y bitácora."
            nota="Está hecho para pantalla grande; en el teléfono se ve apretado."
            al={() => ir('panel')} />
        </div>

        <p style={{
          marginTop: 24, font: `400 12px/1.6 ${FUENTE.mono}`, color: COLOR.textoApagado,
        }}>
          Esto no cambia tus permisos, solo dónde aterrizas. Puedes saltar de un lado
          al otro cuando quieras: desde la pestaña «Panel» de la barra de abajo, y
          desde «Volver a la aplicación» en el panel.
        </p>
      </div>
    </div>
  )
}

function Puerta({ color, titulo, que, nota, al }: {
  color: string; titulo: string; que: string; nota?: string; al: () => void
}) {
  return (
    <Pulsable al={al} style={{
      boxSizing: 'border-box', width: '100%', textAlign: 'left',
      padding: '20px 20px', cursor: 'pointer',
      border: `1.5px solid ${color}`, background: COLOR.fondo,
      display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{
          font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 2.2, textTransform: 'uppercase', color,
        }}>{titulo}</div>
        <div style={{ marginTop: 9, font: `400 13px/1.45 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
          {que}
        </div>
        {nota && (
          <div style={{ marginTop: 7, font: `400 10px/1.45 ${FUENTE.mono}`, color: COLOR.textoApagado }}>
            {nota}
          </div>
        )}
      </div>
      <span style={{ font: `700 19px/1 ${FUENTE.ui}`, color }}>&#8594;</span>
    </Pulsable>
  )
}
