/* Portada informativa, debajo de la puerta de entrada.
 *
 * Reutiliza los mismos tokens y el mismo acordeon que la pagina de creadoras:
 * el sitio ya tiene una voz y una tipografia, y una seccion que se viera
 * distinta parecia pegada de otro lado.
 *
 * Las etiquetas de seccion van en ingles porque asi se pidieron y porque en
 * este diseño funcionan como rotulo. El cuerpo va en español, que es el idioma
 * de quien se registra.
 */
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { COLOR, LINEA, TINTE, FUENTE } from '../lib/diseño'
import Icono from './Iconos'
import {
  REDES, QUE_ES, FORMAS_DE_GANAR, SEGURIDAD, VALORES, PASOS, PREGUNTAS,
} from '../content/portada'

export default function Portada() {
  const nav = useNavigate()

  return (
    <div style={{ marginTop: 56 }}>
      <Seccion rotulo="What is RAWstudio?">
        <Titular>
          Tu contenido.<br />
          <span style={{ color: COLOR.acento }}>Tu precio.</span><br />
          Tu decisión.
        </Titular>
        {QUE_ES.map((p, i) => (
          <p key={i} style={{
            margin: i ? '14px 0 0' : '18px 0 0',
            font: `400 16px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave,
          }}>{p}</p>
        ))}
      </Seccion>

      {/* ---------- El 80% ---------- */}
      <div style={{
        margin: '38px 0', padding: '26px 20px',
        border: `1.5px solid ${COLOR.dinero}`, background: TINTE.dinero,
        textAlign: 'center',
      }}>
        <div style={{
          fontFamily: FUENTE.display, fontSize: 64, lineHeight: 1,
          color: COLOR.dinero, textTransform: 'uppercase',
        }}>80%</div>
        <div style={{
          marginTop: 12, font: `400 17px/1.45 ${FUENTE.ui}`, color: COLOR.texto,
        }}>
          De cada dólar que te pagan, <b>ochenta centavos son tuyos.</b>
        </div>
        <div style={{
          marginTop: 9, fontFamily: FUENTE.serif, fontStyle: 'italic',
          fontSize: 17, lineHeight: 1.4, color: COLOR.textoSuave,
        }}>
          Sin cuota mensual, sin cargo por publicar y sin exclusividad.
        </div>
      </div>

      <Botones nav={nav} />

      {/* ---------- Site features ---------- */}
      <Seccion rotulo="Site features">
        <Sub>Formas de ganar</Sub>
        <div style={{ display: 'grid', gap: 1, background: LINEA.tenue,
          border: `1px solid ${LINEA.tenue}`, marginTop: 14 }}>
          {FORMAS_DE_GANAR.map(f => (
            <Fila key={f.t} icono={f.i} titulo={f.t} texto={f.d} color={COLOR.dinero} />
          ))}
        </div>

        <Sub estilo={{ marginTop: 32 }}>Seguridad</Sub>
        <div style={{ display: 'grid', gap: 1, background: LINEA.tenue,
          border: `1px solid ${LINEA.tenue}`, marginTop: 14 }}>
          {SEGURIDAD.map(f => (
            <Fila key={f.t} icono={f.i} titulo={f.t} texto={f.d} color={COLOR.admin} />
          ))}
        </div>

        <div style={{ marginTop: 32, display: 'grid', gap: 18 }}>
          {VALORES.map(v => (
            <div key={v.t}>
              <div style={{ fontFamily: FUENTE.display, fontSize: 26, lineHeight: 1,
                textTransform: 'uppercase', color: COLOR.texto }}>{v.t}</div>
              <div style={{ marginTop: 8, font: `400 15px/1.55 ${FUENTE.ui}`,
                color: COLOR.textoSuave }}>{v.d}</div>
            </div>
          ))}
        </div>
      </Seccion>

      {/* ---------- Join us ---------- */}
      <div style={{
        margin: '44px 0', padding: '28px 20px',
        border: `1.5px dashed ${TINTE.acentoBorde}`, background: TINTE.acento,
      }}>
        <div style={{ font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 2.4,
          textTransform: 'uppercase', color: COLOR.acento }}>Join us</div>
        <div style={{ marginTop: 14, fontFamily: FUENTE.display, fontSize: 36,
          lineHeight: 1, textTransform: 'uppercase' }}>
          Un sitio nuevo,<br /><span style={{ color: COLOR.acento }}>desde acá.</span>
        </div>
        <p style={{ marginTop: 16, font: `400 16px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
          Entra gente de todo el mundo, y eso está bien. Pero esta plataforma se hizo
          pensando en <b style={{ color: COLOR.texto }}>creadoras latinas, amateurs e
          independientes</b> — las que no tienen productora detrás, ni equipo, ni ganas
          de firmar exclusividad con nadie.
        </p>
        <p style={{ marginTop: 12, font: `400 16px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
          Somos pocas todavía. Eso significa que quien llegue ahora no compite contra
          diez mil perfiles.
        </p>
      </div>

      {/* ---------- How to get started ---------- */}
      <Seccion rotulo="How to get started">
        <div style={{ display: 'grid', gap: 14, marginTop: 6 }}>
          {PASOS.map(p => (
            <div key={p.n} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <span style={{ font: `400 22px/1 ${FUENTE.mono}`, color: COLOR.acento,
                flex: '0 0 auto', width: 34 }}>{p.n}</span>
              <div>
                <div style={{ font: `700 12px/1.3 ${FUENTE.ui}`, letterSpacing: 1.2,
                  textTransform: 'uppercase', color: COLOR.texto }}>{p.t}</div>
                <div style={{ marginTop: 5, font: `400 14px/1.5 ${FUENTE.ui}`,
                  color: COLOR.textoSuave }}>{p.d}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Seis huecos para capturas, dos columnas. Se dejan vacios a proposito
            hasta tener las imagenes: una captura inventada de una pantalla que
            no existe es una promesa que se rompe sola. */}
        <div style={{
          marginTop: 30, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10,
        }}>
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{
              aspectRatio: '9/16', border: `1px dashed ${LINEA.marcada}`,
              display: 'grid', placeItems: 'center',
              background: `repeating-linear-gradient(130deg,${COLOR.superficieAlta} 0 8px,${COLOR.fondo} 8px 16px)`,
            }}>
              <span style={{ font: `400 11px/1 ${FUENTE.mono}`, color: COLOR.textoApagado }}>
                captura {i + 1}
              </span>
            </div>
          ))}
        </div>
      </Seccion>

      {/* ---------- FAQ ---------- */}
      <Seccion rotulo="FAQ">
        <div style={{ marginTop: 6 }}>
          {PREGUNTAS.map((f, i) => (
            <details key={i} style={{ borderBottom: `1px solid ${LINEA.tenue}` }}>
              <summary style={{
                display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer',
                padding: '18px 2px', font: `500 16px/1.35 ${FUENTE.ui}`, color: COLOR.texto,
              }}>
                <span className="faq-signo">+</span>
                <span>{f.q}</span>
              </summary>
              <div style={{ padding: '0 2px 20px 33px', color: COLOR.textoSuave,
                font: `400 15px/1.55 ${FUENTE.ui}` }}>
                {f.a.map((p, j) => <p key={j} style={{ margin: j ? '11px 0 0' : 0 }}>{p}</p>)}
              </div>
            </details>
          ))}
        </div>
      </Seccion>

      {/* ---------- Pie ---------- */}
      <div style={{ marginTop: 48, paddingTop: 30, borderTop: `1px solid ${LINEA.suave}` }}>
        <Botones nav={nav} />

        {(REDES.x || REDES.tiktok) && (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 26 }}>
            {REDES.x && <Red href={REDES.x} texto="X" />}
            {REDES.tiktok && <Red href={REDES.tiktok} texto="TikTok" />}
          </div>
        )}

        <div style={{
          display: 'flex', gap: 18, justifyContent: 'center', flexWrap: 'wrap',
          marginTop: 28,
        }}>
          {/* CCPA apunta al aviso de privacidad, donde vive esa seccion. No
              lleva ancla porque el router usa el hash para las rutas: un
              segundo # dentro romperia la navegacion. */}
          {[['Privacy', '/privacidad'], ['Terms of Service', '/terminos'],
            ['CCPA', '/privacidad']].map(([t, r]) => (
            <span key={t} onClick={() => nav(r)} style={{
              font: `400 12px/1 ${FUENTE.ui}`, color: COLOR.textoTenue, cursor: 'pointer',
              textDecoration: 'underline', textUnderlineOffset: 4,
            }}>{t}</span>
          ))}
        </div>

        <div style={{
          marginTop: 22, textAlign: 'center',
          font: `400 11px/1.6 ${FUENTE.mono}`, color: COLOR.textoApagado,
        }}>
          © 2026 RAWstudio · All rights reserved
        </div>
      </div>
    </div>
  )
}

/* ---------- piezas ---------- */

/** El icono va en su color y el texto en el suyo: si el icono llevara el mismo
 *  gris que la descripcion se perderia, y si el titulo llevara el color del
 *  icono habria dos cosas gritando a la vez. */
function Fila({ icono, titulo, texto, color }: {
  icono: string; titulo: string; texto: string; color: string
}) {
  return (
    <div style={{
      background: COLOR.fondo, padding: '15px 15px',
      display: 'flex', gap: 13, alignItems: 'flex-start',
    }}>
      <span style={{ color, marginTop: 1 }}><Icono nombre={icono} /></span>
      <div>
        <div style={{ font: `700 11px/1.3 ${FUENTE.ui}`, letterSpacing: 1.4,
          textTransform: 'uppercase', color }}>{titulo}</div>
        <div style={{ marginTop: 7, font: `400 14px/1.5 ${FUENTE.ui}`,
          color: COLOR.textoSuave }}>{texto}</div>
      </div>
    </div>
  )
}

function Seccion({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div style={{ marginTop: 44 }}>
      <div style={{
        font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 2.6,
        textTransform: 'uppercase', color: COLOR.textoTenue, marginBottom: 4,
      }}>{rotulo}</div>
      <div style={{ width: 44, height: 2, background: COLOR.acento, margin: '12px 0 20px' }} />
      {children}
    </div>
  )
}

function Titular({ children }: { children: ReactNode }) {
  // Interlineado 1: en español los titulares llevan acentos en mayuscula y con
  // el interlineado apretado la linea de arriba se los come.
  return (
    <div style={{
      fontFamily: FUENTE.display, fontSize: 42, lineHeight: 1,
      textTransform: 'uppercase', color: COLOR.texto,
    }}>{children}</div>
  )
}

function Sub({ children, estilo }: { children: ReactNode; estilo?: React.CSSProperties }) {
  return (
    <div style={{
      font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 1.8,
      textTransform: 'uppercase', color: COLOR.texto, ...estilo,
    }}>{children}</div>
  )
}

function Botones({ nav }: { nav: (r: string) => void }) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <span onClick={() => nav('/registro')} style={{
        textAlign: 'center', padding: 18, cursor: 'pointer',
        background: COLOR.acento, color: COLOR.fondo,
        font: `700 12px/1 ${FUENTE.ui}`, letterSpacing: 2.2, textTransform: 'uppercase',
        boxShadow: `0 0 30px ${TINTE.acentoBorde}`,
      }}>Crear mi cuenta</span>
      <span onClick={() => nav('/acceso')} style={{
        textAlign: 'center', padding: 18, cursor: 'pointer',
        border: `1px solid ${LINEA.fuerte}`, color: COLOR.textoSuave,
        font: `700 12px/1 ${FUENTE.ui}`, letterSpacing: 2.2, textTransform: 'uppercase',
      }}>Ya tengo una cuenta</span>
    </div>
  )
}

function Red({ href, texto }: { href: string; texto: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{
      padding: '10px 18px', border: `1px solid ${LINEA.fuerte}`,
      color: COLOR.textoSuave, textDecoration: 'none',
      font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.8, textTransform: 'uppercase',
    }}>{texto}</a>
  )
}
