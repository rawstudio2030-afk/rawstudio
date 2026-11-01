/* Seis viñetas, una por paso de «cómo empezar».
 *
 * Antes ahi habia seis recuadros punteados que decian «captura 1…6». Se
 * dejaron vacios a proposito —una captura inventada de una pantalla que no
 * existe es una promesa que se rompe sola—, pero seis huecos en una pagina de
 * presentacion se leen como un sitio a medio hacer, que es peor que no tener
 * nada.
 *
 * Esto no son capturas ni pretenden serlo: son dibujos. No prometen como se ve
 * una pantalla, ilustran de que trata el paso. Cuando haya capturas de verdad,
 * entran en su lugar sin discusion.
 *
 * Mismo trazo que todo lo demas: puntos que se redibujan tres veces y
 * alternan. Ver src/lib/hervor.ts.
 */
import { useEffect, useRef, useState } from 'react'
import { Trazo } from './Hervor'
import { recta, circulo, arco, poligono, rectangulo, type Punto } from '../lib/hervor'

/* Todo esta dibujado en un lienzo de 100×100. */

type Dibujo = { pts: Punto[]; cerrado?: boolean; grosor?: number }[]

const DIBUJOS: Record<string, Dibujo> = {
  /** Sobre: correo y contraseña.
   *
   *  Era una ficha con retrato y renglones, igual que la de «verifica tu
   *  identidad»: dos pasos distintos con el mismo dibujo. En una tira de seis
   *  eso no se lee como dos cosas, se lee como un error. */
  cuenta: [
    { pts: rectangulo(13, 28, 87, 72), cerrado: true, grosor: 3 },
    { pts: recta(13, 28, 50, 54, 4) },
    { pts: recta(87, 28, 50, 54, 4) },
  ],

  /** Casilla marcada: «quiero publicar». La palomita va en DOS trazos y no en
   *  uno: la curva suave que pasa por tres puntos redondea el vertice y queda
   *  una uve blanda, no una palomita. */
  casilla: [
    { pts: rectangulo(18, 30, 50, 62), cerrado: true, grosor: 3 },
    { pts: recta(25, 46, 33, 55, 2), grosor: 3.4 },
    { pts: recta(33, 55, 46, 35, 3), grosor: 3.4 },
    { pts: recta(60, 40, 86, 40, 4) },
    { pts: recta(60, 52, 78, 52, 3) },
  ],

  /** Subir: el cuadro del video y una flecha que sale de el. */
  subir: [
    { pts: rectangulo(18, 40, 82, 80), cerrado: true, grosor: 3 },
    { pts: recta(50, 68, 50, 18, 5) },
    { pts: recta(37, 31, 50, 18, 2) },
    { pts: recta(63, 31, 50, 18, 2) },
  ],

  /** Identificacion: retrato, datos y la palomita de comprobado. */
  identidad: [
    { pts: rectangulo(10, 26, 90, 74), cerrado: true, grosor: 3 },
    { pts: circulo(32, 44, 7.5), cerrado: true },
    { pts: arco(32, 63, 11, 7, Math.PI, Math.PI * 2) },
    { pts: recta(50, 40, 80, 40, 4) },
    { pts: recta(50, 50, 70, 50, 3) },
    { pts: recta(52, 62, 58, 68, 2), grosor: 3.2 },
    { pts: recta(58, 68, 70, 56, 2), grosor: 3.2 },
  ],

  /** Etiqueta de precio, con su agujero. */
  precio: [
    { pts: poligono([[20, 54], [54, 20], [82, 20], [82, 48], [48, 82]], 4),
      cerrado: true, grosor: 3 },
    { pts: circulo(70, 32, 5.5), cerrado: true },
    { pts: recta(38, 52, 52, 38, 3) },
    { pts: recta(47, 61, 61, 47, 3) },
  ],

  /** Cobro: el billete y el dinero cayendo dentro. */
  cobro: [
    { pts: rectangulo(12, 38, 88, 76), cerrado: true, grosor: 3 },
    { pts: circulo(50, 57, 9), cerrado: true },
    { pts: recta(22, 57, 31, 57, 2) },
    { pts: recta(69, 57, 78, 57, 2) },
    { pts: recta(50, 8, 50, 28, 3) },
    { pts: recta(41, 20, 50, 29, 2) },
    { pts: recta(59, 20, 50, 29, 2) },
  ],
}

export type NombreVineta = keyof typeof DIBUJOS

export function Vineta({ nombre, color = 'currentColor' }: {
  nombre: string; color?: string
}) {
  const d = DIBUJOS[nombre]
  if (!d) return null
  return (
    <svg viewBox="0 0 100 100" aria-hidden
      style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}>
      {d.map((t, i) => (
        <Trazo key={i} pts={t.pts} cerrado={t.cerrado} color={color}
          grosor={t.grosor ?? 2.4} amplitud={1.3} semilla={i * 37 + nombre.length} />
      ))}
    </svg>
  )
}

/** Deja de animar lo que no se esta viendo.
 *
 *  Cada viñeta son cuatro o siete trazos por tres dibujos, y son seis viñetas.
 *  Sumadas al resto de la portada son casi sesenta grupos parpadeando once
 *  veces por segundo, casi todos fuera de pantalla casi todo el tiempo. En un
 *  telefono de gama baja eso se paga sin que nadie lo vea.
 *
 *  Pausar no cambia nada visualmente: la animacion se congela en el cuadro que
 *  tocaba, y como los tres dibujos son casi iguales, cualquiera sirve de
 *  imagen fija. */
export function useEnPantalla<T extends Element>() {
  const ref = useRef<T>(null)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const nodo = ref.current
    if (!nodo || typeof IntersectionObserver === 'undefined') return
    const obs = new IntersectionObserver(
      ([e]) => setVisible(e.isIntersecting),
      { rootMargin: '200px' },   // arranca antes de entrar, no al aparecer
    )
    obs.observe(nodo)
    return () => obs.disconnect()
  }, [])

  return { ref, visible }
}
