#!/usr/bin/env node
/* Elegir, una sola vez y automaticamente, la portada de los clips que ya
 * estaban subidos.
 *
 * ---------- De donde viene esto ----------
 *
 * El 3 de noviembre de 2026 se arreglo una fuga: las 186 portadas de pago se
 * servian a 720 pixeles a cualquiera sin credenciales. La cura fue dejar en el
 * bucket publico una version de 32 pixeles y guardar la original en uno
 * privado. Funciono, pero nos pasamos: a 32 pixeles estirados en una tarjeta
 * de 243, el catalogo entero es una cuadricula de manchas de color. No se
 * distingue un clip de otro. Parece que las imagenes no cargaron.
 *
 * Y hay un segundo problema que el ancho no arregla: la portada de cada clip
 * es el fotograma que toco, no uno elegido. Las creadoras que suban a partir
 * de ahora eligen entre seis cuadros en la pantalla de subir (eso ya esta
 * hecho). Los 186 que ya estaban no eligieron nada.
 *
 * Este script hace esa eleccion por ellas, una vez.
 *
 * ---------- Que mide, y que NO mide ----------
 *
 * Saca N fotogramas repartidos por el video y le pone a cada uno dos numeros:
 *
 *   - PIEL: que fraccion del cuadro es color de piel (regla de Kovac).
 *   - CONTRASTE y BRILLO: para descartar los cuadros casi negros o planos,
 *     que son los que hoy hacen que una tarjeta parezca rota.
 *
 * Elige el cuadro con menos piel de entre los que no esten oscuros ni planos.
 *
 * SE MIDE SUPERFICIE, NO LA ESCENA. Un primer plano cerrado marca poco; un
 * retrato de cara marca mucho; un plano general de una habitacion marca casi
 * nada. Sirve para "esta persona ocupa el cuadro desnuda" y para nada mas.
 * Medido en una muestra de 12 clips el 4 de noviembre de 2026: el margen entre
 * el cuadro mas y el menos cargado del MISMO video es del 25% de media, pero
 * repartido muy desigual —de 74 puntos en un clip a 12 en otro—. O sea: esto
 * cambia la portada de verdad en aproximadamente la mitad del catalogo, y en
 * la otra mitad no hay nada que elegir porque el video es igual de principio a
 * fin.
 *
 * Por eso el ensayo escribe una HOJA DE CONTACTOS: ningun numero juzga el
 * gusto. Se mira la pagina y se decide.
 *
 * ---------- Que escribe, por clip ----------
 *
 *   clip-covers-full/<ruta>   la version nitida (720 px) del cuadro elegido
 *   clip-covers/<ruta>        la version publica (ANCHO px) del MISMO cuadro
 *
 * Las dos en la misma ruta que ya tenia `cover_path`, asi que no hay que tocar
 * la base y el catalogo se arregla solo. Y las dos del mismo fotograma: si se
 * eligiera uno para la publica y se dejara la nitida vieja, quien pague veria
 * una imagen distinta de la que le hizo pagar.
 *
 * ---------- Como se usa ----------
 *
 *   node scripts/portadas-elegir.mjs                 ensaya y escribe la hoja
 *   node scripts/portadas-elegir.mjs --ancho 160     prueba otro ancho
 *   node scripts/portadas-elegir.mjs --solo 12       solo los 12 primeros
 *   node scripts/portadas-elegir.mjs --id a,b,c      solo esos clips
 *   node scripts/portadas-elegir.mjs --aplicar       lo sube de verdad
 *   node scripts/portadas-elegir.mjs --ancho 160 --aplicar --desde-disco
 *                                                    sube lo que ya ensayo
 *
 * El ensayo no toca nada remoto: baja, decide y deja todo en
 * .portadas-elegidas/ junto con hoja.html.
 *
 * Necesita ffmpeg y ffprobe (brew install ffmpeg) y SUPABASE_SERVICE_ROLE_KEY
 * en .env.local.
 *
 * ---------- Lo que este script NO hace ----------
 *
 * No purga. Un clip con `borrado_at` se salta: alguien mando destruirlo, y
 * elegirle una portada nueva seria crear dos copias frescas de eso. Misma
 * regla que en portadas-achicar.mjs, y por la misma razon.
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

/* ---------- Ajustes ---------- */

