/* Guías de grabación para creadoras (PDF).
 *
 * Los PDF y las miniaturas viven en `public/guias/` y los mantiene el
 * coordinador: aquí NO se generan ni se editan. Son estáticos; GitHub Pages los
 * sirve tal cual en `/guias/…`, fuera del HashRouter y fuera del bundle de JS.
 *
 * Esta lista es la del FRONT. El bot de Telegram tiene la suya en
 * `supabase/functions/telegram-bot/index.ts` (otro runtime: una función de borde
 * no puede importar de `src/`). Si se añade o se renombra una guía, se cambian
 * las dos; los nombres de archivo son lo que las une.
 */

export type Guia = {
  /** Estable: nombre del archivo sin `guia-` ni extensión. */
  id: string
  /** Lo que se lee en la tarjeta. */
  titulo: string
  /** A qué se aplica, en una línea. */
  aplica: string
  archivo: string
  portada: string
  /** «10 páginas · PDF». Va escrito porque cada PDF tiene el suyo. */
  detalle: string
}

/** Ajustes y consejos del teléfono, uno por familia de iPhone. */
export const GUIAS_IPHONE: Guia[] = [
  { id: 'iphone12', titulo: 'iPhone 12', aplica: 'iPhone 12',
    archivo: 'guia-iphone12.pdf', portada: 'portada-iphone12.webp', detalle: '10 páginas · PDF' },
  { id: 'iphone13', titulo: 'iPhone 13', aplica: 'iPhone 13 y 13 mini',
    archivo: 'guia-iphone13.pdf', portada: 'portada-iphone13.webp', detalle: '10 páginas · PDF' },
  { id: 'iphone14', titulo: 'iPhone 14', aplica: 'iPhone 14 y 14 Plus',
    archivo: 'guia-iphone14.pdf', portada: 'portada-iphone14.webp', detalle: '10 páginas · PDF' },
  { id: 'iphone15-16-17', titulo: 'iPhone 15 · 16 · 17', aplica: 'iPhone 15, 15 Plus, 16, 16 Plus y 17',
    archivo: 'guia-iphone15-16-17.pdf', portada: 'portada-iphone15-16-17.webp', detalle: '10 páginas · PDF' },
]

/** «Cómo grabar tu contenido sin regarla»: dos versiones. Sola primero. */
export const GUIAS_SIN_REGARLA: Guia[] = [
  { id: 'sin-regarla-sola', titulo: 'Grabando sola', aplica: 'Tus límites, el set, la luz, el sonido y los ángulos, y qué revisar antes de subir.',
    archivo: 'guia-sin-regarla-sola.pdf', portada: 'portada-sin-regarla-sola.webp', detalle: '15 páginas · PDF' },
  { id: 'sin-regarla-pareja', titulo: 'En pareja', aplica: 'El acuerdo, el set, la luz, el sonido y los ángulos, y qué revisar antes de subir.',
    archivo: 'guia-sin-regarla-pareja.pdf', portada: 'portada-sin-regarla-pareja.webp', detalle: '14 páginas · PDF' },
]

/** Ruta de un archivo de `public/guias/`. `BASE_URL` y no un dominio escrito a
 *  mano: el sitio cambia de dirección y esto no debe enterarse. */
export const rutaGuia = (archivo: string): string => `${import.meta.env.BASE_URL}guias/${archivo}`
