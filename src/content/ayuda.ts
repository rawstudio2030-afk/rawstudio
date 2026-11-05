/** Contacto y preguntas frecuentes.
 *
 *  Separado de las pantallas por la misma razon que `legal.ts`: es texto que
 *  se corrige leyendolo, no programando, y mezclarlo con el JSX obliga a
 *  entrar en un archivo de 300 lineas para arreglar una coma.
 *
 *  ---------- La regla de este archivo ----------
 *
 *  Cada numero que aparece aqui sale del sistema de verdad, y se anota de
 *  donde. Una pagina de preguntas frecuentes que contradice a la aplicacion es
 *  peor que no tenerla: la gente la cree, y descubre la diferencia cuando ya
 *  decidio algo con ella.
 *
 *    comision 20%        ajustes.comision_pct, y `comprar_clip` en
 *                        20260827000000_monedero.sql
 *    minimo 5 USD        ajustes.retiro_minimo_coins = 500 (centavos de dolar)
 *    retenciones         public.tasas_retencion, por regimen fiscal
 *    tipo de cambio      ajustes.tipo_cambio_usd_mxn
 *    purga 30 dias       20261105000000_aviso_purga.sql
 *    48 horas habiles    lo decidio Omar el 5 de noviembre de 2026; es la
 *                        unica promesa de esta pagina que no sale del codigo,
 *                        y esta tambien en los terminos
 *
 *  Si alguno cambia en la base, HAY QUE CAMBIARLO AQUI. No se leen en vivo a
 *  proposito: esta pagina la tiene que poder leer alguien sin sesion y sin que
 *  cada parrafo dispare una consulta.
 */

export type Buzon = {
  correo: string
  para: string
  detalle: string
}

/** Tres direcciones, un solo buzon detras.
 *
 *  Son alias de admin@rawstudio.biz en Zoho, asi que todo cae en la misma
 *  bandeja. Existen separadas porque los documentos legales ya las citaban y
 *  porque quien escribe quiere saber que esta escribiendo al sitio correcto;
 *  no porque las lea gente distinta. */
export const BUZONES: Buzon[] = [
  {
    correo: 'hola@rawstudio.biz',
    para: 'Cualquier cosa',
    detalle: 'Dudas, problemas con un pago, algo que no funciona, una cuenta que no abre. Si no sabes a cuál escribir, es ésta.',
  },
  {
    correo: 'legal@rawstudio.biz',
    para: 'Avisos legales y retiradas',
    detalle: 'Reclamaciones de derechos de autor, requerimientos de autoridad, y contenido que aparece sin el consentimiento de quien sale en él. Esto último se atiende antes que nada.',
  },
  {
    correo: 'privacidad@rawstudio.biz',
    para: 'Tus datos personales',
    detalle: 'Para ejercer tus derechos de acceso, rectificación, cancelación u oposición sobre los datos que tenemos de ti, incluidos los de la verificación de identidad.',
  },
]

export type Pregunta = { p: string; r: string[] }
export type GrupoPreguntas = { titulo: string; preguntas: Pregunta[] }

