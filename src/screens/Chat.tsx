// Pantalla en espera de su tabla.
// Antes mostraba el mock del deck con una creadora inventada ("Mira Vanta") y
// clips que no existen. Se quito: datos falsos pero realistas dentro de una app
// en vivo se leen como ciertos, y eso ya causo confusion real.
import { useNavigate } from 'react-router-dom'
import { COLOR, FUENTE } from '../lib/diseño'


export default function Pantalla() {
  const nav = useNavigate()
  return (
    <div style={{
      minHeight: '100%', boxSizing: 'border-box', padding: '54px 24px 40px',
      background: COLOR.fondo, color: COLOR.texto, fontFamily: FUENTE.ui,
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span onClick={() => nav(-1)} style={{ font: `400 26px/1 ${FUENTE.ui}`, color: COLOR.textoSuave, cursor: 'pointer' }}>‹</span>
        <span style={{ font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 2.2, textTransform: 'uppercase', color: COLOR.dinero }}>
          Mensajes
        </span>
        <span style={{ width: 14 }} />
      </div>

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 18, textAlign: 'center',
      }}>
        <div style={{ width: 64, height: 3, background: COLOR.acento }} />
        <div style={{ fontFamily: FUENTE.serif, fontStyle: 'italic', fontSize: 20, lineHeight: 1.4, color: COLOR.textoSuave, maxWidth: 320 }}>
          Los mensajes con propinas llegan cuando construyamos esa parte. Por ahora no hay conversaciones reales.
        </div>
      </div>
    </div>
  )
}
