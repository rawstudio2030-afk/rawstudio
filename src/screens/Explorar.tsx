// Pantalla 02 — Explorar
//
// La pantalla que faltaba. Hasta ahora "Explorar" abria un solo clip: no habia
// donde ver QUE HAY, asi que aunque alguien publicara, nadie lo encontraba.
// Es el hueco estructural del set original: nunca se diseño un catalogo.
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSesion } from '../lib/sesion'
import { clipsExplorar, urlPortada, type ClipConAutora } from '../lib/clips'
import { semillaDeExplorar } from '../lib/semillaExplorar'
import { creadoras, type FichaCreadora } from '../lib/perfiles'
import Avatar from '../components/Avatar'
import { portadaDe } from '../lib/portadas'
import { TONO, insignias, duracion } from '../lib/catalogo'
import { cuantos } from '../lib/plural'
import { usd } from '../lib/dinero'
import TarjetaClip from '../components/TarjetaClip'
import Wordmark from '../components/Wordmark'
import { Pulsable, Enlace } from '../components/Pulsable'
import Icono from '../components/Iconos'
import { COLOR, FUENTE, RADIO, DEGRADADO } from '../lib/diseño'

type Filtro = 'todo' | 'gratis' | 'pago' | 'creadoras'

// Cuantos clips trae cada pagina. Si una pagina llega llena, puede haber mas.
const PAGINA = 30

