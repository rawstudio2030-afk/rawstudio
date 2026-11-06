// Pantalla 09b — La puerta
// Aparece despues del age gate y antes de pedir cualquier dato: separa
// "vengo a ver" de "vengo a publicar", que son los dos negocios distintos que
// conviven en RAWstudio.
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSesion } from '../lib/sesion'
import PaginaMiami from '../components/PaginaMiami'
import Portada from '../components/Portada'
import { COLOR, FUENTE } from '../lib/diseño'
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
    <PaginaMiami>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '18px 0 4px' }}>
        {/* Interlineado 1 y no .9 como el deck: en español los titulares llevan
            mayusculas acentuadas (CÓMO) y con el interlineado apretado el acento
            queda tapado por la linea de arriba. El deck no lo sufre por estar
            en ingles. */}
        <h1 className="acceso-titulo">
          Elige<br />cómo<br /><span className="neon-lima">entras.</span>
        </h1>
        <p className="acceso-bajada">
          Con tu correo y una contraseña. El acceso por liga también sigue ahí.
        </p>

        {/* Gancho para creadoras. Va aqui y no despues del registro porque este
            es el momento en que alguien decide de que lado de la plataforma
            esta: quien viene a publicar no deberia tener que registrarse como
            comprador primero para descubrir que puede cobrar. */}
        <Enlace
          a="/creadoras"
          style={{
            display: 'block', boxSizing: 'border-box', width: '100%',
            marginTop: 6, padding: '18px 16px', cursor: 'pointer', borderRadius: 14,
            border: '1.5px solid #C8FF3D', background: 'rgba(8,8,10,.72)',
            boxShadow: '0 0 10px rgba(200,255,61,.35), 0 0 28px rgba(200,255,61,.14), inset 0 0 18px rgba(200,255,61,.06)',
          }}>
          <div style={{ font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 2, textTransform: 'uppercase', color: COLOR.dinero, marginBottom: 9 }}>
            ¿Vas a publicar tú?
          </div>
          <div style={{ font: `400 16px/1.45 ${FUENTE.ui}`, color: COLOR.texto, marginBottom: 10 }}>
            El <b style={{ fontWeight: 700 }}>80% de cada dólar</b> es tuyo, pagos por SPEI y sin exclusividad.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ font: `400 11px/1.45 ${FUENTE.mono}`, color: COLOR.textoSuave }}>
              Nadie ve tu nombre real
            </span>
            <span aria-hidden style={{ font: `700 16px/1 ${FUENTE.ui}`, color: COLOR.dinero }}>&#8594;</span>
          </div>
        </Enlace>
      </div>

      <div style={{ display: 'grid', gap: 12, marginTop: 6 }}>
        <Enlace a="/registro" className="miami-boton miami-boton-magenta">Crear mi cuenta</Enlace>
        <Enlace a="/acceso" className="miami-boton miami-boton-suave">Ya tengo cuenta</Enlace>
      </div>

      {/* La portada informativa va debajo, a todo el ancho y sobre fondo
          solido: es texto largo y no debe pelear con la escena. */}
      <div style={{ margin: '34px -22px -40px', padding: '0 22px 44px', background: COLOR.fondo }}>
        <Portada />
      </div>
    </PaginaMiami>
  )
}
