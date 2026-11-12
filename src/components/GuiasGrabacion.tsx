/* Guías de grabación (PDF) para /creadoras#guias.
 *
 * Dos bloques: los ajustes de cada iPhone y «Cómo grabar tu contenido sin
 * regarla» (sola primero, en pareja después). Cada guía es una tarjeta con su
 * portada, a qué aplica y un enlace de descarga directo al PDF.
 *
 * Los archivos se sirven desde `public/guias/`: no entran al bundle y el primer
 * paint no cambia. Las portadas llevan `loading="lazy"` y el ancho y alto
 * escritos para que al cargar no muevan la página.
 */
import { COLOR, FUENTE, RADIO } from '../lib/diseño'
import { GUIAS_IPHONE, GUIAS_SIN_REGARLA, rutaGuia, type Guia } from '../content/guias'
import { ROSA, AMBAR, HIELO, PAPER, MUTED, LINE } from '../content/creators'

const etiqueta: React.CSSProperties = {
  font: `700 11px/1.3 ${FUENTE.ui}`, letterSpacing: 2, textTransform: 'uppercase', color: HIELO,
}

function Tarjeta({ g, grupo, descripcion }: { g: Guia; grupo: string; descripcion?: boolean }) {
  return (
    <div style={{
      boxSizing: 'border-box', display: 'flex', flexDirection: 'column', minWidth: 0,
      borderRadius: RADIO.filo, border: '1px solid rgba(122,63,160,.5)',
      background: 'rgba(8,6,14,.82)', overflow: 'hidden',
    }}>
      <img
        src={rutaGuia(g.portada)} width={480} height={621} loading="lazy" decoding="async"
        alt={`Portada de la guía: ${grupo}, ${g.titulo}`}
        style={{ display: 'block', width: '100%', height: 'auto', aspectRatio: '480 / 621', background: COLOR.superficie }}
      />
      <div style={{ padding: '12px 10px 0', flex: '1 1 auto' }}>
        <div style={{ font: `700 15px/1.25 ${FUENTE.ui}`, color: PAPER }}>{g.titulo}</div>
        {/* En las de iPhone, si el modelo ya es el título («iPhone 12») no se repite. */}
        {(descripcion || g.aplica !== g.titulo) && (
          <div style={{ font: `400 13px/1.45 ${FUENTE.ui}`, color: MUTED, marginTop: 5 }}>
            {descripcion ? g.aplica : `Para ${g.aplica}`}
          </div>
        )}
        <div style={{ font: `400 12px/1.4 ${FUENTE.mono}`, color: AMBAR, marginTop: 8 }}>{g.detalle}</div>
      </div>
      <a
        href={rutaGuia(g.archivo)} download
        aria-label={`Descargar PDF: ${grupo}, ${g.titulo}`}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 44, margin: 10,
          boxSizing: 'border-box', borderRadius: RADIO.filo, border: `1px solid ${AMBAR}`,
          font: `700 10.5px/1.2 ${FUENTE.ui}`, letterSpacing: 1, textTransform: 'uppercase',
          color: AMBAR, textDecoration: 'none', textAlign: 'center',
        }}
      >Descargar PDF</a>
    </div>
  )
}

export default function GuiasGrabacion({ titular }: { titular: React.CSSProperties }) {
  return (
    <div id="guias" style={{ marginTop: 30, paddingTop: 40, borderTop: `1px solid ${LINE}`, scrollMarginTop: 14 }}>
      <div style={{ ...etiqueta, marginBottom: 14 }}>Guías de grabación</div>
      <h2 style={titular}>Que tu video <span style={{ color: ROSA }}>salga bien</span></h2>
      <div style={{ font: `400 18px/1.4 ${FUENTE.ui}`, color: COLOR.textoSuave, margin: '-8px 0 26px' }}>
        PDF para descargar y guardar. También las manda el bot de Telegram: escríbele{' '}
        <b style={{ color: PAPER, fontWeight: 700 }}>/guias</b>.
      </div>

      <h3 style={{ ...etiqueta, color: PAPER, margin: '0 0 6px' }}>Ajustes de tu iPhone</h3>
      <p style={{ font: `400 15px/1.45 ${FUENTE.ui}`, color: COLOR.textoSuave, margin: '0 0 14px' }}>
        Qué elegir en la cámara y cómo grabarte por tu cuenta. Escoge tu modelo.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))', gap: 12 }}>
        {GUIAS_IPHONE.map(g => <Tarjeta key={g.id} g={g} grupo="ajustes del iPhone" />)}
      </div>

      <h3 style={{ ...etiqueta, color: PAPER, margin: '34px 0 6px' }}>Cómo grabar tu contenido sin regarla</h3>
      <p style={{ font: `400 15px/1.45 ${FUENTE.ui}`, color: COLOR.textoSuave, margin: '0 0 14px' }}>
        Dos versiones, según grabes sola o en pareja. No repiten los ajustes del teléfono:
        para eso, la guía de tu iPhone. Solo mayores de 18.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
        {GUIAS_SIN_REGARLA.map(g => <Tarjeta key={g.id} g={g} grupo="cómo grabar sin regarla" descripcion />)}
      </div>
    </div>
  )
}
