// Pantalla en espera de su tabla.
// Antes mostraba el mock del deck con cifras inventadas (ganancias de $4,182 y desglose por concepto). Se quito:
// numeros falsos dentro de una app en vivo se leen como ciertos, y en una
// pantalla de dinero eso es peor que en cualquier otra.
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
          Ganancias
        </span>
        <span style={{ width: 14 }} />
      </div>

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 18, textAlign: 'center',
      }}>
        <div style={{ width: 64, height: 3, background: COLOR.acento }} />
        <div style={{ fontFamily: FUENTE.display, fontSize: 40, lineHeight: 1, textTransform: 'uppercase' }}>
          Aún<br />no hay<br /><span style={{ color: COLOR.dinero }}>números.</span>
        </div>
        <div style={{ fontFamily: FUENTE.serif, fontStyle: 'italic', fontSize: 19, lineHeight: 1.4, color: COLOR.textoSuave, maxWidth: 330 }}>
          Tus ganancias aparecerán aquí cuando existan ventas reales. Preferimos una pantalla vacía a una cifra inventada.
        </div>
        <div style={{ font: `400 11px/1.7 ${FUENTE.mono}`, color: COLOR.textoApagado, maxWidth: 330, marginTop: 6 }}>
          Requiere el monedero y las compras.
        </div>
      </div>
    </div>
  )
}
