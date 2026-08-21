// Pantalla 13 — Mi perfil
// Edicion del propio perfil. Es la pieza que le da dueño a todo lo demas:
// sin un perfil real, ningun clip, compra ni mensaje tiene a quien colgarse.
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSesion } from '../lib/sesion'
import { urlAvatar } from '../lib/perfiles'

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

export default function Perfil() {
  const nav = useNavigate()
  const { sesion, perfil, cargando, refrescarPerfil, salir } = useSesion()
  const archivo = useRef<HTMLInputElement>(null)

  const [handle, setHandle] = useState('')
  const [nombre, setNombre] = useState('')
  const [bio, setBio] = useState('')
  const [creadora, setCreadora] = useState(false)
  const [estado, setEstado] = useState<'listo' | 'guardando' | 'guardado' | 'error'>('listo')
  const [detalle, setDetalle] = useState('')
  const [subiendo, setSubiendo] = useState(false)

  useEffect(() => {
    if (!perfil) return
    setHandle(perfil.handle)
    setNombre(perfil.display_name)
    setBio(perfil.bio ?? '')
    setCreadora(perfil.is_creator)
  }, [perfil])

  if (cargando) return <Aviso texto="Cargando…" />
  if (!sesion) return (
    <Aviso
      texto="Necesitas entrar para ver tu perfil."
      accion={{ texto: 'Entrar', al: () => nav('/acceso') }}
    />
  )

  const handleOk = /^[a-z0-9_]{3,24}$/.test(handle)
  const nombreOk = nombre.trim().length >= 1 && nombre.trim().length <= 40
  const bioOk = bio.length <= 300
  const puedeGuardar = handleOk && nombreOk && bioOk && estado !== 'guardando'

  const guardar = async () => {
    if (!puedeGuardar || !sesion) return
    setEstado('guardando')
    const { error } = await supabase.from('profiles').update({
      handle: handle.trim().toLowerCase(),
      display_name: nombre.trim(),
      bio: bio.trim() || null,
      is_creator: creadora,
    }).eq('id', sesion.user.id)

    if (error) {
      setEstado('error')
      // 23505 es violacion de unicidad; el unico campo unico aqui es el handle.
      setDetalle(error.code === '23505'
        ? 'Ese nombre de usuario ya está tomado. Prueba otro.'
        : error.message)
      return
    }
    await refrescarPerfil()
    setEstado('guardado')
    setTimeout(() => setEstado('listo'), 2200)
  }

  const subirFoto = async (f: File) => {
    if (!sesion) return
    setSubiendo(true)
    // La ruta DEBE empezar con el id: las politicas de storage se apoyan en eso
    // para que nadie escriba en la carpeta de otro.
    const ext = (f.name.split('.').pop() || 'jpg').toLowerCase()
    const ruta = `${sesion.user.id}/avatar.${ext}`
    const { error } = await supabase.storage.from('avatars')
      .upload(ruta, f, { upsert: true, contentType: f.type })
    if (error) {
      setEstado('error'); setDetalle(error.message); setSubiendo(false); return
    }
    await supabase.from('profiles').update({ avatar_path: ruta }).eq('id', sesion.user.id)
    await refrescarPerfil()
    setSubiendo(false)
  }

  const foto = perfil?.avatar_path ? urlAvatar(perfil.avatar_path) : null

  return (
    <div style={{
      minHeight: '100%', boxSizing: 'border-box', padding: '54px 24px 44px',
      background: '#08080A', color: '#F2F0F3', fontFamily: UI,
      display: 'flex', flexDirection: 'column', gap: 22,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span onClick={() => nav(-1)} style={{ font: `400 26px/1 ${UI}`, color: '#9C979F', cursor: 'pointer' }}>‹</span>
        <span style={{ ...etiqueta, color: '#C8FF3D' }}>Mi perfil</span>
        <span onClick={async () => { await salir(); nav('/entrar') }}
          style={{ font: `700 10px/1 ${UI}`, letterSpacing: 1.6, textTransform: 'uppercase', color: '#6E6A72', cursor: 'pointer' }}>
          Salir
        </span>
      </div>

      {/* foto */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div
          onClick={() => archivo.current?.click()}
          style={{
            width: 82, height: 82, borderRadius: '50%', flex: '0 0 auto', cursor: 'pointer',
            border: '2px solid #FF2BD1', overflow: 'hidden',
            background: foto ? `center/cover url(${foto})` : 'repeating-linear-gradient(130deg,#191920 0 8px,#111116 8px 16px)',
            display: 'grid', placeItems: 'center',
          }}>
          {!foto && <span style={{ ...etiqueta, color: '#5E5A63' }}>Foto</span>}
        </div>
        <div style={{ minWidth: 0 }}>
          <div onClick={() => archivo.current?.click()} style={{
            display: 'inline-block', border: '1px solid rgba(255,255,255,.16)', color: '#9C979F',
            padding: '10px 13px', font: `700 10px/1 ${UI}`, letterSpacing: 1.8,
            textTransform: 'uppercase', cursor: 'pointer',
          }}>
            {subiendo ? 'Subiendo…' : foto ? 'Cambiar foto' : 'Subir foto'}
          </div>
          <div style={{ font: `400 11px/1.5 ${MONO}`, color: '#5E5A63', marginTop: 8 }}>
            JPG, PNG o WebP · máximo 2 MB
          </div>
        </div>
        <input
          ref={archivo} type="file" accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) subirFoto(f) }}
        />
      </div>

      {/* nombre artistico */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={etiqueta}>Nombre artístico</span>
        <input value={nombre} onChange={e => setNombre(e.target.value)}
          placeholder="Como quieres que te vean" maxLength={40} style={campo} />
        <span style={{ font: `400 11px/1.5 ${MONO}`, color: '#5E5A63' }}>
          Es lo único visible. Tu nombre legal no aparece en ninguna pantalla.
        </span>
      </div>

      {/* usuario */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={etiqueta}>Usuario</span>
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)',
            font: `400 16px/1 ${UI}`, color: '#6E6A72',
          }}>@</span>
          <input value={handle} maxLength={24}
            onChange={e => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            placeholder="tu_usuario" style={{ ...campo, paddingLeft: 32 }} />
        </div>
        <span style={{ font: `400 11px/1.5 ${MONO}`, color: handleOk || !handle ? '#5E5A63' : '#FF2BD1' }}>
          {handleOk || !handle
            ? 'Entre 3 y 24 caracteres: letras, números y guion bajo.'
            : 'Necesita entre 3 y 24 caracteres.'}
        </span>
      </div>

      {/* bio */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={etiqueta}>Sobre ti</span>
        <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} maxLength={300}
          placeholder="Una o dos líneas sobre lo que haces."
          style={{ ...campo, resize: 'vertical', fontFamily: UI }} />
        <span style={{ font: `400 11px/1.5 ${MONO}`, color: '#5E5A63' }}>{bio.length}/300</span>
      </div>

      {/* creadora */}
      <div
        onClick={() => setCreadora(c => !c)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14,
          padding: '16px 15px', cursor: 'pointer',
          border: `1px ${creadora ? 'solid' : 'dashed'} rgba(200,255,61,${creadora ? .5 : .3})`,
          background: creadora ? 'rgba(200,255,61,.07)' : 'transparent',
        }}>
        <div>
          <div style={{ font: `700 12px/1.3 ${UI}`, letterSpacing: 1.2, textTransform: 'uppercase', color: creadora ? '#C8FF3D' : '#9C979F' }}>
            Quiero publicar
          </div>
          <div style={{ font: `400 12px/1.5 ${MONO}`, color: '#5E5A63', marginTop: 5 }}>
            Habilita tu perfil de creadora
          </div>
        </div>
        <div style={{
          width: 46, height: 26, borderRadius: 13, flex: '0 0 auto',
          background: creadora ? '#C8FF3D' : '#191920', position: 'relative',
          transition: 'background .18s',
        }}>
          <div style={{
            position: 'absolute', top: 3, left: creadora ? 23 : 3,
            width: 20, height: 20, borderRadius: '50%',
            background: creadora ? '#08080A' : '#5E5A63', transition: 'left .18s',
          }} />
        </div>
      </div>

      {estado === 'error' && (
        <div style={{ font: `400 13px/1.5 ${UI}`, color: '#FF2BD1' }}>{detalle}</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'auto', paddingTop: 12 }}>
        <div onClick={guardar} style={{
          background: puedeGuardar ? '#FF2BD1' : '#191920',
          color: puedeGuardar ? '#08080A' : '#5E5A63',
          textAlign: 'center', padding: 19,
          font: `700 13px/1 ${UI}`, letterSpacing: 2.2, textTransform: 'uppercase',
          boxShadow: puedeGuardar ? '0 0 34px rgba(255,43,209,.42)' : 'none',
          cursor: puedeGuardar ? 'pointer' : 'default',
        }}>
          {estado === 'guardando' ? 'Guardando…' : estado === 'guardado' ? '✓ Guardado' : 'Guardar cambios'}
        </div>
        {perfil && (
          <div onClick={() => nav(`/creator/${perfil.handle}`)} style={{
            border: '1px solid rgba(255,255,255,.16)', color: '#9C979F', textAlign: 'center',
            padding: 18, font: `700 12px/1 ${UI}`, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer',
          }}>
            Ver cómo se ve
          </div>
        )}
      </div>
    </div>
  )
}

function Aviso({ texto, accion }: { texto: string; accion?: { texto: string; al: () => void } }) {
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
