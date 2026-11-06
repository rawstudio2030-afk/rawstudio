// Pantallas 11 y 12 — Crear cuenta / Entrar
//
// Contraseña como via principal: el enlace magico obliga a salir al correo en
// CADA entrada, y eso confunde y pierde gente. Con contraseña el correo se toca
// una sola vez, al confirmar la cuenta.
//
// Interlineado 1 y no .9 como el deck: en español los titulares llevan
// mayusculas acentuadas (CONTRASEÑA) y con el interlineado apretado el acento
// queda tapado por la linea de arriba.
import { useEffect, useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSesion } from '../lib/sesion'
import PaginaMiami from '../components/PaginaMiami'
import { supabase } from '../lib/supabase'
import { VERSION_LEGAL } from '../content/legal'
import { COLOR, FUENTE } from '../lib/diseño'
import { Pulsable, Enlace } from '../components/Pulsable'


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

/* Una casilla de verdad, no un div que la imita.
 *
 * Aqui se consiente el tratamiento de datos biometricos y la aceptacion de los
 * terminos: es la parte del sitio donde menos se puede improvisar. Un <div>
 * con una palomita dibujada no recibe foco, no responde a Espacio y un lector
 * de pantalla no dice si esta marcada o no — o sea que no hay forma de dar el
 * consentimiento sin raton, ni de saber que se dio.
 *
 * El <input> nativo lo trae todo. Se le quita la apariencia del sistema con
 * `.casilla` —en CSS, porque dibujar la palomita necesita ::after— y se le
 * pone al lado una <label> ligada por id: asi tocar el texto tambien marca,
 * que es el area grande que tenia el div.
 *
 * Los enlaces que van DENTRO del texto frenan la burbuja (ver mas abajo), o
 * leer los terminos marcaria la casilla de paso. */
