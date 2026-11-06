// Pantalla 16 — Contraseña nueva
//
// Faltaba por completo: el correo de recuperacion llegaba, pero la liga no
// tenia a donde llevar. Y encima el enlace SI abre sesion, asi que la guardia
// de rutas veia "ya entro" y lo expulsaba al contenido, dando la impresion de
// que el enlace no servia.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import PaginaMiami from '../components/PaginaMiami'
import { COLOR, FUENTE } from '../lib/diseño'
import { Pulsable } from '../components/Pulsable'


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
    <PaginaMiami>
      <div className="tarjeta-acceso">
        {estado === 'hecho' ? (
          <>
            <h1 className="acceso-titulo">Listo,<br />ya<br /><span className="neon-lima">quedó.</span></h1>
            <p className="acceso-bajada">
              Tu contraseña nueva ya está guardada. La próxima vez entras directo con ella.
            </p>
            <Pulsable al={() => nav('/clip', { replace: true })} className="miami-boton miami-boton-magenta">Entrar</Pulsable>
          </>
        ) : haySesion === false ? (
          <>
            <h1 className="acceso-titulo">Este enlace<br /><span className="neon-lima">ya expiró.</span></h1>
            <p className="acceso-bajada">
              Los enlaces de recuperación duran poco, a propósito. Pide uno nuevo y ábrelo en cuanto llegue.
            </p>
            <Pulsable al={() => { sessionStorage.removeItem('rawstudio.recuperando'); nav('/acceso', { replace: true }) }}
              className="miami-boton miami-boton-magenta">Pedir otro enlace</Pulsable>
          </>
        ) : (
          <>
            <h1 className="acceso-titulo">Pon tu<br />contraseña<br /><span className="neon-lima">nueva.</span></h1>

            <div style={{ position: 'relative' }}>
              <input
                type={ver ? 'text' : 'password'} autoComplete="new-password" className="campo-neon"
                aria-label="Contraseña nueva" aria-invalid={estado === 'error'}
                placeholder="contraseña nueva" value={clave}
                onChange={e => { setClave(e.target.value); if (estado === 'error') setEstado('listo') }}
                style={{ paddingRight: 74 }} />
              <Pulsable al={() => setVer(v => !v)} activado={ver} style={{
                position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                minWidth: 56, minHeight: 44, display: 'grid', placeItems: 'center',
                font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 1.2, textTransform: 'uppercase',
                color: COLOR.textoSuave, cursor: 'pointer',
              }}>{ver ? 'Ocultar' : 'Ver'}</Pulsable>
            </div>

            <input
              type={ver ? 'text' : 'password'} autoComplete="new-password" className="campo-neon"
              aria-label="Repite la contraseña" aria-invalid={repetir.length > 0 && !iguales}
              placeholder="repítela" value={repetir}
              onChange={e => setRepetir(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') guardar() }} />

            <div style={{ font: `400 12px/1.6 ${FUENTE.mono}`, color: repetir.length > 0 && !iguales ? '#FF7BE6' : COLOR.textoSuave }}>
              {repetir.length > 0 && !iguales
                ? 'Las dos contraseñas no son iguales.'
                : 'Mínimo 6 caracteres.'}
            </div>

            {estado === 'error' && (
              <div role="alert" style={{ font: `400 14px/1.45 ${FUENTE.ui}`, color: '#FF7BE6' }}>{detalle}</div>
            )}

            <Pulsable al={guardar} activo={puede}
              className={`miami-boton miami-boton-magenta${puede ? '' : ' miami-boton-apagado'}`}>
              {estado === 'guardando' ? 'Guardando…' : 'Guardar contraseña'}
            </Pulsable>
          </>
        )}
      </div>
    </PaginaMiami>
  )
}
