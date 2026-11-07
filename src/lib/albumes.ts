/* Subir un album de fotos.
 *
 * Un album es un clip con formato «album»: de 10 a 40 fotos y un precio fijo
 * (los numeros salen de los ajustes del panel, no de aqui). La base lo deja
 * INCOMPLETO y sin verse hasta que `album_completar` comprueba el minimo de
 * fotos; despues decide la moderacion, igual que con un video.
 *
 * LO MAS IMPORTANTE: cada foto se VUELVE A CODIFICAR en el navegador antes de
 * salir de la maquina. Una foto de celular trae la ubicacion GPS, el modelo del
 * aparato y la hora en su metadata; publicarla tal cual puede delatar donde vive
 * quien la tomo. Al dibujar la foto en un canvas y guardarla de nuevo, nada de
 * esa metadata pasa (el canvas solo conoce pixeles). El servidor no puede
 * garantizarlo, asi que se hace aqui y se comprueba (`sinMetadata`).
 */
import { supabase } from './supabase'
import { achicar } from './miniatura'
import { subirArchivo, subirPortada, crearClip } from './clips'

export type ConfigAlbumes = { activos: boolean; precio: number; min: number; max: number }

export async function configAlbumes(): Promise<ConfigAlbumes> {
  const apagado = { activos: false, precio: 500, min: 10, max: 40 }
  const { data, error } = await supabase.rpc('config_albumes')
  if (error || !data) return apagado
  const d = data as Partial<ConfigAlbumes>
  return {
    activos: d.activos === true,
    precio: Number(d.precio) || 500,
    min: Number(d.min) || 10,
    max: Number(d.max) || 40,
  }
}

/** Lado mas largo de una foto de album, en pixeles. Basta para verla bien y
 *  mantiene cada archivo en ~1 MB (el limite del bucket es 10 MB). */
export const LADO_MAXIMO = 2400
const CALIDAD = 0.88
/** Lo que se acepta de entrada, antes de volver a codificar. */
export const TIPOS_ACEPTADOS = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_BYTES_ENTRADA = 30 * 1024 * 1024

export type FotoLista = {
  /** La foto ya limpia, en JPEG. */
  archivo: File
  ancho: number
  alto: number
  /** Para la vista previa. Hay que soltarla con `URL.revokeObjectURL`. */
  vista: string
}

/** ¿Quedo algo de metadata? Busca las marcas del EXIF y del XMP en los bytes.
 *  Es una COMPROBACION de lo que ya hizo el canvas, no la limpieza. */
export async function sinMetadata(archivo: Blob): Promise<boolean> {
  const b = new Uint8Array(await archivo.arrayBuffer())
  const texto = new TextDecoder('latin1').decode(b.subarray(0, Math.min(b.length, 65536)))
  return !/Exif\0\0|http:\/\/ns\.adobe\.com\/xap|GPSLatitude|<x:xmpmeta/.test(texto)
}

/** Lee, reduce y vuelve a codificar una foto. `null` si el navegador no puede
 *  leerla (un formato raro, un archivo danado). */
export async function limpiarFoto(original: File): Promise<FotoLista | null> {
  if (!TIPOS_ACEPTADOS.includes(original.type) || original.size > MAX_BYTES_ENTRADA) return null
  try {
    // `imageOrientation: 'from-image'` aplica la rotacion del EXIF a los pixeles
    // ANTES de tirar el EXIF: si no, una foto vertical saldria de lado.
    const mapa = await createImageBitmap(original, { imageOrientation: 'from-image' })
    const escala = Math.min(1, LADO_MAXIMO / Math.max(mapa.width, mapa.height))
    const ancho = Math.max(1, Math.round(mapa.width * escala))
    const alto = Math.max(1, Math.round(mapa.height * escala))
    const c = document.createElement('canvas')
    c.width = ancho; c.height = alto
    const ctx = c.getContext('2d')
    if (!ctx) { mapa.close(); return null }
    // Fondo blanco: un PNG con transparencia saldria negro en JPEG.
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, ancho, alto)
    ctx.drawImage(mapa, 0, 0, ancho, alto)
    mapa.close()
    const blob = await new Promise<Blob | null>(res => c.toBlob(res, 'image/jpeg', CALIDAD))
    if (!blob || !(await sinMetadata(blob))) return null
    const archivo = new File([blob], 'foto.jpg', { type: 'image/jpeg' })
    return { archivo, ancho, alto, vista: URL.createObjectURL(blob) }
  } catch {
    return null
  }
}

