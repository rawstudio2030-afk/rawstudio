// Pantalla 09b — La puerta
// Aparece despues del age gate y antes de pedir cualquier dato: separa
// "vengo a ver" de "vengo a publicar", que son los dos negocios distintos que
// conviven en RAWstudio.
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSesion } from '../lib/sesion'
import Wordmark from '../components/Wordmark'
import { COLOR, TINTE, FUENTE } from '../lib/diseño'


export default function Entrar() {
  const nav = useNavigate()
  const { sesion, cargando } = useSesion()

  // Ofrecerle "crear cuenta" a quien ya entro no se entiende: parece que la
  // sesion se perdio. Si hay sesion, esta pantalla no tiene nada que hacer.
  useEffect(() => {
    if (!cargando && sesion) nav('/clip', { replace: true })
  }, [cargando, sesion, nav])

  return (
    <div style={{
      minHeight: '100%', boxSizing: 'border-box', padding: '64px 26px 44px',
      background: COLOR.fondo, color: COLOR.texto, fontFamily: FUENTE.ui,
      display: 'flex', flexDirection: 'column',
    }}>
      <Wordmark ancho={150} glow={16} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 22, padding: '30px 0' }}>
        <div style={{ width: 64, height: 3, background: COLOR.acento }} />
        {/* Interlineado 1 y no .9 como el deck: en español los titulares llevan
            mayusculas acentuadas (CÓMO) y con el interlineado apretado el acento
            queda tapado por la linea de arriba. El deck no lo sufre por estar
            en ingles. */}
        <div style={{ fontFamily: FUENTE.display, fontSize: 52, lineHeight: 1, textTransform: 'uppercase' }}>
          Elige<br />cómo<br /><span style={{ color: COLOR.dinero }}>entras.</span>
        </div>
        <div style={{ fontFamily: FUENTE.serif, fontStyle: 'italic', fontSize: 21, lineHeight: 1.35, color: COLOR.textoSuave }}>
          Con tu correo y una contraseña. El acceso por liga también sigue ahí.
        </div>

        {/* Gancho para creadoras. Va aqui y no despues del registro porque este
            es el momento en que alguien decide de que lado de la plataforma
            esta: quien viene a publicar no deberia tener que registrarse como
            comprador primero para descubrir que puede cobrar. */}
        <div
          onClick={() => nav('/creadoras')}
          style={{
            marginTop: 6, padding: '18px 16px', cursor: 'pointer',
            border: '1.5px dashed rgba(200,255,61,.45)',
            background: TINTE.dinero,
          }}>
          <div style={{ font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 2.2, textTransform: 'uppercase', color: COLOR.dinero, marginBottom: 9 }}>
            ¿Vas a publicar tú?
          </div>
          <div style={{ font: `400 15px/1.45 ${FUENTE.ui}`, color: COLOR.texto, marginBottom: 10 }}>
            El <b style={{ fontWeight: 700 }}>80% de cada peso</b> es tuyo, pagos cada semana y sin exclusividad.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ font: `400 11px/1.5 ${FUENTE.mono}`, color: COLOR.textoTenue }}>
              Nadie ve tu nombre real
            </span>
            <span style={{ font: `700 14px/1 ${FUENTE.ui}`, color: COLOR.dinero }}>&#8594;</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div
          onClick={() => nav('/registro')}
          style={{
            background: COLOR.acento, color: COLOR.fondo, textAlign: 'center', padding: 19,
            font: `700 13px/1 ${FUENTE.ui}`, letterSpacing: 2.2, textTransform: 'uppercase',
            boxShadow: '0 0 34px rgba(255,43,209,.42)', cursor: 'pointer',
          }}>
          Crear mi cuenta
        </div>
        <div
          onClick={() => nav('/acceso')}
          style={{
            border: '1px solid rgba(255,255,255,.16)', color: COLOR.textoSuave,
            textAlign: 'center', padding: 18,
            font: `700 12px/1 ${FUENTE.ui}`, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer',
          }}>
          Ya tengo cuenta
        </div>
      </div>
    </div>
  )
}
