// Pantalla 04 — Perfil publico de creadora
// Reescrita: antes era el mock del deck con "Mira Vanta" a mano; ahora lee el
// perfil real desde la base.
//
// Las cifras de clips, suscriptores y calificacion NO se muestran todavia: esos
// datos no existen aun (no hay tabla de clips ni de suscripciones) y poner
// numeros inventados en una pantalla que ya lee datos reales es peor que no
// ponerlos, porque parecen ciertos.
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSesion } from '../lib/sesion'
import { perfilPorHandle, urlAvatar } from '../lib/perfiles'
import type { Perfil } from '../lib/supabase'

const UI = "'Space Grotesk', system-ui, sans-serif"
const MONO = "'Space Mono', monospace"
const SERIF = "'Instrument Serif', serif"

export default function CreatorProfile() {
  const nav = useNavigate()
  const { handle } = useParams()
  const { perfil: mio, cargando: cargandoSesion } = useSesion()

  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [cargando, setCargando] = useState(true)

  // Sin handle en la ruta se muestra el propio, que es el caso de "ver como se
  // ve mi perfil" y evita una pantalla vacia al entrar sin parametro.
  useEffect(() => {
    let vivo = true
    if (!handle) {
      if (cargandoSesion) return
      setPerfil(mio); setCargando(false); return
    }
    setCargando(true)
    perfilPorHandle(handle).then(p => { if (vivo) { setPerfil(p); setCargando(false) } })
    return () => { vivo = false }
  }, [handle, mio, cargandoSesion])

  if (cargando) return <Centro texto="Cargando…" />

  if (!perfil) return (
    <Centro
      texto={handle ? `No existe @${handle}.` : 'Entra para ver tu perfil.'}
      accion={{ texto: handle ? 'Volver' : 'Entrar', al: () => nav(handle ? -1 as never : '/acceso') }}
    />
  )

  const foto = urlAvatar(perfil.avatar_path)
  const esMio = mio?.id === perfil.id

  return (
    <div style={{
      minHeight: '100%', boxSizing: 'border-box', background: '#08080A',
      color: '#F2F0F3', fontFamily: UI, display: 'flex', flexDirection: 'column',
    }}>
      {/* portada */}
      <div style={{
        height: 190, position: 'relative', flex: '0 0 auto',
        background: 'repeating-linear-gradient(130deg,#191920 0 10px,#111116 10px 20px)',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(8,8,10,.2) 0%,#08080A 100%)' }} />
        <span onClick={() => nav(-1)} style={{
          position: 'absolute', top: 18, left: 16, width: 38, height: 38,
          borderRadius: '50%', border: '1px solid rgba(255,255,255,.22)',
          display: 'grid', placeItems: 'center', font: `400 20px/1 ${UI}`,
          color: '#F2F0F3', cursor: 'pointer', background: 'rgba(8,8,10,.5)',
        }}>‹</span>
      </div>

      <div style={{ padding: '0 22px 40px', marginTop: -46 }}>
        <div style={{
          width: 92, height: 92, borderRadius: '50%', border: '2px solid #FF2BD1',
          overflow: 'hidden', position: 'relative',
          background: foto ? `center/cover url(${foto})` : 'repeating-linear-gradient(130deg,#191920 0 8px,#111116 8px 16px)',
          filter: 'drop-shadow(0 0 22px rgba(255,43,209,.4))',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 15 }}>
          <span style={{ fontFamily: 'Anton, sans-serif', fontSize: 30, lineHeight: 1, textTransform: 'uppercase' }}>
            {perfil.display_name}
          </span>
          {perfil.verified && <span style={{ color: '#00E5FF', fontSize: 17 }}>&#10038;</span>}
        </div>

        <div style={{ font: `400 13px/1.5 ${MONO}`, color: '#6E6A72', marginTop: 6 }}>
          @{perfil.handle}
          {perfil.is_creator && (
            <span style={{
              marginLeft: 9, background: '#C8FF3D', color: '#08080A', padding: '4px 7px',
              font: `700 9px/1 ${UI}`, letterSpacing: 1.3, textTransform: 'uppercase',
            }}>Creadora</span>
          )}
        </div>

        {perfil.bio && (
          <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 18, lineHeight: 1.4, color: '#9C979F', marginTop: 16 }}>
            {perfil.bio}
          </div>
        )}

        {esMio && (
          <div onClick={() => nav('/perfil')} style={{
            marginTop: 24, border: '1px solid rgba(255,255,255,.16)', color: '#9C979F',
            textAlign: 'center', padding: 17, font: `700 12px/1 ${UI}`,
            letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer',
          }}>Editar mi perfil</div>
        )}

        {/* Hueco honesto: aqui van los clips cuando exista la tabla. */}
        <div style={{
          marginTop: 28, padding: '26px 18px', textAlign: 'center',
          border: '1px dashed rgba(255,255,255,.12)',
        }}>
          <div style={{ font: `700 10px/1 ${UI}`, letterSpacing: 2.2, textTransform: 'uppercase', color: '#5E5A63' }}>
            Sin clips todavía
          </div>
          <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 16, color: '#6E6A72', marginTop: 10 }}>
            {esMio ? 'Cuando publiques, tus clips aparecen aquí.' : 'Esta creadora aún no publica nada.'}
          </div>
        </div>
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
