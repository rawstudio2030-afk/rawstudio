/* Articulos, instrucciones y preguntas frecuentes: la seccion que se gestiona
 * desde el panel (modulo «Articulos») y se lee en `/articulos`.
 *
 * Todo pasa por funciones de la base (`articulos_publicados`, `articulo_publicado`,
 * `admin_articulo_*`): la tabla esta cerrada y las funciones deciden quien puede
 * que. Lectura: cualquier cuenta con sesion. Escritura: solo administracion.
 *
 * El PDF adjunto vive en el bucket PRIVADO `articulos`. Nunca se enlaza directo:
 * se pide una URL firmada de corta vida (`urlPdf`) y la politica del bucket solo
 * la concede si el articulo esta publicado (o si quien pregunta administra).
 */
import { supabase } from './supabase'

export type TipoArticulo = 'articulo' | 'instruccion' | 'pregunta'

export const TIPOS: { v: TipoArticulo; t: string; plural: string }[] = [
  { v: 'articulo', t: 'Artículo', plural: 'Artículos' },
  { v: 'instruccion', t: 'Instrucción', plural: 'Instrucciones' },
  { v: 'pregunta', t: 'Pregunta', plural: 'Preguntas' },
]

export const nombreTipo = (t: string): string => TIPOS.find(x => x.v === t)?.t ?? t

export type ArticuloResumen = {
  id: string; tipo: TipoArticulo; titulo: string
  resumen: string | null; tiene_pdf: boolean; publicado_at: string
}

export type ArticuloPublico = {
  id: string; tipo: TipoArticulo; titulo: string; resumen: string | null
  cuerpo: string; pdf_path: string | null; publicado_at: string
}

export type ArticuloAdmin = {
  id: string; tipo: TipoArticulo; titulo: string; titulo_bot: string | null
  resumen: string | null; cuerpo: string; pdf_path: string | null
  publicado: boolean; en_bot: boolean; orden: number
  creado_at: string; actualizado_at: string; publicado_at: string | null
}

export const LIMITES = { titulo: 140, tituloBot: 60, resumen: 300, cuerpo: 30000 } as const
export const TOPE_PDF_MB = 20

/* ---------- Lectura (cuenta con sesion) ---------- */

export async function articulosPublicados(): Promise<{ filas: ArticuloResumen[] } | { error: string }> {
  const { data, error } = await supabase.rpc('articulos_publicados')
  if (error) return { error: error.message }
  return { filas: (data ?? []) as ArticuloResumen[] }
}

/** `null` si no existe o no esta publicado (o no hay sesion): para quien lee es lo mismo. */
export async function articuloPublicado(id: string): Promise<{ articulo: ArticuloPublico | null } | { error: string }> {
  const { data, error } = await supabase.rpc('articulo_publicado', { p_id: id })
  if (error) return { error: error.message }
  const fila = ((data ?? []) as ArticuloPublico[])[0]
  return { articulo: fila ?? null }
}

/** URL firmada del PDF, valida unos minutos. `null` si no se pudo. */
export async function urlPdf(ruta: string, nombre?: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from('articulos')
    .createSignedUrl(ruta, 300, nombre ? { download: nombre } : undefined)
  return error ? null : data.signedUrl
}

/* ---------- Administracion ---------- */

export async function adminArticulos(): Promise<{ filas: ArticuloAdmin[] } | { error: string }> {
  const { data, error } = await supabase.rpc('admin_articulos')
  if (error) return { error: error.message }
  return { filas: (data ?? []) as ArticuloAdmin[] }
}

export type DatosArticulo = {
  id: string | null; tipo: TipoArticulo; titulo: string; tituloBot: string
  resumen: string; cuerpo: string; pdfPath: string | null; enBot: boolean; orden: number
}

/** Mensaje claro para lo que la base rechaza por una restriccion. */
function traducir(mensaje: string): string {
  if (/articulos_titulo_check/.test(mensaje)) return 'El título debe tener entre 3 y 140 caracteres.'
  if (/titulo_bot_check/.test(mensaje)) return 'El título para el bot debe tener entre 3 y 60 caracteres (o déjalo vacío).'
  if (/resumen_check/.test(mensaje)) return 'El resumen no puede pasar de 300 caracteres.'
  if (/cuerpo_check/.test(mensaje)) return 'El texto no puede estar vacío ni pasar de 30 000 caracteres.'
  if (/pdf_path_check/.test(mensaje)) return 'La ruta del PDF no es válida.'
  return mensaje
}

export async function guardarArticulo(d: DatosArticulo): Promise<{ id: string } | { error: string }> {
  const { data, error } = await supabase.rpc('admin_articulo_guardar', {
    p_id: d.id, p_tipo: d.tipo, p_titulo: d.titulo, p_titulo_bot: d.tituloBot,
    p_resumen: d.resumen, p_cuerpo: d.cuerpo, p_pdf_path: d.pdfPath,
    p_en_bot: d.enBot, p_orden: d.orden,
  })
  if (error) return { error: traducir(error.message) }
  return { id: data as string }
}

export async function publicarArticulo(id: string, publicar: boolean): Promise<string> {
  const { error } = await supabase.rpc('admin_articulo_publicar', { p_id: id, p_publicar: publicar })
  return error?.message ?? ''
}

/** Borra el articulo y su PDF. Devuelve un texto de error, o '' si salio bien. */
export async function borrarArticulo(id: string): Promise<string> {
  const { data, error } = await supabase.rpc('admin_articulo_borrar', { p_id: id })
  if (error) return error.message
  const ruta = data as string | null
  if (ruta) await supabase.storage.from('articulos').remove([ruta])
  return ''
}

/* ---------- PDF adjunto ---------- */

const limpiarNombre = (n: string): string =>
  n.replace(/\.pdf$/i, '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'documento'

/** Sube el PDF al bucket. Ruta: `<id-al-azar>/<nombre-limpio>.pdf`. */
export async function subirPdf(archivo: File): Promise<{ ruta: string } | { error: string }> {
  if (archivo.type !== 'application/pdf' && !/\.pdf$/i.test(archivo.name)) return { error: 'El archivo debe ser un PDF.' }
  if (archivo.size > TOPE_PDF_MB * 1024 * 1024) return { error: `El PDF no puede pasar de ${TOPE_PDF_MB} MB.` }
  const ruta = `${crypto.randomUUID()}/${limpiarNombre(archivo.name)}.pdf`
  const { error } = await supabase.storage.from('articulos')
    .upload(ruta, archivo, { contentType: 'application/pdf', upsert: false })
  if (error) return { error: error.message }
  return { ruta }
}

export async function quitarPdf(ruta: string): Promise<void> {
  await supabase.storage.from('articulos').remove([ruta])
}
