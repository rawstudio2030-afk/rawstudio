import { supabase, type Perfil } from './supabase'

/** Si es admin lo decide la base, no el cliente. Esta consulta solo sirve para
 *  DIBUJAR o no el panel; la proteccion de verdad son las politicas RLS: aunque
 *  alguien forzara esto a true editando el JavaScript, la base seguiria
 *  rechazando cada escritura. */
export async function soyAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('es_admin')
  if (error) { console.warn('[admin] es_admin:', error.message); return false }
  return data === true
}

export type PerfilAdmin = Perfil & {
  suspended_at: string | null
  suspended_reason: string | null
}

export async function listarPerfiles(busqueda: string): Promise<PerfilAdmin[]> {
  let q = supabase.from('profiles')
    .select('*').order('created_at', { ascending: false }).limit(60)
  const b = busqueda.trim()
  if (b) q = q.or(`handle.ilike.%${b}%,display_name.ilike.%${b}%`)
  const { data, error } = await q
  if (error) { console.warn('[admin] listar:', error.message); return [] }
  return (data ?? []) as PerfilAdmin[]
}

/** Toda accion de admin queda en la bitacora. Se escribe DESPUES del cambio y
 *  no antes: si el cambio falla por RLS, no queda una entrada que afirme algo
 *  que nunca paso. */
async function anotar(accion: string, objetivo: string, detalle: object = {}) {
  const { data: s } = await supabase.auth.getSession()
  const admin = s.session?.user.id
  if (!admin) return
  const { error } = await supabase.from('admin_log')
    .insert({ admin_id: admin, accion, objetivo, detalle })
  if (error) console.warn('[admin] bitacora:', error.message)
}

export async function suspender(id: string, motivo: string) {
  const { error } = await supabase.from('profiles')
    .update({ suspended_at: new Date().toISOString(), suspended_reason: motivo || null })
    .eq('id', id)
  if (error) return error.message
  await anotar('suspender', id, { motivo })
  return null
}

export async function reactivar(id: string) {
  const { error } = await supabase.from('profiles')
    .update({ suspended_at: null, suspended_reason: null }).eq('id', id)
  if (error) return error.message
  await anotar('reactivar', id)
  return null
}

export async function cambiarVerificacion(id: string, verificado: boolean) {
  const { error } = await supabase.from('profiles')
    .update({ verified: verificado }).eq('id', id)
  if (error) return error.message
  await anotar(verificado ? 'verificar' : 'quitar_verificacion', id)
  return null
}

export type Entrada = {
  id: number; admin_id: string; accion: string
  objetivo: string | null; detalle: Record<string, unknown>; created_at: string
}

export async function bitacora(limite = 40): Promise<Entrada[]> {
  const { data, error } = await supabase.from('admin_log')
    .select('*').order('created_at', { ascending: false }).limit(limite)
  if (error) { console.warn('[admin] bitacora:', error.message); return [] }
  return (data ?? []) as Entrada[]
}
