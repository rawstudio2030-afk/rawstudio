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
    <div style={{
      minHeight: '100%', boxSizing: 'border-box', padding: '54px 22px 40px',
      background: COLOR.fondo, color: COLOR.texto, fontFamily: FUENTE.ui,
      width: '100%', maxWidth: 680, margin: '0 auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 26 }}>
        <Pulsable al={() => nav(-1)} rotulo="Volver" style={{ font: `400 26px/1 ${FUENTE.ui}`, color: COLOR.textoSuave, cursor: 'pointer' }}>‹</Pulsable>
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
        <div style={{
          fontFamily: FUENTE.display, fontSize: 52, lineHeight: 1, marginTop: 12,
          color: fallo ? COLOR.textoApagado : COLOR.dinero,
        }}>
          {fallo ? '—' : usd(centavos)}
        </div>
        {fallo ? (
          <div style={{ marginTop: 8 }}>
            <div style={{ font: `400 12px/1.45 ${FUENTE.mono}`, color: COLOR.acento }}>
              No pudimos leer tu saldo. Tu dinero está donde estaba — lo que falló
              fue la consulta.
            </div>
            <Pulsable al={() => setIntento(n => n + 1)} style={{
              marginTop: 10, padding: '9px 14px', cursor: 'pointer',
              border: `1px solid ${LINEA.media}`, color: COLOR.texto,
              font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.6, textTransform: 'uppercase',
            }}>Reintentar</Pulsable>
          </div>
        ) : (
          <div style={{ font: `400 12px/1.45 ${FUENTE.mono}`, color: COLOR.textoApagado, marginTop: 8 }}>
            {esCreadora ? 'Lo que puedes gastar o retirar.' : 'Lo que puedes gastar.'}
          </div>
        )}
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
            <Pulsable key={v} al={() => setPestana(v)} activado={pestana === v} style={{
              padding: '9px 13px', cursor: 'pointer',
              font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.6, textTransform: 'uppercase',
              background: pestana === v ? COLOR.dinero : 'transparent',
              color: pestana === v ? COLOR.fondo : COLOR.textoSuave,
              border: `1px solid ${pestana === v ? COLOR.dinero : LINEA.media}`,
            }}>{txt}</Pulsable>
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
        <div style={{ fontFamily: FUENTE.serif, fontStyle: 'italic', fontSize: 16, color: COLOR.textoTenue, padding: '22px 0' }}>
          {fallo ? 'No pudimos leer tus movimientos. No es que no haya.'
            : pestana === 'gane' ? 'Todavía no has ganado nada.'
            : pestana === 'gaste' ? 'Todavía no has gastado nada.'
            : 'Todavía no hay movimientos.'}
        </div>
      ) : visibles.map(m => (
        <div key={m.id} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 2px', borderBottom: `1px solid ${LINEA.tenue}`,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: `500 13px/1.3 ${FUENTE.ui}` }}>{NOMBRE_MOTIVO[m.motivo]}</div>
            <div style={{ font: `400 10px/1.45 ${FUENTE.mono}`, color: COLOR.textoTenue, marginTop: 3 }}>
              {new Date(m.created_at).toLocaleDateString('es-MX')}
              {m.nota && ` · ${m.nota}`}
            </div>
          </div>
          <span style={{
            fontFamily: FUENTE.mono, fontSize: 16, lineHeight: 1,
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

/** Retirar, y lo que todavia no se puede.
 *
 *  Recargar sigue sin existir —hace falta un procesador de pagos compatible
 *  con este giro— y decirlo es mas util que un boton que no hace nada.
 *  Retirar SI existe ya: la pantalla comprueba identidad, cuenta bancaria,
 *  minimo y disponible, y dice cual falta. */
function Pendiente({ creadora }: { creadora: boolean }) {
  return (
    <>
      {creadora && (
        <Enlace a="/estudio/retirar" style={{
          boxSizing: 'border-box', width: '100%',
          marginTop: 18, padding: '16px 18px', cursor: 'pointer',
          border: `1px solid ${COLOR.dinero}`, background: 'rgba(200,255,61,.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div>
            <div style={{ font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.6,
              textTransform: 'uppercase', color: COLOR.dinero }}>Retirar</div>
            <div style={{ font: `400 12px/1.45 ${FUENTE.ui}`, color: COLOR.textoSuave, marginTop: 7 }}>
              A tu cuenta, por SPEI, con las retenciones ya calculadas.
            </div>
          </div>
          <span style={{ font: `700 16px/1 ${FUENTE.ui}`, color: COLOR.dinero }}>&#8594;</span>
        </Enlace>
      )}

      <div style={{ marginTop: 12, padding: '14px 16px', border: `1px dashed ${LINEA.marcada}` }}>
        <div style={{ font: `400 12px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
          <b style={{ color: COLOR.texto }}>Recargar</b> todavía no se puede: falta un
          procesador de pagos compatible con este giro. Mientras tanto, la administración
          puede acreditarte saldo.
        </div>
      </div>
    </>
  )
}
