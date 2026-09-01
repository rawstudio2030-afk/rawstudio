/* Hervor de linea — «line boil».
 *
 * En animacion 2D tradicional cada cuadro se REDIBUJA a mano. Dos dibujos
 * nunca salen identicos, y esa diferencia minima entre uno y otro es lo que
 * hace que las lineas parezcan hervir. Se anima «a dos» o «a tres» —8 a 12
 * dibujos por segundo en vez de 24— y por eso se ve hecho a mano y no
 * interpolado por computadora.
 *
 * Aqui se imita con tres dibujos que se alternan. La gracia esta en que NO se
 * interpola: se salta de un dibujo al siguiente de golpe. Una interpolacion
 * suave daria un ondeo de bandera, que es exactamente lo contrario.
 *
 * Este archivo es solo geometria: recibe puntos, devuelve cadenas `d`. Quien
 * las hace parpadear es Hervor.tsx con CSS.
 *
 * Las figuras se definen como ARREGLOS DE PUNTOS y no como cadenas `d` ya
 * hechas. Temblar una cadena `d` obliga a interpretarla, y en cuanto aparece
 * un arco (`A rx ry rot bandera bandera x y`) hay numeros que no son
 * coordenadas: moverlos no despeina el trazo, lo rompe. Con puntos ese
 * problema no existe.
 */

export type Punto = [number, number]

/* ---------- azar reproducible ---------- */

/** mulberry32. Se necesita azar CON semilla, no `Math.random`: los tres
 *  dibujos tienen que salir siempre iguales o la figura cambiaria en cada
 *  render de React y el hervor se volveria un hormigueo. */
function azar(semilla: number) {
  let a = semilla >>> 0
  return () => {
    a = (a + 0x6D2B79F5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Mueve cada punto un poco. `amplitud` va en unidades del viewBox, asi que
 *  depende del tamaño del dibujo: en un icono de 24 basta con 0.4; en una
 *  ilustracion de 400 hacen falta 3 o 4 para que se note lo mismo. */
export function temblar(pts: Punto[], amplitud: number, semilla: number): Punto[] {
  const r = azar(semilla * 7919 + pts.length * 31 + 17)
  return pts.map(([x, y]) => [
    x + (r() - .5) * 2 * amplitud,
    y + (r() - .5) * 2 * amplitud,
  ])
}

/* ---------- puntos a curva ---------- */

/* Tres decimales, no dos.
 *
 * Con dos, en un dibujo de 200 unidades se pierde medio pixel y da igual. Pero
 * los recortes del iris se miden en la caja del elemento —de 0 a 1—, y ahi dos
 * decimales dejan solo cien posiciones posibles: el circulo se cuadriculaba y
 * salia un poligono con esquinas. */
const f = (v: number) => Math.round(v * 1000) / 1000

/** Catmull-Rom pasado a cubicas de Bezier: la curva pasa POR los puntos, que
 *  es lo que uno espera al dibujar, en vez de acercarse a ellos. */
export function curva(pts: Punto[], cerrado = false): string {
  if (pts.length < 2) return ''
  const n = pts.length
  const en = (i: number): Punto =>
    cerrado ? pts[(i + n * 2) % n] : pts[Math.min(Math.max(i, 0), n - 1)]

  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`
  const tramos = cerrado ? n : n - 1
  for (let i = 0; i < tramos; i++) {
    const p0 = en(i - 1), p1 = en(i), p2 = en(i + 1), p3 = en(i + 2)
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)},`
      +  `${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)},`
      +  `${f(p2[0])} ${f(p2[1])}`
  }
  return cerrado ? d + 'Z' : d
}

/** Los tres dibujos de una misma figura. */
export function hervir(pts: Punto[], o: {
  cuadros?: number; amplitud?: number; cerrado?: boolean; semilla?: number
} = {}): string[] {
  const { cuadros = 3, amplitud = 1, cerrado = false, semilla = 1 } = o
  return Array.from({ length: cuadros }, (_, i) =>
    curva(temblar(pts, amplitud, semilla + i * 131), cerrado))
}

/* ---------- generadores de figuras ---------- */

/** Una recta partida en tramos. Con dos puntos solo se moverian las puntas y
 *  el trazo quedaria recto; partida, tiembla a lo largo. */
export function recta(x1: number, y1: number, x2: number, y2: number, n = 6): Punto[] {
  return Array.from({ length: n + 1 }, (_, i) =>
    [x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n] as Punto)
}

/** Arco de elipse. Angulos en radianes, 0 a la derecha, creciendo en el
 *  sentido de las manecillas (la Y de SVG apunta hacia abajo). */
export function arco(cx: number, cy: number, rx: number, ry: number,
                     a0: number, a1: number, n = 16): Punto[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + (a1 - a0) * i / n
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry] as Punto
  })
}

export function circulo(cx: number, cy: number, r: number, n = 22): Punto[] {
  // Sin repetir el punto de cierre: `curva(..., true)` ya cierra el contorno.
  return Array.from({ length: n }, (_, i) => {
    const a = i / n * Math.PI * 2
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as Punto
  })
}

/** Espiral de Arquimedes. Es el iris de la intro: el radio crece parejo con
 *  el angulo, que es lo que la vuelve hipnotica y no un remolino. */
export function espiral(cx: number, cy: number, r0: number, r1: number,
                        vueltas: number, n = 160): Punto[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n
    const a = t * vueltas * Math.PI * 2
    const r = r0 + (r1 - r0) * t
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as Punto
  })
}

/** Curva de A a B, combada `comba` hacia un lado. Es como se dibujan los
 *  parpados: dos curvas entre los mismos dos extremos, una hacia arriba y
 *  otra hacia abajo. Comba positiva sale hacia la derecha del recorrido. */
export function curvaEntre(a: Punto, b: Punto, comba: number, n = 12): Punto[] {
  const [ax, ay] = a, [bx, by] = b
  const dx = bx - ax, dy = by - ay
  const largo = Math.hypot(dx, dy) || 1
  const nx = -dy / largo, ny = dx / largo
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n
    const k = 1 - (2 * t - 1) ** 2      // 0 en las puntas, 1 a la mitad
    return [ax + dx * t + nx * comba * k, ay + dy * t + ny * comba * k] as Punto
  })
}
