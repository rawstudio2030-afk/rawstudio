// El logo, como componente unico: «RAW» en magenta y «studio» en lima, con
// resplandor de letrero de neon (ver DESIGN-BRIEF.md y design/wordmark-neon.svg).
//
// Es TEXTO, no una imagen. El SVG de referencia pide Arial Black, que no
// existe en Android ni en iOS, asi que alli cada telefono dibujaria otra
// letra. Aqui se usa Space Grotesk, que ya se carga, y por eso el logo se ve
// igual en todas partes, escala sin pixelarse y el resplandor sale de los
// mismos tokens que el resto del sitio.
//
// Ademas lleva a casa al tocarlo, que es lo que todo el mundo espera de un
// logo en un encabezado.
import { useNavigate, useLocation } from 'react-router-dom'
import { useSesion } from '../lib/sesion'
import { COLOR, FUENTE } from '../lib/diseño'
import { Pulsable } from './Pulsable'

// Cuantas veces cabe el ancho del logo en su tamaño de letra: con esta
// constante `ancho` sigue significando lo mismo que con el PNG, que es lo que
// el resto de las pantallas ya le pasa. Se mide en el navegador, no se supone.
const ANCHO_EN_LETRA = 4.87

/** Resplandor de letrero de neon. `glow` es el mismo numero que ya recibia el
 *  logo (el desenfoque en px del halo): se reparte en tres capas, un nucleo
 *  claro, el color y un halo ancho. */
function neon(color: string, glow: number) {
  return [
    `0 0 ${Math.max(1, glow * .22)}px rgba(255,255,255,.4)`,
    `0 0 ${glow * .55}px ${color}`,
    `0 0 ${glow * 1.5}px ${color}99`,
  ].join(', ')
}

/** Letrero de tubo: la letra es HUECA, solo contorno, y el resplandor sale de
 *  ese contorno (`drop-shadow` sigue los pixeles pintados, no la caja). Es lo
 *  que se ve en los mockups. Solo con tamaño suficiente: a 118 px un contorno
 *  de un pixel se pierde, y ahi se usa la letra rellena. */
function tuboDe(color: string, nucleo: string, glow: number, letra: number) {
  return {
    color: 'transparent',
    WebkitTextStroke: `${Math.max(1.4, letra * .045)}px ${nucleo}`,
    filter: [
      `drop-shadow(0 0 ${Math.max(1, glow * .18)}px ${nucleo})`,
      `drop-shadow(0 0 ${glow * .6}px ${color})`,
      `drop-shadow(0 0 ${glow * 1.5}px ${color}AA)`,
    ].join(' '),
  }
}

export default function Wordmark({
  ancho = 150,
  glow = 16,
  centrado = false,
  tubo,
}: { ancho?: number; glow?: number; centrado?: boolean; tubo?: boolean }) {
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

  const esTubo = tubo ?? ancho >= 130
  const letra = ancho / ANCHO_EN_LETRA

  const pinta = {
    position: 'relative' as const,
    // El ancho es un tamaño de letra y no una caja: el texto manda.
    fontSize: ancho / ANCHO_EN_LETRA,
    lineHeight: 1,
    whiteSpace: 'nowrap' as const,
    fontFamily: FUENTE.ui, fontWeight: esTubo ? 500 : 700,
    letterSpacing: esTubo ? '.01em' : '-.02em',
    cursor: inerte ? 'default' : 'pointer',
    margin: centrado ? '0 auto' : undefined,
    flex: '0 0 auto',
    userSelect: 'none' as const,
  }

  // El lector de pantalla lee «RAWstudio» una vez, no «R A W s t u d i o».
  const marca = (
    <span role="img" aria-label="RAWstudio" style={{ display: 'inline-flex', alignItems: 'baseline' }}>
      <span aria-hidden style={{
        color: COLOR.acento, textTransform: 'uppercase',
        ...(esTubo
          ? tuboDe(COLOR.acento, '#FF8BEA', glow * 1.4, letra)
          : { textShadow: neon(COLOR.acento, glow) }),
      }}>RAW</span>
      <span aria-hidden style={{
        color: COLOR.dinero, fontSize: '.92em', marginLeft: '.04em',
        ...(esTubo
          ? tuboDe(COLOR.dinero, '#E6FF8F', glow * 1.4, letra)
          : { textShadow: neon(COLOR.dinero, glow) }),
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
