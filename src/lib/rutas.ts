/** Mapa unico de navegacion.
 *
 *  Antes el menu listaba las 15 pantallas a todo el mundo, incluidas Launch y
 *  el age gate —que son de entrada y no se vuelven a visitar— y Administracion,
 *  que no le toca a nadie mas. Eso no es navegacion, es un indice de desarrollo.
 *
 *  Aqui se declara, en un solo lugar, quien puede ver que. */

/* El papel es QUIEN ERES, y no incluye 'admin'.
 *
 * Lo incluia, y ese fue el error de origen: con un solo valor, administrar
 * quedo definido como «ser creadora con cosas extra», porque 'admin' ganaba y
 * 'creadora' se perdia. De ahi salio que un administrador viera la barra de
 * creadora, que el panel entero fuera un renglon dentro de «Yo», y que un
 * administrador que NO sea creadora reciba una pestaña de Estudio que al
 * tocarla le pide activar su perfil de creadora.
 *
 * Administrar es un permiso aparte —`esAdmin`— que se cruza con cualquiera de
 * estos tres. Ver src/lib/modo.ts. */
export type Papel = 'visitante' | 'usuaria' | 'creadora'

/** Pantallas de entrada: se cruzan una vez. Nunca aparecen en la navegacion,
 *  porque volver a ellas estando dentro solo confunde. */
export const RUTAS_ENTRADA = ['/', '/intro', '/age', '/entrar', '/registro', '/acceso', '/modo']

/** Con sesion abierta, estas rutas no tienen sentido y redirigen al contenido. */
export const REDIRIGE_SI_HAY_SESION = ['/entrar', '/registro', '/acceso']

/** Sin sesion, estas exigen entrar primero. */
/** El panel de administracion es de escritorio y trae su propia barra
 *  lateral. La barra inferior de celular ahi sobra y ademas tapa filas. */
export const RUTAS_PANEL = ['/admin', '/alta-creadora']

export const EXIGE_SESION = [
  '/library', '/chat', '/perfil', '/yo', '/upload', '/earnings', '/admin', '/wallet',
  '/estudio', '/estudio/niveles', '/estudio/encargos', '/estudio/blog',
  '/estudio/cobro', '/estudio/retirar',
]

/** Rutas que NO exigen haber cruzado la puerta de edad: la portada, la propia
 *  puerta, el alta, los avisos legales y la pagina para creadoras. Todo lo
 *  demas es catalogo y si la exige.
 *
 *  Antes esto no hacia falta: la intro mandaba sola a la puerta y no habia
 *  forma de llegar al contenido sin pasar por ahi. Ahora la raiz es una
 *  portada que se puede leer entera sin cruzar nada, asi que la puerta tiene
 *  que defenderse sola. */
export const SIN_PUERTA_DE_EDAD = [
  '/', '/intro', '/age', '/entrar', '/registro', '/acceso', '/nueva-clave',
  '/privacidad', '/terminos', '/creadoras', '/modo',
  // Contacto y preguntas van aqui por la misma razon que los legales, y con
  // un motivo extra: a contacto tiene que poder escribir alguien SIN cuenta
  // cuya imagen aparece sin su permiso. Una pagina de contacto detras de una
  // puerta de mayoria de edad no sirve para lo que existe.
  '/contacto', '/preguntas',
]

export type Destino = {
  path: string
  titulo: string
  icono: string
  papeles: Papel[]
  /** Solo para quien administra, sea cual sea su papel. La puerta al panel es
   *  el unico destino asi: tiene que verse siempre —es el cambiador— pero no
   *  pertenece a ningun papel. */
  soloAdmin?: boolean
}

/** Barra inferior: los destinos que cambian segun el papel.
 *
 *  "Yo" va al final y no al principio, siguiendo la convencion de Instagram,
 *  TikTok, YouTube y OnlyFans: la primera posicion es donde aterrizas por
 *  omision, y se aterriza en el contenido, no en una misma.
 *
 *  Lo que si cambia es el segundo lugar. Biblioteca es de compradora y a una
 *  creadora le estorba; a cambio, el estudio le quedaba enterrado dentro de
 *  "Yo" y la obligaba a usar esa pestaña como pasillo en vez de destino.
 *
 *  DINERO ES UN DESTINO, no un atajo. Estaba enterrado: una creadora llegaba
 *  por una tarjeta dentro del estudio, y una compradora SOLO por la lista de
 *  atajos de "Yo" —o sea que su dinero vivia a dos toques y dentro de una
 *  pantalla de configuracion—. Es lo que la plataforma existe para mover, asi
 *  que ocupa su propio lugar. Son cinco y no cuatro: el limite practico de una
 *  barra de telefono, y el mismo numero que usa Instagram. */
