// Envio de campañas por correo.
//
// LA LLAVE NUNCA ESTA EN EL REPOSITORIO. Se lee de RESEND_API_KEY, que vive
// como secreto del proyecto en Supabase (Edge Functions -> Secrets). Este
// archivo es publico; la llave no lo es, y esa separacion es todo el punto.
//
// Se usa la llave del BORDE y no del navegador porque una llave de Resend
// puesta en el cliente la puede leer cualquiera con las herramientas de
// desarrollo y mandar correo en nombre del dominio.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}
const responder = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s, headers: { ...CORS, 'Content-Type': 'application/json' },
  })

/** Sustituye {variables} por lo de cada persona. Se hace por destinatario y
 *  no una sola vez: ese es el sentido de tener variables. */
function personalizar(texto: string, p: { nombre: string; handle: string; correo: string }) {
  return texto
    .replaceAll('{nombre_usuario}', p.nombre)
    .replaceAll('{handle}', '@' + p.handle)
    .replaceAll('{correo}', p.correo)
}

/** El cuerpo se escribe en texto plano y se envuelve en HTML minimo.
 *  Los acentos van como entidades porque el charset de un correo no es
 *  confiable: ya nos paso con la plantilla de recuperacion. */
function aHtml(texto: string) {
  const escapado = texto
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/á/g, '&aacute;').replace(/é/g, '&eacute;').replace(/í/g, '&iacute;')
    .replace(/ó/g, '&oacute;').replace(/ú/g, '&uacute;').replace(/ñ/g, '&ntilde;')
    .replace(/Á/g, '&Aacute;').replace(/É/g, '&Eacute;').replace(/Í/g, '&Iacute;')
    .replace(/Ó/g, '&Oacute;').replace(/Ú/g, '&Uacute;').replace(/Ñ/g, '&Ntilde;')
    .replace(/¿/g, '&iquest;').replace(/¡/g, '&iexcl;')
    .replace(/\n/g, '<br>')
  return `<!doctype html><html><body style="margin:0;background:#08080A;padding:32px 0">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px">
<tr><td style="padding:0 24px 20px">
<div style="font:400 22px/1 Arial,Helvetica,sans-serif;color:#F2F0F3;letter-spacing:1px">RAWSTUDIO</div>
</td></tr>
<tr><td style="background:#111116;border:1px solid rgba(255,255,255,.14);padding:26px 24px">
<div style="font:400 15px/1.65 Arial,Helvetica,sans-serif;color:#C9C4CC">${escapado}</div>
</td></tr>
<tr><td style="padding:16px 24px 0">
<div style="font:400 11px/1.6 Arial,Helvetica,sans-serif;color:#6E6A72">
Recibes esto porque tienes una cuenta en RAWstudio.<br>
<a href="https://rawstudio.biz/#/perfil" style="color:#6E6A72">Preferencias de tu cuenta</a>
</div>
</td></tr>
</table></td></tr></table></body></html>`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const llave = Deno.env.get('RESEND_API_KEY')
  if (!llave) {
    // Se dice con claridad en vez de fallar de forma rara: es lo primero que
    // hay que revisar si nunca llega ningun correo.
    return responder({
      error: 'Falta configurar RESEND_API_KEY',
      ayuda: 'Supabase -> Edge Functions -> Secrets -> agregar RESEND_API_KEY',
    }, 503)
  }

  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return responder({ error: 'Sin sesion' }, 401)

  // Se usa la llave anonima MAS el token de quien llama, no service_role: asi
  // auth.uid() sigue siendo esa persona y es_admin() decide de verdad.
  const supa = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  )

  const { data: esAdmin } = await supa.rpc('es_admin')
  if (!esAdmin) return responder({ error: 'Solo administracion' }, 403)

  const { campana, segmento, asunto, cuerpo, remitente } = await req.json()
  if (!campana || !segmento || !asunto || !cuerpo) {
    return responder({ error: 'Faltan datos de la campaña' }, 400)
  }

  const { data: gente, error } = await supa.rpc('admin_segmento', { clave: segmento })
  if (error) return responder({ error: error.message }, 500)
  if (!gente?.length) return responder({ error: 'Ese segmento esta vacio' }, 400)

  const de = remitente || 'RAWstudio <hola@rawstudio.biz>'
  let ok = 0, mal = 0

  // De uno en uno y no en lote: Resend acepta lotes, pero entonces un rechazo
  // no dice de quien fue, y el historial existe justamente para poder
  // responder "¿le llego a esta persona?".
  for (const p of gente) {
    const persona = { nombre: p.nombre || p.handle, handle: p.handle, correo: p.correo }
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${llave}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: de,
          to: [persona.correo],
          subject: personalizar(asunto, persona),
          html: aHtml(personalizar(cuerpo, persona)),
        }),
      })
      const j = await r.json().catch(() => ({}))
      const bien = r.ok
      if (bien) ok++; else mal++
      await supa.rpc('admin_anotar_destinatario', {
        campana, destino: p.id, correo: persona.correo,
        exito: bien, detalle: bien ? null : (j?.message ?? `HTTP ${r.status}`),
      })
    } catch (e) {
      mal++
      await supa.rpc('admin_anotar_destinatario', {
        campana, destino: p.id, correo: persona.correo,
        exito: false, detalle: (e as Error).message,
      })
    }
  }

  await supa.rpc('admin_cerrar_campana', { campana })
  return responder({ ok: true, enviados: ok, fallidos: mal })
})
