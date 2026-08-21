/** Mapa unico de navegacion.
 *
 *  Antes el menu listaba las 15 pantallas a todo el mundo, incluidas Launch y
 *  el age gate —que son de entrada y no se vuelven a visitar— y Administracion,
 *  que no le toca a nadie mas. Eso no es navegacion, es un indice de desarrollo.
 *
 *  Aqui se declara, en un solo lugar, quien puede ver que. */

export type Papel = 'visitante' | 'usuaria' | 'creadora' | 'admin'

/** Pantallas de entrada: se cruzan una vez. Nunca aparecen en la navegacion,
 *  porque volver a ellas estando dentro solo confunde. */
export const RUTAS_ENTRADA = ['/', '/age', '/entrar', '/registro', '/acceso']

/** Con sesion abierta, estas rutas no tienen sentido y redirigen al contenido. */
export const REDIRIGE_SI_HAY_SESION = ['/entrar', '/registro', '/acceso']

/** Sin sesion, estas exigen entrar primero. */
export const EXIGE_SESION = [
  '/library', '/chat', '/perfil', '/upload', '/earnings', '/admin', '/wallet',
]

export type Destino = {
  path: string
  titulo: string
  icono: string
  papeles: Papel[]
}

/** Barra inferior: cuatro destinos, iguales para todas. Lo especifico de cada
 *  papel vive dentro de "Yo", que evita una barra de seis pestañas que en
 *  movil no cabe ni se entiende. */
export const BARRA: Destino[] = [
  { path: '/clip',    titulo: 'Explorar',   icono: '▶', papeles: ['usuaria', 'creadora', 'admin'] },
  { path: '/library', titulo: 'Biblioteca', icono: '▤', papeles: ['usuaria', 'creadora', 'admin'] },
  { path: '/chat',    titulo: 'Mensajes',   icono: '✉', papeles: ['usuaria', 'creadora', 'admin'] },
  { path: '/perfil',  titulo: 'Yo',         icono: '●', papeles: ['usuaria', 'creadora', 'admin'] },
]

/** Accesos que viven dentro de "Yo", segun quien seas. */
export const ATAJOS_PERFIL: Destino[] = [
  { path: '/upload',    titulo: 'Subir un clip',   icono: '↑', papeles: ['creadora', 'admin'] },
  { path: '/earnings',  titulo: 'Mis ganancias',   icono: '$', papeles: ['creadora', 'admin'] },
  { path: '/wallet',    titulo: 'Mi monedero',     icono: '◎', papeles: ['usuaria', 'creadora', 'admin'] },
  { path: '/creadoras', titulo: 'Quiero publicar', icono: '✦', papeles: ['usuaria'] },
  { path: '/admin',     titulo: 'Administración',  icono: '⚙', papeles: ['admin'] },
]

export function papelDe(
  haySesion: boolean,
  esCreadora: boolean | undefined,
  esAdmin: boolean,
): Papel {
  if (!haySesion) return 'visitante'
  if (esAdmin) return 'admin'
  if (esCreadora) return 'creadora'
  return 'usuaria'
}

export function visiblesPara(lista: Destino[], papel: Papel): Destino[] {
  return lista.filter(d => d.papeles.includes(papel))
}