export const BARRA: Destino[] = [
  { path: '/clip',      titulo: 'Explorar',   icono: '▶', papeles: ['visitante', 'usuaria', 'creadora'] },
  { path: '/library',   titulo: 'Biblioteca', icono: '▤', papeles: ['usuaria'] },
  { path: '/estudio',   titulo: 'Estudio',    icono: '◆', papeles: ['creadora'] },
  { path: '/creadoras', titulo: 'Publicar',   icono: '✦', papeles: ['visitante'] },
  { path: '/chat',      titulo: 'Mensajes',   icono: '✉', papeles: ['usuaria', 'creadora'] },
  { path: '/wallet',    titulo: 'Dinero',     icono: '$', papeles: ['usuaria', 'creadora'] },
  /* «Yo» muestra el perfil, no los ajustes. Apuntaba a /perfil, que es un
     formulario: nombre, foto, contacto, cerrar sesion. Una pestaña que se
     llama «Yo» y abre un formulario convierte el destino en un pasillo, y
     deja los ajustes de una vez al mismo nivel que lo que se usa a diario.
     Ahora abre /yo —foto, nombre, @handle, bio, tus clips— y los ajustes
     cuelgan de un boton de ahi dentro. */
  { path: '/yo',        titulo: 'Yo',         icono: '●', papeles: ['usuaria', 'creadora'] },
  { path: '/entrar',    titulo: 'Entrar',     icono: '→', papeles: ['visitante'] },
  /* La puerta al panel va al final y es el cambiador de ida. El de vuelta es
     «Volver a la aplicacion» en la barra lateral del panel. Antes esto era un
     renglon enterrado en «Yo»: diez modulos escondidos entre «mis ganancias» y
     «mi monedero». */
  { path: '/admin',     titulo: 'Panel',      icono: '⚙', papeles: [], soloAdmin: true },
]

/** Accesos que viven dentro de "Yo", segun quien seas. */
/** Las opciones del estudio, para el riel de la izquierda en pantalla ancha.
 *
 *  En el telefono estas viven DENTRO de /estudio, en una lista, y esta bien:
 *  no cabe otra cosa. En una pantalla de computadora esconderlas detras de un
 *  destino es desperdiciar la columna entera que sobra a la izquierda, que es
 *  justo lo que hacen TikTok Studio y cualquier panel de creador.
 *
 *  Son las mismas rutas que `canales()` ofrece en /estudio; aqui van sin
 *  descripcion ni estado porque un riel no es una pantalla de inicio.
 *
 *  SOLO LO QUE SE HACE SEGUIDO. El riel llego a tener seis entradas y trataba
 *  igual «subir un clip», que se hace mil veces, y «define tu nivel de
 *  suscripcion», que se hace una. Salieron:
 *
 *    Retirar             -> es un boton dentro de Dinero, no un tema aparte
 *    Mi dinero           -> subio a la barra principal
 *    A la medida         -> es una conversacion: vive en Mensajes
 *    Suscripcion mensual -> es poner un precio una vez: vive en los ajustes
 *                           del estudio, dentro de /estudio
 *
 *  Ninguna pantalla se borro. Cambiaron de sitio, o se piden cuando tocan. */
export const ESTUDIO: Destino[] = [
  { path: '/upload',       titulo: 'Subir un clip', icono: '↑', papeles: ['creadora'] },
  { path: '/estudio/blog', titulo: 'Blog',          icono: '✍︎', papeles: ['creadora'] },
]

/** Accesos que viven dentro de «Yo».
 *
 *  Queda UNO. La lista existia porque el dinero no tenia donde vivir: era el
 *  unico camino de una compradora a su monedero. Ahora Dinero es un destino de
 *  la barra, Subir vive en el estudio y Biblioteca ya estaba en la barra, asi
 *  que repetirlos aqui convertia «Yo» en un pasillo en vez de una pantalla.
 *
 *  «Quiero publicar» se queda, y solo para quien todavia no publica: no es un
 *  atajo a una pantalla que ya tiene, es la puerta a un papel que aun no
 *  tiene. */
export const ATAJOS_PERFIL: Destino[] = [
  { path: '/creadoras', titulo: 'Quiero publicar', icono: '✦', papeles: ['usuaria'] },
]

/** Quien eres. Administrar no entra aqui: va aparte, porque se cruza con
 *  cualquiera de los tres. */
export function papelDe(
  haySesion: boolean,
  esCreadora: boolean | undefined,
): Papel {
  if (!haySesion) return 'visitante'
  return esCreadora ? 'creadora' : 'usuaria'
}

export function visiblesPara(
  lista: Destino[], papel: Papel, esAdmin = false,
): Destino[] {
  return lista.filter(d => d.soloAdmin ? esAdmin : d.papeles.includes(papel))
}
