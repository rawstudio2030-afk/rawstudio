// Pantallas 18 y 19 — Aviso de privacidad y Términos
//
// Publicadas dentro de la app y no como PDF suelto: tienen que estar
// disponibles en el momento en que alguien acepta, no en un archivo aparte que
// nadie abre.
import { useNavigate } from 'react-router-dom'
import Wordmark from '../components/Wordmark'
import { PRIVACIDAD, TERMINOS, VERSION_LEGAL, PENDIENTES_ABOGADO, type Seccion } from '../content/legal'
import { COLOR, TINTE, FUENTE } from '../lib/diseño'


export function Privacidad() {
  return <Documento titulo={['Aviso de', 'privacidad']} secciones={PRIVACIDAD} />
}
export function Terminos() {
  return <Documento titulo={['Términos', 'y condiciones']} secciones={TERMINOS} />
}

function Documento({ titulo, secciones }: { titulo: string[]; secciones: Seccion[] }) {
  const nav = useNavigate()
  // Los corchetes marcan lo que falta definir con abogado. Se resaltan en vez
  // de esconderse: un marcador que pasa inadvertido acaba publicado.
  const resaltar = (t: string) =>
    t.split(/(\[[^\]]+\])/g).map((p, i) =>
      p.startsWith('[')
        ? <mark key={i} style={{ background: 'rgba(255,43,209,.22)', color: COLOR.acento, padding: '1px 4px' }}>{p}</mark>
        : <span key={i}>{p}</span>)

  return (
    <div style={{
      minHeight: '100%', boxSizing: 'border-box', padding: '48px 22px 40px',
      background: COLOR.fondo, color: COLOR.texto, fontFamily: FUENTE.ui,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 26 }}>
        <Wordmark ancho={110} glow={12} />
        <span onClick={() => nav(-1)} style={{ font: `400 26px/1 ${FUENTE.ui}`, color: COLOR.textoSuave, cursor: 'pointer' }}>×</span>
      </div>

      <div style={{ fontFamily: FUENTE.display, fontSize: 38, lineHeight: 1, textTransform: 'uppercase' }}>
        {titulo[0]}<br /><span style={{ color: COLOR.dinero }}>{titulo[1]}</span>
      </div>
      <div style={{ font: `400 11px/1.6 ${FUENTE.mono}`, color: COLOR.textoApagado, marginTop: 10 }}>
        Versión {VERSION_LEGAL}
      </div>

      <div style={{
        marginTop: 22, padding: '16px 15px',
        border: '1.5px dashed rgba(255,43,209,.45)', background: TINTE.acento,
      }}>
        <div style={{ font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 2, textTransform: 'uppercase', color: COLOR.acento }}>
          Borrador sin revisión legal
        </div>
        <div style={{ font: `400 13px/1.6 ${FUENTE.ui}`, color: COLOR.texto, marginTop: 9 }}>
          Este texto aún no lo revisa un abogado. Lo resaltado en rosa son datos
          por definir. No debe operar con público hasta resolverlo.
        </div>
        <ul style={{ margin: '10px 0 0', paddingLeft: 17, font: `400 11.5px/1.7 ${FUENTE.mono}`, color: COLOR.textoTenue }}>
          {PENDIENTES_ABOGADO.map(p => <li key={p}>{p}</li>)}
        </ul>
      </div>

      {secciones.map(s => (
        <div key={s.titulo} style={{ marginTop: 30 }}>
          <div style={{
            font: `700 11px/1.4 ${FUENTE.ui}`, letterSpacing: 1.8, textTransform: 'uppercase',
            color: COLOR.dinero, marginBottom: 12,
          }}>{s.titulo}</div>
          {s.cuerpo.map((p, i) => (
            <p key={i} style={{ margin: '0 0 12px', font: `400 14.5px/1.65 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
              {resaltar(p)}
            </p>
          ))}
        </div>
      ))}

      <div style={{
        marginTop: 34, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,.09)',
        fontFamily: FUENTE.serif, fontStyle: 'italic', fontSize: 16, color: COLOR.textoTenue,
      }}>
        ¿Dudas sobre tus datos? Escribe a privacidad@rawstudio.biz
      </div>
    </div>
  )
}
