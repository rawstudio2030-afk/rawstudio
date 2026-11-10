/* Tokens de diseño — «El descenso».
 *
 * La brújula de la dirección visual es `docs/diseno/descenso/README.md`
 * (maqueta aprobada el 10 nov 2026). Aquí viven los valores; si algo de la
 * maqueta cambia, se cambia en un solo sitio: este.
 *
 * El sitio es un edificio en el que se baja. Cuatro pisos, cada uno con su
 * paleta (`PISO`): Collins (planta baja, marca de llegada), el antro, el cuarto
 * oscuro y el calabozo. `COLOR` es la paleta «de casa»: la que usa cualquier
 * pantalla que no es de un piso concreto (la aplicación, el estudio, el admin).
 *
 * Contraste: los pares de texto de abajo se midieron contra WCAG 2.x (AA = 4.5
 * en texto normal). Lo que cumple, está anotado al lado.
 */

/* ---------- Color (paleta de casa) ---------- */

export const COLOR = {
  /** Fondo de la aplicación: el «void» de Collins, un azul noche muy oscuro. */
  fondo: '#0E1520',

  /** Superficies elevadas: tarjetas, campos, barras. Dos escalones nada más;
   *  la interfaz se apoya en bordes, no en sombras. */
  superficie: '#141C28',
  superficieAlta: '#1C2636',

  /** Texto principal: marfil. 15.5:1 sobre `fondo`. */
  texto: '#F3EBE2',

  /** Tres escalones de texto secundario, de más a menos presente. Los tres
   *  pasan AA (≥ 4.5) sobre `fondo`, `superficie` y `superficieAlta`.
   *  `textoApagado` es el límite legible; por debajo no bajar. */
  textoSuave: '#C9BDB0',   // 9.9 / 9.3 / 8.3
  textoTenue: '#A89D92',   // 6.9 / 6.4 / 5.7
  textoApagado: '#9A8F85', // 5.8 / 5.4 / 4.8

  /** Champagne. El acento «de casa»: botón principal y énfasis fuera de un piso
   *  concreto. Se usa de fondo y de texto. Cuando es FONDO el texto va oscuro
   *  (`sobreAcento`): 8.7:1. Marfil sobre champagne no llega a AA. */
  acento: '#D4B483',
  sobreAcento: '#141C28',

  /** Ámbar. Dinero, saldos y estados afirmativos. Casi siempre texto
   *  (9.3:1 sobre `fondo`). */
  dinero: '#E0B15A',

  /** Agua de mar (seafoam). Reservado para lo administrativo y el foco de
   *  teclado: es la señal de «esto es privilegiado» y por eso es el único tono
   *  frío del sitio; no usarlo decorativamente. 8.7:1 sobre `fondo`. */
  admin: '#7EBFB3',

  /** Estados, no marca: error y aviso. Pasan AA (≥ 4.5) sobre `fondo`,
   *  `superficie` y `superficieAlta`. No se usan de adorno. */
  error: '#FF5A5A',  // 6.0 / 5.6 / 5.0
  aviso: '#FFB020',  // 10.0 / 9.4 / 8.3
} as const

/** Bordes. La interfaz se define por líneas de marfil translúcido, no por
 *  sombras. Cinco pesos, del apenas visible al claramente marcado. */
export const LINEA = {
  tenue: 'rgba(243,235,226,.09)',
  suave: 'rgba(243,235,226,.12)',
  media: 'rgba(243,235,226,.14)',
  fuerte: 'rgba(243,235,226,.16)',
  marcada: 'rgba(243,235,226,.18)',
} as const

/** Velos del color de fondo, para barras fijas y capas sobre contenido. */
export const VELO = {
  ligero: 'rgba(14,21,32,.55)',
  medio: 'rgba(14,21,32,.9)',
  denso: 'rgba(14,21,32,.94)',
} as const

/** Tintes de los acentos, para fondos de realce muy bajos. */
export const TINTE = {
  acento: 'rgba(212,180,131,.07)',
  acentoBorde: 'rgba(212,180,131,.42)',
  dinero: 'rgba(224,177,90,.06)',
  dineroBorde: 'rgba(224,177,90,.4)',
} as const

/* ---------- Pisos ---------- */

