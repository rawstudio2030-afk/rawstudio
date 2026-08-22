// Pantalla 17 — Verificación de identidad
//
// Hasta ahora el age gate era autodeclaracion: cualquiera tocaba "soy mayor de
// edad" y entraba. Eso basta para mirar, pero no para publicar: quien aparece
// en el contenido debe ser adulto comprobado, y esa es la parte que la ley no
// perdona.
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSesion } from '../lib/sesion'
import { supabase } from '../lib/supabase'
import Wordmark from '../components/Wordmark'

const UI = "'Space Grotesk', system-ui, sans-serif"
const MONO = "'Space Mono', monospace"
const SERIF = "'Instrument Serif', serif"

const SERVICIO = import.meta.env.VITE_VERIFICACION_URL as string | undefined

const etiqueta: React.CSSProperties = {
  font: `700 10px/1 ${UI}`, letterSpacing: 2.2, textTransform: 'uppercase', color: '#6E6A72',
}

// Misma validacion que el servicio, repetida aqui solo para avisar de inmediato.
// La que MANDA es la del servidor: esta se puede saltar editando el JavaScript.
const CURP_RE = /^[A-Z][AEIOUX][A-Z]{2}\d{6}[HMX][A-Z]{2}[B-DF-HJ-NP-TV-Z]{3}[0-9A-Z]\d$/

export default function Verificar() {
  const nav = useNavigate()
  const { sesion, perfil, cargando, refrescarPerfil } = useSesion()
  const refINE = useRef<HTMLInputElement>(null)
  const refSelfie = useRef<HTMLInputElement>(null)

  const [curp, setCurp] = useState('')
  const [ine, setIne] = useState<File | null>(null)
  const [selfie, setSelfie] = useState<File | null>(null)
  const [estado, setEstado] = useState<'listo' | 'enviando' | 'ok' | 'revision' | 'error'>('listo')
  const [detalle, setDetalle] = useState('')

  if (cargando) return <Centro texto="Cargando…" />
  if (!sesion) return <Centro texto="Necesitas entrar." accion={{ texto: 'Entrar', al: () => nav('/acceso') }} />
  if (perfil?.identidad_verificada) return (
    <Centro texto="Tu identidad ya está verificada." accion={{ texto: 'Ir al estudio', al: () => nav('/estudio') }} />
  )

  const curpOk = CURP_RE.test(curp.trim().toUpperCase())
  const puede = curpOk && !!ine && !!selfie && estado !== 'enviando'

  const enviar = async () => {
    if (!puede || !sesion) return
    if (!SERVICIO) {
      setEstado('error')
      setDetalle('El servicio de verificación aún no está desplegado.')
      return
    }
    setEstado('enviando'); setDetalle('')

    const cuerpo = new FormData()
    cuerpo.append('curp', curp.trim().toUpperCase())
    cuerpo.append('ine', ine!)
    cuerpo.append('selfie', selfie!)
    // El servicio necesita saber de quien es, y comprobarlo: se manda el token
    // de sesion, no el id, para que no se pueda verificar a nombre de otra.
    const { data } = await supabase.auth.getSession()

    try {
      const r = await fetch(`${SERVICIO}/verificar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${data.session?.access_token ?? ''}` },
        body: cuerpo,
      })
      const j = await r.json()

      if (r.ok && j.ok) {
        await refrescarPerfil()
        setEstado('ok'); return
      }
      if (j.paso === 'revision') { setEstado('revision'); return }
      setEstado('error')
      setDetalle(j.motivo ?? 'No pudimos completar la verificación.')
    } catch {
      setEstado('error')
      setDetalle('No pudimos contactar el servicio de verificación. Intenta más tarde.')
    }
  }

  if (estado === 'ok' || estado === 'revision') return (
    <Centro
      titulo={estado === 'ok' ? ['Listo,', 'ya', 'quedó.'] : ['Lo estamos', 'revisando', 'a mano.']}
      texto={estado === 'ok'
        ? 'Tu identidad quedó verificada. Ya puedes publicar y cobrar.'
        : 'El cotejo no fue concluyente, así que lo revisa una persona. Te avisamos por correo, normalmente el mismo día.'}
      accion={{ texto: 'Volver al estudio', al: () => nav('/estudio') }}
    />
  )

  return (
    <div style={{
      minHeight: '100%', boxSizing: 'border-box', padding: '54px 22px 40px',
      background: '#08080A', color: '#F2F0F3', fontFamily: UI,
      display: 'flex', flexDirection: 'column', gap: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Wordmark ancho={116} glow={14} />
        <span onClick={() => nav('/estudio')} style={{ font: `400 26px/1 ${UI}`, color: '#9C979F', cursor: 'pointer' }}>×</span>
      </div>

      <div>
        <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 40, lineHeight: 1, textTransform: 'uppercase' }}>
          Comprueba<br />que eres<br /><span style={{ color: '#C8FF3D' }}>tú.</span>
        </div>
        <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 18, lineHeight: 1.4, color: '#9C979F', marginTop: 14 }}>
          Solo hace falta una vez, y solo para publicar o cobrar. Quien únicamente mira no pasa por aquí.
        </div>
      </div>

      {/* Lo que se promete en la pagina de creadoras, dicho aqui donde importa. */}
      <div style={{
        border: '1.5px dashed rgba(200,255,61,.4)', background: 'rgba(200,255,61,.05)',
        padding: '16px 15px',
      }}>
        <div style={{ ...etiqueta, color: '#C8FF3D' }}>Qué hacemos con esto</div>
        <div style={{ font: `400 13.5px/1.6 ${UI}`, color: '#F2F0F3', marginTop: 9 }}>
          Las fotos se revisan <b>en memoria</b> y no se guardan. De todo esto solo
          conservamos que eres mayor de edad y la fecha.
        </div>
        <div style={{ font: `400 11.5px/1.6 ${MONO}`, color: '#6E6A72', marginTop: 9 }}>
          Única excepción: si el cotejo no es concluyente, las guardamos hasta que
          una persona lo revise, y se borran al resolverlo.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={etiqueta}>CURP</span>
        <input value={curp} maxLength={18}
          onChange={e => { setCurp(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')); if (estado === 'error') setEstado('listo') }}
          placeholder="18 caracteres"
          style={{
            width: '100%', boxSizing: 'border-box', background: '#111116',
            border: `1px solid ${curp.length === 18 && !curpOk ? '#FF2BD1' : 'rgba(255,255,255,.14)'}`,
            color: '#F2F0F3', font: `400 16px/1 ${MONO}`, letterSpacing: 1.5,
            padding: '17px 15px', outline: 'none',
          }} />
        <span style={{ font: `400 11px/1.5 ${MONO}`, color: curp.length === 18 && !curpOk ? '#FF2BD1' : '#5E5A63' }}>
          {curp.length === 18 && !curpOk
            ? 'Esa CURP no es válida. Revisa que esté completa.'
            : 'De aquí sale tu fecha de nacimiento.'}
        </span>
      </div>

      <Foto etiqueta="Tu INE" nota="La cara frontal, completa y sin reflejos"
        archivo={ine} refInput={refINE} camara="environment"
        onElegir={f => { setIne(f); if (estado === 'error') setEstado('listo') }} />

      <Foto etiqueta="Selfie" nota="De frente, con buena luz y sin lentes oscuros"
        archivo={selfie} refInput={refSelfie} camara="user"
        onElegir={f => { setSelfie(f); if (estado === 'error') setEstado('listo') }} />

      {estado === 'error' && (
        <div style={{ font: `400 13px/1.5 ${UI}`, color: '#FF2BD1' }}>{detalle}</div>
      )}

      <div onClick={enviar} style={{
        marginTop: 'auto', background: puede ? '#FF2BD1' : '#191920',
        color: puede ? '#08080A' : '#5E5A63', textAlign: 'center', padding: 19,
        font: `700 13px/1 ${UI}`, letterSpacing: 2.2, textTransform: 'uppercase',
        boxShadow: puede ? '0 0 34px rgba(255,43,209,.42)' : 'none',
        cursor: puede ? 'pointer' : 'default',
      }}>
        {estado === 'enviando' ? 'Verificando…' : 'Enviar para verificar'}
      </div>
    </div>
  )
}

function Foto({ etiqueta: et, nota, archivo, refInput, camara, onElegir }: {
  etiqueta: string; nota: string; archivo: File | null
  refInput: React.RefObject<HTMLInputElement | null>
  camara: 'user' | 'environment'; onElegir: (f: File) => void
}) {
  return (
    <>
      <div onClick={() => refInput.current?.click()} style={{
        display: 'flex', alignItems: 'center', gap: 13, cursor: 'pointer',
        border: `1px ${archivo ? 'solid' : 'dashed'} rgba(255,255,255,${archivo ? '.2' : '.16'})`,
        background: archivo ? 'rgba(200,255,61,.05)' : 'transparent', padding: 14,
      }}>
        <div style={{
          width: 52, height: 52, flex: '0 0 auto',
          background: archivo ? `center/cover url(${URL.createObjectURL(archivo)})`
                              : 'repeating-linear-gradient(130deg,#191920 0 8px,#111116 8px 16px)',
        }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ ...etiquetaBase, color: archivo ? '#C8FF3D' : '#6E6A72' }}>
            {archivo ? `${et} · listo` : et}
          </div>
          <div style={{ font: `400 11.5px/1.5 ${MONO}`, color: '#5E5A63', marginTop: 6 }}>{nota}</div>
        </div>
      </div>
      {/* capture abre la camara directo en movil, que es donde se hace esto */}
      <input ref={refInput} type="file" accept="image/*" capture={camara}
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onElegir(f) }} />
    </>
  )
}

