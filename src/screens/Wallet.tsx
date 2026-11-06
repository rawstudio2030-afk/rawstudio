/* Pantalla 03 — Dinero.
 *
 * Eran dos: «Monedero» (/wallet) y «Ganancias» (/earnings). La segunda nunca
 * se construyo —decia «aún no hay números»— y la primera ya tenia todo lo que
 * le hacia falta, porque las dos salen del MISMO libro contable: lo que entra
 * por vender y lo que sale por comprar son asientos de la misma tabla. Dos
 * pantallas para un solo libro obligaban a elegir en cual mirar sin que
 * ninguna diera la cuenta completa.
 *
 * Ahora es una con dos caras. /earnings redirige aqui.
 *
 * El saldo NO se guarda en ningun campo: se deriva de la suma del libro, asi
 * que nunca puede quedar desincronizado de sus movimientos.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSesion } from '../lib/sesion'
import {
  saldo, movimientos, totales, caraDe, NOMBRE_MOTIVO,
  type Movimiento, type Cara,
} from '../lib/monedero'
import { usd } from '../lib/dinero'
import { COLOR, LINEA, FUENTE, RADIO, GLOW } from '../lib/diseño'
import Icono from '../components/Iconos'
import { Pulsable } from '../components/Pulsable'
import { Enlace } from '../components/Pulsable'
import Centro from '../components/Centro'

/* Se piden mas de los que caben en pantalla porque de aqui salen tambien los
   totales. Si algun dia hay mas de quinientos movimientos, los totales habra
   que sacarlos de la base y no de la lista. */
const CUANTOS = 500

type Pestana = 'todo' | Cara

export default function Dinero() {
  const nav = useNavigate()
  const { sesion, perfil, cargando: cargandoSesion } = useSesion()
  const [centavos, setCentavos] = useState<number | null>(null)
  const [movs, setMovs] = useState<Movimiento[]>([])
  const [pestana, setPestana] = useState<Pestana>('todo')

  // Un saldo de cero es una respuesta legitima, asi que si la consulta falla
  // NO se puede pintar cero: seria decirle a alguien que no tiene dinero.
  // Esta pantalla prefiere no enseñar cifra a enseñar una falsa.
  const [fallo, setFallo] = useState<string | null>(null)
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    if (cargandoSesion || !sesion) return
    let vivo = true
    Promise.all([saldo(), movimientos(CUANTOS)]).then(([s, m]) => {
      if (!vivo) return
      setCentavos(s.datos); setMovs(m.datos); setFallo(s.fallo ?? m.fallo)
    })
    return () => { vivo = false }
  }, [sesion, cargandoSesion, intento])

  if (cargandoSesion || centavos === null) return <Centro texto="Cargando…" />

  const esCreadora = !!perfil?.is_creator
  const t = totales(movs)
  const visibles = pestana === 'todo' ? movs : movs.filter(m => caraDe(m) === pestana)

  return (
    <VistaDinero
      centavos={centavos} fallo={fallo} esCreadora={esCreadora} totales={t}
      movimientos={visibles} pestana={pestana} alPestana={setPestana}
      alReintentar={() => setIntento(n => n + 1)} alVolver={() => nav(-1)} />
  )
}

/** Lo que se ve. No sabe de donde salen los datos: los recibe, y por eso se
 *  puede dibujar con datos de muestra sin tocar el libro contable.
 *
 *  Modo consumo (DESIGN-BRIEF.md): fondo plano, sin animacion, y el color solo
 *  donde hay dinero —lima lo que entra o se tiene, magenta lo que sale—. */
