import { supabase } from './supabase'

export type Visibilidad = 'pago' | 'suscriptores' | 'gratis'

export type Clip = {
  id: string
  creator_id: string
  title: string
  description: string | null
  storage_path: string | null
  cover_path: string | null
  duration_s: number | null
  visibility: Visibilidad
  price_coins: number
  published: boolean
  published_at: string | null
  created_at: string
}

export type ClipConAutora = Clip & {
  profiles: { handle: string; display_name: string; avatar_path: string | null; verified: boolean } | null
}

const CON_AUTORA = '*, profiles!clips_creator_id_fkey(handle,display_name,avatar_path,verified)'

export function urlPortada(path: string | null): string | null {
  if (!path) return null
  return supabase.storage.from('clip-covers').getPublicUrl(path).data.publicUrl
}

/** El video vive en bucket privado. Esta URL solo se obtiene si las politicas
 *  de storage dejan leer el archivo: hoy, unicamente su autora o un admin.
 *  Cuando existan las compras, la politica se amplia y este mismo codigo
 *  empieza a servir a quien pago, sin cambiar aqui nada. */
export async function urlVideoFirmada(path: string, segundos = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage.from('clips').createSignedUrl(path, segundos)
  if (error) return null
  return data.signedUrl
}

export async function clipsPublicados(limite = 30): Promise<ClipConAutora[]> {
  const { data, error } = await supabase.from('clips')
    .select(CON_AUTORA).eq('published', true)
    .order('published_at', { ascending: false }).limit(limite)
  if (error) { console.warn('[clips] publicados:', error.message); return [] }
  return (data ?? []) as ClipConAutora[]
}

export async function clipPorId(id: string): Promise<ClipConAutora | null> {
  const { data, error } = await supabase.from('clips')
    .select(CON_AUTORA).eq('id', id).maybeSingle()
  if (error) { console.warn('[clips] por id:', error.message); return null }
  return (data as ClipConAutora) ?? null
}

/** Incluye borradores solo cuando quien consulta es la propia autora: de eso
 *  se encarga RLS, no este codigo. */
export async function clipsDe(creatorId: string): Promise<Clip[]> {
  const { data, error } = await supabase.from('clips')
    .select('*').eq('creator_id', creatorId)
    .order('created_at', { ascending: false })
  if (error) { console.warn('[clips] de creadora:', error.message); return [] }
  return (data ?? []) as Clip[]
}

export async function subirArchivo(
  bucket: 'clips' | 'clip-covers', uid: string, archivo: File,
): Promise<{ path?: string; error?: string }> {
  // La ruta DEBE empezar con el uid: las politicas de storage se apoyan en eso.
  const ext = (archivo.name.split('.').pop() || 'bin').toLowerCase()
  const path = `${uid}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(bucket)
    .upload(path, archivo, { contentType: archivo.type, upsert: false })
  if (error) return { error: error.message }
  return { path }
}

export async function crearClip(c: {
  creator_id: string; title: string; description?: string | null
  storage_path?: string | null; cover_path?: string | null; duration_s?: number | null
  visibility: Visibilidad; price_coins: number; published: boolean
}): Promise<{ id?: string; error?: string }> {
  const { data, error } = await supabase.from('clips').insert(c).select('id').single()
  if (error) return { error: error.message }
  return { id: (data as { id: string }).id }
}

export async function borrarClip(id: string): Promise<string | null> {
  const { error } = await supabase.from('clips').delete().eq('id', id)
  return error ? error.message : null
}
