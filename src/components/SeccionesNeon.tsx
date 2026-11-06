/* «Como funciona» y «Formas de ganar»: las dos secciones que van justo debajo
 * del hero, en el mismo estilo neon (DESIGN-BRIEF.md y los mockups aprobados).
 *
 * Tarjetas de borde de neon, alternando magenta y cian; iconos de contorno; y,
 * en «Formas de ganar», el panel del 80% destacado.
 *
 * El TEXTO no es el de los mockups: ahi dice «con tu email o wallet» y
 * «rapido, seguro», y el sitio no tiene acceso con wallet ni se puede
 * prometer rapidez. Salen de `content/portada.ts`, que ya decia lo cierto.
 *
 * El 80% esta escrito a mano, igual que en el resto de la portada: la comision
 * vive en `ajustes.comision_pct`, que solo lee administracion. Si algun dia
 * deja de ser 20, hay que cambiarlo aqui, en `Portal.tsx` y en `portada.ts`.
 */
import type { ReactNode } from 'react'
import Icono from './Iconos'
import { COLOR, FUENTE, RADIO, DEGRADADO, GLOW } from '../lib/diseño'
import { COMO_FUNCIONA, VERIFICACION_NOTA, FORMAS_NEON } from '../content/portada'

type Tono = 'm' | 'c'

/** Magenta y cian del neon: el borde es mas claro que el relleno, como un
 *  tubo encendido. */
const TONO = {
  m: { color: COLOR.acento, borde: '#FF4FE0', rgb: '255,43,209' },
  c: { color: COLOR.admin, borde: '#19E6FF', rgb: '0,229,255' },
} as const

const alterna = (i: number): Tono => (i % 2 === 0 ? 'm' : 'c')

function tarjeta(t: Tono) {
  const { borde, rgb } = TONO[t]
  return {
    border: `1.5px solid ${borde}`,
    borderRadius: RADIO.neon,
    background: `linear-gradient(180deg, rgba(${rgb},.1), rgba(8,8,10,.72))`,
    boxShadow: `0 0 8px rgba(${rgb},.5), 0 0 26px rgba(${rgb},.24), inset 0 0 18px rgba(${rgb},.1)`,
  }
}

/** El filete de degradado bajo un titular. */
function Hilo() {
  return <div aria-hidden style={{
    width: 128, height: 2, margin: '14px auto 0',
    background: DEGRADADO.hilo, boxShadow: GLOW.magenta,
  }} />
}

/** Cada seccion es una columna centrada, mas ancha que el resto de la portada:
 *  tres tarjetas en fila necesitan mas de 620 px. */
function Marco({ id, titulo, ancho, children }: {
  id: string; titulo: string; ancho: number; children: ReactNode
}) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} style={{
      scrollMarginTop: 24, boxSizing: 'border-box',
      padding: '64px 22px 20px',
      // El centro del brillo va DENTRO de la seccion (12%), no en su borde: en
      // el borde arrancaba a media intensidad y dejaba un corte entre una
      // seccion y la siguiente.
      background: `radial-gradient(ellipse 70% 30% at 50% 14%, rgba(123,60,255,.15), transparent 70%),
                   radial-gradient(ellipse 45% 22% at 100% 60%, rgba(0,229,255,.05), transparent 70%)`,
    }}>
      <div style={{ maxWidth: ancho, margin: '0 auto' }}>
        <span id={`${id}-t`} hidden>{titulo}</span>
        {children}
      </div>
    </section>
  )
}

const titular = {
  margin: 0, textAlign: 'center' as const,
  fontFamily: FUENTE.display, fontWeight: 400, lineHeight: 1,
  textTransform: 'uppercase' as const, color: '#F4F2F5',
}

export function ComoFunciona() {
  return (
    <Marco id="como-funciona" titulo="Cómo funciona" ancho={1040}>
      <h2 style={{ ...titular, fontSize: 'clamp(42px, 11vw, 68px)' }}>Cómo funciona</h2>
      <Hilo />

      <ol className="neon-pasos">
        {COMO_FUNCIONA.map((p, i) => {
          const t = alterna(i), { color, rgb } = TONO[t]
          return (
            <li key={p.t} className="neon-paso" style={tarjeta(t)}>
              <span className="neon-icono" style={{
                color, border: `1.5px solid ${color}`,
                boxShadow: `0 0 10px rgba(${rgb},.35), inset 0 0 12px rgba(${rgb},.16)`,
              }}>
                <span style={{ filter: `drop-shadow(0 0 4px ${color})`, display: 'grid' }}>
                  <Icono nombre={p.i} tam={32} />
                </span>
              </span>
              <div>
                <h3 style={{ margin: 0, font: `700 19px/1.2 ${FUENTE.ui}`, color: '#FFF' }}>
                  <span style={{ color, textShadow: `0 0 12px rgba(${rgb},.6)` }}>{i + 1}.</span> {p.t}
                </h3>
                <p style={{ margin: '8px 0 0', font: `400 15px/1.4 ${FUENTE.ui}`, color: '#BDB8C2' }}>{p.d}</p>
              </div>
            </li>
          )
        })}
      </ol>

      <p style={{
        margin: '22px auto 0', maxWidth: 560, textAlign: 'center',
        font: `400 13px/1.5 ${FUENTE.ui}`, color: COLOR.textoSuave,
      }}>{VERIFICACION_NOTA}</p>
    </Marco>
  )
}

