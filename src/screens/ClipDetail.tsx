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
import MarcaDeAgua from '../components/MarcaDeAgua'

const UI = "'Space Grotesk', system-ui, sans-serif"
const MONO = "'Space Mono', monospace"
const SERIF = "'Instrument Serif', serif"

export default function ClipDetail() {
  const nav = useNavigate()
  const { id } = useParams()
  const { sesion, perfil: perfilPropio } = useSesion()
  const [clip, setClip] = useState<ClipConAutora | null>(null)
  const [cargando, setCargando] = useState(true)
  const [video, setVideo] = useState<string | null>(null)
  const [coins, setCoins] = useState<number | null>(null)
  const [comprando, setComprando] = useState(false)
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
      if (c?.storage_path) {
        const u = await urlVideoFirmada(c.storage_path)
        if (vivo) setVideo(u)
      }
    }
    traer()
    if (sesion) saldo().then(v => { if (vivo) setCoins(v) })
    return () => { vivo = false }
  }, [id, sesion])

  // Tras comprar se vuelve a pedir la URL firmada: la politica de storage ya
  // reconoce la compra, asi que ahora si entrega el archivo.
  const desbloquear = async () => {
    if (!clip || comprando) return
    setComprando(true); setErrorCompra('')
    const r = await comprarClip(clip.id)
    if (!r.ok) { setErrorCompra(r.error ?? 'No se pudo completar'); setComprando(false); return }
    setCoins(r.saldo ?? null)
    if (clip.storage_path) setVideo(await urlVideoFirmada(clip.storage_path))
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
    <div style={{ minHeight: '100%', background: '#08080A', color: '#F2F0F3', fontFamily: UI }}>
      {/* marco */}
      <div style={{ position: 'relative', height: 300, background: '#111116' }}>
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
              position: 'absolute', top: 16, right: 16, border: '1px solid #C8FF3D',
              color: '#C8FF3D', padding: '7px 10px',
              font: `700 10px/1 ${UI}`, letterSpacing: 1.6, textTransform: 'uppercase',
            }}>Bloqueado</div>
          </>
        )}
        <span onClick={() => nav(-1)} style={{
          position: 'absolute', top: 16, left: 16, width: 38, height: 38, borderRadius: '50%',
          border: '1px solid rgba(255,255,255,.22)', background: 'rgba(8,8,10,.55)',
          display: 'grid', placeItems: 'center', font: `400 20px/1 ${UI}`,
          color: '#F2F0F3', cursor: 'pointer', zIndex: 2,
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
            border: '1px solid #FF2BD1',
            background: foto ? `center/cover url(${foto})` : 'repeating-linear-gradient(130deg,#191920 0 6px,#111116 6px 12px)',
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: `700 15px/1.3 ${UI}`, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
              {autora.display_name}
              {autora.verified && <span style={{ color: '#00E5FF', fontSize: 13 }}>&#10038;</span>}
            </div>
            <div style={{ font: `400 12px/1.4 ${MONO}`, color: '#6E6A72' }}>@{autora.handle}</div>
          </div>
          <span style={{ color: '#5E5A63' }}>›</span>
        </div>
      )}

      <div style={{ padding: '20px 20px 40px' }}>
        <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 34, lineHeight: 1, textTransform: 'uppercase' }}>
          {clip.title}
        </div>

        {clip.description && (
          <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 18, lineHeight: 1.4, color: '#9C979F', marginTop: 12 }}>
            {clip.description}
          </div>
        )}

        <div style={{ font: `400 11px/1.7 ${MONO}`, color: '#5E5A63', marginTop: 14 }}>
          publicado {clip.published_at ? new Date(clip.published_at).toLocaleDateString('es-MX') : '—'}
          {!clip.published && ' · borrador'}
        </div>

        {mio ? (
          <div style={{
            marginTop: 24, padding: '18px 16px', border: '1px dashed rgba(200,255,61,.4)',
            background: 'rgba(200,255,61,.05)',
          }}>
            <div style={{ font: `700 10px/1 ${UI}`, letterSpacing: 2.2, textTransform: 'uppercase', color: '#C8FF3D' }}>
              Es tuyo
            </div>
            <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 16, color: '#9C979F', marginTop: 9 }}>
              Lo ves completo porque lo publicaste tú.
            </div>
          </div>
        ) : clip.visibility === 'gratis' ? null : (
          <div style={{ marginTop: 24, border: '1px solid rgba(255,255,255,.12)', padding: 18 }}>
            <div style={{ font: `700 10px/1 ${UI}`, letterSpacing: 2.2, textTransform: 'uppercase', color: '#6E6A72' }}>
              {clip.visibility === 'pago' ? 'Desbloquear para siempre' : 'Solo suscriptores'}
            </div>
            {clip.visibility === 'pago' && (
              <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 30, lineHeight: 1, color: '#C8FF3D', marginTop: 10 }}>
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
                    background: !sesion ? '#191920' : alcanza ? '#C8FF3D' : '#191920',
                    color: !sesion ? '#5E5A63' : alcanza ? '#08080A' : '#5E5A63',
                    textAlign: 'center', padding: 17,
                    font: `700 12px/1 ${UI}`, letterSpacing: 2, textTransform: 'uppercase',
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
                      font: `400 11px/1.6 ${MONO}`, color: '#6E6A72', marginTop: 10,
                      textAlign: 'center', cursor: 'pointer', textDecoration: 'underline',
                    }}>
                      Tu saldo: {coins ?? '…'} coins
                    </div>
                  )}
                  {errorCompra && (
                    <div style={{ font: `400 12px/1.5 ${UI}`, color: '#FF2BD1', marginTop: 10, textAlign: 'center' }}>
                      {errorCompra}
                    </div>
                  )}
                </>
              )
            })() : (
              <div style={{
                marginTop: 16, background: '#191920', color: '#5E5A63', textAlign: 'center',
                padding: 17, font: `700 12px/1 ${UI}`, letterSpacing: 2, textTransform: 'uppercase',
              }}>
                Faltan las suscripciones
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Centro({ texto, accion }: { texto: string; accion?: { texto: string; al: () => void } }) {
  return (
    <div style={{
      minHeight: '100%', boxSizing: 'border-box', padding: '64px 26px',
      background: '#08080A', color: '#9C979F', fontFamily: SERIF, fontStyle: 'italic',
      fontSize: 20, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 20, textAlign: 'center',
    }}>
      {texto}
      {accion && (
        <span onClick={accion.al} style={{
          background: '#FF2BD1', color: '#08080A', padding: '15px 26px',
          font: `700 12px/1 ${UI}`, letterSpacing: 2, textTransform: 'uppercase',
          fontStyle: 'normal', cursor: 'pointer',
        }}>{accion.texto}</span>
      )}
    </div>
  )
}
