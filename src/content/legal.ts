/** Documentos legales.
 *
 *  ADVERTENCIA QUE DEBE SEGUIR AQUI HASTA QUE UN ABOGADO LOS REVISE:
 *  este texto es un borrador de trabajo, no asesoria legal. Maneja datos
 *  biometricos —sensibles bajo la ley— y una industria de alto escrutinio.
 *  Los datos entre corchetes son marcadores que deben sustituirse por los
 *  reales antes de operar con publico.
 */
export const VERSION_LEGAL = 'v1.0'

export const PENDIENTES_ABOGADO = [
  'Razón social, domicilio fiscal y correos de contacto',
  'Porcentaje de comisión y política de dispersión',
  'Qué pasa con una compra permanente si la creadora retira el contenido',
  'Régimen fiscal y esquema de retenciones',
  'Ciudad y estado para la jurisdicción',
  'Plazo de conservación de los registros de verificación de edad',
]

export type Seccion = { titulo: string; cuerpo: string[] }

export const PRIVACIDAD: Seccion[] = [
  { titulo: 'Quién es responsable de tus datos', cuerpo: [
    '[RAZÓN SOCIAL], con domicilio en [DOMICILIO FISCAL] y correo [privacidad@rawstudio.biz], es responsable del tratamiento de tus datos personales conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares.',
  ]},
  { titulo: 'Qué datos recabamos', cuerpo: [
    'De todas las personas: nombre artístico, correo, contraseña cifrada, fecha de nacimiento, CURP, dirección IP, país de conexión, dispositivo, e historial de compras y suscripciones.',
    'Datos sensibles: datos biométricos faciales obtenidos de tu selfie y de la foto de tu identificación, usados exclusivamente para el cotejo que verifica tu identidad y mayoría de edad. También la imagen de tu identificación oficial. La naturaleza del contenido al que accedes puede revelar preferencias sexuales, que la ley considera datos sensibles.',
    'De las creadoras, además: RFC y constancia de situación fiscal, datos bancarios para dispersión, y documentación de consentimiento de quienes aparezcan en el contenido.',
    'No recabamos ni almacenamos los datos de tu tarjeta bancaria: los procesa directamente el proveedor de pagos.',
  ]},
  { titulo: 'Para qué los usamos', cuerpo: [
    'Necesario para prestarte el servicio: verificar que eres mayor de 18 años, verificar tu identidad, administrar tu cuenta, procesar pagos, dispersar pagos a creadoras y cumplir obligaciones fiscales, prevenir fraude y suplantación, atender tus reportes, y cumplir requerimientos de autoridad.',
    'No necesario, puedes negarlo: recomendaciones personalizadas, comunicaciones promocionales, y estadísticas agregadas. Negarte no afecta tu acceso al servicio.',
  ]},
  { titulo: 'Tus datos biométricos', cuerpo: [
    'Se usan únicamente para verificar tu edad e identidad.',
    'Las imágenes de tu selfie y tu identificación se procesan de forma temporal y no se conservan una vez concluido el cotejo. Única excepción: si el cotejo no es concluyente y requiere revisión de una persona, se conservan hasta resolverlo y se borran al terminar.',
    'De ese proceso conservamos solo el resultado, la fecha, tu mayoría de edad validada y un identificador no reversible de tu CURP.',
    'Su tratamiento requiere tu consentimiento expreso, que otorgas en una casilla específica y separada.',
    'Puedes revocarlo cuando quieras, entendiendo que eso implica cancelar tu acceso, porque la verificación de edad es un requisito indispensable.',
  ]},
  { titulo: 'A quién se transfieren', cuerpo: [
    'Proveedores de pago, para cobro y dispersión. Proveedor de verificación de identidad. Proveedor de infraestructura y base de datos. El SAT, para obligaciones fiscales. Autoridades competentes, ante requerimiento legal.',
    'Algunos proveedores están fuera de México. En todos los casos exigimos contractualmente estándares equivalentes a los de la ley mexicana.',
    'No vendemos, rentamos ni comercializamos tus datos con terceros para fines publicitarios.',
  ]},
  { titulo: 'Tus derechos ARCO', cuerpo: [
    'Puedes acceder a tus datos, rectificarlos si son inexactos, cancelarlos de nuestros sistemas y oponerte a su tratamiento.',
    'Escribe a [privacidad@rawstudio.biz] con tu nombre, un medio de contacto, un documento que acredite tu identidad, y la descripción de los datos.',
    'Ejercerlos es gratuito. Solo pueden cobrarse los costos de reproducción o envío.',
  ]},
  { titulo: 'Cuánto tiempo los conservamos', cuerpo: [
    'Mientras tu cuenta esté activa. Después de cancelarla: los registros de verificación de edad por [5] años, como evidencia de que impedimos el acceso a menores; los registros fiscales por 5 años conforme al Código Fiscal; el resto se elimina o se disocia.',
  ]},
  { titulo: 'Cookies', cuerpo: [
    'Usamos cookies y almacenamiento local para mantener tu sesión, recordar tus preferencias y conservar el estado de tu verificación de edad. Puedes deshabilitarlas desde tu navegador, aunque eso puede impedir que la plataforma funcione.',
  ]},
  { titulo: 'Seguridad', cuerpo: [
    'Aplicamos cifrado en tránsito y en reposo, control de accesos por roles y registro de auditoría. Si ocurre una vulneración que afecte tus derechos de forma significativa, te lo notificaremos.',
  ]},
  { titulo: 'Autoridad', cuerpo: [
    'Si consideras vulnerado tu derecho a la protección de datos, puedes acudir ante la Secretaría Anticorrupción y Buen Gobierno.',
  ]},
]

