// Pantalla 02 — Explorar
//
// La pantalla que faltaba. Hasta ahora "Explorar" abria un solo clip: no habia
// donde ver QUE HAY, asi que aunque alguien publicara, nadie lo encontraba.
// Es el hueco estructural del set original: nunca se diseño un catalogo.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSesion } from '../lib/sesion'
import { clipsPublicados, urlPortada, type ClipConAutora } from '../lib/clips'
import { urlAvatar, creadoras, type FichaCreadora } from '../lib/perfiles'
import { portadaDe } from '../lib/portadas'
import { usd } from '../lib/dinero'
import TarjetaClip from '../components/TarjetaClip'
import Wordmark from '../components/Wordmark'
import { Pulsable, Enlace } from '../components/Pulsable'
import { COLOR, LINEA, FUENTE } from '../lib/diseño'


type Filtro = 'todo' | 'gratis' | 'pago' | 'creadoras'

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

  useEffect(() => {
    let vivo = true
    setCargando(true)
    clipsPublicados(60).then(r => {
      if (!vivo) return
      setClips(r.datos); setFallo(r.fallo); setCargando(false)
    })
    return () => { vivo = false }
  }, [intento])

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

  const visibles = clips.filter(c =>
    filtro === 'todo' ? true :
    filtro === 'gratis' ? c.visibility === 'gratis' : c.visibility === 'pago')

  return (
    <div style={{ minHeight: '100%', background: COLOR.fondo, color: COLOR.texto, fontFamily: FUENTE.ui }}>
      <div style={{ padding: '46px 18px 0' }}>
        <Wordmark ancho={116} glow={14} />

        <div style={{ display: 'flex', gap: 7, marginBottom: 18 }}>
          {([['todo', 'Todo'], ['pago', 'De pago'], ['gratis', 'Gratis'],
             ['creadoras', 'Creadoras']] as [Filtro, string][]).map(([v, t]) => (
            <Pulsable key={v} al={() => setFiltro(v)} activado={filtro === v} style={{
              padding: '9px 13px', cursor: 'pointer',
              font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.6, textTransform: 'uppercase',
              background: filtro === v ? COLOR.acento : 'transparent',
              color: filtro === v ? COLOR.fondo : COLOR.textoSuave,
              border: `1px solid ${filtro === v ? COLOR.acento : LINEA.media}`,
            }}>{t}</Pulsable>
          ))}
        </div>
      </div>

      {filtro === 'creadoras' && (
        <div style={{ padding: '0 18px 14px' }}>
          <input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nombre"
            style={{
              width: '100%', boxSizing: 'border-box', background: 'transparent',
              color: COLOR.texto, border: `1px solid ${LINEA.suave}`, borderRadius: 0,
              padding: '11px 13px', font: `400 13px/1 ${FUENTE.ui}`, outline: 'none',
            }} />
        </div>
      )}

      <div style={{ padding: '0 18px 30px' }}>
        {filtro === 'creadoras' ? (
          gente.length === 0 ? (
            <Vacio texto={busca ? 'Nadie con ese nombre.' : 'Cargando…'} />
          ) : (
            <div style={{ display: 'grid', gap: 9 }}>
              {gente.map(g => (
                <Enlace key={g.id} a={`/creator/${g.handle}`} style={{
                  display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer',
                  padding: '12px 13px', border: `1px solid ${LINEA.tenue}`,
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', flex: '0 0 auto',
                    border: `1px solid ${LINEA.media}`,
                    background: g.avatar_path
                      ? `center/cover url(${urlAvatar(g.avatar_path)})`
                      : COLOR.superficieAlta,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: `400 16px/1.3 ${FUENTE.ui}` }}>
                      {g.display_name}
                      {g.identidad_verificada && (
                        <span style={{ marginLeft: 6, color: COLOR.dinero,
                          font: `400 12px/1 ${FUENTE.ui}` }}>✓</span>
                      )}
                    </div>
                    <div style={{ font: `400 10px/1.45 ${FUENTE.mono}`, color: COLOR.textoTenue }}>
                      @{g.handle}
                      {g.es_demo && (
                        <span style={{ color: COLOR.textoApagado }}> · demostración</span>
                      )}
                    </div>
                    {g.bio && (
                      <div style={{
                        marginTop: 4, font: `400 12px/1.45 ${FUENTE.ui}`, color: COLOR.textoSuave,
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
        ) : visibles.length === 0 ? (
          <Vacio
            texto={clips.length === 0
              ? 'Todavía nadie ha publicado nada.'
              : 'No hay clips con ese filtro.'}
            accion={perfil?.is_creator && clips.length === 0
              ? { texto: 'Publica el primero', al: () => nav('/upload') }
              : undefined}
          />
        ) : (
          /* Las columnas van en la hoja de estilos porque cambian con el
             ancho: dos en el telefono, y tantas como quepan de 220 en
             adelante. Fijas en dos, en una pantalla de computadora salian
             dos tarjetas de medio metro. */
          <div className="rejilla-clips">
            {visibles.map(c => {
              const p = portadaDe(c.id, urlPortada(c.cover_path))
              const f = urlAvatar(c.profiles?.avatar_path ?? null)
              const gratis = c.visibility === 'gratis'
              return (
                <div key={c.id}>
                  <TarjetaClip portada={p} tira={urlPortada(c.preview_path ?? null)}
                    a={`/clip/${c.id}`}>
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,transparent 40%,rgba(8,8,10,.92) 100%)' }} />
                    {c.es_demo && (
                      <span style={{
                        position: 'absolute', top: 8, left: 8,
                        background: COLOR.textoTenue, color: COLOR.fondo, padding: '4px 6px',
                        font: `700 9px/1 ${FUENTE.ui}`, letterSpacing: 1.2, textTransform: 'uppercase',
                      }}>Demo</span>
                    )}
                    <span style={{
                      position: 'absolute', top: 8, right: 8,
                      background: gratis ? COLOR.admin : COLOR.dinero, color: COLOR.fondo,
                      padding: '4px 6px', font: `700 9px/1 ${FUENTE.ui}`,
                      letterSpacing: 1.2, textTransform: 'uppercase',
                    }}>
                      {gratis ? 'Gratis' : c.visibility === 'suscriptores' ? 'Subs' : usd(c.price_coins)}
                    </span>
                    <div style={{ position: 'absolute', left: 9, right: 9, bottom: 9 }}>
                      <div style={{ font: `500 12px/1.3 ${FUENTE.ui}` }}>{c.title}</div>
                    </div>
                  </TarjetaClip>
                  {c.profiles && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7 }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: '50%', flex: '0 0 auto',
                        background: f ? `center/cover url(${f})` : COLOR.superficieAlta,
                        border: '1px solid rgba(255,255,255,.16)',
                      }} />
                      <span style={{
                        font: `400 10px/1.3 ${FUENTE.mono}`, color: COLOR.textoTenue,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>@{c.profiles.handle}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function Vacio({ texto, accion }: { texto: string; accion?: { texto: string; al: () => void } }) {
  return (
    <div style={{
      padding: '60px 20px', textAlign: 'center',
      border: '1px dashed rgba(255,255,255,.12)',
    }}>
      <div style={{ fontFamily: FUENTE.serif, fontStyle: 'italic', fontSize: 19, color: COLOR.textoSuave }}>{texto}</div>
      {accion && (
        <Pulsable al={accion.al} style={{
          marginTop: 18, display: 'inline-block', background: COLOR.acento, color: COLOR.fondo,
          padding: '14px 22px', font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.6,
          textTransform: 'uppercase', cursor: 'pointer',
        }}>{accion.texto}</Pulsable>
      )}
    </div>
  )
}
