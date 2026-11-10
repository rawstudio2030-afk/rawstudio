/* El marco de las pantallas de entrada: la puerta, el acceso, el registro y la
 * contraseña nueva.
 *
 * Son modo marca (DESIGN-BRIEF.md): lo primero que ve alguien antes de tener
 * cuenta. La escena de la portada queda FIJA detras —no se desplaza con el
 * formulario— y el contenido va en una columna centrada por encima, con el
 * wordmark de neon arriba.
 *
 * El fondo es `position: fixed` y no `absolute` a proposito: el registro tiene
 * cuatro casillas y la pagina crece. Con `absolute` la escena se estiraria a
 * toda la altura del formulario y las palmeras acabarian cortadas por los
 * lados; fija, siempre mide la pantalla.
 */
import type { ReactNode } from 'react'
import FondoFijo from './FondoFijo'
import Wordmark from './Wordmark'

export default function PaginaMiami({ children, logo = true }: {
  children: ReactNode
  /** El wordmark de arriba. */
  logo?: boolean
}) {
  return (
    <div className="pagina-miami">
      <FondoFijo />
      <div className="pagina-miami-cuerpo">
        {logo && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 4px' }}>
            <Wordmark ancho={230} />
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
