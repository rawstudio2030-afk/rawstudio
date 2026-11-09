/* «Tus clips»: lo publicado, para gestionarlo (precio, renta, portada, datos,
 * dejar de venderlo, eliminarlo). La logica vive en `MisClips`/`GestionarClip`;
 * esto solo le da su sitio dentro del Estudio. */
import { FUENTE, COLOR } from '../lib/diseño'
import MisClips from '../components/MisClips'
import { Marco } from './piezas'

export default function Clips() {
  return (
    <Marco titulo="Tus clips">
      <div style={{ font: `400 13px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave, marginBottom: 20 }}>
        Lo que ya subiste. Toca «Gestionar» para cambiar el precio, la portada o los datos, o para
        dejar de venderlo.
      </div>
      <MisClips sinRotulo />
    </Marco>
  )
}
