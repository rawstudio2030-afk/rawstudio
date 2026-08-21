// Pantalla 16 — Contraseña nueva
//
// Faltaba por completo: el correo de recuperacion llegaba, pero la liga no
// tenia a donde llevar. Y encima el enlace SI abre sesion, asi que la guardia
// de rutas veia "ya entro" y lo expulsaba al contenido, dando la impresion de
// que el enlace no servia.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import wordmark from '../assets/wordmark.png'

const UI = "'Space Grotesk', system-ui, sans-serif"
const MONO = "'Space Mono', monospace"
const SERIF = "'Instrument Serif', serif"

export default function NuevaClave() {
  const nav = useNavigate()
  const [clave, setClave] = useState('')
  const [repetir, setRepetir] = useState('')
  const [ver, setVer] = useState(false)
  const [estado, setEstado] = useState<'listo' | 'guardando' | 'hecho' | 'error'>('listo')
  const [detalle, setDetalle] = useState('')
  const [haySesion, setHaySesion] = useState<boolean | null>(null)

  // El enlace de recuperacion trae el codigo en la URL; supabase-js lo canjea
  // solo al arrancar. Se espera a que exista sesion antes de permitir el cambio:
  // sin ella, updateUser no tiene a quien actualizar.
  useEffect(() => {
    let vivo = true
    supabase.auth.getSession().then(({ data }) => {
      if (vivo) setHaySesion(!!data.session)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (vivo) setHaySesion(!!s)
    })
    return () => { vivo = false; sub.subscription.unsubscribe() }
  }, [])

  const larga = clave.length >= 6
  const iguales = clave.length > 0 && clave === repetir
  const puede = larga && iguales && estado !== 'guardando'

  const guardar = async () => {
    if (!puede) return
    setEstado('guardando')
    const { error } = await supabase.auth.updateUser({ password: clave })
    if (error) {
      setEstado('error')
      setDetalle(error.message.toLowerCase().includes('should be at least')
        ? 'La contraseña debe tener al menos 6 caracteres.'
        : error.message)
      return
    }
    sessionStorage.removeItem('rawstudio.recuperando')
    setEstado('hecho')
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

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18, padding: '32px 0' }}>
        <div style={{ width: 64, height: 3, background: '#FF2BD1' }} />

        {estado === 'hecho' ? (
          <>
            <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 48, lineHeight: 1, textTransform: 'uppercase' }}>
              Listo,<br />ya<br /><span style={{ color: '#C8FF3D' }}>quedó.</span>
            </div>
            <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 20, lineHeight: 1.35, color: '#9C979F' }}>
              Tu contraseña nueva ya está guardada. La próxima vez entras directo con ella.
            </div>
          </>
        ) : haySesion === false ? (
          <>
            <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 44, lineHeight: 1, textTransform: 'uppercase' }}>
              Este enlace<br /><span style={{ color: '#C8FF3D' }}>ya expiró.</span>
            </div>
            <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 19, lineHeight: 1.35, color: '#9C979F' }}>
              Los enlaces de recuperación duran poco, a propósito. Pide uno nuevo y ábrelo en cuanto llegue.
            </div>
          </>
        ) : (
          <>
            <div style={{ fontFamily: 'Anton, sans-serif', fontSize: 48, lineHeight: 1, textTransform: 'uppercase' }}>
              Pon tu<br />contraseña<br /><span style={{ color: '#C8FF3D' }}>nueva.</span>
            </div>

            <div style={{ position: 'relative' }}>
              <input
                type={ver ? 'text' : 'password'} autoComplete="new-password"
                placeholder="contraseña nueva" value={clave}
                onChange={e => { setClave(e.target.value); if (estado === 'error') setEstado('listo') }}
                style={campo(estado === 'error')} />
              <span onClick={() => setVer(v => !v)} style={{
                position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)',
                font: `700 10px/1 ${UI}`, letterSpacing: 1.4, textTransform: 'uppercase',
                color: '#6E6A72', cursor: 'pointer', padding: 6,
              }}>{ver ? 'Ocultar' : 'Ver'}</span>
            </div>

            <input
              type={ver ? 'text' : 'password'} autoComplete="new-password"
              placeholder="repítela" value={repetir}
              onChange={e => setRepetir(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') guardar() }}
              style={campo(repetir.length > 0 && !iguales)} />

            <div style={{ font: `400 12px/1.6 ${MONO}`, color: repetir.length > 0 && !iguales ? '#FF2BD1' : '#5E5A63' }}>
              {repetir.length > 0 && !iguales
                ? 'Las dos contraseñas no son iguales.'
                : 'Mínimo 6 caracteres.'}
            </div>

            {estado === 'error' && (
              <div style={{ font: `400 13px/1.5 ${UI}`, color: '#FF2BD1' }}>{detalle}</div>
            )}
          </>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {estado === 'hecho' ? (
          <div onClick={() => nav('/clip', { replace: true })} style={boton(true)}>Entrar</div>
        ) : haySesion === false ? (
          <div onClick={() => { sessionStorage.removeItem('rawstudio.recuperando'); nav('/acceso', { replace: true }) }}
            style={boton(true)}>Pedir otro enlace</div>
        ) : (
          <div onClick={guardar} style={boton(puede)}>
            {estado === 'guardando' ? 'Guardando…' : 'Guardar contraseña'}
          </div>
        )}
      </div>
    </div>
  )
}

const campo = (mal: boolean): React.CSSProperties => ({
  width: '100%', boxSizing: 'border-box', background: '#111116',
  border: `1px solid ${mal ? '#FF2BD1' : 'rgba(255,255,255,.14)'}`,
  color: '#F2F0F3', font: `400 16px/1 ${UI}`, padding: '17px 15px',
  paddingRight: 62, outline: 'none',
})

const boton = (activo: boolean): React.CSSProperties => ({
  background: activo ? '#FF2BD1' : '#191920',
  color: activo ? '#08080A' : '#5E5A63',
  textAlign: 'center', padding: 19,
  font: `700 13px/1 ${UI}`, letterSpacing: 2.2, textTransform: 'uppercase',
  boxShadow: activo ? '0 0 34px rgba(255,43,209,.42)' : 'none',
  cursor: activo ? 'pointer' : 'default',
})
