#!/usr/bin/env node
/* Pedir a una funcion de aviso que mande su muestra.
 *
 * Hay cuatro funciones que mandan correo —`avisar-retiro`,
 * `avisar-creadora`, `avisar-verificacion` y `avisar-purga`— y ninguna forma
 * de ver como queda uno de esos correos sin esperar a que pase de verdad lo
 * que lo provoca. Para un retiro se puede provocar; para «alguien mando su
 * INE» hay que pedirle a una persona que mande su INE.
 *
 * Las que tienen modo muestra aceptan `{"muestra": true}` y mandan un ejemplo
 * con datos inventados a quien administra, sin tocar la base.
 *
 * ---------- EL SECRETO VA POR ARCHIVO, NUNCA POR LA LINEA DE COMANDOS ----------
 *
 * Un secreto escrito como argumento queda en el historial del shell, se ve en
 * `ps` mientras corre, y acaba pegado en cualquier sitio donde se copie el
 * comando. Este script lo lee de un archivo y nunca lo imprime.
 *
 *     echo -n 'el-valor' > .cron-secret     # ya esta en .gitignore
 *     node scripts/muestra-aviso.mjs avisar-verificacion
 *
 * El valor es el mismo CRON_SECRET que hay en Supabase (Edge Functions ->
 * Secrets) y en GitHub (Actions secrets). No es la llave de servicio: lo peor
 * que consigue quien lo tenga es provocar un correo.
 */
import { readFileSync } from 'node:fs'

const BASE = 'https://ggyubhyobobizugeknen.supabase.co/functions/v1/'
const CON_MUESTRA = ['avisar-retiro', 'avisar-verificacion']

const funcion = process.argv[2]
const archivo = process.argv[3] ?? '.cron-secret'

if (!funcion) {
  console.error('Uso: node scripts/muestra-aviso.mjs <funcion> [archivo-del-secreto]')
  console.error(`Con muestra: ${CON_MUESTRA.join(', ')}`)
  process.exit(1)
}

// Si la funcion no tiene modo muestra, mandarle `{"muestra":true}` no falla:
// lo ignora y hace su trabajo de verdad, que puede ser mandar correos reales
// y marcar filas como avisadas. Mejor negarse aqui que explicarlo despues.
if (!CON_MUESTRA.includes(funcion)) {
  console.error(`${funcion} no tiene modo muestra.`)
  console.error(`Lo tienen: ${CON_MUESTRA.join(', ')}`)
  console.error('Llamarla igualmente mandaria correos de verdad.')
  process.exit(1)
}

let secreto
try {
  secreto = readFileSync(archivo, 'utf8').trim()
} catch {
  console.error(`No pude leer el secreto de ${archivo}.`)
  console.error("  echo -n 'el-valor' > .cron-secret")
  process.exit(1)
}
if (!secreto) {
  console.error(`${archivo} esta vacio.`)
  process.exit(1)
}

const r = await fetch(BASE + funcion, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-cron-secret': secreto },
  body: JSON.stringify({ muestra: true }),
})

const texto = await r.text()
// La respuesta no lleva el secreto, pero sí correos de administracion. Se
// imprime tal cual porque quien corre esto es quien administra.
console.log(`HTTP ${r.status}`)
console.log(texto)
process.exit(r.ok && texto.includes('"ok":true') ? 0 : 1)
