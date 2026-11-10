/* La campana del panel: en el encabezado, con el numero de lo NUEVO.
 *
 * No es la campana flotante de las cuentas (`CampanaAvisos`, que sigue oculta en el
 * panel): esa cuenta lo personal; esta, lo que llega a la plataforma. Cuenta solo
 * lo que llego desde la ultima vez que ESTA administradora abrio la lista, no los
 * pendientes (esos ya estan en los badges del menu).
 *
 * Se actualiza al montar, al volver a la ventana, cada minuto y cuando se abre la
 * lista. Si la consulta falla NO finge «todo al dia»: lo dice.
 */
import { useEffect, useState } from 'react'
import { Enlace } from '../components/Pulsable'
import Icono from '../components/Iconos'
import { COLOR, FUENTE, LINEA } from '../lib/diseño'
import { avisosAdmin, contarNuevosAdmin, EVENTO_AVISOS_ADMIN } from '../lib/avisosAdmin'

export default function CampanaAdmin() {
  const [cuenta, setCuenta] = useState(0)
  const [fallo, setFallo] = useState(false)

  useEffect(() => {
    let vivo = true
    const cargar = () => {
      if (document.visibilityState === 'hidden') return
      avisosAdmin().then(r => {
        if (!vivo) return
        if ('filas' in r) { setCuenta(contarNuevosAdmin(r.filas)); setFallo(false) }
        else setFallo(true)
      }).catch(() => vivo && setFallo(true))
    }
    cargar()
    const reloj = window.setInterval(cargar, 60_000)
    window.addEventListener('focus', cargar)
    window.addEventListener(EVENTO_AVISOS_ADMIN, cargar)
    document.addEventListener('visibilitychange', cargar)
    return () => {
      vivo = false
      window.clearInterval(reloj)
      window.removeEventListener('focus', cargar)
      window.removeEventListener(EVENTO_AVISOS_ADMIN, cargar)
      document.removeEventListener('visibilitychange', cargar)
    }
  }, [])

  const rotulo = fallo ? 'Avisos: no se pudieron cargar'
    : cuenta > 0 ? `Avisos: ${cuenta} ${cuenta === 1 ? 'nuevo' : 'nuevos'}` : 'Avisos'
  const marca = fallo ? '!' : cuenta > 99 ? '99+' : String(cuenta)

  return (
    <Enlace a="/admin/avisos" rotulo={rotulo} style={{
      position: 'relative', width: 38, height: 38, borderRadius: '50%', display: 'grid', placeItems: 'center',
      cursor: 'pointer', background: COLOR.superficie,
      border: `1px solid ${fallo ? COLOR.aviso : cuenta > 0 ? COLOR.acento : LINEA.suave}`,
      color: cuenta > 0 ? COLOR.texto : COLOR.textoSuave,
    }}>
      <Icono nombre="campana" tam={20} />
      {(fallo || cuenta > 0) && (
        <span aria-hidden style={{
          position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, padding: '0 5px',
          boxSizing: 'border-box', borderRadius: 9, display: 'grid', placeItems: 'center',
          background: fallo ? COLOR.aviso : COLOR.acento, color: COLOR.fondo, font: `700 11px/1 ${FUENTE.mono}`,
        }}>{marca}</span>
      )}
    </Enlace>
  )
}
