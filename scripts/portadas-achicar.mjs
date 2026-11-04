#!/usr/bin/env node
/* Las portadas de pago se regalaban enteras.
 *
 * El bucket `clip-covers` es PUBLICO. Medido el 3 de noviembre de 2026: las
 * 186 portadas de clips de pago se bajan con un curl sin credenciales, a 720
 * pixeles de ancho y unos 87 KB cada una. Y 183 de esos clips tienen ademas
 * una tira de 6 cuadros mas, sacados del propio video, que la tarjeta anima al
 * pasar el raton. Son unos 1.284 fotogramas de contenido de pago, gratis.
 *
 * Peor: la llave anonima viaja en el JavaScript del sitio, asi que una sola
 * llamada a la API devuelve la ruta de todas. No hay que adivinar nada.
 *
 * ---------- Por que no basta con difuminar ----------
 *
 * Un `filter: blur()` en CSS no protege: la imagen buena ya se bajo al
 * navegador y se recupera quitando el filtro desde el inspector. Las
 * transformaciones de imagen de Supabase tampoco, por si solas: en un bucket
 * publico, pedir la version chica no impide pedir la original.
 *
 * Lo unico que protege es no mandarla. Este script hace eso.
 *
 * ---------- Que hace, por clip ----------
 *
 *   1. Respalda la portada original en disco, aqui al lado.
 *   2. La sube al bucket PRIVADO `clip-covers-full`, en la misma ruta.
 *   3. Pide al servidor una version de ANCHO pixeles de ancho.
 *   4. Sobreescribe la publica con esa. Misma ruta, asi que no hay que tocar
 *      `cover_path` y el catalogo se arregla solo.
 *   5. Si el clip no es gratis, borra su tira y pone `preview_path` en null.
 *      La tarjeta ya sabe no animar cuando no hay tira.
 *
 * El detalle que desaparece NO se recupera: no esta en el archivo. El
 * desenfoque que se le ponga encima en CSS es maquillaje sobre un dato que ya
 * no existe, que es el orden correcto de las dos cosas.
 *
 * ---------- Como se usa ----------
 *
 *   node scripts/portadas-achicar.mjs              ensaya y no escribe nada
 *   node scripts/portadas-achicar.mjs --aplicar    lo hace de verdad
 *   node scripts/portadas-achicar.mjs --ancho 24   cambia el ancho publico
 *
 * Necesita SUPABASE_SERVICE_ROLE_KEY en .env.local: sobreescribir objetos de
 * almacenamiento y editar `clips` no se puede con la llave anonima, y esa es
 * justamente la gracia.
 *
 * Es repetible: si ya se migro una portada —la publica es chica y la privada
 * existe— la salta. Se puede cortar a la mitad y volver a correr.
 *
 * ---------- Lo que este script NO puede deshacer ----------
 *
 * Lo que ya se bajo, bajado esta. Esto cierra la llave; no recoge el agua.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

/* ---------- Ajustes ---------- */

const BUCKET_PUBLICO = 'clip-covers'
const BUCKET_PRIVADO = 'clip-covers-full'
const RESPALDO = '.portadas-originales'

/** Ancho en pixeles de la portada publica. La tarjeta mide 243 de ancho, asi
 *  que a 32 se estira unas 7 veces: queda la mancha de color y nada mas. */
const ANCHO_POR_DEFECTO = 32
const CALIDAD = 35

/** Lee el ancho real de un JPEG de su cabecera SOF.
 *
 *  Esto empezo siendo un umbral de peso —"si pesa menos de 12 KB ya esta
 *  migrada"— y era un error: el peso de un JPEG depende de cuanto detalle
 *  tiene, no de su tamaño. Un fotograma oscuro de 720 px pesaba 5.9 KB y el
 *  umbral lo declaro migrado dos veces seguidas, mientras seguia sirviendo la
 *  portada entera. El ancho es lo que decide cuanto se ve, asi que el ancho es
 *  lo que hay que mirar.
 *
 *  Recorre los segmentos de la cabecera buscando cualquier SOF (0xC0-0xCF,
 *  saltando 0xC4/0xC8/0xCC que no lo son); el ancho son los dos bytes en el
 *  desplazamiento 7 del segmento. Devuelve null si no es un JPEG legible. */
