/* ¿Estan encendidos los albumes de fotos? Una sola consulta por carga de la pagina,
 * compartida por quien la pida (la columna lateral, las pantallas de subida...). */
import { useEffect, useState } from 'react'
import { configAlbumes, type ConfigAlbumes } from './albumes'
import { useSesion } from './sesion'

let pedida: Promise<ConfigAlbumes> | null = null

/** `null` mientras se sabe; despues las reglas, con `activos` en verdadero o falso. */
export function useAlbumes(): ConfigAlbumes | null {
  const { sesion } = useSesion()
  const [cfg, setCfg] = useState<ConfigAlbumes | null>(null)
  const hay = !!sesion
  useEffect(() => {
    if (!hay) return
    let vivo = true
    if (!pedida) pedida = configAlbumes()
    pedida.then(c => { if (vivo) setCfg(c) })
    return () => { vivo = false }
  }, [hay])
  return hay ? cfg : null
}
