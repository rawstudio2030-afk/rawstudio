/* Contenido a la medida — y, desde el 5 de noviembre de 2026, el contenido de
 * la pestaña MENSAJES.
 *
 * La misma pantalla sirve a las dos partes: quien encarga y quien produce. El
 * flujo es identico y las acciones cambian segun de que lado estes, asi que
 * duplicarla solo garantizaria que las dos copias se separen con el tiempo.
 *
 * ---------- Por que esto es Mensajes ----------
 *
 * Un encargo ES una conversacion: alguien pide algo, se negocia el precio, se
 * acepta, se entrega. Estaba clasificado como «un canal de ingreso» y vivia en
 * una entrada de menu del estudio, al lado de «define tu nivel de
 * suscripcion», que es poner un precio una vez.
 *
 * Y al mismo tiempo la pestaña Mensajes de la barra era una pantalla vacia que
 * decia «esto llega cuando lo construyamos». O sea que habia una conversacion
 * real enterrada en un menu de configuracion, y un destino de primera clase
 * sin nada dentro. Ahora los encargos son lo que Mensajes contiene, y el chat
 * libre —cuando exista— se suma aqui.
 *
 * EL DINERO QUEDA RETENIDO al pagar y se libera al entregar. Sin eso, cobrar y
 * no entregar seria trivial.
 */
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { COLOR, LINEA, FUENTE, RADIO } from '../lib/diseño'
import { useSesion } from '../lib/sesion'
import {
  misEncargos, mensajesEncargo, responderEncargo, aceptarEncargo,
  pagarEncargo, entregarEncargo, ESTADO_ENCARGO, type Encargo,
} from '../lib/canales'
import { clipsDe } from '../lib/clips'
import { Marco, Boton, Campo, Etiqueta, Aviso, Vacio } from './piezas'
import { usdYPesos } from '../lib/dinero'
import { useMoneda } from '../lib/moneda'
import { Pulsable } from '../components/Pulsable'

