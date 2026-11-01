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
import { COLOR, LINEA, FUENTE } from '../lib/diseño'

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

  useEffect(() => {
    if (cargandoSesion || !sesion) return
    let vivo = true
    Promise.all([saldo(), movimientos(CUANTOS)]).then(([s, m]) => {
      if (!vivo) return
      setCentavos(s); setMovs(m)
    })
    return () => { vivo = false }
  }, [sesion, cargandoSesion])

  if (cargandoSesion || centavos === null) return <Centro texto="Cargando…" />

  const esCreadora = !!perfil?.is_creator
  const t = totales(movs)
  const visibles = pestana === 'todo' ? movs : movs.filter(m => caraDe(m) === pestana)

  return (
    <div style={{
      minHeight: '100%', boxSizing: 'border-box', padding: '54px 22px 40px',
      background: COLOR.fondo, color: COLOR.texto, fontFamily: FUENTE.ui,
      width: '100%', maxWidth: 680, margin: '0 auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 26 }}>
        <span onClick={() => nav(-1)} style={{ font: `400 26px/1 ${FUENTE.ui}`, color: COLOR.textoSuave, cursor: 'pointer' }}>‹</span>
        <span style={{ font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 2.2, textTransform: 'uppercase', color: COLOR.dinero }}>
          Dinero
        </span>
        <span style={{ width: 14 }} />
      </div>

      {/* ---------- Saldo ---------- */}
      <div style={{ border: `1px solid ${LINEA.suave}`, padding: '24px 20px' }}>
        <div style={{ font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 2.2, textTransform: 'uppercase', color: COLOR.textoTenue }}>
          Saldo
        </div>
        {/* usd() y no el entero en crudo: el libro guarda CENTAVOS. Antes esta
            cifra se pintaba tal cual con la palabra «dólares» al lado, asi que
            $2.40 se leia como «240 dólares». */}
        <div style={{ fontFamily: FUENTE.display, fontSize: 52, lineHeight: 1, color: COLOR.dinero, marginTop: 12 }}>
          {usd(centavos)}
        </div>
        <div style={{ font: `400 11.5px/1.5 ${FUENTE.mono}`, color: COLOR.textoApagado, marginTop: 8 }}>
          {esCreadora ? 'Lo que puedes gastar o retirar.' : 'Lo que puedes gastar.'}
        </div>
      </div>

      {/* ---------- Las dos caras ---------- */}
      <div style={{
        display: 'grid', gap: 1, marginTop: 1,
        gridTemplateColumns: esCreadora ? 'repeat(3, 1fr)' : '1fr',
        background: LINEA.tenue, border: `1px solid ${LINEA.suave}`, borderTop: 'none',
      }}>
        {esCreadora && <Cifra rotulo="Ganado" valor={t.gane} color={COLOR.dinero} />}
        <Cifra rotulo="Gastado" valor={t.gaste} color={COLOR.acento} />
        {esCreadora && <Cifra rotulo="Retirado" valor={t.retirado} color={COLOR.textoSuave} />}
      </div>

      {/* ---------- Lo que todavía no se puede ---------- */}
      <Pendiente creadora={esCreadora} />

      {/* ---------- Movimientos ---------- */}
      {esCreadora && (
        <div style={{ display: 'flex', gap: 7, marginTop: 26 }}>
          {([['todo', 'Todo'], ['gane', 'Lo que gané'], ['gaste', 'Lo que gasté']] as [Pestana, string][])
            .map(([v, txt]) => (
            <span key={v} onClick={() => setPestana(v)} style={{
              padding: '9px 13px', cursor: 'pointer',
              font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.6, textTransform: 'uppercase',
              background: pestana === v ? COLOR.dinero : 'transparent',
              color: pestana === v ? COLOR.fondo : COLOR.textoSuave,
              border: `1px solid ${pestana === v ? COLOR.dinero : LINEA.media}`,
            }}>{txt}</span>
          ))}
        </div>
      )}

      <div style={{
        font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 2.2, textTransform: 'uppercase',
        color: COLOR.textoTenue, margin: esCreadora ? '22px 0 12px' : '26px 0 12px',
      }}>
        Movimientos
      </div>

      {visibles.length === 0 ? (
        <div style={{ fontFamily: FUENTE.serif, fontStyle: 'italic', fontSize: 17, color: COLOR.textoTenue, padding: '22px 0' }}>
          {pestana === 'gane' ? 'Todavía no has ganado nada.'
            : pestana === 'gaste' ? 'Todavía no has gastado nada.'
            : 'Todavía no hay movimientos.'}
        </div>
      ) : visibles.map(m => (
        <div key={m.id} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 2px', borderBottom: `1px solid ${LINEA.tenue}`,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: `600 14px/1.3 ${FUENTE.ui}` }}>{NOMBRE_MOTIVO[m.motivo]}</div>
            <div style={{ font: `400 11px/1.5 ${FUENTE.mono}`, color: COLOR.textoTenue, marginTop: 3 }}>
              {new Date(m.created_at).toLocaleDateString('es-MX')}
              {m.nota && ` · ${m.nota}`}
            </div>
          </div>
          <span style={{
            fontFamily: FUENTE.mono, fontSize: 15, lineHeight: 1,
            color: m.delta > 0 ? COLOR.dinero : COLOR.acento,
          }}>
            {m.delta > 0 ? '+' : '−'}{usd(Math.abs(m.delta))}
          </span>
        </div>
      ))}
    </div>
  )
}

function Cifra({ rotulo, valor, color }: { rotulo: string; valor: number; color: string }) {
  return (
    <div style={{ background: COLOR.fondo, padding: '15px 16px' }}>
      <div style={{ font: `700 9px/1 ${FUENTE.ui}`, letterSpacing: 1.6, textTransform: 'uppercase', color: COLOR.textoTenue }}>
        {rotulo}
      </div>
      <div style={{ font: `400 19px/1 ${FUENTE.mono}`, color, marginTop: 8 }}>{usd(valor)}</div>
    </div>
  )
}

/** Lo que falta, dicho en claro.
 *
 *  Las dos mitades del dinero tienen un hueco y callarlo deja a la persona
 *  esperando a que aparezca un boton que no existe. Recargar necesita un
 *  procesador de pagos; retirar necesita la pantalla de la cuenta bancaria
 *  —la funcion de la base ya esta y exige una cuenta registrada, que hoy no
 *  se puede registrar desde ningun lado. */
function Pendiente({ creadora }: { creadora: boolean }) {
  return (
    <div style={{
      marginTop: 18, padding: '16px 16px',
      border: `1px dashed ${LINEA.marcada}`,
    }}>
      <div style={{ font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 2, textTransform: 'uppercase', color: COLOR.textoTenue }}>
        Todavía no
      </div>
      <div style={{ font: `400 13px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave, marginTop: 9 }}>
        <b style={{ color: COLOR.texto }}>Recargar</b> necesita un procesador de pagos
        compatible con este giro; mientras tanto la administración puede acreditarte saldo.
        {creadora && <>
          {' '}<b style={{ color: COLOR.texto }}>Retirar</b> necesita que registres tu cuenta
          bancaria, y esa pantalla todavía no existe. El dinero está contado y guardado.
        </>}
      </div>
    </div>
  )
}

function Centro({ texto }: { texto: string }) {
  return (
    <div style={{
      minHeight: '100%', boxSizing: 'border-box', padding: '64px 26px',
      background: COLOR.fondo, color: COLOR.textoSuave, fontFamily: FUENTE.serif, fontStyle: 'italic',
      fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>{texto}</div>
  )
}
