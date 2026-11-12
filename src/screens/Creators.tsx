// Pantalla 09 — Para creadoras
// Pagina de venta del lado creador. Modo marca (DESIGN-BRIEF.md): la escena de
// el antro (−1 de «El descenso») fijo detras, con un velo denso porque es una
// pagina de mucho texto, y cada bloque en una tarjeta translucida para que se lea.
//
// Los saltos de seccion desplazan la VENTANA, como el resto del sitio. Antes
// desplazaban un contenedor interno (`overflowY: auto; height: 100%`) que en
// este layout se estira al alto de su contenido y por tanto nunca desplaza:
// los botones de seccion eran un no-op, en silencio.
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Wordmark from '../components/Wordmark'
import GuiasGrabacion from '../components/GuiasGrabacion'
import FondoAntro from '../components/FondoAntro'
import {
  SECCIONES, FAQ, NO_PROMETEMOS, ICONS,
  ROSA, AMBAR, HIELO, PAPER, MUTED, LINE,
} from '../content/creators'
import { PRECIO_CONSULTA_TELEGRAM } from '../content/consultas'
import { COLOR, FUENTE, RADIO } from '../lib/diseño'
import { Pulsable, Enlace } from '../components/Pulsable'


const etiqueta = (color: string): React.CSSProperties => ({
  font: `700 11px/1.3 ${FUENTE.ui}`, letterSpacing: 2, textTransform: 'uppercase', color,
})

/** Una tarjeta translucida: el texto largo no se puede leer directo sobre la
 *  escena, asi que cada bloque lleva su propio fondo. */
const tarjeta: React.CSSProperties = {
  boxSizing: 'border-box', borderRadius: RADIO.filo,
  border: '1px solid rgba(122,63,160,.5)', background: 'rgba(8,6,14,.82)',
  backdropFilter: 'blur(8px)',
}

// Interlineado 1.12: en español los titulares llevan acentos (Cómo, incómodo,
// más) y con el interlineado apretado del deck el acento queda tapado por la
// linea de arriba. El deck no lo sufre porque esta en ingles.
const titular: React.CSSProperties = {
  fontFamily: FUENTE.antro, fontWeight: 800, fontSize: 'clamp(30px, 8.6vw, 44px)', lineHeight: 1.12,
  letterSpacing: '-.03em', color: PAPER, margin: '0 0 22px',
}

