// Vence por RELOJ los mensajes pagados de consulta que no recibieron respuesta.
//
// ---------- Por que existe ----------
// `consultas_vencer()` marca como vencidos los mensajes sin respuesta pasado su
// plazo, DEVUELVE el saldo al cliente y dice a quien avisar. Pero el bot solo la
// llamaba cuando alguien le escribia: con poco trafico, un mensaje podia llevar
// dias vencido sin devolver el saldo ni avisar, aunque la web ya lo mostrara
// vencido. Esta funcion la llama el reloj de `.github/workflows/tareas.yml`
// (cada dos horas) y es el camino PRINCIPAL; la llamada dentro de `telegram-bot`
// se queda como red de seguridad.
//
// ---------- Sin doble devolucion ni doble aviso ----------
// `consultas_vencer()` solo actua sobre las filas que PASAN de 'enviado' a
// 'vencido' en esa misma sentencia, y devuelve el saldo solo de esas. Correrla dos
// veces seguidas, o a la vez desde aqui y desde el bot, no devuelve ni avisa dos
// veces: la segunda no encuentra nada.
//
// ---------- Autenticacion ----------
// Igual que `avisar-retiro`: corre sin JWT y exige la cabecera `x-cron-secret`,
// que debe coincidir con el secreto del proyecto CRON_SECRET (el mismo que ya usan
// Actions y las otras funciones de cron; no se inventa otro). No se separa del
// webhook de Telegram a proposito: ese autentica con
// `x-telegram-bot-api-secret-token` y los dos caminos no se cruzan.
//
// ---------- Secretos ----------
// Lee CRON_SECRET, TELEGRAM_BOT_TOKEN y la llave de servicio del ENTORNO de la
// funcion. Ninguno se escribe en una respuesta ni en un registro: un error de
// `fetch` a Telegram trae la URL con el token, y se limpia antes de registrarlo.
// La respuesta solo lleva conteos.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10'
import { avisosDeVencido, sinToken, type Vencido } from '../_shared/consultas.ts'

const responder = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s, headers: { 'Content-Type': 'application/json' },
  })

/** Comparacion que no se corta en la primera letra distinta. */
function igual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}

/** Manda un texto plano (sin parse_mode: lo que escribe una persona nunca se
 *  interpreta como formato). Devuelve si Telegram lo acepto. */
async function decir(token: string, chat: number, texto: string): Promise<boolean> {
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text: texto.slice(0, 4000), disable_web_page_preview: true }),
    })
    const j = await r.json()
    return !!j?.ok
  } catch (e) {
    console.error('sendMessage', sinToken(e, token))
    return false
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return responder({ error: 'Metodo no permitido' }, 405)

  const esperado = Deno.env.get('CRON_SECRET')
  if (!esperado) {
    return responder({
      error: 'Falta configurar CRON_SECRET',
      ayuda: 'Supabase -> Edge Functions -> Secrets -> agregar CRON_SECRET',
    }, 500)
  }
  if (!igual(req.headers.get('x-cron-secret') ?? '', esperado)) {
    return responder({ error: 'No autorizado' }, 401)
  }

  const supa = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Primero vencer y devolver: es lo que importa. Los avisos son lo de menos y,
  // si faltara el token, el saldo ya volvio.
  const { data, error } = await supa.rpc('consultas_vencer')
  if (error) {
    console.error('consultas_vencer', error.message)
    return responder({ ok: false, error: error.message }, 500)
  }
  const filas = (data ?? []) as Vencido[]
  const devueltos = filas.filter(v => (v.devuelto_coins ?? 0) > 0).length

  // «Nada vencido» es el caso normal y es un exito: el workflow busca "ok":true.
  if (filas.length === 0) return responder({ ok: true, vencidos: 0, devueltos: 0, avisos_enviados: 0, avisos_fallidos: 0 })

  const token = Deno.env.get('TELEGRAM_BOT_TOKEN')
  if (!token) {
    return responder({
      ok: false, vencidos: filas.length, devueltos,
      error: 'Se vencio y se devolvio, pero falta TELEGRAM_BOT_TOKEN y no se avisó a nadie',
    }, 500)
  }

  let enviados = 0, fallidos = 0
  for (const v of filas) {
    const t = avisosDeVencido(v)
    if (v.chat_cliente && t.cliente) (await decir(token, v.chat_cliente, t.cliente)) ? enviados++ : fallidos++
    if (v.chat_creadora && t.creadora) (await decir(token, v.chat_creadora, t.creadora)) ? enviados++ : fallidos++
  }

  // Un aviso que no salio NO se puede reintentar (la fila ya esta vencida y no
  // vuelve a aparecer), asi que se cuenta pero no pone el trabajo en rojo: el saldo
  // ya volvio y se ve en el monedero.
  return responder({ ok: true, vencidos: filas.length, devueltos, avisos_enviados: enviados, avisos_fallidos: fallidos })
})
