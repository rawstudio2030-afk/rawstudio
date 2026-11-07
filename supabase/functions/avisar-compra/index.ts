// Dos correos por cada pago: el recibo a quien compro y el aviso a quien vendio.
//
// ---------- Por que ----------
//
// Que alguien pague por algo es el momento central de la plataforma, y no
// avisaba a nadie. Quien compraba no recibia ningun comprobante —en una
// plataforma de pago, eso solo ya se ve raro—, y quien vendia no se enteraba
// de que vendio salvo que abriera su monedero por casualidad.
//
// Son dos correos distintos de un mismo evento, y por eso salen de la misma
// funcion: la fila se marca como avisada cuando salieron LOS DOS. Si sale el
// recibo y falla el aviso de venta, la fila se queda sin marcar y la siguiente
// pasada manda otra vez los dos; mejor un recibo repetido que una venta sin
// avisar.
//
// Hermana de `avisar-creadora`. Misma forma, plantilla aparte.
//
// ---------- Que NO lleva ----------
//
// El recibo no dice quien es la creadora mas alla de su nombre artistico, y
// el aviso de venta no dice quien compro mas alla de su nombre artistico. Ni
// correos cruzados, ni datos bancarios, ni el enlace al video: el video se ve
// en la biblioteca, donde el acceso se comprueba cada vez.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10'

const BIBLIOTECA = 'https://rawstudio.biz/#/library'
const DINERO = 'https://rawstudio.biz/#/wallet'
const BUZON = 'hola@rawstudio.biz'

const responder = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s, headers: { 'Content-Type': 'application/json' },
  })

function igual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}

const esc = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
   .replace(/"/g, '&quot;')

/** Centavos de dolar a texto: 240 -> $2.40. */
const usd = (centavos: number) => '$' + (centavos / 100).toFixed(2)

/** Una fecha como la diria alguien: «el 12 de noviembre a las 3:40 p. m.». */
function cuando(iso: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit',
    timeZone: 'America/Mexico_City',
  }).format(new Date(iso))
}

export type Aviso = {
  tipo: 'compra' | 'renta'
  id: string
  clip: string
  /** `album` si lo comprado son fotos; un aviso anterior a los albumes no lo trae (= video). */
  formato?: 'video' | 'album'
  precio: number
  neto: number
  vence: string | null
  comprador: string
  correo_comprador: string | null
  creadora: string
  correo_creadora: string | null
}

const TENUE = '#6E6A72'
const APAGADO = '#9C979F'

function documento(color: string, titular: string, hola: string, texto: string,
                   extra: string, boton: string, enlace: string): string {
  return `<!doctype html>
<html lang="es"><body style="margin:0;background:#08080A">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#08080A">
<tr><td align="center" style="padding:28px 14px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#111116;border:1px solid rgba(255,255,255,.12)">
  <tr><td style="padding:30px 26px">
    <div style="font:700 10px/1 system-ui;letter-spacing:2px;text-transform:uppercase;color:${color}">RAWstudio</div>
    <h1 style="margin:18px 0 0;font:700 25px/1.2 system-ui;color:#F2F0F3">${titular}</h1>
    <p style="margin:16px 0 0;font:400 15px/1.6 system-ui;color:#F2F0F3">${hola}</p>
    <p style="margin:10px 0 0;font:400 15px/1.6 system-ui;color:#F2F0F3">${texto}</p>
    ${extra}
    <a href="${enlace}" style="display:inline-block;margin-top:24px;background:${color};color:#08080A;padding:14px 22px;font:700 10px/1 system-ui;letter-spacing:1.6px;text-transform:uppercase;text-decoration:none">${boton}</a>
    <p style="margin:26px 0 0;padding-top:18px;border-top:1px solid rgba(255,255,255,.12);font:400 12px/1.6 system-ui;color:${TENUE}">
      Este correo sale de ${BUZON} y lo lee una persona: si contestas, te
      contestamos. Nunca te vamos a pedir datos de pago por correo.
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`
}

