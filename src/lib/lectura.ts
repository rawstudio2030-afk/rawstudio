/* «No hay nada» y «no pude preguntar» son dos cosas distintas.
 *
 * Todas las lecturas de esta carpeta hacian lo mismo cuando la consulta
 * fallaba: avisar a la consola y devolver vacio. Una lista vacia, un saldo de
 * cero, un null. La pantalla recibia exactamente lo mismo que si de verdad no
 * hubiera nada, asi que decia lo unico que no era.
 *
 * No es teorico. El 4 de noviembre de 2026, durante los veinte minutos que el
 * catalogo estuvo caido por un permiso, cualquiera que entrara leia «Todavia
 * nadie ha publicado nada» con 186 clips en la base. Nadie habria reportado
 * eso como un fallo: parecia un sitio vacio, no un sitio roto.
 *
 * Y donde hay dinero es peor. `saldo` devolvia 0: a quien tiene saldo se le
 * enseñaba «$0.00» porque la consulta no salio. `misCompras` devolvia lista
 * vacia: quien pago se quedaba sin lo que compro. `miCuenta` devolvia null:
 * la pantalla decia «no tienes cuenta registrada» y la creadora volvia a
 * escribirla.
 *
 * El arreglo es que el dato viaje con la noticia de si se pudo leer:
 *
 *   const { datos, fallo } = await saldo()
 *
 * `datos` sigue trayendo el vacio de siempre, asi que una pantalla que no
 * quiera distinguir no se rompe ni tiene que inventarse un valor. `fallo`
 * trae el motivo cuando no se pudo, y null cuando la respuesta es de verdad.
 *
 * No se convirtio TODO a proposito. `soyAdmin` sigue devolviendo false a
 * secas: ante la duda, no eres administrador. Eso no es una lectura
 * silenciosa, es fallar del lado seguro, y envolverlo invitaria a alguien a
 * tratar el fallo como «pues dejalo pasar».
 */

export type Lectura<T> = {
  /** El dato, o el vacio de siempre si no se pudo leer. */
  datos: T
  /** El motivo, o null si la respuesta es real. */
  fallo: string | null
}

/** Se pudo leer. */
export function leido<T>(datos: T): Lectura<T> {
  return { datos, fallo: null }
}

/** No se pudo. Lleva el vacio que corresponda al tipo —lista, null, cero— para
 *  que quien no distinga siga recibiendo algo con lo que pintar. */
export function noSePudo<T>(vacio: T, error: { message: string } | string): Lectura<T> {
  return { datos: vacio, fallo: typeof error === 'string' ? error : error.message }
}
