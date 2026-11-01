/* Cobrar: la cuenta bancaria y las solicitudes de retiro.
 *
 * La cuenta se escribe directo contra la tabla porque su politica de RLS es
 * `for all` sobre la propia fila: no hace falta funcion. La solicitud SI pasa
 * por funcion, porque tiene reglas —minimo, disponible, identidad verificada—
 * que no pueden vivir en el cliente.
 */
import { supabase } from './supabase'

export type Regimen = 'persona_fisica' | 'rif' | 'moral' | 'sin_registro'

export const NOMBRE_REGIMEN: Record<Regimen, string> = {
  persona_fisica: 'Persona física con actividad empresarial',
  rif: 'RIF / Resico',
  moral: 'Persona moral',
  sin_registro: 'Sin registro ante el SAT',
}

export type CuentaCobro = {
  titular: string
  clabe: string
  banco: string | null
  rfc: string | null
  regimen: Regimen
  verificado: boolean
}

export type InfoRetiro = {
  minimo: number        // centavos
  disponible: number    // centavos
  tiene_cuenta: boolean
  puede_cobrar: boolean
}

export type Solicitud = {
  id: string
  coins: number
  estado: 'pendiente' | 'aprobada' | 'pagada' | 'rechazada'
  motivo_rechazo: string | null
  created_at: string
  resuelta_at: string | null
}

export const NOMBRE_ESTADO: Record<Solicitud['estado'], string> = {
  pendiente: 'En revisión',
  aprobada: 'Aprobada',
  pagada: 'Pagada',
  rechazada: 'Rechazada',
}

export async function infoRetiro(): Promise<InfoRetiro | null> {
  const { data, error } = await supabase.rpc('retiro_info')
  if (error) { console.warn('[retiro] info:', error.message); return null }
  return data as InfoRetiro
}

export async function miCuenta(): Promise<CuentaCobro | null> {
  const { data, error } = await supabase.from('payout_accounts')
    .select('titular,clabe,banco,rfc,regimen,verificado').maybeSingle()
  if (error) { console.warn('[retiro] cuenta:', error.message); return null }
  return (data as CuentaCobro) ?? null
}

export async function guardarCuenta(id: string, c: {
  titular: string; clabe: string; banco: string; rfc: string; regimen: Regimen
}): Promise<string | null> {
  const { error } = await supabase.from('payout_accounts').upsert({
    user_id: id,
    titular: c.titular.trim(),
    clabe: c.clabe.replace(/\D/g, ''),
    banco: c.banco.trim() || null,
    // El RFC es opcional, pero la base exige que si viene, venga bien formado.
    rfc: c.rfc.trim().toUpperCase() || null,
    regimen: c.regimen,
    updated_at: new Date().toISOString(),
  })
  if (!error) return null
  // 23514 es violacion de CHECK; aqui solo hay dos y los dos son formatos.
  if (error.code === '23514') {
    return /clabe/i.test(error.message)
      ? 'La CLABE tiene que ser de 18 dígitos.'
      : 'Ese RFC no tiene el formato que espera el SAT.'
  }
  return error.message
}

export async function pedirRetiro(centavos: number): Promise<string | null> {
  const { error } = await supabase.rpc('solicitar_retiro', { cantidad: centavos })
  return error ? error.message : null
}

export async function misSolicitudes(): Promise<Solicitud[]> {
  const { data, error } = await supabase.from('solicitudes_retiro')
    .select('id,coins,estado,motivo_rechazo,created_at,resuelta_at')
    .order('created_at', { ascending: false }).limit(50)
  if (error) { console.warn('[retiro] solicitudes:', error.message); return [] }
  return (data ?? []) as Solicitud[]
}

/* ---------- CLABE ---------- */

/** Digito verificador de una CLABE (18 digitos).
 *
 *  Se pondera cada uno de los primeros 17 por 3, 7, 1 repetidos, se suma el
 *  ultimo digito de cada producto, y el verificador es lo que falta para
 *  llegar a la decena.
 *
 *  Se usa como AVISO y no como bloqueo a proposito. Una CLABE mal tecleada
 *  manda el dinero al limbo o a otra persona, asi que avisar vale mucho; pero
 *  si esta implementacion tuviera un error, bloquear dejaria a alguien sin
 *  poder cobrar nunca. Avisando, el peor caso es un aviso de mas. */
export function clabeCuadra(clabe: string): boolean {
  const d = clabe.replace(/\D/g, '')
  if (d.length !== 18) return false
  const pesos = [3, 7, 1]
  let suma = 0
  for (let i = 0; i < 17; i++) suma += (Number(d[i]) * pesos[i % 3]) % 10
  return (10 - (suma % 10)) % 10 === Number(d[17])
}