/** Paleta de cada piso (hex de la maqueta). `studio` es el color de «studio» en
 *  el wordmark cuando la marca está dentro de ese piso. */
export const PISO = {
  /** Planta baja · Collins Avenue. Art déco de Miami Beach al atardecer. */
  collins: {
    cielo: '#0E1520',
    navy: '#141C28',
    champagne: '#D4B483',
    blush: '#E8B4A8',
    seafoam: '#7EBFB3',
    oro: '#C9A86A',
    coral: '#C47A6A',
    marfil: '#F3EBE2',
    /** Botón primario: texto `#141C28` sobre este degradado (7.6–11.6:1). */
    botonDe: '#E8D2A4',
    botonA: '#C9A86A',
    studio: '#D4B483',
  },
  /** −1 · El antro. Club subterráneo, haces violeta y ámbar. */
  antro: {
    vacio: '#08060E',
    violeta: '#7A3FA0',
    violetaClaro: '#9A58C4',
    rosa: '#C45A8A',
    ambar: '#D4923A',
    hielo: '#D8D2E0',
    /** Botón primario: blanco sobre este degradado. Para texto normal, el
     *  violeta oscuro (6.9:1); el claro queda en 4.6:1, justo. */
    botonDe: '#9A58C4',
    botonA: '#7A3FA0',
    studio: '#D4A0C8',
  },
  /** −2 · Cuarto oscuro. Laboratorio fotográfico, luz de seguridad roja. */
  oscuro: {
    vacio: '#080405',
    safelight: '#B3121B',
    safelightLit: '#D4212C',
    papel: '#F4EEE4',
    ambar: '#C9A04A',
    plata: '#A39B96',
    apagado: '#C4B8B0',
    /** «studio» del wordmark. La maqueta dice `#D4212C` (el safelight lit), pero
     *  sobre el negro del laboratorio da 3.9:1 y falla AA en el tamaño chico del
     *  encabezado; este es un punto mas claro (5.1:1 sobre `vacio`). */
    studio: '#E8404A',
  },
  /** −3 · El calabozo. Piedra, velas y hierro. */
  calabozo: {
    vacio: '#0B0A09',
    profundo: '#080605',
    sangre: '#7A1F24',
    sangreLit: '#9A2A30',
    ambar: '#E0B15A',
    ambarVivo: '#E8C989',
    hueso: '#F0E6D6',
    laton: '#C9A25A',
    apagado: '#B5A898',
    hierro: '#3D3832',
    studio: '#E0B15A',
  },
} as const

export type NombrePiso = keyof typeof PISO

/** Botones primarios por piso: fondo y texto con contraste AA ya comprobado.
 *  El cuarto oscuro lleva el safelight APAGADO (`#B3121B`) como fondo sólido:
 *  papel sobre el «lit» da 4.49 y falla por 0.01. */
export const BOTON = {
  collins: { fondo: `linear-gradient(135deg, ${PISO.collins.botonDe}, ${PISO.collins.botonA})`, texto: '#141C28' },
  antro: { fondo: `linear-gradient(135deg, ${PISO.antro.botonDe}, ${PISO.antro.botonA})`, texto: '#FFFFFF' },
  oscuro: { fondo: PISO.oscuro.safelight, texto: PISO.oscuro.papel },
  calabozo: { fondo: `linear-gradient(135deg, ${PISO.calabozo.sangreLit}, ${PISO.calabozo.sangre})`, texto: PISO.calabozo.hueso },
} as const

/* ---------- Tipografía ---------- */

/** Las familias de Collins y de la aplicación se cargan en el primer paint
 *  (`index.html`). Las de los demás pisos, en una segunda hoja diferida: no
 *  deben aparecer en pantallas que no las usan. */
