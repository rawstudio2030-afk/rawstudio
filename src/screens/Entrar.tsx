// Pantalla 09b — La puerta
// Aparece despues del age gate y antes de pedir cualquier dato: separa
// "vengo a ver" de "vengo a publicar", que son los dos negocios distintos que
// conviven en RAWstudio.
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSesion } from '../lib/sesion'
import Wordmark from '../components/Wordmark'
import Portada from '../components/Portada'
import { COLOR, TINTE, FUENTE } from '../lib/diseño'
import { Enlace } from '../components/Pulsable'


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
        <div style={{ fontFamily: FUENTE.ui, fontSize: 22, lineHeight: 1.3, color: COLOR.textoSuave }}>
          Con tu correo y una contraseña. El acceso por liga también sigue ahí.
        </div>

        {/* Gancho para creadoras. Va aqui y no despues del registro porque este
            es el momento en que alguien decide de que lado de la plataforma
            esta: quien viene a publicar no deberia tener que registrarse como
            comprador primero para descubrir que puede cobrar. */}
        <Enlace
          a="/creadoras"
          style={{
            display: 'block', boxSizing: 'border-box', width: '100%',
            marginTop: 6, padding: '18px 16px', cursor: 'pointer',
            border: '1.5px dashed rgba(200,255,61,.45)',
            background: TINTE.dinero,
          }}>
          <div style={{ font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 2.2, textTransform: 'uppercase', color: COLOR.dinero, marginBottom: 9 }}>
            ¿Vas a publicar tú?
          </div>
          <div style={{ font: `400 16px/1.45 ${FUENTE.ui}`, color: COLOR.texto, marginBottom: 10 }}>
            El <b style={{ fontWeight: 700 }}>80% de cada dólar</b> es tuyo, pagos por SPEI y sin exclusividad.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ font: `400 10px/1.45 ${FUENTE.mono}`, color: COLOR.textoTenue }}>
              Nadie ve tu nombre real
            </span>
            <span style={{ font: `700 13px/1 ${FUENTE.ui}`, color: COLOR.dinero }}>&#8594;</span>
          </div>
        </Enlace>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Enlace
          a="/registro"
          style={{
            display: 'block', boxSizing: 'border-box', width: '100%',
            background: COLOR.acento, color: COLOR.fondo, textAlign: 'center', padding: 19,
            font: `700 13px/1 ${FUENTE.ui}`, letterSpacing: 2.2, textTransform: 'uppercase',
            boxShadow: '0 0 34px rgba(255,43,209,.42)', cursor: 'pointer',
          }}>
          Crear mi cuenta
        </Enlace>
        <Enlace
          a="/acceso"
          style={{
            display: 'block', boxSizing: 'border-box', width: '100%',
            border: '1px solid rgba(255,255,255,.16)', color: COLOR.textoSuave,
            textAlign: 'center', padding: 18,
            font: `700 12px/1 ${FUENTE.ui}`, letterSpacing: 2.2, textTransform: 'uppercase', cursor: 'pointer',
          }}>
          Ya tengo cuenta
        </Enlace>
      </div>

      <Portada />
    </div>
  )
}
