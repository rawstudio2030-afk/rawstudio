// Pantalla 15 — Estudio de creadora
//
// El estudio solo ofrecia "publicar un clip", aunque la plataforma promete
// varias formas de ganar. Aqui estan, cada una diciendo si ya se puede usar:
// mostrar lo que falta es mas util que esconderlo, porque una creadora que no
// encuentra un canal asume que no existe.
//
// ---------- Pero no todas son lo mismo ----------
//
// La lista trataba igual «subir un clip», que se hace mil veces, y «define tu
// nivel de suscripcion», que se hace una. Esa mezcla es lo que hacia que el
// estudio pareciera un panel de configuracion en vez de un sitio de trabajo:
// cada vez que entrabas a publicar, pasabas por encima de ajustes que ya
// habias dejado resueltos hacia meses.
//
// Ahora van en dos grupos —`hacer` y `ajustar`, ver src/lib/estudio.ts— y el
// segundo va despues y en voz mas baja. Y dentro de `ajustar`, la cuenta para
// cobrar solo aparece MIENTRAS NO EXISTA: lo que ya esta hecho se esconde, lo
// que falta y bloquea dinero se queda a la vista.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSesion } from '../lib/sesion'
import { resumen, canales, type Canal, type ResumenEstudio } from '../lib/estudio'
import { usd } from '../lib/dinero'
import { COLOR, FUENTE } from '../lib/diseño'
import { Pulsable, Enlace } from '../components/Pulsable'


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
  const hacer = lista.filter(c => c.grupo === 'hacer')
  const ajustar = lista.filter(c => c.grupo === 'ajustar')

  return (
    <div style={{
      minHeight: '100%', boxSizing: 'border-box', padding: '54px 20px 40px',
      background: COLOR.fondo, color: COLOR.texto, fontFamily: FUENTE.ui,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
        <Enlace a="/perfil" rotulo="Volver" style={{ font: `400 26px/1 ${FUENTE.ui}`, color: COLOR.textoSuave, cursor: 'pointer' }}>‹</Enlace>
        <span style={{ font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 2.2, textTransform: 'uppercase', color: COLOR.dinero }}>
          Estudio
        </span>
        <span style={{ width: 14 }} />
      </div>

      {/* El numero salio del titular a proposito: decia «seis formas» y la
          lista ya no tiene seis, porque dos eran la misma cosa contada dos
          veces. Un numero en un titular es una promesa que hay que mantener
          sincronizada con un array, y se desincroniza siempre. */}
      <div style={{ fontFamily: FUENTE.display, fontSize: 38, lineHeight: 1, textTransform: 'uppercase', marginBottom: 8 }}>
        Formas<br /><span style={{ color: COLOR.dinero }}>de ganar</span>
      </div>
      <div style={{ fontFamily: FUENTE.serif, fontStyle: 'italic', fontSize: 19, lineHeight: 1.3, color: COLOR.textoSuave, marginBottom: 24 }}>
        No tienes que usarlas todas. Empieza por una y ve sumando.
      </div>

      {/* Aviso de verificacion. Va ANTES que todo lo demas: sin esto, la
          creadora llena el formulario de subida y hasta el final se topa con un
          rechazo que no explica nada. Mejor decirselo al entrar. */}
      {!perfil.identidad_verificada && (
        <Enlace a="/verificar" style={{
          display: 'block', boxSizing: 'border-box', width: '100%',
          border: `1.5px solid ${COLOR.acento}`, background: 'rgba(255,43,209,.08)',
          padding: '18px 16px', marginBottom: 22, cursor: 'pointer',
        }}>
          <div style={{ font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 2.2, textTransform: 'uppercase', color: COLOR.acento }}>
            Falta verificar tu identidad
          </div>
          <div style={{ font: `400 13px/1.45 ${FUENTE.ui}`, color: COLOR.texto, marginTop: 9 }}>
            Para publicar y para cobrar necesitamos comprobar que eres mayor de edad. Es una sola vez.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 12 }}>
            <span style={{ font: `400 10px/1.45 ${FUENTE.mono}`, color: COLOR.textoTenue }}>
              Toma dos minutos
            </span>
            <span style={{ font: `700 13px/1 ${FUENTE.ui}`, color: COLOR.acento }}>&#8594;</span>
          </div>
        </Enlace>
      )}

      {/* ganancias acumuladas */}
      <Enlace a="/wallet" style={{
        boxSizing: 'border-box', width: '100%',
        border: '1px solid rgba(255,255,255,.12)', padding: '18px 16px',
        marginBottom: 24, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 2.2, textTransform: 'uppercase', color: COLOR.textoTenue }}>
            Has ganado
          </div>
          {/* usd() y no el entero en crudo: el libro guarda CENTAVOS. Asi
              como estaba, haber ganado 2.40 se leia como «240 dólares». */}
          <div style={{ marginTop: 9 }}>
            <span style={{ fontFamily: FUENTE.display, fontSize: 32, lineHeight: 1, color: COLOR.dinero }}>
              {usd(r.ganancias)}
            </span>
          </div>
        </div>
        <span style={{ color: COLOR.textoApagado }}>›</span>
      </Enlace>

      <Lista canales={hacer} nav={nav} />

      {ajustar.length > 0 && (
        <>
          {/* El rotulo y el espacio son todo lo que separa «lo que haces» de
              «lo que configuraste una vez». No hace falta esconderlo detras de
              un toque: basta con que no compita. */}
          <div style={{
            font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 2.2,
            textTransform: 'uppercase', color: COLOR.textoTenue,
            margin: '30px 0 12px',
          }}>
            Ajustes de tu estudio
          </div>
          <Lista canales={ajustar} nav={nav} />
        </>
      )}
    </div>
  )
}

function Lista({ canales, nav }: { canales: Canal[]; nav: (r: string) => void }) {
  return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {canales.map(c => {
          const activo = c.estado !== 'en_obra'
          return (
            <Pulsable key={c.clave}
              al={() => { if (c.ruta) nav(c.ruta) }}
              activo={activo && !!c.ruta}
              style={{
                boxSizing: 'border-box', width: '100%', textAlign: 'left',
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
                  <span style={{ font: `500 16px/1.3 ${FUENTE.ui}` }}>{c.titulo}</span>
                  <span style={{
                    font: `700 9px/1 ${FUENTE.ui}`, letterSpacing: 1.2, textTransform: 'uppercase',
                    color: c.estado === 'listo' ? COLOR.fondo : COLOR_ESTADO[c.estado],
                    background: c.estado === 'listo' ? COLOR.dinero : 'transparent',
                    border: c.estado === 'listo' ? 'none' : `1px solid ${COLOR_ESTADO[c.estado]}`,
                    padding: '4px 6px',
                  }}>{LEYENDA[c.estado]}</span>
                </div>
                <div style={{ font: `400 12px/1.45 ${FUENTE.ui}`, color: COLOR.textoSuave, marginTop: 5 }}>
                  {c.descripcion}
                </div>
                {c.nota && (
                  <div style={{ font: `400 10px/1.45 ${FUENTE.mono}`, color: COLOR.textoApagado, marginTop: 5 }}>
                    {c.nota}
                  </div>
                )}
              </div>
              {activo && <span style={{ color: COLOR.textoApagado, marginTop: 2 }}>›</span>}
            </Pulsable>
          )
        })}
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
