import { cuantos } from '../lib/plural'

/* Consultas pagadas por Telegram — el texto de las reglas.
 *
 * Lo dicto Sergio y se pinta tal cual en /consultas, sin reescribir el sentido.
 * Este archivo es lo unico que hay que tocar si cambia una regla o el precio.
 *
 * El usuario del bot ya existe (`BOT_TELEGRAM`). El cobro lo hace la base de
 * datos (ver la migracion 20261211000001): se descuenta de SU SALDO, no hay
 * pasarela de pago ni recarga desde la web todavia. El token del bot NUNCA va en
 * este archivo ni en el frontend.
 */

/** Precio fijo por mensaje del cliente. Una sola vez, aqui; en pesos, no en
 *  dolares. */
export const PRECIO_CONSULTA_TELEGRAM = '20 pesos'

/** ¿Ya se cobra el mensaje? Tiene que coincidir con `consultas_config.cobro_activo`
 *  en la base (la migracion 20261211000001 lo enciende): si la web dijera «20 pesos
 *  por mensaje» y la base no cobrara, o al reves, alguien se llevaria una sorpresa.
 *  El cobro se hace del saldo de la cuenta, al tipo de cambio dolar-peso vigente. */
export const COBRO_CONSULTAS_ACTIVO = true

/** Usuario del bot de Telegram, sin la arroba. */
export const BOT_TELEGRAM = 'RawStudios_bot'

/** Minimo de palabras de un mensaje del cliente. */
export const MIN_PALABRAS = 20

export const INTRO = [
  'RAWstudio ofrece consultas pagadas por Telegram entre quien pregunta y la creadora.',
  'Cada mensaje que envía el cliente es un mensaje de pago.',
]

export const REGLAS: { n: number; t: string; d: string[] }[] = [
  {
    n: 1, t: 'Precio',
    d: [`Cada mensaje del cliente cuesta ${PRECIO_CONSULTA_TELEGRAM}. Ese pago cubre ese mensaje y la respuesta de la creadora.`],
  },
  {
    n: 2, t: 'Extensión',
    d: [`El mensaje del cliente debe tener al menos ${cuantos(MIN_PALABRAS, 'palabra')}. Si tiene menos, no se envía.`],
  },
  {
    n: 3, t: 'Pertinencia',
    d: ['El mensaje debe tener que ver con lo que se pregunta. Tiene que ir anclado al hilo de la conversación y al clip o a la creadora de interés. No se aceptan mensajes sueltos, fuera de contexto o que no se relacionan con esa consulta.'],
  },
  {
    n: 4, t: 'Cómo responde la creadora',
    d: ['No hay un guion rígido. La brújula es flexible: cada contestación debe avanzar algo. Eso puede ser una pregunta de vuelta, un dato nuevo o una oferta concreta.'],
  },
  {
    n: 5, t: 'Plazo',
    d: [
      'La creadora tiene un máximo de 2 días para responder un mensaje pagado.',
      'Si no responde en esos 2 días, se te devuelve el saldo.',
    ],
  },
  {
    n: 6, t: 'Guía corta para la creadora',
    d: [],
  },
]

/** Los tres pasos de la regla 6. */
export const GUIA_CREADORA = [
  'Saluda.',
  'Responde lo que preguntaron.',
  'Ofrece el siguiente paso.',
]

export const PRIVACIDAD = {
  intro: 'Este servicio se arma para que ninguna de las dos partes vea el teléfono ni la cuenta personal de la otra. El puente es el bot, no un chat directo.',
  cliente: {
    t: 'Para quien consulta',
    l: [
      'Nunca ves el número telefónico de la creadora.',
      'Nunca ves su cuenta personal de Telegram.',
      'Solo ves el nombre del bot (RawStudio).',
    ],
  },
  creadora: {
    t: 'Para la creadora',
    l: [
      'Nunca ves el número telefónico de quien te escribe.',
      'Los mensajes llegan al bot. Tú respondes desde tu cuenta, sin exponer tu número, tu cuenta personal ni otros datos de contacto.',
    ],
  },
  bot: {
    t: 'El bot',
    l: [
      'Se llama RawStudio y su usuario es @RawStudios_bot.',
      'Tiene el modo de privacidad activo, para que no pueda leer otros chats del grupo.',
      'Es un usuario dedicado, no vinculado a una cuenta personal con foto o historial visible.',
    ],
  },
}

export const VALIDACION = {
  intro: [
    'La inteligencia artificial no escribe las respuestas. Solo ayuda a validar que se cumplan las reglas. El contenido real de cada respuesta lo escribe la creadora.',
    'Se usa la API de DeepSeek, en su opción más económica.',
  ],
  titulo_pasos: 'Cómo funciona el bot:',
  pasos: [
    'Recibe el mensaje pagado del cliente.',
    `Con DeepSeek valida dos cosas: que tenga al menos ${cuantos(MIN_PALABRAS, 'palabra')} y que sea pertinente al hilo de la conversación y al clip o a la creadora de interés.`,
    'Si no cumple, avisa al cliente que el mensaje no se envía y le explica por qué.',
    'Si cumple, se lo pasa a la creadora.',
    'Cuando la creadora responde, si su mensaje no cumple los lineamientos —por ejemplo, si es demasiado corto o no avanza nada (ni una pregunta de vuelta, ni un dato nuevo, ni una oferta concreta)— el bot se lo avisa. No reescribe ni genera esa respuesta por ella.',
  ],
}