export function FormasDeGanar() {
  return (
    <Marco id="precios" titulo="Precios y formas de ganar" ancho={760}>
      {/* El rotulo con filetes a los lados, como en el mockup. */}
      <div aria-hidden style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${COLOR.acento})` }} />
        <span style={{ font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 3.2, textTransform: 'uppercase', color: '#D9D5DD' }}>
          Precios y formas de ganar
        </span>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(270deg, transparent, ${COLOR.admin})` }} />
      </div>

      <h2 style={{ ...titular, marginTop: 18, fontSize: 'clamp(38px, 11vw, 92px)' }}>Formas de ganar</h2>
      <p style={{
        margin: '14px 0 0', textAlign: 'center', color: COLOR.admin,
        font: `700 14px/1.3 ${FUENTE.ui}`, letterSpacing: 2.4, textTransform: 'uppercase',
        textShadow: GLOW.textoCian,
      }}>Tú creas. Tú eliges. Tú ganas.</p>

      <ul style={{ listStyle: 'none', margin: '28px 0 0', padding: 0, display: 'grid', gap: 12 }}>
        {FORMAS_NEON.map((f, i) => {
          const t = alterna(i), { color, borde, rgb } = TONO[t]
          return (
            <li key={f.t} style={{ ...tarjeta(t), display: 'flex', gap: 16, alignItems: 'center', padding: '14px 16px' }}>
              <span style={{
                flex: '0 0 auto', width: 58, height: 58, borderRadius: 10, display: 'grid', placeItems: 'center',
                color, border: `1px solid rgba(${rgb},.55)`, background: 'rgba(8,8,10,.6)',
                boxShadow: `inset 0 0 12px rgba(${rgb},.16)`,
              }}>
                <span style={{ filter: `drop-shadow(0 0 4px ${borde})`, display: 'grid' }}>
                  <Icono nombre={f.i} tam={30} />
                </span>
              </span>
              <div>
                <h3 style={{
                  margin: 0, font: `700 15px/1.2 ${FUENTE.ui}`, letterSpacing: 1.4,
                  textTransform: 'uppercase', color, textShadow: `0 0 12px rgba(${rgb},.45)`,
                }}>{f.t}</h3>
                <p style={{ margin: '6px 0 0', font: `400 14px/1.4 ${FUENTE.ui}`, color: '#E6E2E9' }}>{f.d}</p>
              </div>
            </li>
          )
        })}
      </ul>

      {/* El panel del 80%: borde de degradado de magenta a cian y las dos luces. */}
      <div className="neon-panel" style={{
        marginTop: 18, borderRadius: RADIO.neon, border: '2px solid transparent',
        background: `linear-gradient(#0B0912, #0B0912) padding-box, linear-gradient(135deg, ${COLOR.acento}, ${COLOR.admin}) border-box`,
        boxShadow: `0 0 12px rgba(255,43,209,.45), 0 0 34px rgba(0,229,255,.25), inset 0 0 26px rgba(255,43,209,.08)`,
      }}>
        <div className="neon-panel-cifra">
          <div style={{ fontFamily: FUENTE.display, lineHeight: .9, fontSize: 'clamp(68px, 20vw, 132px)', whiteSpace: 'nowrap' }}>
            {/* Una cifra tan grande no aguanta el glow denso de un letrero: se vuelve
                una mancha. Dos capas, y mas suaves. */}
            <span style={{ color: '#FF4FE0', textShadow: '0 0 5px rgba(255,43,209,.75), 0 0 20px rgba(255,43,209,.45)' }}>80</span>
            <span style={{ color: '#19E6FF', textShadow: '0 0 5px rgba(0,229,255,.7), 0 0 18px rgba(0,229,255,.4)', fontSize: '.6em' }}>%</span>
          </div>
          <div style={{ marginTop: 8, font: `700 13px/1.2 ${FUENTE.ui}`, letterSpacing: 2, textTransform: 'uppercase', color: '#FFF' }}>
            Para ti
          </div>
        </div>

        <div className="neon-panel-texto">
          <span style={{ color: COLOR.acento, filter: `drop-shadow(0 0 5px ${COLOR.acento})`, display: 'grid' }}>
            <Icono nombre="grafica" tam={34} />
          </span>
          <div style={{ font: `700 clamp(13px, 3.6vw, 19px)/1.15 ${FUENTE.ui}`, letterSpacing: .3, textTransform: 'uppercase' }}>
            <div style={{ color: COLOR.acento, textShadow: GLOW.textoMagenta }}>Sin cuota mensual.</div>
            <div style={{ color: COLOR.admin, textShadow: GLOW.textoCian }}>Sin exclusividad.</div>
          </div>
          <div style={{ font: `400 14px/1.35 ${FUENTE.ui}`, color: '#D9D5DD' }}>Porque tu trabajo tiene valor.</div>
        </div>
      </div>

      <p style={{
        margin: '34px 0 0', textAlign: 'center',
        font: `500 13px/1.6 ${FUENTE.ui}`, letterSpacing: 5, textTransform: 'uppercase', color: '#F4F2F5',
      }}>
        Crea <span style={{ color: COLOR.acento }}>•</span> Publica <span style={{ color: COLOR.acento }}>•</span> Gana <span style={{ color: COLOR.acento }}>•</span> Repite
      </p>
    </Marco>
  )
}
