// Pantalla 04 — Perfil publico de creadora
// Reescrita: antes era el mock del deck con "Mira Vanta" a mano; ahora lee el
// perfil real desde la base.
//
// Las cifras que se muestran son las que existen de verdad: cuantos clips y
// desde cuando esta en la plataforma. NO hay seguidores (no existe seguir) ni
// se expone el numero de suscriptoras, y poner numeros inventados en una
// pantalla que ya lee datos reales es peor que no ponerlos, porque parecen
// ciertos. Tampoco hay boton de «Seguir», por lo mismo.
//
// Modo marca (DESIGN-BRIEF.md): un perfil se visita para conocer a alguien, no
// para consumir.
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useSesion } from '../lib/sesion'
import { perfilPorHandle } from '../lib/perfiles'
import Avatar from '../components/Avatar'
import { clipsDe, urlPortada, type Clip } from '../lib/clips'
import { portadaDe } from '../lib/portadas'
import type { PerfilPublico } from '../lib/supabase'
import { COLOR, FUENTE, RADIO, LUZ, TRAMA } from '../lib/diseño'
import { nivelesDe } from '../lib/canales'
import { TONO, insignias, duracion } from '../lib/catalogo'
import TarjetaClip from '../components/TarjetaClip'
import Icono from '../components/Iconos'
import { BannerMiami } from '../components/FondoMiami'
import Reportar from '../components/Reportar'
import OfertaCreadora from '../components/OfertaCreadora'
import { usd } from '../lib/dinero'
import { Pulsable, Enlace } from '../components/Pulsable'
import Centro from '../components/Centro'


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
  // Para saber si hay algo a lo que suscribirse antes de ofrecer el boton.
  const [hayNiveles, setHayNiveles] = useState(false)

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

  useEffect(() => {
    if (!perfil) { setHayNiveles(false); return }
    let vivo = true
    nivelesDe(perfil.id).then(n => { if (vivo) setHayNiveles(n.length > 0) })
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

  const esMio = mio?.id === perfil.id
  const desde = new Date(perfil.created_at).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })

  const boton = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxSizing: 'border-box',
    flex: 1, minHeight: 54, padding: '0 14px', borderRadius: RADIO.filo, cursor: 'pointer',
    font: `500 14px/1 ${FUENTE.ui}`, letterSpacing: 2, textTransform: 'uppercase', color: '#FFF',
  } as const

  return (
    <div style={{
      minHeight: '100%', boxSizing: 'border-box', color: COLOR.texto, fontFamily: FUENTE.ui,
      display: 'flex', flexDirection: 'column',
      background: `radial-gradient(ellipse 90% 320px at 50% 0, rgba(123,60,255,.16), transparent 75%), ${COLOR.fondo}`,
    }}>
      {/* El banner: el skyline de Miami. Nadie tiene aun banner propio. */}
      <div style={{ height: 176, position: 'relative', flex: '0 0 auto', overflow: 'hidden' }}>
        <BannerMiami />
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg,rgba(8,8,10,.25) 0%,${COLOR.fondo} 100%)` }} />
        {/* Sin handle en la ruta esta pantalla es la pestaña «Yo», no una
            pantalla a la que se entro desde otra: un boton de volver ahi manda
            a donde estuvieras antes, que no es «atras» de nada. */}
        {handle && (
          <Pulsable al={() => nav(-1)} rotulo="Volver" style={{
            position: 'absolute', top: 14, left: 14, width: 44, height: 44,
            borderRadius: '50%', border: '1px solid rgba(255,255,255,.25)',
            display: 'grid', placeItems: 'center', color: COLOR.texto,
            cursor: 'pointer', background: 'rgba(8,8,10,.55)',
          }}><span aria-hidden style={{ font: `400 22px/1 ${FUENTE.ui}` }}>&#8249;</span></Pulsable>
        )}
      </div>

      <div style={{ padding: '0 20px 40px', marginTop: -52, position: 'relative', boxSizing: 'border-box', width: '100%', maxWidth: 760, marginLeft: 'auto', marginRight: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
          {/* El anillo de neon: degradado de magenta a cian detras de la foto. */}
          <div style={{
            flex: '0 0 auto', width: 104, height: 104, borderRadius: '50%', padding: 3, boxSizing: 'border-box',
            background: TRAMA.hilo, boxShadow: `${LUZ.acento}`,
          }}>
            <Avatar ruta={perfil.avatar_path} nombre={perfil.display_name} handle={perfil.handle} tam={98}
              style={{ border: `3px solid ${COLOR.fondo}` }} />
          </div>
          <div style={{ minWidth: 0, paddingBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ margin: 0, font: `700 26px/1.1 ${FUENTE.ui}`, overflowWrap: 'anywhere' }}>{perfil.display_name}</h1>
              {perfil.verified && (
                <span role="img" aria-label="Verificada" style={{ color: COLOR.admin, display: 'grid', flex: '0 0 auto' }}>
                  <Icono nombre="verificada" tam={20} />
                </span>
              )}
            </div>
            <div style={{ font: `400 13px/1.45 ${FUENTE.mono}`, color: COLOR.textoSuave, marginTop: 5 }}>@{perfil.handle}</div>
          </div>
        </div>

        {(perfil.is_creator || perfil.es_demo) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
            {perfil.is_creator && (
              <span style={{
                border: `1px solid ${COLOR.dinero}`, color: COLOR.dinero, borderRadius: 6, padding: '5px 8px',
                font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.4, textTransform: 'uppercase',
              }}>Creadora</span>
            )}
            {perfil.es_demo && (
              <span style={{
                border: `1px solid ${COLOR.textoTenue}`, color: COLOR.textoSuave, borderRadius: 6, padding: '5px 8px',
                font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.4, textTransform: 'uppercase',
              }}>Demostración</span>
            )}
          </div>
        )}

        {perfil.bio && (
          <div style={{ font: `400 16px/1.5 ${FUENTE.ui}`, color: '#CFCAD3', marginTop: 16 }}>{perfil.bio}</div>
        )}

        {/* Las cifras que hay. Dos, y las dos son ciertas. */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', marginTop: 22,
          borderTop: '1px solid rgba(255,255,255,.12)', borderBottom: '1px solid rgba(255,255,255,.12)',
        }}>
          <div style={{ padding: '16px 0', textAlign: 'center' }}>
            <div style={{ font: `700 24px/1 ${FUENTE.ui}` }}>{clips.length}</div>
            <div style={{ font: `400 12px/1 ${FUENTE.ui}`, color: COLOR.textoSuave, marginTop: 7 }}>{clips.length === 1 ? 'Clip' : 'Clips'}</div>
          </div>
          <div style={{ padding: '16px 0', textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,.12)' }}>
            <div style={{ font: `700 24px/1 ${FUENTE.ui}`, textTransform: 'capitalize' }}>{desde}</div>
            <div style={{ font: `400 12px/1 ${FUENTE.ui}`, color: COLOR.textoSuave, marginTop: 7 }}>En RAWstudio desde</div>
          </div>
        </div>

        {/* El boton de suscripcion baja a donde esta la oferta, que es donde
            ya vive la logica de suscribirse. Solo si hay a que suscribirse. */}
        {!esMio && hayNiveles && (
          <div style={{ display: 'flex', marginTop: 18 }}>
            <Pulsable al={() => document.getElementById('suscripcion')?.scrollIntoView({ behavior: 'smooth', block: 'center' })} style={{
              ...boton,
              border: '2px solid #19E6FF', background: 'linear-gradient(180deg, rgba(0,229,255,.16), rgba(0,229,255,.05))',
              boxShadow: '0 0 10px rgba(0,229,255,.55), 0 0 28px rgba(0,229,255,.3), inset 0 0 16px rgba(0,229,255,.2)',
              textShadow: '0 0 10px rgba(180,250,255,.6)',
            }}>
              <Icono nombre="corona" tam={20} />Suscripción
            </Pulsable>
          </div>
        )}

        {/* La puerta a los ajustes. Decia «Editar mi perfil» cuando esta
            pantalla solo se visitaba desde el formulario para ver como se ve;
            ahora es la pestaña «Yo» y es el camino de ida, no de vuelta.
            Dice lo que hay detras: nombre, foto, contacto, cuenta.

            Y NO cuelga de la imagen del perfil, aunque sea el gesto que uno
            espera de otras paginas: tocar la foto aqui ya abre el selector de
            archivos para cambiarla, que es lo que tocar una foto deberia
            hacer. Dos significados en el mismo sitio es peor que un boton
            que se lee. */}
        {esMio && (
          <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
            {/* Lo que compraste. A quien publica tambien le toca comprar, y la
                barra de abajo no tiene sitio para su Biblioteca. */}
            <Enlace a="/library" style={{
              ...boton, border: '1.5px solid rgba(255,255,255,.3)', background: 'rgba(255,255,255,.04)',
            }}><Icono nombre="biblioteca" tam={20} />Mis compras</Enlace>
            <Enlace a="/perfil" style={{
              ...boton,
              border: '2px solid #FF4FE0', background: 'linear-gradient(180deg, rgba(255,43,209,.2), rgba(255,43,209,.06))',
              boxShadow: '0 0 10px rgba(255,43,209,.55), 0 0 28px rgba(255,43,209,.3), inset 0 0 16px rgba(255,43,209,.2)',
              textShadow: '0 0 10px rgba(255,200,245,.6)',
            }}><Icono nombre="engrane" tam={20} />Ajustes de cuenta</Enlace>
          </div>
        )}

        <div style={{ marginTop: 26 }}>
          {clips.length === 0 ? (
            <div style={{
              padding: '28px 18px', textAlign: 'center', borderRadius: RADIO.filo,
              border: `1.5px ${falloClips ? 'solid' : 'dashed'} ${falloClips ? COLOR.acento : 'rgba(255,255,255,.2)'}`,
            }}>
              <div style={{ font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 2, textTransform: 'uppercase', color: COLOR.textoSuave }}>
                {falloClips ? 'No se pudieron cargar' : 'Sin clips todavía'}
              </div>
              <div style={{ fontFamily: FUENTE.ui, fontSize: 16, color: COLOR.textoTenue, marginTop: 10 }}>
                {falloClips ? 'No significa que no haya publicado nada.'
                  : esMio && perfil.is_creator ? 'Cuando publiques, tus clips aparecen aquí.'
                  // Quien todavia no publica no necesita que le digan que sus
                  // clips apareceran aqui: necesita saber que puede publicar.
                  : esMio ? 'Si algún día publicas, tus clips aparecen aquí.'
                  : 'Esta creadora aún no publica nada.'}
              </div>
              {esMio && perfil.is_creator && (
                <Enlace a="/upload" style={{
                  marginTop: 16, display: 'inline-block', padding: '16px 24px', cursor: 'pointer',
                  borderRadius: RADIO.filo, border: '2px solid #FF4FE0', color: '#FFF',
                  background: 'linear-gradient(180deg, rgba(255,43,209,.26), rgba(255,43,209,.1))',
                  boxShadow: '0 0 10px rgba(255,43,209,.6), 0 0 28px rgba(255,43,209,.35), inset 0 0 16px rgba(255,43,209,.25)',
                  font: `500 13px/1 ${FUENTE.ui}`, letterSpacing: 2.6, textTransform: 'uppercase',
                }}>Publicar el primero</Enlace>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
              {clips.map(c => {
                const p = portadaDe(c.id, urlPortada(c.cover_path))
                const marca = insignias(c)
                const t = TONO[marca[0].tono]
                const dur = duracion(c.duration_s)
                return (
                  <article key={c.id} style={{
                    padding: 4, borderRadius: 12, boxSizing: 'border-box',
                    border: `1.5px solid ${t.borde}`, background: `rgba(${t.rgb},.05)`,
                    boxShadow: `0 0 7px rgba(${t.rgb},.38), 0 0 18px rgba(${t.rgb},.14)`,
                  }}>
                    <div style={{ borderRadius: 8, overflow: 'hidden' }}>
                      <TarjetaClip portada={p} tira={urlPortada(c.preview_path ?? null)} a={`/clip/${c.id}`}>
                        <div aria-hidden style={{ position: 'absolute', inset: 0, background: TRAMA.duotono, mixBlendMode: 'soft-light' }} />
                        <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(8,8,10,.1) 50%,rgba(8,8,10,.8) 100%)' }} />
                        {dur && (
                          <span style={{
                            position: 'absolute', top: 5, left: 5, background: 'rgba(8,8,10,.72)', borderRadius: 5,
                            padding: '3px 5px', font: `700 9px/1 ${FUENTE.mono}`, color: COLOR.texto,
                          }}>{dur}</span>
                        )}
                        {marca[0].icono && (
                          <span style={{ position: 'absolute', top: 5, right: 5, color: t.borde, display: 'grid',
                            filter: `drop-shadow(0 0 4px ${t.borde})` }}>
                            <Icono nombre={marca[0].icono} tam={14} />
                          </span>
                        )}
                        {c.formato === 'album' && (
                          <span style={{
                            position: 'absolute', left: 5, bottom: 5, borderRadius: 5, padding: '3px 5px',
                            background: 'rgba(8,8,10,.78)', border: `1px solid ${COLOR.admin}`, color: COLOR.admin,
                            font: `700 8px/1 ${FUENTE.ui}`, letterSpacing: 1, textTransform: 'uppercase',
                          }}>Álbum · {c.num_fotos}</span>
                        )}
                        {!c.published && (
                          <span style={{
                            position: 'absolute', top: 5, left: 5, right: 5, textAlign: 'center',
                            background: COLOR.acento, color: COLOR.fondo, borderRadius: 5, padding: '3px 4px',
                            font: `700 8px/1 ${FUENTE.ui}`, letterSpacing: 1, textTransform: 'uppercase',
                          }}>Borrador</span>
                        )}
                        <span style={{
                          position: 'absolute', right: 5, bottom: 5, borderRadius: 5, padding: '3px 5px',
                          background: 'rgba(8,8,10,.78)', border: `1px solid ${t.borde}`,
                          font: `700 10px/1 ${FUENTE.mono}`, color: c.visibility === 'pago' ? COLOR.dinero : t.borde,
                        }}>
                          {c.visibility === 'gratis' ? 'Gratis' : c.visibility === 'suscriptores' ? 'Subs' : usd(c.price_coins)}
                        </span>
                      </TarjetaClip>
                    </div>
                    <div style={{
                      padding: '6px 2px 2px', font: `500 11px/1.3 ${FUENTE.ui}`, color: COLOR.textoSuave,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{c.title}</div>
                  </article>
                )
              })}
            </div>
          )}
        </div>

        <OfertaCreadora creadora={perfil.id} handle={perfil.handle} />

        {/* Reportarse a una misma no tiene sentido y manda ruido a
            moderacion. Se podia hacer desde el dia uno por «ver como se ve»;
            ahora que esta pantalla es una pestaña, se podria hacer a diario. */}
        {!esMio && (
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <Reportar perfil={perfil.id} etiqueta="Reportar este perfil" />
          </div>
        )}
      </div>
    </div>
  )
}
