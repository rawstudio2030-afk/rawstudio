/* Contenido a la medida.
 *
 * La misma pantalla sirve a las dos partes: quien encarga y quien produce. El
 * flujo es identico y las acciones cambian segun de que lado estes, asi que
 * duplicarla solo garantizaria que las dos copias se separen con el tiempo.
 *
 * EL DINERO QUEDA RETENIDO al pagar y se libera al entregar. Sin eso, cobrar y
 * no entregar seria trivial.
 */
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { COLOR, LINEA, FUENTE } from '../lib/diseño'
import { useSesion } from '../lib/sesion'
import {
  misEncargos, mensajesEncargo, responderEncargo, aceptarEncargo,
  pagarEncargo, entregarEncargo, ESTADO_ENCARGO, type Encargo,
} from '../lib/canales'
import { clipsDe } from '../lib/clips'
import { Marco, Boton, Campo, Etiqueta, Aviso, Vacio } from './piezas'
import { usd } from '../lib/dinero'

export default function Encargos() {
  const [lista, setLista] = useState<Encargo[]>([])
  const [abierto, setAbierto] = useState<Encargo | null>(null)
  const [cargando, setCargando] = useState(true)

  const cargar = useCallback(async () => {
    const l = await misEncargos()
    setLista(l); setCargando(false)
    if (abierto) setAbierto(l.find(e => e.id === abierto.id) ?? null)
  }, [abierto])

  useEffect(() => { misEncargos().then(l => { setLista(l); setCargando(false) }) }, [])

  if (abierto) return <Detalle e={abierto} cierra={() => setAbierto(null)} recarga={cargar} />

  return (
    <Marco titulo="Contenido a la medida">
      <div style={{ font: `400 14px/1.65 ${FUENTE.ui}`, color: COLOR.textoSuave, marginBottom: 20 }}>
        Alguien te pide algo concreto y propone un precio. Negocias, aceptas, te paga —
        y <b style={{ color: COLOR.texto }}>el dinero se queda retenido hasta que entregues</b>.
      </div>

      {cargando ? null : lista.length === 0 ? (
        <Vacio texto="Nadie te ha encargado nada todavía." />
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {lista.map(e => {
            const s = ESTADO_ENCARGO[e.estado] ?? { t: e.estado, c: COLOR.textoTenue }
            return (
              <div key={e.id} onClick={() => setAbierto(e)} style={{
                padding: '14px 15px', border: `1px solid ${LINEA.tenue}`, cursor: 'pointer',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ font: `400 11px/1.4 ${FUENTE.mono}`, color: COLOR.textoTenue }}>
                    {e.soy_creadora ? 'De' : 'Para'} @{e.otra_handle}
                  </span>
                  <span style={{ font: `700 8px/1.5 ${FUENTE.ui}`, letterSpacing: 1,
                    textTransform: 'uppercase', color: s.c, whiteSpace: 'nowrap' }}>{s.t}</span>
                </div>
                <div style={{ marginTop: 7, font: `400 14px/1.45 ${FUENTE.ui}`,
                  overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
                  WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{e.descripcion}</div>
                <div style={{ marginTop: 7, font: `400 15px/1 ${FUENTE.mono}`, color: COLOR.dinero }}>
                  {usd(e.coins)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Marco>
  )
}

function Detalle({ e, cierra, recarga }: {
  e: Encargo; cierra: () => void; recarga: () => Promise<void>
}) {
  const { sesion } = useSesion()
  const nav = useNavigate()
  const [msgs, setMsgs] = useState<Awaited<ReturnType<typeof mensajesEncargo>>>([])
  const [texto, setTexto] = useState('')
  const [oferta, setOferta] = useState('')
  const [error, setError] = useState('')
  const [clips, setClips] = useState<{ id: string; title: string }[]>([])
  const [eligiendo, setEligiendo] = useState(false)

  useEffect(() => { mensajesEncargo(e.id).then(setMsgs) }, [e.id])

  const tras = async (m: string) => {
    if (m) { setError(m); return }
    setError(''); setTexto(''); setOferta('')
    setMsgs(await mensajesEncargo(e.id))
    await recarga()
  }

  const s = ESTADO_ENCARGO[e.estado] ?? { t: e.estado, c: COLOR.textoTenue }
  const negociando = e.estado === 'propuesta' || e.estado === 'negociando'

  return (
    <Marco titulo="Encargo" volverA="/estudio/encargos">
      <div onClick={cierra} style={{ marginBottom: 14, cursor: 'pointer',
        font: `400 12px/1 ${FUENTE.ui}`, color: COLOR.textoTenue }}>‹ Todos los encargos</div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ font: `400 11px/1.4 ${FUENTE.mono}`, color: COLOR.textoTenue }}>
          {e.soy_creadora ? 'De' : 'Para'} @{e.otra_handle}
        </span>
        <span style={{ font: `700 9px/1.5 ${FUENTE.ui}`, letterSpacing: 1.2,
          textTransform: 'uppercase', color: s.c }}>{s.t}</span>
      </div>

      <div style={{ marginTop: 14, font: `400 26px/1 ${FUENTE.mono}`, color: COLOR.dinero }}>
        {usd(e.coins)}
      </div>

      <Aviso texto={error} />

      {/* Conversacion */}
      <div style={{ margin: '20px 0', display: 'grid', gap: 10 }}>
        {msgs.map(m => {
          const mio = m.autor_id === sesion?.user.id
          return (
            <div key={m.id} style={{
              padding: '11px 13px', border: `1px solid ${mio ? LINEA.suave : LINEA.tenue}`,
              background: mio ? 'transparent' : COLOR.superficie,
              marginLeft: mio ? 28 : 0, marginRight: mio ? 0 : 28,
            }}>
              {m.cuerpo && (
                <div style={{ font: `400 14px/1.55 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
                  {m.cuerpo}
                </div>
              )}
              {m.oferta_coins != null && (
                <div style={{ marginTop: 6, font: `400 13px/1 ${FUENTE.mono}`, color: COLOR.dinero }}>
                  Ofrece {usd(m.oferta_coins)}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Acciones segun el momento */}
      {negociando && (
        <>
          <Etiqueta texto="Responder" />
          <Campo valor={texto} cambia={setTexto} filas={3} marcador="Escribe algo" />
          <div style={{ height: 10 }} />
          <Etiqueta texto="Contraoferta en dólares (opcional)" />
          <Campo tipo="number" valor={oferta} cambia={setOferta} marcador={String(e.coins)} />
          <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            <Boton activo={!!texto.trim() || !!oferta} al={() => responderEncargo(
              e.id, texto.trim() || undefined,
              oferta ? parseInt(oferta, 10) : undefined).then(tras)}>Responder</Boton>
            {e.soy_creadora && (
              <Boton tono="primario" al={() => aceptarEncargo(e.id).then(tras)}>
                Aceptar por {usd(e.coins)}
              </Boton>
            )}
          </div>
        </>
      )}

      {e.estado === 'aceptado' && !e.soy_creadora && (
        <Boton tono="primario" al={() => pagarEncargo(e.id).then(tras)}>
          Pagar {usd(e.coins)}
        </Boton>
      )}
      {e.estado === 'aceptado' && e.soy_creadora && (
        <div style={{ font: `400 14px/1.6 ${FUENTE.serif}`, fontStyle: 'italic',
          color: COLOR.textoTenue }}>
          Aceptado. Falta que pague para que empieces.
        </div>
      )}

      {(e.estado === 'pagado' || e.estado === 'en_proceso') && (
        e.soy_creadora ? (
          eligiendo ? (
            <>
              <Etiqueta texto="Elige el clip que entregas" />
              {clips.length === 0 ? (
                <div style={{ font: `400 13px/1.6 ${FUENTE.ui}`, color: COLOR.textoTenue }}>
                  No tienes clips. Súbelo primero y vuelve aquí.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {clips.map(c => (
                    <div key={c.id} onClick={() => entregarEncargo(e.id, c.id).then(tras)}
                      style={{ padding: '12px 14px', border: `1px solid ${LINEA.tenue}`,
                        cursor: 'pointer', font: `400 14px/1.3 ${FUENTE.ui}` }}>
                      {c.title}
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
                <Boton al={() => nav('/upload')}>Subir uno nuevo</Boton>
                <Boton al={() => setEligiendo(false)}>Cancelar</Boton>
              </div>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 14, padding: '11px 13px',
                border: `1px solid ${COLOR.dinero}`, font: `400 13px/1.55 ${FUENTE.ui}`,
                color: COLOR.textoSuave }}>
                Ya pagó. Sus <b style={{ color: COLOR.dinero }}>{usd(e.coins)}</b> están retenidos
                y se te abonan en cuanto entregues.
              </div>
              <Boton tono="primario" al={async () => {
                if (sesion) setClips(await clipsDe(sesion.user.id))
                setEligiendo(true)
              }}>Entregar</Boton>
            </>
          )
        ) : (
          <div style={{ font: `400 14px/1.6 ${FUENTE.serif}`, fontStyle: 'italic',
            color: COLOR.textoTenue }}>
            Pagado. Tu dinero está retenido hasta que entregue
            {e.entrega_max && <>, y se comprometió a hacerlo antes
              del {new Date(e.entrega_max).toLocaleDateString('es-MX')}</>}.
          </div>
        )
      )}

      {e.estado === 'entregado' && e.clip_id && (
        <Boton tono="primario" al={() => nav(`/clip/${e.clip_id}`)}>Ver lo entregado</Boton>
      )}
    </Marco>
  )
}