function anchoJpeg(b) {
  if (!b || b.length < 4 || b[0] !== 0xFF || b[1] !== 0xD8) return null
  for (let i = 2; i < b.length - 9;) {
    if (b[i] !== 0xFF) return null
    const marca = b[i + 1]
    if (marca >= 0xC0 && marca <= 0xCF && marca !== 0xC4 && marca !== 0xC8 && marca !== 0xCC) {
      return b.readUInt16BE(i + 7)
    }
    i += 2 + b.readUInt16BE(i + 2)
  }
  return null
}

/* ---------- Argumentos ---------- */

const args = process.argv.slice(2)
const APLICAR = args.includes('--aplicar')
const ANCHO = (() => {
  const i = args.indexOf('--ancho')
  if (i === -1) return ANCHO_POR_DEFECTO
  const n = parseInt(args[i + 1], 10)
  if (!Number.isFinite(n) || n < 8 || n > 200) {
    salir('--ancho tiene que ser un numero entre 8 y 200')
  }
  return n
})()

/* ---------- Credenciales ---------- */

function salir(mensaje) {
  console.error('\n  ' + mensaje + '\n')
  process.exit(1)
}

function leerEntorno() {
  let texto
  try { texto = readFileSync('.env.local', 'utf8') }
  catch { salir('No encuentro .env.local. Corre esto desde la raiz del proyecto.') }
  const env = {}
  for (const linea of texto.split('\n')) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
  return env
}

const env = leerEntorno()
const URL_BASE = env.VITE_SUPABASE_URL
const LLAVE = env.SUPABASE_SERVICE_ROLE_KEY

if (!URL_BASE) salir('Falta VITE_SUPABASE_URL en .env.local')
if (!LLAVE) salir(
  'Falta SUPABASE_SERVICE_ROLE_KEY en .env.local.\n' +
  '  Esta en el panel de Supabase, en Project Settings > API, como "service_role".\n' +
  '  Es la llave que puede TODO: no la pegues en ningun chat ni la subas a git\n' +
  '  (.env.local ya esta en .gitignore). Agregala con el editor y vuelve a correr.')

const CABECERAS = { apikey: LLAVE, Authorization: `Bearer ${LLAVE}` }

/* ---------- Supabase por HTTP, sin dependencias ---------- */

async function clipsConPortada() {
  const campos = 'id,title,visibility,cover_path,preview_path,borrado_at'
  const r = await fetch(
    `${URL_BASE}/rest/v1/clips?select=${campos}&cover_path=not.is.null&order=created_at.asc`,
    { headers: CABECERAS })
  if (!r.ok) salir(`No pude leer los clips: HTTP ${r.status} ${await r.text()}`)
  return r.json()
}

async function bajar(url) {
  const r = await fetch(url, { headers: CABECERAS })
  if (!r.ok) return null
  return Buffer.from(await r.arrayBuffer())
}

/* Leer y escribir el mismo objeto publico van por rutas distintas: `/public/`
 * es la de lectura sin credenciales, y la de escribir no la lleva. */
const urlPublica  = ruta => `${URL_BASE}/storage/v1/object/public/${BUCKET_PUBLICO}/${ruta}`
const urlEscribir = ruta => `${URL_BASE}/storage/v1/object/${BUCKET_PUBLICO}/${ruta}`
const urlPrivada  = ruta => `${URL_BASE}/storage/v1/object/${BUCKET_PRIVADO}/${ruta}`
const urlAchicada = ruta =>
  `${URL_BASE}/storage/v1/render/image/public/${BUCKET_PUBLICO}/${ruta}` +
  `?width=${ANCHO}&quality=${CALIDAD}`

async function subir(url, bytes, tipo = 'image/jpeg') {
  const r = await fetch(url, {
    method: 'POST',
    headers: { ...CABECERAS, 'Content-Type': tipo, 'x-upsert': 'true',
               'cache-control': 'max-age=3600' },
    body: bytes,
  })
  return r.ok ? null : `HTTP ${r.status} ${await r.text()}`
}

async function borrar(bucket, ruta) {
  const r = await fetch(`${URL_BASE}/storage/v1/object/${bucket}/${ruta}`,
    { method: 'DELETE', headers: CABECERAS })
  return r.ok ? null : `HTTP ${r.status}`
}

