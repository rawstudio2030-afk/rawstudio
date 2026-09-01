/* Piezas que hierven.
 *
 * Dos maneras de sacar los tres dibujos, segun de donde venga el arte:
 *
 *   Trazo    — para figuras nuevas, definidas como puntos. Cada cuadro es un
 *              REDIBUJO de verdad: los puntos se mueven y la curva se vuelve
 *              a calcular. Es lo mas parecido a como se hace a mano.
 *
 *   Hervido  — para arte que ya existe (los once iconos, por ejemplo). No se
 *              puede redibujar lo que no esta hecho de puntos, asi que se
 *              deforma con ruido: tres filtros con semilla distinta y se va
 *              cambiando de filtro. El resultado se parece bastante y no
 *              obliga a rehacer nada.
 *
 * Quien hace el parpadeo en los dos casos es la clase `.hervor` de index.css.
 */
import { useMemo, type ReactNode } from 'react'
import { hervir, recta, type Punto } from '../lib/hervor'
import { COLOR } from '../lib/diseño'

/* ---------- redibujo ---------- */

export function Trazo({
  pts, cerrado = false, amplitud = 1, semilla = 1,
  color = 'currentColor', relleno = 'none', grosor = 2,
  guion, opacidad, remate = 'round',
}: {
  pts: Punto[]
  cerrado?: boolean
  /** En unidades del viewBox. En un icono de 24 basta .4; en un dibujo de
   *  400 hacen falta 3 o 4 para que se note lo mismo. */
  amplitud?: number
  semilla?: number
  color?: string
  relleno?: string
  grosor?: number
  /** strokeDasharray. Cortar el trazo imita el rayado de linoleo. */
  guion?: string
  opacidad?: number
  remate?: 'round' | 'butt' | 'square'
}) {
  const cuadros = useMemo(
    () => hervir(pts, { amplitud, cerrado, semilla }),
    // pts se arma en cada render, pero `hervir` es determinista: sale la misma
    // cadena y React no toca el DOM. El memo es por no recalcular, no por
    // evitar parpadeos.
    [pts, amplitud, cerrado, semilla],
  )
  return (
    <g className="hervor">
      {cuadros.map((d, i) => (
        <path key={i} d={d} fill={relleno} stroke={color} strokeWidth={grosor}
          strokeDasharray={guion} strokeLinecap={remate} strokeLinejoin="round"
          opacity={opacidad} />
      ))}
    </g>
  )
}

/* ---------- deformacion por ruido ---------- */

/** Los tres filtros. Se pintan UNA vez en el arbol; los `url(#hervor-n)`
 *  de cualquier SVG del documento los encuentran.
 *
 *  Ojo: `baseFrequency` se mide en unidades del dibujo que se filtra. Estos
 *  valores estan calibrados para arte de unas 24 unidades —los iconos—. En un
 *  dibujo de 400 el mismo ruido queda tan fino que no se ve. */
export function FiltrosHervor() {
  return (
    <svg aria-hidden width="0" height="0"
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
      <defs>
        {[0, 1, 2].map(i => (
          <filter key={i} id={`hervor-${i}`}
            x="-30%" y="-30%" width="160%" height="160%"
            colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.09"
              numOctaves="2" seed={5 + i * 13} result="ruido" />
            <feDisplacementMap in="SourceGraphic" in2="ruido" scale="1.1"
              xChannelSelector="R" yChannelSelector="G" />
          </filter>
        ))}
      </defs>
    </svg>
  )
}

/** Envuelve arte ya dibujado para que hierva. Necesita <FiltrosHervor/> en
 *  algun lugar de la pagina. */
export function Hervido({ children }: { children: ReactNode }) {
  return (
    <g className="hervor">
      {[0, 1, 2].map(i => (
        <g key={i} filter={`url(#hervor-${i})`}>{children}</g>
      ))}
    </g>
  )
}

/* ---------- adornos ---------- */

/** La rayita que abre cada seccion, dibujada a mano en vez de ser un div de
 *  44x2. Es el detalle mas barato del sitio y el que mas se repite: cambia el
 *  tono de todo el cuerpo de la portada sin tocar el texto. */
export function Regla({ ancho = 56, grosor = 2.6, color = COLOR.acento }: {
  ancho?: number; grosor?: number; color?: string
}) {
  return (
    <svg width={ancho} height={11} viewBox={`0 0 ${ancho} 11`} aria-hidden
      style={{ display: 'block', overflow: 'visible' }}>
      <Trazo pts={recta(1.5, 5.5, ancho - 1.5, 5.5, 5)} amplitud={1.3}
        grosor={grosor} color={color} semilla={ancho + 3} />
    </svg>
  )
}

/** Un lado de un marco dibujado a mano.
 *
 *  Cada lado es su propio SVG y se estira SOLO a lo largo. Un marco entero en
 *  un unico SVG estirado en las dos direcciones adelgaza los trazos
 *  horizontales y engorda los verticales —o al reves—, y el dibujo delata que
 *  es un rectangulo de CSS disfrazado. Estirado en una sola direccion, lo
 *  unico que cambia es cuanto se separan las ondulaciones. */
export function Borde({ lado, color = COLOR.acento, grosor = 2.4, semilla = 7 }: {
  lado: 'arriba' | 'abajo' | 'izquierda' | 'derecha'
  color?: string; grosor?: number; semilla?: number
}) {
  const vertical = lado === 'izquierda' || lado === 'derecha'
  const posicion: React.CSSProperties = vertical
    ? { top: 0, height: '100%', width: 7, [lado === 'izquierda' ? 'left' : 'right']: -3.5 }
    : { left: 0, width: '100%', height: 7, [lado === 'arriba' ? 'top' : 'bottom']: -3.5 }

  return (
    <svg aria-hidden preserveAspectRatio="none"
      viewBox={vertical ? '0 0 7 300' : '0 0 300 7'}
      style={{ position: 'absolute', pointerEvents: 'none', ...posicion }}>
      <Trazo grosor={grosor} color={color} semilla={semilla} amplitud={1.2} remate="butt"
        pts={vertical ? recta(3.5, 0, 3.5, 300, 24) : recta(0, 3.5, 300, 3.5, 24)} />
    </svg>
  )
}

/** Los cuatro lados. Quien lo use necesita `position: relative`. */
export function Marco({ color = COLOR.acento, grosor = 2.4 }: {
  color?: string; grosor?: number
}) {
  const lados = ['arriba', 'derecha', 'abajo', 'izquierda'] as const
  return <>{lados.map((l, i) =>
    <Borde key={l} lado={l} color={color} grosor={grosor} semilla={7 + i * 23} />)}</>
}
