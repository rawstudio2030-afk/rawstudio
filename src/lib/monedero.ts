import { supabase } from './supabase'

export type Movimiento = {
  id: number
  user_id: string
  delta: number
  motivo: 'recarga' | 'compra_clip' | 'venta_clip' | 'propina' | 'ajuste_admin' | 'reembolso' | 'retiro'
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
  retiro: 'Retiro',
}

/** De que lado del dinero esta cada movimiento.
 *
 *  El motivo por si solo no alcanza: 'propina' sirve para las dos cosas, y el
 *  signo es lo que dice si la diste o la recibiste. Por eso esto mira el
 *  motivo Y el delta.
 *
 *  'cuenta' es todo lo que no es ni ganar ni gastar —recargas, retiros,
 *  ajustes, devoluciones—: mueven el saldo pero no son actividad de la
 *  plataforma, y mezclarlos con las ventas falsearia el total de lo ganado. */
export type Cara = 'gane' | 'gaste' | 'cuenta'

export function caraDe(m: Movimiento): Cara {
  if (m.motivo === 'venta_clip') return 'gane'
  if (m.motivo === 'compra_clip') return 'gaste'
  if (m.motivo === 'propina') return m.delta > 0 ? 'gane' : 'gaste'
  return 'cuenta'
}

/** Los totales de la pantalla de dinero, en centavos. */
export function totales(movs: Movimiento[]) {
  let gane = 0, gaste = 0, retirado = 0
  for (const m of movs) {
    const c = caraDe(m)
    if (c === 'gane') gane += m.delta
    else if (c === 'gaste') gaste += -m.delta
    else if (m.motivo === 'retiro') retirado += -m.delta
  }
  return { gane, gaste, retirado }
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
