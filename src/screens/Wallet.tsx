// Pantalla 03 — Monedero
// Reescrita con datos reales. El saldo NO se guarda en ningun campo: se deriva
// de la suma del libro contable, asi que nunca puede quedar desincronizado de
// sus movimientos.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSesion } from '../lib/sesion'
import { saldo, movimientos, NOMBRE_MOTIVO, type Movimiento } from '../lib/monedero'

const UI = "'Space Grotesk', system-ui, sans-serif"
const MONO = "'Space Mono', monospace"
const SERIF = "'Instrument Serif', serif"

export default function Wallet() {
  const nav = useNavigate()
  const { sesion, cargando: cargandoSesion } = useSesion()
  const [coins, setCoins] = useState<number | null>(null)
  const [movs, setMovs] = useState<Movimiento[]>([])

  useEffect(() => {
    if (cargandoSesion || !sesion) return
    let vivo = true
    Promise.all([saldo(), movimientos()]).then(([s, m]) => {
      if (!vivo) return
      setCoins(s); setMovs(m)
    })
    return () => { vivo = false }
  }, [sesion, cargandoSesion])

  if (cargandoSesion || coins === null) return <Centro texto="Cargando…" />

  return (
    <div style={{
      minHeight: '100%', boxSizing: 'border-box', padding: '54px 22px 40px',
      background: '#08080A', color: '#F2F0F3', fontFamily: UI,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 26 }}>
        <span onClick={() => nav(-1)} style={{ font: `400 26px/1 ${UI}`, color: '#9C979F', cursor: 'pointer' }}>‹</span>
        <span style={{ font: `700 10px/1 ${UI}`, letterSpacing: 2.2, textTransform: 'uppercase', color: '#C8FF3D' }}>
          Monedero
        </span>
        <span style={{ width: 14 }} />
      </div>

      <div style={{ border: '1px solid rgba(255,255,255,.12)', padding: '24px 20px', marginBottom: 22 }}>
        <div style={{ font: `700 10px/1 ${UI}`, letterSpacing: 2.2, textTransform: 'uppercase', color: '#6E6A72' }}>
          Saldo
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 12 }}>
          <span style={{ fontFamily: 'Anton, sans-serif', fontSize: 56, lineHeight: 1, color: '#C8FF3D' }}>{coins}</span>
          <span style={{ font: `400 14px/1 ${MONO}`, color: '#6E6A72', textTransform: 'uppercase', letterSpacing: 1.5 }}>coins</span>
        </div>
      </div>

      {/* Sin procesador de pagos no hay recarga real. Decirlo es mas util que
          un boton que no hace nada. */}
      <div style={{
        border: '1.5px dashed rgba(255,43,209,.4)', background: 'rgba(255,43,209,.05)',
        padding: '18px 16px', marginBottom: 26,
      }}>
        <div style={{ font: `700 10px/1 ${UI}`, letterSpacing: 2, textTransform: 'uppercase', color: '#FF2BD1' }}>
          Recargar todavía no
        </div>
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 16, lineHeight: 1.4, color: '#9C979F', marginTop: 9 }}>
          Falta conectar un procesador de pagos compatible con este giro. Mientras tanto, la administración puede acreditarte coins.
        </div>
      </div>

      <div style={{ font: `700 10px/1 ${UI}`, letterSpacing: 2.2, textTransform: 'uppercase', color: '#6E6A72', marginBottom: 12 }}>
        Movimientos
      </div>

      {movs.length === 0 ? (
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 17, color: '#6E6A72', padding: '22px 0' }}>
          Todavía no hay movimientos.
        </div>
      ) : movs.map(m => (
        <div key={m.id} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 2px', borderBottom: '1px solid rgba(255,255,255,.09)',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: `600 14px/1.3 ${UI}` }}>{NOMBRE_MOTIVO[m.motivo]}</div>
            <div style={{ font: `400 11px/1.5 ${MONO}`, color: '#6E6A72', marginTop: 3 }}>
              {new Date(m.created_at).toLocaleDateString('es-MX')}
              {m.nota && ` · ${m.nota}`}
            </div>
          </div>
          <span style={{
            fontFamily: 'Anton, sans-serif', fontSize: 20, lineHeight: 1,
            color: m.delta > 0 ? '#C8FF3D' : '#FF2BD1',
          }}>
            {m.delta > 0 ? '+' : ''}{m.delta}
          </span>
        </div>
      ))}
    </div>
  )
}

function Centro({ texto }: { texto: string }) {
  return (
    <div style={{
      minHeight: '100%', boxSizing: 'border-box', padding: '64px 26px',
      background: '#08080A', color: '#9C979F', fontFamily: SERIF, fontStyle: 'italic',
      fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>{texto}</div>
  )
}
