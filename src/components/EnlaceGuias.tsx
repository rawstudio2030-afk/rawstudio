/* Un enlace discreto a las guías de grabación (`/creadoras#guias`), para donde
 * la creadora está a punto de grabar o de subir. No compite con nada: una línea
 * subrayada, pero con el área tocable de 44 px. */
import { COLOR, FUENTE } from '../lib/diseño'
import { Enlace } from './Pulsable'

export default function EnlaceGuias({ style }: { style?: React.CSSProperties }) {
  return (
    <Enlace a="/creadoras#guias" style={{
      display: 'inline-flex', alignItems: 'center', alignSelf: 'flex-start', minHeight: 44,
      font: `400 14px/1.4 ${FUENTE.ui}`, color: COLOR.textoSuave,
      textDecoration: 'underline', textUnderlineOffset: 4, cursor: 'pointer', ...style,
    }}>¿Cómo grabar? Guías por modelo de iPhone &#8594;</Enlace>
  )
}
