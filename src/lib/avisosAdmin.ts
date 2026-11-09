/* Avisos del administrador: lo que LLEGA a la plataforma, no solo cuantas cosas hay.
 *
 * Es el equivalente, para el panel, del centro de avisos de las cuentas
 * (`avisos.ts`), con datos APARTE: `admin_avisos` arma la lista al pedirla desde las
 * colas reales (moderacion, verificacion, denuncias, retiros, consultas, ajustes por
 * firmar, purga) y `admin_avisos_marcar_vistos` guarda cuando ESTA administradora
 * la abrio. No se mezcla con `mis_avisos`: lo personal y lo de la plataforma son
 * cosas distintas, y los tipos tambien.
 *
 * La campana del panel cuenta SOLO lo nuevo (llego despues del ultimo «visto»), no
 * los pendientes: los badges del menu ya cuentan los pendientes, y decir el mismo
 * numero dos veces no informa. La lista sí marca los urgentes y los mantiene
 * mientras no se resuelvan en su modulo.
 */
import { supabase } from './supabase'

export type TipoAvisoAdmin =
  'moderacion' | 'verificacion' | 'denuncia' | 'retiro' | 'consulta' | 'ajuste' | 'purga'

export type AvisoAdmin = {
  clave: string
  tipo: TipoAvisoAdmin
  titulo: string
  detalle: string
  /** Ruta del panel a la que lleva (puede traer ?abrir=). */
  ruta: string
  at: string
  /** Sigue pendiente y toca a alguien: se queda en la lista hasta resolverse. */
  urgente: boolean
  /** Llego despues del ultimo «visto» de esta administradora. */
  nuevo: boolean
}

/** Cuando cambia algo que afecta a la campana (abrir la lista, por ejemplo). */
export const EVENTO_AVISOS_ADMIN = 'avisosadmin:cambio'

export async function avisosAdmin(): Promise<{ filas: AvisoAdmin[] } | { error: string }> {
  const { data, error } = await supabase.rpc('admin_avisos')
  if (error) return { error: error.message }
  return { filas: (data ?? []) as AvisoAdmin[] }
}

/** Devuelve el texto del error, o '' si se marco. */
export async function marcarAvisosAdminVistos(): Promise<string> {
  const { error } = await supabase.rpc('admin_avisos_marcar_vistos')
  if (error) return error.message
  window.dispatchEvent(new Event(EVENTO_AVISOS_ADMIN))
  return ''
}

/** Lo que cuenta la campana: SOLO lo nuevo. No suma los pendientes. */
export const contarNuevosAdmin = (filas: AvisoAdmin[]): number => filas.filter(a => a.nuevo).length
