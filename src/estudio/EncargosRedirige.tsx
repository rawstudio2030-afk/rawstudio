/* `/estudio/encargos` ya no es una pantalla: los encargos son MENSAJES.
 *
 * La ruta se queda como redireccion y no se borra, igual que se hizo con
 * `/earnings`: estuvo meses en el menu del estudio y puede seguir viva en un
 * enlace, en un marcador o en el historial de alguien.
 */
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function EncargosRedirige() {
  const nav = useNavigate()
  useEffect(() => { nav('/chat', { replace: true }) }, [nav])
  return null
}