export const FUENTE = {
  /** Bodoni Moda. Titulares y énfasis: serif de alto contraste. Sin
   *  mayúsculas forzadas. Ojo con el interlineado: por debajo de 1 recorta los
   *  acentos del español. */
  display: "'Bodoni Moda', 'Didot', Georgia, serif",

  /** Italiana. SOLO la «RAW» del wordmark. */
  deco: "Italiana, 'Bodoni Moda', Georgia, serif",

  /** Space Grotesk. Texto de interfaz de la aplicación y del admin: denso y
   *  legible a tamaño chico. */
  ui: "'Space Grotesk', system-ui, sans-serif",

  /** Josefin Sans. Interfaz de Collins: navegación, botones y textos de las
   *  pantallas de llegada. */
  collins: "'Josefin Sans', 'Space Grotesk', system-ui, sans-serif",

  /** IBM Plex Mono. Cifras, identificadores, fechas y datos tabulares: todo lo
   *  que se lee en columna y debe alinearse. */
  mono: "'IBM Plex Mono', ui-monospace, monospace",

  /* --- Familias de pisos (segunda hoja, diferida) --- */
  /** Letrero «Collins Avenue». Solo esa pieza. */
  neon: "Monoton, 'Josefin Sans', sans-serif",
  /** El antro: títulos, cifras y botones. */
  antro: "Unbounded, 'Space Grotesk', sans-serif",
  antroNum: "'Bebas Neue', Impact, sans-serif",
  /** Cuarto oscuro: títulos, etiquetas de laboratorio, lápiz graso, botones. */
  oscuro: "'DM Serif Display', 'Bodoni Moda', Georgia, serif",
  etiqueta: "'Courier Prime', 'Courier New', monospace",
  lapiz: "'Permanent Marker', 'Comic Sans MS', cursive",
  barlow: "Barlow, 'Space Grotesk', sans-serif",
  /** Calabozo: placas, titulares y plomo, botones remachados. */
  placa: "Cinzel, 'Bodoni Moda', Georgia, serif",
  garamond: "'EB Garamond', Garamond, Georgia, serif",
  condensada: "'Barlow Condensed', 'Barlow', sans-serif",
  /** Firma «Descenso» del pie. Opcional: si no carga, serif. */
  gotica: "'Grenze Gotisch', 'EB Garamond', serif",
} as const

/* ---------- Forma ---------- */

/** El sitio no es de esquina redondeada tipo app: Collins y el antro son
 *  vivos y el calabozo casi (1 px). No se inventa una escala de radios. */
export const RADIO = {
  circulo: '50%',
  /** Botones, campos y tarjetas: casi vivo. */
  filo: 1,
} as const

/* ---------- Luz ---------- */

/** Resplandor y luz de los pisos. Para `boxShadow`, salvo `letrero`
 *  (`textShadow`) y `imagen` (`filter`, para PNG/SVG con transparencia).
 *
 *  Un `clip-path` recorta el resplandor del mismo elemento: si la pieza lleva
 *  esquina cortada, el brillo va en su contenedor. */
export const LUZ = {
  /** Anillo de 1 px: foco y selección, también en modo sobrio. */
  hilo: '0 0 0 1px rgba(212,180,131,.55)',
  /** Resplandor suave del acento y del dinero. */
  acento: '0 0 14px rgba(212,180,131,.28)',
  dinero: '0 0 14px rgba(224,177,90,.28)',
  /** Luz de seguridad del cuarto oscuro. */
  safelight: '0 0 16px rgba(212,33,44,.35)',

  /** `textShadow` del letrero «Collins Avenue»: neón PASTEL (blush + seafoam),
   *  no magenta. */
  letrero: '0 0 6px rgba(232,180,168,.7), 0 0 18px rgba(126,191,179,.5)',

  /** `filter` para una imagen con transparencia. */
  imagen: (px: number, rgba = '212,180,131,.5') => `drop-shadow(0 0 ${px}px rgba(${rgba}))`,
} as const

/** Degradados. Son de FONDO: nunca de texto de lectura. */
export const TRAMA = {
  /** Cielo de Collins: del void al navy. */
  cielo: 'linear-gradient(180deg, #0E1520 0%, #141C28 100%)',
  /** Filete fino: champagne a seafoam. */
  hilo: 'linear-gradient(90deg, #D4B483, #7EBFB3)',
  /** Capa de color para las portadas del catálogo (van con `mix-blend-mode:
   *  soft-light`). La portada pública es una miniatura de 240 px: se le da el
   *  tono de la casa, ámbar a sangre. */
  duotono: 'linear-gradient(135deg, rgba(224,177,90,.55), rgba(122,31,36,.6))',
} as const
