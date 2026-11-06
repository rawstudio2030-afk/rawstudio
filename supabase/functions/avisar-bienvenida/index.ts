// Bienvenida al registrarse.
//
// Era el unico momento del sitio que no mandaba nada a nadie. Alguien creaba
// su cuenta y la pantalla seguia; el correo que dio quedaba sin usarse hasta
// el dia que se le olvidara la contraseña. Un correo de bienvenida hace tres
// cosas: confirma que la direccion es la correcta, dice que se puede hacer
// desde ya, y deja una puerta a la que contestar.
//
// No se le manda a quien dio de alta administracion: no eligio registrarse,
// no tiene contraseña, y ese caso tiene su propio recorrido. Lo decide la
// consulta de la base, no esto.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10'

const EXPLORAR = 'https://rawstudio.biz/#/clip'
const ESTUDIO = 'https://rawstudio.biz/#/estudio'
const BUZON = 'hola@rawstudio.biz'

const responder = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } })

function igual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}

const esc = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export type Aviso = { id: string; quien: string; creadora: boolean; correo: string }

const TENUE = '#6E6A72'
const APAGADO = '#9C979F'

export function asunto(a: Aviso): string {
  return a.creadora ? 'Bienvenida a RAWstudio' : 'Ya estás dentro'
}

export function cuerpo(a: Aviso): string {
  const hola = a.quien ? `Hola ${esc(a.quien)},` : 'Hola,'
  const { color, titular, texto, extra, boton, enlace } = a.creadora
    ? {
        color: '#C8FF3D', titular: 'Ya tienes tu estudio',
        texto: 'Puedes subir desde ahora mismo, aunque tu identidad todavía no esté verificada: el clip se queda guardado y sale en cuanto se apruebe.',
        extra: `<p style="margin:10px 0 0;font:400 15px/1.6 system-ui;color:${APAGADO}">
                  El 80% de cada dólar es tuyo, sin cuota mensual y sin exclusividad.
                  Tu nombre real no aparece en ninguna pantalla.
                </p>`,
        boton: 'Ir a mi estudio', enlace: ESTUDIO,
      }
    : {
        color: '#FF2BD1', titular: 'Ya estás dentro',
        texto: 'Tu cuenta está lista. Cada video lleva tu nombre encima mientras lo ves, y lo que compras se queda en tu biblioteca.',
        extra: `<p style="margin:10px 0 0;font:400 15px/1.6 system-ui;color:${APAGADO}">
                  Si un día quieres publicar tú, en tu perfil está la casilla
                  «quiero publicar»: ahí se abre el estudio.
                </p>`,
        boton: 'Explorar', enlace: EXPLORAR,
      }
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
      contestamos. Si no fuiste tú quien creó esta cuenta, respóndenos y la
      cerramos.
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`
}

async function mandar(llave: string, a: string, asunto: string, html: string) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${llave}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: `RAWstudio <${BUZON}>`, to: [a], subject: asunto, html }),
  })
  if (!r.ok) throw new Error(`Resend HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`)
}

Deno.serve(async (req) => {
  const esperado = Deno.env.get('CRON_SECRET')
  if (!esperado) return responder({ error: 'Falta configurar CRON_SECRET' }, 500)
  if (!igual(req.headers.get('x-cron-secret') ?? '', esperado)) return responder({ error: 'No autorizado' }, 401)
  const llave = Deno.env.get('RESEND_API_KEY')
  if (!llave) return responder({ error: 'Falta configurar RESEND_API_KEY' }, 500)

  const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const peticion = await req.json().catch(() => ({})) as { muestra?: boolean }

  if (peticion.muestra) {
    const { data, error } = await supa.rpc('verificacion_pendiente')
    if (error) return responder({ error: error.message }, 500)
    const { admins } = data as { admins: { correo: string }[] }
    if (!admins?.length) return responder({ error: 'No hay a quien mandarle la muestra' }, 500)
    const casos: Aviso[] = [
      { id: 'm', quien: 'Dani', creadora: false, correo: '' },
      { id: 'm', quien: 'Nora', creadora: true, correo: '' },
    ]
    let ok = 0; const fallos: string[] = []
    for (const ad of admins) for (const c of casos) {
      try { await mandar(llave, ad.correo, `[muestra] ${asunto(c)}`, cuerpo(c)); ok++ }
      catch (e) { fallos.push((e as Error).message) }
    }
    return responder({ ok: fallos.length === 0, muestra: true, enviados: ok, fallos })
  }

  const { data, error } = await supa.rpc('bienvenidas_pendientes')
  if (error) return responder({ error: error.message }, 500)
  const { avisos, sin_correo } = data as { avisos: Aviso[]; sin_correo: number }
  if (!avisos.length) return responder({ ok: true, enviados: 0, sin_correo, motivo: 'nada que avisar' })

  const hechos: string[] = []; const fallos: string[] = []
  for (const a of avisos) {
    try { await mandar(llave, a.correo, asunto(a), cuerpo(a)); hechos.push(a.id) }
    catch (e) { fallos.push(`${a.id.slice(0, 8)}: ${(e as Error).message}`) }
  }
  let marcados = 0
  if (hechos.length) {
    const { data: n, error: e } = await supa.rpc('marcar_bienvenida', { ids: hechos })
    if (e) return responder({ ok: false, enviados: hechos.length, error_al_marcar: e.message }, 500)
    marcados = (n as number) ?? 0
  }
  return responder({ ok: fallos.length === 0, enviados: hechos.length, marcados, sin_correo, fallos })
})
