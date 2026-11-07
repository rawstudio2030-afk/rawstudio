/* Consultas por Telegram: lo que el navegador le pide al servidor.
 *
 * Todo pasa por funciones (`consulta_iniciar`, `telegram_vincular`,
 * `telegram_estado`, `telegram_desvincular`, `creadora_acepta_consultas`). Las
 * tablas y las funciones del bot no se tocan desde aqui. El `chat_id` de
 * Telegram nunca llega al navegador, y el token del bot tampoco existe aqui.
 *
 * El codigo que devuelven es de un solo uso y dura 15 minutos: no se guarda.
 * Se convierte en un enlace `t.me/<bot>?start=<codigo>` y se abre.
 */
import { supabase } from './supabase'
import { BOT_TELEGRAM } from '../content/consultas'

export type Enlace = { url: string } | { error: string }

const enlaceDe = (codigo: unknown): Enlace =>
  typeof codigo === 'string' && codigo && BOT_TELEGRAM
    ? { url: `https://t.me/${BOT_TELEGRAM}?start=${codigo}` }
    : { error: 'No pude armar el enlace. Intenta de nuevo.' }

/** ¿Esta creadora ya vinculo su Telegram? Si no, no se ofrece consultarla. */
export async function creadoraAceptaConsultas(creadora: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('creadora_acepta_consultas', { p_creadora: creadora })
  return !error && data === true
}

/** Quien consulta pide su enlace al bot para un clip. */
export async function iniciarConsulta(clip: string): Promise<Enlace> {
  const { data, error } = await supabase.rpc('consulta_iniciar', { p_clip: clip })
  if (error) return { error: error.message }
  return enlaceDe((data as { codigo?: string } | null)?.codigo)
}

/** La creadora pide su enlace para vincular SU Telegram. */
export async function vincularTelegram(): Promise<Enlace> {
  const { data, error } = await supabase.rpc('telegram_vincular')
  if (error) return { error: error.message }
  return enlaceDe((data as { codigo?: string } | null)?.codigo)
}

export async function telegramVinculado(): Promise<boolean> {
  const { data, error } = await supabase.rpc('telegram_estado')
  return !error && (data as { vinculada?: boolean } | null)?.vinculada === true
}

/** `''` si salio bien; si no, el mensaje del servidor. */
export async function desvincularTelegram(): Promise<string> {
  const { error } = await supabase.rpc('telegram_desvincular')
  return error?.message ?? ''
}
