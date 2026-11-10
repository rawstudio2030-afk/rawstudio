// Pantalla 02 — Clip y paywall
// Reescrita: antes era el mock del deck con "Mira Vanta" y "Neon Hours vol. 3"
// escritos a mano. Ahora lee un clip real y su autora real.
//
// El candado NO es visual: el video vive en un bucket privado y solo se obtiene
// una URL firmada si las politicas de storage dejan leerlo. Sin acceso, aqui no
// hay archivo que reproducir aunque alguien edite el JavaScript.
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSesion } from '../lib/sesion'
import Avatar from '../components/Avatar'
import { clipPorId, urlPortada, urlVideoFirmada, fotosDeAlbum, clipsPublicados, type ClipConAutora, type FotoFirmada } from '../lib/clips'
import { cuantos } from '../lib/plural'
import { comprarClip, saldo } from '../lib/monedero'
import { rentarClip, reembolsoDisponible, reclamarReembolso } from '../lib/canales'
import Reportar from '../components/Reportar'
import ConsultarPorTelegram from '../components/ConsultarPorTelegram'
import Comentarios from '../components/Comentarios'
import Reproductor from '../components/Reproductor'
import VisorAlbum from '../components/VisorAlbum'
import { COLOR, VELO, TINTE, FUENTE, RADIO, PISO } from '../lib/diseño'
import { BOTON_OSCURO, BOTON_OSCURO_SUAVE } from '../lib/oscuro'
import { usd, usdYPesos, limpiarMensajeDinero } from '../lib/dinero'
import { useMoneda } from '../lib/moneda'
import Equivalente from '../components/Equivalente'
import { Pulsable, Enlace } from '../components/Pulsable'
import Centro from '../components/Centro'
import Icono from '../components/Iconos'
import Wordmark from '../components/Wordmark'


