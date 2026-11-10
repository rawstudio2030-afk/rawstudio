/* Consultas por Telegram — las reglas del servicio.
 *
 * Es la cara PUBLICA del servicio: se lee sin sesion y sin cruzar la puerta de
 * edad, como /preguntas y /contacto, porque quien decide si usarlo tiene que
 * poder ver las reglas antes de crear una cuenta.
 *
 * El enlace a Telegram sale de `BOT_TELEGRAM`. El token del bot no vive aqui.
 *
 * El texto sale tal cual de `content/consultas.ts`: este archivo solo lo
 * dispone. Modo consumo, igual que las demas paginas de lectura.
 */
import type { ReactNode } from 'react'
import { MarcoDocumento } from '../components/Documento'
import { Enlace } from '../components/Pulsable'
import { COLOR, LINEA, FUENTE, RADIO } from '../lib/diseño'
import {
  INTRO, REGLAS, GUIA_CREADORA, PRIVACIDAD, VALIDACION, BOT_TELEGRAM,
} from '../content/consultas'

const cuerpo: React.CSSProperties = {
  margin: 0, font: `400 15px/1.65 ${FUENTE.ui}`, color: '#C2BDC7',
}

function Titulo({ children }: { children: ReactNode }) {
  return (
    <h2 style={{
      margin: '38px 0 14px', font: `700 12px/1.45 ${FUENTE.ui}`, letterSpacing: 1.6,
      textTransform: 'uppercase', color: COLOR.dinero,
    }}>{children}</h2>
  )
}

function Lista({ items, ordenada }: { items: string[]; ordenada?: boolean }) {
  const Tag = ordenada ? 'ol' : 'ul'
  return (
    <Tag style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 8, ...cuerpo }}>
      {items.map((t, i) => <li key={i}>{t}</li>)}
    </Tag>
  )
}

export default function Consultas() {
  return (
    <MarcoDocumento titulo={['Consultas', 'por Telegram']}>
      {INTRO.map((p, i) => (
        <p key={i} style={{ ...cuerpo, margin: i ? '8px 0 0' : '18px 0 0', fontSize: 16, color: '#C2BDC7' }}>{p}</p>
      ))}

      <div style={{ marginTop: 14, font: `400 12px/1.5 ${FUENTE.mono}`, color: COLOR.textoSuave }}>
        Plataforma para mayores de 18 años.
      </div>

      {BOT_TELEGRAM && (
        <a
          href={`https://t.me/${BOT_TELEGRAM}`}
          target="_blank"
          rel="noopener noreferrer"
          className="pulsable"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            marginTop: 18,
            minHeight: 44,
            padding: '0 18px',
            borderRadius: RADIO.filo,
            border: `1.5px solid ${LINEA.marcada}`,
            font: `700 15px/1.3 ${FUENTE.ui}`,
            color: COLOR.admin,
            textDecoration: 'none',
            background: 'transparent',
          }}
        >
          Abrir @{BOT_TELEGRAM} en Telegram
        </a>
      )}

      {/* ---------- las reglas ---------- */}
      <Titulo>Reglas del servicio</Titulo>
      <div style={{ display: 'grid', gap: 10 }}>
        {REGLAS.map(r => (
          <div key={r.n} className="tarjeta-sobria" style={{ padding: '16px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ font: `700 12px/1 ${FUENTE.mono}`, color: COLOR.dinero }}>{r.n}</span>
              <h3 style={{ margin: 0, font: `700 16px/1.3 ${FUENTE.ui}`, color: COLOR.texto }}>{r.t}</h3>
            </div>
            {r.d.map((p, i) => <p key={i} style={{ ...cuerpo, marginTop: 8 }}>{p}</p>)}
            {r.n === 6 && (
              <div style={{ marginTop: 10 }}><Lista items={GUIA_CREADORA} ordenada /></div>
            )}
          </div>
        ))}
      </div>

      {/* ---------- privacidad mutua ---------- */}
      <Titulo>Checklist de privacidad mutua</Titulo>
      <p style={cuerpo}>{PRIVACIDAD.intro}</p>
      <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
        {[PRIVACIDAD.cliente, PRIVACIDAD.creadora, PRIVACIDAD.bot].map(g => (
          <div key={g.t} className="tarjeta-sobria" style={{ padding: '16px 16px' }}>
            <h3 style={{ margin: '0 0 10px', font: `700 14px/1.3 ${FUENTE.ui}`, color: COLOR.texto }}>{g.t}</h3>
            <Lista items={g.l} />
          </div>
        ))}
      </div>

      {/* ---------- validacion ---------- */}
      <Titulo>Capa de validación (IA de apoyo)</Titulo>
      {VALIDACION.intro.map((p, i) => <p key={i} style={{ ...cuerpo, marginTop: i ? 8 : 0 }}>{p}</p>)}
      <h3 style={{ margin: '18px 0 10px', font: `700 14px/1.3 ${FUENTE.ui}`, color: COLOR.texto }}>
        {VALIDACION.titulo_pasos}
      </h3>
      <Lista items={VALIDACION.pasos} ordenada />

      {/* ---------- pie ---------- */}
      <div style={{
        marginTop: 34, padding: '16px 16px', borderRadius: RADIO.filo,
        border: `1.5px dashed ${LINEA.marcada}`, font: `400 14px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave,
      }}>
        ¿Dudas sobre cómo funciona el sitio? Mira las{' '}
        <Enlace a="/preguntas" style={{ color: COLOR.admin, textDecoration: 'underline', textUnderlineOffset: 3 }}>
          preguntas frecuentes
        </Enlace>{' '}o <Enlace a="/contacto" style={{ color: COLOR.admin, textDecoration: 'underline', textUnderlineOffset: 3 }}>
          escríbenos
        </Enlace>.
      </div>
    </MarcoDocumento>
  )
}