export const TERMINOS: Seccion[] = [
  { titulo: 'Qué es esta plataforma y quién puede entrar', cuerpo: [
    'RAWstudio aloja contenido para personas adultas de carácter sexual explícito, publicado por creadoras independientes.',
    'El acceso está estrictamente prohibido a menores de 18 años.',
    'Al entrar declaras bajo protesta de decir verdad que tienes 18 años o más, que la identificación y fotografía que proporcionas te corresponden, que accedes de forma voluntaria, y que este contenido no viola las leyes de tu localidad.',
    'Proporcionar datos falsos o usar la identificación de un tercero es un acto ilícito y puede denunciarse ante las autoridades.',
  ]},
  { titulo: 'Dónde operamos', cuerpo: [
    'RAWstudio presta servicios únicamente en territorio mexicano. El acceso desde otras jurisdicciones no está autorizado y puede bloquearse. Si eludes las restricciones geográficas, lo haces bajo tu responsabilidad.',
  ]},
  { titulo: 'Tu cuenta', cuerpo: [
    'Eres responsable de tus credenciales y de toda actividad hecha desde tu cuenta. Está prohibido compartirla, prestarla, venderla o transferirla. Una persona solo puede tener una cuenta activa.',
  ]},
  { titulo: 'Cómo se accede al contenido', cuerpo: [
    'Suscripción mensual: acceso al contenido de una creadora durante el periodo contratado, con renovación automática hasta que canceles.',
    'Compra individual: acceso permanente mientras el contenido siga publicado y tu cuenta activa.',
    'Renta: acceso temporal de 48 o 72 horas.',
    'Contenido personalizado: según lo acordado con la creadora.',
    'Sobre la compra permanente: está sujeta a que el contenido siga publicado. Si la creadora lo retira o su cuenta se cancela, el acceso puede terminar. [DEFINIR POLÍTICA: ¿reembolso proporcional? ¿ventana de descarga?]',
  ]},
  { titulo: 'Pagos y reembolsos', cuerpo: [
    'Los precios se expresan en pesos mexicanos e incluyen IVA.',
    'En pagos en efectivo, la referencia vence en [3] días naturales y el acceso se libera únicamente al confirmarse el pago.',
    'Las suscripciones se renuevan solas. Puedes cancelar cuando quieras; surte efecto al terminar el periodo pagado, sin reembolso proporcional.',
    'Por tratarse de contenido digital de acceso inmediato, las compras no son reembolsables una vez accedido el contenido, salvo cobro duplicado o error técnico nuestro, contenido que no corresponde a su descripción, contenido personalizado no entregado, o falla que impida el acceso y no se resuelva en [48] horas.',
  ]},
  { titulo: 'Qué puedes y qué no puedes hacer con el contenido', cuerpo: [
    'El contenido se te licencia para visualización personal, privada y no comercial. No adquieres propiedad sobre él.',
    'Queda prohibido descargarlo, grabarlo, capturarlo, copiarlo, redistribuirlo o comercializarlo; usarlo para crear material derivado, incluido el generado con inteligencia artificial; usar bots o extractores automatizados; y eludir las medidas de protección o las restricciones geográficas.',
    'Violarlo da lugar a cancelación inmediata sin reembolso, y puede derivar en acciones civiles y penales conforme a la Ley Federal del Derecho de Autor.',
  ]},
  { titulo: 'Conducta prohibida', cuerpo: [
    'Tolerancia cero a cualquier material que involucre a personas menores de 18 años, sea real, simulado, animado o generado digitalmente. Todo hallazgo se reporta a las autoridades.',
    'Prohibido también: contenido de personas que no dieron consentimiento libre e informado; contenido íntimo difundido sin consentimiento; violencia real, lesiones o coerción; actos con animales; promoción de trata o explotación; suplantación de identidad, incluido material manipulado digitalmente; acoso, amenazas, discurso de odio; y solicitudes de encuentros presenciales o servicios sexuales.',
  ]},
  { titulo: 'Si publicas contenido', cuerpo: [
    'Debes completar la verificación reforzada de identidad, edad y situación fiscal.',
    'Debes garantizar que toda persona que aparezca es mayor de 18 años, conservar copia de su identificación y su consentimiento firmado, y entregarlos cuando se te requieran.',
    'Debes ser titular de los derechos del contenido o contar con autorización expresa.',
    'Debes emitir comprobante fiscal por los ingresos, o aceptar las retenciones aplicables.',
    'No debes solicitar ni aceptar pagos fuera de la plataforma para eludir comisiones.',
    'RAWstudio retiene el [__]% de cada transacción. La dispersión se hace por SPEI a la cuenta registrada.',
  ]},
  { titulo: 'Si algo tuyo aparece sin tu permiso', cuerpo: [
    'Escribe a [legal@rawstudio.biz] identificando el contenido, acreditando tu identidad y tu titularidad o afectación.',
    'Las denuncias por contenido íntimo no consentido o por presunta participación de menores se atienden con carácter prioritario, con retiro preventivo dentro de las [24] horas siguientes mientras se resuelve el caso.',
  ]},
  { titulo: 'Suspensión, límites y jurisdicción', cuerpo: [
    'Podemos suspender o cancelar tu cuenta, sin reembolso, si incumples estos términos, si hay indicios razonables de fraude, o por requerimiento de autoridad.',
    'La plataforma se ofrece tal cual. El contenido es responsabilidad de quien lo publica; RAWstudio actúa como intermediario tecnológico.',
    'Estos términos se rigen por las leyes mexicanas, con jurisdicción en los tribunales de [CIUDAD, ESTADO]. Como consumidor puedes acudir a la PROFECO.',
  ]},
]
