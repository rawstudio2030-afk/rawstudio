/* Constancia de mayoria de edad de quien todavia no tiene cuenta.
 *
 * La puerta de edad se cruza ANTES de que exista sesion, asi que la unica
 * constancia posible es local. Al abrir cuenta se vuelca al perfil —que es
 * estado del servidor y viaja con la cuenta— y aqui se olvida.
 *
 * Ojo: esto es autodeclaracion, no verificacion de identidad. Sirve como
 * registro de que se mostro la puerta, no como prueba legal de edad.
 *
 * Existe el respaldo en memoria porque `localStorage` no siempre esta: en
 * modo privado y con el almacenamiento de sitios bloqueado, TIRA. Sin
 * respaldo, la guardia no encontraria la marca, mandaria a la puerta, la
 * puerta no podria guardar nada y quedaria un rebote infinito.
 */

const CLAVE = 'rawstudio.edad_confirmada'

let enMemoria: string | null = null

export function marcarEdad(cuando = new Date().toISOString()) {
  enMemoria = cuando
  try { localStorage.setItem(CLAVE, cuando) } catch { /* almacenamiento bloqueado */ }
}

export function edadConfirmada(): string | null {
  if (enMemoria) return enMemoria
  try { return localStorage.getItem(CLAVE) } catch { return null }
}

export function olvidarEdad() {
  enMemoria = null
  try { localStorage.removeItem(CLAVE) } catch { /* nada que olvidar */ }
}
