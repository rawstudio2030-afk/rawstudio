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
import { COLOR, LINEA, TINTE, FUENTE } from '../lib/diseño'


const SERVICIO = import.meta.env.VITE_VERIFICACION_URL as string | undefined

const etiqueta: React.CSSProperties = {
  font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 2.2, textTransform: 'uppercase', color: COLOR.textoTenue,
}

/** Edad a partir de la fecha. Se calcula tambien aqui para avisar de inmediato,
 *  pero la que MANDA es la del servidor: esta se puede saltar editando el
 *  JavaScript. */
function edadDe(iso: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null
  const n = new Date(iso + 'T00:00:00')
  if (isNaN(n.getTime())) return null
  const hoy = new Date()
  let e = hoy.getFullYear() - n.getFullYear()
  const m = hoy.getMonth() - n.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < n.getDate())) e--
  return e
}

export default function Verificar() {
  const nav = useNavigate()
  const { sesion, perfil, cargando, refrescarPerfil } = useSesion()
  const refINE = useRef<HTMLInputElement>(null)
  const refSelfie = useRef<HTMLInputElement>(null)

  const [nacimiento, setNacimiento] = useState('')
  const [documento, setDocumento] = useState('')
  const [ine, setIne] = useState<File | null>(null)
  const [selfie, setSelfie] = useState<File | null>(null)
  const [estado, setEstado] = useState<'listo' | 'enviando' | 'ok' | 'revision' | 'error'>('listo')
  const [detalle, setDetalle] = useState('')

  if (cargando) return <Centro texto="Cargando…" />
  if (!sesion) return <Centro texto="Necesitas entrar." accion={{ texto: 'Entrar', al: () => nav('/acceso') }} />
  if (perfil?.identidad_verificada) return (
    <Centro texto="Tu identidad ya está verificada." accion={{ texto: 'Ir al estudio', al: () => nav('/estudio') }} />
  )

  const edad = edadDe(nacimiento)
  const edadOk = edad !== null && edad >= 18 && edad <= 120
  const puede = edadOk && !!ine && !!selfie && estado !== 'enviando'

  /** Sube las imagenes al bucket privado y abre una revision manual.
   *
   *  Es el camino por omision mientras no exista el microservicio: con pocas
   *  creadoras, la revision humana es MAS confiable que un cotejo open source
   *  —lo que no es, es escalable, y eso todavia no importa—. */
  const enviarParaRevision = async () => {
    if (!sesion) return
    const base = sesion.user.id
    const sello = Date.now()
    const subir = async (f: File, nombre: string) => {
      const ext = (f.name.split('.').pop() || 'jpg').toLowerCase()
      const ruta = `${base}/${sello}-${nombre}.${ext}`
      const { error } = await supabase.storage.from('verificacion')
        .upload(ruta, f, { contentType: f.type, upsert: false })
      if (error) throw new Error(error.message)
      return ruta
    }
    const rutaIne = await subir(ine!, 'ine')
    const rutaSelfie = await subir(selfie!, 'selfie')
    const { error } = await supabase.rpc('solicitar_verificacion_v2', {
      nacimiento, ine: rutaIne, selfie: rutaSelfie,
      documento: documento.trim() || null,
    })
    if (error) throw new Error(error.message)
  }

  const enviar = async () => {
    if (!puede || !sesion) return
    setEstado('enviando'); setDetalle('')

    // Sin microservicio configurado, va directo a revision manual.
    if (!SERVICIO) {
      try { await enviarParaRevision(); setEstado('revision') }
      catch (e) { setEstado('error'); setDetalle((e as Error).message) }
      return
    }

    const cuerpo = new FormData()
    cuerpo.append('nacimiento', nacimiento)
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
      background: COLOR.fondo, color: COLOR.texto, fontFamily: FUENTE.ui,
      display: 'flex', flexDirection: 'column', gap: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Wordmark ancho={116} glow={14} />
        <span onClick={() => nav('/estudio')} style={{ font: `400 26px/1 ${FUENTE.ui}`, color: COLOR.textoSuave, cursor: 'pointer' }}>×</span>
      </div>

      <div>
        <div style={{ fontFamily: FUENTE.display, fontSize: 40, lineHeight: 1, textTransform: 'uppercase' }}>
          Comprueba<br />que eres<br /><span style={{ color: COLOR.dinero }}>tú.</span>
        </div>
        <div style={{ fontFamily: FUENTE.serif, fontStyle: 'italic', fontSize: 18, lineHeight: 1.4, color: COLOR.textoSuave, marginTop: 14 }}>
          Solo hace falta una vez, y solo para publicar o cobrar. Quien únicamente mira no pasa por aquí.
        </div>
      </div>

      {/* Lo que se promete en la pagina de creadoras, dicho aqui donde importa. */}
      <div style={{
        border: '1.5px dashed rgba(200,255,61,.4)', background: TINTE.dinero,
        padding: '16px 15px',
      }}>
        <div style={{ ...etiqueta, color: COLOR.dinero }}>Qué hacemos con esto</div>
        <div style={{ font: `400 13.5px/1.6 ${FUENTE.ui}`, color: COLOR.texto, marginTop: 9 }}>
          {SERVICIO
            ? <>Las fotos se revisan <b>en memoria</b> y no se guardan. De todo esto solo conservamos que eres mayor de edad y la fecha.</>
            : <>Una persona del equipo revisa tus fotos y las <b>borra al terminar</b>. De todo esto solo conservamos que eres mayor de edad y la fecha.</>}
        </div>
        <div style={{ font: `400 11.5px/1.6 ${FUENTE.mono}`, color: COLOR.textoTenue, marginTop: 9 }}>
          {SERVICIO
            ? 'Única excepción: si el cotejo no es concluyente, las guardamos hasta que una persona lo revise, y se borran al resolverlo.'
            : 'Tu documento nunca se guarda completo, solo una huella que no permite reconstruirlo.'}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={etiqueta}>Fecha de nacimiento</span>
        <input type="date" value={nacimiento} max={new Date().toISOString().slice(0, 10)}
          onChange={e => { setNacimiento(e.target.value); if (estado === 'error') setEstado('listo') }}
          style={{
            width: '100%', boxSizing: 'border-box', background: COLOR.superficie,
            border: `1px solid ${nacimiento && !edadOk ? COLOR.acento : LINEA.media}`,
            color: COLOR.texto, font: `400 16px/1 ${FUENTE.ui}`,
            padding: '16px 15px', outline: 'none', colorScheme: 'dark',
          }} />
        <span style={{ font: `400 11px/1.5 ${FUENTE.mono}`, color: nacimiento && !edadOk ? COLOR.acento : COLOR.textoApagado }}>
          {!nacimiento ? 'Debe coincidir con tu identificación.'
            : !edadOk ? 'Necesitas 18 años o más para publicar.'
            : `${edad} años.`}
        </span>
      </div>

      {/* Opcional a proposito: sirve para detectar que una misma persona abrio
          dos cuentas, pero exigirlo dejaria fuera a quien no trae su documento
          a la mano o viene de otro pais. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={etiqueta}>Número de documento · opcional</span>
        <input value={documento} maxLength={30}
          onChange={e => setDocumento(e.target.value.toUpperCase())}
          placeholder="CURP, pasaporte o el que uses"
          style={{
            width: '100%', boxSizing: 'border-box', background: COLOR.superficie,
            border: '1px solid rgba(255,255,255,.14)', color: COLOR.texto,
            font: `400 15px/1 ${FUENTE.mono}`, letterSpacing: 1, padding: '16px 15px', outline: 'none',
          }} />
        <span style={{ font: `400 11px/1.5 ${FUENTE.mono}`, color: COLOR.textoApagado }}>
          Solo guardamos una huella, nunca el número.
        </span>
      </div>

      <Foto etiqueta="Tu identificación" nota="INE, pasaporte o cédula. Completa y sin reflejos"
        archivo={ine} refInput={refINE} camara="environment"
        onElegir={f => { setIne(f); if (estado === 'error') setEstado('listo') }} />

      <Foto etiqueta="Selfie" nota="De frente, con buena luz y sin lentes oscuros"
        archivo={selfie} refInput={refSelfie} camara="user"
        onElegir={f => { setSelfie(f); if (estado === 'error') setEstado('listo') }} />

      {estado === 'error' && (
        <div style={{ font: `400 13px/1.5 ${FUENTE.ui}`, color: COLOR.acento }}>{detalle}</div>
      )}

      <div onClick={enviar} style={{
        marginTop: 'auto', background: puede ? COLOR.acento : COLOR.superficieAlta,
        color: puede ? COLOR.fondo : COLOR.textoApagado, textAlign: 'center', padding: 19,
        font: `700 13px/1 ${FUENTE.ui}`, letterSpacing: 2.2, textTransform: 'uppercase',
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
        background: archivo ? TINTE.dinero : 'transparent', padding: 14,
      }}>
        <div style={{
          width: 52, height: 52, flex: '0 0 auto',
          background: archivo ? `center/cover url(${URL.createObjectURL(archivo)})`
                              : `repeating-linear-gradient(130deg,${COLOR.superficieAlta} 0 8px,${COLOR.superficie} 8px 16px)`,
        }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ ...etiquetaBase, color: archivo ? COLOR.dinero : COLOR.textoTenue }}>
            {archivo ? `${et} · listo` : et}
          </div>
          <div style={{ font: `400 11.5px/1.5 ${FUENTE.mono}`, color: COLOR.textoApagado, marginTop: 6 }}>{nota}</div>
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
  font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 2.2, textTransform: 'uppercase',
}

function Centro({ titulo, texto, accion }: {
  titulo?: string[]; texto: string; accion?: { texto: string; al: () => void }
}) {
  return (
    <div style={{
      minHeight: '100%', boxSizing: 'border-box', padding: '64px 26px',
      background: COLOR.fondo, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 20, textAlign: 'center',
    }}>
      {titulo && (
        <div style={{
          fontFamily: FUENTE.display, fontSize: 42, lineHeight: 1,
          textTransform: 'uppercase', color: COLOR.texto,
        }}>
          {titulo[0]}<br />{titulo[1]}<br /><span style={{ color: COLOR.dinero }}>{titulo[2]}</span>
        </div>
      )}
      <div style={{
        fontFamily: FUENTE.serif, fontStyle: 'italic', fontSize: 19, lineHeight: 1.4,
        color: COLOR.textoSuave, maxWidth: 330,
      }}>{texto}</div>
      {accion && (
        <span onClick={accion.al} style={{
          background: COLOR.acento, color: COLOR.fondo, padding: '15px 26px',
          font: `700 12px/1 ${FUENTE.ui}`, letterSpacing: 2, textTransform: 'uppercase',
          cursor: 'pointer',
        }}>{accion.texto}</span>
      )}
    </div>
  )
}