export type Avance = { paso: string; hechas: number; total: number }

/** Sube el album completo. Devuelve el id y si ya quedo visible (o si espera
 *  moderacion). Si algo falla a medias, deshace lo que alcanzo a subir para no
 *  dejar un album a medio hacer ni archivos sueltos. */
export async function subirAlbum(args: {
  uid: string; titulo: string; descripcion: string
  fotos: FotoLista[]; precio: number
  alAvanzar: (a: Avance) => void
}): Promise<{ id: string; publicado: boolean } | { error: string }> {
  const { uid, titulo, descripcion, fotos, precio, alAvanzar } = args
  const total = fotos.length
  let clipId: string | null = null
  const subidas: string[] = []
  const portadas: string[] = []

  const deshacer = async () => {
    try {
      if (subidas.length) await supabase.storage.from('albumes').remove(subidas)
      for (const p of portadas) {
        await supabase.storage.from('clip-covers-full').remove([p])
        await supabase.storage.from('clip-covers').remove([p])
      }
      if (clipId) await supabase.from('clips').delete().eq('id', clipId)
    } catch { /* se hizo lo que se pudo */ }
  }

  try {
    // La portada: la primera foto, en sus dos tamaños (la chica es la borrosa
    // publica; la nitida es para quien lo compre).
    alAvanzar({ paso: 'Preparando la portada…', hechas: 0, total })
    const nitida = await achicar(fotos[0].archivo, 1280)
    const chica = await achicar(fotos[0].archivo)
    if (!nitida || !chica) { return { error: 'No pude preparar la portada con la primera foto.' } }
    const p = await subirPortada(uid, nitida, chica)
    if (p.error || !p.path) { return { error: p.error ?? 'No se pudo subir la portada.' } }
    portadas.push(p.path)

    alAvanzar({ paso: 'Creando el álbum…', hechas: 0, total })
    const c = await crearClip({
      creator_id: uid, title: titulo, description: descripcion || null,
      cover_path: p.path, visibility: 'pago', price_coins: precio, published: true,
      formato: 'album',
    })
    if (c.error || !c.id) { await deshacer(); return { error: c.error ?? 'No se pudo crear el álbum.' } }
    clipId = c.id

    // Las fotos, de tres en tres: una por una tarda mucho y todas a la vez
    // revienta la conexion del celular.
    let hechas = 0
    const filas: { clip_id: string; orden: number; ruta: string; ancho: number; alto: number; bytes: number }[] = []
    let siguiente = 0
    let fallo: string | null = null
    const trabajador = async () => {
      while (!fallo) {
        const i = siguiente++
        if (i >= total) return
        const f = fotos[i]
        const ruta = `${uid}/${clipId}/${i + 1}.jpg`
        const r = await subirArchivo('albumes', uid, f.archivo, ruta)
        if (r.error) { fallo = `La foto ${i + 1} no se pudo subir: ${r.error}`; return }
        subidas.push(ruta)
        filas.push({ clip_id: clipId!, orden: i + 1, ruta, ancho: f.ancho, alto: f.alto, bytes: f.archivo.size })
        hechas++
        alAvanzar({ paso: 'Subiendo las fotos…', hechas, total })
      }
    }
    await Promise.all([trabajador(), trabajador(), trabajador()])
    if (fallo) { await deshacer(); return { error: fallo } }

    alAvanzar({ paso: 'Guardando el álbum…', hechas: total, total })
    filas.sort((a, b) => a.orden - b.orden)
    const { error: e1 } = await supabase.from('album_fotos').insert(filas)
    if (e1) { await deshacer(); return { error: e1.message } }

    const { data, error: e2 } = await supabase.rpc('album_completar', { p_clip: clipId })
    if (e2) { await deshacer(); return { error: e2.message } }
    return { id: clipId, publicado: (data as { publicado?: boolean } | null)?.publicado === true }
  } catch (e) {
    await deshacer()
    return { error: e instanceof Error ? e.message : 'No se pudo subir el álbum.' }
  }
}
