// Pantalla 02 — Explorar
//
// La pantalla que faltaba. Hasta ahora "Explorar" abria un solo clip: no habia
// donde ver QUE HAY, asi que aunque alguien publicara, nadie lo encontraba.
// Es el hueco estructural del set original: nunca se diseño un catalogo.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSesion } from '../lib/sesion'
import { clipsPublicados, urlPortada, type ClipConAutora } from '../lib/clips'
import { urlAvatar } from '../lib/perfiles'
import { portadaDe } from '../lib/portadas'
import Wordmark from '../components/Wordmark'

const UI = "'Space Grotesk', system-ui, sans-serif"
const MONO = "'Space Mono', monospace"
const SERIF = "'Instrument Serif', serif"

type Filtro = 'todo' | 'gratis' | 'pago'

export default function Explorar() {
  const nav = useNavigate()
  const { perfil } = useSesion()
  const [clips, setClips] = useState<ClipConAutora[]>([])
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro] = useState<Filtro>('todo')

  useEffect(() => {
    let vivo = true
    clipsPublicados(60).then(c => { if (vivo) { setClips(c); setCargando(false) } })
    return () => { vivo = false }
  }, [])

  const visibles = clips.filter(c =>
    filtro === 'todo' ? true :
    filtro === 'gratis' ? c.visibility === 'gratis' : c.visibility === 'pago')

  return (
    <div style={{ minHeight: '100%', background: '#08080A', color: '#F2F0F3', fontFamily: UI }}>
      <div style={{ padding: '46px 18px 0' }}>
        <Wordmark ancho={116} glow={14} />

        <div style={{ display: 'flex', gap: 7, marginBottom: 18 }}>
          {([['todo', 'Todo'], ['pago', 'De pago'], ['gratis', 'Gratis']] as [Filtro, string][]).map(([v, t]) => (
            <span key={v} onClick={() => setFiltro(v)} style={{
              padding: '9px 13px', cursor: 'pointer',
              font: `700 10px/1 ${UI}`, letterSpacing: 1.6, textTransform: 'uppercase',
              background: filtro === v ? '#FF2BD1' : 'transparent',
              color: filtro === v ? '#08080A' : '#9C979F',
              border: `1px solid ${filtro === v ? '#FF2BD1' : 'rgba(255,255,255,.14)'}`,
            }}>{t}</span>
          ))}
        </div>
      </div>

      <div style={{ padding: '0 18px 30px' }}>
        {cargando ? (
          <Vacio texto="Cargando…" />
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 11 }}>
            {visibles.map(c => {
              const p = portadaDe(c.id, urlPortada(c.cover_path))
              const f = urlAvatar(c.profiles?.avatar_path ?? null)
              const gratis = c.visibility === 'gratis'
              return (
                <div key={c.id} onClick={() => nav(`/clip/${c.id}`)} style={{ cursor: 'pointer' }}>
                  <div style={{
                    aspectRatio: '3/4', position: 'relative', overflow: 'hidden',
                    background: `center/cover url("${p}")`,
                  }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,transparent 40%,rgba(8,8,10,.92) 100%)' }} />
                    {c.es_demo && (
                      <span style={{
                        position: 'absolute', top: 8, left: 8,
                        background: '#6E6A72', color: '#08080A', padding: '4px 6px',
                        font: `700 8.5px/1 ${UI}`, letterSpacing: 1.1, textTransform: 'uppercase',
                      }}>Demo</span>
                    )}
                    <span style={{
                      position: 'absolute', top: 8, right: 8,
                      background: gratis ? '#00E5FF' : '#C8FF3D', color: '#08080A',
                      padding: '4px 6px', font: `700 8.5px/1 ${UI}`,
                      letterSpacing: 1.1, textTransform: 'uppercase',
                    }}>
                      {gratis ? 'Gratis' : c.visibility === 'suscriptores' ? 'Subs' : `${c.price_coins}`}
                    </span>
                    <div style={{ position: 'absolute', left: 9, right: 9, bottom: 9 }}>
                      <div style={{ font: `600 12.5px/1.3 ${UI}` }}>{c.title}</div>
                    </div>
                  </div>
                  {c.profiles && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7 }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: '50%', flex: '0 0 auto',
                        background: f ? `center/cover url(${f})` : '#191920',
                        border: '1px solid rgba(255,255,255,.16)',
                      }} />
                      <span style={{
                        font: `400 11px/1.3 ${MONO}`, color: '#6E6A72',
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
      <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 19, color: '#9C979F' }}>{texto}</div>
      {accion && (
        <div onClick={accion.al} style={{
          marginTop: 18, display: 'inline-block', background: '#FF2BD1', color: '#08080A',
          padding: '14px 22px', font: `700 11px/1 ${UI}`, letterSpacing: 1.8,
          textTransform: 'uppercase', cursor: 'pointer',
        }}>{accion.texto}</div>
      )}
    </div>
  )
}
