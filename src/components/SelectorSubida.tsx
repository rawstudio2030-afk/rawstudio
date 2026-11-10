/* «Video | Fotos»: la eleccion de QUE se sube, arriba de las dos pantallas de subida.
 *
 * Antes la opcion de fotos era un enlace pequeno dentro de «Subir un clip» y no se
 * encontraba. Dos botones grandes, siempre a la vista, dejan claro que se puede
 * subir un video o un album de fotos. Solo se pinta cuando los albumes estan
 * encendidos. */
import { Enlace } from './Pulsable'
import { COLOR, FUENTE, LINEA } from '../lib/diseño'

export default function SelectorSubida({ actual }: { actual: 'video' | 'fotos' }) {
  const op = (clave: 'video' | 'fotos', a: string, titulo: string, nota: string) => {
    const activo = actual === clave
    return (
      <Enlace key={clave} a={a} rotulo={`${titulo}: ${nota}${activo ? ' (seleccionado)' : ''}`} style={{
        flex: 1, boxSizing: 'border-box', padding: '12px 14px', textAlign: 'center', cursor: 'pointer',
        borderRadius: 12, minHeight: 56,
        border: `1.5px solid ${activo ? COLOR.dinero : LINEA.suave}`,
        background: activo ? 'rgba(224,177,90,.08)' : 'transparent',
      }}>
        <div style={{ font: `700 14px/1.2 ${FUENTE.ui}`, color: activo ? COLOR.dinero : COLOR.texto }}>{titulo}</div>
        <div style={{ marginTop: 4, font: `400 11px/1.3 ${FUENTE.ui}`, color: COLOR.textoSuave }}>{nota}</div>
      </Enlace>
    )
  }
  return (
    <div role="group" aria-label="Qué quieres subir" style={{ display: 'flex', gap: 8 }}>
      {op('video', '/upload', 'Video', 'Un clip')}
      {op('fotos', '/upload/album', 'Fotos', 'Un álbum')}
    </div>
  )
}
