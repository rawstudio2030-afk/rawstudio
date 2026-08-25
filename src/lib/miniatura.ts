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
