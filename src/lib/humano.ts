/* Un mensaje de error del servidor o de la red, en palabras de persona.
 *
 * `supabase-js` NO lanza cuando falta la red: devuelve «Failed to fetch», que en
 * pantalla no dice nada y, peor, no avisa de que la accion pudo haberse aplicado
 * antes de cortarse la respuesta. Por eso el texto no dice «no se hizo», dice
 * «puede que si»: repetir un abono a ciegas lo duplicaria. */
export function humano(msg: string): string {
  if (/failed to fetch|networkerror|load failed|network request failed|fetch failed/i.test(msg)) {
    return 'No se obtuvo respuesta del servidor (sin conexión o se cortó). Es posible que la acción sí se haya aplicado: revisa antes de repetirla.'
  }
  return msg
}
