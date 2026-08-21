// Pantalla 15 — Estudio de creadora
//
// El estudio solo ofrecia "publicar un clip", aunque la plataforma promete
// siete formas de ganar. Aqui estan las siete, cada una diciendo si ya se puede
// usar: mostrar lo que falta es mas util que esconderlo, porque una creadora
// que no encuentra un canal asume que no existe.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSesion } from '../lib/sesion'
import { resumen, canales, type Canal, type ResumenEstudio } from '../lib/estudio'

const UI = "'Space Grotesk', system-ui, sans-serif"
const MONO = "'Space Mono', monospace"
const SERIF = "'Instrument Serif', serif"

const COLOR: Record<Canal['estado'], string> = {
  listo: '#C8FF3D',
  sin_configurar: '#00E5FF',
  en_obra: '#6E6A72',
}
const LEYENDA: Record<Canal['estado'], string> = {
  listo: 'Activo',
  sin_configurar: 'Sin configurar',
  en_obra: 'En construcción',
}

export default function Estudio() {
  const nav = useNavigate()
  const { sesion, perfil, cargando } = useSesion()
  const [r, setR] = useState<ResumenEstudio | null>(null)

  useEffect(() => {
    if (cargando || !sesion) return
    let vivo = true
    resumen(sesion.user.id).then(x => { if (vivo) setR(x) })
    return () => { vivo = false }
  }, [sesion, cargando])

  if (cargando) return <Centro texto="Cargando…" />
  if (!perfil?.is_creator) return (
    <Centro
      texto="Activa tu perfil de creadora para abrir el estudio."
      accion={{ texto: 'Ir a mi perfil', al: () => nav('/perfil') }}
    />
  )
  if (!r) return <Centro texto="Cargando…" />

  const lista = canales(r)

  return (
    <div style={{
      minHeight: '100%', boxSizing: 'border-box', padding: '54px 20px 40px',
      background: '#08080A', color: '#F2F0F3', fontFamily: UI,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <span onClick={() => nav('/perfil')} style={{ font: `400 26px/1 ${UI}`, color: '#9C979F', cursor: 'pointer' }}>‹</span>
        <span style={{ font: `700 10px/1 ${UI}`, letterSpacing: 2.2, textTransform: 'uppercase', color: '#C8FF3D' }}>
          Estudio
        </span>
        <span style={{ width: 14 }} />
      </div>

      <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 40, lineHeight: 1, textTransform: 'uppercase', marginBottom: 8 }}>
        Siete formas<br /><span style={{ color: '#C8FF3D' }}>de ganar</span>
      </div>
      <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 18, lineHeight: 1.35, color: '#9C979F', marginBottom: 24 }}>
        No tienes que usarlas todas. Empieza por una y ve sumando.
      </div>

      {/* ganancias acumuladas */}
      <div onClick={() => nav('/wallet')} style={{
        border: '1px solid rgba(255,255,255,.12)', padding: '18px 16px',
        marginBottom: 24, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ font: `700 10px/1 ${UI}`, letterSpacing: 2.2, textTransform: 'uppercase', color: '#6E6A72' }}>
            Has ganado
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 9 }}>
            <span style={{ fontFamily: 'Anton, sans-serif', fontSize: 34, lineHeight: 1, color: '#C8FF3D' }}>{r.ganancias}</span>
            <span style={{ font: `400 12px/1 ${MONO}`, color: '#6E6A72', textTransform: 'uppercase', letterSpacing: 1.4 }}>coins</span>
          </div>
        </div>
        <span style={{ color: '#5E5A63' }}>›</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {lista.map(c => {
          const activo = c.estado !== 'en_obra'
          return (
            <div key={c.clave}
              onClick={() => { if (activo && c.ruta) nav(c.ruta) }}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 14, padding: '17px 14px',
                border: '1px solid rgba(255,255,255,.09)',
                cursor: activo ? 'pointer' : 'default',
                opacity: activo ? 1 : .58,
              }}>
              <span style={{ width: 24, textAlign: 'center', fontSize: 16, color: COLOR[c.estado], marginTop: 1 }}>
                {c.icono}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ font: `600 15px/1.3 ${UI}` }}>{c.titulo}</span>
                  <span style={{
                    font: `700 8.5px/1 ${UI}`, letterSpacing: 1.2, textTransform: 'uppercase',
                    color: c.estado === 'listo' ? '#08080A' : COLOR[c.estado],
                    background: c.estado === 'listo' ? '#C8FF3D' : 'transparent',
                    border: c.estado === 'listo' ? 'none' : `1px solid ${COLOR[c.estado]}`,
                    padding: '4px 6px',
                  }}>{LEYENDA[c.estado]}</span>
                </div>
                <div style={{ font: `400 12.5px/1.5 ${UI}`, color: '#9C979F', marginTop: 5 }}>
                  {c.descripcion}
                </div>
                {c.nota && (
                  <div style={{ font: `400 11px/1.5 ${MONO}`, color: '#5E5A63', marginTop: 5 }}>
                    {c.nota}
                  </div>
                )}
              </div>
              {activo && <span style={{ color: '#5E5A63', marginTop: 2 }}>›</span>}
            </div>
          )
        })}
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
