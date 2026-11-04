// Pantalla 07 — Biblioteca
// Reescrita con datos reales: lo que aparece aqui son compras que existen en la
// base, no el mock del deck.
import { useEffect, useState } from 'react'
import { useSesion } from '../lib/sesion'
import { misCompras, type Comprado } from '../lib/monedero'
import { urlPortada } from '../lib/clips'
import { COLOR, FUENTE } from '../lib/diseño'
import { usd } from '../lib/dinero'
import { Enlace } from '../components/Pulsable'


export default function Library() {
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
      background: COLOR.fondo, color: COLOR.texto, fontFamily: FUENTE.ui,
    }}>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontFamily: FUENTE.display, fontSize: 38, lineHeight: 1, textTransform: 'uppercase' }}>
          Tuyo <span style={{ color: COLOR.dinero }}>para siempre</span>
        </div>
        <div style={{ font: `400 12px/1.6 ${FUENTE.mono}`, color: COLOR.textoTenue, marginTop: 8 }}>
          {compras.length} {compras.length === 1 ? 'clip desbloqueado' : 'clips desbloqueados'}
        </div>
      </div>

      {compras.length === 0 ? (
        <div style={{ padding: '50px 20px', textAlign: 'center', border: '1px dashed rgba(255,255,255,.12)' }}>
          <div style={{ fontFamily: FUENTE.serif, fontStyle: 'italic', fontSize: 19, color: COLOR.textoSuave }}>
            Todavía no has desbloqueado nada.
          </div>
          <Enlace a="/clip" style={{
            marginTop: 18, display: 'inline-block', background: COLOR.acento, color: COLOR.fondo,
            padding: '14px 22px', font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.6,
            textTransform: 'uppercase', cursor: 'pointer',
          }}>Explorar clips</Enlace>
        </div>
      ) : (
        compras.map(c => {
          const p = urlPortada(c.clips?.cover_path ?? null)
          // Un clip borrado no lleva a ningun lado, asi que su fila deja de ser
          // un enlace: antes seguia pareciendo pulsable y no hacia nada.
          const Fila = c.clips
            ? ({ children }: { children: React.ReactNode }) =>
                <Enlace a={`/clip/${c.clips!.id}`} style={filaCompra}>{children}</Enlace>
            : ({ children }: { children: React.ReactNode }) =>
                <div style={{ ...filaCompra, cursor: 'default' }}>{children}</div>
          return (
            <Fila key={c.id}>
              <div style={{
                width: 62, height: 82, flex: '0 0 auto',
                background: p ? `center/cover url(${p})` : `repeating-linear-gradient(130deg,${COLOR.superficieAlta} 0 8px,${COLOR.superficie} 8px 16px)`,
              }} />
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ font: `500 16px/1.3 ${FUENTE.ui}` }}>{c.clips?.title ?? 'Clip eliminado'}</div>
                <div style={{ font: `400 10px/1.45 ${FUENTE.mono}`, color: COLOR.textoTenue, marginTop: 5 }}>
                  @{c.clips?.profiles?.handle ?? '—'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 8 }}>
                  <span style={{
                    background: COLOR.dinero, color: COLOR.fondo, padding: '3px 6px',
                    font: `700 9px/1 ${FUENTE.ui}`, letterSpacing: 1.2, textTransform: 'uppercase',
                  }}>Desbloqueado</span>
                  <span style={{ font: `400 10px/1.45 ${FUENTE.mono}`, color: COLOR.textoApagado }}>
                    {new Date(c.created_at).toLocaleDateString('es-MX')} · {usd(c.price_coins)}
                  </span>
                </div>
              </div>
            </Fila>
          )
        })
      )}
    </div>
  )
}

const filaCompra = {
  display: 'flex', gap: 13, padding: '13px 0', cursor: 'pointer',
  borderBottom: '1px solid rgba(255,255,255,.09)',
} as const

function Centro({ texto }: { texto: string }) {
  return (
    <div style={{
      minHeight: '100%', boxSizing: 'border-box', padding: '64px 26px',
      background: COLOR.fondo, color: COLOR.textoSuave, fontFamily: FUENTE.serif, fontStyle: 'italic',
      fontSize: 19, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>{texto}</div>
  )
}
