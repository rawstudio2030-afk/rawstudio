/* Trato: como se le habla a cada persona.
 *
 * Se elige desde el alta (mujer, hombre, neutro o prefiero no decirlo) y se
 * puede cambiar en Perfil. Es PRIVADO: solo sirve para escribirle a ESA persona
 * con las palabras que prefiere, y nunca se pinta como dato de su ficha. Se lee
 * del servidor con `mi_trato()`; administracion lo ve con `admin_trato_de()`.
 *
 * Este archivo es el UNICO lugar que decide esas palabras. Quien escribe un
 * texto dirigido a alguien en concreto («tu perfil de creadora», «Como
 * creadora») pasa por aqui; nadie vuelve a escribir «creadora» a mano para
 * hablarle a una persona.
 *
 * Lo que NO pasa por aqui: el nombre de la oferta para quien quiere publicar
 * (`/creadoras`) y los textos generales que no le hablan a nadie en concreto.
 *
 * Reglas (de Sergio):
 *   mujer   -> creadora, usuaria
 *   hombre  -> creador, usuario
 *   neutro / prefiero no decirlo / sin elegir -> sin asumir genero: «tu
 *   perfil», «quien publica», «esta cuenta». Nada de «creadore» ni «elle».
 */

export type Trato = 'mujer' | 'hombre' | 'neutro' | 'no_decir'

export const OPCIONES_TRATO: { valor: Trato; rotulo: string }[] = [
  { valor: 'mujer', rotulo: 'Mujer' },
  { valor: 'hombre', rotulo: 'Hombre' },
  { valor: 'neutro', rotulo: 'Neutro' },
  { valor: 'no_decir', rotulo: 'Prefiero no decirlo' },
]

export function esTrato(x: unknown): x is Trato {
  return x === 'mujer' || x === 'hombre' || x === 'neutro' || x === 'no_decir'
}

/** `null` o sin elegir se trata como neutro. */
type Entrada = Trato | null | undefined

/** «creadora» / «creador» / «quien publica». */
export function creador(t: Entrada): string {
  return t === 'mujer' ? 'creadora' : t === 'hombre' ? 'creador' : 'quien publica'
}

/** «usuaria» / «usuario» / «esta cuenta». */
export function usuario(t: Entrada): string {
  return t === 'mujer' ? 'usuaria' : t === 'hombre' ? 'usuario' : 'esta cuenta'
}

/** «perfil de creadora» / «perfil de creador» / «perfil para publicar». */
export function perfilParaPublicar(t: Entrada): string {
  return t === 'mujer' ? 'perfil de creadora'
    : t === 'hombre' ? 'perfil de creador' : 'perfil para publicar'
}

/** «Como creadora» / «Como creador» / «Como quien publica». */
export function comoCreador(t: Entrada): string {
  return `Como ${creador(t)}`
}
