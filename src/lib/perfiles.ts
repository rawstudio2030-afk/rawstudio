import { supabase, type Perfil } from './supabase'

/** URL publica de una foto de perfil. El bucket es publico en lectura, asi que
 *  no hace falta firmar nada. */
export function urlAvatar(path: string | null): string | null {
  if (!path) return null
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
}

export async function perfilPorHandle(handle: string): Promise<Perfil | null> {
  const { data, error } = await supabase
    .from('profiles').select('*').eq('handle', handle.toLowerCase()).maybeSingle()
  if (error) {
    console.warn('[perfiles] no se pudo leer:', error.message)
    return null
  }
  return (data as Perfil) ?? null
}

/** Directorio de creadoras.
 *
 *  Existe porque Explorar solo mostraba clips: con perfiles y sin video, una
 *  creadora era inalcanzable salvo escribiendo su URL a mano. */
export type FichaCreadora = {
  id: string; handle: string; display_name: string; bio: string | null
  avatar_path: string | null; verified: boolean; es_demo: boolean
  identidad_verificada: boolean
}

export async function creadoras(busqueda = '', limite = 60, desde = 0) {
  let q = supabase.from('profiles')
    .select('id,handle,display_name,bio,avatar_path,verified,es_demo,identidad_verificada')
    .eq('is_creator', true)
    .is('baneado_at', null)
    .order('identidad_verificada', { ascending: false })
    .order('created_at', { ascending: false })
    .range(desde, desde + limite - 1)

  if (busqueda.trim()) {
    const b = busqueda.trim()
    q = q.or(`handle.ilike.%${b}%,display_name.ilike.%${b}%`)
  }
  const { data, error } = await q
  if (error) { console.warn('[perfiles] creadoras:', error.message); return [] }
  return (data ?? []) as FichaCreadora[]
}
