// Pantalla en espera de su tabla.
// Antes mostraba el mock del deck con una creadora inventada ("Mira Vanta") y
// clips que no existen. Se quito: datos falsos pero realistas dentro de una app
// en vivo se leen como ciertos, y eso ya causo confusion real.
import { useNavigate } from 'react-router-dom'

const UI = "'Space Grotesk', system-ui, sans-serif"
const SERIF = "'Instrument Serif', serif"

export default function Pantalla() {
  const nav = useNavigate()
  return (
    <div style={{
      minHeight: '100%', boxSizing: 'border-box', padding: '54px 24px 40px',
      background: '#08080A', color: '#F2F0F3', fontFamily: UI,
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span onClick={() => nav(-1)} style={{ font: `400 26px/1 ${UI}`, color: '#9C979F', cursor: 'pointer' }}>‹</span>
        <span style={{ font: `700 10px/1 ${UI}`, letterSpacing: 2.2, textTransform: 'uppercase', color: '#C8FF3D' }}>
          Mensajes
        </span>
        <span style={{ width: 14 }} />
      </div>

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 18, textAlign: 'center',
      }}>
        <div style={{ width: 64, height: 3, background: '#FF2BD1' }} />
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 20, lineHeight: 1.4, color: '#9C979F', maxWidth: 320 }}>
          Los mensajes con propinas llegan cuando construyamos esa parte. Por ahora no hay conversaciones reales.
        </div>
      </div>
    </div>
  )
}
