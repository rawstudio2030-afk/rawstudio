// Aviso por correo A LA CREADORA de como va su verificacion.
//
// ---------- Por que ----------
//
// La verificacion solo avisaba hacia un lado: administracion se enteraba de
// que alguien mando su identificacion, y ella no se enteraba de nada. Ni de
// que llego, ni de cuando se resolvio, ni de por que se rechazo. La pantalla
// le dice «lo estamos revisando a mano» y ahi se acaba.
//
// Es el peor momento para dejarla sin noticias: `clips_insert_propio` exige
// la identidad verificada, asi que mientras no se resuelva NO PUEDE SUBIR
// NADA. Se registro, se hizo creadora, mando su INE, y esta mirando una
// pantalla que no avanza sin saber si alguien la vio.
//
// Hermana de `avisar-creadora`, que hace lo mismo con los retiros. Misma
// forma, plantilla aparte: compartirla las ataria y un cambio de tono en los
// retiros acabaria cambiando el correo de la verificacion.
//
// ---------- Que NO lleva ----------
//
// Ni las fotos, ni la CURP, ni la fecha de nacimiento, ni nada que se
// pareciera a un documento. El correo es la noticia y el enlace; lo demas
// vive donde ya esta y con los permisos que ya tiene.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10'

const ESTUDIO = 'https://rawstudio.biz/#/estudio'
const VERIFICAR = 'https://rawstudio.biz/#/verificar'
const BUZON = 'hola@rawstudio.biz'

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

