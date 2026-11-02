/* Escala tipografica.
 *
 * Este archivo es el gemelo de diseño.ts. Alli habia 370 colores sueltos y el
 * magenta escrito a mano 74 veces; aqui habia CUARENTA Y UN tamaños de letra
 * en 625 usos, trece espaciados y diecisiete interlineas. Entre ellos, cosas
 * como 13 / 13.5 / 14 / 14.5 / 15 / 15.5 / 16: siete escalones donde nadie
 * distingue uno de otro.
 *
 * No rediseña nada. Los escalones SALEN de lo que ya estaba: se tomo la
 * distribucion real de usos y se agruparon los picos. La regla fue que nada
 * se moviera mas de un pixel en el texto, y mas de un 7% en los tamaños
 * grandes —donde un pixel ya no se ve y lo que cuenta es la proporcion.
 *
 * Dos escalas y no una, que es como funcionan los sistemas de verdad: el
 * texto y el despliegue tienen trabajos distintos. El texto se lee en parrafo
 * y necesita pocos escalones muy parejos; los titulares se miran de un golpe
 * y necesitan saltos grandes.
 */

/* ---------- Texto ----------
 *
 * Aqui vive el 83% de la letra del proyecto (520 de 625 usos). Es donde la
 * falta de escala se notaba: dos rotulos que deberian ser iguales median 10 y
 * 11, y la diferencia no se ve pero el desorden si se acumula. */
export const TEXTO = {
  /** Rotulos diminutos en mayusculas. Insignias, pies de tabla. */
  rotulo: 9,
  /** Rotulos de seccion, etiquetas de campo. El tamaño mas repetido. */
  mini: 10,
  /** Notas, datos en mono, texto secundario. */
  nota: 12,
  /** Cuerpo compacto: descripciones dentro de tarjetas y filas. */
  base: 13,
  /** Cuerpo de lectura. Parrafos, respuestas, campos de formulario. */
  cuerpo: 16,
} as const

/* ---------- Despliegue ----------
 *
 * Los titulares. Son 105 usos repartidos en veintitres tamaños distintos
 * porque cada pantalla eligio el suyo. Agruparlos del todo aplanaria
 * diferencias que si son decisiones —el titular de la portada no deberia
 * medir lo mismo que el de un formulario—, asi que aqui la escala sirve sobre
 * todo para ponerles nombre y quitar los que estaban a un pelo de distancia. */
export const DISPLAY = {
  destacado: 19,
  subtitulo: 22,
  titulo: 26,
  grande: 32,
  mayor: 38,
  hero: 46,
  heroAlto: 52,
  gigante: 60,
} as const

/* ---------- Interlinea ----------
 *
 * Habia diecisiete valores entre 0.9 y 1.7. Cuatro bastan.
 *
 * OJO con `titulo: 1`: en español los titulares llevan mayusculas acentuadas
 * —CÓMO, MÉXICO— y por debajo de 1 la linea de arriba se come el acento. Ya
 * paso con el deck original, que venia en ingles con 0.9 y no lo sufria. */
export const ALTO = {
  /** Titulares. No bajar de 1. */
  titulo: 1,
  /** Apretado: titulos de dos lineas, nombres en tarjetas. */
  apretado: 1.3,
  /** Medio: la mayoria del texto de interfaz. */
  medio: 1.45,
  /** Lectura: parrafos largos, respuestas, textos legales. */
  lectura: 1.6,
} as const

/* ---------- Espaciado entre letras ----------
 *
 * Solo tiene sentido en MAYUSCULAS: en minusculas el espaciado positivo
 * separa lo que deberia leerse junto. Todos los usos del proyecto son de
 * rotulos en mayuscula, y por eso la escala va de 0.5 para arriba. */
export const LETRA = {
  /** Titulares grandes en Anton: casi nada, el peso ya los separa. */
  titular: 0.5,
  /** Rotulos normales. */
  rotulo: 1.2,
  /** Rotulos que necesitan respirar mas. */
  amplio: 1.6,
  /** Rotulos diminutos: a 9 o 10 px hace falta mucho para que se lean. */
  diminuto: 2.2,
} as const

/* ---------- Pesos ----------
 *
 * Tres, y los tres se cargan. */
export const PESO = {
  /** Cuerpo. 368 usos. */
  normal: 400,
  /** Titulo de un elemento en una lista: el nombre de un clip, de un canal,
   *  de un movimiento. Lo justo para destacar sobre el gris de al lado sin
   *  gritar como un rotulo.
   *
   *  Antes este papel estaba repartido entre 500 y 600, y el 600 NO EXISTIA:
   *  el <link> de Google carga Space Grotesk en 400, 500 y 700, asi que el
   *  navegador lo sustituia por otro. Seis sitios donde la letra no era la
   *  que decia el codigo, y cuatro mas haciendo lo mismo con otro peso. */
  medio: 500,
  /** Rotulos en mayusculas y botones. 180 usos. */
  fuerte: 700,
} as const
