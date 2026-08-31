/* Textos de la portada que va debajo de la puerta de entrada.
 *
 * Las etiquetas de seccion van en ingles porque asi se pidieron y porque en
 * este diseño funcionan como rotulo, no como texto que se lee; el cuerpo va en
 * español, que es el idioma de quien se registra aqui.
 *
 * REDES: se dejan vacias a proposito. Un enlace a un perfil que no existe es
 * peor que no tener enlace, asi que si estan vacias no se pintan.
 */

export const REDES = {
  x: '',        // ej. 'https://x.com/rawstudio'
  tiktok: '',   // ej. 'https://tiktok.com/@rawstudio'
}

export const QUE_ES = [
  'RAWstudio es una plataforma donde publicas tu contenido, le pones precio y cobras directo. Sin intermediarios que se queden con la mitad y sin firmar exclusividad con nadie.',
  'Nació en México porque las plataformas que ya existen están hechas para otro público, cobran en otra moneda y no entienden cómo se declara esto ante el SAT.',
]

export const FORMAS_DE_GANAR = [
  { i: 'etiqueta', t: 'Venta permanente', d: 'Le pones precio a un video y quien lo compra lo conserva.' },
  { i: 'reloj', t: 'Renta por tiempo', d: 'El mismo video, más barato, por 48 o 72 horas.' },
  { i: 'ciclo', t: 'Suscripción mensual', d: 'Acceso a todo lo tuyo mientras estén suscritas.' },
  { i: 'lapiz', t: 'Contenido a la medida', d: 'Alguien te pide algo concreto y negocian el precio. El dinero queda retenido hasta que entregas.' },
  { i: 'corazon', t: 'Propinas', d: 'Sin pedir nada a cambio.' },
  { i: 'texto', t: 'Blog', d: 'Texto para tus suscriptoras, sin tener que grabar.' },
]

export const SEGURIDAD = [
  { i: 'ojo', t: 'Marca de agua con nombre', d: 'Quien mira tu video ve su propio nombre encima. Si se filtra, se sabe de quién salió.' },
  { i: 'globo', t: 'Bloqueo por país', d: 'Decides en qué países no se ve tu contenido. Útil si no quieres que te vean cerca de casa.' },
  { i: 'arena', t: 'Fecha de retiro', d: 'Le pones caducidad a lo que subes. Nada tiene que quedarse para siempre.' },
  { i: 'documento', t: 'Tus documentos no se guardan', d: 'Se revisan una vez y se borran. De ti queda un sí y una fecha, nada más.' },
  { i: 'escudo', t: 'Verificación de edad', d: 'De todas, sin excepción. Nadie publica sin comprobar quién es.' },
]

export const VALORES = [
  {
    t: 'Creative ownership',
    d: 'Lo que subes sigue siendo tuyo. No cedes derechos, no firmas exclusividad, y te lo puedes llevar cuando quieras.',
  },
  {
    t: 'Inclusivity',
    d: 'No hay un tipo de cuerpo, de edad o de estética que funcione aquí. Amateur e independiente no es una categoría menor: es a quién buscamos.',
  },
  {
    t: 'Freedom',
    d: 'Tú pones el precio, tú decides qué publicas y con qué frecuencia. Nadie te va a decir que subas más para no perder posiciones.',
  },
  {
    t: 'Safety',
    d: 'Cada herramienta de seguridad existe porque alguien la necesitó antes: la marca de agua, el bloqueo por país, la fecha de retiro.',
  },
]

export const PASOS = [
  { n: '01', t: 'Crea tu cuenta', d: 'Correo y contraseña. Nada más por ahora.' },
  { n: '02', t: 'Marca que quieres publicar', d: 'En tu perfil, la casilla «quiero publicar». Ahí se abre el estudio.' },
  { n: '03', t: 'Sube tu primer video', d: 'Puedes subir desde ya, aunque todavía no estés verificada.' },
  { n: '04', t: 'Verifica tu identidad', d: 'Una identificación y una selfie. Se revisan y se borran.' },
  { n: '05', t: 'Ponle precio', d: 'Venta, renta, suscripción o las tres. Se cambia cuando quieras.' },
  { n: '06', t: 'Cobra', d: 'A tu cuenta, por SPEI, con las retenciones que marca la ley ya calculadas.' },
]

export const PREGUNTAS = [
  {
    q: '¿Cuánto me quedo de cada venta?',
    a: ['El 80%. La plataforma se queda el 20% y de ahí sale el procesamiento del pago, el alojamiento del video y el trabajo de revisar los reportes.',
        'No hay cuota mensual ni cargo por publicar.'],
  },
  {
    q: '¿Tengo que firmar exclusividad?',
    a: ['No. Puedes publicar lo mismo aquí y en cualquier otro lado el mismo día.'],
  },
  {
    q: '¿Qué pasa con mi identificación?',
    a: ['Se revisa una vez para comprobar tu edad y que la persona del documento eres tú. Después se borra.',
        'De ti queda registrado que eres mayor de edad y en qué fecha se comprobó. La imagen no.'],
  },
  {
    q: '¿Puedo quitar algo que ya publiqué?',
    a: ['Sí, cuando quieras. Puedes retirarlo del catálogo —quien ya lo compró lo conserva— o retirarlo por completo, incluso para quien pagó; en ese caso se le devuelve su dinero automáticamente.',
        'También puedes ponerle fecha de caducidad desde el principio.'],
  },
  {
    q: '¿Cómo cobro y cuándo?',
    a: ['Solicitas el retiro cuando quieras a partir del mínimo. Se transfiere por SPEI a tu cuenta.',
        'Ganas en dólares y se te transfiere en pesos al tipo de cambio del día, con el ISR y el IVA retenidos según tu régimen fiscal. Te decimos exactamente cuánto se retuvo.'],
  },
  {
    q: '¿Y si alguien filtra mi contenido?',
    a: ['Cada video lleva encima el nombre de quien lo está viendo. Si aparece en otro lado, esa marca dice de qué cuenta salió.',
        'No impide que ocurra, pero deja de ser anónimo.'],
  },
  {
    q: '¿Tengo que vivir en México?',
    a: ['No. Se puede publicar desde cualquier país.',
        'Lo que sí es mexicano es cómo pagamos: SPEI y retenciones del SAT. Si estás fuera, escríbenos antes de registrarte para ver cómo cobrarías.'],
  },
]
