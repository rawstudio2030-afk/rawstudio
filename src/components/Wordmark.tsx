// El logo, como componente unico.
//
// Estaba copiado en siete pantallas con medidas y glow ligeramente distintos.
// Ademas ahora lleva a casa al tocarlo, que es lo que todo el mundo espera de
// un logo en un encabezado.
import { useNavigate, useLocation } from 'react-router-dom'
import { useSesion } from '../lib/sesion'
import wordmark from '../assets/wordmark.png'

// La proporcion real de la tinta del logo. El alto se deriva del ancho para no
// deformarlo; en español el titular tiene acentos y el logo no, pero la regla
// de no estirar la marca aplica igual.
const RATIO = 723 / 268

export default function Wordmark({
  ancho = 150,
  glow = 16,
  centrado = false,
}: { ancho?: number; glow?: number; centrado?: boolean }) {
  const nav = useNavigate()
  const { sesion } = useSesion()
  const aqui = useLocation().pathname

  // En la intro y en la puerta de edad el logo NO navega: saltarse el age gate
  // tocando el logo dejaria entrar sin confirmar la mayoria de edad, que es
  // justo lo que esa pantalla existe para impedir.
  const inerte = aqui === '/' || aqui === '/age'
  const destino = sesion ? '/clip' : '/entrar'

  const ir = () => {
    if (inerte) return
    // Si ya se esta en casa, se sube al inicio en vez de recargar la ruta.
    if (aqui === destino) { window.scrollTo({ top: 0 }); return }
    nav(destino)
  }

  return (
    <div
      onClick={ir}
      role={inerte ? undefined : 'link'}
      aria-label={inerte ? undefined : 'Ir al inicio'}
      style={{
        position: 'relative',
        width: ancho,
        height: Math.round(ancho / RATIO),
        transform: 'rotate(-2deg)',
        filter: `drop-shadow(0 0 ${glow}px rgba(255,43,209,.6))`,
        cursor: inerte ? 'default' : 'pointer',
        margin: centrado ? '0 auto' : undefined,
        flex: '0 0 auto',
      }}>
      <img src={wordmark} alt="RAWstudio"
        style={{ width: '100%', height: 'auto', display: 'block' }} />
    </div>
  )
}
