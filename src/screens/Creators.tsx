// Pantalla 09 — Para creadoras
// Pagina de venta del lado creador. Adaptada a la paleta y tipografia de las
// otras ocho: Anton para titulares, Space Grotesk para cuerpo y botones,
// Space Mono para etiquetas, Instrument Serif italica para las bajadas.
import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import wordmark from '../assets/wordmark.png'
import {
  SECCIONES, FAQ, NO_PROMETEMOS, ICONS,
  PINK, LIME, CYAN, INK, PAPER, MUTED, DIM, LINE,
} from '../content/creators'

const MONO = "'Space Mono', monospace"
const UI   = "'Space Grotesk', system-ui, sans-serif"
const SERIF= "'Instrument Serif', serif"

const etiqueta = (color: string): React.CSSProperties => ({
  font: `700 10px/1 ${UI}`, letterSpacing: 2.4, textTransform: 'uppercase', color,
})

const titular: React.CSSProperties = {
  fontFamily: 'Anton, sans-serif', fontSize: 46, lineHeight: .88,
  textTransform: 'uppercase', color: PAPER, margin: '0 0 22px',
}

export default function Creators() {
  const nav = useNavigate()
  const scroller = useRef<HTMLDivElement>(null)

  // Las anclas nativas (#seccion) chocarian con HashRouter, que ya usa el hash
  // para las rutas, asi que el salto se hace por scroll programatico.
  // La animacion va a mano y no con scrollTo({behavior:'smooth'}): ese modo es
  // un no-op en varios motores y el salto se quedaba sin hacer, en silencio.
  const saltar = (id: string) => {
    const cont = scroller.current
    const dest = document.getElementById(id)
    if (!cont || !dest) return
    const destino = dest.getBoundingClientRect().top
      - cont.getBoundingClientRect().top + cont.scrollTop - 14

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      cont.scrollTop = destino
      return
    }
    const inicio = cont.scrollTop
    const dist = destino - inicio
    const DUR = 420
    let t0: number | null = null
    let listo = false
    const paso = (t: number) => {
      if (t0 === null) t0 = t
      const p = Math.min(1, (t - t0) / DUR)
      const e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
      cont.scrollTop = inicio + dist * e
      if (p < 1) requestAnimationFrame(paso)
      else listo = true
    }
    requestAnimationFrame(paso)
    // Respaldo: si el motor no entrega frames —pestaña en segundo plano,
    // ahorro de energia— la animacion no corre y el salto se quedaria sin
    // hacer, en silencio. Llegar al destino importa mas que la transicion.
    window.setTimeout(() => { if (!listo) cont.scrollTop = destino }, DUR + 90)
  }


  // Sin aparicion progresiva al hacer scroll: ocultar con opacity:0 y depender
  // de IntersectionObserver deja un modo de fallo feo —si el observer no corre,
  // el contenido no aparece nunca—. Las otras pantallas tampoco la usan.
  return (
    <div ref={scroller} style={{
      height: '100%', minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
      background: INK, color: PAPER, fontFamily: UI, fontWeight: 400,
      // Trama diagonal tenue, el mismo recurso que usa el deck de fondo.
      backgroundImage: 'repeating-linear-gradient(115deg,rgba(255,255,255,.022) 0 2px,transparent 2px 13px)',
    }}>
      <div style={{ padding: '54px 22px 40px', maxWidth: 560, margin: '0 auto' }}>

        {/* ---------- encabezado ---------- */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 26 }}>
          <div style={{ width: 132, height: 49, transform: 'rotate(-2deg)', filter: `drop-shadow(0 0 16px rgba(255,43,209,.6))` }}>
            <img src={wordmark} alt="RAWstudio" style={{ width: '100%', height: 'auto', display: 'block' }} />
          </div>
          <span style={{ ...etiqueta(LIME), border: `1.5px solid ${LIME}`, padding: '8px 11px', whiteSpace: 'nowrap' }}>
            Escudo activo
          </span>
        </div>

        {/* ---------- saltos de seccion ---------- */}
        <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 26, scrollbarWidth: 'none' }}>
          {[{ id: 'proteccion', nav: 'Protección' }, ...SECCIONES].map(s => (
            <button key={s.id} onClick={() => saltar(s.id)} style={{
              flex: '0 0 auto', font: `700 10px/1 ${UI}`, letterSpacing: 1.6,
              textTransform: 'uppercase', color: MUTED, background: 'none',
              border: `1px solid ${LINE}`, padding: '9px 12px', cursor: 'pointer',
            }}>{s.nav}</button>
          ))}
        </div>

        {/* ---------- portada ---------- */}
        <div style={{ paddingBottom: 44 }}>
          <div style={{ ...etiqueta(CYAN), marginBottom: 16 }}>
            Plataforma para creadoras · México y Estados Unidos
          </div>
          <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 62, lineHeight: .86, textTransform: 'uppercase', marginBottom: 20 }}>
            Tu contenido.<br />Tus reglas.<br />
            <span style={{ color: PINK, textShadow: '0 0 30px rgba(255,43,209,.5)' }}>Tu 80%.</span>
          </div>
          <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 20, lineHeight: 1.35, color: MUTED, marginBottom: 28 }}>
            Cobras directo de tus suscriptores, sin intermediarios y sin exclusividad.{' '}
            <span style={{ color: PAPER }}>Lo que subes sigue siendo tuyo</span>, y si alguien lo filtra, nosotros lo perseguimos.
          </div>

          <div onClick={() => nav('/upload')} style={{
            background: PINK, color: INK, textAlign: 'center', padding: 19,
            font: `700 13px/1 ${UI}`, letterSpacing: 2.2, textTransform: 'uppercase',
            boxShadow: '0 0 34px rgba(255,43,209,.42)', cursor: 'pointer', marginBottom: 10,
          }}>Crear mi cuenta</div>
          <div onClick={() => saltar('proteccion')} style={{
            border: `1px solid ${CYAN}`, color: CYAN, textAlign: 'center', padding: 18,
            font: `700 12px/1 ${UI}`, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer',
          }}>Cómo te protegemos</div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, background: LINE, marginTop: 34 }}>
            {[['80%', 'Para ti'], ['7 días', 'Entre pagos'], ['0', 'Exclusividad']].map(([n, t]) => (
              <div key={t} style={{ background: INK, padding: '18px 10px' }}>
                <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 30, lineHeight: 1, color: LIME, marginBottom: 6 }}>{n}</div>
                <div style={{ font: `400 10px/1.3 ${MONO}`, letterSpacing: 1, textTransform: 'uppercase', color: DIM }}>{t}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ---------- proteccion: preguntas ---------- */}
        <div id="proteccion" style={{ paddingTop: 46, borderTop: `1px solid ${LINE}` }}>
          <div style={{ ...etiqueta(CYAN), marginBottom: 14 }}>Protección y seguridad</div>
          <div style={titular}>Pregunta lo <span style={{ color: PINK }}>incómodo</span></div>
          <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 18, lineHeight: 1.35, color: MUTED, margin: '-8px 0 26px' }}>
            Las dudas que todas tienen antes de subir el primer video. Aquí están contestadas sin adorno: lo que sí podemos hacer, y lo que no.
          </div>

          <div style={{ borderTop: `1px solid ${LINE}` }}>
            {FAQ.map((f, i) => (
              <details key={i} open={i === 0} style={{ borderBottom: `1px solid ${LINE}` }}>
                <summary style={{
                  listStyle: 'none', cursor: 'pointer', display: 'flex', gap: 12,
                  alignItems: 'flex-start', padding: '18px 2px',
                  font: `500 16px/1.35 ${UI}`, color: PAPER,
                }}>
                  <span className="faq-signo">+</span>
                  <span>{f.q}</span>
                </summary>
                <div style={{ padding: '0 2px 20px 33px', color: MUTED, font: `400 15px/1.55 ${UI}` }}>
                  {f.a.map((p, j) => <p key={j} style={{ margin: j ? '11px 0 0' : 0 }}>{p}</p>)}
                </div>
              </details>
            ))}
          </div>

          {/* ---------- lo que no prometemos ---------- */}
          <div style={{
            margin: '34px 0 6px', padding: '22px 18px',
            border: `1.5px dashed ${LIME}`, background: 'rgba(200,255,61,.05)',
          }}>
            <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 25, lineHeight: 1.05, textTransform: 'uppercase', marginBottom: 13 }}>
              <span style={{ color: LIME }}>Lo que no</span> te vamos a prometer
            </div>
            <ul style={{ margin: 0, paddingLeft: 17, color: MUTED, font: `400 15px/1.5 ${UI}` }}>
              {NO_PROMETEMOS.map((t, i) => <li key={i} style={{ marginBottom: i < NO_PROMETEMOS.length - 1 ? 9 : 0 }}>{t}</li>)}
            </ul>
          </div>
        </div>

        {/* ---------- secciones de beneficios ---------- */}
        {SECCIONES.map(s => (
          <div key={s.id} id={s.id} style={{ paddingTop: 46, marginTop: 30, borderTop: `1px solid ${LINE}` }}>
            <div style={{ ...etiqueta(CYAN), marginBottom: 14 }}>{s.eyebrow}</div>
            <div style={titular}>{s.titulo} <span style={{ color: PINK }}>{s.acento}</span></div>
            <div style={{ borderTop: `1px solid ${LINE}` }}>
              {s.filas.map((f, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 15, alignItems: 'flex-start',
                  padding: '19px 10px 19px 2px', borderBottom: `1px solid ${LINE}`,
                  background: i % 2 ? 'rgba(255,43,209,.045)' : 'transparent',
                }}>
                  <span style={{ flex: '0 0 auto', width: 31, height: 31, marginTop: 1, color: f.color }}>
                    {ICONS[f.icono]}
                  </span>
                  <p style={{ margin: 0, font: `400 15.5px/1.45 ${UI}`, color: PAPER }}>
                    <b style={{ fontWeight: 700 }}>{f.fuerte}</b> <span style={{ color: MUTED }}>{f.resto}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* ---------- cierre ---------- */}
        <div style={{ marginTop: 54, paddingTop: 42, borderTop: `1px solid ${LINE}`, textAlign: 'center' }}>
          <div style={{
            fontFamily: 'Anton, sans-serif', fontSize: 34, lineHeight: 1,
            textTransform: 'uppercase', marginBottom: 24,
            textDecoration: 'underline', textDecorationColor: PINK,
            textUnderlineOffset: 9, textDecorationThickness: 3,
          }}>
            Lo tuyo <span style={{ color: PINK }}>se queda contigo.</span>
          </div>
          <div onClick={() => nav('/upload')} style={{
            background: PINK, color: '#fff', textAlign: 'center', padding: 18,
            font: `700 13px/1 ${UI}`, letterSpacing: 2.2, textTransform: 'uppercase',
            boxShadow: `5px 5px 0 ${LIME}`, cursor: 'pointer',
          }}>Crear mi cuenta</div>
          <div style={{ marginTop: 20, font: `400 12px/1.5 ${MONO}`, color: DIM }}>
            Verificación de edad obligatoria. Sólo mayores de 18 años.
          </div>
        </div>

        <div style={{
          marginTop: 46, paddingTop: 24, borderTop: `1px solid ${LINE}`,
          display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap',
          font: `400 11px/1.6 ${MONO}`, color: DIM,
        }}>
          <span>© 2026 RAWstudio</span>
          <span style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <span>Términos</span><span>Privacidad</span><span>Denunciar</span><span>Soporte</span>
          </span>
        </div>

      </div>
    </div>
  )
}
