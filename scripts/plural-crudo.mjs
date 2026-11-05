#!/usr/bin/env node
/* Plurales fijos pegados a un numero que puede ser uno.
 *
 * El estudio decia «1 publicados de 1». Lo vio Omar mirando la pantalla, y al
 * buscarlo con una expresion resulto que no era un caso suelto: habia TRECE en
 * el codigo, escritos de tres maneras distintas.
 *
 *   `${r.clipsPublicados} publicados de ${r.clips}`  -> «1 publicados de 1»
 *   `${r.posts} entrada(s)`                           -> «1 entrada(s)»
 *   `${filas.length} filas leidas`                    -> «1 filas leidas»
 *   `${clip.reportes} reportes`                       -> «1 reportes»
 *
 * Trece veces el mismo descuido significa que el problema no era el descuido:
 * nada lo impedia. Esto lo impide, igual que dinero-crudo.mjs impide pintar
 * centavos sin dividir.
 *
 * ---------- Que mira, y que NO ----------
 *
 * Una interpolacion seguida de una palabra en plural: `${algo} palabras`. Solo
 * cuando dentro de la interpolacion hay un nombre o una propiedad —`${n}`,
 * `${filas.length}`— y no una llamada: si ya pasa por `cuantos()` o por
 * `usd()`, quien escribio la frase ya penso en esto.
 *
 * No mira unidades, que no concuerdan con el numero y nunca estan en plural
 * por su cuenta: «$5 MXN», «12 px», «3 KB». Estan en UNIDADES.
 *
 * Tampoco mira los comentarios, porque el propio src/lib/plural.ts tiene los
 * ejemplos del fallo escritos dentro para explicarse.
 *
 * Escape: «plural-ok» en un comentario de la misma linea, para el plural que
 * de verdad no puede ser uno —o que ya concuerda por otra via—.
 */

import { readFileSync, globSync } from 'node:fs'

/* `${nombre}` o `${algo.propiedad}` o `${lista.length}`, y nada mas: en cuanto
 * aparece un parentesis es una llamada y se deja pasar. */
const PATRON = /\$\{\s*([A-Za-z_$][\w$.]*)\s*\}[ ]+([a-záéíóúüñ]+(?:es|s))\b/g

/* Unidades y monedas: no concuerdan con el numero que llevan delante. */
const UNIDADES = new Set([
  'mxn', 'usd', 'px', 'kb', 'mb', 'gb', 'tb', 'ms', 'fps', 'kbps',
  'pesos', 'dolares', 'dólares', 'coins',
])

/* Quita los comentarios para no delatar los ejemplos que explican el fallo. */
function sinComentarios(texto) {
  return texto
    .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, a) => a + ' '.repeat(m.length - a.length))
}

const fallos = []

for (const ruta of globSync('src/**/*.{ts,tsx}')) {
  const original = readFileSync(ruta, 'utf8')
  const texto = sinComentarios(original)
  const lineas = original.split('\n')

  for (const m of texto.matchAll(PATRON)) {
    if (UNIDADES.has(m[2].toLowerCase())) continue
    const linea = texto.slice(0, m.index).split('\n').length
    if (/plural-ok/.test(lineas[linea - 1] ?? '')) continue
    fallos.push({ ruta, linea, texto: (lineas[linea - 1] ?? '').trim(), hallado: m[0].trim() })
  }
}

if (fallos.length === 0) {
  console.log('plural: ningun plural fijo pegado a un numero.')
  process.exit(0)
}

console.error(`\nplural: ${fallos.length} plural(es) fijos pegados a un numero que puede ser uno.`)
console.error('Con n = 1 se leen mal: «1 filas», «1 reportes», «1 publicados».')
console.error('Usa cuantos() o palabra() de src/lib/plural.ts, o marca la linea con «plural-ok».\n')
for (const f of fallos) {
  console.error(`  ${f.ruta}:${f.linea}  (${f.hallado})`)
  console.error(`      ${f.texto}`)
}
console.error('')
process.exit(1)