function renglon(etiqueta: string, valor: string, color = '#F2F0F3') {
  return `<tr>
    <td style="padding:7px 0;font:400 12px/1 system-ui;color:${APAGADO}">${etiqueta}</td>
    <td align="right" style="padding:7px 0;font:400 14px/1 'Space Mono',monospace;color:${color}">${valor}</td>
  </tr>`
}

/* ---------- El recibo, a quien compro ---------- */

export function asuntoRecibo(a: Aviso): string {
  return a.tipo === 'renta'
    ? `Rentaste «${a.clip}»`
    : `Compraste «${a.clip}»`
}

export function recibo(a: Aviso): string {
  const hola = a.comprador ? `Hola ${esc(a.comprador)},` : 'Hola,'
  const texto = a.tipo === 'renta'
    ? `Rentaste <b>«${esc(a.clip)}»</b> de ${esc(a.creadora)}. Lo tienes en tu biblioteca hasta ${a.vence ? 'el ' + cuando(a.vence) : 'que venza el plazo'}.`
    : `Compraste <b>«${esc(a.clip)}»</b> de ${esc(a.creadora)}. Es tuyo: lo tienes en tu biblioteca para siempre.`
  const tabla = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;border-top:1px solid rgba(255,255,255,.12);border-bottom:1px solid rgba(255,255,255,.12)">
    ${renglon(a.tipo === 'renta' ? 'Renta' : 'Compra', usd(a.precio), '#F2F0F3')}
    ${renglon('Se descontó de tu saldo', usd(a.precio), '#FF2BD1')}
  </table>
  <p style="margin:14px 0 0;font:400 12px/1.6 system-ui;color:${APAGADO}">
    ${a.formato === 'album'
      ? 'Las fotos llevan tu nombre encima mientras las ves. Si aparecen en otro lado, esa marca dice de qué cuenta salieron.'
      : 'El video lleva tu nombre encima mientras lo ves. Si aparece en otro lado, esa marca dice de qué cuenta salió.'}
  </p>`
  return documento('#FF2BD1', a.tipo === 'renta' ? 'Tu renta está lista' : 'Tu compra está lista',
                   hola, texto, tabla, 'Ir a mi biblioteca', BIBLIOTECA)
}

/* ---------- El aviso de venta, a la creadora ---------- */

export function asuntoVenta(a: Aviso): string {
  return a.tipo === 'renta'
    ? `Te rentaron «${a.clip}»: ${usd(a.neto)} para ti`
    : `Vendiste «${a.clip}»: ${usd(a.neto)} para ti`
}

export function venta(a: Aviso): string {
  const hola = a.creadora ? `Hola ${esc(a.creadora)},` : 'Hola,'
  const texto = a.tipo === 'renta'
    ? `${esc(a.comprador) || 'Alguien'} rentó <b>«${esc(a.clip)}»</b>${a.vence ? ' hasta el ' + cuando(a.vence) : ''}.`
    : `${esc(a.comprador) || 'Alguien'} compró <b>«${esc(a.clip)}»</b>.`
  const comision = a.precio - a.neto
  const tabla = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;border-top:1px solid rgba(255,255,255,.12);border-bottom:1px solid rgba(255,255,255,.12)">
    ${renglon('Pagó', usd(a.precio))}
    ${renglon('Comisión de la plataforma', '−' + usd(comision), APAGADO)}
    ${renglon('Ya está en tu saldo', usd(a.neto), '#C8FF3D')}
  </table>`
  return documento('#C8FF3D', 'Vendiste', hola, texto, tabla, 'Ver mi dinero', DINERO)
}

async function mandar(llave: string, a: string, asunto: string, html: string) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${llave}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: `RAWstudio <${BUZON}>`, to: [a], subject: asunto, html }),
  })
  if (!r.ok) throw new Error(`Resend HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`)
}

/* ---------- Modo muestra: los dos correos, a administracion ---------- */

