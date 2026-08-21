// Pantalla 07 — Biblioteca
// Reescrita con datos reales: lo que aparece aqui son compras que existen en la
// base, no el mock del deck.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSesion } from '../lib/sesion'
import { misCompras, type Comprado } from '../lib/monedero'
import { urlPortada } from '../lib/clips'

const UI = "'Space Grotesk', system-ui, sans-serif"
const MONO = "'Space Mono', monospace"
const SERIF = "'Instrument Serif', serif"

export default function Library() {
  const nav = useNavigate()
  const { sesion, cargando } = useSesion()
  const [compras, setCompras] = useState<Comprado[] | null>(null)

  useEffect(() => {
    if (cargando || !sesion) return
    let vivo = true
    misCompras().then(c => { if (vivo) setCompras(c) })
    return () => { vivo = false }
  }, [sesion, cargando])

  if (cargando || compras === null) return <Centro texto="Cargando…" />

  return (
    <div style={{
      minHeight: '100%', boxSizing: 'border-box', padding: '54px 20px 40px',
      background: '#08080A', color: '#F2F0F3', fontFamily: UI,
    }}>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 38, lineHeight: 1, textTransform: 'uppercase' }}>
          Tuyo <span style={{ color: '#C8FF3D' }}>para siempre</span>
        </div>
        <div style={{ font: `400 12px/1.6 ${MONO}`, color: '#6E6A72', marginTop: 8 }}>
          {compras.length} {compras.length === 1 ? 'clip desbloqueado' : 'clips desbloqueados'}
        </div>
      </div>

      {compras.length === 0 ? (
        <div style={{ padding: '50px 20px', textAlign: 'center', border: '1px dashed rgba(255,255,255,.12)' }}>
          <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 19, color: '#9C979F' }}>
            Todavía no has desbloqueado nada.
          </div>
          <div onClick={() => nav('/clip')} style={{
            marginTop: 18, display: 'inline-block', background: '#FF2BD1', color: '#08080A',
            padding: '14px 22px', font: `700 11px/1 ${UI}`, letterSpacing: 1.8,
            textTransform: 'uppercase', cursor: 'pointer',
          }}>Explorar clips</div>
        </div>
      ) : (
        compras.map(c => {
          const p = urlPortada(c.clips?.cover_path ?? null)
          return (
            <div key={c.id} onClick={() => c.clips && nav(`/clip/${c.clips.id}`)} style={{
              display: 'flex', gap: 13, padding: '13px 0', cursor: 'pointer',
              borderBottom: '1px solid rgba(255,255,255,.09)',
            }}>
              <div style={{
                width: 62, height: 82, flex: '0 0 auto',
                background: p ? `center/cover url(${p})` : 'repeating-linear-gradient(130deg,#191920 0 8px,#111116 8px 16px)',
              }} />
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ font: `600 15px/1.3 ${UI}` }}>{c.clips?.title ?? 'Clip eliminado'}</div>
                <div style={{ font: `400 11px/1.5 ${MONO}`, color: '#6E6A72', marginTop: 5 }}>
                  @{c.clips?.profiles?.handle ?? '—'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8 }}>
                  <span style={{
                    background: '#C8FF3D', color: '#08080A', padding: '3px 6px',
                    font: `700 8.5px/1 ${UI}`, letterSpacing: 1.1, textTransform: 'uppercase',
                  }}>Desbloqueado</span>
                  <span style={{ font: `400 10px/1.4 ${MONO}`, color: '#5E5A63' }}>
                    {new Date(c.created_at).toLocaleDateString('es-MX')} · {c.price_coins} coins
                  </span>
                </div>
              </div>
            </div>
          )
        })
      )}
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
