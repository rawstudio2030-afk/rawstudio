import { supabase } from './supabase'

export type Visibilidad = 'pago' | 'suscriptores' | 'gratis'

export type Clip = {
  id: string
  creator_id: string
  title: string
  description: string | null
  storage_path: string | null
  cover_path: string | null
  preview_path: string | null
  duration_s: number | null
  visibility: Visibilidad
  price_coins: number
  published: boolean
  published_at: string | null
  renta_horas: number | null
  renta_coins: number | null
  es_demo: boolean
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

export type Acceso =
  | { url: string; pais: string | null }
  | { error: string; motivo?: 'sin_acceso' | 'geobloqueo'; pais?: string }

/** Pide la URL del video a la funcion de borde, no directo a Storage.
 *
 *  El paywall ya lo sostienen las politicas, pero el GEOBLOQUEO no puede
 *  decidirse aqui: la base no sabe desde que pais llega la peticion, y el
 *  navegador no es fuente confiable de eso. La funcion ve la IP real —la pone
 *  la red, no quien llama— y decide antes de que exista una URL que entregar.
 *
 *  La URL que devuelve dura 15 minutos: si se filtrara, expira pronto. */
export async function urlVideoFirmada(clipId: string): Promise<Acceso> {
  const base = import.meta.env.VITE_SUPABASE_URL
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) return { error: 'Necesitas entrar para ver este clip' }

  try {
    const r = await fetch(`${base}/functions/v1/ver-clip`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ clip: clipId }),
    })
    const j = await r.json()
    if (!r.ok) return { error: j.error ?? 'No se pudo abrir el clip', motivo: j.motivo, pais: j.pais }
    return { url: j.url, pais: j.pais ?? null }
  } catch {
    return { error: 'No pudimos contactar el servidor. Revisa tu conexión.' }
  }
}

export async function clipsPublicados(limite = 30): Promise<ClipConAutora[]> {
  // Lo destacado va primero, en el orden que le puso la administracion, y
  // despues lo demas por fecha. nullsFirst:false manda al final lo que no
  // esta destacado, que es todo salvo un puñado.
  const { data, error } = await supabase.from('clips')
    .select(CON_AUTORA).eq('published', true)
    .order('destacado_orden', { ascending: true, nullsFirst: false })
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
  renta_horas?: number | null; renta_coins?: number | null
  preview_path?: string | null
}): Promise<{ id?: string; error?: string }> {
  const { data, error } = await supabase.from('clips').insert(c).select('id').single()
  if (error) return { error: error.message }
  return { id: (data as { id: string }).id }
}

export async function borrarClip(id: string): Promise<string | null> {
  const { error } = await supabase.from('clips').delete().eq('id', id)
  return error ? error.message : null
}
