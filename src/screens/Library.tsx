// Pantalla 07 — Biblioteca
// Reescrita con datos reales: lo que aparece aqui son compras que existen en la
// base, no el mock del deck.
import { useEffect, useState } from 'react'
import { useSesion } from '../lib/sesion'
import { misCompras, type Comprado } from '../lib/monedero'
import { urlPortada } from '../lib/clips'
import { COLOR, FUENTE, RADIO } from '../lib/diseño'
import { usd } from '../lib/dinero'
import { cuantos } from '../lib/plural'
import { Pulsable, Enlace } from '../components/Pulsable'
import Centro from '../components/Centro'
import { FONDO_OSCURO } from '../lib/oscuro'


export default function Library() {
  const { sesion, cargando } = useSesion()
  const [compras, setCompras] = useState<Comprado[] | null>(null)
  // Decirle «no has desbloqueado nada» a alguien que SI pago es lo peor que
  // puede hacer esta pantalla: parece que perdio lo que compro.
  const [fallo, setFallo] = useState<string | null>(null)
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    if (cargando || !sesion) return
    let vivo = true
    misCompras().then(r => {
      if (!vivo) return
      setCompras(r.datos); setFallo(r.fallo)
    })
    return () => { vivo = false }
  }, [sesion, cargando, intento])

  if (cargando || compras === null) return <Centro texto="Cargando…" />

  return <VistaBiblioteca compras={compras} fallo={fallo} alReintentar={() => setIntento(n => n + 1)} />
}

/** Lo que se ve. No sabe de donde salen las compras: las recibe, y por eso se
 *  puede dibujar con datos de muestra.
 *
  * Modo consumo (DESIGN-BRIEF.md): la biblioteca es donde se viene a VER lo
   * que ya se pago. Fondo plano, titular de interfaz y una tarjeta por clip; el
   * color queda para lo que es dinero. */
export function VistaBiblioteca({ compras, fallo, alReintentar }: {
  compras: Comprado[]; fallo: string | null; alReintentar: () => void
}) {
  return (
    <div style={{
      minHeight: '100%', boxSizing: 'border-box', padding: '28px 18px 40px',
      background: FONDO_OSCURO, color: COLOR.texto, fontFamily: FUENTE.ui,
      width: '100%', maxWidth: 680, margin: '0 auto',
    }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, font: `700 28px/1.15 ${FUENTE.ui}` }}>
          Tuyo <span style={{ color: COLOR.dinero }}>para siempre</span>
        </h1>
        <div style={{ font: `400 13px/1.6 ${FUENTE.mono}`, color: COLOR.textoSuave, marginTop: 8 }}>
          {fallo ? '—'
            : `${compras.length} ${compras.length === 1 ? 'clip desbloqueado' : 'clips desbloqueados'}`}
        </div>
      </div>

      {fallo ? (
        <div style={{ padding: '50px 20px', textAlign: 'center', borderRadius: RADIO.filo, border: `1px solid ${COLOR.acento}` }}>
          <div style={{ font: `400 19px/1.35 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
            No pudimos leer lo que compraste.
          </div>
          <div style={{ font: `400 14px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave, marginTop: 10 }}>
            No significa que no esté. Nada de lo que pagaste se pierde por esto.
          </div>
          <Pulsable al={alReintentar} className="boton-principal"
            style={{ display: 'inline-flex', marginTop: 18, padding: '0 28px' }}>Reintentar</Pulsable>
        </div>
      ) : compras.length === 0 ? (
        <div style={{ padding: '50px 20px', textAlign: 'center', borderRadius: RADIO.filo, border: '1.5px dashed rgba(255,255,255,.2)' }}>
          <div style={{ font: `400 19px/1.35 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
            Todavía no has desbloqueado nada.
          </div>
          <Enlace a="/clip" className="boton-principal"
            style={{ display: 'inline-flex', marginTop: 18, padding: '0 28px' }}>Explorar clips</Enlace>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {compras.map(c => {
            const p = urlPortada(c.clips?.cover_path ?? null)
            // Un clip borrado no lleva a ningun lado, asi que su fila deja de ser
            // un enlace: antes seguia pareciendo pulsable y no hacia nada.
            const Fila = c.clips
              ? ({ children }: { children: React.ReactNode }) =>
                  <Enlace a={`/clip/${c.clips!.id}`} className="tarjeta-sobria" style={filaCompra}>{children}</Enlace>
              : ({ children }: { children: React.ReactNode }) =>
                  <div className="tarjeta-sobria" style={{ ...filaCompra, cursor: 'default' }}>{children}</div>
            return (
              <Fila key={c.id}>
                <div style={{
                  width: 64, height: 84, flex: '0 0 auto', borderRadius: 10,
                  background: p ? `center/cover url(${p})` : `repeating-linear-gradient(130deg,${COLOR.superficieAlta} 0 8px,${COLOR.superficie} 8px 16px)`,
                }} />
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ font: `700 16px/1.3 ${FUENTE.ui}` }}>{c.clips?.title ?? 'Clip eliminado'}</div>
                  <div style={{ font: `400 12px/1.45 ${FUENTE.mono}`, color: COLOR.textoSuave, marginTop: 5 }}>
                    @{c.clips?.profiles?.handle ?? '—'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 9 }}>
                    <span style={{
                      background: COLOR.dinero, color: COLOR.fondo, padding: '4px 7px', borderRadius: 6,
                      font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.1, textTransform: 'uppercase',
                    }}>Desbloqueado</span>
                    <span style={{ font: `400 12px/1.45 ${FUENTE.mono}`, color: COLOR.textoSuave }}>
                      {new Date(c.created_at).toLocaleDateString('es-MX')} · {usd(c.price_coins)}
                      {c.clips?.formato === 'album' && ` · Álbum de ${cuantos(c.clips.num_fotos, 'foto')}`}
                    </span>
                  </div>
                </div>
              </Fila>
            )
          })}
        </div>
      )}
    </div>
  )
}

const filaCompra = {
  display: 'flex', gap: 14, padding: 12, cursor: 'pointer', minHeight: 64,
} as const
