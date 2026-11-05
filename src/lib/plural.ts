/* Concordancia de numero en el texto que se le enseña a alguien.
 *
 * ---------- El fallo que lo provoco ----------
 *
 * El estudio decia «1 publicados de 1». Lo vio Omar. Y no era un caso suelto:
 * la misma pereza estaba en cuatro sitios a la vez, escrita de dos maneras
 * distintas —el plural fijo y el parentesis—:
 *
 *   `${r.clipsPublicados} publicados de ${r.clips}`   -> «1 publicados de 1»
 *   `${r.posts} entrada(s)`                            -> «1 entrada(s)»
 *   `${ventas.operaciones} clips vendidos`             -> «1 clips vendidos»
 *   `${lote.length} videos en ${carpetas.length} carpetas`
 *                                                      -> «1 videos en 1 carpetas»
 *
 * Son errores pequeños y por eso sobreviven, pero se acumulan: una pantalla
 * donde la mitad de las frases no concuerdan se lee como algo sin terminar, y
 * esta es una plataforma donde alguien va a confiar dinero.
 *
 * ---------- Por que una funcion y no cuatro ternarios ----------
 *
 * Porque el quinto se vuelve a escribir mal. Con esto, acordarse de la
 * concordancia deja de depender de que quien escribe la frase se acuerde: la
 * forma corta de decirlo YA la trae.
 *
 * No intenta ser una libreria de i18n. Es español, son sustantivos y
 * participios, y se cuenta lo que cuenta esta plataforma.
 *
 * ---------- Por que la regla por omision es «+s» y no la del español ----------
 *
 * La regla de verdad es: vocal -> +s, consonante -> +es. «nivel» hace
 * «niveles», no «nivels». Pero MEDIA de las palabras que esta aplicacion
 * cuenta son prestamos del ingles que no la siguen: «clip» hace «clips» y no
 * «clipes»; «blog» hace «blogs».
 *
 * Una regla que acierte en las dos familias no existe sin una lista de
 * excepciones, y una lista de excepciones escondida en un ayudante es peor que
 * escribir el plural donde se usa. Asi que la omision es «+s» —que es lo
 * correcto para los prestamos y para todo lo que acaba en vocal— y las
 * palabras españolas que acaban en consonante LLEVAN SU PLURAL EXPLICITO:
 *
 *     cuantos(n, 'nivel', 'niveles')
 *     cuantos(n, 'solicitud', 'solicitudes')
 *
 * Esto no es teorico: la primera version de este archivo escribia «0 nivels
 * activos». Se descubrio imprimiendo las seis frases con 0, 1 y 2, no
 * leyendolas — que es la unica forma de ver un fallo de concordancia, porque
 * el codigo se lee bien.
 *
 * ---------- Quien vigila que no vuelva ----------
 *
 * `scripts/plural-crudo.mjs`, enganchado a `npm run lint`, igual que
 * dinero-crudo.mjs vigila los centavos sin dividir. Busca una interpolacion
 * seguida de un plural fijo —`${n} filas`— y falla si encuentra una que no
 * pase por aqui. Hacia falta: cuando se escribio habia TRECE en el codigo.
 */

/** `cuantos(1, 'clip')` -> «1 clip»; `cuantos(3, 'clip')` -> «3 clips».
 *
 *  Para los irregulares y los que no acaban como se espera, el plural va
 *  explicito: `cuantos(1, 'mes', 'meses')`.
 *
 *  La regla por omision añade una «s», que cubre lo que esta aplicacion
 *  cuenta. Si algun dia hace falta «-es» —«mes», «pais»— se pasa a mano, que
 *  es mas honesto que adivinar con una regla a medias. */
export function cuantos(n: number, singular: string, plural?: string): string {
  return `${n} ${n === 1 ? singular : plural ?? singular + 's'}`
}

/** Solo la palabra, sin el numero, para cuando el numero ya va en otro sitio
 *  —en una cifra grande, por ejemplo— y solo hace falta concordar la etiqueta. */
export function palabra(n: number, singular: string, plural?: string): string {
  return n === 1 ? singular : plural ?? singular + 's'
}
