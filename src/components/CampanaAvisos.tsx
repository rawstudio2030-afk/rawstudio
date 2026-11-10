/* La campana de avisos: siempre a la vista, con el numero de lo que importa.
 *
 * Cuenta lo que me toca hacer (urgente) y lo nuevo desde la ultima vez que abri
 * la lista. Se actualiza al entrar, al volver a la pestana, cada minuto y
 * cuando se abre la lista. Solo con sesion, y no en la entrada, el panel ni la
 * propia pantalla de avisos.
 */
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Enlace } from './Pulsable'
import Icono from './Iconos'
import { useSesion } from '../lib/sesion'
import { misAvisos, contarAvisos, EVENTO_AVISOS } from '../lib/avisos'
import { RUTAS_ENTRADA, RUTAS_PANEL } from '../lib/rutas'
import { COLOR, FUENTE, LINEA } from '../lib/diseño'

export default function CampanaAvisos() {
  const { sesion } = useSesion()
  const aqui = useLocation().pathname
  const [cuenta, setCuenta] = useState(0)
  const idUsuario = sesion?.user.id

  useEffect(() => {
    if (!idUsuario) return
    let vivo = true
    const cargar = () => {
      if (document.visibilityState === 'hidden') return
      misAvisos().then(r => { if (vivo && 'filas' in r) setCuenta(contarAvisos(r.filas)) })
    }
    cargar()
    const reloj = window.setInterval(cargar, 60_000)
    window.addEventListener('focus', cargar)
    window.addEventListener(EVENTO_AVISOS, cargar)
    document.addEventListener('visibilitychange', cargar)
    return () => {
      vivo = false
      window.clearInterval(reloj)
      window.removeEventListener('focus', cargar)
      window.removeEventListener(EVENTO_AVISOS, cargar)
      document.removeEventListener('visibilitychange', cargar)
    }
  }, [idUsuario])

  if (!idUsuario) return null
  if (RUTAS_ENTRADA.includes(aqui) || RUTAS_PANEL.some(r => aqui.startsWith(r)) || aqui === '/avisos') return null

  return (
    <Enlace a="/avisos"
      rotulo={cuenta > 0 ? `Avisos: ${cuenta} por ver` : 'Avisos'}
      style={{
        position: 'fixed', zIndex: 950, right: 12, top: 'calc(10px + env(safe-area-inset-top))',
        width: 44, height: 44, borderRadius: '50%', display: 'grid', placeItems: 'center',
        background: 'rgba(14,21,32,.82)', backdropFilter: 'blur(10px)',
        border: `1px solid ${cuenta > 0 ? COLOR.acento : LINEA.fuerte}`,
        color: cuenta > 0 ? COLOR.texto : COLOR.textoSuave, cursor: 'pointer',
      }}>
      <Icono nombre="campana" tam={22} />
      {cuenta > 0 && (
        <span aria-hidden style={{
          position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, padding: '0 5px',
          boxSizing: 'border-box', borderRadius: 10, display: 'grid', placeItems: 'center',
          background: COLOR.acento, color: COLOR.sobreAcento, font: `700 11px/1 ${FUENTE.ui}`,
        }}>{cuenta > 9 ? '9+' : cuenta}</span>
      )}
    </Enlace>
  )
}
