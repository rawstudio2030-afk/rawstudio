// Cierre de sesion por inactividad, con aviso antes de cerrar.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSesion } from '../lib/sesion'
import {
  MINUTOS_LIMITE, MINUTOS_AVISO, EVENTOS,
  marcarActividad, ultimaActividad, limpiarActividad, hayVideoReproduciendo,
} from '../lib/inactividad'

const UI = "'Space Grotesk', system-ui, sans-serif"
const SERIF = "'Instrument Serif', serif"

const LIMITE_MS = MINUTOS_LIMITE * 60_000
const AVISO_MS  = MINUTOS_AVISO * 60_000

export default function CierrePorInactividad() {
  const { sesion, salir } = useSesion()
  const nav = useNavigate()
  const [restan, setRestan] = useState<number | null>(null)
  const cerrando = useRef(false)
  // El aviso se lee tambien desde una referencia: si dependiera del estado,
  // el efecto se recrearia con cada tic y el temporizador se reiniciaria solo.
  const avisando = useRef(false)

  const seguir = useCallback(() => {
    marcarActividad()
    avisando.current = false
    setRestan(null)
  }, [])

  useEffect(() => {
    if (!sesion) { setRestan(null); return }
    marcarActividad()

    // Durante el aviso, moverse NO basta: hay que confirmar. Si bastara, el
    // roce accidental de quien pasa junto al telefono mantendria viva la sesion.
    const alActuar = () => { if (!avisando.current) marcarActividad() }
    EVENTOS.forEach(e => window.addEventListener(e, alActuar, { passive: true }))

    // Cada segundo, y no un setTimeout unico a 30 min: un temporizador largo
    // no sobrevive a que el sistema suspenda la pestaña, y asi el aviso puede
    // contar hacia atras de verdad en vez de a saltos.
    const reloj = window.setInterval(async () => {
      if (cerrando.current) return

      // Ver un video ES usar la app, aunque nadie toque la pantalla.
      if (hayVideoReproduciendo()) {
        marcarActividad(); avisando.current = false; setRestan(null); return
      }

      const inactivo = Date.now() - ultimaActividad()

      if (inactivo >= LIMITE_MS) {
        cerrando.current = true
        avisando.current = false
        limpiarActividad()
        await salir()
        nav('/entrar', { replace: true })
        return
      }

      const enAviso = inactivo >= LIMITE_MS - AVISO_MS
      avisando.current = enAviso
      setRestan(enAviso ? Math.ceil((LIMITE_MS - inactivo) / 1000) : null)
    }, 1000)

    return () => {
      EVENTOS.forEach(e => window.removeEventListener(e, alActuar))
      window.clearInterval(reloj)
    }
  }, [sesion, salir, nav])

  if (!sesion || restan === null) return null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(8,8,10,.94)', backdropFilter: 'blur(8px)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '32px 26px', textAlign: 'center', gap: 20,
    }}>
      <div style={{ width: 64, height: 3, background: '#FF2BD1' }} />
      <div style={{
        fontFamily: 'Anton, sans-serif', fontSize: 40, lineHeight: 1,
        textTransform: 'uppercase', color: '#F2F0F3',
      }}>
        ¿Sigues<br />ahí?
      </div>
      <div style={{
        fontFamily: SERIF, fontStyle: 'italic', fontSize: 19, lineHeight: 1.4,
        color: '#9C979F', maxWidth: 320,
      }}>
        Por seguridad cerramos la sesión sola cuando nadie la usa. Nos quedan
        <span style={{ color: '#C8FF3D' }}> {restan} segundos</span>.
      </div>

      <div onClick={seguir} style={{
        marginTop: 8, background: '#FF2BD1', color: '#08080A',
        padding: '18px 34px', font: `700 13px/1 ${UI}`,
        letterSpacing: 2.2, textTransform: 'uppercase', cursor: 'pointer',
        boxShadow: '0 0 34px rgba(255,43,209,.42)',
      }}>
        Sigo aquí
      </div>

      <div onClick={async () => { limpiarActividad(); await salir(); nav('/entrar', { replace: true }) }}
        style={{
          border: '1px solid rgba(255,255,255,.16)', color: '#9C979F',
          padding: '15px 28px', font: `700 12px/1 ${UI}`,
          letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer',
        }}>
        Cerrar ahora
      </div>
    </div>
  )
}
