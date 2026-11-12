// El menu del bot de Telegram: pantallas, botones y guias.
//
// Es un modulo PURO: recibe la direccion del sitio como parametro y devuelve
// texto y botones. No habla con Telegram ni con la base. Asi se puede probar
// entero sin red (`menuBot.prueba.ts`) y asi `telegram-bot` solo decide a donde
// mandar cada cosa.
//
// ---------- Como esta armado ----------
// Cada pantalla es un texto y un teclado en linea. Los botones son de dos tipos:
//   - `callback_data`: llevan a otra pantalla (`m:<id>`) o piden una guia
//     (`guia:<clave>`). Telegram limita `callback_data` a 64 bytes.
//   - `url`: abren el sitio directo, sin pasar por el bot.
// Lista BLANCA: lo que llega en `callback_data` solo ELIGE una clave de aqui;
// nada que venga de la persona arma una URL ni un texto.
//
// Un toque de boton nunca cobra, nunca toca consultas y nunca llama a DeepSeek:
// eso lo garantiza `telegram-bot` (los botones no pasan por `bot_enrutar`).
//
// Textos: sin `parse_mode`, igual que el resto del bot, y sin cifras de dinero
// escritas aqui (el precio de una consulta vive en la base, no en este archivo).
//
// ---------- Para agregar una seccion ----------
// 1. Sumar su id a `PANTALLAS` y su texto/botones en `pantalla()`.
// 2. Poner un boton `m:<id>` en `inicio`.
// 3. Correr `deno test` sobre `menuBot.prueba.ts`: comprueba que ningun boton
//    lleva a una pantalla que no existe.

export type Boton =
  | { text: string; callback_data: string }
  | { text: string; url: string }

export type Teclado = { inline_keyboard: Boton[][] }
export type Pantalla = { texto: string; teclado: Teclado }

/** Las pantallas que existen. `m:<id>` solo acepta una de estas. */
export const PANTALLAS = ['inicio', 'consultas', 'guias'] as const
export type IdPantalla = (typeof PANTALLAS)[number]

const esPantalla = (id: string): id is IdPantalla => (PANTALLAS as readonly string[]).includes(id)

/** Lo que mando el boton `callback_data`, ya traducido a una pantalla. Acepta
 *  tambien `guias`, que es como se llamaba el boton de los mensajes que ya
 *  estan en los chats (rondas 11-01): no se rompen. */
export function pantallaDeBoton(data: unknown): IdPantalla | null {
  if (typeof data !== 'string') return null
  if (data === 'guias') return 'guias'
  if (!data.startsWith('m:')) return null
  const id = data.slice(2)
  return esPantalla(id) ? id : null
}

const IR = (id: IdPantalla) => `m:${id}`
const VOLVER: Boton = { text: '← Inicio', callback_data: IR('inicio') }

/** El host que se ve en los textos («rawstudio.biz» hoy, «rawstudio.mx» despues
 *  del corte): sale de la misma direccion que los enlaces, no se escribe aparte. */
const host = (sitio: string): string => new URL(sitio).host

