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
