// Pantalla 17 — Verificación de identidad
//
// Hasta ahora el age gate era autodeclaracion: cualquiera tocaba "soy mayor de
// edad" y entraba. Eso basta para mirar, pero no para publicar: quien aparece
// en el contenido debe ser adulto comprobado, y esa es la parte que la ley no
// perdona.
import { useEffect, useId, useRef, useState } from 'react'
import { cuantos } from '../lib/plural'
import { useNavigate } from 'react-router-dom'
import { useSesion } from '../lib/sesion'
import { supabase } from '../lib/supabase'
import { COLOR, FUENTE, RADIO } from '../lib/diseño'
import Icono from '../components/Iconos'
import { Pulsable, Enlace } from '../components/Pulsable'
import Centro from '../components/Centro'
import { FONDO_CALABOZO } from '../lib/calabozo'


const SERVICIO = import.meta.env.VITE_VERIFICACION_URL as string | undefined

/* Modo sobrio: es un tramite con datos sensibles, y quien lo hace tiene que
   poder leer cada instruccion. Rotulos y ayudas en `textoSuave` (eran
   textoTenue y textoApagado, bajo AA) y campos de `.campo-sobrio`. */
const etiqueta: React.CSSProperties = {
  font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 2, textTransform: 'uppercase', color: COLOR.textoSuave,
}
const ayuda: React.CSSProperties = { font: `400 12px/1.5 ${FUENTE.ui}`, color: COLOR.textoSuave }

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
  // ¿Ya hay un consentimiento biometrico vigente en el servidor? Sin el, el
  // servidor no recibe las imagenes ni abre la solicitud. `null` = todavia no se
  // sabe; se trata como que no, y la casilla se muestra.
  const [consentido, setConsentido] = useState<boolean | null>(null)
  const [acepta, setAcepta] = useState(false)
  const idCasilla = useId()
  const uid = sesion?.user.id

  useEffect(() => {
    if (!uid) return
    let vivo = true
    supabase.from('consentimientos').select('otorgado')
      .eq('user_id', uid).eq('tipo', 'biometricos')
      .order('created_at', { ascending: false }).order('id', { ascending: false })
      .limit(1).maybeSingle()
      .then(({ data }) => { if (vivo) setConsentido(data?.otorgado === true) })
    return () => { vivo = false }
  }, [uid])

  if (cargando) return <Centro texto="Cargando…" />
  if (!sesion) return <Centro texto="Necesitas entrar." accion={{ texto: 'Entrar', al: () => nav('/acceso') }} />
  if (perfil?.identidad_verificada) return (
    <Centro encendido texto="Tu identidad ya está verificada."
      accion={{ texto: 'Ir al estudio', al: () => nav('/estudio') }} />
  )

  const edad = edadDe(nacimiento)
  const edadOk = edad !== null && edad >= 18 && edad <= 120
  const puede = edadOk && !!ine && !!selfie && estado !== 'enviando'
    && (consentido === true || acepta)

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

    // El consentimiento se anota en el servidor ANTES de mandar nada: la INE y
    // la selfie son datos biometricos, y el servidor no las recibe sin el.
    if (consentido !== true) {
      const { error } = await supabase.rpc('registrar_consentimiento', {
        p_tipo: 'biometricos', p_otorgado: true,
      })
      if (error) { setEstado('error'); setDetalle(error.message); return }
      setConsentido(true)
    }

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
      // El unico sitio del producto donde el simbolo se enciende hoy: la
      // identidad quedo verificada. Si el cotejo no fue concluyente sigue
      // apagado, porque todavia no hay nada que celebrar.
      encendido={estado === 'ok'}
      titulo={estado === 'ok' ? ['Listo,', 'ya', 'quedó.'] : ['Lo estamos', 'revisando', 'a mano.']}
      texto={estado === 'ok'
        ? 'Tu identidad quedó verificada. Ya puedes publicar y cobrar.'
        : 'El cotejo no fue concluyente, así que lo revisa una persona. Te avisamos por correo, normalmente el mismo día.'}
      accion={{ texto: 'Volver al estudio', al: () => nav('/estudio') }}
    />
  )

  return (
    <div style={{
      minHeight: '100%', boxSizing: 'border-box', padding: '20px 18px 40px',
      background: FONDO_CALABOZO, color: COLOR.texto, fontFamily: FUENTE.ui,
      display: 'flex', flexDirection: 'column', gap: 18,
      width: '100%', maxWidth: 680, margin: '0 auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ ...etiqueta, margin: 0, color: COLOR.dinero }}>Verificar identidad</h1>
        <Enlace a="/estudio" rotulo="Cerrar" style={{
          width: 44, height: 44, borderRadius: '50%', display: 'grid', placeItems: 'center',
          border: '1px solid rgba(255,255,255,.22)', color: COLOR.texto, cursor: 'pointer',
        }}><span aria-hidden style={{ font: `400 22px/1 ${FUENTE.ui}` }}>×</span></Enlace>
      </div>

      <div>
        <h2 style={{ margin: 0, font: `700 28px/1.15 ${FUENTE.ui}` }}>
          Comprueba que eres <span style={{ color: COLOR.dinero }}>tú.</span>
        </h2>
        <div style={{ font: `400 16px/1.5 ${FUENTE.ui}`, color: COLOR.textoSuave, marginTop: 12 }}>
          Solo hace falta una vez, y solo para publicar o cobrar. Quien únicamente mira no pasa por aquí.
        </div>
      </div>

      {/* Lo que se promete en la pagina de creadoras, dicho aqui donde importa. */}
      <div style={{
        borderRadius: RADIO.filo, border: '1.5px dashed rgba(224,177,90,.5)', background: 'rgba(224,177,90,.05)',
        padding: '16px 16px',
      }}>
        <div style={{ ...etiqueta, color: COLOR.dinero }}>Qué hacemos con esto</div>
        <div style={{ font: `400 14px/1.6 ${FUENTE.ui}`, color: COLOR.texto, marginTop: 9 }}>
          {SERVICIO
            ? <>Las fotos se revisan <b>en memoria</b> y no se guardan. De todo esto solo conservamos que eres mayor de edad y la fecha.</>
            : <>Una persona del equipo revisa tus fotos y las <b>borra al terminar</b>. De todo esto solo conservamos que eres mayor de edad y la fecha.</>}
        </div>
        <div style={{ ...ayuda, marginTop: 9 }}>
          {SERVICIO
            ? 'Única excepción: si el cotejo no es concluyente, las guardamos hasta que una persona lo revise, y se borran al resolverlo.'
            : 'Tu documento nunca se guarda completo, solo una huella que no permite reconstruirlo.'}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label htmlFor="ver-nacimiento" style={etiqueta}>Fecha de nacimiento</label>
        <input id="ver-nacimiento" type="date" value={nacimiento} max={new Date().toISOString().slice(0, 10)}
          className="campo-sobrio" aria-invalid={!!nacimiento && !edadOk}
          onChange={e => { setNacimiento(e.target.value); if (estado === 'error') setEstado('listo') }}
          style={{
            width: '100%', boxSizing: 'border-box',
            font: `400 16px/1 ${FUENTE.ui}`, padding: '16px 15px', colorScheme: 'dark',
          }} />
        <span style={{ ...ayuda, color: nacimiento && !edadOk ? COLOR.acento : COLOR.textoSuave }}>
          {!nacimiento ? 'Debe coincidir con tu identificación.'
            : !edadOk ? 'Necesitas 18 años o más para publicar.'
            : `${cuantos(edad, 'año')}.`}
        </span>
      </div>

      {/* Opcional a proposito: sirve para detectar que una misma persona abrio
          dos cuentas, pero exigirlo dejaria fuera a quien no trae su documento
          a la mano o viene de otro pais. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label htmlFor="ver-documento" style={etiqueta}>Número de documento · opcional</label>
        <input id="ver-documento" value={documento} maxLength={30} className="campo-sobrio"
          onChange={e => setDocumento(e.target.value.toUpperCase())}
          placeholder="CURP, pasaporte o el que uses"
          style={{
            width: '100%', boxSizing: 'border-box',
            font: `400 16px/1 ${FUENTE.mono}`, letterSpacing: 1.2, padding: '16px 15px',
          }} />
        <span style={ayuda}>Solo guardamos una huella, nunca el número.</span>
      </div>

      <Foto etiqueta="Tu identificación" nota="INE, pasaporte o cédula. Completa y sin reflejos"
        archivo={ine} refInput={refINE} camara="environment"
        onElegir={f => { setIne(f); if (estado === 'error') setEstado('listo') }} />

      <Foto etiqueta="Selfie" nota="De frente, con buena luz y sin lentes oscuros"
        archivo={selfie} refInput={refSelfie} camara="user"
        onElegir={f => { setSelfie(f); if (estado === 'error') setEstado('listo') }} />

      {/* Consentimiento expreso y separado: ninguna casilla preseleccionada, y
          solo se pide si todavia no hay uno vigente. */}
      {consentido !== true && (
        <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
          <input type="checkbox" id={idCasilla} className="casilla"
            checked={acepta} onChange={e => setAcepta(e.target.checked)}
            style={{
              width: 22, height: 22, flex: '0 0 auto', marginTop: 1, borderRadius: 6,
              border: `1.5px solid ${acepta ? COLOR.dinero : 'rgba(255,255,255,.4)'}`,
              background: acepta ? COLOR.dinero : 'transparent',
              color: COLOR.fondo, cursor: 'pointer',
            }} />
          <label htmlFor={idCasilla} style={{
            font: `400 13px/1.5 ${FUENTE.ui}`, color: COLOR.textoSuave, cursor: 'pointer',
          }}>
            Autorizo el tratamiento de mis <b>datos biométricos faciales</b> y de mi
            identificación (INE y selfie) para verificar mi identidad y mi edad, como
            explica el <a href="#/privacidad" target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()} style={{ color: COLOR.admin }}>aviso de
            privacidad</a>. <span style={{ color: COLOR.acento }}>*</span>
          </label>
        </div>
      )}

      {estado === 'error' && (
        <div role="alert" style={{ font: `400 14px/1.45 ${FUENTE.ui}`, color: COLOR.acento }}>{detalle}</div>
      )}

      <Pulsable al={enviar} activo={puede} className="boton-principal"
        style={{ width: '100%', marginTop: 'auto' }}>
        {estado === 'enviando' ? 'Verificando…' : 'Enviar para verificar'}
      </Pulsable>
    </div>
  )
}