async function aseguraBucketPrivado() {
  const r = await fetch(`${URL_BASE}/storage/v1/bucket/${BUCKET_PRIVADO}`, { headers: CABECERAS })
  if (r.ok) {
    const b = await r.json()
    if (b.public) salir(
      `El bucket ${BUCKET_PRIVADO} existe pero es PUBLICO. Ponlo privado antes\n` +
      '  de seguir, o este script moveria las originales de un sitio publico a otro.')
    return 'ya existia'
  }
  if (!APLICAR) return 'se crearia'
  const c = await fetch(`${URL_BASE}/storage/v1/bucket`, {
    method: 'POST',
    headers: { ...CABECERAS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: BUCKET_PRIVADO, id: BUCKET_PRIVADO, public: false }),
  })
  if (!c.ok) salir(`No pude crear ${BUCKET_PRIVADO}: HTTP ${c.status} ${await c.text()}`)
  return 'creado'
}

async function olvidaTira(id) {
  const r = await fetch(`${URL_BASE}/rest/v1/clips?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...CABECERAS, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ preview_path: null }),
  })
  return r.ok ? null : `HTTP ${r.status} ${await r.text()}`
}

/* ---------- El trabajo ---------- */

const kb = n => (n / 1024).toFixed(1) + ' KB'

console.log(`
  Portadas publicas -> ${ANCHO} px de ancho
  ${APLICAR ? 'APLICANDO: esto escribe de verdad.' : 'ENSAYO: no se escribe nada. Agrega --aplicar cuando quieras hacerlo.'}
`)

const bucket = await aseguraBucketPrivado()
console.log(`  bucket privado ${BUCKET_PRIVADO}: ${bucket}`)

const clips = await clipsConPortada()
console.log(`  clips con portada: ${clips.length}\n`)

if (APLICAR) mkdirSync(RESPALDO, { recursive: true })

const cuenta = { migradas: 0, saltadas: 0, tiras: 0, fallos: 0, borrados: 0 }
let antes = 0, despues = 0

/** Quita la tira de 6 cuadros de un clip de pago: borra el archivo del bucket
 *  publico y pone `preview_path` en null. Devuelve el texto para el renglon.
 *
 *  Vive aparte porque hace falta en dos sitios —el clip que se achica y el
 *  que ya estaba achicado— y la primera version solo la llamaba en el
 *  primero. */
async function quitaTira(c, gratis) {
  if (gratis || !c.preview_path) return ''
  if (!APLICAR) { cuenta.tiras++; return '  + borra la tira' }
  await borrar(BUCKET_PUBLICO, c.preview_path)
  const fallo = await olvidaTira(c.id)
  if (fallo) return `  (la tira quedo a medias: ${fallo})`
  cuenta.tiras++
  return '  + tira borrada'
}

for (const c of clips) {
  const nombre = (c.title || c.id).slice(0, 28).padEnd(28)
  const gratis = c.visibility === 'gratis'

  // Un clip borrado no se achica: se purga.
  //
  // Esto empezo siendo un descuadre tonto —187 clips con portada en la base,
  // 186 visibles al publico— y resulto ser un clip que un admin borro y que
  // nadie purgo nunca. RLS lo esconde bien del catalogo, pero su portada
  // seguia descargandose sin credenciales dos meses despues.
  //
  // La razon de saltarlo no es que sobre trabajo: es que este script RESPALDA
  // la portada en disco y SUBE una copia al bucket privado antes de achicar.
  // Hacer eso con contenido borrado seria crear dos copias nuevas de algo que
  // alguien mando destruir —exactamente lo contrario de purgar—. Lo correcto
  // es el boton «Purgar los N» del panel, que borra el video y la portada de
  // los dos buckets y luego llama a admin_marcar_purgado.
  if (c.borrado_at) {
    console.log(`  ! ${nombre} BORRADO el ${c.borrado_at.slice(0, 10)} — purgalo desde el panel`)
    cuenta.borrados++
    continue
  }

  // Un clip gratis no tiene nada que proteger: su portada se queda nitida y
  // su tira tambien. Hoy no hay ninguno —los 186 son de pago—, pero la regla
  // va escrita aqui para que el dia que lo haya no haya que acordarse.
  if (gratis) {
    console.log(`  · ${nombre} gratis, se queda como esta`)
    cuenta.saltadas++
    continue
  }

  const original = await bajar(urlPublica(c.cover_path))
  if (!original) {
    console.log(`  ✕ ${nombre} no pude bajar la portada`)
    cuenta.fallos++
    continue
  }

  // Ya migrada = ya es estrecha. Si no puedo leer el ancho (no es un JPEG, o
  // la cabecera viene rara) la trato como grande: achicar de mas es
  // recuperable —la original esta respaldada en dos sitios—, dejarla pasar no.
  const anchoActual = anchoJpeg(original)
  if (anchoActual !== null && anchoActual <= ANCHO) {
    // Achicar la portada y quitar la tira son dos cosas distintas, y la
    // primera version las ato a la misma condicion: este `continue` se
    // saltaba tambien el borrado de la tira. Resultado real tras la primera
    // pasada: un clip con la portada de 32 px y sus seis fotogramas de 59 KB
    // todavia publicos. Por eso la tira se quita aqui tambien.
    const nota = await quitaTira(c, gratis)
    console.log(`  · ${nombre} ya estaba achicada (${anchoActual} px, ${kb(original.length)})${nota}`)
    cuenta.saltadas++
    continue
  }

  const chica = await bajar(urlAchicada(c.cover_path))
  if (!chica) {
    console.log(`  ✕ ${nombre} el servidor no me dio la version chica`)
    cuenta.fallos++
    continue
  }

  antes += original.length
  despues += chica.length

  if (!APLICAR) {
    console.log(`  → ${nombre} ${kb(original.length)} → ${kb(chica.length)}` +
                (!gratis && c.preview_path ? '  + borra la tira' : ''))
    cuenta.migradas++
    if (!gratis && c.preview_path) cuenta.tiras++
    continue
  }

  // 1. Respaldo en disco. Antes que nada: si algo sale mal mas abajo, la
  //    original sigue existiendo en esta maquina.
  const copia = join(RESPALDO, c.cover_path.replace(/\//g, '_'))
  if (!existsSync(copia)) writeFileSync(copia, original)

  // 2. Al bucket privado, MISMA ruta. Asi `cover_path` sirve para las dos y
  //    no hay que agregar ninguna columna.
  const falloPrivado = await subir(urlPrivada(c.cover_path), original)
  if (falloPrivado) {
    console.log(`  ✕ ${nombre} no pude guardar la original en privado: ${falloPrivado}`)
    cuenta.fallos++
    continue
  }

  // 3. Se relee lo guardado antes de pisar la publica. Sin esta comprobacion,
  //    una subida que fallara en silencio borraria la portada para siempre.
  const verifica = await bajar(urlPrivada(c.cover_path))
  if (!verifica || verifica.length !== original.length) {
    console.log(`  ✕ ${nombre} la copia privada no coincide; no toco la publica`)
    cuenta.fallos++
    continue
  }

  // 4. Ahora si: la publica pasa a ser la chica.
  const falloPublico = await subir(urlEscribir(c.cover_path), chica)
  if (falloPublico) {
    console.log(`  ✕ ${nombre} no pude sobreescribir la publica: ${falloPublico}`)
    cuenta.fallos++
    continue
  }

  // 5. La tira solo se queda en los gratis, donde si vende en vez de regalar.
  const nota = await quitaTira(c, gratis)

  console.log(`  ✓ ${nombre} ${kb(original.length)} → ${kb(chica.length)}${nota}`)
  cuenta.migradas++
}

console.log(`
  ${APLICAR ? 'Hecho' : 'Ensayo terminado'}
  portadas achicadas  ${cuenta.migradas}
  ya estaban          ${cuenta.saltadas}
  tiras retiradas     ${cuenta.tiras}
  fallos              ${cuenta.fallos}${cuenta.borrados ? `
  borrados sin purgar ${cuenta.borrados}  <- no los toco: purgalos desde el panel` : ''}
  peso publico        ${kb(antes)} → ${kb(despues)}${antes ? `  (${(100 - despues / antes * 100).toFixed(1)}% menos)` : ''}
${APLICAR ? `
  Las originales quedaron en ${BUCKET_PRIVADO} (privado) y respaldadas en
  ${RESPALDO}/ en esta maquina.

  La red de distribucion puede seguir sirviendo la version vieja hasta una
  hora. Y lo que alguien ya haya bajado, bajado esta: esto cierra la llave.
` : `
  No se escribio nada. Para hacerlo:  node scripts/portadas-achicar.mjs --aplicar
`}`)
