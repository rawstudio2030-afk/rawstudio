import { supabase } from './supabase'

export type Movimiento = {
  id: number
  user_id: string
  delta: number
  motivo: 'recarga' | 'compra_clip' | 'venta_clip' | 'propina' | 'ajuste_admin' | 'reembolso'
  ref_id: string | null
  nota: string | null
  created_at: string
}

export const NOMBRE_MOTIVO: Record<Movimiento['motivo'], string> = {
  recarga: 'Recarga',
  compra_clip: 'Desbloqueo',
  venta_clip: 'Venta',
  propina: 'Propina',
  ajuste_admin: 'Ajuste',
  reembolso: 'Reembolso',
}

/** El saldo se DERIVA de la suma del libro, no se guarda. Asi nunca puede
 *  quedar desincronizado de sus movimientos. */
export async function saldo(): Promise<number> {
  const { data, error } = await supabase.rpc('saldo')
  if (error) { console.warn('[monedero] saldo:', error.message); return 0 }
  return (data as number) ?? 0
}

export async function movimientos(limite = 50): Promise<Movimiento[]> {
  const { data, error } = await supabase.from('coin_ledger')
    .select('*').order('created_at', { ascending: false }).limit(limite)
  if (error) { console.warn('[monedero] movimientos:', error.message); return [] }
  return (data ?? []) as Movimiento[]
}

export async function comprarClip(clipId: string): Promise<{ ok: boolean; error?: string; saldo?: number }> {
  const { data, error } = await supabase.rpc('comprar_clip', { clip: clipId })
  if (error) return { ok: false, error: error.message }
  const r = data as { ok: boolean; saldo: number }
  return { ok: r.ok, saldo: r.saldo }
}

export async function tengoElClip(clipId: string): Promise<boolean> {
  const { data } = await supabase.from('purchases')
    .select('id').eq('clip_id', clipId).maybeSingle()
  return !!data
}

export type Comprado = {
  id: string
  clip_id: string
  price_coins: number
  created_at: string
  clips: {
    id: string; title: string; cover_path: string | null; duration_s: number | null
    profiles: { handle: string; display_name: string } | null
  } | null
}

export async function misCompras(): Promise<Comprado[]> {
  const { data, error } = await supabase.from('purchases')
    .select('id,clip_id,price_coins,created_at,clips(id,title,cover_path,duration_s,profiles!clips_creator_id_fkey(handle,display_name))')
    .order('created_at', { ascending: false })
  if (error) { console.warn('[monedero] compras:', error.message); return [] }
  return (data ?? []) as unknown as Comprado[]
}

export async function ajustarSaldo(id: string, cantidad: number, motivo: string) {
  const { error } = await supabase.rpc('admin_ajustar_saldo',
    { objetivo: id, cantidad, motivo_texto: motivo })
  return error ? error.message : null
}
