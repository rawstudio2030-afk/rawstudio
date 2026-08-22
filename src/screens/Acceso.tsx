// Pantallas 11 y 12 — Crear cuenta / Entrar
//
// Contraseña como via principal: el enlace magico obliga a salir al correo en
// CADA entrada, y eso confunde y pierde gente. Con contraseña el correo se toca
// una sola vez, al confirmar la cuenta.
//
// Interlineado 1 y no .9 como el deck: en español los titulares llevan
// mayusculas acentuadas (CONTRASEÑA) y con el interlineado apretado el acento
// queda tapado por la linea de arriba.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSesion } from '../lib/sesion'
import Wordmark from '../components/Wordmark'
import { supabase } from '../lib/supabase'
import { VERSION_LEGAL } from '../content/legal'

const UI = "'Space Grotesk', system-ui, sans-serif"
const MONO = "'Space Mono', monospace"
const SERIF = "'Instrument Serif', serif"

export type Modo = 'registro' | 'acceso'
type Estado = 'listo' | 'enviando' | 'confirma' | 'liga' | 'reset' | 'error'

const COPY = {
  registro: {
    titulo: ['Crea', 'tu', 'cuenta.'],
    bajada: 'Tu correo y una contraseña. Nada más.',
    boton: 'Crear cuenta',
    alterno: 'Ya tengo cuenta',
    rutaAlterna: '/acceso',
  },
  acceso: {
    titulo: ['Entra', 'a lo', 'tuyo.'],
    bajada: 'Con el correo y la contraseña que registraste.',
    boton: 'Entrar',
    alterno: 'No tengo cuenta',
    rutaAlterna: '/registro',
  },
}

// Los mensajes de Supabase vienen en ingles y en jerga; se traducen a algo que
// le diga a la persona que hacer.
function mensajeUtil(raw: string, modo: Modo): string {
  const m = raw.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.'
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'Ya existe una cuenta con ese correo. Entra en vez de crearla.'
  if (m.includes('password should be') || m.includes('at least 6'))
    return 'La contraseña debe tener al menos 6 caracteres.'
  if (m.includes('email not confirmed'))
    return 'Falta confirmar tu correo. Busca el mensaje que te mandamos al registrarte.'
  if (m.includes('rate limit') || m.includes('too many') || m.includes('for security purposes'))
    return 'Demasiados intentos seguidos. Espera un minuto y vuelve a probar.'
  if (m.includes('signups not allowed') || m.includes('user not found'))
    return modo === 'acceso' ? 'No encontramos una cuenta con ese correo.' : raw
  if (m.includes('invalid') && m.includes('email')) return 'Ese correo no parece válido.'
  return raw
}

function Casilla({ marcada, onCambio, obligatoria, children }: {
  marcada: boolean; onCambio: (v: boolean) => void
  obligatoria?: boolean; children: React.ReactNode
}) {
  return (
    <div onClick={() => onCambio(!marcada)}
      style={{ display: 'flex', gap: 11, alignItems: 'flex-start', cursor: 'pointer' }}>
      <span style={{
        width: 20, height: 20, flex: '0 0 auto', marginTop: 1,
        border: `1.5px solid ${marcada ? '#C8FF3D' : 'rgba(255,255,255,.28)'}`,
        background: marcada ? '#C8FF3D' : 'transparent',
        display: 'grid', placeItems: 'center',
        font: `700 12px/1 ${UI}`, color: '#08080A',
      }}>{marcada ? '✓' : ''}</span>
      <span style={{ font: `400 12.5px/1.5 ${UI}`, color: '#9C979F' }}>
        {children}
        {obligatoria && <span style={{ color: '#FF2BD1' }}> *</span>}
      </span>
    </div>
  )
}

