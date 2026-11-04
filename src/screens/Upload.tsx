// Pantalla 05 — Subir clip
// Reescrita: antes era el mock del deck con "hotel_bar_take04.mov" escrito a
// mano. Ahora sube de verdad al bucket privado y crea la fila en la base.
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSesion } from '../lib/sesion'
import { subirArchivo, subirPortada, crearClip, type Visibilidad } from '../lib/clips'
import {
  miniaturaDeVideo, tiraDeVideo, cuadrosDeVideo, achicar,
  ANCHO_PUBLICO, type Cuadro,
} from '../lib/miniatura'
import { COLOR, LINEA, TINTE, FUENTE } from '../lib/diseño'
import MisClips from '../components/MisClips'
import { usd } from '../lib/dinero'
import { Pulsable, Enlace } from '../components/Pulsable'


const etiqueta: React.CSSProperties = {
  font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 2.2, textTransform: 'uppercase', color: COLOR.textoTenue,
}
const campo: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', background: COLOR.superficie,
  border: '1px solid rgba(255,255,255,.14)', color: COLOR.texto,
  font: `400 16px/1.3 ${FUENTE.ui}`, padding: '15px', outline: 'none',
}

const MODOS: { v: Visibilidad; t: string }[] = [
  { v: 'pago', t: 'Por clip' },
  { v: 'suscriptores', t: 'Suscriptores' },
  { v: 'gratis', t: 'Gratis' },
]

