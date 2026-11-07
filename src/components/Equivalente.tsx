/* El equivalente en pesos de un monto, chiquito y en gris: «≈ $44.40 MXN».
 * No pinta nada si esta apagado o si falta el tipo de cambio. */
import { useMoneda } from '../lib/moneda'
import { equivalentePesos } from '../lib/dinero'
import { COLOR, FUENTE } from '../lib/diseño'

export default function Equivalente({ centavos, estilo }: {
  centavos: number | null | undefined; estilo?: React.CSSProperties
}) {
  useMoneda()
  const t = equivalentePesos(centavos)
  if (!t) return null
  return (
    <span style={{ display: 'block', font: `400 12px/1.3 ${FUENTE.mono}`, color: COLOR.textoSuave,
      marginTop: 4, ...estilo }}>{t}</span>
  )
}
