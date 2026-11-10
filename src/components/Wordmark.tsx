// El logo, como componente unico: «RAW» en Italiana y «studio» en Bodoni Moda
// italica (ver docs/diseno/descenso/README.md y `antes-despues.jpg`).
//
// Es TEXTO, no una imagen: escala sin pixelarse, el lector de pantalla lo lee
// una vez y sale de los mismos tokens que el resto del sitio. Sin tubo de
// neon, sin contorno hueco, sin resplandor: la marca es sobria.
//
// El color de «studio» cambia segun el piso en que se muestre (`piso`): champagne
// en Collins, que es el de casa; rosa palido en el antro; safelight en el cuarto
// oscuro; ambar en el calabozo.
//
// Ademas lleva a casa al tocarlo, que es lo que todo el mundo espera de un
// logo en un encabezado.
import { useNavigate, useLocation } from 'react-router-dom'
import { useSesion } from '../lib/sesion'
import { COLOR, FUENTE, PISO, type NombrePiso } from '../lib/diseño'
import { Pulsable } from './Pulsable'

// Cuantas veces cabe el ancho del logo en el tamaño de letra de «RAW»: con esta
// constante `ancho` sigue significando lo mismo que antes, que es lo que el
// resto de las pantallas ya le pasa. Se mide en el navegador, no se supone.
const ANCHO_EN_LETRA = 6.02

export default function Wordmark({
  ancho = 150,
  centrado = false,
  piso = 'collins',
}: { ancho?: number; centrado?: boolean; piso?: NombrePiso }) {
  const nav = useNavigate()
  const { sesion } = useSesion()
  const aqui = useLocation().pathname

  // En la intro y en la puerta de edad el logo NO navega: saltarse el age gate
  // tocando el logo dejaria entrar sin confirmar la mayoria de edad, que es
  // justo lo que esa pantalla existe para impedir.
  const inerte = aqui === '/' || aqui === '/age' || aqui === '/intro'
  const destino = sesion ? '/clip' : '/entrar'

  const ir = () => {
    if (inerte) return
    // Si ya se esta en casa, se sube al inicio en vez de recargar la ruta.
    if (aqui === destino) { window.scrollTo({ top: 0 }); return }
    nav(destino)
  }

  const pinta = {
    position: 'relative' as const,
    // El ancho es un tamaño de letra y no una caja: el texto manda.
    fontSize: ancho / ANCHO_EN_LETRA,
    lineHeight: 1,
    whiteSpace: 'nowrap' as const,
    cursor: inerte ? 'default' : 'pointer',
    margin: centrado ? '0 auto' : undefined,
    flex: '0 0 auto',
    userSelect: 'none' as const,
  }

  // El lector de pantalla lee «RAWstudio» una vez, no «R A W s t u d i o».
  const marca = (
    <span role="img" aria-label="RAWstudio" style={{ display: 'inline-flex', alignItems: 'baseline', gap: '.08em' }}>
      <span aria-hidden style={{
        fontFamily: FUENTE.deco, fontWeight: 400, letterSpacing: '.22em', color: COLOR.texto,
        fontFeatureSettings: '"kern" 1, "liga" 1',
      }}>RAW</span>
      <span aria-hidden style={{
        fontFamily: FUENTE.display, fontStyle: 'italic', fontWeight: 500, fontSize: '1.125em',
        letterSpacing: '.01em', marginLeft: '-.02em', color: PISO[piso].studio,
      }}>studio</span>
    </span>
  )

  // Inerte es la intro y la puerta de edad: ahi la marca no lleva a ningun
  // lado a proposito, asi que es una imagen y nada mas. Antes llevaba
  // `role="link"` puesto a mano sobre un div, que lo anunciaba como enlace
  // sin darle ni foco ni Enter: lo peor de las dos opciones.
  if (inerte) return <div style={pinta}>{marca}</div>

  return (
    <Pulsable al={ir} rotulo="Ir al inicio" style={pinta}>
      {marca}
    </Pulsable>
  )
}
