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
import { COLOR, FUENTE } from '../lib/diseño'


const COLOR_ESTADO: Record<Canal['estado'], string> = {
  listo: COLOR.dinero,
  sin_configurar: COLOR.admin,
  en_obra: COLOR.textoTenue,
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
      background: COLOR.fondo, color: COLOR.texto, fontFamily: FUENTE.ui,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <span onClick={() => nav('/perfil')} style={{ font: `400 26px/1 ${FUENTE.ui}`, color: COLOR.textoSuave, cursor: 'pointer' }}>‹</span>
        <span style={{ font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 2.2, textTransform: 'uppercase', color: COLOR.dinero }}>
          Estudio
        </span>
        <span style={{ width: 14 }} />
      </div>

      <div style={{ fontFamily: FUENTE.display, fontSize: 40, lineHeight: 1, textTransform: 'uppercase', marginBottom: 8 }}>
        Seis formas<br /><span style={{ color: COLOR.dinero }}>de ganar</span>
      </div>
      <div style={{ fontFamily: FUENTE.serif, fontStyle: 'italic', fontSize: 18, lineHeight: 1.35, color: COLOR.textoSuave, marginBottom: 24 }}>
        No tienes que usarlas todas. Empieza por una y ve sumando.
      </div>

      {/* Aviso de verificacion. Va ANTES que todo lo demas: sin esto, la
          creadora llena el formulario de subida y hasta el final se topa con un
          rechazo que no explica nada. Mejor decirselo al entrar. */}
      {!perfil.identidad_verificada && (
        <div onClick={() => nav('/verificar')} style={{
          border: `1.5px solid ${COLOR.acento}`, background: 'rgba(255,43,209,.08)',
          padding: '18px 16px', marginBottom: 22, cursor: 'pointer',
        }}>
          <div style={{ font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 2.2, textTransform: 'uppercase', color: COLOR.acento }}>
            Falta verificar tu identidad
          </div>
          <div style={{ font: `400 14px/1.5 ${FUENTE.ui}`, color: COLOR.texto, marginTop: 9 }}>
            Para publicar y para cobrar necesitamos comprobar que eres mayor de edad. Es una sola vez.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 12 }}>
            <span style={{ font: `400 11px/1.5 ${FUENTE.mono}`, color: COLOR.textoTenue }}>
              Toma dos minutos
            </span>
            <span style={{ font: `700 14px/1 ${FUENTE.ui}`, color: COLOR.acento }}>&#8594;</span>
          </div>
        </div>
      )}

      {/* ganancias acumuladas */}
      <div onClick={() => nav('/wallet')} style={{
        border: '1px solid rgba(255,255,255,.12)', padding: '18px 16px',
        marginBottom: 24, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 2.2, textTransform: 'uppercase', color: COLOR.textoTenue }}>
            Has ganado
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 9 }}>
            <span style={{ fontFamily: FUENTE.display, fontSize: 34, lineHeight: 1, color: COLOR.dinero }}>{r.ganancias}</span>
            <span style={{ font: `400 12px/1 ${FUENTE.mono}`, color: COLOR.textoTenue, textTransform: 'uppercase', letterSpacing: 1.4 }}>dólares</span>
          </div>
        </div>
        <span style={{ color: COLOR.textoApagado }}>›</span>
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
              <span style={{ width: 24, textAlign: 'center', fontSize: 16, color: COLOR_ESTADO[c.estado], marginTop: 1 }}>
                {c.icono}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ font: `600 15px/1.3 ${FUENTE.ui}` }}>{c.titulo}</span>
                  <span style={{
                    font: `700 8.5px/1 ${FUENTE.ui}`, letterSpacing: 1.2, textTransform: 'uppercase',
                    color: c.estado === 'listo' ? COLOR.fondo : COLOR_ESTADO[c.estado],
                    background: c.estado === 'listo' ? COLOR.dinero : 'transparent',
                    border: c.estado === 'listo' ? 'none' : `1px solid ${COLOR_ESTADO[c.estado]}`,
                    padding: '4px 6px',
                  }}>{LEYENDA[c.estado]}</span>
                </div>
                <div style={{ font: `400 12.5px/1.5 ${FUENTE.ui}`, color: COLOR.textoSuave, marginTop: 5 }}>
                  {c.descripcion}
                </div>
                {c.nota && (
                  <div style={{ font: `400 11px/1.5 ${FUENTE.mono}`, color: COLOR.textoApagado, marginTop: 5 }}>
                    {c.nota}
                  </div>
                )}
              </div>
              {activo && <span style={{ color: COLOR.textoApagado, marginTop: 2 }}>›</span>}
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