export default function Upload() {
  const nav = useNavigate()
  const { sesion, perfil, cargando } = useSesion()
  const refVideo = useRef<HTMLInputElement>(null)
  const refPortada = useRef<HTMLInputElement>(null)

  const [video, setVideo] = useState<File | null>(null)
  const [portada, setPortada] = useState<File | null>(null)
  const [suya, setSuya] = useState<string | null>(null)   // vista de la portada propia
  const [cuadros, setCuadros] = useState<Cuadro[]>([])
  const [elegido, setElegido] = useState(0)
  const [sacando, setSacando] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [desc, setDesc] = useState('')
  const [modo, setModo] = useState<Visibilidad>('pago')
  const [precio, setPrecio] = useState(240)      // 2.40 USD
  const [renta, setRenta] = useState(false)
  const [rentaHoras, setRentaHoras] = useState<48 | 72>(48)
  const [rentaCoins, setRentaCoins] = useState(80) // 0.80 USD
  const [estado, setEstado] = useState<'listo' | 'subiendo' | 'error' | 'sin-portada'>('listo')
  const [detalle, setDetalle] = useState('')
  const [clipNuevo, setClipNuevo] = useState<string | null>(null)
  const [paso, setPaso] = useState('')

  // Los cuadros candidatos se sacan en cuanto hay video, no al publicar: asi
  // la creadora elige mientras escribe el titulo, y si el navegador no puede
  // con el formato se sabe ahora y no al final de una subida de 2 GB.
  useEffect(() => {
    if (!video) return
    let vivo = true
    const sueltos: Cuadro[] = []
    setSacando(true)
    cuadrosDeVideo(video).then(cs => {
      sueltos.push(...cs)
      if (!vivo) return
      setCuadros(cs)
      setElegido(Math.min(1, Math.max(0, cs.length - 1)))  // ni el primerisimo
      setSacando(false)
    })
    return () => {
      vivo = false
      // Cada vista es un object URL: sin revocarlos, cambiar de video seis
      // veces deja seis juegos de imagenes retenidos en memoria.
      for (const c of sueltos) URL.revokeObjectURL(c.vista)
      setCuadros([])
    }
  }, [video])

  // Lo mismo para la portada que sube ella a mano. Antes se llamaba a
  // createObjectURL dentro del render, que crea una URL nueva en cada pintada
  // y no revoca ninguna.
  useEffect(() => {
    if (!portada) { setSuya(null); return }
    const u = URL.createObjectURL(portada)
    setSuya(u)
    return () => URL.revokeObjectURL(u)
  }, [portada])

  if (cargando) return <Centro texto="Cargando…" />
  if (!sesion) return <Centro texto="Necesitas entrar para publicar." accion={{ texto: 'Entrar', al: () => nav('/acceso') }} />
  if (!perfil?.is_creator) return (
    <Centro
      texto="Activa tu perfil de creadora para poder publicar."
      accion={{ texto: 'Ir a mi perfil', al: () => nav('/perfil') }}
    />
  )
  if (perfil.suspended_at) return <Centro texto="Tu cuenta está suspendida. Escríbenos si crees que es un error." />
  // Se bloquea ANTES del formulario. La politica de la base ya lo impide, pero
  // dejar llenar todo para rechazar al final seria cruel: se sube el video, se
  // espera, y hasta entonces el error.
  // NO se bloquea la pantalla a quien no esta verificada. La base ya la deja
  // subir —el clip nace pendiente y no se puede aprobar ni cobrar hasta que se
  // verifique— y cerrarle la puerta aqui la mandaba de vuelta sin haber hecho
  // nada. Quien se registra y se va no suele volver. Sube, y mientras tanto se
  // revisan sus documentos; si no cumple, se baja todo.

  // 'sin-portada' cuenta como no-listo: el clip YA se publico, y volver a
  // pulsar publicaria un duplicado con el mismo video.
  const listo = !!video && titulo.trim().length > 0
    && estado !== 'subiendo' && estado !== 'sin-portada'
  const gana = modo === 'pago' ? Math.round(precio * 0.8) : 0

  const publicar = async () => {
    if (!listo || !video || !sesion) return
    setEstado('subiendo'); setDetalle('')

    // La portada: la que subio ella, el cuadro que eligio, o —si el navegador
    // no pudo decodificar el video— el automatico de siempre. Todo esto pasa
    // ANTES de subir el video: el archivo ya esta aqui, y si se hiciera
    // despues habria que esperar toda la subida para descubrir que el formato
    // no se puede leer.
    let nitida: File | null = portada ?? cuadros[elegido]?.nitida ?? null
    if (!nitida) {
      setPaso('Sacando la portada del video…')
      nitida = await miniaturaDeVideo(video)
    }

    // La copia publica se achica AQUI, antes de que la grande salga de esta
    // maquina. Pedirle la reduccion al servidor obligaria a subir primero la
    // grande al bucket publico, que es justo el agujero que esto cierra.
    setPaso('Preparando la portada…')
    const chica = nitida ? await achicar(nitida) : null

    // La tira de seis cuadros solo tiene sentido en los clips GRATIS, donde
    // enseñar vende. En uno de pago era regalar seis fotogramas del contenido
    // a cualquiera que pasara el mouse — por 183 clips, unos 1.098 cuadros.
    const tira = modo === 'gratis' ? await tiraDeVideo(video) : null

    setPaso('Subiendo el video…')
    const v = await subirArchivo('clips', sesion.user.id, video)
    if (v.error) { setEstado('error'); setDetalle(v.error); return }

    let coverPath: string | null = null
    let falloPortada: string | null = null
    if (nitida && chica) {
      setPaso('Subiendo la portada…')
      // Las dos copias, misma ruta: la chica al bucket publico y la nitida al
      // privado. Que falle NO tumba la publicacion —perder el video ya subido
      // por una imagen seria mucho peor— pero SI se dice. Antes se ponia
      // `null` en silencio: el clip aparecia sin portada y nadie sabia por
      // que, ni que se podia reintentar.
      const c = await subirPortada(sesion.user.id, nitida, chica)
      if (c.error) falloPortada = c.error
      coverPath = c.path ?? null
    } else if (video) {
      falloPortada = 'No pude sacar un cuadro de este video.'
    }

    let previewPath: string | null = null
    if (tira) {
      const t = await subirArchivo('clip-covers', sesion.user.id, tira)
      previewPath = t.error ? null : (t.path ?? null)
    }

    setPaso('Publicando…')
    const r = await crearClip({
      creator_id: sesion.user.id,
      title: titulo.trim(),
      description: desc.trim() || null,
      storage_path: v.path ?? null,
      cover_path: coverPath,
      visibility: modo,
      price_coins: modo === 'pago' ? precio : 0,
      renta_horas: modo === 'pago' && renta ? rentaHoras : null,
      renta_coins: modo === 'pago' && renta ? rentaCoins : null,
      preview_path: previewPath,
      published: true,
    })
    if (r.error) { setEstado('error'); setDetalle(r.error); return }

    // El clip SI se publico. Si la portada se quedo fuera no se navega: se
    // dice, con el clip ya a salvo y una liga para ir a verlo. Irse en
    // silencio dejaria a la creadora descubriendolo sola en el catalogo.
    if (falloPortada) { setEstado('sin-portada'); setDetalle(falloPortada); setClipNuevo(r.id ?? null); return }

    nav(`/clip/${r.id}`)
  }

  return (
    <div style={{
      minHeight: '100%', boxSizing: 'border-box', padding: '54px 22px 40px',
      background: COLOR.fondo, color: COLOR.texto, fontFamily: FUENTE.ui,
      display: 'flex', flexDirection: 'column', gap: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pulsable al={() => nav(-1)} rotulo="Volver" style={{ font: `400 26px/1 ${FUENTE.ui}`, color: COLOR.textoSuave, cursor: 'pointer' }}>‹</Pulsable>
        <span style={{ ...etiqueta, color: COLOR.dinero }}>Nuevo clip</span>
        <span style={{ width: 14 }} />
      </div>

      {!perfil.identidad_verificada && (
        <div style={{ padding: '13px 15px', border: `1px solid ${COLOR.admin}` }}>
          <div style={{ font: `400 13px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
            Puedes subir desde ahora. Tu clip queda guardado y{' '}
            <b style={{ color: COLOR.texto }}>se publica en cuanto verifiquemos tu
            identidad</b> — no tienes que volver a subirlo.
          </div>
          <Enlace a="/verificar" style={{
            display: 'block', boxSizing: 'border-box', width: '100%',
            marginTop: 11, textAlign: 'center', padding: '12px 0', cursor: 'pointer',
            background: COLOR.admin, color: COLOR.fondo,
            font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.6, textTransform: 'uppercase',
          }}>Verificar mi identidad</Enlace>
        </div>
      )}

      {/* video */}
      <Pulsable al={() => refVideo.current?.click()} style={{
        boxSizing: 'border-box', width: '100%',
        padding: '26px 18px', textAlign: 'center', cursor: 'pointer',
        border: `1.5px dashed ${video ? 'rgba(200,255,61,.5)' : LINEA.marcada}`,
        background: video ? TINTE.dinero : 'transparent',
      }}>
        <div style={{ ...etiqueta, color: video ? COLOR.dinero : COLOR.textoTenue }}>
          {video ? 'Video listo' : 'Elegir video'}
        </div>
        <div style={{ fontFamily: FUENTE.serif, fontStyle: 'italic', fontSize: 16, color: COLOR.textoSuave, marginTop: 9, wordBreak: 'break-all' }}>
          {video ? `${video.name} · ${(video.size / 1048576).toFixed(1)} MB` : 'MP4, MOV o WebM · hasta 2 GB'}
        </div>
      </Pulsable>
      <input ref={refVideo} type="file" accept="video/mp4,video/quicktime,video/webm" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) setVideo(f) }} />

      {/* portada */}
      <div style={{ border: '1px solid rgba(255,255,255,.14)', padding: 13, display: 'flex', flexDirection: 'column', gap: 11 }}>
        <div>
          <div style={etiqueta}>Portada</div>
          <div style={{ font: `400 12px/1.45 ${FUENTE.mono}`, color: COLOR.textoApagado, marginTop: 6 }}>
            {modo === 'gratis'
              ? 'Se ve completa: este clip es gratis.'
              : `Sin pagar se ve borrosa, a ${ANCHO_PUBLICO} px. La nítida se guarda en privado.`}
          </div>
        </div>

        {!video && (
          <div style={{ font: `400 12px/1.45 ${FUENTE.mono}`, color: COLOR.textoTenue }}>
            Elige el video y te enseño los cuadros.
          </div>
        )}
        {video && sacando && (
          <div style={{ font: `400 12px/1.45 ${FUENTE.mono}`, color: COLOR.textoTenue }}>
            Sacando cuadros del video…
          </div>
        )}

        {/* Los cuadros a elegir. Antes la portada la decidia una constante —el
            10% del video— y nadie podia cambiarla. */}
        {cuadros.length > 0 && !portada && (
          <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 2 }}>
            {cuadros.map((c, i) => (
              <Pulsable
                key={c.vista}
                al={() => setElegido(i)}
                activado={elegido === i}
                rotulo={`Usar el cuadro del segundo ${c.segundo.toFixed(1)}`}
                style={{
                  flex: '0 0 auto', width: 54, height: 72, padding: 0, cursor: 'pointer',
                  background: `center/cover url(${c.vista})`,
                  border: `2px solid ${elegido === i ? COLOR.dinero : 'transparent'}`,
                  outlineOffset: 3,
                }}
              ><span style={{
                display: 'block', marginTop: 54, background: 'rgba(8,8,10,.72)',
                font: `400 9px/18px ${FUENTE.mono}`, color: COLOR.texto,
              }}>{c.segundo.toFixed(1)}s</span></Pulsable>
            ))}
          </div>
        )}

        {/* La suya, si la sube, gana sobre cualquier cuadro. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          {suya && <div style={{
            width: 54, height: 72, flex: '0 0 auto',
            background: `center/cover url(${suya})`,
            border: `2px solid ${COLOR.dinero}`,
          }} />}
          <Pulsable al={() => refPortada.current?.click()} style={{
            flex: 1, textAlign: 'left', cursor: 'pointer',
            font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.6, textTransform: 'uppercase',
            color: COLOR.textoSuave, border: `1px solid ${LINEA.media}`, padding: '12px 13px',
          }}>{portada ? 'Cambiar mi imagen' : 'O subir mi propia imagen'}</Pulsable>
          {portada && (
            <Pulsable al={() => setPortada(null)} rotulo="Quitar mi imagen y volver a los cuadros" style={{
              flex: '0 0 auto', padding: '12px 13px', cursor: 'pointer',
              font: `400 15px/1 ${FUENTE.ui}`, color: COLOR.textoTenue,
              border: `1px solid ${LINEA.media}`,
            }}>×</Pulsable>
          )}
        </div>
      </div>
      <input ref={refPortada} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) setPortada(f) }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={etiqueta}>Título</span>
        <input value={titulo} onChange={e => setTitulo(e.target.value)} maxLength={90}
          placeholder="Cómo se llama este clip" style={campo} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={etiqueta}>Descripción</span>
        <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} maxLength={600}
          placeholder="Qué van a ver" style={{ ...campo, resize: 'vertical', fontFamily: FUENTE.ui }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span style={etiqueta}>Cómo se vende</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {MODOS.map(m => (
            <Pulsable key={m.v} al={() => setModo(m.v)} activado={modo === m.v} style={{
              flex: 1, textAlign: 'center', padding: '13px 6px', cursor: 'pointer',
              font: `700 10px/1.3 ${FUENTE.ui}`, letterSpacing: 1.2, textTransform: 'uppercase',
              background: modo === m.v ? COLOR.dinero : 'transparent',
              color: modo === m.v ? COLOR.fondo : COLOR.textoSuave,
              border: `1px solid ${modo === m.v ? COLOR.dinero : LINEA.media}`,
            }}>{m.t}</Pulsable>
          ))}
        </div>
      </div>

      {modo === 'pago' && (
        <div style={{ border: '1px solid rgba(255,255,255,.12)', padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
            <span style={etiqueta}>Precio</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Paso t="−" al={() => setPrecio(p => Math.max(0, p - 50))} />
              <span style={{ fontFamily: FUENTE.display, fontSize: 32, lineHeight: 1, color: COLOR.dinero }}>{usd(precio)}</span>
              <Paso t="+" al={() => setPrecio(p => p + 50)} />
            </div>
          </div>
          <div style={{ font: `400 12px/1.6 ${FUENTE.mono}`, color: COLOR.textoTenue, marginTop: 12, borderTop: '1px solid rgba(255,255,255,.09)', paddingTop: 12 }}>
            plataforma 20% · <span style={{ color: COLOR.texto }}>tú recibes {usd(gana)}</span>
          </div>
        </div>
      )}

      {modo === 'pago' && (
        <div style={{ border: '1px solid rgba(255,255,255,.12)', padding: 16 }}>
          <Pulsable
            al={() => setRenta(v => !v)}
            activado={renta}
            style={{ boxSizing: 'border-box', width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, cursor: 'pointer' }}>
            <div>
              <div style={{ ...etiqueta, color: renta ? COLOR.admin : COLOR.textoTenue }}>También en renta</div>
              <div style={{ font: `400 12px/1.45 ${FUENTE.mono}`, color: COLOR.textoApagado, marginTop: 6 }}>
                Acceso por tiempo, más barato que comprarlo
              </div>
            </div>
            <div style={{
              width: 46, height: 26, borderRadius: 13, flex: '0 0 auto',
              background: renta ? COLOR.admin : COLOR.superficieAlta, position: 'relative', transition: 'background .18s',
            }}>
              <div style={{
                position: 'absolute', top: 3, left: renta ? 23 : 3, width: 20, height: 20,
                borderRadius: '50%', background: renta ? COLOR.fondo : COLOR.textoApagado, transition: 'left .18s',
              }} />
            </div>
          </Pulsable>

          {renta && (
            <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,.09)', paddingTop: 16 }}>
              <div style={{ display: 'flex', gap: 7, marginBottom: 14 }}>
                {([48, 72] as const).map(h => (
                  <Pulsable key={h} al={() => setRentaHoras(h)} activado={rentaHoras === h} style={{
                    flex: 1, textAlign: 'center', padding: '12px 6px', cursor: 'pointer',
                    font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.2, textTransform: 'uppercase',
                    background: rentaHoras === h ? COLOR.admin : 'transparent',
                    color: rentaHoras === h ? COLOR.fondo : COLOR.textoSuave,
                    border: `1px solid ${rentaHoras === h ? COLOR.admin : LINEA.media}`,
                  }}>{h} horas</Pulsable>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
                <span style={etiqueta}>Precio de renta</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Paso t="−" al={() => setRentaCoins(p => Math.max(0, p - 25))} />
                  <span style={{ fontFamily: FUENTE.display, fontSize: 26, lineHeight: 1, color: COLOR.admin }}>{usd(rentaCoins)}</span>
                  <Paso t="+" al={() => setRentaCoins(p => p + 25)} />
                </div>
              </div>
              {rentaCoins >= precio && (
                <div style={{ font: `400 10px/1.6 ${FUENTE.mono}`, color: COLOR.acento, marginTop: 12 }}>
                  Rentar cuesta igual o más que comprarlo. Nadie elegiría la renta.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {estado === 'error' && (
        <div style={{ font: `400 13px/1.45 ${FUENTE.ui}`, color: COLOR.acento }}>{detalle}</div>
      )}

      {estado === 'sin-portada' && (
        <div style={{ border: `1px solid ${COLOR.admin}`, padding: '13px 15px' }}>
          <div style={{ font: `400 13px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
            <b style={{ color: COLOR.texto }}>Tu clip se publicó</b> — el video está
            a salvo. Lo que no se pudo guardar fue la portada: se muestra con el
            patrón generado hasta que la pongas.
          </div>
          <div style={{ font: `400 11px/1.6 ${FUENTE.mono}`, color: COLOR.textoTenue, marginTop: 8 }}>
            {detalle}
          </div>
          {clipNuevo && (
            <Enlace a={`/clip/${clipNuevo}`} style={{
              display: 'block', boxSizing: 'border-box', width: '100%',
              marginTop: 11, textAlign: 'center', padding: '12px 0', cursor: 'pointer',
              background: COLOR.admin, color: COLOR.fondo,
              font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.6, textTransform: 'uppercase',
            }}>Ver mi clip</Enlace>
          )}
        </div>
      )}

      <Pulsable al={publicar} activo={listo} style={{
        boxSizing: 'border-box', width: '100%',
        marginTop: 'auto', background: listo ? COLOR.acento : COLOR.superficieAlta,
        color: listo ? COLOR.fondo : COLOR.textoApagado, textAlign: 'center', padding: 19,
        font: `700 13px/1 ${FUENTE.ui}`, letterSpacing: 2.2, textTransform: 'uppercase',
        boxShadow: listo ? '0 0 34px rgba(255,43,209,.42)' : 'none',
        cursor: listo ? 'pointer' : 'default',
      }}>
        {estado === 'subiendo' ? paso : 'Publicar'}
      </Pulsable>
    </div>
  )
}

function Paso({ t, al }: { t: string; al: () => void }) {
  return (
    <Pulsable al={al} rotulo={t === '+' ? 'Subir' : 'Bajar'} style={{
      width: 38, height: 38, display: 'grid', placeItems: 'center',
      border: '1px solid rgba(255,255,255,.18)', color: COLOR.texto,
      font: `400 19px/1 ${FUENTE.ui}`, cursor: 'pointer',
    }}>{t}</Pulsable>
  )
}

function Centro({ texto, accion }: { texto: string; accion?: { texto: string; al: () => void } }) {
  return (
    <div style={{
      minHeight: '100%', boxSizing: 'border-box', padding: '64px 26px',
      background: COLOR.fondo, color: COLOR.textoSuave, fontFamily: FUENTE.serif, fontStyle: 'italic',
      fontSize: 19, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 20, textAlign: 'center',
    }}>
      {texto}
      {accion && (
        <Pulsable al={accion.al} style={{
          background: COLOR.acento, color: COLOR.fondo, padding: '15px 26px',
          font: `700 12px/1 ${FUENTE.ui}`, letterSpacing: 2.2, textTransform: 'uppercase',
          fontStyle: 'normal', cursor: 'pointer',
        }}>{accion.texto}</Pulsable>
      )}
      <MisClips />
    </div>
  )
}
