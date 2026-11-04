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

/** Ancho de la copia PUBLICA. La tarjeta mide 243, asi que a 32 se estira
 *  unas 7 veces: queda la mancha de color y la silueta, nada mas.
 *
 *  Antes del 3 de noviembre de 2026 solo habia una copia, de 720 px, en el
 *  bucket publico: el catalogo entero se podia bajar sin pagar ni entrar.
 *  Ahora salen dos de la misma imagen —la chica para el mundo y la nitida
 *  para el bucket privado, en la misma ruta— y por eso viven juntas aqui:
 *  son el mismo cuadro a dos tamaños, no dos decisiones distintas. */
export const ANCHO_PUBLICO = 32
const CALIDAD_PUBLICA = 0.4

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
  const v = document.createElement('video')
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
    URL.revokeObjectURL(fuente)
  }
}
