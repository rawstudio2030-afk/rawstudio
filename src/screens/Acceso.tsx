// Pantallas 10 y 11 — Crear cuenta / Ya tengo cuenta
//
// Con enlace magico ambas usan el mismo mecanismo, pero NO son la misma accion:
// registro crea al usuario si no existe; acceso exige que ya exista. Sin esa
// distincion, quien se equivoca de correo al iniciar sesion se crea una cuenta
// nueva vacia sin darse cuenta y cree que perdio la suya.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import wordmark from '../assets/wordmark.png'
import { supabase } from '../lib/supabase'

const UI = "'Space Grotesk', system-ui, sans-serif"
const MONO = "'Space Mono', monospace"
const SERIF = "'Instrument Serif', serif"

// Interlineado 1 y no .88/.9 como el deck: en español los titulares llevan
// mayusculas acentuadas (CÓMO, INCÓMODO, MÁS) y con el interlineado apretado
// del deck el acento queda tapado por la linea de arriba y la palabra se lee
// mal. El deck no lo sufre porque esta en ingles.
type Estado = 'listo' | 'enviando' | 'enviado' | 'error'
export type Modo = 'registro' | 'acceso'

const COPY = {
  registro: {
    titulo: ['Crea', 'tu', 'cuenta.'],
    bajada: 'Sin contraseñas. Te mandamos una liga al correo y quedas dentro.',
    boton: 'Crear mi cuenta',
    alterno: 'Ya tengo cuenta',
    rutaAlterna: '/acceso',
  },
  acceso: {
    titulo: ['Entra', 'sin', 'contraseña.'],
    bajada: 'Escribe tu correo y te mandamos una liga. Nada que memorizar, nada que se pueda filtrar.',
    boton: 'Mándame la liga',
    alterno: 'No tengo cuenta',
    rutaAlterna: '/registro',
  },
}

// Los mensajes de Supabase vienen en ingles y en jerga. Se traducen a algo que
// le diga a la persona que hacer.
function mensajeUtil(raw: string, modo: Modo): string {
  const m = raw.toLowerCase()
  if (m.includes('signups not allowed') || m.includes('user not found')) {
    return modo === 'acceso'
      ? 'No encontramos una cuenta con ese correo. ¿Querías crear una?'
      : raw
  }
  if (m.includes('rate limit') || m.includes('too many') || m.includes('for security purposes')) {
    return 'Demasiados intentos seguidos. Espera un minuto y vuelve a probar.'
  }
  if (m.includes('invalid') && m.includes('email')) return 'Ese correo no parece válido.'
  return raw
}

export default function Acceso({ modo }: { modo: Modo }) {
  const nav = useNavigate()
  const t = COPY[modo]
  const [correo, setCorreo] = useState('')
  const [estado, setEstado] = useState<Estado>('listo')
  const [detalle, setDetalle] = useState('')

  const valido = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(correo.trim())

  const enviar = async () => {
    if (!valido || estado === 'enviando') return
    setEstado('enviando')
    const { error } = await supabase.auth.signInWithOtp({
      email: correo.trim().toLowerCase(),
      options: {
        // La diferencia real entre las dos pantallas.
        shouldCreateUser: modo === 'registro',
        // Vuelve a la raiz; HashRouter reconstruye la ruta y el codigo PKCE
        // llega en la query, sin chocar con el fragmento.
        emailRedirectTo: window.location.origin,
      },
    })
    if (error) {
      setEstado('error')
      setDetalle(mensajeUtil(error.message, modo))
      return
    }
    setEstado('enviado')
  }

  return (
    <div style={{
      minHeight: '100%', boxSizing: 'border-box', padding: '64px 26px 44px',
      background: '#08080A', color: '#F2F0F3', fontFamily: UI,
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        position: 'relative', width: 150, height: 56, transform: 'rotate(-2deg)',
        filter: 'drop-shadow(0 0 16px rgba(255,43,209,.6))',
      }}>
        <img src={wordmark} alt="RAWstudio" style={{ width: '100%', height: 'auto', display: 'block' }} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 22, padding: '34px 0' }}>
        <div style={{ width: 64, height: 3, background: '#FF2BD1' }} />

        {estado === 'enviado' ? (
          <>
            <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 52, lineHeight: 1, textTransform: 'uppercase' }}>
              Revisa<br />tu<br /><span style={{ color: '#C8FF3D' }}>correo.</span>
            </div>
            <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 21, lineHeight: 1.35, color: '#9C979F' }}>
              Te mandamos una liga a <span style={{ color: '#F2F0F3' }}>{correo.trim().toLowerCase()}</span>. Ábrela en este mismo teléfono y quedas dentro.
            </div>
            <div style={{ font: `400 12px/1.6 ${MONO}`, color: '#6E6A72' }}>
              Si no llega en un minuto, revisa la carpeta de no deseados.
            </div>
          </>
        ) : (
          <>
            <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 52, lineHeight: 1, textTransform: 'uppercase' }}>
              {t.titulo[0]}<br />{t.titulo[1]}<br />
              <span style={{ color: '#C8FF3D' }}>{t.titulo[2]}</span>
            </div>
            <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 21, lineHeight: 1.35, color: '#9C979F' }}>
              {t.bajada}
            </div>

            <input
              type="email" inputMode="email" autoComplete="email"
              placeholder="tu@correo.com" value={correo}
              onChange={e => { setCorreo(e.target.value); if (estado === 'error') setEstado('listo') }}
              onKeyDown={e => { if (e.key === 'Enter') enviar() }}
              style={{
                width: '100%', boxSizing: 'border-box', background: '#111116',
                border: `1px solid ${estado === 'error' ? '#FF2BD1' : 'rgba(255,255,255,.14)'}`,
                color: '#F2F0F3', font: `400 16px/1 ${UI}`, padding: '17px 15px', outline: 'none',
              }}
            />

            {estado === 'error' && (
              <div style={{ font: `400 13px/1.5 ${UI}`, color: '#FF2BD1' }}>{detalle}</div>
            )}
          </>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {estado !== 'enviado' && (
          <>
            <div
              onClick={enviar}
              style={{
                background: valido ? '#FF2BD1' : '#191920',
                color: valido ? '#08080A' : '#5E5A63',
                textAlign: 'center', padding: 19,
                font: `700 13px/1 ${UI}`, letterSpacing: 2.2, textTransform: 'uppercase',
                boxShadow: valido ? '0 0 34px rgba(255,43,209,.42)' : 'none',
                cursor: valido ? 'pointer' : 'default',
              }}>
              {estado === 'enviando' ? 'Enviando…' : t.boton}
            </div>
            <div
              onClick={() => nav(t.rutaAlterna)}
              style={{
                border: '1px solid rgba(255,255,255,.16)', color: '#9C979F',
                textAlign: 'center', padding: 18,
                font: `700 12px/1 ${UI}`, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer',
              }}>
              {t.alterno}
            </div>
          </>
        )}
        {estado === 'enviado' && (
          <div
            onClick={() => nav('/entrar')}
            style={{
              border: '1px solid rgba(255,255,255,.16)', color: '#9C979F',
              textAlign: 'center', padding: 18,
              font: `700 12px/1 ${UI}`, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer',
            }}>
            Volver
          </div>
        )}
      </div>
    </div>
  )
}