function Foto({ etiqueta: et, nota, archivo, refInput, camara, onElegir }: {
  etiqueta: string; nota: string; archivo: File | null
  refInput: React.RefObject<HTMLInputElement | null>
  camara: 'user' | 'environment'; onElegir: (f: File) => void
}) {
  // La vista previa de un documento de identidad: se crea UNA vez por archivo y
  // se revoca al cambiarlo o al salir. Antes se llamaba a createObjectURL dentro
  // del render, que crea una URL nueva en cada pintada y no revoca ninguna: la
  // imagen de una INE quedaba retenida en memoria tantas veces como se repintara.
  const [vista, setVista] = useState<string | null>(null)
  useEffect(() => {
    if (!archivo) { setVista(null); return }
    const u = URL.createObjectURL(archivo)
    setVista(u)
    return () => URL.revokeObjectURL(u)
  }, [archivo])

  return (
    <>
      <Pulsable al={() => refInput.current?.click()} style={{
        boxSizing: 'border-box', width: '100%', textAlign: 'left', minHeight: 80,
        display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', borderRadius: RADIO.filo,
        border: `1.5px ${archivo ? 'solid' : 'dashed'} ${archivo ? 'rgba(224,177,90,.6)' : 'rgba(255,255,255,.28)'}`,
        background: archivo ? 'rgba(224,177,90,.05)' : 'transparent', padding: 14,
      }}>
        <div style={{
          width: 56, height: 56, flex: '0 0 auto', borderRadius: 10, display: 'grid', placeItems: 'center',
          color: COLOR.textoSuave,
          background: vista ? `center/cover url(${vista})`
                            : `repeating-linear-gradient(130deg,${COLOR.superficieAlta} 0 8px,${COLOR.superficie} 8px 16px)`,
        }}>
          {!vista && <span aria-hidden style={{ display: 'grid' }}><Icono nombre="subir" tam={22} /></span>}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ ...etiquetaBase, color: archivo ? COLOR.dinero : COLOR.textoSuave }}>
            {archivo ? `${et} · listo` : et}
          </div>
          <div style={{ font: `400 13px/1.45 ${FUENTE.ui}`, color: COLOR.textoSuave, marginTop: 6 }}>{nota}</div>
        </div>
      </Pulsable>
      {/* capture abre la camara directo en movil, que es donde se hace esto */}
      <input ref={refInput} type="file" accept="image/*" capture={camara}
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onElegir(f) }} />
    </>
  )
}

const etiquetaBase: React.CSSProperties = {
  font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 2, textTransform: 'uppercase',
}
