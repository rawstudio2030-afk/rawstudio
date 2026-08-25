// Pantalla 05 — Subir clip
// Reescrita: antes era el mock del deck con "hotel_bar_take04.mov" escrito a
// mano. Ahora sube de verdad al bucket privado y crea la fila en la base.
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSesion } from '../lib/sesion'
import { subirArchivo, crearClip, type Visibilidad } from '../lib/clips'
import { miniaturaDeVideo } from '../lib/miniatura'
import { COLOR, LINEA, TINTE, FUENTE } from '../lib/diseño'
import MisClips from '../components/MisClips'


const etiqueta: React.CSSProperties = {
  font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 2.2, textTransform: 'uppercase', color: COLOR.textoTenue,
}
const campo: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', background: COLOR.superficie,
  border: '1px solid rgba(255,255,255,.14)', color: COLOR.texto,
  font: `400 16px/1.35 ${FUENTE.ui}`, padding: '15px', outline: 'none',
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
  const [titulo, setTitulo] = useState('')
  const [desc, setDesc] = useState('')
  const [modo, setModo] = useState<Visibilidad>('pago')
  const [precio, setPrecio] = useState(240)
  const [renta, setRenta] = useState(false)
  const [rentaHoras, setRentaHoras] = useState<48 | 72>(48)
  const [rentaCoins, setRentaCoins] = useState(80)
  const [estado, setEstado] = useState<'listo' | 'subiendo' | 'error'>('listo')
  const [detalle, setDetalle] = useState('')
  const [paso, setPaso] = useState('')

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
  if (!perfil.identidad_verificada) return (
    <Centro
      texto="Antes de publicar necesitamos comprobar que eres mayor de edad. Es una sola vez."
      accion={{ texto: 'Verificar identidad', al: () => nav('/verificar') }}
    />
  )

  const listo = !!video && titulo.trim().length > 0 && estado !== 'subiendo'
  const gana = modo === 'pago' ? Math.round(precio * 0.8) : 0

  const publicar = async () => {
    if (!listo || !video || !sesion) return
    setEstado('subiendo'); setDetalle('')

    // Se saca el cuadro ANTES de subir el video: el archivo ya esta aqui, y
    // si se hiciera despues habria que esperar toda la subida para descubrir
    // que el formato no se puede decodificar.
    let imagen = portada
    if (!imagen) {
      setPaso('Sacando la portada del video…')
      imagen = await miniaturaDeVideo(video)
    }

    setPaso('Subiendo el video…')
    const v = await subirArchivo('clips', sesion.user.id, video)
    if (v.error) { setEstado('error'); setDetalle(v.error); return }

    let coverPath: string | null = null
    if (imagen) {
      setPaso('Subiendo la portada…')
      const c = await subirArchivo('clip-covers', sesion.user.id, imagen)
      // Que falle la portada NO tumba la publicacion: sin ella el clip se
      // muestra con el patron generado, y perder el video subido por una
      // imagen seria mucho peor.
      coverPath = c.error ? null : (c.path ?? null)
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
      published: true,
    })
    if (r.error) { setEstado('error'); setDetalle(r.error); return }
    nav(`/clip/${r.id}`)
  }

  return (
    <div style={{
      minHeight: '100%', boxSizing: 'border-box', padding: '54px 22px 40px',
      background: COLOR.fondo, color: COLOR.texto, fontFamily: FUENTE.ui,
      display: 'flex', flexDirection: 'column', gap: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span onClick={() => nav(-1)} style={{ font: `400 26px/1 ${FUENTE.ui}`, color: COLOR.textoSuave, cursor: 'pointer' }}>‹</span>
        <span style={{ ...etiqueta, color: COLOR.dinero }}>Nuevo clip</span>
        <span style={{ width: 14 }} />
      </div>

      {/* video */}
      <div onClick={() => refVideo.current?.click()} style={{
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
      </div>
      <input ref={refVideo} type="file" accept="video/mp4,video/quicktime,video/webm" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) setVideo(f) }} />

      {/* portada */}
      <div onClick={() => refPortada.current?.click()} style={{
        display: 'flex', alignItems: 'center', gap: 13, cursor: 'pointer',
        border: '1px solid rgba(255,255,255,.14)', padding: 13,
      }}>
        <div style={{
          width: 54, height: 72, flex: '0 0 auto',
          background: portada ? `center/cover url(${URL.createObjectURL(portada)})`
                              : `repeating-linear-gradient(130deg,${COLOR.superficieAlta} 0 8px,${COLOR.superficie} 8px 16px)`,
        }} />
        <div>
          <div style={etiqueta}>{portada ? 'Cambiar portada' : 'Portada'}</div>
          <div style={{ font: `400 12px/1.5 ${FUENTE.mono}`, color: COLOR.textoApagado, marginTop: 6 }}>
            Es lo único que se ve sin pagar
          </div>
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
            <span key={m.v} onClick={() => setModo(m.v)} style={{
              flex: 1, textAlign: 'center', padding: '13px 6px', cursor: 'pointer',
              font: `700 10px/1.2 ${FUENTE.ui}`, letterSpacing: 1.2, textTransform: 'uppercase',
              background: modo === m.v ? COLOR.dinero : 'transparent',
              color: modo === m.v ? COLOR.fondo : COLOR.textoSuave,
              border: `1px solid ${modo === m.v ? COLOR.dinero : LINEA.media}`,
            }}>{m.t}</span>
          ))}
        </div>
      </div>

      {modo === 'pago' && (
        <div style={{ border: '1px solid rgba(255,255,255,.12)', padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
            <span style={etiqueta}>Precio</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Paso t="−" al={() => setPrecio(p => Math.max(0, p - 20))} />
              <span style={{ fontFamily: FUENTE.display, fontSize: 30, lineHeight: 1, color: COLOR.dinero }}>{precio}</span>
              <Paso t="+" al={() => setPrecio(p => p + 20)} />
            </div>
          </div>
          <div style={{ font: `400 12px/1.7 ${FUENTE.mono}`, color: COLOR.textoTenue, marginTop: 12, borderTop: '1px solid rgba(255,255,255,.09)', paddingTop: 12 }}>
            plataforma 20% · <span style={{ color: COLOR.texto }}>tú recibes {gana} coins</span>
          </div>
        </div>
      )}

      {modo === 'pago' && (
        <div style={{ border: '1px solid rgba(255,255,255,.12)', padding: 16 }}>
          <div
            onClick={() => setRenta(v => !v)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, cursor: 'pointer' }}>
            <div>
              <div style={{ ...etiqueta, color: renta ? COLOR.admin : COLOR.textoTenue }}>También en renta</div>
              <div style={{ font: `400 12px/1.5 ${FUENTE.mono}`, color: COLOR.textoApagado, marginTop: 6 }}>
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
          </div>

          {renta && (
            <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,.09)', paddingTop: 16 }}>
              <div style={{ display: 'flex', gap: 7, marginBottom: 14 }}>
                {([48, 72] as const).map(h => (
                  <span key={h} onClick={() => setRentaHoras(h)} style={{
                    flex: 1, textAlign: 'center', padding: '12px 6px', cursor: 'pointer',
                    font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 1.4, textTransform: 'uppercase',
                    background: rentaHoras === h ? COLOR.admin : 'transparent',
                    color: rentaHoras === h ? COLOR.fondo : COLOR.textoSuave,
                    border: `1px solid ${rentaHoras === h ? COLOR.admin : LINEA.media}`,
                  }}>{h} horas</span>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
                <span style={etiqueta}>Precio de renta</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Paso t="−" al={() => setRentaCoins(p => Math.max(0, p - 10))} />
                  <span style={{ fontFamily: FUENTE.display, fontSize: 26, lineHeight: 1, color: COLOR.admin }}>{rentaCoins}</span>
                  <Paso t="+" al={() => setRentaCoins(p => p + 10)} />
                </div>
              </div>
              {rentaCoins >= precio && (
                <div style={{ font: `400 11px/1.6 ${FUENTE.mono}`, color: COLOR.acento, marginTop: 12 }}>
                  Rentar cuesta igual o más que comprarlo. Nadie elegiría la renta.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {estado === 'error' && (
        <div style={{ font: `400 13px/1.5 ${FUENTE.ui}`, color: COLOR.acento }}>{detalle}</div>
      )}

      <div onClick={publicar} style={{
        marginTop: 'auto', background: listo ? COLOR.acento : COLOR.superficieAlta,
        color: listo ? COLOR.fondo : COLOR.textoApagado, textAlign: 'center', padding: 19,
        font: `700 13px/1 ${FUENTE.ui}`, letterSpacing: 2.2, textTransform: 'uppercase',
        boxShadow: listo ? '0 0 34px rgba(255,43,209,.42)' : 'none',
        cursor: listo ? 'pointer' : 'default',
      }}>
        {estado === 'subiendo' ? paso : 'Publicar'}
      </div>
    </div>
  )
}

function Paso({ t, al }: { t: string; al: () => void }) {
  return (
    <span onClick={al} style={{
      width: 38, height: 38, display: 'grid', placeItems: 'center',
      border: '1px solid rgba(255,255,255,.18)', color: COLOR.texto,
      font: `400 18px/1 ${FUENTE.ui}`, cursor: 'pointer',
    }}>{t}</span>
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
      <MisClips />
    </div>
  )
}
