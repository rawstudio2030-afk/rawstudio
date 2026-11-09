/* Saca un cuadro del video para usarlo de portada.
 *
 * Se hace en el navegador, con un <video> y un <canvas>, y no en el servidor:
 * el archivo ya esta en la maquina de quien sube, asi que extraer el cuadro
 * aqui no cuesta ni una subida ni un servidor con ffmpeg. Ademas ocurre antes
 * de mandar nada, asi que la portada viaja junto con el video.
 *
 * Si falla —hay formatos que el navegador no sabe decodificar, MOV entre
 * ellos segun el equipo— se devuelve null y arriba se cae al patron generado.
 * Una portada fea es mejor que una subida rota.
 */

/** Del 10% del video, no del primer cuadro: los videos suelen empezar en
 *  negro o con un fundido, y esa portada no dice nada de lo que hay dentro. */
const FRACCION = 0.1
const SEGUNDO_MINIMO = 0.5
const ANCHO_MAXIMO = 720

export async function miniaturaDeVideo(archivo: File): Promise<File | null> {
  const url = URL.createObjectURL(archivo)
  try {
    return await miniaturaDeFuente(url)
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Misma extraccion pero desde una URL ya publicada. Sirve para los clips que
 *  se subieron antes de que esto existiera y quedaron sin portada.
 *
 *  Depende de que el servidor mande cabeceras CORS: sin ellas el canvas queda
 *  contaminado y toBlob lanza. Se captura y se devuelve null, que arriba se
 *  traduce en un mensaje claro en vez de un fallo silencioso. */
export async function miniaturaDeUrl(url: string): Promise<File | null> {
  return miniaturaDeFuente(url)
}

async function miniaturaDeFuente(url: string): Promise<File | null> {
  {
    return await new Promise<File | null>((listo) => {
      const v = document.createElement('video')
      v.preload = 'metadata'
      v.muted = true
      // Sin esto, Safari en iOS abre el reproductor a pantalla completa en
      // lugar de decodificar en silencio.
      v.playsInline = true
      v.crossOrigin = 'anonymous'

      let resuelto = false
      const terminar = (r: File | null) => {
        if (resuelto) return
        resuelto = true
        v.removeAttribute('src')
        v.load()
        listo(r)
      }

      // Si el navegador no puede con el formato, no dispara ningun evento
      // util: se corta a los 12 segundos en vez de dejar la subida colgada.
      const reloj = setTimeout(() => terminar(null), 12000)

      v.onerror = () => { clearTimeout(reloj); terminar(null) }

      v.onloadedmetadata = () => {
        const d = v.duration
        if (!isFinite(d) || d <= 0) { clearTimeout(reloj); return terminar(null) }
        v.currentTime = Math.min(Math.max(d * FRACCION, SEGUNDO_MINIMO), d - 0.05)
      }

      v.onseeked = () => {
        clearTimeout(reloj)
        try {
          const escala = Math.min(1, ANCHO_MAXIMO / (v.videoWidth || ANCHO_MAXIMO))
          const c = document.createElement('canvas')
          c.width = Math.round((v.videoWidth || ANCHO_MAXIMO) * escala)
          c.height = Math.round((v.videoHeight || ANCHO_MAXIMO) * escala)
          const ctx = c.getContext('2d')
          if (!ctx || !c.width || !c.height) return terminar(null)
          ctx.drawImage(v, 0, 0, c.width, c.height)
          c.toBlob(
            b => terminar(b
              ? new File([b], 'portada.jpg', { type: 'image/jpeg' })
              : null),
            'image/jpeg', 0.82,
          )
        } catch {
          // Un canvas contaminado tira aqui. No deberia pasar con un archivo
          // local, pero si pasa no puede tumbar la subida.
          terminar(null)
        }
      }

      v.src = url
    })
  }
}

/* ---------- Tira de fotogramas para la vista previa ---------- */

/** Cuantos cuadros lleva la tira y cuanto dura el recorrido al pasar el mouse.
 *  Seis a medio segundo son tres segundos, que es lo que se pidio. */
export const CUADROS = 6
export const MS_POR_CUADRO = 500

const ANCHO_TIRA = 360   // cada cuadro; la tarjeta es 3/4
const ALTO_TIRA = 480

/** Saca varios cuadros repartidos por el video y los apila en UNA imagen.
 *
 *  Se hace asi y no reproduciendo el video porque los clips viven en un bucket
 *  privado: para reproducir uno haria falta una URL firmada, que solo se
 *  entrega a quien tiene acceso. Previsualizar el video de verdad seria
 *  regalar justo lo que se cobra.
 *
 *  Seis fotogramas insinuan el movimiento y no son el contenido. Van en una
 *  sola imagen y no en seis para que la tarjeta haga UNA peticion: con seis,
 *  una cuadricula de veinte clips dispararia ciento veinte.
 *
 *  Se saltan el principio y el final: los videos suelen abrir en negro y
 *  cerrar con un fundido, y ninguno de los dos dice nada.
 */
export async function tiraDeVideo(archivo: File): Promise<File | null> {
  const url = URL.createObjectURL(archivo)
  try { return await tiraDeFuente(url) } finally { URL.revokeObjectURL(url) }
}

/** La misma tira, desde una URL ya publicada. Para los clips que se subieron
 *  antes de que esto existiera. */
export async function tiraDeUrl(url: string): Promise<File | null> {
  return tiraDeFuente(url)
}

async function tiraDeFuente(url: string): Promise<File | null> {
  const v = document.createElement('video')
  v.preload = 'auto'; v.muted = true; v.playsInline = true

  const listo = <T,>(ev: string, ms: number) => new Promise<T | null>(res => {
    const reloj = setTimeout(() => res(null), ms)
    v.addEventListener(ev, () => { clearTimeout(reloj); res(null as T) }, { once: true })
    v.addEventListener('error', () => { clearTimeout(reloj); res(null) }, { once: true })
  })

  try {
    v.src = url
    await listo('loadedmetadata', 12000)
    const d = v.duration
    if (!isFinite(d) || d <= 0) return null

    const lienzo = document.createElement('canvas')
    lienzo.width = ANCHO_TIRA
    lienzo.height = ALTO_TIRA * CUADROS
    const ctx = lienzo.getContext('2d')
    if (!ctx) return null

    for (let i = 0; i < CUADROS; i++) {
      // De 10% a 85%: ni el arranque ni el cierre.
      const t = d * (0.10 + (0.75 * i) / (CUADROS - 1))
      v.currentTime = Math.min(Math.max(t, 0.1), d - 0.05)
      await listo('seeked', 8000)

      // Recorte centrado a 3/4, que es la proporcion de la tarjeta. Sin esto
      // un video horizontal saldria con franjas o deformado.
      const vw = v.videoWidth || ANCHO_TIRA
      const vh = v.videoHeight || ALTO_TIRA
      const escala = Math.max(ANCHO_TIRA / vw, ALTO_TIRA / vh)
      const aw = vw * escala, ah = vh * escala
      ctx.drawImage(v, (ANCHO_TIRA - aw) / 2, ALTO_TIRA * i + (ALTO_TIRA - ah) / 2, aw, ah)
    }

    return await new Promise<File | null>(res => {
      lienzo.toBlob(
        b => res(b ? new File([b], 'tira.jpg', { type: 'image/jpeg' }) : null),
        'image/jpeg', 0.72,
      )
    })
  } catch {
    return null
  } finally {
    v.removeAttribute('src')
    v.load()
  }
}

/* ---------- Las dos copias de la portada ---------- */

/** Ancho de la copia PUBLICA: lo que ve quien aun no ha pagado.
 *
 *  Antes del 3 de noviembre de 2026 solo habia una copia, de 720 px, en el
 *  bucket publico: el catalogo entero se podia bajar sin pagar ni entrar. Desde
 *  entonces salen dos de la misma imagen —la chica para el mundo y la nitida para
 *  el bucket privado, en la misma ruta— y por eso viven juntas aqui: son el mismo
 *  cuadro a dos tamaños, no dos decisiones distintas.
 *
 *  La chica salia a 32 px con calidad 0.4. La tarjeta del catalogo mide ~243 px,
 *  asi que se estiraba unas 7 veces y quedaba la mancha de color y la silueta: se
 *  veia ROTA, no elegida. Ahora sale a 240 px (el ancho al que se pinta) con una
 *  calidad cercana a la de la nitida. Sigue siendo una miniatura: la nitida, de
 *  hasta `ANCHO_MAXIMO` (720), no llega al bucket publico. */
export const ANCHO_PUBLICO = 240
const CALIDAD_PUBLICA = 0.82

/** Cuantos cuadros se le ofrecen a la creadora para que elija portada. */
export const CUADROS_A_ELEGIR = 6

/** Reduce una imagen a `ancho` pixeles de ancho, conservando la proporcion.
 *
 *  Se hace con un canvas y no pidiendole la transformacion al servidor porque
 *  la transformacion del servidor trabaja sobre un objeto YA SUBIDO: para
 *  usarla habria que publicar primero la version grande, que es exactamente
 *  lo que no se quiere. Aqui la grande nunca llega al bucket publico. */
export async function achicar(imagen: File, ancho = ANCHO_PUBLICO): Promise<File | null> {
  try {
    const mapa = await createImageBitmap(imagen)
    const alto = Math.max(1, Math.round((mapa.height / mapa.width) * ancho))
    const c = document.createElement('canvas')
    c.width = ancho
    c.height = alto
    const ctx = c.getContext('2d')
    if (!ctx) { mapa.close(); return null }
    ctx.drawImage(mapa, 0, 0, ancho, alto)
    mapa.close()
    return await new Promise<File | null>(res => {
      c.toBlob(
        b => res(b ? new File([b], 'portada-chica.jpg', { type: 'image/jpeg' }) : null),
        'image/jpeg', CALIDAD_PUBLICA,
      )
    })
  } catch {
    // Un formato que createImageBitmap no sepa leer cae aqui. Arriba se
    // traduce en "no pude preparar la portada", no en una subida a medias.
    return null
  }
}

export type Cuadro = {
  /** Segundo del video de donde salio, para rotularlo. */
  segundo: number
  /** El cuadro a 720 px: es lo que va al bucket privado. */
  nitida: File
  /** URL local para enseñarlo en la pantalla. Hay que revocarla al salir. */
  vista: string
}

/** Saca varios cuadros repartidos por el video para que la creadora elija
 *  cual es la portada.
 *
 *  Hasta ahora la portada la elegia una constante: el 10% del video. Eso
 *  evitaba el negro del arranque, pero seguia siendo una moneda al aire —el
 *  10% de un clip puede ser cualquier cosa, y quien lo grabo es la unica que
 *  sabe que cuadro quiere que se vea—. Se ofrecen varios y decide ella.
 *
 *  Del 8% al 88%: ni el arranque ni el fundido del cierre, que no dicen nada.
 *  Si el navegador no puede con el formato se devuelve lista vacia y arriba se
 *  cae al cuadro automatico de siempre. */
export async function cuadrosDeVideo(
  archivo: File, cuantos = CUADROS_A_ELEGIR,
): Promise<Cuadro[]> {
  const fuente = URL.createObjectURL(archivo)
  try {
    return await cuadrosDeUrl(fuente, cuantos)
  } finally {
    URL.revokeObjectURL(fuente)
  }
}

/** Lo mismo, pero desde una URL: sirve para cambiar la portada de un video que
 *  YA esta subido (se firma su URL y se sacan los cuadros de ahi). Con una URL
 *  de otro origen hace falta que el servidor mande CORS; sin el, el canvas
 *  queda contaminado y no se puede leer: se devuelve lista vacia. */
export async function cuadrosDeUrl(
  fuente: string, cuantos = CUADROS_A_ELEGIR,
): Promise<Cuadro[]> {
  const v = document.createElement('video')
  v.crossOrigin = 'anonymous'
  v.preload = 'auto'; v.muted = true; v.playsInline = true

  const esperar = (ev: string, ms: number) => new Promise<boolean>(res => {
    const reloj = setTimeout(() => res(false), ms)
    v.addEventListener(ev, () => { clearTimeout(reloj); res(true) }, { once: true })
    v.addEventListener('error', () => { clearTimeout(reloj); res(false) }, { once: true })
  })

  const sacados: Cuadro[] = []
  try {
    v.src = fuente
    if (!await esperar('loadedmetadata', 12000)) return []
    const d = v.duration
    if (!isFinite(d) || d <= 0) return []

    const escala = Math.min(1, ANCHO_MAXIMO / (v.videoWidth || ANCHO_MAXIMO))
    const c = document.createElement('canvas')
    c.width = Math.round((v.videoWidth || ANCHO_MAXIMO) * escala)
    c.height = Math.round((v.videoHeight || ANCHO_MAXIMO) * escala)
    const ctx = c.getContext('2d')
    if (!ctx || !c.width || !c.height) return []

    for (let i = 0; i < cuantos; i++) {
      const t = cuantos === 1 ? d * 0.1 : d * (0.08 + (0.80 * i) / (cuantos - 1))
      v.currentTime = Math.min(Math.max(t, 0.05), Math.max(d - 0.05, 0.05))
      if (!await esperar('seeked', 8000)) break
      ctx.drawImage(v, 0, 0, c.width, c.height)
      const b = await new Promise<Blob | null>(res => c.toBlob(res, 'image/jpeg', 0.82))
      if (!b) continue
      const nitida = new File([b], `portada-${i}.jpg`, { type: 'image/jpeg' })
      sacados.push({ segundo: v.currentTime, nitida, vista: URL.createObjectURL(nitida) })
    }
    return sacados
  } catch {
    return sacados
  } finally {
    v.removeAttribute('src')
    v.load()
  }
}

/** Prepara una imagen que la creadora subio a mano como portada: la NITIDA se
 *  limita a 720 px de ancho (nunca se agranda una mas chica) y la PUBLICA sale
 *  a 240. Devuelve null si el navegador no sabe leer el formato. */
export async function prepararPortada(
  imagen: File,
): Promise<{ nitida: File; chica: File } | null> {
  try {
    const mapa = await createImageBitmap(imagen)
    const ancho = mapa.width
    mapa.close()
    const nitida = ancho > ANCHO_MAXIMO ? await achicar(imagen, ANCHO_MAXIMO) : imagen
    const chica = nitida ? await achicar(nitida) : null
    return nitida && chica ? { nitida, chica } : null
  } catch {
    return null
  }
}

/* ==================== Avatar automatico ====================
 *
 * Para una creadora sin foto de perfil: un cuadro de SU PROPIO video, recortado
 * a cuadrado.
 *
 * QUE ES Y QUE NO ES «el cuadro mas limpio»: es una heuristica de calidad de
 * imagen, NO un clasificador de contenido. No sabe que hay en el cuadro. Lo que
 * hace es:
 *   1. sacar seis cuadros de la primera mitad del video (del 8% al 50%): las
 *      tomas del principio suelen ser la presentacion y no lo explicito;
 *   2. descartar los casi negros, los quemados y los de color casi uniforme
 *      (un primer plano vacio, un fundido);
 *   3. puntuar los demas por exposicion cercana al medio y por detalle, con un
 *      bono a los mas tempranos;
 *   4. quedarse con el de mejor puntaje y recortar el centro a 256 px.
 * Si NINGUN cuadro pasa el filtro devuelve null y la persona se queda con su
 * inicial: un avatar neutro es mejor que uno malo.
 *
 * Como es 18+, esto NO garantiza que el cuadro sea inocuo. Por eso el
 * retroactivo de administracion pide ver y confirmar cada propuesta, y la
 * creadora puede cambiar la foto cuando quiera desde Ajustes. */
export const LADO_AVATAR = 256
const CUADROS_AVATAR = 6
const DESDE_AVATAR = 0.08
const HASTA_AVATAR = 0.5
const PESO_TEMPRANO = 0.3
const LADO_PUNTAJE = 48
/** Luminancia media aceptable (0-255) y desviacion minima: debajo, es un cuadro
 *  casi negro, casi blanco o casi liso. */
const BRILLO_MIN = 45
const BRILLO_MAX = 215
const CONTRASTE_MIN = 14

/** Puntaje de 0 a 1 de un cuadro, o -1 si se descarta. Recibe los pixeles
 *  RGBA de una version chica del cuadro. Es pura, para poder probarla. */
export function puntuarCuadro(rgba: Uint8ClampedArray | number[]): number {
  const n = Math.floor(rgba.length / 4)
  if (n === 0) return -1
  let suma = 0, suma2 = 0
  for (let i = 0; i < n; i++) {
    const l = 0.2126 * rgba[i * 4] + 0.7152 * rgba[i * 4 + 1] + 0.0722 * rgba[i * 4 + 2]
    suma += l; suma2 += l * l
  }
  const media = suma / n
  const desv = Math.sqrt(Math.max(0, suma2 / n - media * media))
  if (media < BRILLO_MIN || media > BRILLO_MAX || desv < CONTRASTE_MIN) return -1
  const exposicion = 1 - Math.abs(media - 128) / 128
  const detalle = Math.min(desv / 64, 1)
  return exposicion * 0.5 + detalle * 0.5
}

/** El cuadro que eligio la heuristica, con lo que hace falta para rotularlo. */
export type CuadroElegido = {
  archivo: File
  /** Cual de los seis (0 = el mas temprano). */
  indice: number
  /** Segundo del video de donde salio. */
  segundo: number
}

/** La eleccion de cuadro que comparten el avatar y la portada discreta: los mismos
 *  seis cuadros de la primera mitad, el mismo filtro y el mismo premio a lo temprano.
 *  Lo UNICO que cambia es la salida:
 *    - `completo = false` (avatar): recorta el centro a cuadrado y lo deja en 256 px;
 *    - `completo = true` (portada): el cuadro ENTERO, sin recortar, acotado a
 *      `ANCHO_MAXIMO` (720) para pasarlo despues por `achicar()` como cualquier portada.
 *  Devuelve null si ningun cuadro pasa el filtro o el navegador no puede con el formato. */
async function elegirCuadro(fuente: File | string, completo: boolean): Promise<CuadroElegido | null> {
  const local = typeof fuente !== 'string'
  const url = local ? URL.createObjectURL(fuente) : fuente
  const v = document.createElement('video')
  v.preload = 'auto'; v.muted = true; v.playsInline = true
  // Con una URL de otro origen, sin esto el canvas queda contaminado y leer los
  // pixeles lanza: se captura mas abajo y se devuelve null.
  v.crossOrigin = 'anonymous'

  const esperar = (ev: string, ms: number) => new Promise<boolean>(res => {
    const reloj = setTimeout(() => res(false), ms)
    v.addEventListener(ev, () => { clearTimeout(reloj); res(true) }, { once: true })
    v.addEventListener('error', () => { clearTimeout(reloj); res(false) }, { once: true })
  })

  try {
    v.src = url
    if (!await esperar('loadedmetadata', 12000)) return null
    const d = v.duration, vw = v.videoWidth, vh = v.videoHeight
    if (!isFinite(d) || d <= 0 || !vw || !vh) return null

    // Lo que se lee del video: el centro cuadrado (avatar) o todo el cuadro (portada).
    const lado = Math.min(vw, vh)
    const sx = completo ? 0 : (vw - lado) / 2
    const sy = completo ? 0 : (vh - lado) / 2
    const sw = completo ? vw : lado
    const sh = completo ? vh : lado

    const chico = document.createElement('canvas')
    chico.width = chico.height = LADO_PUNTAJE
    const grande = document.createElement('canvas')
    if (completo) {
      const escala = Math.min(1, ANCHO_MAXIMO / vw)
      grande.width = Math.max(1, Math.round(vw * escala))
      grande.height = Math.max(1, Math.round(vh * escala))
    } else {
      grande.width = grande.height = LADO_AVATAR
    }
    const cc = chico.getContext('2d', { willReadFrequently: true })
    const cg = grande.getContext('2d')
    if (!cc || !cg) return null

    let mejor: { puntaje: number; blob: Blob; indice: number; segundo: number } | null = null
    for (let i = 0; i < CUADROS_AVATAR; i++) {
      const frac = DESDE_AVATAR + ((HASTA_AVATAR - DESDE_AVATAR) * i) / (CUADROS_AVATAR - 1)
      v.currentTime = Math.min(Math.max(d * frac, 0.05), Math.max(d - 0.05, 0.05))
      if (!await esperar('seeked', 8000)) break

      cc.drawImage(v, sx, sy, sw, sh, 0, 0, LADO_PUNTAJE, LADO_PUNTAJE)
      const base = puntuarCuadro(cc.getImageData(0, 0, LADO_PUNTAJE, LADO_PUNTAJE).data)
      if (base < 0) continue
      const total = base + PESO_TEMPRANO * (1 - i / (CUADROS_AVATAR - 1))
      if (mejor && total <= mejor.puntaje) continue

      cg.drawImage(v, sx, sy, sw, sh, 0, 0, grande.width, grande.height)
      const b = await new Promise<Blob | null>(res => grande.toBlob(res, 'image/jpeg', completo ? 0.82 : 0.85))
      if (b) mejor = { puntaje: total, blob: b, indice: i, segundo: v.currentTime }
    }
    return mejor
      ? {
        archivo: new File([mejor.blob], completo ? 'portada.jpg' : 'avatar.jpg', { type: 'image/jpeg' }),
        indice: mejor.indice, segundo: mejor.segundo,
      }
      : null
  } catch {
    return null
  } finally {
    v.removeAttribute('src')
    v.load()
    if (local) URL.revokeObjectURL(url)
  }
}

/** Un avatar cuadrado de 256 px sacado del video, o null si no hay un cuadro
 *  aceptable o el navegador no puede con el formato. `fuente` es un archivo
 *  local o una URL (firmada) ya autorizada. */
export async function avatarDeVideo(fuente: File | string): Promise<File | null> {
  return (await elegirCuadro(fuente, false))?.archivo ?? null
}

/* ==================== Portada discreta ====================
 *
 * La portada automatica salia del 10% del video (`miniaturaDeVideo`): un cuadro que
 * solo busca no ser negro, no uno discreto. Con la copia publica a 240 px, ese
 * mismo fotograma se veia tan nitido como era.
 *
 * Esto usa LA MISMA heuristica que el avatar —seis cuadros de la primera mitad,
 * descartar lo negro/quemado/liso, premio a los mas tempranos— pero se queda con el
 * cuadro COMPLETO: una portada recortada a cuadrado deja de ser portada.
 *
 * NO ES UN CLASIFICADOR DE CONTENIDO. Es una heuristica de calidad de imagen: no sabe
 * que hay en el cuadro y no garantiza uno inocuo. No hay un detector de desnudos ni un
 * servicio externo. Por eso donde ya existian portadas se PROPONE y se confirma
 * (Herramientas -> «Portadas mas discretas»), igual que el retroactivo del avatar. */

/** El cuadro discreto, con su segundo y su indice, o null si ninguno pasa el filtro. */
export async function elegirCuadroDiscreto(fuente: File | string): Promise<CuadroElegido | null> {
  return elegirCuadro(fuente, true)
}

/** La portada discreta de un video: cuadro completo, hasta 720 px, lista para `achicar()`. */
export async function portadaDiscretaDeVideo(fuente: File | string): Promise<File | null> {
  return (await elegirCuadro(fuente, true))?.archivo ?? null
}

/** La portada AUTOMATICA de un video (cuando nadie eligio ni subio una): la discreta
 *  y, si ningun cuadro pasa el filtro, la de siempre (el cuadro del 10%) para no
 *  publicar sin portada. Una portada elegida o subida a mano NUNCA pasa por aqui. */
export async function portadaAutomaticaDeVideo(video: File): Promise<File | null> {
  return (await portadaDiscretaDeVideo(video)) ?? (await miniaturaDeVideo(video))
}
