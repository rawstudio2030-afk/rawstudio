/* El interruptor de sonido del dial. APAGADO por defecto y solo se enciende con
 * un clic (los navegadores exigen un gesto, y un sitio que se mira en publico no
 * debe sonar solo). No se recuerda entre visitas: cada vez se empieza en
 * silencio. El motor de audio (`sonido.ts`) se baja aparte al primer encendido.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { motor } from './sonidoTipos'

type Cerrable = { cerrar(): void }

export function useSonido() {
  const [activo, setActivo] = useState(false)
  const vivo = useRef<Cerrable | null>(null)
  const ocupado = useRef(false)

  const apagar = useCallback(() => {
    motor.actual = null
    vivo.current?.cerrar()
    vivo.current = null
    setActivo(false)
  }, [])

  const alternar = useCallback(async () => {
    if (ocupado.current) return
    if (vivo.current) { apagar(); return }
    ocupado.current = true
    try {
      const { encender } = await import('./sonido')
      const s = await encender()
      if (!s) return // este navegador no tiene Web Audio: el boton no hace nada
      vivo.current = s
      motor.actual = s
      setActivo(true)
      s.tecla()
    } finally { ocupado.current = false }
  }, [apagar])

  // Al salir de la portada el sonido se apaga y se suelta el contexto.
  useEffect(() => () => {
    motor.actual = null
    vivo.current?.cerrar()
    vivo.current = null
  }, [])

  /** El clic de un boton del dial (solo suena si el sonido esta activo). */
  const tecla = useCallback(() => { motor.actual?.tecla() }, [])

  return { activo, alternar, tecla }
}