export const PREGUNTAS: GrupoPreguntas[] = [
  {
    titulo: 'Cobrar',
    preguntas: [
      {
        p: '¿Cuánto tardan en pagarme?',
        r: [
          'Hasta 48 horas hábiles desde que aprobamos tu retiro. En la práctica suele ser menos: el aviso de que pediste un retiro nos llega en segundos, no al día siguiente.',
          'Hábiles quiere decir que un retiro pedido un viernes por la tarde se paga el martes como muy tarde. La transferencia es por SPEI y suele aparecer en tu banco el mismo día en que sale.',
          'Cuando se manda te escribimos con la referencia del SPEI, que es lo que necesitas para reclamar en tu banco si no la ves.',
        ],
      },
      {
        p: '¿Qué necesito antes de poder retirar?',
        r: [
          'Tres cosas: tener la identidad verificada, haber registrado una cuenta para cobrar, y tener al menos $5.00 USD disponibles.',
          'El mínimo de $5.00 existe porque cada transferencia SPEI cuesta una comisión fija, y dispersar cantidades muy chicas se la come entera.',
          'Disponible no es lo mismo que saldo: lo que ya pediste y todavía no se resuelve queda comprometido, para que no se pueda pedir tres veces el mismo dinero.',
        ],
      },
      {
        p: '¿Por qué me llega menos de lo que pedí?',
        r: [
          'Por dos cosas, y conviene entender las dos porque no son lo mismo.',
          'La primera es nuestra comisión: RAWstudio se queda el 20% de cada venta, renta, propina y desbloqueo. Eso ya está descontado del saldo que ves, así que no se vuelve a restar al retirar.',
          'La segunda son las retenciones de impuestos, y ésas sí se restan al pagarte. La ley obliga a la plataforma a retener ISR e IVA sobre lo que te paga y a enterarlos al SAT a tu nombre, así que no nos los quedamos: cuentan como impuesto ya pagado por ti.',
          'Cuánto se retiene depende de tu régimen fiscal, que eliges al registrar tu cuenta de cobro. Y es una diferencia grande: con los mismos 20 dólares, una persona física registrada recibe unos $332 MXN y alguien sin registro fiscal recibe unos $237. Si tienes RFC, decláralo.',
        ],
      },
      {
        p: '¿Por qué todo está en dólares si me pagan en pesos?',
        r: [
          'Porque el precio del contenido se fija en dólares y el pago se hace en pesos. La conversión se aplica al tipo de cambio del día en que aprobamos tu retiro, no del día en que lo pediste.',
          'En el correo de aprobación te mandamos el desglose completo: cuánto pediste en dólares, a cuánto salió en pesos, qué se retuvo y cuánto te llega.',
        ],
      },
      {
        p: '¿Puedo cambiar la cuenta donde me pagan?',
        r: [
          'Sí, desde Dinero → Retirar → Cambiar mi cuenta, en cualquier momento.',
          'Lo que no cambia es a dónde se mandó un retiro ya aprobado: se guarda la cuenta tal como estaba en el momento de pedirlo, porque si no sería imposible saber a dónde fue el dinero.',
        ],
      },
    ],
  },
  {
    titulo: 'Publicar',
    preguntas: [
      {
        p: '¿Por qué tengo que verificar mi identidad?',
        r: [
          'Porque es la única forma de garantizar que toda persona que aparece en la plataforma es mayor de edad, y porque sin eso ningún procesador de pagos trabaja con una plataforma de este giro.',
          'Es una sola vez. Hasta que esté hecha puedes entrar al estudio y subir, pero nada se publica.',
        ],
      },
      {
        p: '¿Qué pasa si retiro un clip que alguien ya compró?',
        r: [
          'Quien lo compró deja de poder verlo, y se le ofrece su dinero de vuelta sin que tenga que pedirlo.',
          'El archivo no se borra en ese momento: queda marcado y se destruye más adelante, junto con su portada. Son 30 días, y ese plazo existe para poder atender una reclamación o un requerimiento en el intervalo.',
        ],
      },
      {
        p: '¿Puedo impedir que me vean desde cierto país?',
        r: [
          'Sí. En Ajustes de cuenta puedes bloquear países, y se aplica a todo lo que publiques salvo que un clip diga otra cosa.',
          'El bloqueo lo decide el servidor por la dirección desde la que llega la petición, no el navegador de quien mira, que no es una fuente de fiar para eso.',
        ],
      },
    ],
  },
  {
    titulo: 'Comprar',
    preguntas: [
      {
        p: '¿Puedo recargar saldo?',
        r: [
          'Todavía no. Falta un procesador de pagos que trabaje con este giro, y es lo que más nos está costando resolver.',
          'Mientras tanto, la administración puede acreditar saldo a mano. Si quieres comprar algo y no puedes cargar, escríbenos a hola@rawstudio.biz.',
        ],
      },
      {
        p: '¿Se devuelve el dinero de una compra?',
        r: [
          'Por regla general no: es contenido digital al que se accede de inmediato.',
          'Sí se devuelve si hubo un cobro duplicado o un error nuestro, si el contenido no corresponde a su descripción, si pediste algo a la medida y no se entregó, o si una falla te impide acceder y no la resolvemos en 48 horas.',
          'Y si una creadora retira algo que compraste para siempre, el reembolso se te ofrece solo.',
        ],
      },
    ],
  },
  {
    titulo: 'Tu cuenta',
    preguntas: [
      {
        p: '¿Dónde cambio mi nombre, mi foto o mi contraseña?',
        r: [
          'En la pestaña Yo, botón «Ajustes de cuenta». Ahí vive todo lo que se configura una vez: nombre visible, @usuario, foto, biografía, teléfono y si publicas o no.',
        ],
      },
      {
        p: '¿Cómo borro mi cuenta y mis datos?',
        r: [
          'Escribiendo a privacidad@rawstudio.biz desde la dirección de tu cuenta. Te confirmamos qué se borra y qué estamos obligados a conservar, y por cuánto tiempo.',
          'Hay cosas que no se pueden borrar de inmediato: los registros de verificación de edad y los movimientos de dinero tienen plazos legales de conservación.',
        ],
      },
      {
        p: 'Alguien publicó algo mío sin mi permiso',
        r: [
          'Escríbenos a legal@rawstudio.biz y dinos qué contenido es. Esto se atiende antes que cualquier otra cosa.',
          'No hace falta que tengas cuenta aquí para pedirlo.',
        ],
      },
    ],
  },
]
