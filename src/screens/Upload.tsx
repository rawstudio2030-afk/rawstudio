// Pantalla 05 — Subir clip
// Reescrita: antes era el mock del deck con "hotel_bar_take04.mov" escrito a
// mano. Ahora sube de verdad al bucket privado y crea la fila en la base.
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSesion } from '../lib/sesion'
import { subirArchivo, crearClip, type Visibilidad } from '../lib/clips'

const UI = "'Space Grotesk', system-ui, sans-serif"
const MONO = "'Space Mono', monospace"
const SERIF = "'Instrument Serif', serif"

const etiqueta: React.CSSProperties = {
  font: `700 10px/1 ${UI}`, letterSpacing: 2.2, textTransform: 'uppercase', color: '#6E6A72',
}
const campo: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', background: '#111116',
  border: '1px solid rgba(255,255,255,.14)', color: '#F2F0F3',
  font: `400 16px/1.35 ${UI}`, padding: '15px', outline: 'none',
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

  const listo = !!video && titulo.trim().length > 0 && estado !== 'subiendo'
  const gana = modo === 'pago' ? Math.round(precio * 0.8) : 0

  const publicar = async () => {
    if (!listo || !video || !sesion) return
    setEstado('subiendo'); setDetalle('')

    setPaso('Subiendo el video…')
    const v = await subirArchivo('clips', sesion.user.id, video)
    if (v.error) { setEstado('error'); setDetalle(v.error); return }

    let coverPath: string | null = null
    if (portada) {
      setPaso('Subiendo la portada…')
      const c = await subirArchivo('clip-covers', sesion.user.id, portada)
      if (c.error) { setEstado('error'); setDetalle(c.error); return }
      coverPath = c.path ?? null
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
      published: true,
    })
    if (r.error) { setEstado('error'); setDetalle(r.error); return }
    nav(`/clip/${r.id}`)
  }

  return (
    <div style={{
      minHeight: '100%', boxSizing: 'border-box', padding: '54px 22px 40px',
      background: '#08080A', color: '#F2F0F3', fontFamily: UI,
      display: 'flex', flexDirection: 'column', gap: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span onClick={() => nav(-1)} style={{ font: `400 26px/1 ${UI}`, color: '#9C979F', cursor: 'pointer' }}>‹</span>
        <span style={{ ...etiqueta, color: '#C8FF3D' }}>Nuevo clip</span>
        <span style={{ width: 14 }} />
      </div>

      {/* video */}
      <div onClick={() => refVideo.current?.click()} style={{
        padding: '26px 18px', textAlign: 'center', cursor: 'pointer',
        border: `1.5px dashed ${video ? 'rgba(200,255,61,.5)' : 'rgba(255,255,255,.18)'}`,
        background: video ? 'rgba(200,255,61,.05)' : 'transparent',
      }}>
        <div style={{ ...etiqueta, color: video ? '#C8FF3D' : '#6E6A72' }}>
          {video ? 'Video listo' : 'Elegir video'}
        </div>
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 16, color: '#9C979F', marginTop: 9, wordBreak: 'break-all' }}>
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
                              : 'repeating-linear-gradient(130deg,#191920 0 8px,#111116 8px 16px)',
        }} />
        <div>
          <div style={etiqueta}>{portada ? 'Cambiar portada' : 'Portada'}</div>
          <div style={{ font: `400 12px/1.5 ${MONO}`, color: '#5E5A63', marginTop: 6 }}>
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
          placeholder="Qué van a ver" style={{ ...campo, resize: 'vertical', fontFamily: UI }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span style={etiqueta}>Cómo se vende</span>
        <div style={{ display: 'flex', gap: 6 }}>
          {MODOS.map(m => (
            <span key={m.v} onClick={() => setModo(m.v)} style={{
              flex: 1, textAlign: 'center', padding: '13px 6px', cursor: 'pointer',
              font: `700 10px/1.2 ${UI}`, letterSpacing: 1.2, textTransform: 'uppercase',
              background: modo === m.v ? '#C8FF3D' : 'transparent',
              color: modo === m.v ? '#08080A' : '#9C979F',
              border: `1px solid ${modo === m.v ? '#C8FF3D' : 'rgba(255,255,255,.14)'}`,
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
              <span style={{ fontFamily: 'Anton, sans-serif', fontSize: 30, lineHeight: 1, color: '#C8FF3D' }}>{precio}</span>
              <Paso t="+" al={() => setPrecio(p => p + 20)} />
            </div>
          </div>
          <div style={{ font: `400 12px/1.7 ${MONO}`, color: '#6E6A72', marginTop: 12, borderTop: '1px solid rgba(255,255,255,.09)', paddingTop: 12 }}>
            plataforma 20% · <span style={{ color: '#F2F0F3' }}>tú recibes {gana} coins</span>
          </div>
        </div>
      )}

      {estado === 'error' && (
        <div style={{ font: `400 13px/1.5 ${UI}`, color: '#FF2BD1' }}>{detalle}</div>
      )}

      <div onClick={publicar} style={{
        marginTop: 'auto', background: listo ? '#FF2BD1' : '#191920',
        color: listo ? '#08080A' : '#5E5A63', textAlign: 'center', padding: 19,
        font: `700 13px/1 ${UI}`, letterSpacing: 2.2, textTransform: 'uppercase',
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
      border: '1px solid rgba(255,255,255,.18)', color: '#F2F0F3',
      font: `400 18px/1 ${UI}`, cursor: 'pointer',
    }}>{t}</span>
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