const BUCKET_VIDEO   = 'clips'
const BUCKET_PUBLICO = 'clip-covers'
const BUCKET_PRIVADO = 'clip-covers-full'
const SALIDA = '.portadas-elegidas'

/** Cuantos fotogramas se miran por video. Diez da margen para elegir sin que
 *  la decodificacion se note: el video se decodifica una sola vez. */
const CUADROS = 10

/** Ancho de la portada publica. La tarjeta mide 243, asi que a 224 se ve
 *  nitida y a 96 se ve como una foto desenfocada a proposito. El ensayo
 *  genera los tres para poder comparar mirando. */
const ANCHO_POR_DEFECTO = 224
const ANCHOS_DE_PRUEBA = [96, 160, 224]

/** Ancho de la copia nitida que se guarda en el bucket privado. */
const ANCHO_NITIDO = 720

/** Un cuadro por debajo de esto esta demasiado oscuro o es demasiado plano
 *  para servir de portada: es justo lo que hoy hace que algunas tarjetas
 *  parezcan rotas. */
const BRILLO_MINIMO = 30
const CONTRASTE_MINIMO = 12

/* ---------- Argumentos ---------- */

const args = process.argv.slice(2)
const APLICAR = args.includes('--aplicar')

/* Subir los JPEG que el ensayo ya dejo en .portadas-elegidas/, sin volver a
 * bajar un solo video. El ensayo completo son ~4 GB de descarga y hora y
 * media, y repetirlo solo para producir los mismos bytes es una ocasion mas
 * de que se caiga la red a mitad: ya costo dos clips. La eleccion es
 * determinista —mismo muestreo, misma puntuacion, mismo cuadro—, asi que lo
 * que hay en disco es exactamente lo que volveria a salir.
 *
 * Exige que exista `nitida.jpg` y el `pub-<ANCHO>.jpg` del ancho pedido. Si
 * falta alguno, ese clip se salta y se cuenta como fallo: no se sube una
 * portada a medias ni se deja la nitida de un cuadro y la publica de otro. */
const DESDE_DISCO = args.includes('--desde-disco')
if (DESDE_DISCO && !APLICAR) {
  salir('--desde-disco solo tiene sentido con --aplicar: sin subir nada no hace nada.')
}

function numero(bandera, pordefecto, min, max) {
  const i = args.indexOf(bandera)
  if (i === -1) return pordefecto
  const n = parseInt(args[i + 1], 10)
  if (!Number.isFinite(n) || n < min || n > max) {
    salir(`${bandera} tiene que ser un numero entre ${min} y ${max}`)
  }
  return n
}

const ANCHO = numero('--ancho', ANCHO_POR_DEFECTO, 16, 480)
const SOLO = numero('--solo', 0, 1, 1000)

/* Clips concretos, por id, separados por coma. Existe para REINTENTAR: bajar
 * 186 videos tarda hora y media y una caida de red deja uno a medias. Sin
 * esto habria que repetir los 186 para arreglar dos. */
function lista_de_ids(bandera) {
  const i = args.indexOf(bandera)
  if (i === -1) return []
  return String(args[i + 1] || '').split(',').map(s => s.trim()).filter(Boolean)
}
const IDS = lista_de_ids('--id')

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
  '  Es la llave que puede TODO: no la pegues en ningun chat ni la subas a git.')

const CABECERAS = { apikey: LLAVE, Authorization: `Bearer ${LLAVE}` }

/* ---------- Herramientas externas ---------- */

function hay(programa) {
  try { execFileSync(programa, ['-version'], { stdio: 'ignore' }); return true }
  catch { return false }
}

