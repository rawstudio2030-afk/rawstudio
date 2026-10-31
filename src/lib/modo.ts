/* Con que sombrero entraste hoy.
 *
 * Administrar NO es un papel, es un modo. El papel —visitante, compradora,
 * creadora— dice quien eres y no cambia en todo el dia. El modo dice que estas
 * haciendo ahora, y cambia diez veces.
 *
 * Meterlos en la misma variable fue el error de origen: `papelDe` devolvia
 * 'admin' en vez de 'creadora', asi que administrar quedo definido como «ser
 * creadora con cosas extra». De ahi salio todo lo demas —la barra de creadora
 * para un administrador, y el panel entero reducido a un renglon dentro de
 * «Yo», entre las ganancias y el monedero.
 *
 * Esto guarda UNA sola cosa: donde aterrizar al entrar. Quien puede ver que lo
 * sigue decidiendo el papel mas `esAdmin`, no esto; asi no hay estados raros
 * del tipo «estoy en modo panel pero mirando el catalogo».
 *
 * Va en sessionStorage y no en localStorage a proposito: el porton se cruza una
 * vez por sesion. Si durara para siempre, cambiar de sombrero obligaria a
 * buscar donde se borra.
 */

export type Modo = 'app' | 'panel'

const CLAVE = 'rawstudio.modo'

/* Respaldo en memoria: sessionStorage TIRA en modo privado y con el
 * almacenamiento de sitios bloqueado. Sin esto, la guardia no encontraria el
 * modo elegido, mandaria al porton, el porton no podria guardar nada y
 * quedaria un rebote infinito. Es el mismo problema que ya mordio con la
 * constancia de edad. */
let enMemoria: Modo | null = null

export function modoElegido(): Modo | null {
  if (enMemoria) return enMemoria
  try {
    const v = sessionStorage.getItem(CLAVE)
    return v === 'app' || v === 'panel' ? v : null
  } catch { return null }
}

export function elegirModo(m: Modo) {
  enMemoria = m
  try { sessionStorage.setItem(CLAVE, m) } catch { /* almacenamiento bloqueado */ }
}

/** Al cerrar sesion. Si no, la siguiente persona que entre en este navegador
 *  se salta el porton con la eleccion de la anterior. */
export function olvidarModo() {
  enMemoria = null
  try { sessionStorage.removeItem(CLAVE) } catch { /* nada que olvidar */ }
}
