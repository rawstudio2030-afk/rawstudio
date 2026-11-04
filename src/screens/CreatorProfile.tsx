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
import { clipsDe, urlPortada, type Clip } from '../lib/clips'
import { portadaDe } from '../lib/portadas'
import type { PerfilPublico } from '../lib/supabase'
import { COLOR, FUENTE } from '../lib/diseño'
import Reportar from '../components/Reportar'
import OfertaCreadora from '../components/OfertaCreadora'
import { usd } from '../lib/dinero'
import { Pulsable, Enlace } from '../components/Pulsable'


export default function CreatorProfile() {
  const nav = useNavigate()
  const { handle } = useParams()
  const { perfil: mio, cargando: cargandoSesion } = useSesion()

  const [perfil, setPerfil] = useState<PerfilPublico | null>(null)
  const [cargando, setCargando] = useState(true)
  const [falloPerfil, setFalloPerfil] = useState<string | null>(null)
  const [falloClips, setFalloClips] = useState<string | null>(null)
  const [intento, setIntento] = useState(0)
  const [clips, setClips] = useState<Clip[]>([])

  // Sin handle en la ruta se muestra el propio, que es el caso de "ver como se
  // ve mi perfil" y evita una pantalla vacia al entrar sin parametro.
  useEffect(() => {
    let vivo = true
    if (!handle) {
      if (cargandoSesion) return
      setPerfil(mio); setCargando(false); return
    }
    setCargando(true)
    perfilPorHandle(handle).then(r => {
      if (!vivo) return
      setPerfil(r.datos); setFalloPerfil(r.fallo); setCargando(false)
    })
    return () => { vivo = false }
  }, [handle, mio, cargandoSesion, intento])

  // RLS decide que se ve: a una tercera persona solo le llegan los publicados,
  // a la propia autora tambien sus borradores.
  useEffect(() => {
    if (!perfil) { setClips([]); return }
    let vivo = true
    clipsDe(perfil.id).then(r => {
      if (!vivo) return
      setClips(r.datos); setFalloClips(r.fallo)
    })
    return () => { vivo = false }
  }, [perfil])

  if (cargando) return <Centro texto="Cargando…" />

  // «No existe @fulanita» es una afirmacion fuerte: para ella significa que su
  // enlace no sirve. No se dice cuando lo que paso es que no pudimos leer.
  if (falloPerfil) return (
    <Centro
      texto="No pudimos cargar este perfil. No es que no exista."
      accion={{ texto: 'Reintentar', al: () => setIntento(n => n + 1) }}
    />
  )

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
      minHeight: '100%', boxSizing: 'border-box', background: COLOR.fondo,
      color: COLOR.texto, fontFamily: FUENTE.ui, display: 'flex', flexDirection: 'column',
    }}>
      {/* portada */}
      <div style={{
        height: 190, position: 'relative', flex: '0 0 auto',
        background: `repeating-linear-gradient(130deg,${COLOR.superficieAlta} 0 10px,${COLOR.superficie} 10px 20px)`,
      }}>
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg,rgba(8,8,10,.2) 0%,${COLOR.fondo} 100%)` }} />
        <Pulsable al={() => nav(-1)} rotulo="Volver" style={{
          position: 'absolute', top: 18, left: 16, width: 38, height: 38,
          borderRadius: '50%', border: '1px solid rgba(255,255,255,.22)',
          display: 'grid', placeItems: 'center', font: `400 19px/1 ${FUENTE.ui}`,
          color: COLOR.texto, cursor: 'pointer', background: 'rgba(8,8,10,.5)',
        }}>‹</Pulsable>
      </div>

      <div style={{ padding: '0 22px 40px', marginTop: -46 }}>
        <div style={{
          width: 92, height: 92, borderRadius: '50%', border: `2px solid ${COLOR.acento}`,
          overflow: 'hidden', position: 'relative',
          background: foto ? `center/cover url(${foto})` : `repeating-linear-gradient(130deg,${COLOR.superficieAlta} 0 8px,${COLOR.superficie} 8px 16px)`,
          filter: 'drop-shadow(0 0 22px rgba(255,43,209,.4))',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 15 }}>
          <span style={{ fontFamily: FUENTE.display, fontSize: 32, lineHeight: 1, textTransform: 'uppercase' }}>
            {perfil.display_name}
          </span>
          {perfil.verified && <span style={{ color: COLOR.admin, fontSize: 16 }}>&#10038;</span>}
        </div>

        <div style={{ font: `400 13px/1.45 ${FUENTE.mono}`, color: COLOR.textoTenue, marginTop: 6 }}>
          @{perfil.handle}
          {perfil.is_creator && (
            <span style={{
              marginLeft: 9, background: COLOR.dinero, color: COLOR.fondo, padding: '4px 7px',
              font: `700 9px/1 ${FUENTE.ui}`, letterSpacing: 1.2, textTransform: 'uppercase',
            }}>Creadora</span>
          )}
          {perfil.es_demo && (
            <span style={{
              marginLeft: 7, background: COLOR.textoTenue, color: COLOR.fondo, padding: '4px 7px',
              font: `700 9px/1 ${FUENTE.ui}`, letterSpacing: 1.2, textTransform: 'uppercase',
            }}>Demostración</span>
          )}
        </div>

        {perfil.bio && (
          <div style={{ fontFamily: FUENTE.serif, fontStyle: 'italic', fontSize: 19, lineHeight: 1.45, color: COLOR.textoSuave, marginTop: 16 }}>
            {perfil.bio}
          </div>
        )}

        {esMio && (
          <Enlace a="/perfil" style={{
            display: 'block', boxSizing: 'border-box', width: '100%',
            marginTop: 24, border: '1px solid rgba(255,255,255,.16)', color: COLOR.textoSuave,
            textAlign: 'center', padding: 17, font: `700 12px/1 ${FUENTE.ui}`,
            letterSpacing: 2.2, textTransform: 'uppercase', cursor: 'pointer',
          }}>Editar mi perfil</Enlace>
        )}

        <div style={{ marginTop: 28 }}>
          {clips.length === 0 ? (
            <div style={{ padding: '26px 18px', textAlign: 'center', border: `1px ${falloClips ? 'solid' : 'dashed'} ${falloClips ? COLOR.acento : 'rgba(255,255,255,.12)'}` }}>
              <div style={{ font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 2.2, textTransform: 'uppercase', color: COLOR.textoApagado }}>
                {falloClips ? 'No se pudieron cargar' : 'Sin clips todavía'}
              </div>
              <div style={{ fontFamily: FUENTE.serif, fontStyle: 'italic', fontSize: 16, color: COLOR.textoTenue, marginTop: 10 }}>
                {falloClips ? 'No significa que no haya publicado nada.'
                  : esMio ? 'Cuando publiques, tus clips aparecen aquí.'
                  : 'Esta creadora aún no publica nada.'}
              </div>
              {esMio && (
                <Enlace a="/upload" style={{
                  marginTop: 16, display: 'inline-block', background: COLOR.acento, color: COLOR.fondo,
                  padding: '14px 22px', font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.6,
                  textTransform: 'uppercase', cursor: 'pointer',
                }}>Publicar el primero</Enlace>
              )}
            </div>
          ) : (
            <>
              <div style={{ font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 2.2, textTransform: 'uppercase', color: COLOR.textoTenue, marginBottom: 12 }}>
                {clips.length} {clips.length === 1 ? 'clip' : 'clips'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
                {clips.map(c => {
                  const p = portadaDe(c.id, urlPortada(c.cover_path))
                  return (
                    <Enlace key={c.id} a={`/clip/${c.id}`} style={{
                      display: 'block', aspectRatio: '3/4', position: 'relative', cursor: 'pointer',
                      background: `center/cover url(${p})`,
                    }}>
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,transparent 45%,rgba(8,8,10,.9) 100%)' }} />
                      {!c.published && (
                        <span style={{
                          position: 'absolute', top: 8, left: 8, background: COLOR.acento, color: COLOR.fondo,
                          padding: '4px 6px', font: `700 9px/1 ${FUENTE.ui}`, letterSpacing: 1.2, textTransform: 'uppercase',
                        }}>Borrador</span>
                      )}
                      <div style={{ position: 'absolute', left: 9, right: 9, bottom: 9 }}>
                        <div style={{ font: `500 12px/1.3 ${FUENTE.ui}`, color: COLOR.texto }}>{c.title}</div>
                        <div style={{ font: `400 10px/1.45 ${FUENTE.mono}`, color: COLOR.dinero, marginTop: 3 }}>
                          {c.visibility === 'gratis' ? 'gratis' : c.visibility === 'suscriptores' ? 'suscriptores' : `${usd(c.price_coins)}`}
                        </div>
                      </div>
                    </Enlace>
                  )
                })}
              </div>
            </>
          )}
        </div>

        <OfertaCreadora creadora={perfil.id} handle={perfil.handle} />

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Reportar perfil={perfil.id} etiqueta="Reportar este perfil" />
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
    </div>
  )
}
