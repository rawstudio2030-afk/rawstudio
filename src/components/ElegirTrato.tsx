/* Las cuatro opciones de trato, como botones de radio.
 *
 * Nativo (`<input type="radio">`) para que funcione con teclado y lectores de
 * pantalla: flechas para moverse, y el grupo se anuncia con su pregunta. En el
 * alta no viene ninguna marcada; elegir es obligatorio. Aqui no se guarda
 * nada: quien lo usa decide que hacer con la eleccion.
 */
import { useId } from 'react'
import { OPCIONES_TRATO, type Trato } from '../lib/trato'
import { COLOR, FUENTE } from '../lib/diseño'

export default function ElegirTrato({ valor, alElegir, obligatorio, bloqueado, pregunta }: {
  valor: Trato | null
  alElegir: (t: Trato) => void
  obligatorio?: boolean
  bloqueado?: boolean
  pregunta?: string
}) {
  const nombre = useId()
  return (
    <fieldset style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
      <legend style={{ padding: 0, marginBottom: 10, font: `400 13px/1.45 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
        {pregunta ?? '¿Cómo prefieres que te tratemos?'}
        {obligatorio && <span style={{ color: COLOR.acento }}> *</span>}
      </legend>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {OPCIONES_TRATO.map(o => {
          const marcada = valor === o.valor
          return (
            <label key={o.valor} className="trato-opcion" style={{
              display: 'inline-flex', alignItems: 'center', minHeight: 44, padding: '0 16px',
              boxSizing: 'border-box', borderRadius: 10, cursor: bloqueado ? 'default' : 'pointer',
              font: `700 13px/1 ${FUENTE.ui}`,
              border: `1.5px solid ${marcada ? COLOR.dinero : 'rgba(255,255,255,.3)'}`,
              background: marcada ? 'rgba(224,177,90,.08)' : 'transparent',
              color: marcada ? COLOR.dinero : COLOR.textoSuave,
              opacity: bloqueado ? .6 : 1,
            }}>
              <input type="radio" name={nombre} value={o.valor} checked={marcada}
                disabled={bloqueado} required={obligatorio}
                onChange={() => alElegir(o.valor)} />
              {o.rotulo}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
