// Pantalla en espera de su tabla.
// Antes mostraba el mock del deck con cifras inventadas (saldo de 180 coins y paquetes de recarga). Se quito:
// numeros falsos dentro de una app en vivo se leen como ciertos, y en una
// pantalla de dinero eso es peor que en cualquier otra.
import { useNavigate } from 'react-router-dom'

const UI = "'Space Grotesk', system-ui, sans-serif"
const MONO = "'Space Mono', monospace"
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
          Monedero
        </span>
        <span style={{ width: 14 }} />
      </div>

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 18, textAlign: 'center',
      }}>
        <div style={{ width: 64, height: 3, background: '#FF2BD1' }} />
        <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 40, lineHeight: 1, textTransform: 'uppercase' }}>
          Sin<br />saldo<br /><span style={{ color: "#C8FF3D" }}>todavía.</span>
        </div>
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 19, lineHeight: 1.4, color: '#9C979F', maxWidth: 330 }}>
          El monedero no está construido. Cuando lo esté, el saldo saldrá de un libro contable: una fila por movimiento, nunca un número suelto.
        </div>
        <div style={{ font: `400 11px/1.7 ${MONO}`, color: '#5E5A63', maxWidth: 330, marginTop: 6 }}>
          Cobrar de verdad depende además de un procesador compatible con contenido adulto.
        </div>
      </div>
    </div>
  )
}
