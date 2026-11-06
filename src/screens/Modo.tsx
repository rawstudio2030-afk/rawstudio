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
import PaginaMiami from '../components/PaginaMiami'
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
      <PaginaMiami logo={false}>
        <div role="status" style={{ minHeight: '60vh', display: 'grid', placeItems: 'center',
          color: COLOR.textoSuave, font: `400 14px/1 ${FUENTE.mono}` }}>Un momento…</div>
      </PaginaMiami>
    )
  }

  return <VistaModo papel={papel} alIr={ir} />
}

/** Lo que se ve. No sabe quien eres: recibe el papel y avisa a donde se va. */
export function VistaModo({ papel, alIr }: { papel: string; alIr: (m: TipoModo) => void }) {
  /* Modo marca: es una puerta, y el cian de la segunda es el de siempre para
   * lo que es de administracion. */
  return (
    <PaginaMiami>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '14px 0 0' }}>
        <h1 className="acceso-titulo">¿Cómo<br />entras <span className="neon-lima">hoy?</span></h1>
        <p className="acceso-bajada">
          Tu cuenta hace dos trabajos. Elige uno y el otro se quita de en medio.
        </p>
      </div>

      <div style={{ display: 'grid', gap: 14, marginTop: 6 }}>
        <Puerta
          tono="m"
          titulo={papel === 'creadora' ? 'Como creadora' : 'A la aplicación'}
          que={papel === 'creadora'
            ? 'Tu estudio, tus clips, tus ganancias y el catálogo.'
            : 'El catálogo, tu biblioteca y tus mensajes.'}
          al={() => alIr('app')} />

        <Puerta
          tono="c"
          titulo="Administración"
          que="Usuarias, moderación, contenido, finanzas, retiros, verificación y bitácora."
          nota="Está hecho para pantalla grande; en el teléfono se ve apretado."
          al={() => alIr('panel')} />
      </div>

      <p style={{ margin: '4px 0 0', font: `400 13px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
        Esto no cambia tus permisos, solo dónde aterrizas. Puedes saltar de un lado
        al otro cuando quieras: desde la pestaña «Panel» de la barra de abajo, y
        desde «Volver a la aplicación» en el panel.
      </p>
    </PaginaMiami>
  )
}

const TONOS = {
  m: { color: '#FF5BDC', borde: '#FF4FE0', rgb: '255,43,209' },
  c: { color: '#3EE9FF', borde: '#19E6FF', rgb: '0,229,255' },
} as const

function Puerta({ tono, titulo, que, nota, al }: {
  tono: 'm' | 'c'; titulo: string; que: string; nota?: string; al: () => void
}) {
  const { color, borde, rgb } = TONOS[tono]
  return (
    <Pulsable al={al} style={{
      boxSizing: 'border-box', width: '100%', textAlign: 'left', minHeight: 88,
      padding: '20px 18px', cursor: 'pointer', borderRadius: 14,
      border: `1.5px solid ${borde}`, background: 'rgba(8,8,10,.74)', backdropFilter: 'blur(10px)',
      boxShadow: `0 0 10px rgba(${rgb},.45), 0 0 30px rgba(${rgb},.2), inset 0 0 20px rgba(${rgb},.07)`,
      display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{
          font: `700 12px/1 ${FUENTE.ui}`, letterSpacing: 2, textTransform: 'uppercase', color,
          textShadow: `0 0 10px rgba(${rgb},.55)`,
        }}>{titulo}</div>
        <div style={{ marginTop: 9, font: `400 15px/1.45 ${FUENTE.ui}`, color: COLOR.texto }}>
          {que}
        </div>
        {nota && (
          <div style={{ marginTop: 7, font: `400 12px/1.45 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
            {nota}
          </div>
        )}
      </div>
      <span aria-hidden style={{ font: `700 22px/1 ${FUENTE.ui}`, color }}>&#8594;</span>
    </Pulsable>
  )
}
