/* Los precios de venta de un VIDEO.
 *
 * Tres montos: 10, 20 o 40 dolares, en CENTAVOS (como todo el libro). Viven aqui y
 * no en cada pantalla para que el formulario de la creadora (`Upload.tsx`) y la
 * subida en lote del panel (`agruparVideos` en `lib/admin.ts`) NUNCA se desfasen:
 * el 2.40 que llenaba el catalogo era justo un valor inicial que nadie decidio.
 *
 * No hay un cuarto precio ni un monto libre en estas dos vias. El album tiene su
 * propio precio fijo y su propia pantalla, y no usa esto. */

export const PRECIOS_VIDEO = [1000, 2000, 4000] as const

/** El que arranca seleccionado en el formulario de publicar: 20 dolares. */
export const PRECIO_INICIAL = 2000

/** Uno de los tres, al azar. Se llama POR VIDEO: un lote no sale todo al mismo
 *  precio. `azar` existe para poder probarlo con valores conocidos. */
export function precioDeVideoAlAzar(azar: () => number = Math.random): number {
  const i = Math.min(PRECIOS_VIDEO.length - 1, Math.floor(azar() * PRECIOS_VIDEO.length))
  return PRECIOS_VIDEO[i]
}