/** El correo es HTML y los nombres y los motivos los escriben personas. */
const esc = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
   .replace(/"/g, '&quot;')

export type Aviso = {
  id: string
  estado: 'pendiente_revision' | 'aprobada' | 'rechazada'
  quien: string
  correo: string
  motivo: string | null
  pedida_at: string | null
  resuelta_at: string | null
}

const TENUE = '#6E6A72'
const APAGADO = '#9C979F'

/* ---------- El correo, segun la noticia ----------
 *
 * `asuntoDe`, `cuerpo` y `Aviso` se exportan para poder renderizar los tres
 * correos en local, sin desplegar y sin mandarle nada a nadie. */

export function asuntoDe(a: Aviso): string {
  if (a.estado === 'aprobada') return 'Listo: ya puedes publicar'
  if (a.estado === 'rechazada') return 'No pudimos verificar tu identidad'
  return 'Recibimos tus documentos'
}

export function cuerpo(a: Aviso): string {
  const hola = a.quien ? `Hola ${esc(a.quien)},` : 'Hola,'

  const { color, titular, texto, extra, boton, enlace } =
    a.estado === 'aprobada'
      ? {
          color: '#C8FF3D',
          titular: 'Tu identidad quedó verificada',
          texto: 'Ya puedes publicar y ya puedes cobrar. No tienes que volver a mandar nada.',
          extra: `<p style="margin:10px 0 0;font:400 15px/1.6 system-ui;color:${APAGADO}">
                    Tus fotos ya se borraron, como te prometimos. De todo esto
                    solo queda registrado que eres mayor de edad y la fecha en
                    que se comprobó.
                  </p>`,
          boton: 'Ir a mi estudio', enlace: ESTUDIO,
        }
      : a.estado === 'rechazada'
      ? {
          color: '#FF2BD1',
          titular: 'No pudimos verificar tu identidad',
          texto: 'Esto no cierra tu cuenta ni borra nada de lo que hayas subido: puedes volver a intentarlo cuando quieras.',
          // El motivo es lo mas util del correo: sin el, volver a intentar es
          // adivinar. Va destacado y no perdido en un parrafo.
          extra: a.motivo
            ? `<p style="margin:18px 0 0;padding:14px 16px;border-left:2px solid #FF2BD1;font:400 15px/1.6 system-ui;color:#F2F0F3">
                 ${esc(a.motivo)}
               </p>`
            : `<p style="margin:10px 0 0;font:400 15px/1.6 system-ui;color:${APAGADO}">
                 Si escribes a este correo te decimos exactamente qué faltó.
               </p>`,
          boton: 'Volver a intentarlo', enlace: VERIFICAR,
        }
      : {
          color: '#00E5FF',
          titular: 'Recibimos tus documentos',
          texto: 'Los está revisando una persona, no un programa. Te escribimos en cuanto haya respuesta.',
          extra: `<p style="margin:10px 0 0;font:400 15px/1.6 system-ui;color:${APAGADO}">
                    Mientras tanto puedes entrar al estudio y dejar listo lo que
                    quieras publicar: se queda guardado y sale en cuanto se
                    apruebe tu identidad.
                  </p>`,
          boton: 'Ir a mi estudio', enlace: ESTUDIO,
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
      contestamos. Nunca te vamos a pedir tus documentos por correo; si algún
      mensaje que parezca nuestro te los pide, no es nuestro.
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

/* ---------- Modo muestra ----------
 *
 * Manda a administracion los TRES correos tal como los recibiria ella. No
 * toca ningun dato: ni lee verificaciones reales ni marca nada. */
async function muestra(
  admins: { correo: string; nombre: string }[], llave: string,
): Promise<Response> {
  const base = { id: 'muestra', quien: 'Nora', correo: '', pedida_at: null, resuelta_at: null }
  const casos: Aviso[] = [
    { ...base, estado: 'pendiente_revision', motivo: null },
    { ...base, estado: 'aprobada', motivo: null },
    { ...base, estado: 'rechazada',
      motivo: 'La foto de la identificación salió movida y no se alcanza a leer la fecha de nacimiento.' },
  ]
  let ok = 0
  const fallos: string[] = []
  for (const admin of admins) {
    for (const caso of casos) {
      try {
        await mandar(llave, admin.correo, `[muestra] ${asuntoDe(caso)}`, cuerpo(caso))
        ok++
      } catch (e) { fallos.push(`${caso.estado}: ${(e as Error).message}`) }
    }
  }
  return responder({ ok: fallos.length === 0, muestra: true, enviados: ok, fallos })
}

/* ---------- Principal ---------- */

Deno.serve(async (req) => {
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

  const llave = Deno.env.get('RESEND_API_KEY')
  if (!llave) {
    return responder({
      error: 'Falta configurar RESEND_API_KEY',
      ayuda: 'Supabase -> Edge Functions -> Secrets -> agregar RESEND_API_KEY',
    }, 500)
  }

  const supa = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Ni el cron ni el disparador mandan cuerpo. Por eso se traga el error en
  // vez de responder 400.
  const peticion = await req.json().catch(() => ({})) as { muestra?: boolean }

  if (peticion.muestra) {
    const { data, error } = await supa.rpc('verificacion_pendiente')
    if (error) return responder({ error: error.message }, 500)
    const { admins } = data as { admins: { correo: string; nombre: string }[] }
    if (!admins?.length) return responder({ error: 'No hay a quien mandarle la muestra' }, 500)
    return await muestra(admins, llave)
  }

  const { data, error } = await supa.rpc('verificacion_para_avisar_creadora')
  if (error) return responder({ error: error.message }, 500)

  const { avisos, sin_correo } = data as { avisos: Aviso[]; sin_correo: number }
  if (!avisos.length) {
    return responder({ ok: true, enviados: 0, sin_correo, motivo: 'nada que avisar' })
  }

  // Uno por uno, y se marca SOLO lo que Resend acepto. Si se marcara todo de
  // golpe, un fallo a la mitad dejaria sin aviso a quien no lo recibio y
  // ademas la daria por avisada: nadie volveria a intentarlo nunca.
  const hechos: { id: string; estado: string }[] = []
  const fallos: string[] = []

  for (const a of avisos) {
    try {
      await mandar(llave, a.correo, asuntoDe(a), cuerpo(a))
      hechos.push({ id: a.id, estado: a.estado })
    } catch (e) { fallos.push(`${a.id}: ${(e as Error).message}`) }
  }

  let marcados = 0
  if (hechos.length) {
    const { data: n, error: e } = await supa.rpc('marcar_verificada_avisada', { avisos: hechos })
    if (e) {
      // El correo ya salio. Decirlo en vez de callarlo: si esto falla, la
      // siguiente pasada lo manda otra vez y hay que saber por que.
      return responder({
        ok: false, enviados: hechos.length, sin_correo,
        error_al_marcar: e.message,
        aviso: 'Los correos salieron pero no se marcaron: se repetirán en la siguiente pasada.',
      }, 500)
    }
    marcados = (n as number) ?? 0
  }

  return responder({
    ok: fallos.length === 0,
    enviados: hechos.length, marcados, sin_correo, fallos,
  })
})