if (!hay('ffmpeg') || !hay('ffprobe')) {
  salir('Faltan ffmpeg y/o ffprobe. En macOS: brew install ffmpeg')
}

/* ---------- Supabase por HTTP ---------- */

async function clips() {
  const campos = 'id,title,storage_path,cover_path,borrado_at,visibility'
  const r = await fetch(
    `${URL_BASE}/rest/v1/clips?select=${campos}&cover_path=not.is.null` +
    `&storage_path=not.is.null&order=created_at.asc`,
    { headers: CABECERAS })
  if (!r.ok) salir(`No pude leer los clips: HTTP ${r.status} ${await r.text()}`)
  return r.json()
}

async function urlFirmada(ruta) {
  const r = await fetch(`${URL_BASE}/storage/v1/object/sign/${BUCKET_VIDEO}/${ruta}`, {
    method: 'POST',
    headers: { ...CABECERAS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn: 1800 }),
  })
  if (!r.ok) return null
  const { signedURL } = await r.json()
  return `${URL_BASE}/storage/v1${signedURL}`
}

async function subir(bucket, ruta, bytes) {
  const r = await fetch(`${URL_BASE}/storage/v1/object/${bucket}/${ruta}`, {
    method: 'POST',
    headers: { ...CABECERAS, 'Content-Type': 'image/jpeg', 'x-upsert': 'true',
               'cache-control': 'max-age=3600' },
    body: bytes,
  })
  return r.ok ? null : `HTTP ${r.status} ${await r.text()}`
}

/* ---------- Medir un fotograma ---------- */

/** Regla de Kovac para piel en luz de dia. No distingue una mejilla de un
 *  muslo: mide superficie, no escena. Ver la cabecera del archivo. */
function esPiel(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b)
  return r > 95 && g > 40 && b > 20 && mx - mn > 15 &&
         Math.abs(r - g) > 15 && r > g && r > b
}

/** Recibe un cuadro de 64x64 en RGB crudo y devuelve sus tres numeros. */
function medir(buf, desde) {
  const PIXELES = 64 * 64
  let piel = 0, suma = 0
  const grises = new Uint8Array(PIXELES)
  for (let p = 0; p < PIXELES; p++) {
    const i = desde + p * 3
    const r = buf[i], g = buf[i + 1], b = buf[i + 2]
    if (esPiel(r, g, b)) piel++
    const gris = (r * 299 + g * 587 + b * 114) / 1000
    grises[p] = gris
    suma += gris
  }
  const media = suma / PIXELES
  let varianza = 0
  for (let p = 0; p < PIXELES; p++) varianza += (grises[p] - media) ** 2
  return { piel: piel / PIXELES, brillo: media, contraste: Math.sqrt(varianza / PIXELES) }
}

/* ---------- ffmpeg ---------- */

function duracion(url) {
  const s = execFileSync('ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', url],
    { encoding: 'utf8', timeout: 120000 }).trim()
  const d = parseFloat(s)
  return Number.isFinite(d) && d > 0 ? d : null
}

/** Una sola pasada de decodificacion que produce las dos cosas a la vez: los
 *  cuadros chiquitos en crudo para medir, y los mismos cuadros en JPEG grande
 *  para usarlos. Hacerlo en dos pasadas invitaba a que no coincidieran. */
function extraer(url, dur, carpeta) {
  const fps = `${CUADROS}/${dur}`
  const crudo = execFileSync('ffmpeg', [
    '-v', 'error', '-i', url,
    '-vf', `fps=${fps},scale=64:64`, '-pix_fmt', 'rgb24', '-f', 'rawvideo',
    '-frames:v', String(CUADROS), 'pipe:1',
    '-vf', `fps=${fps},scale=${ANCHO_NITIDO}:-2`, '-q:v', '4',
    '-frames:v', String(CUADROS), join(carpeta, 'c%02d.jpg'),
  ], { maxBuffer: 64 * 1024 * 1024, timeout: 300000 })
  return crudo
}

