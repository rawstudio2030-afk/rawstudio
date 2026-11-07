/* Centro de avisos: lo que le pasa a mi cuenta y lo que me toca hacer.
 *
 * La lista la arma el servidor (`mis_avisos`) leyendo lo que ya existe; aqui
 * solo se pide y se cuenta. «Urgente» es algo que me toca hacer y se queda en la
 * lista mientras siga pendiente; el resto es informativo y cuenta como nuevo
 * hasta que abro la lista (`avisos_marcar_vistos`).
 */
import { supabase } from './supabase'

export type TipoAviso =
  'consulta' | 'encargo' | 'venta' | 'comentario' | 'cuenta' | 'dinero' | 'compra'

export type Aviso = {
  clave: string
  tipo: TipoAviso
  titulo: string
  detalle: string
  /** Ruta de la app a la que lleva. */
  ruta: string
  at: string
  urgente: boolean
  nuevo: boolean
}

/** Cuando cambia algo que afecta a la campana (abrir la lista, por ejemplo). */
export const EVENTO_AVISOS = 'avisos:cambio'

export async function misAvisos(): Promise<{ filas: Aviso[] } | { error: string }> {
  const { data, error } = await supabase.rpc('mis_avisos')
  if (error) return { error: error.message }
  return { filas: (data ?? []) as Aviso[] }
}

export async function marcarAvisosVistos(): Promise<void> {
  const { error } = await supabase.rpc('avisos_marcar_vistos')
  if (!error) window.dispatchEvent(new Event(EVENTO_AVISOS))
}

/** Lo que muestra la campana: lo que me toca hacer mas lo nuevo. */
export function contarAvisos(filas: Aviso[]): number {
  return filas.filter(a => a.urgente || a.nuevo).length
}