export default function ClipDetail() {
  const nav = useNavigate()
  const { id } = useParams()
  const { sesion, perfil: perfilPropio } = useSesion()
  useMoneda()
  const [clip, setClip] = useState<ClipConAutora | null>(null)
  const [cargando, setCargando] = useState(true)
  // «Este clip ya no existe» es definitivo: quien llega por un enlace
  // compartido lo entiende como que se borro. No se dice por un fallo de red.
  const [fallo, setFallo] = useState<string | null>(null)
  const [video, setVideo] = useState<string | null>(null)
  // La portada nitida que firma `ver-clip` para quien ya tiene acceso. Null
  // mientras no haya acceso, o si no se pudo firmar: entonces se usa la
  // publica de 160 px, que es una imagen peor y no un error.
  const [portadaNitida, setPortadaNitida] = useState<string | null>(null)
  const [bloqueo, setBloqueo] = useState<{ motivo?: string; pais?: string } | null>(null)
  const [coins, setCoins] = useState<number | null>(null)
  const [comprando, setComprando] = useState(false)
  const [recienComprado, setRecienComprado] = useState(false)
  // Un album no tiene una sola URL: la ficha pide las fotos firmadas UNA vez (eso
  // tambien le dice si hay acceso) y se las pasa al visor.
  const [albumInicial, setAlbumInicial] = useState<{ fotos: FotoFirmada[]; expira_en: number } | null>(null)
  // La sesion llega en varias pasadas y el efecto de carga corre cada vez: un
  // album que ya se abrio no se vuelve a pedir (firmar 24 URLs no es gratis).
  const albumPedido = useRef<string | null>(null)
  const [rentando, setRentando] = useState(false)
  const [devolucion, setDevolucion] = useState(0)
  const [errorCompra, setErrorCompra] = useState('')

  // El efecto vuelve a correr cada vez que llega la sesion (varias veces al
  // abrir, y al volver a la pestana). Poner «Cargando…» en cada pasada desmontaba
  // el reproductor o el visor, y quien miraba perdia su sitio. Solo se muestra
  // cuando CAMBIA el clip.
  const idMostrado = useRef<string | undefined>(undefined)
  useEffect(() => {
    let vivo = true
    if (idMostrado.current !== id) setCargando(true)
    idMostrado.current = id
    const traer = async () => {
      // Sin id en la ruta se muestra el mas reciente, que es lo util al entrar
      // desde el age gate mientras no exista una pantalla de descubrimiento.
      const r = id ? await clipPorId(id) : await clipsPublicados(1)
      if (!vivo) return
      const c = Array.isArray(r.datos) ? r.datos[0] ?? null : r.datos
      setClip(c); setFallo(r.fallo); setCargando(false)
      if (c?.formato === 'album' && sesion) {
        if (albumPedido.current === c.id) return
        const a = await fotosDeAlbum(c.id)
        if (!vivo) return
        if ('fotos' in a) { albumPedido.current = c.id; setAlbumInicial({ fotos: a.fotos, expira_en: a.expira_en }); setBloqueo(null) }
        else setBloqueo({ motivo: a.motivo, pais: a.pais })
      } else if (c?.tiene_video && sesion) {
        const a = await urlVideoFirmada(c.id)
        if (!vivo) return
        if ('url' in a) { setVideo(a.url); setPortadaNitida(a.portada); setBloqueo(null) }
        else setBloqueo({ motivo: a.motivo, pais: a.pais })
      }
    }
    traer()
    // El saldo se deja en null si no se pudo leer: cero diria que no tiene
    // dinero, y de ahi sale el boton de «recargar» en vez del de comprar.
    if (sesion) saldo().then(r => { if (vivo && !r.fallo) setCoins(r.datos) })
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
    if ('error' in r) { setErrorCompra(limpiarMensajeDinero(r.error!)); return }
    // Igual que al comprar: hay que volver a pedir la URL firmada, porque
    // hasta ahora la funcion de borde la estaba negando.
    setCoins(r.saldo ?? null)
    const a = await urlVideoFirmada(clip.id)
    if ('url' in a) { setVideo(a.url); setPortadaNitida(a.portada) }
  }

  // Tras comprar se vuelve a pedir la URL firmada: la politica de storage ya
  // reconoce la compra, asi que ahora si entrega el archivo.
  const desbloquear = async () => {
    if (!clip || comprando) return
    setComprando(true); setErrorCompra('')
    const r = await comprarClip(clip.id)
    if (!r.ok) { setErrorCompra(limpiarMensajeDinero(r.error ?? 'No se pudo completar')); setComprando(false); return }
    setCoins(r.saldo ?? null)
    // Comprar (no rentar) deja el clip en la Biblioteca: se le dice donde queda.
    setRecienComprado(true)
    if (clip.formato === 'album') {
      const f = await fotosDeAlbum(clip.id)
      if ('fotos' in f) { albumPedido.current = clip.id; setAlbumInicial({ fotos: f.fotos, expira_en: f.expira_en }) }
    } else {
      const a = await urlVideoFirmada(clip.id)
      if ('url' in a) { setVideo(a.url); setPortadaNitida(a.portada) }
    }
    setComprando(false)
  }

  if (cargando) return <Centro texto="Cargando…" />

  if (fallo) return (
    <Centro
      texto="No pudimos cargar este clip. No es que no exista."
      accion={{ texto: 'Reintentar', al: () => window.location.reload() }}
    />
  )

  if (!clip) return (
    <Centro
      texto={id ? 'Este clip ya no existe.' : 'Todavía no hay clips publicados.'}
      accion={{ texto: 'Volver', al: () => nav('/entrar') }}
    />
  )

  const autora = clip.profiles
  const portada = urlPortada(clip.cover_path)
  // El poster del reproductor: la nitida si la funcion de borde la entrego, y
  // si no la publica de 160 px. Antes era siempre la de 160 px estirada a 300
  // px de alto, o sea que quien pagaba veia la misma miniatura borrosa del
  // catalogo mientras la de 720 px dormia en el bucket privado.
  const poster = portadaNitida ?? portada
  const mio = sesion?.user.id === clip.creator_id
  // Su propia creadora no necesita marca: no tiene a quien delatar.
  const marca = !mio && perfilPropio ? `@${perfilPropio.handle}` : null
  // Hoy solo la autora y un admin pueden abrir el archivo. Cuando existan las
  // compras, video llegara tambien a quien pago, sin cambiar nada aqui.
  const esAlbum = clip.formato === 'album'
  const desbloqueado = esAlbum ? albumInicial !== null : !!video

  const dur = clip.duration_s && clip.duration_s > 0
    ? `${Math.floor(clip.duration_s / 60)}:${String(Math.round(clip.duration_s % 60)).padStart(2, '0')}`
    : null

  /* MODO CONSUMO (DESIGN-BRIEF.md): aqui se viene a ver, no a que lo
   * seduzcan. Es el cuarto oscuro (−2), pero SOBRIO: fondo plano, tipografia de
   * interfaz, cero animacion, y la luz roja solo donde se actua: el candado, el
   * precio y el boton de comprar. El reproductor no se redecora. */
  const boton = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxSizing: 'border-box',
    width: '100%', minHeight: 54, padding: '0 18px', borderRadius: RADIO.filo,
    font: `700 14px/1 ${FUENTE.ui}`, letterSpacing: 1.6, textTransform: 'uppercase',
  } as const

  return (
    <div style={{ minHeight: '100%', background: PISO.oscuro.vacio, color: COLOR.texto, fontFamily: FUENTE.ui }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 14px 0' }}>
        <Pulsable al={() => nav(-1)} rotulo="Volver" style={{
          width: 44, height: 44, borderRadius: '50%', display: 'grid', placeItems: 'center',
          border: '1px solid rgba(255,255,255,.22)', background: VELO.ligero,
          color: COLOR.texto, cursor: 'pointer',
        }}><span aria-hidden style={{ font: `400 22px/1 ${FUENTE.ui}` }}>&#8249;</span></Pulsable>
        <span className="sin-riel"><Wordmark ancho={104} piso="oscuro" /></span>
        <span aria-hidden style={{ width: 44 }} />
      </div>

      {/* El reproductor */}
      <div style={{
        position: 'relative', margin: '14px 14px 0', aspectRatio: '4 / 3', maxHeight: '62vh',
        borderRadius: RADIO.filo, overflow: 'hidden', background: COLOR.superficie,
        border: '1px solid rgba(255,255,255,.12)',
        // Un album desbloqueado NO muestra aqui su portada: la nitida es la primera
        // foto SIN marca, y las fotos solo se ven en el visor, con la marca puesta.
        display: esAlbum && desbloqueado ? 'none' : undefined,
      }}>
        {esAlbum && (
          <span style={{ position: 'absolute', top: 10, left: 10, zIndex: 2, padding: '5px 8px', borderRadius: 6,
            background: 'rgba(14,21,32,.78)', border: `1px solid ${COLOR.admin}`, color: COLOR.admin,
            font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.4, textTransform: 'uppercase' }}>
            Álbum · {cuantos(clip.num_fotos, 'foto')}
          </span>
        )}
        {desbloqueado && !esAlbum ? (
          <>
            {/* El identificador de quien mira (`marca`) va encima del video, dentro
                del reproductor para que siga puesto en pantalla completa. Se usa
                el handle y no el correo: señala la cuenta sin exponer un dato
                de contacto en una grabacion que podria acabar circulando. */}
            <Reproductor src={video!} poster={poster} marca={marca} />
          </>
        ) : (
          <>
            <div style={{
              position: 'absolute', inset: 0,
              background: portada ? `center/cover url(${portada})`
                                  : `repeating-linear-gradient(122deg,${COLOR.superficieAlta} 0 9px,${COLOR.fondo} 9px 18px)`,
              filter: 'blur(9px) saturate(.7)', transform: 'scale(1.06)',
            }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(14,21,32,.35) 0%,rgba(14,21,32,.92) 100%)' }} />
            <div style={{
              position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', alignContent: 'center', gap: 10,
              color: bloqueo?.motivo === 'geobloqueo' ? COLOR.admin : COLOR.texto,
            }}>
              <span aria-hidden style={{ display: 'grid', color: bloqueo?.motivo === 'geobloqueo' ? undefined : PISO.oscuro.safelightLit }}><Icono nombre="candado" tam={34} /></span>
              <span style={{ font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 2, textTransform: 'uppercase' }}>
                {bloqueo?.motivo === 'geobloqueo' ? 'No disponible aquí' : 'Bloqueado'}
              </span>
            </div>
          </>
        )}
      </div>

      <div style={{ padding: '20px 18px 40px' }}>
        {/* Comprar solo desbloquea el video; sin esto nadie sabe donde queda. */}
        {recienComprado && desbloqueado && (
          <Enlace a="/library" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
            padding: '13px 14px', marginBottom: 16, borderRadius: 10, cursor: 'pointer',
            border: `1px solid ${COLOR.dinero}`, background: 'rgba(224,177,90,.07)',
            font: `400 14px/1.45 ${FUENTE.ui}`, color: COLOR.texto,
          }}>
            <span><b style={{ color: COLOR.dinero }}>Comprado.</b> Lo encuentras siempre en tu Biblioteca.</span>
            <span aria-hidden style={{ color: COLOR.dinero }}>→</span>
          </Enlace>
        )}
        <h1 style={{ margin: 0, font: `700 26px/1.15 ${FUENTE.ui}` }}>{clip.title}</h1>

        <div style={{ font: `400 12px/1.6 ${FUENTE.mono}`, color: COLOR.textoTenue, marginTop: 8 }}>
          {dur && <>{dur} &middot; </>}
          {esAlbum && <>{cuantos(clip.num_fotos, 'foto')} &middot; </>}
          publicado {clip.published_at ? new Date(clip.published_at).toLocaleDateString('es-MX') : '—'}
          {!clip.published && ' · borrador'}
        </div>

        {clip.description && (
          <div style={{ font: `400 16px/1.5 ${FUENTE.ui}`, color: COLOR.textoSuave, marginTop: 14 }}>
            {clip.description}
          </div>
        )}

        {/* Las fotos de un album, ya desbloqueado, con la marca de quien mira. */}
        {esAlbum && desbloqueado && (
          <div style={{ marginTop: 18 }}>
            <VisorAlbum key={clip.id} clip={clip.id} marca={marca} titulo={clip.title} inicial={albumInicial} />
          </div>
        )}

        {/* autora */}
        {autora && (
          <Enlace a={`/creator/${autora.handle}`} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '16px 0', marginTop: 18,
            borderTop: '1px solid rgba(255,255,255,.1)', borderBottom: '1px solid rgba(255,255,255,.1)',
            cursor: 'pointer',
          }}>
            <Avatar ruta={autora.avatar_path} nombre={autora.display_name} handle={autora.handle} tam={46}
              style={{ border: `1.5px solid ${COLOR.acento}` }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: `700 16px/1.3 ${FUENTE.ui}`, display: 'flex', alignItems: 'center', gap: 6 }}>
                {autora.display_name}
                {autora.verified && (
                  <span role="img" aria-label="Verificada" style={{ color: COLOR.admin, display: 'grid' }}>
                    <Icono nombre="verificada" tam={15} />
                  </span>
                )}
              </div>
              <div style={{ font: `400 12px/1.45 ${FUENTE.mono}`, color: COLOR.textoTenue }}>@{autora.handle}</div>
            </div>
            <span aria-hidden style={{ color: COLOR.textoTenue, font: `400 22px/1 ${FUENTE.ui}` }}>&#8250;</span>
          </Enlace>
        )}

        {devolucion > 0 && (
          <div style={{ marginTop: 22, border: `1.5px solid ${COLOR.dinero}`, borderRadius: RADIO.filo, padding: 18 }}>
            <div style={{ font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 2,
              textTransform: 'uppercase', color: COLOR.dinero }}>
              La creadora retiró este clip
            </div>
            <div style={{ marginTop: 10, font: `400 14px/1.55 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
              Decidió que dejara de estar disponible. Te devolvemos lo que pagaste.
            </div>
            <Pulsable al={async () => {
              if (!id) return
              const r = await reclamarReembolso(id)
              if ('error' in r) { setErrorCompra(r.error!); return }
              setDevolucion(0)
              const s = await saldo()
              if (!s.fallo) setCoins(s.datos)
            }} style={{
              ...boton, marginTop: 14, cursor: 'pointer',
              background: COLOR.dinero, color: COLOR.fondo,
            }}>Recuperar mis {usd(devolucion)}</Pulsable>
          </div>
        )}

        {bloqueo?.motivo === 'geobloqueo' ? (
          <div style={{
            marginTop: 22, padding: '18px 16px', borderRadius: RADIO.filo,
            border: '1px solid rgba(126,191,179,.4)', background: 'rgba(126,191,179,.06)',
          }}>
            <div style={{ font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 2, textTransform: 'uppercase', color: COLOR.admin }}>
              No disponible en tu país
            </div>
            <div style={{ font: `400 16px/1.45 ${FUENTE.ui}`, color: COLOR.textoSuave, marginTop: 9 }}>
              Quien publicó este clip decidió no mostrarlo aquí. No es un error
              ni falta de pago: es su elección, y la respetamos.
            </div>
          </div>
        ) : mio ? (
          <div style={{
            marginTop: 22, padding: '18px 16px', borderRadius: RADIO.filo,
            border: '1px dashed rgba(224,177,90,.4)', background: TINTE.dinero,
          }}>
            <div style={{ font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 2, textTransform: 'uppercase', color: COLOR.dinero }}>
              Es tuyo
            </div>
            <div style={{ font: `400 16px/1.45 ${FUENTE.ui}`, color: COLOR.textoSuave, marginTop: 9 }}>
              Lo ves completo porque lo publicaste tú.
            </div>
          </div>
        // Un album ya desbloqueado no vuelve a ofrecer comprarse (no se renta, asi que
        // no hay un «mejor comprarlo» que ofrecer).
        ) : clip.visibility === 'gratis' || (esAlbum && desbloqueado) ? null : (
          <div style={{
            marginTop: 22, padding: 18, borderRadius: RADIO.filo,
            border: '1px solid rgba(255,255,255,.14)', background: COLOR.superficie,
          }}>
            <div style={{ font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 2, textTransform: 'uppercase', color: COLOR.textoSuave }}>
              {clip.visibility === 'pago' ? 'Desbloquear para siempre' : 'Solo suscriptores'}
            </div>

            {clip.visibility === 'pago' && (
              <div style={{ display: 'flex', alignItems: 'stretch', marginTop: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 1.6, textTransform: 'uppercase', color: COLOR.acento }}>Comprar</div>
                  <div style={{ font: `700 30px/1 ${FUENTE.mono}`, color: COLOR.dinero, marginTop: 8 }}>{usd(clip.price_coins)}</div>
                  <Equivalente centavos={clip.price_coins} />
                </div>
                {clip.renta_coins != null && clip.renta_horas != null && (
                  <div style={{ flex: 1, paddingLeft: 16, borderLeft: '1px solid rgba(255,255,255,.14)' }}>
                    <div style={{ font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 1.6, textTransform: 'uppercase', color: COLOR.acento }}>Rentar</div>
                    <div style={{ font: `700 30px/1 ${FUENTE.mono}`, color: COLOR.dinero, marginTop: 8 }}>{usd(clip.renta_coins)}</div>
                    <Equivalente centavos={clip.renta_coins} />
                    <div style={{ font: `400 12px/1.3 ${FUENTE.ui}`, color: COLOR.textoTenue, marginTop: 6 }}>{clip.renta_horas} h para ver</div>
                  </div>
                )}
              </div>
            )}

            {clip.visibility === 'pago' ? (() => {
              const alcanza = coins !== null && coins >= clip.price_coins
              const falta = coins === null ? 0 : clip.price_coins - coins
              const puede = !sesion || alcanza
              return (
                <>
                  {/* Sin sesion el boton decia «entra para desbloquear» y no
                      hacia nada: el unico callejon sin salida del recorrido de
                      quien viene a mirar. Ahora lleva a la puerta, y es el
                      mismo boton de siempre, porque SI se puede
                      tocar. */}
                  <Pulsable
                    al={!sesion ? () => nav('/entrar') : desbloquear}
                    activo={puede}
                    style={{
                      ...boton, marginTop: 18,
                      cursor: puede ? 'pointer' : 'default',
                      ...(puede ? BOTON_OSCURO : {
                        color: COLOR.textoApagado, background: COLOR.superficieAlta, boxShadow: 'none',
                      }),
                      font: `700 14px/1 ${FUENTE.ui}`, letterSpacing: 1.6,
                    }}>
                    {comprando ? 'Desbloqueando…'
                      : !sesion ? 'Entra para desbloquear'
                      : alcanza ? <>Desbloquear este {esAlbum ? 'álbum' : 'clip'} <span aria-hidden>&#8250;</span></>
                      : `Te faltan ${usd(falta)}`}
                  </Pulsable>
                  {sesion && (
                    <Enlace a="/wallet" style={{
                      display: 'block',
                      font: `400 11px/1.6 ${FUENTE.mono}`, color: COLOR.textoTenue, marginTop: 10,
                      textAlign: 'center', cursor: 'pointer', textDecoration: 'underline',
                    }}>
                      Tu saldo: {coins !== null ? usdYPesos(coins) : '…'}
                    </Enlace>
                  )}
                  {/* Renta: mas barata y por tiempo. Se ofrece DEBAJO de la
                      compra porque la compra es lo que le deja mas a la
                      creadora; quien no quiera pagarla ya encuentra esto. */}
                  {clip.renta_coins != null && clip.renta_horas != null && sesion && (
                    <Pulsable al={rentar} activo={!rentando} style={{
                      ...boton, marginTop: 10, cursor: 'pointer', ...BOTON_OSCURO_SUAVE,
                      font: `700 12px/1 ${FUENTE.ui}`,
                    }}>
                      {rentando ? 'Rentando…'
                        : `O réntalo ${clip.renta_horas} h por ${usdYPesos(clip.renta_coins)}`}
                    </Pulsable>
                  )}
                  {errorCompra && (
                    <div style={{ font: `400 13px/1.45 ${FUENTE.ui}`, color: COLOR.error, marginTop: 10, textAlign: 'center' }}>
                      {errorCompra}
                    </div>
                  )}
                </>
              )
            })() : (
              <div style={{
                ...boton, marginTop: 18, background: COLOR.superficieAlta, color: COLOR.textoApagado,
              }}>
                Faltan las suscripciones
              </div>
            )}
          </div>
        )}

        {/* Solo se pinta si la creadora ya vinculo su Telegram. */}
        {!mio && (
          <ConsultarPorTelegram key={clip.id} clip={clip.id} creadora={clip.creator_id}
            haySesion={!!sesion} handle={autora?.handle} />
        )}

        {/* Quien puede ver la ficha lee; quien puede abrir el video comenta y
            califica (lo decide el servidor). Va antes de «Reportar». */}
        <Comentarios key={clip.id} clip={clip.id} esDuenia={mio}
          haySesion={!!sesion} desbloqueado={desbloqueado} album={esAlbum} />

        {/* Discreto y al pie: reportar no es una accion que haya que invitar
            a hacer, pero tiene que estar cuando hace falta. */}
        <div style={{ marginTop: 26, textAlign: 'center' }}>
          <Reportar clip={id} etiqueta="Reportar este clip" />
        </div>
      </div>
    </div>
  )
}
