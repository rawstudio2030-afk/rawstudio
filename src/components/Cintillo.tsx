/* Cintillo de la portada: la franja magenta que corre bajo el hero.
 *
 * Vive aparte para que Portal.tsx lo cargue con React.lazy: no forma parte del
 * primer paint, aparece cuando quien visita pide ver mas. */
import { COLOR, FUENTE } from '../lib/diseño'
import { Borde } from './Hervor'

const CINTILLO = [
  '80% para ti', 'sin exclusividad', 'pagos por SPEI',
  'marca de agua con tu nombre', 'bloqueo por país', 'fecha de retiro',
]

/** Franja que corre. El texto va DOS veces en el markup y se desplaza justo la
 *  mitad: al terminar, la segunda copia esta donde arrancó la primera y el
 *  salto no se ve. Con una sola copia se veria el hueco al reiniciar. */
export default function Cintillo() {
  const items = [...CINTILLO, ...CINTILLO]
  return (
    <div style={{ position: 'relative', background: COLOR.acento, color: COLOR.fondo }}>
      <Borde lado="arriba" color={COLOR.fondo} grosor={2.6} semilla={5} />
      <div className="cintillo" style={{ overflow: 'hidden', padding: '13px 0' }}>
        <div style={{
          display: 'flex', width: 'max-content',
          animation: 'cintillo 26s linear infinite',
        }}>
          {items.concat(items).map((t, i) => (
            <span key={i} style={{
              font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 2.2,
              textTransform: 'uppercase', whiteSpace: 'nowrap', padding: '0 15px',
              display: 'inline-flex', alignItems: 'center', gap: 15,
            }}>
              {t}<b style={{ fontSize: 13 }}>&#9670;</b>
            </span>
          ))}
        </div>
      </div>
      <Borde lado="abajo" color={COLOR.fondo} grosor={2.6} semilla={91} />
    </div>
  )
}
