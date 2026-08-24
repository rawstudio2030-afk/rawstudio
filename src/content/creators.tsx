/* Contenido de la pagina para creadoras, separado del layout para que el texto
   se pueda editar sin tocar el markup. Los iconos vienen de la pagina original,
   convertidos a JSX. */
import type { ReactNode } from 'react'
import { COLOR, LINEA } from '../lib/diseño'

export const PINK = COLOR.acento
export const LIME = COLOR.dinero
export const CYAN = COLOR.admin
export const INK = COLOR.fondo
export const PAPER = COLOR.texto
export const MUTED = COLOR.textoSuave
export const DIM = COLOR.textoTenue
export const LINE = LINEA.tenue

const S = { stroke: 'currentColor', fill: 'none', strokeWidth: 1.8,
            strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

const svg = (children: ReactNode) => (
  <svg viewBox="0 0 32 32" style={{ width: '100%', height: '100%', display: 'block' }} {...S}>
    {children}
  </svg>
)

export const ICONS: Record<string, ReactNode> = {
  porcentaje: svg(<><circle cx="16" cy="16" r="12" /><path d="M20 11 12 21" /><circle cx="13" cy="12.5" r="1.8" /><circle cx="19" cy="19.5" r="1.8" /></>),
  reloj:      svg(<><circle cx="16" cy="16" r="11.5" /><path d="M16 9v7.5l5 3" /></>),
  tarjeta:    svg(<><rect x="4" y="8" width="24" height="17" rx="2.5" /><path d="M4 14h24M8 20h6" /></>),
  etiqueta:   svg(<><path d="M17 5 5 17l10 10 12-12V7a2 2 0 0 0-2-2z" /><circle cx="22" cy="10" r="2" /><path d="M6 6l20 20" /></>),
  cartera:    svg(<><path d="M5 11a3 3 0 0 1 3-3h16a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z" /><path d="M22 15h3v4h-3a2 2 0 0 1 0-4z" /></>),
  escudo:     svg(<><path d="M16 4l10 4v8c0 6-4.3 10.2-10 12-5.7-1.8-10-6-10-12V8z" /><rect x="12.5" y="14.5" width="7" height="6" rx="1" /><path d="M14 14.5v-2a2 2 0 0 1 4 0v2" /></>),
  mascara:    svg(<><path d="M3 13c0-3 3-4 6-4s5 1.5 6 1.5S18 9 21 9s6 1 6 4c0 5-2.5 9-6 9-2.8 0-4.2-2.4-6-2.4S19.8 22 17 22c-3.5 0-6-4-6-9" /></>),
  nocompartir:svg(<><circle cx="10" cy="16" r="3" /><circle cx="23" cy="9" r="3" /><circle cx="23" cy="23" r="3" /><path d="M12.7 14.6l7.6-4.1M12.7 17.4l7.6 4.1" /><path d="M5 27L27 5" /></>),
  sinubicar:  svg(<><path d="M16 28s9-7.5 9-14a9 9 0 0 0-18 0c0 6.5 9 14 9 14z" /><path d="M6 6l20 20" /></>),
  corona:     svg(<><path d="M6 12l4 12h12l4-12-5.5 4L16 8l-4.5 8z" /></>),
  salida:     svg(<><path d="M18 5H8a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h10" /><path d="M21 11l5 5-5 5M26 16H13" /></>),
  descarga:   svg(<><path d="M16 5v14M11 15l5 5 5-5" /><path d="M6 22v3a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3" /></>),
  perillas:   svg(<><path d="M8 6v20M16 6v20M24 6v20" /><circle cx="8" cy="12" r="2.6" /><circle cx="16" cy="20" r="2.6" /><circle cx="24" cy="10" r="2.6" /></>),
  subir:      svg(<><path d="M16 24V9M11 14l5-5 5 5" /><path d="M6 24v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2" /></>),
  calendario: svg(<><rect x="5" y="7" width="22" height="20" rx="2.5" /><path d="M5 13h22M11 4v5M21 4v5" /><path d="M13 20l2.5 2.5L20 18" /></>),
  barras:     svg(<><path d="M5 26h22" /><rect x="8" y="16" width="4" height="8" /><rect x="15" y="10" width="4" height="14" /><rect x="22" y="6" width="4" height="18" /></>),
  soporte:    svg(<><path d="M6 19v-3a10 10 0 0 1 20 0v3" /><rect x="3.5" y="18" width="5" height="8" rx="2" /><rect x="23.5" y="18" width="5" height="8" rx="2" /></>),
  guia:       svg(<><path d="M6 6h9a3 3 0 0 1 3 3v17a3 3 0 0 0-3-3H6z" /><path d="M26 6h-8a3 3 0 0 0-3 3v17a3 3 0 0 1 3-3h8z" /></>),
  megafono:   svg(<><path d="M6 13v6l14 7V6z" /><path d="M20 12h5M20 16h6M20 20h5" /></>),
  referidas:  svg(<><circle cx="11" cy="11" r="4" /><path d="M4 25c0-4 3.2-6.5 7-6.5s7 2.5 7 6.5" /><circle cx="23" cy="13" r="3.2" /><path d="M19 25c0-3.4 2-5.4 4-5.4s5 2 5 5.4" /></>),
  mensaje:    svg(<><path d="M5 8h22a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H14l-6 5v-5H5a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z" /><path d="M16 12v6M13.5 13.5h5M13.5 16.5h5" /></>),
  grupo:      svg(<><circle cx="16" cy="11" r="4" /><path d="M8 25c0-4.4 3.6-7 8-7s8 2.6 8 7" /><rect x="21" y="20" width="8" height="6.5" rx="1.5" /><path d="M23 20v-2a2 2 0 0 1 4 0v2" /></>),
}

export type Fila = { icono: string; color: string; fuerte: string; resto: string }
export type Seccion = { id: string; nav: string; eyebrow: string; titulo: string; acento: string; filas: Fila[] }

export const SECCIONES: Seccion[] = [
  { id: 'dinero', nav: 'Dinero', eyebrow: 'Dinero', titulo: 'Ochenta por ciento', acento: 'es tuyo', filas: [
    { icono: 'porcentaje', color: LIME, fuerte: '80% de cada peso es tuyo.', resto: 'Lo que cobra tu suscriptor lo ves reflejado, sin letras chiquitas.' },
    { icono: 'reloj',      color: PINK, fuerte: 'Pagos cada semana,', resto: 'no cada mes. Sin monto mínimo para retirar.' },
    { icono: 'tarjeta',    color: CYAN, fuerte: 'Concepto neutro en tu banco.', resto: 'Tu estado de cuenta no cuenta tu vida.' },
    { icono: 'etiqueta',   color: LIME, fuerte: 'Cero comisiones escondidas', resto: 'por retirar, por procesar o por existir.' },
    { icono: 'cartera',    color: PINK, fuerte: 'Cobra como te acomode:', resto: 'transferencia, efectivo por corresponsalía o cripto.' },
  ]},
  { id: 'privacidad', nav: 'Privacidad', eyebrow: 'Privacidad e identidad', titulo: 'Nadie sabe', acento: 'tu nombre', filas: [
    { icono: 'escudo',      color: CYAN, fuerte: 'Verificación cifrada.', resto: 'Tus documentos se guardan bajo llave y nadie del equipo los anda hojeando.' },
    { icono: 'mascara',     color: PINK, fuerte: 'Nombre artístico obligatorio.', resto: 'Tu nombre legal no aparece en ninguna pantalla, nunca.' },
    { icono: 'nocompartir', color: LIME, fuerte: 'Tus datos no se venden ni se comparten.', resto: 'Ni con suscriptores, ni con terceros, ni con anunciantes.' },
    { icono: 'sinubicar',   color: CYAN, fuerte: 'Limpieza automática de metadatos.', resto: 'Tus fotos no traen ubicación, fecha ni modelo de teléfono escondidos.' },
  ]},
  { id: 'control', nav: 'Control', eyebrow: 'Control y propiedad', titulo: 'Es tuyo.', acento: 'Punto.', filas: [
    { icono: 'corona',   color: PINK, fuerte: 'El material es 100% tuyo.', resto: 'Sin cesión de derechos ni permisos raros escondidos en el contrato.' },
    { icono: 'salida',   color: LIME, fuerte: 'Sin exclusividad forzada.', resto: 'Publica donde quieras y vete el día que quieras.' },
    { icono: 'descarga', color: CYAN, fuerte: 'Te llevas todo:', resto: 'tu archivo completo y tu lista de suscriptores, en un clic.' },
    { icono: 'perillas', color: PINK, fuerte: 'Tú pones las reglas:', resto: 'tus precios, tus promociones y qué publicas. Aquí nadie te cura el contenido.' },
  ]},
  { id: 'apoyo', nav: 'Apoyo', eyebrow: 'Facilidad y apoyo', titulo: 'Subes en', acento: 'un minuto', filas: [
    { icono: 'subir',      color: LIME, fuerte: 'Subir toma menos de un minuto.', resto: 'Sin conversiones, sin formatos raros, sin manual.' },
    { icono: 'calendario', color: CYAN, fuerte: 'Programa tus publicaciones', resto: 'y edita desde el teléfono, sin apps de terceros.' },
    { icono: 'barras',     color: PINK, fuerte: 'Estadísticas que se entienden:', resto: 'qué contenido te da más y quiénes son tus mejores suscriptores.' },
    { icono: 'soporte',    color: LIME, fuerte: 'Soporte humano en español,', resto: 'que responde en horas y no con robots.' },
    { icono: 'guia',       color: CYAN, fuerte: 'Guía de arranque', resto: 'para tus primeras semanas: qué subir, cómo cobrar y cómo promocionarte.' },
  ]},
  { id: 'comunidad', nav: 'Comunidad', eyebrow: 'Comunidad y crecimiento', titulo: 'No empiezas', acento: 'sola', filas: [
    { icono: 'megafono',  color: PINK, fuerte: 'Promoción destacada gratis', resto: 'tus primeros meses, para que no publiques en el vacío.' },
    { icono: 'referidas', color: LIME, fuerte: 'Programa de referidas:', resto: 'ganas un porcentaje por cada creadora que traigas contigo.' },
    { icono: 'mensaje',   color: CYAN, fuerte: 'Más formas de cobrar:', resto: 'mensajes con propina, contenido suelto de pago y suscripciones por niveles.' },
    { icono: 'grupo',     color: PINK, fuerte: 'Grupo privado de creadoras', resto: 'para consejos, alertas de seguridad y datos que nadie te dice.' },
  ]},
]

export const FAQ: { q: string; a: ReactNode[] }[] = [
  { q: '¿De verdad nadie puede grabar mi contenido?', a: [
    <>No te vamos a mentir: <b>nadie en el mundo puede impedir que alguien apunte otro teléfono a la pantalla</b>. Quien te prometa eso, te está vendiendo humo.</>,
    <>Lo que sí hacemos: tu video nunca existe como archivo descargable, va cifrado y sólo se reproduce dentro de RAWstudio. Y encima aparece, en movimiento, el nombre del suscriptor que lo está viendo. Si graba, se graba a sí mismo delatándose.</>,
  ]},
  { q: 'Si algo se filtra, ¿qué pasa después?', a: [
    <>Nos avisas, o lo detectamos nosotros. La marca en pantalla nos dice <b>exactamente qué cuenta lo filtró</b>: esa cuenta se cierra el mismo día y no vuelve a entrar.</>,
    <>En paralelo nuestro equipo emite los avisos de retiro a los sitios donde apareció y da seguimiento hasta que baje. No te cuesta nada extra y no tienes que escribir un solo correo.</>,
  ]},
  { q: '¿Puede encontrarme alguien de mi ciudad?', a: [
    <>No si tú no quieres. Bloqueas tu perfil por <b>país, estado o ciudad</b> y ahí simplemente no existe: no sale en búsquedas, ni en recomendados, ni con liga directa.</>,
    <>Muchas creadoras bloquean su estado y el de su familia desde el primer día. Se cambia cuando quieras, sin pedir permiso.</>,
  ]},
  { q: '¿Y si un conocido se suscribe de todos modos?', a: [
    <>Vetas esa cuenta con un toque y deja de verte al instante, aunque haya pagado. También puedes bloquear por adelantado usuarios, correos o números que no quieres cerca.</>,
    <>Además limitamos las sesiones abiertas al mismo tiempo, para que nadie preste su cuenta a media oficina.</>,
  ]},
  { q: '¿Van a saber mi nombre real?', a: [
    <>Nunca. Trabajas con tu nombre artístico y es lo único visible en toda la plataforma. La verificación de identidad es obligatoria por ley, pero tus documentos van cifrados y <b>ningún suscriptor los ve jamás</b>.</>,
    <>También limpiamos los metadatos de cada foto y video que subes, esos datos ocultos que traen ubicación y modelo de teléfono.</>,
  ]},
  { q: '¿Cómo aparece el pago en mi estado de cuenta?', a: [
    <>Con un concepto neutro que no dice nada de este giro. Quien vea tu movimiento bancario no aprende nada de tu trabajo.</>,
    <>Con claridad: eso es <b>discreción, no invisibilidad</b>. La operación existe fiscalmente y te conviene declararla. Te damos tus comprobantes ordenados para que tu contador lo resuelva sin dramas.</>,
  ]},
  { q: '¿El contenido sigue siendo mío?', a: [
    <>Cien por ciento tuyo. No hay cesión de derechos, no hay exclusividad, no hay permiso para que usemos tu material en publicidad sin que tú lo autorices por escrito.</>,
    <>Si un día te quieres ir, te llevas tu archivo completo y tu lista de suscriptores. <b>Sin candados ni penalizaciones.</b></>,
  ]},
  { q: '¿Puedo borrar todo de un jalón?', a: [
    <>Sí. Un botón elimina tu perfil y todo tu contenido de nuestros servidores, y te confirmamos por escrito cuando quedó hecho.</>,
    <>Lo que ya se haya filtrado fuera no depende de nosotros, pero el servicio de retiro te lo seguimos dando seis meses después de que te vayas.</>,
  ]},
]

export const NO_PROMETEMOS: ReactNode[] = [
  <><b>Que nadie pueda grabar la pantalla con otro celular.</b> Es físicamente imposible. Por eso apostamos a identificar y perseguir, no a fingir que hay un candado mágico.</>,
  <><b>Que te vuelvas famosa en un mes.</b> Te damos herramientas, promoción y datos. El contenido lo pones tú.</>,
  <><b>Que tu dinero sea invisible al fisco.</b> Discreto sí, oculto no. Preferimos que lo sepas antes de empezar.</>,
]
