/* Los cuatro canales que faltaban: renta, suscripcion, encargos y blog.
 *
 * Las tablas existian desde el principio y tiene_acceso() ya consultaba rentas
 * y suscripciones. Lo que no existia era la forma de CREARLAS, asi que ninguno
 * de los cuatro podia usarse. */
import { supabase } from './supabase'

/* ---------- Renta ---------- */

export async function rentarClip(clip: string) {
  const { data, error } = await supabase.rpc('rentar_clip', { clip })
  if (error) return { error: error.message }
  return data as { ok: boolean; vence: string; saldo: number }
}

export async function miRenta(clip: string) {
  const { data } = await supabase.from('rentals')
    .select('vence').eq('clip_id', clip).gt('vence', new Date().toISOString())
    .order('vence', { ascending: false }).limit(1).maybeSingle()
  return data?.vence ?? null
}

/* ---------- Suscripcion ---------- */

export type Nivel = {
  id: string; nombre: string; descripcion: string | null
  precio_coins: number | null; orden: number; activo: boolean
}

export async function nivelesDe(creadora: string) {
  const { data, error } = await supabase.from('subscription_tiers')
    .select('id,nombre,descripcion,precio_coins,orden,activo')
    .eq('creator_id', creadora).eq('activo', true).order('orden')
  if (error) return [] as Nivel[]
  return (data ?? []) as Nivel[]
}

export async function misNiveles() {
  const { data: s } = await supabase.auth.getUser()
  if (!s.user) return [] as Nivel[]
  const { data } = await supabase.from('subscription_tiers')
    .select('id,nombre,descripcion,precio_coins,orden,activo')
    .eq('creator_id', s.user.id).eq('activo', true).order('orden')
  return (data ?? []) as Nivel[]
}

export async function crearNivel(
  nombre: string, precioCoins: number, descripcion?: string, orden = 0,
) {
  const { data, error } = await supabase.rpc('crear_nivel', {
    p_nombre: nombre, p_precio_coins: precioCoins,
    p_descripcion: descripcion ?? null, p_orden: orden,
  })
  if (error) return { error: error.message }
  return { id: data as string }
}

export async function borrarNivel(nivel: string) {
  const { error } = await supabase.rpc('borrar_nivel', { nivel })
  return error?.message ?? ''
}

export async function suscribirse(nivel: string) {
  const { data, error } = await supabase.rpc('suscribirse', { nivel })
  if (error) return { error: error.message }
  return data as { ok: boolean; hasta: string }
}

export async function cancelarSuscripcion(creadora: string) {
  const { error } = await supabase.rpc('cancelar_suscripcion', { creadora })
  return error?.message ?? ''
}

export async function miSuscripcion(creadora: string) {
  const { data } = await supabase.from('subscriptions')
    .select('periodo_fin,cancela_al_fin,estado')
    .eq('creator_id', creadora).eq('estado', 'activa')
    .gt('periodo_fin', new Date().toISOString()).maybeSingle()
  return data as { periodo_fin: string; cancela_al_fin: boolean } | null
}

/* ---------- Encargos ---------- */

export type Encargo = {
  id: string; soy_creadora: boolean; otra: string; otra_handle: string
  descripcion: string; coins: number; estado: string
  entrega_max: string | null; clip_id: string | null
  created_at: string; mensajes: number
}

export const ESTADO_ENCARGO: Record<string, { t: string; c: string }> = {
  propuesta:  { t: 'Propuesta',        c: '#FFB020' },
  negociando: { t: 'Negociando',       c: '#FFB020' },
  aceptado:   { t: 'Aceptado, falta pagar', c: '#00E5FF' },
  pagado:     { t: 'Pagado, por entregar',  c: '#00E5FF' },
  en_proceso: { t: 'En proceso',       c: '#00E5FF' },
  entregado:  { t: 'Entregado',        c: '#C8FF3D' },
  rechazado:  { t: 'Rechazado',        c: '#FF4444' },
  cancelado:  { t: 'Cancelado',        c: '#FF4444' },
}

export async function misEncargos() {
  const { data, error } = await supabase.rpc('mis_encargos')
  if (error) return [] as Encargo[]
  return (data ?? []) as Encargo[]
}

export async function crearEncargo(
  creadora: string, descripcion: string, oferta: number, dias = 7,
) {
  const { data, error } = await supabase.rpc('crear_encargo', {
    creadora, p_descripcion: descripcion, p_oferta: oferta, p_dias: dias,
  })
  if (error) return { error: error.message }
  return data as { ok: boolean; encargo: string }
}

export async function responderEncargo(encargo: string, cuerpo?: string, contraoferta?: number) {
  const { error } = await supabase.rpc('responder_encargo', {
    encargo, cuerpo: cuerpo ?? null, contraoferta: contraoferta ?? null,
  })
  return error?.message ?? ''
}

export async function aceptarEncargo(encargo: string) {
  const { error } = await supabase.rpc('aceptar_encargo', { encargo })
  return error?.message ?? ''
}

export async function pagarEncargo(encargo: string) {
  const { error } = await supabase.rpc('pagar_encargo', { encargo })
  return error?.message ?? ''
}

export async function entregarEncargo(encargo: string, clip: string) {
  const { error } = await supabase.rpc('entregar_encargo', { encargo, clip })
  return error?.message ?? ''
}

export async function mensajesEncargo(encargo: string) {
  const { data } = await supabase.from('custom_request_messages')
    .select('id,autor_id,cuerpo,oferta_coins,created_at')
    .eq('request_id', encargo).order('created_at')
  return (data ?? []) as {
    id: number; autor_id: string; cuerpo: string | null
    oferta_coins: number | null; created_at: string
  }[]
}

/* ---------- Blog ---------- */

export type Post = {
  id: string; titulo: string; cuerpo: string
  visibilidad: string; publicado_at: string | null; completo: boolean
}

export async function postsDe(creadora: string) {
  const { data, error } = await supabase.rpc('posts_de', { creadora })
  if (error) return [] as Post[]
  return (data ?? []) as Post[]
}

export async function guardarPost(
  titulo: string, cuerpo: string,
  visibilidad: 'publico' | 'suscriptores' = 'publico',
  publicado = true, id?: string,
) {
  const { data, error } = await supabase.rpc('guardar_post', {
    p_titulo: titulo, p_cuerpo: cuerpo, p_visibilidad: visibilidad,
    p_publicado: publicado, p_id: id ?? null,
  })
  if (error) return { error: error.message }
  return { id: data as string }
}

export async function borrarPost(id: string) {
  const { error } = await supabase.rpc('borrar_post', { p_id: id })
  return error?.message ?? ''
}

/* ---------- Caducidad ---------- */

export type ModoCaducidad = 'deja_de_venderse' | 'retiro_total'

/** Pone o quita la fecha de retiro de un clip propio.
 *
 *  Pasar null la quita. La base rechaza una fecha pasada: para quitarlo ahora
 *  mismo lo que corresponde es borrarlo, no fingir que caducó ayer. */
export async function fijarCaducidad(
  clip: string, cuando: string | null, modo: ModoCaducidad = 'deja_de_venderse',
) {
  const { error } = await supabase.rpc('fijar_caducidad', {
    clip, cuando, modo,
  })
  return error?.message ?? ''
}
