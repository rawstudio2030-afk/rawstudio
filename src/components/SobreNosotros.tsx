/* «Sobre nosotros»: el bloque corto que se abre bajo el hero.
 *
 * Antes esta opcion montaba `Portada` completo, que repetia casi todo lo que el
 * hero ya cuenta (el 80%, «Crear mi cuenta», «Ya tengo cuenta») y sumaba una
 * grilla de seguridad, los valores en ingles y otro pie. Aqui queda solo lo que
 * el hero no dice: que es RAWstudio, de donde sale y a donde mirar para leer
 * mas (preguntas, contacto, privacidad y terminos).
 *
 * Se pide con React.lazy al pulsar la opcion; hasta entonces no esta en el DOM.
 */
import { COLOR, FUENTE, LINEA } from '../lib/diseño'
import { QUE_ES } from '../content/portada'
import { Regla } from './Hervor'
import { Enlace } from './Pulsable'

const parrafo: React.CSSProperties = {
  margin: 0, font: `400 16px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave,
}

export default function SobreNosotros() {
  return (
    <div id="sobre-nosotros" style={{ marginTop: 56, scrollMarginTop: 24 }}>
      <div style={{
        font: `700 10px/1.4 ${FUENTE.ui}`, letterSpacing: 2.2,
        textTransform: 'uppercase', color: COLOR.textoTenue,
      }}>¿Qué es RAWstudio?</div>
      <div style={{ margin: '12px 0 20px' }}><Regla ancho={48} /></div>

      <div style={{ display: 'grid', gap: 14 }}>
        {QUE_ES.map((p, i) => <p key={i} style={parrafo}>{p}</p>)}
      </div>

      <div style={{
        marginTop: 34, fontFamily: FUENTE.display, fontSize: 32, lineHeight: 1,
        textTransform: 'uppercase', color: COLOR.texto,
      }}>
        Un sitio nuevo,<br /><span style={{ color: COLOR.acento }}>desde acá.</span>
      </div>
      <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
        <p style={parrafo}>
          Entra gente de todo el mundo, y eso está bien. Pero esta plataforma se hizo
          pensando en <b style={{ color: COLOR.texto }}>creadoras latinas, amateurs e
          independientes</b> — las que no tienen productora detrás, ni equipo, ni ganas
          de firmar exclusividad con nadie.
        </p>
        <p style={parrafo}>
          Somos pocas todavía. Eso significa que quien llegue ahora no compite contra
          diez mil perfiles.
        </p>
      </div>

      <Enlace a="/preguntas" style={{
        display: 'inline-block', marginTop: 22, cursor: 'pointer',
        font: `700 12px/1 ${FUENTE.ui}`, letterSpacing: 2.2, textTransform: 'uppercase',
        color: COLOR.acento, textDecoration: 'underline', textUnderlineOffset: 5,
      }}>Ver las preguntas frecuentes &#8594;</Enlace>

      <div style={{ marginTop: 40, paddingTop: 26, borderTop: `1px solid ${LINEA.suave}` }}>
        <div style={{ display: 'flex', gap: 18, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[['Contacto', '/contacto'], ['Preguntas frecuentes', '/preguntas'],
            ['Privacidad', '/privacidad'], ['Términos', '/terminos']].map(([t, r]) => (
            <Enlace key={t} a={r} style={{
              font: `400 12px/1 ${FUENTE.ui}`, color: COLOR.textoTenue, cursor: 'pointer',
              textDecoration: 'underline', textUnderlineOffset: 4,
            }}>{t}</Enlace>
          ))}
        </div>
        <div style={{
          marginTop: 20, textAlign: 'center',
          font: `400 10px/1.6 ${FUENTE.mono}`, color: COLOR.textoApagado,
        }}>© 2026 RAWstudio</div>
      </div>
    </div>
  )
}