export default function Creators() {
  // `#/creadoras#guias`: con HashRouter el segundo `#` llega como `location.hash`,
  // pero el navegador no baja solo (el primer `#` ya es la ruta). Se baja a mano.
  const { hash } = useLocation()
  useEffect(() => {
    if (hash !== '#guias') return
    document.getElementById('guias')?.scrollIntoView()
  }, [hash])

  // Las anclas nativas (#seccion) chocarian con HashRouter, que ya usa el hash
  // para las rutas, asi que el salto se hace por scroll programatico.
  // La animacion va a mano y no con scrollTo({behavior:'smooth'}): ese modo es
  // un no-op en varios motores y el salto se quedaba sin hacer, en silencio.
  const saltar = (id: string) => {
    const dest = document.getElementById(id)
    if (!dest) return
    const raiz = document.scrollingElement ?? document.documentElement
    const destino = dest.getBoundingClientRect().top + raiz.scrollTop - 14

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      raiz.scrollTop = destino
      return
    }
    const inicio = raiz.scrollTop
    const dist = destino - inicio
    const DUR = 420
    let t0: number | null = null
    let listo = false
    const paso = (t: number) => {
      if (t0 === null) t0 = t
      const p = Math.min(1, (t - t0) / DUR)
      const e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
      raiz.scrollTop = inicio + dist * e
      if (p < 1) requestAnimationFrame(paso)
      else listo = true
    }
    requestAnimationFrame(paso)
    // Respaldo: si el motor no entrega frames —pestaña en segundo plano,
    // ahorro de energia— la animacion no corre y el salto se quedaria sin
    // hacer, en silencio. Llegar al destino importa mas que la transicion.
    window.setTimeout(() => { if (!listo) raiz.scrollTop = destino }, DUR + 90)
  }

  // Sin aparicion progresiva al hacer scroll: ocultar con opacity:0 y depender
  // de IntersectionObserver deja un modo de fallo feo —si el observer no corre,
  // el contenido no aparece nunca—. Las otras pantallas tampoco la usan.
  return (
    <div style={{
      position: 'relative', minHeight: '100%',
      background: COLOR.fondo, color: PAPER, fontFamily: FUENTE.ui, fontWeight: 400,
    }}>
      <FondoAntro />
      <div style={{ position: 'relative', zIndex: 1, padding: 'calc(30px + env(safe-area-inset-top)) 22px 40px', maxWidth: 560, margin: '0 auto' }}>

        {/* ---------- encabezado ---------- */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 22 }}>
          <Wordmark ancho={176} piso="antro" />
          <span style={{
            ...etiqueta(AMBAR), border: `1px solid ${AMBAR}`, borderRadius: 999, padding: '9px 13px', whiteSpace: 'nowrap',
          }}>
            Escudo activo
          </span>
        </div>

        {/* ---------- saltos de seccion ---------- */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 24, scrollbarWidth: 'none' }}>
          {[{ id: 'proteccion', nav: 'Protección' }, ...SECCIONES, { id: 'guias', nav: 'Guías' }].map((s, i) => (
            <button key={s.id} onClick={() => saltar(s.id)} style={{
              flex: '0 0 auto', minHeight: 44, font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 1.4,
              textTransform: 'uppercase', background: 'rgba(8,6,14,.6)', cursor: 'pointer', borderRadius: 999,
              color: i % 2 ? AMBAR : HIELO, padding: '0 16px',
              border: `1px solid ${i % 2 ? 'rgba(212,146,58,.55)' : 'rgba(196,90,138,.55)'}`,
            }}>{s.nav}</button>
          ))}
        </div>

        {/* ---------- portada ---------- */}
        <div style={{ paddingBottom: 44 }}>
          <div style={{ ...etiqueta(HIELO), marginBottom: 16 }}>
            Plataforma para creadoras · México y Estados Unidos
          </div>
          <h1 style={{
            margin: '0 0 20px', fontFamily: FUENTE.antro, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.035em',
            fontSize: 'clamp(34px, 10.4vw, 54px)',
          }}>
            Tu contenido.<br />Tus reglas.<br />
            <span style={{ color: ROSA }}>Tu 80%.</span>
          </h1>
          <div style={{ fontFamily: FUENTE.ui, fontSize: 19, lineHeight: 1.4, color: COLOR.textoSuave, marginBottom: 26 }}>
            Cobras directo de tus suscriptores, sin intermediarios y sin exclusividad.{' '}
            <span style={{ color: PAPER, fontWeight: 700 }}>Lo que subes sigue siendo tuyo</span>, y si alguien lo filtra, nosotros lo perseguimos.
          </div>

          {/* «Crear mi cuenta» llevaba a /upload, que sin sesion rebota a la
              puerta de acceso: una persona que viene a registrarse caia en un
              «inicia sesion». Va al registro, que es lo que dice el boton. */}
          <div style={{ display: 'grid', gap: 12 }}>
            <Enlace a="/registro" className="btn-collins btn-collins-primario">Crear mi cuenta</Enlace>
            <Pulsable al={() => saltar('proteccion')} className="btn-collins btn-collins-aviso">Cómo te protegemos</Pulsable>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginTop: 30 }}>
            {[['80%', 'Para ti'], ['7 días', 'Entre pagos'], ['0', 'Exclusividad']].map(([n, t], i) => (
              <div key={t} style={{
                ...tarjeta, padding: '16px 8px', textAlign: 'center',
                borderColor: i % 2 ? 'rgba(212,146,58,.55)' : 'rgba(196,90,138,.55)',
              }}>
                <div style={{ fontFamily: FUENTE.display, fontSize: 30, lineHeight: 1, color: AMBAR, marginBottom: 7 }}>{n}</div>
                <div style={{ font: `700 10px/1.3 ${FUENTE.ui}`, letterSpacing: 1.2, textTransform: 'uppercase', color: MUTED }}>{t}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ---------- proteccion: preguntas ---------- */}
        <div id="proteccion" style={{ paddingTop: 40, borderTop: `1px solid ${LINE}` }}>
          <div style={{ ...etiqueta(HIELO), marginBottom: 14 }}>Protección y seguridad</div>
          <h2 style={titular}>Pregunta lo <span style={{ color: ROSA }}>incómodo</span></h2>
          <div style={{ fontFamily: FUENTE.ui, fontSize: 18, lineHeight: 1.4, color: COLOR.textoSuave, margin: '-8px 0 24px' }}>
            Las dudas que todas tienen antes de subir el primer video. Aquí están contestadas sin adorno: lo que sí podemos hacer, y lo que no.
          </div>

          <div style={{ ...tarjeta, padding: '0 16px' }}>
            {FAQ.map((f, i) => (
              <details key={i} open={i === 0} style={{ borderTop: i ? `1px solid ${LINE}` : 'none' }}>
                <summary style={{
                  listStyle: 'none', cursor: 'pointer', display: 'flex', gap: 12,
                  alignItems: 'flex-start', padding: '18px 0', minHeight: 44,
                  font: `700 16px/1.3 ${FUENTE.ui}`, color: PAPER,
                }}>
                  <span className="faq-signo">+</span>
                  <span>{f.q}</span>
                </summary>
                <div style={{ padding: '0 0 20px 33px', color: COLOR.textoSuave, font: `400 16px/1.6 ${FUENTE.ui}` }}>
                  {f.a.map((p, j) => <p key={j} style={{ margin: j ? '11px 0 0' : 0 }}>{p}</p>)}
                </div>
              </details>
            ))}
          </div>

          {/* ---------- lo que no prometemos ---------- */}
          <div style={{
            margin: '28px 0 6px', padding: '22px 18px', borderRadius: RADIO.filo,
            border: `1px solid ${AMBAR}`, background: 'rgba(8,6,14,.82)',
          }}>
            <div style={{ fontFamily: FUENTE.display, fontSize: 26, lineHeight: 1, textTransform: 'uppercase', marginBottom: 14 }}>
              <span style={{ color: AMBAR }}>Lo que no</span> te vamos a prometer
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, color: COLOR.textoSuave, font: `400 16px/1.5 ${FUENTE.ui}` }}>
              {NO_PROMETEMOS.map((t, i) => <li key={i} style={{ marginBottom: i < NO_PROMETEMOS.length - 1 ? 10 : 0 }}>{t}</li>)}
            </ul>
          </div>
        </div>

        {/* ---------- secciones de beneficios ---------- */}
        {SECCIONES.map(s => (
          <div key={s.id} id={s.id} style={{ paddingTop: 40, marginTop: 30, borderTop: `1px solid ${LINE}` }}>
            <div style={{ ...etiqueta(HIELO), marginBottom: 14 }}>{s.eyebrow}</div>
            <h2 style={titular}>{s.titulo} <span style={{ color: ROSA }}>{s.acento}</span></h2>
            <div style={{ display: 'grid', gap: 10 }}>
              {s.filas.map((f, i) => (
                <div key={i} style={{
                  ...tarjeta, display: 'flex', gap: 15, alignItems: 'flex-start', padding: '18px 16px',
                }}>
                  <span style={{ flex: '0 0 auto', width: 31, height: 31, marginTop: 1, color: f.color }}>
                    {ICONS[f.icono]}
                  </span>
                  <p style={{ margin: 0, font: `400 16px/1.5 ${FUENTE.ui}`, color: PAPER }}>
                    <b style={{ fontWeight: 700 }}>{f.fuerte}</b> <span style={{ color: COLOR.textoSuave }}>{f.resto}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* ---------- consultas por Telegram ----------
            Un recuadro corto: lo que le toca a la creadora. El precio sale de la
            misma constante que /consultas; las reglas completas (privacidad,
            validacion) viven alli. */}
        <div id="consultas" style={{ marginTop: 30, paddingTop: 40, borderTop: `1px solid ${LINE}` }}>
          <div style={{ ...etiqueta(HIELO), marginBottom: 14 }}>Consultas por Telegram</div>
          <div style={{ ...tarjeta, padding: '20px 18px' }}>
            <p style={{ margin: 0, font: `400 16px/1.55 ${FUENTE.ui}`, color: PAPER }}>
              <b style={{ fontWeight: 700 }}>Tienes un máximo de 2 días</b> para responder un mensaje pagado.
              Cada mensaje del cliente cuesta {PRECIO_CONSULTA_TELEGRAM}.
            </p>
            <p style={{ margin: '10px 0 0', font: `400 16px/1.55 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
              No hay guion rígido: cada contestación debe avanzar algo. Una pregunta de vuelta,
              un dato nuevo o una oferta concreta.
            </p>
            <ol style={{ margin: '14px 0 0', paddingLeft: 20, color: PAPER, font: `400 16px/1.5 ${FUENTE.ui}` }}>
              <li>Saluda.</li>
              <li>Responde lo que preguntaron.</li>
              <li>Ofrece el siguiente paso.</li>
            </ol>
            <Enlace a="/consultas" style={{
              display: 'inline-block', marginTop: 16, cursor: 'pointer', minHeight: 44,
              font: `700 12px/44px ${FUENTE.ui}`, letterSpacing: 2, textTransform: 'uppercase',
              color: HIELO, textDecoration: 'underline', textUnderlineOffset: 5,
            }}>Leer las reglas completas &#8594;</Enlace>
          </div>
        </div>

        {/* ---------- guias de grabacion (PDF) ---------- */}
        <GuiasGrabacion titular={titular} />

        {/* ---------- cierre ---------- */}
        <div style={{ marginTop: 50, paddingTop: 40, borderTop: `1px solid ${LINE}`, textAlign: 'center' }}>
          <h2 style={{
            margin: '0 0 24px', fontFamily: FUENTE.antro, fontWeight: 800, fontSize: 'clamp(26px, 7.6vw, 36px)', lineHeight: 1.12,
            letterSpacing: '-.03em',
          }}>
            Lo tuyo <span style={{ color: ROSA }}>se queda contigo.</span>
          </h2>
          <Enlace a="/registro" className="btn-collins btn-collins-primario">Crear mi cuenta</Enlace>
          <div style={{ marginTop: 20, font: `400 13px/1.5 ${FUENTE.ui}`, color: MUTED }}>
            Verificación de edad obligatoria. Sólo mayores de 18 años.
          </div>
        </div>

        {/* El pie decia «Terminos · Privacidad · Denunciar · Soporte» en texto
            plano, sin enlace a nada. Las paginas existen; ahora llevan a ellas. */}
        <div style={{
          marginTop: 40, paddingTop: 20, borderTop: `1px solid ${LINE}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, flexWrap: 'wrap',
          font: `400 12px/1.6 ${FUENTE.mono}`, color: MUTED,
        }}>
          <span>© 2026 RAWstudio</span>
          <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {[['Términos', '/terminos'], ['Privacidad', '/privacidad'], ['Denunciar', '/contacto'], ['Soporte', '/contacto']].map(([t, a]) => (
              <Enlace key={t} a={a} style={{
                minHeight: 44, display: 'inline-flex', alignItems: 'center', padding: '0 8px', cursor: 'pointer',
                color: MUTED, textDecoration: 'underline', textUnderlineOffset: 4,
              }}>{t}</Enlace>
            ))}
          </span>
        </div>

      </div>
    </div>
  )
}
