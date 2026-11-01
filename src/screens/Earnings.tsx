/* «Ganancias» ya no es una pantalla aparte.
 *
 * Nunca se construyo —decia «aún no hay números»— y lo que iba a mostrar sale
 * del mismo libro contable que el monedero: lo que entra por vender y lo que
 * sale por comprar son asientos de la misma tabla. Ahora las dos caras viven
 * en /wallet.
 *
 * La ruta se queda como redireccion y no se borra: estaba en los menus desde
 * hace meses y puede seguir viva en algun enlace o en el historial de alguien.
 */
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Ganancias() {
  const nav = useNavigate()
  useEffect(() => { nav('/wallet', { replace: true }) }, [nav])
  return null
}
