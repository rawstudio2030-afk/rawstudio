/* Tokens de diseño.
 *
 * Antes de este archivo, `MONO` estaba declarado 18 veces —con dos variantes
 * distintas de la misma cadena— y los colores eran literales sueltos: 80
 * apariciones del fondo, 74 del magenta. Cambiar un color significaba
 * buscar y reemplazar por todo el proyecto y confiar en no olvidar ninguna.
 *
 * Los valores de aqui son EXACTAMENTE los que ya estaban en uso. Este archivo
 * no rediseña nada: le pone nombre a lo que existe.
 */

/* ---------- Color ---------- */

export const COLOR = {
  /** Fondo de la aplicacion. Casi negro, con una pizca de azul. */
  fondo: '#08080A',

  /** Superficies elevadas sobre el fondo: tarjetas, campos, barras.
   *  Dos escalones nada mas; la interfaz se apoya en bordes, no en sombras. */
  superficie: '#111116',
  superficieAlta: '#191920',

  /** Texto principal. Blanco roto: el blanco puro sobre este fondo vibra. */
  texto: '#F2F0F3',

  /** Tres escalones de texto secundario, de mas a menos presente.
   *  `apagado` es el limite legible; por debajo no bajar. */
  textoSuave: '#9C979F',
  textoTenue: '#6E6A72',
  textoApagado: '#5E5A63',

  /** Magenta. El acento de la marca: botones principales y enfasis.
   *  Se usa igual de fondo (20 veces) que de texto (18). */
  acento: '#FF2BD1',

  /** Verde limon. Dinero, saldos y estados afirmativos. Casi siempre texto. */
  dinero: '#C8FF3D',

  /** Cian. Reservado para lo administrativo y para el foco de teclado.
   *  Es la señal de "esto es privilegiado"; no usarlo decorativamente. */
  admin: '#00E5FF',
} as const

/** Bordes. La interfaz se define por lineas de blanco translucido, no por
 *  sombras. Cuatro pesos, del apenas visible al claramente marcado. */
export const LINEA = {
  tenue: 'rgba(255,255,255,.09)',
  suave: 'rgba(255,255,255,.12)',
  media: 'rgba(255,255,255,.14)',
  fuerte: 'rgba(255,255,255,.16)',
  marcada: 'rgba(255,255,255,.18)',
} as const

/** Velos del color de fondo, para barras fijas y capas sobre contenido. */
export const VELO = {
  ligero: 'rgba(8,8,10,.55)',
  medio: 'rgba(8,8,10,.9)',
  denso: 'rgba(8,8,10,.94)',
} as const

/** Tintes de los acentos, para fondos de realce muy bajos. */
export const TINTE = {
  acento: 'rgba(255,43,209,.06)',
  acentoBorde: 'rgba(255,43,209,.42)',
  dinero: 'rgba(200,255,61,.05)',
  dineroBorde: 'rgba(200,255,61,.4)',
} as const

/* ---------- Tipografia ---------- */

export const FUENTE = {
  /** Anton. Titulares grandes en mayusculas.
   *  Ojo con el interlineado: por debajo de 1 recorta los acentos del
   *  español (la O de COMO perdia la tilde). En pantallas en español, 1. */
  display: 'Anton, sans-serif',

  /** Space Grotesk. Texto de interfaz. */
  ui: "'Space Grotesk', system-ui, sans-serif",

  /** Space Mono. Cifras, identificadores, fechas y datos tabulares:
   *  todo lo que se lee en columna y debe alinearse. */
  mono: "'Space Mono', monospace",

} as const

/* ---------- Forma ---------- */

/** El diseño es de esquina viva. Solo hay dos radios en todo el proyecto:
 *  el circulo de los avatares y un 13 suelto. No se inventa una escala de
 *  radios que nadie usa. */
