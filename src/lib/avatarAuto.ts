/* Avatar automatico al publicar.
 *
 * Si la creadora todavia no tiene foto de perfil, el cuadro mas limpio de SU
 * video (ver `avatarDeVideo`) pasa a ser su avatar. Solo cuando `avatar_path`
 * es null: nunca se pisa una foto que alguien puso a proposito.
 *
 * La guarda es doble. Se lee antes de hacer el trabajo, y el UPDATE final lleva
 * `avatar_path is null` en el WHERE, asi que si entre una cosa y otra ella
 * subio una foto, no se pisa y el archivo recien subido se borra. */
import { supabase } from './supabase'
import { subirAvatar } from './perfiles'
import { avatarDeVideo } from './miniatura'

export type ResultadoAvatar = 'asignado' | 'ya-tenia' | 'sin-cuadro' | 'error'

export async function asignarAvatarSiFalta(uid: string, fuente: File | string): Promise<ResultadoAvatar> {
  const { data: antes } = await supabase
    .from('profiles').select('avatar_path').eq('id', uid).maybeSingle()
  if (antes?.avatar_path) return 'ya-tenia'

  const f = await avatarDeVideo(fuente)
  if (!f) return 'sin-cuadro'

  const sub = await subirAvatar(uid, f)
  if ('error' in sub) return 'error'

  const { data, error } = await supabase
    .from('profiles').update({ avatar_path: sub.ruta })
    .eq('id', uid).is('avatar_path', null).select('id')
  if (error || !data || data.length === 0) {
    // Se adelantaron, o fallo: no se deja un archivo suelto.
    await supabase.storage.from('avatars').remove([sub.ruta])
    return error ? 'error' : 'ya-tenia'
  }
  return 'asignado'
}
