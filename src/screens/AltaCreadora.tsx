// Pantalla 20 — Alta de creadora por administración
//
// Para creadoras que firmaron papeles fuera de la app y no se van a registrar
// solas: el material ya está grabado. Sin esto, ese contenido no tiene dónde
// vivir sin quedar sin dueño ni constancia.
//
// El perfil nace SIN verificar. Se verifica solo cuando los documentos están
// cargados, y eso lo decide un trigger en la base: aquí no hay forma de
// saltárselo.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSesion } from '../lib/sesion'
import { usePapel } from '../components/Navegacion'
import { altaCreadora, subirExpediente, publicarPara } from '../lib/admin'
import Wordmark from '../components/Wordmark'

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

type Paso = 'datos' | 'documentos' | 'clips' | 'listo'

export default function AltaCreadora() {
  const nav = useNavigate()
  const { cargando } = useSesion()
  const { papel } = usePapel()

  const [paso, setPaso] = useState<Paso>('datos')
  const [creadora, setCreadora] = useState<{ id: string; handle: string } | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')

  // paso 1
  const [handle, setHandle] = useState('')
  const [nombre, setNombre] = useState('')
  const [bio, setBio] = useState('')
  const [nota, setNota] = useState('')
  // paso 2
  const [ident, setIdent] = useState<File | null>(null)
  const [consent, setConsent] = useState<File | null>(null)
  const [fechaConsent, setFechaConsent] = useState('')
  // paso 3
  const [titulo, setTitulo] = useState('')
  const [video, setVideo] = useState<File | null>(null)
  const [portada, setPortada] = useState<File | null>(null)
  const [precio, setPrecio] = useState(240)
  const [publicados, setPublicados] = useState(0)
  const [subiendo, setSubiendo] = useState('')

  if (cargando) return <Centro texto="Cargando…" />
  if (papel !== 'admin') return (
    <Centro texto="Esta sección es solo para administradores."
      accion={{ texto: 'Volver', al: () => nav('/entrar') }} />
  )

  const handleOk = /^[a-z0-9_]{3,24}$/.test(handle)

  const crear = async () => {
    if (!handleOk || !nombre.trim() || ocupado) return
    setOcupado(true); setError('')
    const r = await altaCreadora({ handle, nombre, bio, nota })
    setOcupado(false)
    if ('error' in r) { setError(r.error); return }
    setCreadora({ id: r.id, handle: r.handle })
    setPaso('documentos')
  }

  const cargarDocs = async () => {
    if (!creadora || !ident || !consent || ocupado) return
    setOcupado(true); setError('')
    const r = await subirExpediente(creadora.id, ident, consent, fechaConsent || undefined)
    setOcupado(false)
    if ('error' in r) { setError(r.error); return }
    if (!r.verificada) { setError('Los documentos se cargaron pero el perfil no quedó verificado.'); return }
    setPaso('clips')
  }

  const publicar = async () => {
    if (!creadora || !video || !titulo.trim() || ocupado) return
    setOcupado(true); setError(''); setSubiendo('Subiendo el video…')
    const r = await publicarPara({
      creadora: creadora.id, titulo, video, portada,
      precio, visibilidad: 'pago',
    })
    setOcupado(false); setSubiendo('')
    if ('error' in r) { setError(r.error); return }
    setPublicados(n => n + 1)
    setTitulo(''); setVideo(null); setPortada(null)
  }

  return (
    <div style={{
      minHeight: '100%', boxSizing: 'border-box', padding: '48px 22px 40px',
      background: '#08080A', color: '#F2F0F3', fontFamily: UI,
      display: 'flex', flexDirection: 'column', gap: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Wordmark ancho={110} glow={12} />
        <span onClick={() => nav('/admin')} style={{ font: `400 26px/1 ${UI}`, color: '#9C979F', cursor: 'pointer' }}>×</span>
      </div>

      <div>
        <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 36, lineHeight: 1, textTransform: 'uppercase' }}>
          Alta de<br /><span style={{ color: '#C8FF3D' }}>creadora</span>
        </div>
        <div style={{ font: `400 11px/1.6 ${MONO}`, color: '#5E5A63', marginTop: 8 }}>
          {['datos', 'documentos', 'clips'].map((p, i) =>
            `${i + 1}. ${p}${paso === p ? '  ←' : ''}`).join('   ')}
        </div>
      </div>

      {error && <div style={{ font: `400 13px/1.5 ${UI}`, color: '#FF2BD1' }}>{error}</div>}

      {paso === 'datos' && (
        <>
          <Etiquetado t="Nombre artístico">
            <input value={nombre} onChange={e => setNombre(e.target.value)} maxLength={40}
              placeholder="Como la va a ver la gente" style={campo} />
          </Etiquetado>
          <Etiquetado t="Usuario" pista={handle && !handleOk ? 'Entre 3 y 24: letras, números y guion bajo' : 'Será su @'}>
            <input value={handle} maxLength={24}
              onChange={e => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="sin_espacios" style={campo} />
          </Etiquetado>
          <Etiquetado t="Sobre ella">
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={2} maxLength={300}
              style={{ ...campo, resize: 'vertical', fontFamily: UI }} />
          </Etiquetado>
          <Etiquetado t="Nota interna" pista="Solo tú la ves. Útil para recordar de dónde salió el acuerdo.">
            <input value={nota} onChange={e => setNota(e.target.value)} maxLength={200}
              placeholder="Firmó contrato en marzo" style={campo} />
          </Etiquetado>
          <Boton texto={ocupado ? 'Creando…' : 'Crear perfil'} activo={handleOk && !!nombre.trim() && !ocupado} al={crear} />
        </>
      )}

      {paso === 'documentos' && creadora && (
        <>
          <div style={{
            border: '1.5px dashed rgba(255,43,209,.45)', background: 'rgba(255,43,209,.06)',
            padding: '15px 14px',
          }}>
            <div style={{ ...etiqueta, color: '#FF2BD1' }}>@{creadora.handle} no puede publicar todavía</div>
            <div style={{ font: `400 13px/1.6 ${UI}`, color: '#F2F0F3', marginTop: 8 }}>
              Falta cargar su identificación y su consentimiento firmado. La base
              rechaza cualquier publicación hasta que ambos estén.
            </div>
          </div>

          <Archivo t="Identificación oficial" f={ident} onElegir={setIdent}
            acepta="image/*,application/pdf" nota="INE, pasaporte o cédula" />
          <Archivo t="Consentimiento firmado" f={consent} onElegir={setConsent}
            acepta="image/*,application/pdf" nota="El documento que ella firmó" />

          <Etiquetado t="Fecha del consentimiento" pista="Puede ser muy anterior a hoy.">
            <input type="date" value={fechaConsent} max={new Date().toISOString().slice(0, 10)}
              onChange={e => setFechaConsent(e.target.value)}
              style={{ ...campo, colorScheme: 'dark' }} />
          </Etiquetado>

          <Boton texto={ocupado ? 'Subiendo…' : 'Cargar expediente'}
            activo={!!ident && !!consent && !ocupado} al={cargarDocs} />
        </>
      )}

      {paso === 'clips' && creadora && (
        <>
          <div style={{
            border: '1px solid rgba(200,255,61,.4)', background: 'rgba(200,255,61,.05)',
            padding: '14px 13px',
          }}>
            <div style={{ ...etiqueta, color: '#C8FF3D' }}>
              @{creadora.handle} verificada · {publicados} {publicados === 1 ? 'clip publicado' : 'clips publicados'}
            </div>
          </div>

          <Etiquetado t="Título del clip">
            <input value={titulo} onChange={e => setTitulo(e.target.value)} maxLength={90} style={campo} />
          </Etiquetado>
          <Archivo t="Video" f={video} onElegir={setVideo}
            acepta="video/mp4,video/quicktime,video/webm" nota="MP4, MOV o WebM" />
          <Archivo t="Portada" f={portada} onElegir={setPortada}
            acepta="image/*" nota="Lo único que se ve sin pagar. Si no pones, se genera una." />

          <Etiquetado t="Precio en coins">
            <input type="number" value={precio} min={0} step={20}
              onChange={e => setPrecio(Math.max(0, parseInt(e.target.value || '0', 10)))}
              style={{ ...campo, fontFamily: MONO }} />
          </Etiquetado>

          <Boton texto={subiendo || (ocupado ? 'Publicando…' : 'Publicar clip')}
            activo={!!video && !!titulo.trim() && !ocupado} al={publicar} />

          <div onClick={() => nav(`/creator/${creadora.handle}`)} style={{
            border: '1px solid rgba(255,255,255,.16)', color: '#9C979F', textAlign: 'center',
            padding: 16, font: `700 11px/1 ${UI}`, letterSpacing: 2,
            textTransform: 'uppercase', cursor: 'pointer',
          }}>Ver su perfil</div>
        </>
      )}
    </div>
  )
}

function Etiquetado({ t, pista, children }: { t: string; pista?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={etiqueta}>{t}</span>
      {children}
      {pista && <span style={{ font: `400 11px/1.5 ${MONO}`, color: '#5E5A63' }}>{pista}</span>}
    </div>
  )
}

function Archivo({ t, f, onElegir, acepta, nota }: {
  t: string; f: File | null; onElegir: (f: File) => void; acepta: string; nota: string
}) {
  const id = 'f_' + t.replace(/\s/g, '')
  return (
    <>
      <label htmlFor={id} style={{
        display: 'flex', alignItems: 'center', gap: 13, cursor: 'pointer',
        border: `1px ${f ? 'solid' : 'dashed'} rgba(255,255,255,${f ? '.2' : '.16'})`,
        background: f ? 'rgba(200,255,61,.05)' : 'transparent', padding: 14,
      }}>
        <div style={{
          width: 46, height: 46, flex: '0 0 auto',
          background: 'repeating-linear-gradient(130deg,#191920 0 8px,#111116 8px 16px)',
        }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ ...etiqueta, color: f ? '#C8FF3D' : '#6E6A72' }}>{f ? `${t} · listo` : t}</div>
          <div style={{ font: `400 11.5px/1.5 ${MONO}`, color: '#5E5A63', marginTop: 6, wordBreak: 'break-all' }}>
            {f ? `${f.name} · ${(f.size / 1048576).toFixed(1)} MB` : nota}
          </div>
        </div>
      </label>
      <input id={id} type="file" accept={acepta} style={{ display: 'none' }}
        onChange={e => { const x = e.target.files?.[0]; if (x) onElegir(x) }} />
    </>
  )
}

function Boton({ texto, activo, al }: { texto: string; activo: boolean; al: () => void }) {
  return (
    <div onClick={() => { if (activo) al() }} style={{
      background: activo ? '#FF2BD1' : '#191920', color: activo ? '#08080A' : '#5E5A63',
      textAlign: 'center', padding: 18, marginTop: 4,
      font: `700 13px/1 ${UI}`, letterSpacing: 2.2, textTransform: 'uppercase',
      boxShadow: activo ? '0 0 34px rgba(255,43,209,.42)' : 'none',
      cursor: activo ? 'pointer' : 'default',
    }}>{texto}</div>
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
