// Aviso por correo de archivos que esperan purga.
//
// Lo dispara una tarea programada de GitHub Actions una vez por semana (ver
// .github/workflows/aviso-purga.yml). Existe porque el contador del panel
// solo avisa a quien abre el panel, y el caso real que lo motivo fue
// justamente que nadie lo abrio durante treinta y siete dias.
//
// ---------- Como se protege ----------
//
// Esta funcion corre SIN JWT (verify_jwt = false en config.toml): quien la
// llama es un cron, no una persona con sesion. A cambio exige un secreto
// propio en la cabecera `x-cron-secret`, que vive como secreto del proyecto
// en Supabase y como secreto del repositorio en GitHub.
//
// Es un secreto DEDICADO y no la llave de servicio a proposito. GitHub guarda
// entonces una cadena al azar que solo sirve para decir «manda el aviso de
// purga»; si se filtrara, lo peor que consigue alguien es provocar un correo.
// La llave de servicio —que puede todo en la base— no sale nunca del proyecto:
// la funcion la lee de su propio entorno, donde Supabase ya la pone.
//
// LA LLAVE DE RESEND TAMPOCO ESTA AQUI. Se lee de RESEND_API_KEY, igual que
// en `enviar-campana`. Este archivo es publico; las llaves no lo son.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10'

const PANEL = 'https://rawstudio.biz/#/admin/contenido'

const responder = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s, headers: { 'Content-Type': 'application/json' },
  })

/** Comparacion que no se corta en la primera letra distinta.
 *
 *  Con un secreto largo y al azar un ataque por tiempos sobre HTTP no es
 *  practico, pero compararlo asi no cuesta nada y evita tener que razonarlo
 *  cada vez que alguien lea este archivo. */
function igual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}

function plural(n: number, uno: string, varios: string) {
  return `${n} ${n === 1 ? uno : varios}`
}

function cuerpo(cuantos: number, dias: number, nombre: string) {
  const cuenta = plural(cuantos, 'archivo borrado', 'archivos borrados')
  const espera = dias <= 0
    ? 'Acaban de cumplir su plazo.'
    : `El más viejo lleva ${plural(dias, 'día', 'días')} esperando.`

  return `<!doctype html><html><body style="margin:0;background:#0E1520;padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;background:#141C28;border:1px solid rgba(243,235,226,.14)">
  <tr><td style="padding:28px 26px">
    <div style="font:700 10px/1 system-ui;letter-spacing:2.2px;text-transform:uppercase;color:#D4B483">
      RAWstudio &middot; purga pendiente
    </div>
    <div style="font:400 26px/1.25 Georgia,serif;color:#F3EBE2;margin-top:16px">
      Hay ${cuenta} esperando a que alguien los borre de verdad.
    </div>
    <div style="font:400 14px/1.7 system-ui;color:#C9BDB0;margin-top:14px">
      ${espera} Hasta que se purguen, sus archivos siguen ocupando espacio
      &mdash; y la portada de un clip borrado se puede seguir descargando sin
      credenciales, porque vive en un bucket p&uacute;blico.
    </div>
    <a href="${PANEL}" style="display:inline-block;margin-top:22px;background:#D4B483;color:#141C28;padding:14px 22px;font:700 10px/1 system-ui;letter-spacing:1.6px;text-transform:uppercase;text-decoration:none">
      Abrir Contenido &rsaquo; Purga pendiente
    </a>
    <div style="font:400 12px/1.6 ui-monospace,monospace;color:#A89D92;margin-top:22px;border-top:1px solid rgba(255,255,255,.1);padding-top:14px">
      Para: ${nombre}. Este aviso sale solo cuando hay algo vencido, una vez
      por semana. Si purgas, deja de llegar.
    </div>
  </td></tr>
</table>
</td></tr></table>
</body></html>`
}

Deno.serve(async (req) => {
  const esperado = Deno.env.get('CRON_SECRET')
  if (!esperado) {
    return responder({
      error: 'Falta configurar CRON_SECRET',
      ayuda: 'Supabase -> Edge Functions -> Secrets -> agregar CRON_SECRET',
    }, 500)
  }
  const dado = req.headers.get('x-cron-secret') ?? ''
  if (!igual(dado, esperado)) return responder({ error: 'No autorizado' }, 401)

  const llave = Deno.env.get('RESEND_API_KEY')
  if (!llave) {
    return responder({
      error: 'Falta configurar RESEND_API_KEY',
      ayuda: 'Supabase -> Edge Functions -> Secrets -> agregar RESEND_API_KEY',
    }, 500)
  }

  // La llave de servicio se lee del entorno de la propia funcion, donde
  // Supabase ya la pone. No viaja en la peticion ni vive en GitHub.
  const supa = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data, error } = await supa.rpc('purga_pendiente')
  if (error) return responder({ error: error.message }, 500)

  const { cuantos, dias_del_mas_viejo: dias, admins } = data as {
    cuantos: number; dias_del_mas_viejo: number
    admins: { correo: string; nombre: string }[]
  }

  // El silencio es el caso normal y no es un error: casi todas las semanas no
  // habra nada vencido. Un aviso que llega siempre deja de leerse.
  if (!cuantos) return responder({ ok: true, enviados: 0, motivo: 'nada vencido' })
  if (!admins.length) {
    return responder({ ok: false, error: 'Hay purga pendiente y ningun admin con correo' }, 500)
  }

  const asunto = cuantos === 1
    ? 'RAWstudio: 1 archivo espera purga'
    : `RAWstudio: ${cuantos} archivos esperan purga`

  let ok = 0
  const fallos: string[] = []
  for (const a of admins) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${llave}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'RAWstudio <hola@rawstudio.biz>',
          to: [a.correo],
          subject: asunto,
          html: cuerpo(cuantos, dias, a.nombre),
        }),
      })
      if (r.ok) ok++
      else fallos.push(`${a.correo}: HTTP ${r.status} ${(await r.json().catch(() => ({})))?.message ?? ''}`)
    } catch (e) {
      fallos.push(`${a.correo}: ${(e as Error).message}`)
    }
  }

  return responder({ ok: fallos.length === 0, cuantos, dias, enviados: ok, fallos })
})