const etiquetaBase: React.CSSProperties = {
  font: `700 10px/1 ${UI}`, letterSpacing: 2.2, textTransform: 'uppercase',
}

function Centro({ titulo, texto, accion }: {
  titulo?: string[]; texto: string; accion?: { texto: string; al: () => void }
}) {
  return (
    <div style={{
      minHeight: '100%', boxSizing: 'border-box', padding: '64px 26px',
      background: '#08080A', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 20, textAlign: 'center',
    }}>
      {titulo && (
        <div style={{
          fontFamily: 'Anton, sans-serif', fontSize: 42, lineHeight: 1,
          textTransform: 'uppercase', color: '#F2F0F3',
        }}>
          {titulo[0]}<br />{titulo[1]}<br /><span style={{ color: '#C8FF3D' }}>{titulo[2]}</span>
        </div>
      )}
      <div style={{
        fontFamily: SERIF, fontStyle: 'italic', fontSize: 19, lineHeight: 1.4,
        color: '#9C979F', maxWidth: 330,
      }}>{texto}</div>
      {accion && (
        <span onClick={accion.al} style={{
          background: '#FF2BD1', color: '#08080A', padding: '15px 26px',
          font: `700 12px/1 ${UI}`, letterSpacing: 2, textTransform: 'uppercase',
          cursor: 'pointer',
        }}>{accion.texto}</span>
      )}
    </div>
  )
}