function Casilla({ marcada, onCambio, obligatoria, children }: {
  marcada: boolean; onCambio: (v: boolean) => void
  obligatoria?: boolean; children: React.ReactNode
}) {
  const id = useId()
  return (
    <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
      <input
        type="checkbox" id={id} className="casilla"
        checked={marcada} onChange={e => onCambio(e.target.checked)}
        required={obligatoria}
        style={{
          width: 22, height: 22, flex: '0 0 auto', marginTop: 1, borderRadius: 6,
          border: `1.5px solid ${marcada ? COLOR.dinero : 'rgba(255,255,255,.4)'}`,
          background: marcada ? COLOR.dinero : 'transparent',
          color: COLOR.fondo, cursor: 'pointer',
        }} />
      <label htmlFor={id} style={{
        font: `400 13px/1.5 ${FUENTE.ui}`, color: '#CFCAD3', cursor: 'pointer',
      }}>
        {children}
        {obligatoria && <span style={{ color: COLOR.acento }}> *</span>}
      </label>
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
      texto: <>Te mandamos un mensaje a <span style={{ color: COLOR.texto }}>{correo.trim().toLowerCase()}</span>. Ábrelo una vez y ya podrás entrar con tu contraseña siempre.</>,
    },
    liga: {
      titulo: ['Revisa', 'tu', 'correo.'],
      texto: <>Te mandamos una liga a <span style={{ color: COLOR.texto }}>{correo.trim().toLowerCase()}</span>. Ábrela en este mismo teléfono.</>,
    },
    reset: {
      titulo: ['Revisa', 'tu', 'correo.'],
      texto: <>Te mandamos un enlace para poner una contraseña nueva a <span style={{ color: COLOR.texto }}>{correo.trim().toLowerCase()}</span>.</>,
    },
  }
  const aviso = avisos[estado]

  const malo = estado === 'error'

  /* Una sola tarjeta con todo: el titulo, los campos, las casillas y los
   * botones. En modo marca (DESIGN-BRIEF.md): la puerta de entrada es lo
   * primero que se ve, asi que lleva la escena de la portada detras. */
  return (
    <PaginaMiami>
      <div className="tarjeta-acceso">
        {aviso ? (
          <>
            <h1 className="acceso-titulo">
              {aviso.titulo[0]}<br />{aviso.titulo[1]}<br />
              <span className="neon-lima">{aviso.titulo[2]}</span>
            </h1>
            <p className="acceso-bajada">{aviso.texto}</p>
            <div style={{ font: `400 12px/1.6 ${FUENTE.mono}`, color: COLOR.textoSuave }}>
              Si no llega en un minuto, revisa la carpeta de no deseados.
            </div>
            <Pulsable al={() => { setEstado('listo'); nav('/entrar') }} className="miami-boton miami-boton-suave">Volver</Pulsable>
          </>
        ) : (
          <>
            <h1 className="acceso-titulo">
              {t.titulo[0]}<br />{t.titulo[1]}<br />
              <span className="neon-lima">{t.titulo[2]}</span>
            </h1>
            <p className="acceso-bajada">{t.bajada}</p>

            <input
              type="email" inputMode="email" autoComplete="email" className="campo-neon"
              aria-label="Correo" aria-invalid={malo}
              placeholder="tu@correo.com" value={correo}
              onChange={e => { setCorreo(e.target.value); if (estado === 'error') setEstado('listo') }}
            />

            <div style={{ position: 'relative' }}>
              <input
                type={verClave ? 'text' : 'password'} className="campo-neon"
                aria-label="Contraseña" aria-invalid={malo}
                autoComplete={modo === 'registro' ? 'new-password' : 'current-password'}
                placeholder="tu contraseña" value={clave}
                onChange={e => { setClave(e.target.value); if (estado === 'error') setEstado('listo') }}
                onKeyDown={e => { if (e.key === 'Enter') enviar() }}
                style={{ paddingRight: 74 }}
              />
              <Pulsable
                al={() => setVerClave(v => !v)}
                activado={verClave}
                style={{
                  position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                  minWidth: 56, minHeight: 44, display: 'grid', placeItems: 'center',
                  font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 1.2, textTransform: 'uppercase',
                  color: COLOR.textoSuave, cursor: 'pointer',
                }}>
                {verClave ? 'Ocultar' : 'Ver'}
              </Pulsable>
            </div>

            {modo === 'registro' && !claveOk && clave.length > 0 && (
              <div style={{ font: `400 12px/1.45 ${FUENTE.mono}`, color: COLOR.textoSuave }}>
                Mínimo 6 caracteres.
              </div>
            )}

            {modo === 'registro' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 4 }}>
                <Casilla marcada={aceptaLegal} onCambio={setAceptaLegal} obligatoria>
                  He leído y acepto los{' '}
                  <Enlace a="/terminos" al={e => e.stopPropagation()}
                     style={{ color: COLOR.dinero, textDecoration: 'underline', cursor: 'pointer' }}>términos</Enlace>
                  {' '}y el{' '}
                  <Enlace a="/privacidad" al={e => e.stopPropagation()}
                     style={{ color: COLOR.dinero, textDecoration: 'underline', cursor: 'pointer' }}>aviso de privacidad</Enlace>.
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
              <div role="alert" style={{ font: `400 14px/1.45 ${FUENTE.ui}`, color: '#FF7BE6' }}>{detalle}</div>
            )}

            <div style={{ display: 'grid', gap: 12, marginTop: 4 }}>
              <Pulsable al={enviar} activo={listo}
                className={`miami-boton miami-boton-magenta${listo ? '' : ' miami-boton-apagado'}`}>
                {estado === 'enviando' ? 'Un momento…' : t.boton}
              </Pulsable>

              {conGoogle && (
                <Pulsable al={entrarGoogle} className="miami-boton miami-boton-google">
                  Continuar con Google
                </Pulsable>
              )}

              <Enlace a={t.rutaAlterna} className="miami-boton miami-boton-suave">{t.alterno}</Enlace>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
              <Pulsable al={ligaAlCorreo} className="acceso-enlace">Entrar con liga</Pulsable>
              {modo === 'acceso' && (
                <Pulsable al={olvide} className="acceso-enlace">Olvidé mi clave</Pulsable>
              )}
            </div>
          </>
        )}
      </div>
    </PaginaMiami>
  )
}
