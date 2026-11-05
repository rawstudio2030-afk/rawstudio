import { supabase } from './supabase'
import { leido, noSePudo, type Lectura } from './lectura'

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
export async function saldo(): Promise<Lectura<number>> {
  const { data, error } = await supabase.rpc('saldo')
  // Cero es una respuesta legitima —hay cuentas sin saldo— y por eso devolver
  // cero cuando la consulta falla era de lo peor de esta familia: a quien si
  // tiene dinero se le enseñaba que no tiene ninguno.
  if (error) return noSePudo(0, error)
  return leido((data as number) ?? 0)
}

/** MIS movimientos. El filtro por `user_id` no es decorativo: la politica de
 *  `coin_ledger` dice «user_id = auth.uid() OR es_admin()», asi que sin el
 *  filtro un administrador recibia el libro ENTERO en su monedero personal.
 *
 *  Como se vio: en la pantalla de Dinero de la cuenta de administracion
 *  aparecian tres ajustes de 100 dolares de @scarlettcum047 y uno de 2 de
 *  @lumen, mezclados con los dos propios, como si fueran movimientos suyos.
 *
 *  Y lo peor no era la lista, era `totales()`, que suma sobre ella. Hoy no se
 *  notaba porque todo lo ajeno eran `ajuste_admin`, que `caraDe()` manda a
 *  'cuenta' y no se cuenta en ningun total. Pero en cuanto una creadora venda
 *  un clip, el «Ganado» del monedero personal de quien administra incluiria la
 *  venta de ella; y sus retiros, el «Retirado». Numeros de otra persona
 *  presentados como propios.
 *
 *  El panel sigue viendo todo —para eso esta `admin_finanzas`—; lo que no debe
 *  es colarse en el monedero personal. Que `saldo()` nunca tuvo este problema
 *  lo hacia mas confuso: es una funcion de la base que usa auth.uid(), asi que
 *  el saldo era correcto mientras la lista que supuestamente lo explicaba no
 *  lo era. */
export async function movimientos(limite = 50): Promise<Lectura<Movimiento[]>> {
  const { data: s } = await supabase.auth.getSession()
  const yo = s.session?.user.id
  // Sin sesion no hay movimientos que mostrar, y pedirlos sin filtro seria
  // volver al fallo de arriba por la puerta de atras.
  if (!yo) return leido([])

  const { data, error } = await supabase.from('coin_ledger')
    .select('*').eq('user_id', yo)
    .order('created_at', { ascending: false }).limit(limite)
  if (error) return noSePudo([], error)
  return leido((data ?? []) as Movimiento[])
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

/** Lo que esta persona ya pago. Si esto falla y se devuelve lista vacia, a
 *  quien compro se le dice que no ha comprado nada: pierde el acceso a lo que
 *  pago, y encima parece que nunca lo pago. */
export async function misCompras(): Promise<Lectura<Comprado[]>> {
  const { data, error } = await supabase.from('purchases')
    .select('id,clip_id,price_coins,created_at,clips(id,title,cover_path,duration_s,profiles!clips_creator_id_fkey(handle,display_name))')
    .order('created_at', { ascending: false })
  if (error) return noSePudo([], error)
  return leido((data ?? []) as unknown as Comprado[])
}

export async function ajustarSaldo(id: string, cantidad: number, motivo: string) {
  const { error } = await supabase.rpc('admin_ajustar_saldo',
    { objetivo: id, cantidad, motivo_texto: motivo })
  return error ? error.message : null
}
