import { cuantos } from '../lib/plural'

/* Consultas pagadas por Telegram — el texto de las reglas.
 *
 * Lo dicto Sergio y se pinta tal cual en /consultas, sin reescribir el sentido.
 * Este archivo es lo unico que hay que tocar si cambia una regla o el precio.
 *
 * Lo que NO hay todavia, a proposito: el bot (su usuario lo va a crear el
 * dueño), el cobro del mensaje, la API de validacion ni nada que abra Telegram.
 * Por eso `BOT_TELEGRAM` esta vacio y la pagina no pinta ningun enlace a un
 * bot: un destino inventado seria peor que ninguno. */

/** Precio fijo por mensaje del cliente. Una sola vez, aqui; en pesos, no en
 *  dolares. */
export const PRECIO_CONSULTA_TELEGRAM = '20 pesos'

/** Usuario del bot de Telegram, sin la arroba. Vacio hasta que el dueño lo cree. */
export const BOT_TELEGRAM = ''

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
    d: ['La creadora tiene un máximo de 2 días para responder un mensaje pagado.'],
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
      'Solo ves el nombre del bot (por ejemplo, Raw Studio).',
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
    t: 'Al crear el bot',
    l: [
      'El usuario del bot todavía está pendiente: el dueño lo va a crear.',
      'Activa el modo de privacidad del bot al crearlo, para que no pueda leer otros chats del grupo.',
      'Usa un nombre de usuario dedicado, no vinculado a una cuenta personal con foto o historial visible.',
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