export default function Encargos() {
  const { perfil } = useSesion()
  useMoneda()
  const esCreadora = !!perfil?.is_creator
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
    <Marco titulo="Encargos" volverA="/clip">
      <div style={{ font: `400 14px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave, marginBottom: 20 }}>
        {esCreadora ? (
          <>Alguien te pide algo concreto y propone un precio. Negocias, aceptas, te paga —
          y <b style={{ color: COLOR.texto }}>el dinero se queda retenido hasta que entregues</b>.</>
        ) : (
          <>Pides algo concreto a una creadora y propones un precio. Negocian, aceptas, pagas —
          y <b style={{ color: COLOR.texto }}>tu dinero se queda retenido hasta que te entreguen</b>.</>
        )}
      </div>

      {cargando ? null : <ListaEncargos lista={lista} esCreadora={esCreadora} alAbrir={setAbierto} />}

      {/* Lo que todavia NO es Mensajes. Este aviso vivia en Chat.tsx, que era
          la pantalla entera; se conserva porque una pestaña llamada «Mensajes»
          sin mas invita a esperar una conversacion libre que aun no existe. */}
      <div style={{ marginTop: 26, padding: '15px 16px', borderRadius: RADIO.filo,
        border: `1.5px dashed ${LINEA.marcada}` }}>
        <div style={{ font: `400 13px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
          Aquí solo van los encargos. Para preguntarle algo a una creadora,
          usa <b style={{ color: COLOR.texto }}>«Consultar por Telegram»</b> en la ficha de
          sus clips. La conversación libre, con propinas y contenido de pago dentro del
          mensaje, todavía no existe.
        </div>
      </div>
    </Marco>
  )
}

function Detalle({ e, cierra, recarga }: {
  e: Encargo; cierra: () => void; recarga: () => Promise<void>
}) {
  const { sesion } = useSesion()
  useMoneda()
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

  const s = ESTADO_ENCARGO[e.estado] ?? { t: e.estado, c: COLOR.textoSuave }
  const negociando = e.estado === 'propuesta' || e.estado === 'negociando'

  return (
    <Marco titulo="Encargo" volverA="/chat">
      <Pulsable al={cierra} style={{ marginBottom: 6, cursor: 'pointer', minHeight: 44,
        display: 'inline-flex', alignItems: 'center',
        font: `400 14px/1 ${FUENTE.ui}`, color: COLOR.textoSuave }}>‹ Todos los encargos</Pulsable>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ font: `400 12px/1.45 ${FUENTE.mono}`, color: COLOR.textoSuave }}>
          {e.soy_creadora ? 'De' : 'Para'} @{e.otra_handle}
        </span>
        <span style={{ font: `700 10px/1.45 ${FUENTE.ui}`, letterSpacing: 1.1,
          textTransform: 'uppercase', color: s.c }}>{s.t}</span>
      </div>

      <div style={{ marginTop: 14, font: `700 30px/1 ${FUENTE.mono}`, color: COLOR.dinero }}>
        {usdYPesos(e.coins)}
      </div>

      <Aviso texto={error} />

      {/* Conversacion */}
      <Burbujas msgs={msgs} yo={sesion?.user.id} />

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
                Aceptar por {usdYPesos(e.coins)}
              </Boton>
            )}
          </div>
        </>
      )}

      {e.estado === 'aceptado' && !e.soy_creadora && (
        <Boton tono="primario" al={() => pagarEncargo(e.id).then(tras)}>
          Pagar {usdYPesos(e.coins)}
        </Boton>
      )}
      {e.estado === 'aceptado' && e.soy_creadora && (
        <div style={{ font: `400 14px/1.6 ${FUENTE.ui}`,
          color: COLOR.textoSuave }}>
          Aceptado. Falta que pague para que empieces.
        </div>
      )}

      {(e.estado === 'pagado' || e.estado === 'en_proceso') && (
        e.soy_creadora ? (
          eligiendo ? (
            <>
              <Etiqueta texto="Elige el clip que entregas" />
              {clips.length === 0 ? (
                <div style={{ font: `400 14px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
                  No tienes clips. Súbelo primero y vuelve aquí.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {clips.map(c => (
                    <Pulsable key={c.id} al={() => entregarEncargo(e.id, c.id).then(tras)}
                      className="tarjeta-sobria"
                      style={{ width: '100%', textAlign: 'left', minHeight: 52,
                        padding: '0 16px', display: 'flex', alignItems: 'center',
                        cursor: 'pointer', font: `500 15px/1.3 ${FUENTE.ui}` }}>
                      {c.title}
                    </Pulsable>
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
              <div style={{ marginBottom: 14, padding: '14px 16px', borderRadius: RADIO.filo,
                border: `1px solid ${COLOR.dinero}`, font: `400 14px/1.6 ${FUENTE.ui}`,
                color: COLOR.textoSuave }}>
                Ya pagó. Sus <b style={{ color: COLOR.dinero }}>{usdYPesos(e.coins)}</b> están retenidos
                y se te abonan en cuanto entregues.
              </div>
              <Boton tono="primario" al={async () => {
                // Si falla, no se abre el selector con la lista vacia: diria
                // que no tiene clips que entregar cuando si los tiene.
                if (sesion) {
                  const r = await clipsDe(sesion.user.id)
                  if (r.fallo) { setError('No pudimos leer tus clips. Intenta otra vez.'); return }
                  setClips(r.datos)
                }
                setEligiendo(true)
              }}>Entregar</Boton>
            </>
          )
        ) : (
          <div style={{ font: `400 14px/1.6 ${FUENTE.ui}`,
            color: COLOR.textoSuave }}>
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

/** La lista de encargos. Recibe los datos: asi se puede dibujar sin pedirlos. */
export function ListaEncargos({ lista, esCreadora, alAbrir }: {
  lista: Encargo[]; esCreadora: boolean; alAbrir: (e: Encargo) => void
}) {
  return lista.length === 0 ? (
        <Vacio texto={esCreadora
          ? 'Nadie te ha encargado nada todavía.'
          : 'Todavía no le has pedido nada a nadie.'} />
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {lista.map(e => {
            const s = ESTADO_ENCARGO[e.estado] ?? { t: e.estado, c: COLOR.textoSuave }
            return (
              <Pulsable key={e.id} al={() => alAbrir(e)} className="tarjeta-sobria" style={{
                width: '100%', textAlign: 'left', padding: '15px 16px', cursor: 'pointer', minHeight: 64,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ font: `400 12px/1.45 ${FUENTE.mono}`, color: COLOR.textoSuave }}>
                    {e.soy_creadora ? 'De' : 'Para'} @{e.otra_handle}
                  </span>
                  <span style={{ font: `700 10px/1.45 ${FUENTE.ui}`, letterSpacing: 1.1,
                    textTransform: 'uppercase', color: s.c, whiteSpace: 'nowrap' }}>{s.t}</span>
                </div>
                <div style={{ marginTop: 8, font: `400 15px/1.45 ${FUENTE.ui}`,
                  overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
                  WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{e.descripcion}</div>
                <div style={{ marginTop: 8, font: `700 18px/1 ${FUENTE.mono}`, color: COLOR.dinero }}>
                  {usdYPesos(e.coins)}
                </div>
              </Pulsable>
            )
          })}
        </div>
      );
}

/** La conversacion de un encargo. */
export function Burbujas({ msgs, yo }: {
  msgs: Awaited<ReturnType<typeof mensajesEncargo>>; yo: string | undefined
}) {
  return (
      <div style={{ margin: '20px 0', display: 'grid', gap: 10 }}>
        {msgs.map(m => {
          const mio = m.autor_id === yo
          return (
            <div key={m.id} style={{
              padding: '12px 14px', borderRadius: 14,
              // Lo mio, con un velo magenta; lo suyo, en tarjeta sobria. Sin
              // neon: es una conversacion, y se lee mucho rato.
              border: `1px solid ${mio ? 'rgba(212,180,131,.45)' : 'rgba(255,255,255,.12)'}`,
              background: mio ? 'rgba(212,180,131,.07)' : COLOR.superficie,
              marginLeft: mio ? 28 : 0, marginRight: mio ? 0 : 28,
            }}>
              {m.cuerpo && (
                <div style={{ font: `400 15px/1.55 ${FUENTE.ui}`, color: COLOR.texto }}>
                  {m.cuerpo}
                </div>
              )}
              {m.oferta_coins != null && (
                <div style={{ marginTop: 6, font: `700 14px/1 ${FUENTE.mono}`, color: COLOR.dinero }}>
                  Ofrece {usdYPesos(m.oferta_coins)}
                </div>
              )}
            </div>
          )
        })}
      </div>
  )
}