export function VistaDinero({
  centavos, fallo, esCreadora, totales: t, movimientos, pestana, alPestana, alReintentar, alVolver,
}: {
  centavos: number
  fallo: string | null
  esCreadora: boolean
  totales: { gane: number; gaste: number; retirado: number }
  movimientos: Movimiento[]
  pestana: Pestana
  alPestana: (p: Pestana) => void
  alReintentar: () => void
  alVolver: () => void
}) {
  const rotulo = { font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 2, textTransform: 'uppercase' as const, color: COLOR.textoSuave }

  return (
    <div style={{
      minHeight: '100%', boxSizing: 'border-box', padding: '20px 18px 40px',
      background: COLOR.fondo, color: COLOR.texto, fontFamily: FUENTE.ui,
      width: '100%', maxWidth: 680, margin: '0 auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <Pulsable al={alVolver} rotulo="Volver" style={{
          width: 44, height: 44, borderRadius: '50%', display: 'grid', placeItems: 'center',
          border: '1px solid rgba(255,255,255,.22)', color: COLOR.texto, cursor: 'pointer',
        }}><span aria-hidden style={{ font: `400 22px/1 ${FUENTE.ui}` }}>&#8249;</span></Pulsable>
        <span style={{ ...rotulo, color: COLOR.dinero }}>Dinero</span>
        <span aria-hidden style={{ width: 44 }} />
      </div>

      {/* ---------- Saldo ---------- */}
      <div style={rotulo}>Mi billetera</div>
      <h1 style={{ margin: '10px 0 0', font: `700 28px/1.1 ${FUENTE.ui}` }}>Saldo disponible</h1>
      {/* usd() y no el entero en crudo: el libro guarda CENTAVOS. Antes esta
          cifra se pintaba tal cual con la palabra «dólares» al lado, asi que
          $2.40 se leia como «240 dólares». */}
      <div style={{
        font: `700 clamp(52px, 17vw, 84px)/1 ${FUENTE.ui}`, letterSpacing: -1, marginTop: 12,
        color: fallo ? COLOR.textoApagado : COLOR.dinero,
        textShadow: fallo ? 'none' : '0 0 24px rgba(200,255,61,.28)',
      }}>
        {fallo ? '—' : usd(centavos)}
      </div>
      {fallo ? (
        <div style={{ marginTop: 10 }}>
          <div style={{ font: `400 13px/1.5 ${FUENTE.mono}`, color: COLOR.acento }}>
            No pudimos leer tu saldo. Tu dinero está donde estaba — lo que falló
            fue la consulta.
          </div>
          <Pulsable al={alReintentar} style={{
            marginTop: 12, minHeight: 44, padding: '0 18px', display: 'inline-flex', alignItems: 'center',
            cursor: 'pointer', borderRadius: RADIO.neon, border: `1px solid ${LINEA.fuerte}`, color: COLOR.texto,
            font: `700 12px/1 ${FUENTE.ui}`, letterSpacing: 1.6, textTransform: 'uppercase',
          }}>Reintentar</Pulsable>
        </div>
      ) : (
        <div style={{ font: `400 13px/1.45 ${FUENTE.ui}`, color: COLOR.textoSuave, marginTop: 10 }}>
          {esCreadora ? 'Lo que puedes gastar o retirar.' : 'Lo que puedes gastar.'}
        </div>
      )}

      {/* ---------- Acciones ----------
          Retirar SI existe: la pantalla comprueba identidad, cuenta bancaria,
          minimo y disponible, y dice cual falta. */}
      <div style={{
        display: 'flex', marginTop: 24, borderRadius: RADIO.neon, overflow: 'hidden',
        border: '1.5px solid rgba(200,255,61,.45)', background: 'rgba(200,255,61,.04)',
        boxShadow: `${GLOW.lima}, inset 0 0 18px rgba(200,255,61,.06)`,
      }}>
        {esCreadora && (
          <Enlace a="/estudio/retirar" style={{
            flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '16px 14px', cursor: 'pointer',
          }}>
            <span style={iconoCirculo}><Icono nombre="banco" tam={22} /></span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', font: `700 15px/1.2 ${FUENTE.ui}` }}>Retirar por SPEI</span>
              <span style={{ display: 'block', font: `400 12px/1.35 ${FUENTE.ui}`, color: COLOR.textoSuave, marginTop: 4 }}>
                Transferencia a tu cuenta
              </span>
            </span>
          </Enlace>
        )}
        <Pulsable al={() => document.getElementById('movimientos')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} style={{
          flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '16px 14px', cursor: 'pointer',
          textAlign: 'left', borderLeft: esCreadora ? '1px solid rgba(255,255,255,.14)' : 'none',
        }}>
          <span style={iconoCirculo}><Icono nombre="texto" tam={22} /></span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', font: `700 15px/1.2 ${FUENTE.ui}` }}>Ver historial</span>
            <span style={{ display: 'block', font: `400 12px/1.35 ${FUENTE.ui}`, color: COLOR.textoSuave, marginTop: 4 }}>
              Consulta tus movimientos
            </span>
          </span>
        </Pulsable>
      </div>

      {/* ---------- Las dos caras ---------- */}
      <div style={{
        display: 'grid', gap: 8, marginTop: 14,
        gridTemplateColumns: esCreadora ? 'repeat(3, minmax(0, 1fr))' : '1fr',
      }}>
        {esCreadora && <Cifra rotulo="Ganado" valor={t.gane} color={COLOR.dinero} />}
        <Cifra rotulo="Gastado" valor={t.gaste} color={COLOR.acento} />
        {esCreadora && <Cifra rotulo="Retirado" valor={t.retirado} color={COLOR.textoSuave} />}
      </div>

      {/* ---------- Lo que todavia no se puede ----------
          Recargar sigue sin existir —hace falta un procesador de pagos
          compatible con este giro— y decirlo es mas util que un boton que no
          hace nada. */}
      <div style={{ marginTop: 14, padding: '14px 16px', borderRadius: RADIO.neon, border: `1.5px dashed ${LINEA.marcada}` }}>
        <div style={{ font: `400 13px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
          <b style={{ color: COLOR.texto }}>Recargar</b> todavía no se puede: falta un
          procesador de pagos compatible con este giro. Mientras tanto, la administración
          puede acreditarte saldo.
        </div>
      </div>

      {/* ---------- Movimientos ---------- */}
      <h2 id="movimientos" style={{ margin: '34px 0 0', font: `700 20px/1.2 ${FUENTE.ui}`, scrollMarginTop: 16 }}>
        Movimientos
      </h2>

      {esCreadora && (
        <div role="group" aria-label="Filtrar movimientos" style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          {([['todo', 'Todo'], ['gane', 'Lo que gané'], ['gaste', 'Lo que gasté']] as [Pestana, string][])
            .map(([v, txt]) => (
            <Pulsable key={v} al={() => alPestana(v)} activado={pestana === v} style={{
              minHeight: 44, padding: '0 16px', display: 'inline-flex', alignItems: 'center', cursor: 'pointer',
              borderRadius: 999, font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 1.4, textTransform: 'uppercase',
              background: pestana === v ? COLOR.dinero : 'transparent',
              color: pestana === v ? COLOR.fondo : COLOR.textoSuave,
              border: `1px solid ${pestana === v ? COLOR.dinero : LINEA.media}`,
            }}>{txt}</Pulsable>
          ))}
        </div>
      )}

      {movimientos.length === 0 ? (
        <div style={{ font: `400 16px/1.5 ${FUENTE.ui}`, color: COLOR.textoTenue, padding: '22px 0' }}>
          {fallo ? 'No pudimos leer tus movimientos. No es que no haya.'
            : pestana === 'gane' ? 'Todavía no has ganado nada.'
            : pestana === 'gaste' ? 'Todavía no has gastado nada.'
            : 'Todavía no hay movimientos.'}
        </div>
      ) : (
        <div style={{
          marginTop: 14, borderRadius: RADIO.neon, border: '1px solid rgba(255,255,255,.12)',
          background: COLOR.superficie, overflow: 'hidden',
        }}>
          {movimientos.map((m, i) => {
            const entra = m.delta > 0
            return (
              <div key={m.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '14px 14px',
                borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,.08)',
              }}>
                <span aria-hidden style={{
                  flex: '0 0 auto', width: 40, height: 40, borderRadius: 10, display: 'grid', placeItems: 'center',
                  color: entra ? COLOR.dinero : COLOR.acento,
                  border: `1px solid ${entra ? 'rgba(200,255,61,.45)' : 'rgba(255,43,209,.45)'}`,
                  background: COLOR.fondo,
                }}><Icono nombre="dinero" tam={20} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: `700 14px/1.3 ${FUENTE.ui}` }}>{NOMBRE_MOTIVO[m.motivo]}</div>
                  <div style={{ font: `400 11px/1.45 ${FUENTE.mono}`, color: COLOR.textoTenue, marginTop: 3,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {new Date(m.created_at).toLocaleDateString('es-MX')}
                    {m.nota && ` · ${m.nota}`}
                  </div>
                </div>
                <span style={{
                  font: `700 16px/1 ${FUENTE.mono}`, whiteSpace: 'nowrap',
                  color: entra ? COLOR.dinero : COLOR.acento,
                }}>
                  {entra ? '+' : '−'}{usd(Math.abs(m.delta))}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const iconoCirculo = {
  flex: '0 0 auto', width: 46, height: 46, borderRadius: '50%', display: 'grid', placeItems: 'center',
  color: COLOR.dinero, border: `1.5px solid ${COLOR.dinero}`,
} as const

function Cifra({ rotulo, valor, color }: { rotulo: string; valor: number; color: string }) {
  return (
    <div style={{
      padding: '14px 14px', borderRadius: RADIO.neon, border: '1px solid rgba(255,255,255,.12)', background: COLOR.superficie,
    }}>
      <div style={{ font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.6, textTransform: 'uppercase', color: COLOR.textoSuave }}>
        {rotulo}
      </div>
      <div style={{ font: `700 18px/1 ${FUENTE.mono}`, color, marginTop: 9, whiteSpace: 'nowrap' }}>{usd(valor)}</div>
    </div>
  )
}
