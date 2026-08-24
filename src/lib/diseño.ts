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

  /** Instrument Serif. Acentos editoriales en cursiva. */
  serif: "'Instrument Serif', serif",
} as const

/* ---------- Forma ---------- */

/** El diseño es de esquina viva. Solo hay dos radios en todo el proyecto:
 *  el circulo de los avatares y un 13 suelto. No se inventa una escala de
 *  radios que nadie usa. */
export const RADIO = {
  circulo: '50%',
} as const