export const RADIO = {
  circulo: '50%',
  /** Botones y tarjetas de neon de la portada, como en los mockups. Es el
   *  unico radio de «esquina suave»: el resto del sitio sigue de esquina viva. */
  neon: 14,
} as const

/* ======================================================================
 * Miami Neon Night — tokens aditivos (ver DESIGN-BRIEF.md)
 *
 * Todo lo de arriba sigue igual. Esto solo AÑADE lo que pide la direccion
 * nueva: resplandor de neon, degradados de noche y la paleta de la escena de
 * la portada. Magenta, cian y lima son los mismos de COLOR; aqui se nombran
 * sus resplandores, que antes estaban escritos a mano en cada pantalla.
 * ====================================================================== */

/** Resplandor. Para `boxShadow`, salvo `texto*` (`textShadow`) y `imagen`
 *  (`filter`, para PNG/SVG con transparencia).
 *
 *  Un `clip-path` recorta el resplandor del mismo elemento: si la pieza lleva
 *  esquina cortada, el brillo va en su contenedor. */
export const GLOW = {
  magenta: '0 0 14px rgba(255,43,209,.55), 0 0 38px rgba(255,43,209,.28)',
  magentaFuerte: '0 0 18px rgba(255,43,209,.7), 0 0 52px rgba(255,43,209,.38)',
  cian: '0 0 14px rgba(0,229,255,.5), 0 0 36px rgba(0,229,255,.24)',
  lima: '0 0 12px rgba(200,255,61,.45), 0 0 30px rgba(200,255,61,.2)',
  /** Anillo de 1 px: foco y seleccion, tambien en modo sobrio. */
  hilo: '0 0 0 1px rgba(255,43,209,.5)',

  /** `textShadow` de letrero de neon: nucleo claro, luego el color. */
  textoMagenta: '0 0 4px rgba(255,255,255,.45), 0 0 10px #FF2BD1, 0 0 26px rgba(255,43,209,.65), 0 0 54px rgba(255,43,209,.35)',
  textoLima: '0 0 4px rgba(255,255,255,.4), 0 0 10px #C8FF3D, 0 0 24px rgba(200,255,61,.55), 0 0 48px rgba(200,255,61,.28)',
  textoCian: '0 0 4px rgba(255,255,255,.4), 0 0 10px #00E5FF, 0 0 24px rgba(0,229,255,.55)',

  /** `filter` para una imagen con transparencia. */
  imagen: (px: number, rgba = '255,43,209,.6') => `drop-shadow(0 0 ${px}px rgba(${rgba}))`,
} as const

/** Degradados de la escena nocturna. Son de FONDO: nunca de texto de lectura. */
export const DEGRADADO = {
  /** Cielo de la portada: casi negro arriba, violeta y magenta hacia el
   *  horizonte, como la luz de una ciudad que no se apaga. */
  cielo: 'linear-gradient(180deg, #08080A 0%, #0C0716 34%, #1A0B2E 62%, #3A0F4A 82%, #6A1458 100%)',
  /** Piso mojado: el horizonte se apaga hacia abajo. */
  suelo: 'linear-gradient(180deg, rgba(106,20,88,.55) 0%, rgba(26,11,46,.85) 40%, #08080A 100%)',
  /** Filete que va de magenta a cian. */
  hilo: 'linear-gradient(90deg, #FF2BD1, #00E5FF)',
  /** Capa de color para las portadas del catalogo (van con `mix-blend-mode:
   *  soft-light`). La portada publica es una miniatura de 240 px: se le da el
   *  tono de la casa. */
  duotono: 'linear-gradient(135deg, rgba(255,43,209,.7), rgba(0,229,255,.6))',
} as const

/** Paleta de la escena (edificios, ventanas, palmeras). Solo para ilustracion:
 *  no se usa en la interfaz. */
export const MIAMI = {
  edificio: '#0B0813',
  edificioClaro: '#140D22',
  palmera: '#06050A',
  agua: '#0A0612',
} as const
