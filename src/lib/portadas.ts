import { COLOR } from './diseño'
/** Portada generada cuando un clip no tiene imagen propia.
 *
 *  En vez de un rectángulo gris, se dibuja un patrón op-art derivado del
 *  identificador del clip: siempre el mismo para el mismo clip, distinto entre
 *  clips, y sin pesar un solo byte de red.
 *
 *  Sirve para la demostración y también para clips reales cuya creadora no
 *  subió portada: un catálogo con huecos grises se ve roto; con patrones se ve
 *  intencional. */

const ACENTOS = [COLOR.acento, COLOR.dinero, COLOR.admin]

/** Hash pequeño y estable. No necesita ser criptográfico: solo repartir. */
function semilla(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

export function portadaGenerada(id: string): string {
  const s = semilla(id)
  const acento = ACENTOS[s % ACENTOS.length]
  const giro = s % 180
  const anillos = 7 + (s % 6)
  const centroX = 30 + (s % 40)
  const centroY = 30 + ((s >> 3) % 40)

  // Anillos concéntricos deformados, el mismo recurso op-art del resto de la
  // marca. Se construye como SVG en un data URI: no viaja por la red.
  const capas = Array.from({ length: anillos }, (_, i) => {
    const r = 8 + i * (46 / anillos)
    const op = (0.5 - i * 0.03).toFixed(2)
    return `<circle cx="${centroX}" cy="${centroY}" r="${r}" fill="none" stroke="${acento}" stroke-opacity="${op}" stroke-width="${1.2 + (i % 3) * 0.5}"/>`
  }).join('')

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 133" preserveAspectRatio="xMidYMid slice">` +
    `<rect width="100" height="133" fill="#0F0F13"/>` +
    `<g transform="rotate(${giro} 50 66)">${capas}</g>` +
    `<rect width="100" height="133" fill="url(#g)"/>` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${COLOR.fondo}" stop-opacity="0"/>` +
    `<stop offset="1" stop-color="${COLOR.fondo}" stop-opacity=".85"/>` +
    `</linearGradient></defs></svg>`

  // Los parentesis van codificados a mano: encodeURIComponent NO los toca, y
  // dentro de un url() de CSS el ')' del rotate() cierra la regla antes de
  // tiempo. El sintoma es una portada en blanco, sin error en consola.
  const codificado = encodeURIComponent(svg)
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
  return `data:image/svg+xml;utf8,${codificado}`
}

/** Devuelve la portada real si existe, y si no, una generada. */
export function portadaDe(id: string, url: string | null): string {
  return url ?? portadaGenerada(id)
}
