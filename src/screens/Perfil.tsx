// Pantalla 13 — Mi perfil
// Edicion del propio perfil. Es la pieza que le da dueño a todo lo demas:
// sin un perfil real, ningun clip, compra ni mensaje tiene a quien colgarse.
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSesion } from '../lib/sesion'
import { subirAvatar, urlAvatar } from '../lib/perfiles'
import PaisesBloqueados from '../components/PaisesBloqueados'
import { usePapel } from '../components/Navegacion'
import { ATAJOS_PERFIL, visiblesPara } from '../lib/rutas'
import { COLOR, FUENTE } from '../lib/diseño'


const etiqueta: React.CSSProperties = {
  font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 2.2, textTransform: 'uppercase', color: COLOR.textoTenue,
}
const campo: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', background: COLOR.superficie,
  border: '1px solid rgba(255,255,255,.14)', color: COLOR.texto,
  font: `400 16px/1.35 ${FUENTE.ui}`, padding: '15px', outline: 'none',
}

export default function Perfil() {
  const nav = useNavigate()
  const { sesion, perfil, cargando, refrescarPerfil, salir } = useSesion()
  const archivo = useRef<HTMLInputElement>(null)
  const { papel } = usePapel()

  const [handle, setHandle] = useState('')
  const [nombre, setNombre] = useState('')
  const [bio, setBio] = useState('')
  const [creadora, setCreadora] = useState(false)
  const [paises, setPaises] = useState<string[]>([])
  const [estado, setEstado] = useState<'listo' | 'guardando' | 'guardado' | 'error'>('listo')
  const [detalle, setDetalle] = useState('')
  const [subiendo, setSubiendo] = useState(false)

  useEffect(() => {
    if (!perfil) return
    setHandle(perfil.handle)
    setNombre(perfil.display_name)
    setBio(perfil.bio ?? '')
    setCreadora(perfil.is_creator)
    setPaises(perfil.paises_bloqueados ?? [])
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
      paises_bloqueados: paises,
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
    // La ruta empieza con el id porque las politicas de storage se apoyan en
    // eso, y lleva un identificador nuevo en cada subida para que la URL
    // publica cambie: con la ruta fija, la foto vieja se quedaba cacheada.
    const r = await subirAvatar(sesion.user.id, f, perfil?.avatar_path)
    if ('error' in r) {
      setEstado('error'); setDetalle(r.error!); setSubiendo(false); return
    }
    await supabase.from('profiles').update({ avatar_path: r.ruta }).eq('id', sesion.user.id)
    await refrescarPerfil()
    setSubiendo(false)
  }

  const foto = perfil?.avatar_path ? urlAvatar(perfil.avatar_path) : null

  return (
    <div style={{
      minHeight: '100%', boxSizing: 'border-box', padding: '54px 24px 44px',
      background: COLOR.fondo, color: COLOR.texto, fontFamily: FUENTE.ui,
      display: 'flex', flexDirection: 'column', gap: 22,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span onClick={() => nav(-1)} style={{ font: `400 26px/1 ${FUENTE.ui}`, color: COLOR.textoSuave, cursor: 'pointer' }}>‹</span>
        <span style={{ ...etiqueta, color: COLOR.dinero }}>Mi perfil</span>
        <span style={{ width: 14 }} />
      </div>

      {/* foto */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div
          onClick={() => archivo.current?.click()}
          style={{
            width: 82, height: 82, borderRadius: '50%', flex: '0 0 auto', cursor: 'pointer',
            border: `2px solid ${COLOR.acento}`, overflow: 'hidden',
            background: foto ? `center/cover url(${foto})` : `repeating-linear-gradient(130deg,${COLOR.superficieAlta} 0 8px,${COLOR.superficie} 8px 16px)`,
            display: 'grid', placeItems: 'center',
          }}>
          {!foto && <span style={{ ...etiqueta, color: COLOR.textoApagado }}>Foto</span>}
        </div>
        <div style={{ minWidth: 0 }}>
          <div onClick={() => archivo.current?.click()} style={{
            display: 'inline-block', border: '1px solid rgba(255,255,255,.16)', color: COLOR.textoSuave,
            padding: '10px 13px', font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.8,
            textTransform: 'uppercase', cursor: 'pointer',
          }}>
            {subiendo ? 'Subiendo…' : foto ? 'Cambiar foto' : 'Subir foto'}
          </div>
          <div style={{ font: `400 11px/1.5 ${FUENTE.mono}`, color: COLOR.textoApagado, marginTop: 8 }}>
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
        <span style={{ font: `400 11px/1.5 ${FUENTE.mono}`, color: COLOR.textoApagado }}>
          Es lo único visible. Tu nombre legal no aparece en ninguna pantalla.
        </span>
      </div>

      {/* usuario */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={etiqueta}>Usuario</span>
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)',
            font: `400 16px/1 ${FUENTE.ui}`, color: COLOR.textoTenue,
          }}>@</span>
          <input value={handle} maxLength={24}
            onChange={e => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            placeholder="tu_usuario" style={{ ...campo, paddingLeft: 32 }} />
        </div>
        <span style={{ font: `400 11px/1.5 ${FUENTE.mono}`, color: handleOk || !handle ? COLOR.textoApagado : COLOR.acento }}>
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
          style={{ ...campo, resize: 'vertical', fontFamily: FUENTE.ui }} />
        <span style={{ font: `400 11px/1.5 ${FUENTE.mono}`, color: COLOR.textoApagado }}>{bio.length}/300</span>
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
          <div style={{ font: `700 12px/1.3 ${FUENTE.ui}`, letterSpacing: 1.2, textTransform: 'uppercase', color: creadora ? COLOR.dinero : COLOR.textoSuave }}>
            Quiero publicar
          </div>
          <div style={{ font: `400 12px/1.5 ${FUENTE.mono}`, color: COLOR.textoApagado, marginTop: 5 }}>
            {creadora
              ? (perfil?.identidad_verificada
                  ? 'Tu perfil de creadora está activo'
                  : 'Falta verificar tu identidad para poder publicar')
              : 'Habilita tu perfil de creadora'}
          </div>
        </div>
        <div style={{
          width: 46, height: 26, borderRadius: 13, flex: '0 0 auto',
          background: creadora ? COLOR.dinero : COLOR.superficieAlta, position: 'relative',
          transition: 'background .18s',
        }}>
          <div style={{
            position: 'absolute', top: 3, left: creadora ? 23 : 3,
            width: 20, height: 20, borderRadius: '50%',
            background: creadora ? COLOR.fondo : COLOR.textoApagado, transition: 'left .18s',
          }} />
        </div>
      </div>

      {/* Marcar la casilla no basta para publicar, y callarselo dejaria a la
          persona esperando a que pase algo que no va a pasar sola. */}
      {creadora && !perfil?.identidad_verificada && (
        <div style={{
          padding: '13px 15px', border: `1px solid ${COLOR.admin}`,
          font: `400 13px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave,
        }}>
          Ya puedes entrar al estudio y subir, pero <b style={{ color: COLOR.texto }}>
          nada se publica</b> hasta que verifiquemos tu identidad y tu edad.
          <div onClick={() => nav('/verificar')} style={{
            marginTop: 11, textAlign: 'center', padding: '12px 0', cursor: 'pointer',
            background: COLOR.admin, color: COLOR.fondo,
            font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.8, textTransform: 'uppercase',
          }}>Verificar mi identidad</div>
        </div>
      )}

      {estado === 'error' && (
        <div style={{ font: `400 13px/1.5 ${FUENTE.ui}`, color: COLOR.acento }}>{detalle}</div>
      )}

      {/* El bloqueo por pais solo tiene sentido para quien publica. */}
      {creadora && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,.09)', paddingTop: 18 }}>
          <PaisesBloqueados valor={paises} onCambio={setPaises}
            nota="Se aplica a todo lo que publiques, salvo que un clip diga otra cosa." />
        </div>
      )}

      {/* Accesos segun quien eres. Viven aqui y no en la barra inferior para
          que la barra se quede en cuatro pestañas: seis no caben en movil ni se
          leen de un vistazo. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginTop: 4 }}>
        {visiblesPara(ATAJOS_PERFIL, papel).map(a => (
          <div key={a.path} onClick={() => nav(a.path)} style={{
            display: 'flex', alignItems: 'center', gap: 13, padding: '15px 13px',
            cursor: 'pointer', border: '1px solid rgba(255,255,255,.09)',
            background: a.path === '/admin' ? 'rgba(0,229,255,.05)' : 'transparent',
          }}>
            <span style={{
              width: 26, textAlign: 'center', fontSize: 15,
              color: a.path === '/admin' ? COLOR.admin : COLOR.dinero,
            }}>{a.icono}</span>
            <span style={{ flex: 1, font: `500 15px/1.3 ${FUENTE.ui}`, color: COLOR.texto }}>{a.titulo}</span>
            <span style={{ color: COLOR.textoApagado }}>›</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'auto', paddingTop: 12 }}>
        <div onClick={guardar} style={{
          background: puedeGuardar ? COLOR.acento : COLOR.superficieAlta,
          color: puedeGuardar ? COLOR.fondo : COLOR.textoApagado,
          textAlign: 'center', padding: 19,
          font: `700 13px/1 ${FUENTE.ui}`, letterSpacing: 2.2, textTransform: 'uppercase',
          boxShadow: puedeGuardar ? '0 0 34px rgba(255,43,209,.42)' : 'none',
          cursor: puedeGuardar ? 'pointer' : 'default',
        }}>
          {estado === 'guardando' ? 'Guardando…' : estado === 'guardado' ? '✓ Guardado' : 'Guardar cambios'}
        </div>
        <div onClick={async () => { await salir(); nav('/entrar', { replace: true }) }} style={{
          border: '1px solid rgba(255,43,209,.5)', color: COLOR.acento, textAlign: 'center',
          padding: 17, font: `700 12px/1 ${FUENTE.ui}`, letterSpacing: 2,
          textTransform: 'uppercase', cursor: 'pointer',
        }}>
          Cerrar sesión
        </div>
        {perfil && (
          <div onClick={() => nav(`/creator/${perfil.handle}`)} style={{
            border: '1px solid rgba(255,255,255,.16)', color: COLOR.textoSuave, textAlign: 'center',
            padding: 18, font: `700 12px/1 ${FUENTE.ui}`, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer',
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