export function pantalla(id: IdPantalla, sitio: string): Pantalla {
  switch (id) {
    case 'inicio':
      return {
        texto: 'Hola, soy el bot de RAWstudio. ¿Qué necesitas?',
        teclado: { inline_keyboard: [
          [{ text: 'Guías de grabación', callback_data: IR('guias') }],
          [{ text: 'Cómo funcionan las consultas', callback_data: IR('consultas') }],
          [{ text: 'Abrir RAWstudio', url: `${sitio}/` }, { text: 'Soporte', url: `${sitio}/#/contacto` }],
        ] },
      }

    case 'consultas':
      return {
        texto:
          'Consultas por Telegram\n\n' +
          `Para empezar, entra a la ficha de un clip en ${host(sitio)} y toca «Consultar por Telegram»: ` +
          'ahí te damos un enlace que te trae aquí ya vinculado.\n\n' +
          `Si eres creadora, vincula tu Telegram desde tu perfil en ${host(sitio)}.`,
        teclado: { inline_keyboard: [
          [{ text: 'Ver las reglas del servicio', url: `${sitio}/#/consultas` }],
          [VOLVER],
        ] },
      }

    case 'guias':
      return {
        texto:
          'Guías de grabación (PDF)\n\n' +
          '¿Qué iPhone tienes? Elige el tuyo para recibir los ajustes de la cámara.\n\n' +
          'O la guía «Cómo grabar tu contenido sin regarla»: Grabando sola o En pareja.',
        teclado: { inline_keyboard: [
          [{ text: 'iPhone 12', callback_data: 'guia:12' }, { text: 'iPhone 13', callback_data: 'guia:13' }],
          [{ text: 'iPhone 14', callback_data: 'guia:14' }, { text: 'iPhone 15 · 16 · 17', callback_data: 'guia:15-17' }],
          [{ text: 'Sin regarla · Grabando sola', callback_data: 'guia:sola' }],
          [{ text: 'Sin regarla · En pareja', callback_data: 'guia:pareja' }],
          [VOLVER],
        ] },
      }
  }
}

// ---------- Guias (PDF) ----------
//
// Los archivos viven en `public/guias/` del sitio. Mismos nombres que
// `src/content/guias.ts` (son dos runtimes y la lista se repite a proposito).

export type Guia = { archivo: string; caption: string }

export function guiaPorClave(data: unknown, sitio: string): Guia | null {
  if (typeof data !== 'string' || !data.startsWith('guia:')) return null
  const clave = data.slice(5)
  const verEnElSitio = `También está en ${sitio}/#/creadoras.`
  const iphone = (modelos: string): string =>
    `Guía para grabar con tu ${modelos}: ajustes, encuadre, luz y sonido. ${verEnElSitio}`
  const sinRegarla = (version: string, detalle: string): string =>
    `Cómo grabar tu contenido sin regarla, versión «${version}»: ${detalle}. ` +
    `Solo para mayores de 18 años. ${verEnElSitio}`

  const guias = new Map<string, Guia>([
    ['12', { archivo: 'guia-iphone12.pdf', caption: iphone('iPhone 12') }],
    ['13', { archivo: 'guia-iphone13.pdf', caption: iphone('iPhone 13') }],
    ['14', { archivo: 'guia-iphone14.pdf', caption: iphone('iPhone 14') }],
    ['15-17', { archivo: 'guia-iphone15-16-17.pdf', caption: iphone('iPhone 15, 16 o 17') }],
    ['sola', { archivo: 'guia-sin-regarla-sola.pdf',
      caption: sinRegarla('Grabando sola', 'tus límites, el set, la luz, el sonido y los ángulos') }],
    ['pareja', { archivo: 'guia-sin-regarla-pareja.pdf',
      caption: sinRegarla('En pareja', 'el acuerdo, el set, la luz, el sonido y los ángulos') }],
  ])
  return guias.get(clave) ?? null
}

// ---------- El menu de comandos de Telegram ----------
//
// Es la lista que aparece al tocar «Menu» junto a la caja de texto o al escribir
// «/». Se registra UNA vez con `setMyCommands` (ver `configurar-menu-bot.sh`); si
// se agrega un comando nuevo aqui, hay que volver a registrarla.
export const COMANDOS: { command: string; description: string }[] = [
  { command: 'start', description: 'Inicio' },
  { command: 'guias', description: 'Guías de grabación para tu iPhone' },
  { command: 'consultas', description: 'Cómo funcionan las consultas' },
  { command: 'ayuda', description: 'Ayuda' },
]

/** Un comando de texto que abre una pantalla (con o sin `@bot`). */
export function pantallaDeComando(texto: string): IdPantalla | null {
  const m = texto.match(/^\/(\w+)(?:@\w+)?\s*$/)
  if (!m) return null
  switch (m[1].toLowerCase()) {
    case 'ayuda': return 'inicio'
    case 'guias': return 'guias'
    case 'consultas': return 'consultas'
    default: return null
  }
}