export default function Acceso({ modo }: { modo: Modo }) {
  const nav = useNavigate()
  const { sesion, cargando } = useSesion()
  const t = COPY[modo]

  // Igual que en la puerta: con sesion abierta, pedir credenciales confunde.
  useEffect(() => {
    if (!cargando && sesion) nav('/clip', { replace: true })
  }, [cargando, sesion, nav])
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [verClave, setVerClave] = useState(false)
  const [estado, setEstado] = useState<Estado>('listo')
  const [detalle, setDetalle] = useState('')
  const [conGoogle, setConGoogle] = useState(false)
  // Casillas SEPARADAS y ninguna preseleccionada. Una sola de "acepto todo" es
  // justo lo que invalida el consentimiento para datos sensibles: la ley pide
  // que el de biometricos sea expreso y diferenciado.
  const [aceptaLegal, setAceptaLegal] = useState(false)
  const [aceptaBio, setAceptaBio] = useState(false)
  const [quiereRecs, setQuiereRecs] = useState(false)
  const [quierePromos, setQuierePromos] = useState(false)

  // El boton de Google solo aparece si el proveedor esta realmente configurado.
  // Mostrarlo sin configurar lleva a una pantalla de error de Google, que es
  // peor que no ofrecerlo.
  useEffect(() => {
    let vivo = true
    supabase.auth.getSession() // asegura cliente listo
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
    })
      .then(r => r.json())
      .then(d => { if (vivo) setConGoogle(!!d?.external?.google) })
      .catch(() => {})
    return () => { vivo = false }
  }, [])

  const correoOk = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(correo.trim())
  const claveOk = clave.length >= 6
  // Las opcionales pueden quedarse en blanco y aun asi permitir el registro.
  const consiente = modo === 'acceso' || (aceptaLegal && aceptaBio)
  const listo = correoOk && claveOk && consiente

  const fallar = (msg: string) => { setEstado('error'); setDetalle(mensajeUtil(msg, modo)) }

  const enviar = async () => {
    if (!listo || estado === 'enviando') return
    setEstado('enviando')
    const email = correo.trim().toLowerCase()

    if (modo === 'registro') {
      const { data, error } = await supabase.auth.signUp({
        email, password: clave,
        options: { emailRedirectTo: window.location.origin },
      })
      if (error) return fallar(error.message)

      // Se registra el consentimiento en cuanto hay usuario. Un "acepto" que no
      // queda guardado no sirve como prueba: se anota QUE se acepto, en QUE
      // version y cuando.
      const uid = data.user?.id
      if (uid) {
        const filas = [
          { tipo: 'terminos',        otorgado: true },
          { tipo: 'privacidad',      otorgado: true },
          { tipo: 'biometricos',     otorgado: true },
          { tipo: 'recomendaciones', otorgado: quiereRecs },
          { tipo: 'promociones',     otorgado: quierePromos },
        ].map(f => ({ ...f, user_id: uid, version: VERSION_LEGAL, agente: navigator.userAgent }))
        // La IP no la sabe el navegador; queda nula y la llena el servidor si
        // algun dia se hace por funcion. Fingirla aqui seria peor que omitirla.
        const { error: e2 } = await supabase.from('consentimientos').insert(filas)
        if (e2) console.warn('[registro] no se pudo guardar el consentimiento:', e2.message)
      }

      if (!data.session) { setEstado('confirma'); return }
      nav('/clip')
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password: clave })
    if (error) return fallar(error.message)
    nav('/clip')
  }

  const olvide = async () => {
    if (!correoOk) { fallar('Escribe tu correo primero para mandarte el enlace.'); return }
    setEstado('enviando')
    const { error } = await supabase.auth.resetPasswordForEmail(
      correo.trim().toLowerCase(), { redirectTo: window.location.origin })
    if (error) return fallar(error.message)
    setEstado('reset')
  }

  const ligaAlCorreo = async () => {
    if (!correoOk) { fallar('Escribe tu correo para mandarte la liga.'); return }
    setEstado('enviando')
    const { error } = await supabase.auth.signInWithOtp({
      email: correo.trim().toLowerCase(),
      options: { shouldCreateUser: modo === 'registro', emailRedirectTo: window.location.origin },
    })
    if (error) return fallar(error.message)
    setEstado('liga')
  }

  const entrarGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) fallar(error.message)
  }

  const avisos: Record<string, { titulo: string[]; texto: React.ReactNode }> = {
    confirma: {
      titulo: ['Confirma', 'tu', 'correo.'],
      texto: <>Te mandamos un mensaje a <span style={{ color: '#F2F0F3' }}>{correo.trim().toLowerCase()}</span>. Ábrelo una vez y ya podrás entrar con tu contraseña siempre.</>,
    },
    liga: {
      titulo: ['Revisa', 'tu', 'correo.'],
      texto: <>Te mandamos una liga a <span style={{ color: '#F2F0F3' }}>{correo.trim().toLowerCase()}</span>. Ábrela en este mismo teléfono.</>,
    },
    reset: {
      titulo: ['Revisa', 'tu', 'correo.'],
      texto: <>Te mandamos un enlace para poner una contraseña nueva a <span style={{ color: '#F2F0F3' }}>{correo.trim().toLowerCase()}</span>.</>,
    },
  }
  const aviso = avisos[estado]

  const campo: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', background: '#111116',
    border: `1px solid ${estado === 'error' ? '#FF2BD1' : 'rgba(255,255,255,.14)'}`,
    color: '#F2F0F3', font: `400 16px/1 ${UI}`, padding: '17px 15px', outline: 'none',
  }

  return (
    <div style={{
      minHeight: '100%', boxSizing: 'border-box', padding: '64px 26px 44px',
      background: '#08080A', color: '#F2F0F3', fontFamily: UI,
      display: 'flex', flexDirection: 'column',
    }}>
      <Wordmark ancho={150} glow={16} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18, padding: '30px 0' }}>
        <div style={{ width: 64, height: 3, background: '#FF2BD1' }} />

        {aviso ? (
          <>
            <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 48, lineHeight: 1, textTransform: 'uppercase' }}>
              {aviso.titulo[0]}<br />{aviso.titulo[1]}<br />
              <span style={{ color: '#C8FF3D' }}>{aviso.titulo[2]}</span>
            </div>
            <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 20, lineHeight: 1.35, color: '#9C979F' }}>
              {aviso.texto}
            </div>
            <div style={{ font: `400 12px/1.6 ${MONO}`, color: '#6E6A72' }}>
              Si no llega en un minuto, revisa la carpeta de no deseados.
            </div>
          </>
        ) : (
          <>
            <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 48, lineHeight: 1, textTransform: 'uppercase' }}>
              {t.titulo[0]}<br />{t.titulo[1]}<br />
              <span style={{ color: '#C8FF3D' }}>{t.titulo[2]}</span>
            </div>
            <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 20, lineHeight: 1.35, color: '#9C979F' }}>
              {t.bajada}
            </div>

            <input
              type="email" inputMode="email" autoComplete="email"
              placeholder="tu@correo.com" value={correo}
              onChange={e => { setCorreo(e.target.value); if (estado === 'error') setEstado('listo') }}
              style={campo}
            />

            <div style={{ position: 'relative' }}>
              <input
                type={verClave ? 'text' : 'password'}
                autoComplete={modo === 'registro' ? 'new-password' : 'current-password'}
                placeholder="tu contraseña" value={clave}
                onChange={e => { setClave(e.target.value); if (estado === 'error') setEstado('listo') }}
                onKeyDown={e => { if (e.key === 'Enter') enviar() }}
                style={{ ...campo, paddingRight: 62 }}
              />
              <span
                onClick={() => setVerClave(v => !v)}
                style={{
                  position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)',
                  font: `700 10px/1 ${UI}`, letterSpacing: 1.4, textTransform: 'uppercase',
                  color: '#6E6A72', cursor: 'pointer', padding: 6,
                }}>
                {verClave ? 'Ocultar' : 'Ver'}
              </span>
            </div>

            {modo === 'registro' && !claveOk && clave.length > 0 && (
              <div style={{ font: `400 12px/1.5 ${MONO}`, color: '#6E6A72' }}>
                Mínimo 6 caracteres.
              </div>
            )}

            {modo === 'registro' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
                <Casilla marcada={aceptaLegal} onCambio={setAceptaLegal} obligatoria>
                  He leído y acepto los{' '}
                  <a onClick={e => { e.stopPropagation(); nav('/terminos') }}
                     style={{ color: '#C8FF3D', textDecoration: 'underline', cursor: 'pointer' }}>términos</a>
                  {' '}y el{' '}
                  <a onClick={e => { e.stopPropagation(); nav('/privacidad') }}
                     style={{ color: '#C8FF3D', textDecoration: 'underline', cursor: 'pointer' }}>aviso de privacidad</a>.
                </Casilla>
                <Casilla marcada={aceptaBio} onCambio={setAceptaBio} obligatoria>
                  Autorizo el tratamiento de mis <b>datos biométricos faciales</b> y de mi
                  identificación, con la única finalidad de verificar mi edad e identidad.
                </Casilla>
                <Casilla marcada={quiereRecs} onCambio={setQuiereRecs}>
                  Quiero recomendaciones de contenido.
                </Casilla>
                <Casilla marcada={quierePromos} onCambio={setQuierePromos}>
                  Quiero recibir novedades por correo.
                </Casilla>
              </div>
            )}

            {estado === 'error' && (
              <div style={{ font: `400 13px/1.5 ${UI}`, color: '#FF2BD1' }}>{detalle}</div>
            )}
          </>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {aviso ? (
          <div onClick={() => { setEstado('listo'); nav('/entrar') }} style={{
            border: '1px solid rgba(255,255,255,.16)', color: '#9C979F', textAlign: 'center',
            padding: 18, font: `700 12px/1 ${UI}`, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer',
          }}>Volver</div>
        ) : (
          <>
            <div onClick={enviar} style={{
              background: listo ? '#FF2BD1' : '#191920',
              color: listo ? '#08080A' : '#5E5A63',
              textAlign: 'center', padding: 19,
              font: `700 13px/1 ${UI}`, letterSpacing: 2.2, textTransform: 'uppercase',
              boxShadow: listo ? '0 0 34px rgba(255,43,209,.42)' : 'none',
              cursor: listo ? 'pointer' : 'default',
            }}>
              {estado === 'enviando' ? 'Un momento…' : t.boton}
            </div>

            {conGoogle && (
              <div onClick={entrarGoogle} style={{
                background: '#F2F0F3', color: '#08080A', textAlign: 'center', padding: 17,
                font: `700 12px/1 ${UI}`, letterSpacing: 1.6, textTransform: 'uppercase', cursor: 'pointer',
              }}>
                Continuar con Google
              </div>
            )}

            <div onClick={() => nav(t.rutaAlterna)} style={{
              border: '1px solid rgba(255,255,255,.16)', color: '#9C979F', textAlign: 'center',
              padding: 18, font: `700 12px/1 ${UI}`, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer',
            }}>{t.alterno}</div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 4, paddingRight: 58 }}>
              <span onClick={ligaAlCorreo} style={{
                font: `400 12px/1.5 ${MONO}`, color: '#6E6A72',
                textDecoration: 'underline', cursor: 'pointer',
              }}>Entrar con liga</span>
              {modo === 'acceso' && (
                <span onClick={olvide} style={{
                  font: `400 12px/1.5 ${MONO}`, color: '#6E6A72',
                  textDecoration: 'underline', cursor: 'pointer', textAlign: 'right',
                }}>Olvidé mi clave</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
