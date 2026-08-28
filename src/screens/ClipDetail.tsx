// Pantalla 02 — Clip y paywall
// Reescrita: antes era el mock del deck con "Mira Vanta" y "Neon Hours vol. 3"
// escritos a mano. Ahora lee un clip real y su autora real.
//
// El candado NO es visual: el video vive en un bucket privado y solo se obtiene
// una URL firmada si las politicas de storage dejan leerlo. Sin acceso, aqui no
// hay archivo que reproducir aunque alguien edite el JavaScript.
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSesion } from '../lib/sesion'
import { urlAvatar } from '../lib/perfiles'
import { clipPorId, urlPortada, urlVideoFirmada, clipsPublicados, type ClipConAutora } from '../lib/clips'
import { comprarClip, saldo } from '../lib/monedero'
import { rentarClip, reembolsoDisponible, reclamarReembolso } from '../lib/canales'
import Reportar from '../components/Reportar'
import MarcaDeAgua from '../components/MarcaDeAgua'
import { COLOR, LINEA, VELO, TINTE, FUENTE } from '../lib/diseño'


export default function ClipDetail() {
  const nav = useNavigate()
  const { id } = useParams()
  const { sesion, perfil: perfilPropio } = useSesion()
  const [clip, setClip] = useState<ClipConAutora | null>(null)
  const [cargando, setCargando] = useState(true)
  const [video, setVideo] = useState<string | null>(null)
  const [bloqueo, setBloqueo] = useState<{ motivo?: string; pais?: string } | null>(null)
  const [coins, setCoins] = useState<number | null>(null)
  const [comprando, setComprando] = useState(false)
  const [rentando, setRentando] = useState(false)
  const [devolucion, setDevolucion] = useState(0)
  const [errorCompra, setErrorCompra] = useState('')

  useEffect(() => {
    let vivo = true
    setCargando(true)
    const traer = async () => {
      // Sin id en la ruta se muestra el mas reciente, que es lo util al entrar
      // desde el age gate mientras no exista una pantalla de descubrimiento.
      const c = id ? await clipPorId(id) : (await clipsPublicados(1))[0] ?? null
      if (!vivo) return
      setClip(c); setCargando(false)
      if (c?.storage_path && sesion) {
        const a = await urlVideoFirmada(c.id)
        if (!vivo) return
        if ('url' in a) { setVideo(a.url); setBloqueo(null) }
        else setBloqueo({ motivo: a.motivo, pais: a.pais })
      }
    }
    traer()
    if (sesion) saldo().then(v => { if (vivo) setCoins(v) })
    // Si la creadora lo retiro y esta persona lo habia comprado, se le
    // ofrece su dinero de vuelta sin que tenga que pedirlo.
    if (sesion && id) reembolsoDisponible(id).then(v => { if (vivo) setDevolucion(v) })
    return () => { vivo = false }
  }, [id, sesion])

  const rentar = async () => {
    if (!clip || rentando) return
    setRentando(true); setErrorCompra('')
    const r = await rentarClip(clip.id)
    setRentando(false)
    if ('error' in r) { setErrorCompra(r.error!); return }
    // Igual que al comprar: hay que volver a pedir la URL firmada, porque
    // hasta ahora la funcion de borde la estaba negando.
    setCoins(r.saldo ?? null)
    const a = await urlVideoFirmada(clip.id)
    if ('url' in a) setVideo(a.url)
  }

  // Tras comprar se vuelve a pedir la URL firmada: la politica de storage ya
  // reconoce la compra, asi que ahora si entrega el archivo.
  const desbloquear = async () => {
    if (!clip || comprando) return
    setComprando(true); setErrorCompra('')
    const r = await comprarClip(clip.id)
    if (!r.ok) { setErrorCompra(r.error ?? 'No se pudo completar'); setComprando(false); return }
    setCoins(r.saldo ?? null)
    const a = await urlVideoFirmada(clip.id)
    if ('url' in a) setVideo(a.url)
    setComprando(false)
  }

  if (cargando) return <Centro texto="Cargando…" />

  if (!clip) return (
    <Centro
      texto={id ? 'Este clip ya no existe.' : 'Todavía no hay clips publicados.'}
      accion={{ texto: 'Volver', al: () => nav('/entrar') }}
    />
  )

  const autora = clip.profiles
  const portada = urlPortada(clip.cover_path)
  const foto = urlAvatar(autora?.avatar_path ?? null)
  const mio = sesion?.user.id === clip.creator_id
  // Su propia creadora no necesita marca: no tiene a quien delatar.
  const marca = !mio && perfilPropio ? `@${perfilPropio.handle}` : null
  // Hoy solo la autora y un admin pueden abrir el archivo. Cuando existan las
  // compras, video llegara tambien a quien pago, sin cambiar nada aqui.
  const desbloqueado = !!video

  return (
    <div style={{ minHeight: '100%', background: COLOR.fondo, color: COLOR.texto, fontFamily: FUENTE.ui }}>
      {/* marco */}
      <div style={{ position: 'relative', height: 300, background: COLOR.superficie }}>
        {desbloqueado ? (
          <>
            <video src={video!} controls playsInline
              poster={portada ?? undefined}
              style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#000' }} />
            {/* El identificador de quien mira, encima del video. Se usa el
                handle y no el correo: señala la cuenta sin exponer un dato de
                contacto en una grabacion que podria acabar circulando. */}
            {marca && <MarcaDeAgua texto={marca} />}
          </>
        ) : (
          <>
            <div style={{
              position: 'absolute', inset: 0,
              background: portada ? `center/cover url(${portada})`
                                  : 'repeating-linear-gradient(122deg,#17171C 0 9px,#0F0F13 9px 18px)',
              filter: 'blur(9px) saturate(.7)', transform: 'scale(1.06)',
            }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(8,8,10,.35) 0%,rgba(8,8,10,.92) 100%)' }} />
            <div style={{
              position: 'absolute', top: 16, right: 16,
              border: `1px solid ${bloqueo?.motivo === 'geobloqueo' ? COLOR.admin : COLOR.dinero}`,
              color: bloqueo?.motivo === 'geobloqueo' ? COLOR.admin : COLOR.dinero,
              padding: '7px 10px',
              font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.6, textTransform: 'uppercase',
            }}>
              {bloqueo?.motivo === 'geobloqueo' ? 'No disponible aquí' : 'Bloqueado'}
            </div>
          </>
        )}
        <span onClick={() => nav(-1)} style={{
          position: 'absolute', top: 16, left: 16, width: 38, height: 38, borderRadius: '50%',
          border: '1px solid rgba(255,255,255,.22)', background: VELO.ligero,
          display: 'grid', placeItems: 'center', font: `400 20px/1 ${FUENTE.ui}`,
          color: COLOR.texto, cursor: 'pointer', zIndex: 2,
        }}>‹</span>
      </div>

      {/* autora */}
      {autora && (
        <div onClick={() => nav(`/creator/${autora.handle}`)} style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,.09)', cursor: 'pointer',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%', flex: '0 0 auto',
            border: `1px solid ${COLOR.acento}`,
            background: foto ? `center/cover url(${foto})` : `repeating-linear-gradient(130deg,${COLOR.superficieAlta} 0 6px,${COLOR.superficie} 6px 12px)`,
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: `700 15px/1.3 ${FUENTE.ui}`, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
              {autora.display_name}
              {autora.verified && <span style={{ color: COLOR.admin, fontSize: 13 }}>&#10038;</span>}
            </div>
            <div style={{ font: `400 12px/1.4 ${FUENTE.mono}`, color: COLOR.textoTenue }}>@{autora.handle}</div>
          </div>
          <span style={{ color: COLOR.textoApagado }}>›</span>
        </div>
      )}

      <div style={{ padding: '20px 20px 40px' }}>
        <div style={{ fontFamily: FUENTE.display, fontSize: 34, lineHeight: 1, textTransform: 'uppercase' }}>
          {clip.title}
        </div>

        {clip.description && (
          <div style={{ fontFamily: FUENTE.serif, fontStyle: 'italic', fontSize: 18, lineHeight: 1.4, color: COLOR.textoSuave, marginTop: 12 }}>
            {clip.description}
          </div>
        )}

        <div style={{ font: `400 11px/1.7 ${FUENTE.mono}`, color: COLOR.textoApagado, marginTop: 14 }}>
          publicado {clip.published_at ? new Date(clip.published_at).toLocaleDateString('es-MX') : '—'}
          {!clip.published && ' · borrador'}
        </div>

        {devolucion > 0 && (
          <div style={{ marginTop: 24, border: `1px solid ${COLOR.dinero}`, padding: 18 }}>
            <div style={{ font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 2.2,
              textTransform: 'uppercase', color: COLOR.dinero }}>
              La creadora retiró este clip
            </div>
            <div style={{ marginTop: 10, font: `400 13px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
              Decidió que dejara de estar disponible. Te devolvemos lo que pagaste.
            </div>
            <div onClick={async () => {
              if (!id) return
              const r = await reclamarReembolso(id)
              if ('error' in r) { setErrorCompra(r.error!); return }
              setDevolucion(0); setCoins(await saldo())
            }} style={{
              marginTop: 14, textAlign: 'center', padding: 16, cursor: 'pointer',
              background: COLOR.dinero, color: COLOR.fondo,
              font: `700 12px/1 ${FUENTE.ui}`, letterSpacing: 2, textTransform: 'uppercase',
            }}>Recuperar mis {devolucion} coins</div>
          </div>
        )}
        {bloqueo?.motivo === 'geobloqueo' ? (
          <div style={{
            marginTop: 24, padding: '18px 16px',
            border: '1px solid rgba(0,229,255,.4)', background: 'rgba(0,229,255,.06)',
          }}>
            <div style={{ font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 2.2, textTransform: 'uppercase', color: COLOR.admin }}>
              No disponible en tu país
            </div>
            <div style={{ fontFamily: FUENTE.serif, fontStyle: 'italic', fontSize: 16, lineHeight: 1.4, color: COLOR.textoSuave, marginTop: 9 }}>
              Quien publicó este clip decidió no mostrarlo aquí. No es un error
              ni falta de pago: es su elección, y la respetamos.
            </div>
          </div>
        ) : mio ? (
          <div style={{
            marginTop: 24, padding: '18px 16px', border: '1px dashed rgba(200,255,61,.4)',
            background: TINTE.dinero,
          }}>
            <div style={{ font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 2.2, textTransform: 'uppercase', color: COLOR.dinero }}>
              Es tuyo
            </div>
            <div style={{ fontFamily: FUENTE.serif, fontStyle: 'italic', fontSize: 16, color: COLOR.textoSuave, marginTop: 9 }}>
              Lo ves completo porque lo publicaste tú.
            </div>
          </div>
        ) : clip.visibility === 'gratis' ? null : (
          <div style={{ marginTop: 24, border: '1px solid rgba(255,255,255,.12)', padding: 18 }}>
            <div style={{ font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 2.2, textTransform: 'uppercase', color: COLOR.textoTenue }}>
              {clip.visibility === 'pago' ? 'Desbloquear para siempre' : 'Solo suscriptores'}
            </div>
            {clip.visibility === 'pago' && (
              <div style={{ fontFamily: FUENTE.display, fontSize: 30, lineHeight: 1, color: COLOR.dinero, marginTop: 10 }}>
                {clip.price_coins} coins
              </div>
            )}
            {clip.visibility === 'pago' ? (() => {
              const alcanza = coins !== null && coins >= clip.price_coins
              const falta = coins === null ? 0 : clip.price_coins - coins
              return (
                <>
                  <div onClick={sesion && alcanza ? desbloquear : undefined} style={{
                    marginTop: 16,
                    background: !sesion ? COLOR.superficieAlta : alcanza ? COLOR.dinero : COLOR.superficieAlta,
                    color: !sesion ? COLOR.textoApagado : alcanza ? COLOR.fondo : COLOR.textoApagado,
                    textAlign: 'center', padding: 17,
                    font: `700 12px/1 ${FUENTE.ui}`, letterSpacing: 2, textTransform: 'uppercase',
                    cursor: sesion && alcanza ? 'pointer' : 'default',
                    boxShadow: alcanza ? '0 0 30px rgba(200,255,61,.3)' : 'none',
                  }}>
                    {comprando ? 'Desbloqueando…'
                      : !sesion ? 'Entra para desbloquear'
                      : alcanza ? 'Desbloquear este clip'
                      : `Te faltan ${falta} coins`}
                  </div>
                  {sesion && (
                    <div onClick={() => nav('/wallet')} style={{
                      font: `400 11px/1.6 ${FUENTE.mono}`, color: COLOR.textoTenue, marginTop: 10,
                      textAlign: 'center', cursor: 'pointer', textDecoration: 'underline',
                    }}>
                      Tu saldo: {coins ?? '…'} coins
                    </div>
                  )}
                  {/* Renta: mas barata y por tiempo. Se ofrece DEBAJO de la
                      compra porque la compra es lo que le deja mas a la
                      creadora; quien no quiera pagarla ya encuentra esto. */}
                  {clip.renta_coins != null && clip.renta_horas != null && sesion && (
                    <div onClick={rentando ? undefined : rentar} style={{
                      marginTop: 10, textAlign: 'center', padding: 14,
                      border: `1px solid ${LINEA.fuerte}`, cursor: 'pointer',
                      font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 1.6,
                      textTransform: 'uppercase', color: COLOR.textoSuave,
                    }}>
                      {rentando ? 'Rentando…'
                        : `O réntalo ${clip.renta_horas} h por ${clip.renta_coins} coins`}
                    </div>
                  )}
                  {errorCompra && (
                    <div style={{ font: `400 12px/1.5 ${FUENTE.ui}`, color: COLOR.acento, marginTop: 10, textAlign: 'center' }}>
                      {errorCompra}
                    </div>
                  )}
                </>
              )
            })() : (
              <div style={{
                marginTop: 16, background: COLOR.superficieAlta, color: COLOR.textoApagado, textAlign: 'center',
                padding: 17, font: `700 12px/1 ${FUENTE.ui}`, letterSpacing: 2, textTransform: 'uppercase',
              }}>
                Faltan las suscripciones
              </div>
            )}
          </div>
        )}

        {/* Discreto y al pie: reportar no es una accion que haya que invitar
            a hacer, pero tiene que estar cuando hace falta. */}
        <div style={{ marginTop: 26, textAlign: 'center' }}>
          <Reportar clip={id} etiqueta="Reportar este clip" />
        </div>
      </div>
    </div>
  )
}

function Centro({ texto, accion }: { texto: string; accion?: { texto: string; al: () => void } }) {
  return (
    <div style={{
      minHeight: '100%', boxSizing: 'border-box', padding: '64px 26px',
      background: COLOR.fondo, color: COLOR.textoSuave, fontFamily: FUENTE.serif, fontStyle: 'italic',
      fontSize: 20, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 20, textAlign: 'center',
    }}>
      {texto}
      {accion && (
        <span onClick={accion.al} style={{
          background: COLOR.acento, color: COLOR.fondo, padding: '15px 26px',
          font: `700 12px/1 ${FUENTE.ui}`, letterSpacing: 2, textTransform: 'uppercase',
          fontStyle: 'normal', cursor: 'pointer',
        }}>{accion.texto}</span>
      )}
    </div>
  )
}
