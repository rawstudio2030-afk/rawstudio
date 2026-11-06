/* Comentarios y reseñas de la ficha del clip.
 *
 * Todo pasa por funciones del servidor (`comentarios_de`, `resumen_resenas`,
 * `comentar`, `calificar`, `quitar_calificacion`, `borrar_comentario`): las
 * tablas no se tocan desde aqui. Quien puede ver la ficha lee; quien puede
 * abrir el video comenta y califica. Ese permiso lo decide el servidor, no
 * este archivo: esconder un boton no protege nada.
 */
import { supabase } from './supabase'

export type Comentario = {
  id: string
  texto: string
  created_at: string
  /** `null` cuando la cuenta se anonimizo. */
  handle: string | null
  display_name: string
  avatar_path: string | null
  verified: boolean
  es_creadora: boolean
  es_mio: boolean
  puede_borrar: boolean
}

export type ResumenResenas = {
  promedio: number | null
  cantidad: number
  mi_calificacion: number | null
}

export const POR_PAGINA = 20
export const MAX_TEXTO = 500

/** Una pagina de comentarios, mas recientes primero. `antes` es el
 *  `created_at` del ultimo que ya se tiene. */
export async function comentariosDe(
  clip: string, antes?: string | null,
): Promise<{ filas: Comentario[] } | { error: string }> {
  const { data, error } = await supabase.rpc('comentarios_de', {
    p_clip: clip, p_antes: antes ?? null, p_cuantos: POR_PAGINA,
  })
  if (error) return { error: error.message }
  return { filas: (data ?? []) as Comentario[] }
}

export async function resumenResenas(clip: string): Promise<ResumenResenas> {
  const vacio = { promedio: null, cantidad: 0, mi_calificacion: null }
  const { data, error } = await supabase.rpc('resumen_resenas', { p_clip: clip })
  if (error || !Array.isArray(data) || !data[0]) return vacio
  const f = data[0] as { promedio: number | string | null; cantidad: number; mi_calificacion: number | null }
  return {
    promedio: f.promedio == null ? null : Number(f.promedio),
    cantidad: Number(f.cantidad) || 0,
    mi_calificacion: f.mi_calificacion ?? null,
  }
}

/** `''` si salio bien; si no, el mensaje del servidor, que ya viene en español. */
export async function comentar(clip: string, texto: string): Promise<string> {
  const { error } = await supabase.rpc('comentar', { p_clip: clip, p_texto: texto })
  return error?.message ?? ''
}

export async function calificar(clip: string, calificacion: number): Promise<string> {
  const { error } = await supabase.rpc('calificar', { p_clip: clip, p_calificacion: calificacion })
  return error?.message ?? ''
}

export async function quitarCalificacion(clip: string): Promise<string> {
  const { error } = await supabase.rpc('quitar_calificacion', { p_clip: clip })
  return error?.message ?? ''
}

export async function borrarComentario(id: string): Promise<string> {
  const { error } = await supabase.rpc('borrar_comentario', { p_id: id })
  return error?.message ?? ''
}
