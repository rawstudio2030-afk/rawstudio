// Pantalla 09b — La puerta
// Aparece despues del age gate y antes de pedir cualquier dato: separa
// "vengo a ver" de "vengo a publicar", que son los dos negocios distintos que
// conviven en RAWstudio.
import { useNavigate } from 'react-router-dom'
import wordmark from '../assets/wordmark.png'

const UI = "'Space Grotesk', system-ui, sans-serif"
const MONO = "'Space Mono', monospace"

export default function Entrar() {
  const nav = useNavigate()

  return (
    <div style={{
      minHeight: '100%', boxSizing: 'border-box', padding: '64px 26px 44px',
      background: '#08080A', color: '#F2F0F3', fontFamily: UI,
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        position: 'relative', width: 150, height: 56, transform: 'rotate(-2deg)',
        filter: 'drop-shadow(0 0 16px rgba(255,43,209,.6))',
      }}>
        <img src={wordmark} alt="RAWstudio" style={{ width: '100%', height: 'auto', display: 'block' }} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 22, padding: '30px 0' }}>
        <div style={{ width: 64, height: 3, background: '#FF2BD1' }} />
        {/* Interlineado 1 y no .9 como el deck: en español los titulares llevan
            mayusculas acentuadas (CÓMO) y con el interlineado apretado el acento
            queda tapado por la linea de arriba. El deck no lo sufre por estar
            en ingles. */}
        <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 52, lineHeight: 1, textTransform: 'uppercase' }}>
          Elige<br />cómo<br /><span style={{ color: '#C8FF3D' }}>entras.</span>
        </div>
        <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 21, lineHeight: 1.35, color: '#9C979F' }}>
          Con tu correo y una contraseña. El acceso por liga también sigue ahí.
        </div>

        {/* Gancho para creadoras. Va aqui y no despues del registro porque este
            es el momento en que alguien decide de que lado de la plataforma
            esta: quien viene a publicar no deberia tener que registrarse como
            comprador primero para descubrir que puede cobrar. */}
        <div
          onClick={() => nav('/creadoras')}
          style={{
            marginTop: 6, padding: '18px 16px', cursor: 'pointer',
            border: '1.5px dashed rgba(200,255,61,.45)',
            background: 'rgba(200,255,61,.05)',
          }}>
          <div style={{ font: `700 10px/1 ${UI}`, letterSpacing: 2.2, textTransform: 'uppercase', color: '#C8FF3D', marginBottom: 9 }}>
            ¿Vas a publicar tú?
          </div>
          <div style={{ font: `400 15px/1.45 ${UI}`, color: '#F2F0F3', marginBottom: 10 }}>
            El <b style={{ fontWeight: 700 }}>80% de cada peso</b> es tuyo, pagos cada semana y sin exclusividad.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ font: `400 11px/1.5 ${MONO}`, color: '#6E6A72' }}>
              Nadie ve tu nombre real
            </span>
            <span style={{ font: `700 14px/1 ${UI}`, color: '#C8FF3D' }}>&#8594;</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div
          onClick={() => nav('/registro')}
          style={{
            background: '#FF2BD1', color: '#08080A', textAlign: 'center', padding: 19,
            font: `700 13px/1 ${UI}`, letterSpacing: 2.2, textTransform: 'uppercase',
            boxShadow: '0 0 34px rgba(255,43,209,.42)', cursor: 'pointer',
          }}>
          Crear mi cuenta
        </div>
        <div
          onClick={() => nav('/acceso')}
          style={{
            border: '1px solid rgba(255,255,255,.16)', color: '#9C979F',
            textAlign: 'center', padding: 18,
            font: `700 12px/1 ${UI}`, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer',
          }}>
          Ya tengo cuenta
        </div>
      </div>
    </div>
  )
}
