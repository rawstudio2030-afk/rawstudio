/* El marco de las pantallas de la puerta: la edad, el acceso, el registro, la
 * contraseña nueva y el modo.
 *
 * Son modo marca (DESIGN-BRIEF.md): lo primero que ve alguien antes de tener
 * cuenta, y por eso van en el piso de llegada de «El descenso», Collins. El
 * salón queda FIJO detras —no se desplaza con el formulario— y el contenido va
 * en una columna centrada por encima, con el wordmark arriba (con «studio» en
 * champagne, el de Collins).
 */
import type { ReactNode } from 'react'
import FondoCollins from './FondoCollins'
import Wordmark from './Wordmark'

export default function PaginaCollins({ children, logo = true }: {
  children: ReactNode
  /** El wordmark de arriba. */
  logo?: boolean
}) {
  return (
    <div className="pagina-collins">
      <FondoCollins />
      <div className="pagina-collins-cuerpo">
        {logo && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 4px' }}>
            <Wordmark ancho={200} piso="collins" />
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