export default function Explorar() {
  const nav = useNavigate()
  const { perfil } = useSesion()
  const [clips, setClips] = useState<ClipConAutora[]>([])
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro] = useState<Filtro>('todo')
  const [gente, setGente] = useState<FichaCreadora[]>([])
  const [busca, setBusca] = useState('')
  // «No hay clips» y «no pude pedir los clips» se pintan distinto. Sin esto,
  // el 4 de noviembre de 2026 esta pantalla dijo «todavia nadie ha publicado
  // nada» durante veinte minutos, con 186 clips en la base.
  const [fallo, setFallo] = useState<string | null>(null)
  const [intento, setIntento] = useState(0)
  const reintentar = () => setIntento(n => n + 1)

  // «Ver más». Si falla, lo ya cargado se queda y el aviso es de esa pagina.
  const [hayMas, setHayMas] = useState(false)
  const [cargandoMas, setCargandoMas] = useState(false)
  const [falloMas, setFalloMas] = useState(false)
  // La semilla se fija al pedir la primera pagina y las siguientes la reusan:
  // si se volviera a leer, pasados 30 minutos cambiaria a media lista y las
  // paginas se repetirian o se saltarian clips.
  const semilla = useRef('')
  // Cuantos ids ya se pidieron (el offset de la siguiente pagina) y a que
  // carga pertenece cada respuesta, para no mezclar un «Ver más» tardio con
  // otro filtro.
  const pedidos = useRef(0)
  const generacion = useRef(0)

  useEffect(() => {
    // El directorio de creadoras no es el catalogo: no se vuelve a pedir.
    if (filtro === 'creadoras') return
    let vivo = true
    const gen = ++generacion.current
    semilla.current = semillaDeExplorar()
    pedidos.current = 0
    setCargando(true); setHayMas(false); setFalloMas(false)
    clipsExplorar(semilla.current, filtro, 0, PAGINA).then(r => {
      if (!vivo || gen !== generacion.current) return
      pedidos.current = PAGINA
      setClips(r.datos); setFallo(r.fallo); setCargando(false)
      setHayMas(!r.fallo && r.datos.length >= PAGINA)
    })
    return () => { vivo = false }
  }, [filtro, intento])

  const verMas = () => {
    if (cargandoMas) return
    const gen = generacion.current
    setCargandoMas(true); setFalloMas(false)
    clipsExplorar(semilla.current, filtro, pedidos.current, PAGINA).then(r => {
      if (gen !== generacion.current) return
      setCargandoMas(false)
      if (r.fallo) { setFalloMas(true); return }
      pedidos.current += PAGINA
      // Sin duplicar: por si un clip se movio entre una pagina y otra.
      setClips(previos => {
        const vistos = new Set(previos.map(c => c.id))
        return [...previos, ...r.datos.filter(c => !vistos.has(c.id))]
      })
      setHayMas(r.datos.length >= PAGINA)
    })
  }

  // El directorio se pide aparte y solo cuando hace falta: son cientos de
  // filas y no tiene sentido traerlas para quien viene a ver clips.
  useEffect(() => {
    if (filtro !== 'creadoras') return
    let vivo = true
    const t = setTimeout(() => {
      creadoras(busca, 60).then(r => {
        if (!vivo) return
        setGente(r.datos); setFallo(r.fallo)
      })
    }, busca ? 300 : 0)
    return () => { vivo = false; clearTimeout(t) }
  }, [filtro, busca])

  return (
    <div style={{
      minHeight: '100%', color: COLOR.texto, fontFamily: FUENTE.ui,
      // Modo marca: un resplandor violeta arriba, que se apaga antes de la
      // rejilla. Es el mismo cielo de la portada, no un fondo nuevo.
      background: `radial-gradient(ellipse 90% 340px at 50% 0, rgba(123,60,255,.2), transparent 75%), ${COLOR.fondo}`,
    }}>
      <div style={{ padding: '46px 18px 0' }}>
        <div className="sin-riel"><Wordmark ancho={116} glow={14} /></div>

        <div style={{ marginTop: 22 }}>
          <h1 style={{
            margin: 0, font: `700 14px/1 ${FUENTE.ui}`, letterSpacing: 6, textTransform: 'uppercase',
          }}>Explorar</h1>
          <div style={{ marginTop: 7, font: `400 12px/1.3 ${FUENTE.ui}`, letterSpacing: 1.6,
            textTransform: 'uppercase', color: COLOR.textoSuave }}>
            Descubre contenido exclusivo
          </div>
        </div>

        {/* Los filtros son pestañas: la activa en magenta con su filete de
            neon, no cuatro botones. Misma logica que antes. */}
        <div role="group" aria-label="Filtrar" style={{
          display: 'flex', gap: 4, margin: '10px -4px 16px',
          borderBottom: '1px solid rgba(255,255,255,.12)', overflowX: 'auto',
        }}>
          {([['todo', 'Todo'], ['pago', 'De pago'], ['gratis', 'Gratis'],
             ['creadoras', 'Creadoras']] as [Filtro, string][]).map(([v, t]) => (
            <Pulsable key={v} al={() => setFiltro(v)} activado={filtro === v} style={{
              padding: '14px 11px', cursor: 'pointer', whiteSpace: 'nowrap', marginBottom: -1,
              font: `700 12px/1 ${FUENTE.ui}`, letterSpacing: 1.6, textTransform: 'uppercase',
              color: filtro === v ? '#FF5BDC' : COLOR.textoSuave,
              textShadow: filtro === v ? '0 0 12px rgba(255,43,209,.6)' : 'none',
              borderBottom: `2px solid ${filtro === v ? COLOR.acento : 'transparent'}`,
              boxShadow: filtro === v ? '0 6px 12px -8px rgba(255,43,209,.8)' : 'none',
            }}>{t}</Pulsable>
          ))}
        </div>
      </div>

      {filtro === 'creadoras' && (
        <div style={{ padding: '0 18px 14px' }}>
          <label style={{
            display: 'flex', alignItems: 'center', gap: 10, boxSizing: 'border-box',
            border: '1.5px solid rgba(255,255,255,.28)', borderRadius: RADIO.neon,
            padding: '0 14px', background: 'rgba(8,8,10,.6)', color: COLOR.textoSuave,
          }}>
            <Icono nombre="lupa" tam={18} />
            <input value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por nombre" aria-label="Buscar por nombre"
              style={{
                flex: 1, minWidth: 0, background: 'transparent', color: COLOR.texto,
                border: 0, padding: '14px 0', font: `400 16px/1 ${FUENTE.ui}`, outline: 'none',
              }} />
          </label>
        </div>
      )}

      <div style={{ padding: '0 18px 30px' }}>
        {filtro === 'creadoras' ? (
          gente.length === 0 ? (
            <Vacio texto={busca ? 'Nadie con ese nombre.' : 'Cargando…'} />
          ) : (
            <div style={{ display: 'grid', gap: 9, gridTemplateColumns: 'minmax(0, 1fr)' }}>
              {gente.map(g => (
                <Enlace key={g.id} a={`/creator/${g.handle}`} style={{
                  display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer',
                  padding: '12px 13px', borderRadius: RADIO.neon,
                  border: `1.5px solid ${TONO.c.borde}`, background: 'rgba(0,229,255,.04)',
                  boxShadow: `0 0 8px rgba(${TONO.c.rgb},.3), 0 0 20px rgba(${TONO.c.rgb},.12)`,
                }}>
                  <Avatar ruta={g.avatar_path} nombre={g.display_name} handle={g.handle} tam={46}
                    style={{ border: `1.5px solid ${COLOR.acento}` }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: `700 16px/1.3 ${FUENTE.ui}`, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {g.display_name}
                      {g.identidad_verificada && (
                        <span role="img" aria-label="Identidad verificada" style={{ color: COLOR.admin, display: 'grid' }}>
                          <Icono nombre="verificada" tam={15} />
                        </span>
                      )}
                    </div>
                    <div style={{ font: `400 11px/1.45 ${FUENTE.mono}`, color: COLOR.textoTenue }}>
                      @{g.handle}
                      {g.es_demo && (
                        <span style={{ color: COLOR.textoApagado }}> · demostración</span>
                      )}
                    </div>
                    {g.bio && (
                      <div style={{
                        marginTop: 4, font: `400 13px/1.45 ${FUENTE.ui}`, color: COLOR.textoSuave,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{g.bio}</div>
                    )}
                  </div>
                </Enlace>
              ))}
            </div>
          )
        ) : cargando ? (
          <Vacio texto="Cargando…" />
        ) : fallo ? (
          <Vacio
            texto="No pudimos cargar el catálogo. No es que esté vacío: no conseguimos preguntar."
            accion={{ texto: 'Reintentar', al: reintentar }}
          />
        ) : clips.length === 0 ? (
          <Vacio
            texto={filtro === 'todo'
              ? 'Todavía nadie ha publicado nada.'
              : 'No hay clips con ese filtro.'}
            accion={perfil?.is_creator && filtro === 'todo'
              ? { texto: 'Publica el primero', al: () => nav('/upload') }
              : undefined}
          />
        ) : (<>
          {/* Las columnas van en la hoja de estilos porque cambian con el
             ancho: dos en el telefono, y tantas como quepan de 220 en
             adelante. Fijas en dos, en una pantalla de computadora salian
             dos tarjetas de medio metro. */}
          <div className="rejilla-clips">
            {clips.map(c => {
              const p = portadaDe(c.id, urlPortada(c.cover_path))
              const marca = insignias(c)
              const t = TONO[marca[0].tono]
              const dur = duracion(c.duration_s)
              return (
                <article key={c.id} style={{
                  padding: 6, borderRadius: RADIO.neon, boxSizing: 'border-box',
                  border: `1.5px solid ${t.borde}`, background: `rgba(${t.rgb},.05)`,
                  boxShadow: `0 0 8px rgba(${t.rgb},.4), 0 0 22px rgba(${t.rgb},.16)`,
                }}>
                  {/* El recorte redondeado va en el contenedor: la tarjeta
                      lleva `overflow: hidden` y un radio en el mismo elemento
                      que dibuja el fondo de la tira de fotogramas no recorta
                      bien. */}
                  <div style={{ borderRadius: 9, overflow: 'hidden' }}>
                    <TarjetaClip portada={p} tira={urlPortada(c.preview_path ?? null)}
                      a={`/clip/${c.id}`}>
                      {/* La portada publica es una miniatura de 240 px (la nitida
                          es privada): se le pone encima el duotono de la casa. */}
                      <div aria-hidden style={{ position: 'absolute', inset: 0, background: DEGRADADO.duotono, mixBlendMode: 'soft-light' }} />
                      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(8,8,10,.1) 45%,rgba(8,8,10,.78) 100%)' }} />
                      <div style={{ position: 'absolute', top: 7, left: 7, right: 7, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {marca.map(m => (
                          <span key={m.texto} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            background: m.icono ? TONO[m.tono].borde : 'rgba(8,8,10,.7)',
                            color: m.icono || m.tono === 'l' ? COLOR.fondo : TONO[m.tono].borde,
                            border: `1px solid ${TONO[m.tono].borde}`, borderRadius: 6, padding: '4px 6px',
                            font: `700 9px/1 ${FUENTE.ui}`, letterSpacing: 1.1, textTransform: 'uppercase',
                          }}>
                            {m.icono && <Icono nombre={m.icono} tam={10} />}{m.texto}
                          </span>
                        ))}
                      </div>
                      {c.formato === 'album' ? (
                        <span style={{
                          position: 'absolute', right: 7, bottom: 7, background: 'rgba(8,8,10,.72)',
                          borderRadius: 6, padding: '4px 6px', font: `700 10px/1 ${FUENTE.mono}`, color: COLOR.texto,
                        }}>{cuantos(c.num_fotos, 'foto')}</span>
                      ) : dur && (
                        <span style={{
                          position: 'absolute', right: 7, bottom: 7, display: 'inline-flex', alignItems: 'center', gap: 4,
                          background: 'rgba(8,8,10,.72)', borderRadius: 6, padding: '4px 6px',
                          font: `700 10px/1 ${FUENTE.mono}`, color: COLOR.texto,
                        }}>{dur}<Icono nombre="play" tam={9} /></span>
                      )}
                    </TarjetaClip>
                  </div>

                  <div style={{ padding: '9px 4px 4px' }}>
                    <div style={{
                      font: `700 13px/1.3 ${FUENTE.ui}`, color: COLOR.texto,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>{c.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 8 }}>
                      {c.profiles ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                          <Avatar ruta={c.profiles.avatar_path} nombre={c.profiles.display_name}
                            handle={c.profiles.handle} tam={20} style={{ border: `1px solid ${t.borde}` }} />
                          <span style={{
                            font: `400 10px/1.3 ${FUENTE.mono}`, color: COLOR.textoSuave,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>@{c.profiles.handle}</span>
                        </div>
                      ) : <span />}
                      {c.visibility === 'pago' && (
                        <span style={{
                          flex: '0 0 auto', border: `1px solid ${t.borde}`, borderRadius: 6, padding: '4px 7px',
                          font: `700 12px/1 ${FUENTE.mono}`, color: COLOR.dinero,
                          boxShadow: `0 0 8px rgba(${t.rgb},.35)`,
                        }}>{usd(c.price_coins)}</span>
                      )}
                    </div>
                    {c.es_demo && (
                      <div style={{ marginTop: 6, font: `700 9px/1 ${FUENTE.ui}`, letterSpacing: 1.2,
                        textTransform: 'uppercase', color: COLOR.textoTenue }}>Demostración</div>
                    )}
                  </div>
                </article>
              )
            })}
          </div>

          {/* «Ver más»: el catalogo completo, de 30 en 30. Si falla, lo ya
              cargado se queda tal cual y el aviso es solo de esta pagina. */}
          {falloMas && (
            <div role="alert" style={{
              marginTop: 18, padding: '14px 16px', borderRadius: RADIO.neon, textAlign: 'center',
              border: '1.5px solid rgba(255,90,90,.6)', background: 'rgba(255,90,90,.08)',
              font: `400 14px/1.45 ${FUENTE.ui}`, color: COLOR.texto,
            }}>
              No pudimos cargar más clips. Lo que ya viste sigue aquí.
            </div>
          )}
          {(hayMas || falloMas) && (
            <div style={{ marginTop: 18, textAlign: 'center' }}>
              <Pulsable al={verMas} activo={!cargandoMas} style={{
                display: 'inline-block', padding: '16px 24px', cursor: cargandoMas ? 'default' : 'pointer',
                borderRadius: RADIO.neon, border: '2px solid #FF4FE0', color: '#FFF',
                opacity: cargandoMas ? 0.6 : 1,
                background: 'linear-gradient(180deg, rgba(255,43,209,.26), rgba(255,43,209,.1))',
                boxShadow: '0 0 10px rgba(255,43,209,.6), 0 0 28px rgba(255,43,209,.35), inset 0 0 16px rgba(255,43,209,.25)',
                font: `500 13px/1 ${FUENTE.ui}`, letterSpacing: 2.6, textTransform: 'uppercase',
              }}>{cargandoMas ? 'Cargando…' : falloMas ? 'Reintentar' : 'Ver más'}</Pulsable>
            </div>
          )}
        </>)}
      </div>
    </div>
  )
}

function Vacio({ texto, accion }: { texto: string; accion?: { texto: string; al: () => void } }) {
  return (
    <div style={{
      padding: '60px 20px', textAlign: 'center', borderRadius: RADIO.neon,
      border: '1.5px dashed rgba(255,255,255,.2)',
    }}>
      <div style={{ fontFamily: FUENTE.ui, fontSize: 19, color: COLOR.textoSuave }}>{texto}</div>
      {accion && (
        <Pulsable al={accion.al} style={{
          marginTop: 18, display: 'inline-block', padding: '16px 24px', cursor: 'pointer',
          borderRadius: RADIO.neon, border: '2px solid #FF4FE0', color: '#FFF',
          background: 'linear-gradient(180deg, rgba(255,43,209,.26), rgba(255,43,209,.1))',
          boxShadow: '0 0 10px rgba(255,43,209,.6), 0 0 28px rgba(255,43,209,.35), inset 0 0 16px rgba(255,43,209,.25)',
          font: `500 13px/1 ${FUENTE.ui}`, letterSpacing: 2.6, textTransform: 'uppercase',
        }}>{accion.texto}</Pulsable>
      )}
    </div>
  )
}
