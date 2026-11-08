/* La descripcion por defecto de un VIDEO.
 *
 * La descripcion casi siempre va vacia (la subida en lote no la pide y en el
 * formulario es opcional), y solo se lee en la ficha del clip. Cuando falta se pone una
 * frase corta y neutra: «Video de {nombre}».
 *
 * A PROPOSITO NO DICE DE QUE VA EL VIDEO. No se inventa una sinopsis, no se usan
 * adjetivos sexuales, no se llama a ninguna API ni se le manda el video a una IA para
 * narrarlo (es contenido 18+ y se prestaria a inventar). Tampoco asume genero: no
 * usa «creadora» ni «creador», solo el nombre.
 *
 * NUNCA pisa un texto que alguien ya escribio: quien llama solo la usa cuando el campo
 * esta vacio. Los albumes no la usan: esto es de videos. El titulo no se toca. */

/** Lo mismo que el `check` de la columna `clips.description`. */
export const TOPE_DESCRIPCION = 600

/** «Video de {nombre}», con el `display_name` de la creadora o, si no hay, su `handle`.
 *  Devuelve null si no hay ninguno de los dos: mas vale vacia que «Video de ». */
export function descripcionGenerica(
  nombre: string | null | undefined, handle?: string | null,
): string | null {
  const quien = (nombre ?? '').trim() || (handle ?? '').trim()
  return quien ? `Video de ${quien}`.slice(0, TOPE_DESCRIPCION) : null
}