async function muestra(admins: { correo: string }[], llave: string): Promise<Response> {
  const vence = new Date(Date.now() + 48 * 3600 * 1000).toISOString()
  const casos: Aviso[] = [
    { tipo: 'compra', id: 'muestra', clip: 'Window Seat', precio: 240, neto: 192, vence: null,
      comprador: 'Dani', correo_comprador: '', creadora: 'Nora Hot', correo_creadora: '' },
    { tipo: 'renta', id: 'muestra', clip: 'Quiet Room', precio: 120, neto: 96, vence,
      comprador: 'Dani', correo_comprador: '', creadora: 'Nora Hot', correo_creadora: '' },
    { tipo: 'compra', id: 'muestra', clip: 'Golden Hour', formato: 'album', precio: 500, neto: 400, vence: null,
      comprador: 'Dani', correo_comprador: '', creadora: 'Nora Hot', correo_creadora: '' },
  ]
  let ok = 0; const fallos: string[] = []
  for (const ad of admins) for (const c of casos) {
    for (const [asunto, html] of [[asuntoRecibo(c), recibo(c)], [asuntoVenta(c), venta(c)]]) {
      try { await mandar(llave, ad.correo, `[muestra] ${asunto}`, html); ok++ }
      catch (e) { fallos.push(`${c.tipo}: ${(e as Error).message}`) }
    }
  }
  return responder({ ok: fallos.length === 0, muestra: true, enviados: ok, fallos })
}

/* ---------- Principal ---------- */

Deno.serve(async (req) => {
  const esperado = Deno.env.get('CRON_SECRET')
  if (!esperado) return responder({ error: 'Falta configurar CRON_SECRET' }, 500)
  if (!igual(req.headers.get('x-cron-secret') ?? '', esperado)) {
    return responder({ error: 'No autorizado' }, 401)
  }
  const llave = Deno.env.get('RESEND_API_KEY')
  if (!llave) return responder({ error: 'Falta configurar RESEND_API_KEY' }, 500)

  const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const peticion = await req.json().catch(() => ({})) as { muestra?: boolean }

  if (peticion.muestra) {
    const { data, error } = await supa.rpc('verificacion_pendiente')
    if (error) return responder({ error: error.message }, 500)
    const { admins } = data as { admins: { correo: string }[] }
    if (!admins?.length) return responder({ error: 'No hay a quien mandarle la muestra' }, 500)
    return await muestra(admins, llave)
  }

  const { data, error } = await supa.rpc('compras_para_avisar')
  if (error) return responder({ error: error.message }, 500)
  const { avisos, sin_correo } = data as { avisos: Aviso[]; sin_correo: number }
  if (!avisos.length) return responder({ ok: true, enviados: 0, sin_correo, motivo: 'nada que avisar' })

  // Una fila se marca solo cuando salieron LOS DOS correos que le tocan. Si
  // alguno de los dos no tiene correo (cuenta sin direccion), ese lado se
  // salta y no cuenta como fallo: no se arregla reintentando.
  const hechos: { id: string; tipo: string }[] = []
  const fallos: string[] = []
  let enviados = 0
  for (const a of avisos) {
    try {
      if (a.correo_comprador) { await mandar(llave, a.correo_comprador, asuntoRecibo(a), recibo(a)); enviados++ }
      if (a.correo_creadora)  { await mandar(llave, a.correo_creadora,  asuntoVenta(a),  venta(a));  enviados++ }
      hechos.push({ id: a.id, tipo: a.tipo })
    } catch (e) { fallos.push(`${a.tipo} ${a.id.slice(0, 8)}: ${(e as Error).message}`) }
  }

  let marcados = 0
  if (hechos.length) {
    const { data: n, error: e } = await supa.rpc('marcar_compra_avisada', { avisos: hechos })
    if (e) return responder({ ok: false, enviados, error_al_marcar: e.message,
      aviso: 'Los correos salieron pero no se marcaron: se repetirán en la siguiente pasada.' }, 500)
    marcados = (n as number) ?? 0
  }
  return responder({ ok: fallos.length === 0, enviados, marcados, sin_correo, fallos })
})