/** Reescala un JPEG ya extraido. Es local y cuesta milisegundos. */
function reescalar(entrada, salida, ancho, calidad) {
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', entrada,
    '-vf', `scale=${ancho}:-2`, '-q:v', String(calidad), salida],
    { timeout: 60000 })
}

/* ---------- Elegir ---------- */

function elegir(medidas) {
  const mirables = medidas
    .map((m, i) => ({ ...m, i }))
    .filter(m => m.brillo >= BRILLO_MINIMO && m.contraste >= CONTRASTE_MINIMO)

  // Si TODOS son oscuros o planos no se descarta nada: mas vale una portada
  // oscura que ninguna. Pero se anota, porque es sintoma de un video que no
  // va a quedar bien de ninguna manera.
  const entre = mirables.length ? mirables : medidas.map((m, i) => ({ ...m, i }))

  // Menos piel primero; a igualdad, mas contraste, que es lo que hace que una
  // miniatura se distinga de la de al lado.
  entre.sort((a, b) => a.piel - b.piel || b.contraste - a.contraste)
  return { elegido: entre[0], descartados: medidas.length - mirables.length }
}

/* ---------- Hoja de contactos ---------- */

function hoja(filas) {
  const tarjetas = filas.map(f => `
    <figure>
      ${ANCHOS_DE_PRUEBA.map(a =>
        `<img class="a${a}" src="${f.id}/pub-${a}.jpg" alt="" width="243" height="324">`).join('')}
      <figcaption>
        <b>${f.title.replace(/</g, '&lt;')}</b>
        <span>piel ${(f.piel * 100).toFixed(0)}% &middot; cuadro ${f.i + 1}/${CUADROS}
        &middot; antes ${(f.pielAntes * 100).toFixed(0)}%</span>
      </figcaption>
    </figure>`).join('')

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>Portadas elegidas</title>
<style>
  :root { color-scheme: dark; --fondo:#08080A; --tinta:#F2F0F3; --tenue:#9C979F; }
  body { margin:0; background:var(--fondo); color:var(--tinta);
         font:400 14px/1.6 system-ui, sans-serif; padding:24px 16px 80px }
  h1 { font:700 11px/1 system-ui; letter-spacing:2.4px; text-transform:uppercase;
       color:#FF2BD1; margin:0 0 6px }
  p { color:var(--tenue); max-width:60ch; margin:0 0 20px }
  .mando { position:sticky; top:0; z-index:9; background:var(--fondo);
           padding:14px 0; border-bottom:1px solid rgba(255,255,255,.12);
           margin-bottom:22px; display:flex; gap:10px; align-items:center;
           flex-wrap:wrap }
  button { background:transparent; color:var(--tinta); cursor:pointer;
           border:1px solid rgba(255,255,255,.25); padding:9px 15px;
           font:700 10px/1 system-ui; letter-spacing:1.4px; text-transform:uppercase }
  button[aria-pressed=true] { background:#FF2BD1; color:#08080A; border-color:#FF2BD1 }
  .rejilla { display:grid; gap:18px;
             grid-template-columns:repeat(auto-fill, minmax(243px, 1fr)) }
  figure { margin:0 }
  img { width:100%; height:auto; aspect-ratio:3/4; object-fit:cover;
        display:none; background:#111 }
  figcaption { padding-top:7px; display:flex; flex-direction:column; gap:2px }
  figcaption b { font-weight:600 }
  figcaption span { color:var(--tenue); font:400 11px/1.5 ui-monospace, monospace }
</style></head><body>
<h1>Portadas elegidas &middot; ensayo</h1>
<p>Esto es lo que se subiria. Nada se ha tocado todavia. Cambia el ancho con
los botones: la tarjeta real del catalogo mide 243 pixeles, asi que lo que ves
aqui es el tamaño de verdad. &laquo;piel&raquo; es que fraccion del cuadro es
color de piel; &laquo;antes&raquo; es la del fotograma que tenia hasta ahora.</p>
<div class="mando">
  <span style="color:var(--tenue);font:400 11px/1 ui-monospace,monospace">ANCHO REAL DEL ARCHIVO</span>
  ${ANCHOS_DE_PRUEBA.map((a, n) =>
    `<button type="button" data-a="${a}" aria-pressed="${n === ANCHOS_DE_PRUEBA.length - 1}">${a} px</button>`).join('')}
  <span id="cuenta" style="margin-left:auto;color:var(--tenue);font:400 11px/1 ui-monospace,monospace">${filas.length} clips</span>
</div>
<div class="rejilla">${tarjetas}</div>
<script>
  const botones = [...document.querySelectorAll('[data-a]')]
  function pon(a) {
    for (const b of botones) b.setAttribute('aria-pressed', String(+b.dataset.a === a))
    for (const img of document.images) img.style.display = img.classList.contains('a' + a) ? 'block' : 'none'
  }
  for (const b of botones) b.addEventListener('click', () => pon(+b.dataset.a))
  pon(${ANCHOS_DE_PRUEBA[ANCHOS_DE_PRUEBA.length - 1]})
</script>
</body></html>`
}

/* ---------- Principal ---------- */

const usd = n => n.toFixed(0)

async function main() {
  console.log(`\n  Portadas: elegir fotograma automaticamente`)
  console.log(`  ${APLICAR ? 'APLICANDO (escribe de verdad)' : 'ensayo (no toca nada remoto)'}`)
  console.log(`  ancho publico: ${ANCHO} px   cuadros por video: ${CUADROS}\n`)

  let todos = await clips()
  const vivos = todos.filter(c => !c.borrado_at)
  const saltados = todos.length - vivos.length
  let lista = SOLO ? vivos.slice(0, SOLO) : vivos
  if (IDS.length) {
    lista = vivos.filter(c => IDS.includes(c.id))
    const perdidos = IDS.filter(id => !lista.some(c => c.id === id))
    if (perdidos.length) {
      console.log(`  ${perdidos.length} id(s) que no estan vivos con portada: ${perdidos.join(', ')}\n`)
    }
    if (!lista.length) salir('Ninguno de esos ids existe, o todos estan borrados.')
  }

  if (saltados) {
    console.log(`  ${saltados} clip(s) con borrado_at: se saltan, esos se purgan.\n`)
  }

  mkdirSync(SALIDA, { recursive: true })
  const filas = []
  const fallos = []
  let n = 0
  let subidos = 0

  for (const c of lista) {
    n++
    const etiqueta = `[${String(n).padStart(3)}/${lista.length}] ${c.title.slice(0, 28).padEnd(28)}`
    const carpeta = join(SALIDA, c.id)
    if (!DESDE_DISCO) {
      rmSync(carpeta, { recursive: true, force: true })
      mkdirSync(carpeta, { recursive: true })
    }

    try {
      // ---- Subir lo que ya se eligio, sin tocar la red para bajar nada ----
      if (DESDE_DISCO) {
        const nitida = join(carpeta, 'nitida.jpg')
        const chica = join(carpeta, `pub-${ANCHO}.jpg`)
        const falta = [nitida, chica].filter(f => !existsSync(f))
        if (falta.length) {
          fallos.push(`${c.title}: falta en disco ${falta.join(' y ')}`)
          console.log(`${etiqueta} sin ensayo en disco`)
          continue
        }
        const e1 = await subir(BUCKET_PRIVADO, c.cover_path, readFileSync(nitida))
        if (e1) { fallos.push(`${c.title}: nitida: ${e1}`); console.log(`${etiqueta} FALLO nitida`); continue }
        const e2 = await subir(BUCKET_PUBLICO, c.cover_path, readFileSync(chica))
        if (e2) { fallos.push(`${c.title}: publica: ${e2}`); console.log(`${etiqueta} FALLO publica`); continue }
        subidos++
        console.log(`${etiqueta} subida`)
        continue
      }

      const url = await urlFirmada(c.storage_path)
      if (!url) { fallos.push(`${c.title}: no pude firmar el video`); console.log(`${etiqueta} sin url`); continue }

      const dur = duracion(url)
      if (!dur) { fallos.push(`${c.title}: ffprobe no leyo la duracion`); console.log(`${etiqueta} sin duracion`); continue }

      const crudo = extraer(url, dur, carpeta)
      const porCuadro = 64 * 64 * 3
      const cuantos = Math.floor(crudo.length / porCuadro)
      if (!cuantos) { fallos.push(`${c.title}: ffmpeg no saco cuadros`); console.log(`${etiqueta} sin cuadros`); continue }

      const medidas = []
      for (let k = 0; k < cuantos; k++) medidas.push(medir(crudo, k * porCuadro))

      const { elegido, descartados } = elegir(medidas)
      const origen = join(carpeta, `c${String(elegido.i + 1).padStart(2, '0')}.jpg`)
      if (!existsSync(origen)) { fallos.push(`${c.title}: falta ${origen}`); console.log(`${etiqueta} falta jpg`); continue }

      // La nitida y la publica, del MISMO cuadro.
      const nitida = join(carpeta, 'nitida.jpg')
      reescalar(origen, nitida, ANCHO_NITIDO, 4)
      for (const a of new Set([...ANCHOS_DE_PRUEBA, ANCHO])) {
        reescalar(origen, join(carpeta, `pub-${a}.jpg`), a, 6)
      }

      filas.push({
        id: c.id, title: c.title, i: elegido.i,
        piel: elegido.piel, pielAntes: medidas[0].piel,
        contraste: elegido.contraste, descartados,
      })

      const marca = descartados ? ` (${descartados} oscuros)` : ''
      console.log(`${etiqueta} cuadro ${String(elegido.i + 1).padStart(2)}/${cuantos}` +
                  `  piel ${usd(elegido.piel * 100).padStart(3)}%` +
                  `  contraste ${usd(elegido.contraste).padStart(3)}${marca}`)

      if (APLICAR) {
        const chica = join(carpeta, `pub-${ANCHO}.jpg`)
        const e1 = await subir(BUCKET_PRIVADO, c.cover_path, readFileSync(nitida))
        if (e1) fallos.push(`${c.title}: nitida: ${e1}`)
        const e2 = await subir(BUCKET_PUBLICO, c.cover_path, readFileSync(chica))
        if (e2) fallos.push(`${c.title}: publica: ${e2}`)
      }
    } catch (e) {
      fallos.push(`${c.title}: ${e.message.split('\n')[0]}`)
      console.log(`${etiqueta} ERROR`)
    }
  }

  if (!APLICAR && filas.length) {
    // Un reintento por --id escribe su propia hoja: la grande es el resultado
    // de la pasada completa y sobreescribirla con dos filas la destruiria.
    const nombre = IDS.length ? 'hoja-reintento.html' : 'hoja.html'
    writeFileSync(join(SALIDA, nombre), hoja(filas))
    console.log(`\n  Hoja de contactos: ${join(process.cwd(), SALIDA, nombre)}`)
  }

  if (DESDE_DISCO) {
    console.log(`\n  ${subidos} de ${lista.length} portadas subidas a ${ANCHO} px` +
                ` (publica) y ${ANCHO_NITIDO} px (privada)`)
  } else {
    const bajo = filas.filter(f => f.piel < 0.25).length
    const alto = filas.filter(f => f.piel > 0.55).length
    console.log(`\n  ${filas.length} clips resueltos` +
                `   menos del 25% de piel: ${bajo}   mas del 55%: ${alto}`)
  }
  if (fallos.length) {
    console.log(`\n  ${fallos.length} fallo(s):`)
    for (const f of fallos.slice(0, 20)) console.log(`    - ${f}`)
  }
  console.log(APLICAR ? '\n  Hecho.\n' : '\n  Nada remoto se ha tocado. Mira la hoja y luego --aplicar.\n')
}

main().catch(e => salir(e.stack || e.message))
