#!/usr/bin/env node
/* Centavos pintados en crudo.
 *
 * Todo el dinero se guarda en CENTAVOS, en columnas que todavia se llaman
 * *_coins. Pintar ese entero sin dividir multiplica la cifra por cien: un
 * saldo de $2.40 se lee como «240». Paso cinco veces en pantallas distintas,
 * una de ellas a UNA LINEA de su propio arreglo, asi que el problema no era
 * el descuido: nada lo impedia.
 *
 * Mira los dos sitios por los que ya se escapo:
 *   1. Dinero impreso como hijo de JSX:     >{clip.price_coins}<
 *   2. Dinero metido en una fila de panel:  { t: 'Saldo', v: fila.saldo }
 *      (luego se pinta como {x.v}, y ahi el nombre ya no delata que es dinero)
 *
 * No mira atributos (value={precio}), estilos condicionales
 * (color: saldo > 0 ? …) ni claves (precio: centavos): pasan el dato, no lo
 * imprimen.
 *
 * Analiza el archivo COMPLETO, no linea por linea, porque en JSX el «>» y la
 * interpolacion caen a menudo en lineas distintas. Y conserva las expresiones
 * ${…} de las plantillas, porque asi estaba escrito uno de los fallos.
 *
 * Escape: «dinero-ok» en un comentario de la misma linea, para lo que no sea
 * dinero impreso — un porcentaje, un conteo, una comparacion.
 */

import { readFileSync, globSync } from 'node:fs'

const DINERO = /\b(?:\w*_coins|precios?|saldos?|montos?|importes?|brutos?|comisiones?|comision|ganado|total_ganado|rentaCoins|gana)\b/
const FORMATEA = /\b(?:usd|usdYPesos|usdPlano|mxn|pesos|aCentavos|toLocaleString)\s*\(/
const CLAVE_VISIBLE = /\b(?:v|valor|texto|dato)\s*:\s*([^,}\n]+)/g

/** Deja el codigo en pie y vacia solo el texto:
 *  - comentarios fuera, para que un ejemplo escrito en prosa no cuente;
 *  - cadenas vacias, para que el copy de marketing no parezca una variable;
 *  - pero DENTRO de las plantillas se conservan los ${…}, que son codigo.
 *  Se respetan los saltos de linea para no mover la numeracion. */
function soloCodigo(texto) {
  const huecos = s => s.replace(/[^\n]/g, ' ')
  return texto
    .replace(/\/\*[\s\S]*?\*\//g, huecos)
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p) => p + huecos(m.slice(p.length)))
    .replace(/'(?:[^'\\\n]|\\.)*'/g, m => "'" + ' '.repeat(Math.max(0, m.length - 2)) + "'")
    .replace(/"(?:[^"\\\n]|\\.)*"/g, m => '"' + ' '.repeat(Math.max(0, m.length - 2)) + '"')
    .replace(/`(?:[^`\\]|\\.)*`/g, m =>
      m.replace(/\$\{[^{}]*\}|[\s\S]/g, t => t.startsWith('${') ? t : (t === '\n' ? '\n' : ' ')))
}

const objetivos = process.argv.slice(2)
const archivos = objetivos.length ? objetivos : globSync('src/**/*.tsx')
const fallos = []

for (const ruta of archivos) {
  const bruto = readFileSync(ruta, 'utf8')
  const codigo = soloCodigo(bruto)
  const lineas = bruto.split('\n')
  const lineaDe = idx => codigo.slice(0, idx).split('\n').length
  const vistas = new Set()

  const marcar = (idx, razon) => {
    const n = lineaDe(idx)
    if (vistas.has(n)) return
    // el escape vale en la linea del hallazgo y en la del «>» que lo abre
    if (/dinero-ok/.test(lineas[n - 1] ?? '') || /dinero-ok/.test(lineas[n - 2] ?? '')) return
    vistas.add(n)
    fallos.push({ ruta, linea: n, texto: (lineas[n - 1] ?? '').trim().slice(0, 100), razon })
  }

  // 1. hijo de JSX; el «>» puede estar en otra linea.
  //    Las llaves se cuentan equilibradas en vez de con una expresion regular:
  //    uno de los fallos venia envuelto en una plantilla, >{… `${x.price_coins}`}<,
  //    y ahi hay llaves dentro de llaves.
  for (const m of codigo.matchAll(/>[\s\n]*(?=\{)/g)) {
    // «=>» tambien acaba en «>»: sin esto, el cuerpo de cada funcion flecha
    // se tomaba por texto JSX y se escaneaba entero.
    if (codigo[m.index - 1] === '=') continue
    const abre = m.index + m[0].length
    let prof = 0, fin = -1
    for (let j = abre; j < codigo.length; j++) {
      if (codigo[j] === '{') prof++
      else if (codigo[j] === '}' && --prof === 0) { fin = j; break }
    }
    if (fin === -1) continue
    // Una cifra impresa es corta. Si la region abarca medio archivo es un
    // bloque condicional o un .map(), y lo que haya dentro ya se revisa por su
    // propia cuenta: atribuirselo a la linea de apertura solo da ruido.
    if (codigo.slice(abre, fin).split('\n').length > 2) continue
    // Una comparacion es una condicion, no una cifra impresa.
    const trozo = codigo.slice(abre, fin + 1)
      .replace(/[\w.]+\s*(?:>=|<=|===|!==|==|!=|>|<)\s*[\w.]+/g, '')
    if (FORMATEA.test(trozo)) continue
    if (DINERO.test(trozo.replace(/\b\w+\??\s*:/g, ''))) {
      marcar(abre, 'impreso en pantalla')
    }
  }

  // 2. fila de panel
  for (const m of codigo.matchAll(CLAVE_VISIBLE)) {
    if (FORMATEA.test(m[1])) continue
    if (DINERO.test(m[1])) marcar(m.index, 'va a una fila que se imprime')
  }
}

if (!fallos.length) {
  console.log(`dinero: ${archivos.length} archivo(s) revisados, ninguna cifra sin formatear`)
  process.exit(0)
}

console.error(`\ndinero: ${fallos.length} cifra(s) de dinero pintadas en crudo.`)
console.error('Los centavos sin dividir se leen multiplicados por cien.')
console.error('Pasalas por usd() de src/lib/dinero.ts, o marca la linea con «dinero-ok».\n')
for (const f of fallos) {
  console.error(`  ${f.ruta}:${f.linea}  (${f.razon})`)
  console.error(`      ${f.texto}`)
}
console.error('')
process.exit(1)
