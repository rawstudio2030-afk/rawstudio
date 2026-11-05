// Aviso por correo A LA CREADORA de que su retiro se movio.
//
// Su pantalla le promete «Te avisamos en cuanto se resuelva» desde
// septiembre, y hasta hoy no existia ningun correo hacia ella. Esto lo cumple.
//
// ---------- Por que es una funcion aparte de `avisar-retiro` ----------
//
// Podria ser un modo mas de la que ya existe: comparten la proteccion, la
// llamada a Resend y la mitad de los ayudantes. Van separadas por el radio de
// alcance de un error. `avisar-retiro` escribe un correo con los datos de
// TERCERAS personas —quien pidio, cuanto, cuantas hay pendientes— y lo manda
// a administracion. Esta escribe los datos de UNA persona y se los manda a
// ella. Si las dos plantillas vivieran en el mismo archivo, un fallo de una
// linea podria mandarle a una creadora la lista de las demas, y eso no se
// arregla pidiendo perdon.
//
// Separadas, lo peor que puede pasar es que un correo no salga.
//
// ---------- Que decide si hay que avisar ----------
//
// `solicitudes_retiro.avisada_estado` guarda DE QUE ESTADO se le aviso. Se le
// avisa cuando el estado de la solicitud ya no coincide. Eso da tres avisos
// como maximo —aprobada, pagada, rechazada— y se colapsa solo: si alguien
// aprueba y paga entre dos pasadas del cron, ella recibe un unico correo, el
// de «ya te lo mandamos».
//
// ---------- Lo que el correo NO lleva ----------
//
// Ni su CLABE, ni su RFC, ni su titular. Son suyos y ya los conoce. La
// referencia del SPEI si va: es lo que necesita para reclamar en su banco.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10'

const RETIROS = 'https://rawstudio.biz/#/estudio/retirar'
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

/** `coins` son centavos de DOLAR, en una columna que todavia se llama asi. */
const usd = (centavos: number) => '$' + (centavos / 100).toFixed(2)

const pesos = (centavosMxn: number) =>
  '$' + (centavosMxn / 100).toLocaleString('es-MX', { minimumFractionDigits: 2 }) + ' MXN'

/** El correo es HTML y los nombres y los motivos los escriben personas. */
const esc = (t: string) =>
  t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
   .replace(/"/g, '&quot;')

export type Aviso = {
  id: string
  coins: number
  estado: 'aprobada' | 'pagada' | 'rechazada'
  quien: string
  correo: string
  motivo_rechazo: string | null
  bruto_mxn: number | null
  isr_mxn: number | null
  iva_ret_mxn: number | null
  neto_mxn: number | null
  spei_ref: string | null
}

/* ---------- Pedazos de la plantilla ---------- */

const APAGADO = '#9C979F'
const TENUE = '#6E6A72'

function renglon(etiqueta: string, valor: string, color = '#F2F0F3', fuerte = false) {
  return `
    <tr>
      <td style="padding:7px 0;font:400 13px/1.4 system-ui;color:${APAGADO}">${etiqueta}</td>
      <td style="padding:7px 0;text-align:right;font:${fuerte ? 700 : 400} ${fuerte ? 15 : 13}px/1.4 system-ui;color:${color}">${valor}</td>
    </tr>`
}

/** El desglose. Existe porque su pantalla NO se lo ensena en ningun sitio:
 *  habla en dolares y dice «con las retenciones ya calculadas», pero el
 *  numero calculado no aparece. Sin esto, la transferencia llega mas chica de
 *  lo que ella pidio y nadie se lo explico nunca. */
function desglose(a: Aviso) {
  // Si por lo que sea no hubiera dispersion asociada, se omite el desglose
  // en vez de inventarse ceros: un cero en una tabla de dinero se lee como un
  // dato, no como un hueco.
  if (a.bruto_mxn === null || a.neto_mxn === null) return ''
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
         style="margin-top:20px;border-top:1px solid rgba(255,255,255,.12)">
    ${renglon('Lo que pediste', usd(a.coins))}
    ${renglon('En pesos, al tipo de cambio del día', pesos(a.bruto_mxn))}
    ${renglon('ISR retenido', '−' + pesos(a.isr_mxn ?? 0), APAGADO)}
    ${renglon('IVA retenido', '−' + pesos(a.iva_ret_mxn ?? 0), APAGADO)}
    ${renglon(a.estado === 'pagada' ? 'Te transferimos' : 'Te llega', pesos(a.neto_mxn), '#C8FF3D', true)}
  </table>
  <p style="margin:14px 0 0;font:400 12px/1.6 system-ui;color:${TENUE}">
    Las dos retenciones no se las queda RAWstudio: la ley obliga a la
    plataforma a retenerlas y a enterarlas al SAT a tu nombre, así que cuentan
    como impuesto ya pagado por ti.
  </p>`
}

/* ---------- El correo, segun la noticia ----------
 *
 * `asuntoDe`, `cuerpo` y `Aviso` se exportan para poder renderizar los tres
 * correos en local, sin desplegar y sin mandarle nada a nadie:
 *
 *   deno run --allow-read --allow-write --allow-net un-script.ts
 *
 * que los importa y los escribe a disco. Asi se revisan las plantillas y los
 * casos raros —nombre vacio, motivo con HTML dentro, retiro sin dispersion—
 * antes de que exista una creadora al otro lado. */

export function asuntoDe(a: Aviso): string {
  if (a.estado === 'aprobada') return `Tu retiro de ${usd(a.coins)} está aprobado`
  if (a.estado === 'pagada') {
    return a.neto_mxn === null
      ? `Ya te transferimos tu retiro de ${usd(a.coins)}`
      : `Ya te transferimos ${pesos(a.neto_mxn)}`
  }
  return `Tu retiro de ${usd(a.coins)} no se aprobó`
}

export function cuerpo(a: Aviso): string {
  const hola = a.quien ? `Hola ${esc(a.quien)},` : 'Hola,'

  let titular: string, color: string, cuerpoTexto: string, extra = ''

  if (a.estado === 'aprobada') {
    color = '#C8FF3D'
    titular = 'Tu retiro está aprobado'
    cuerpoTexto = `Revisamos tu solicitud y está aprobada. El dinero sale por
      SPEI a la cuenta que registraste.`
    extra = `<p style="margin:16px 0 0;font:400 14px/1.6 system-ui;color:${APAGADO}">
      Te escribimos otra vez en cuanto salga la transferencia, con la
      referencia para que puedas rastrearla en tu banco.</p>`
  } else if (a.estado === 'pagada') {
    color = '#C8FF3D'
    titular = 'Ya te transferimos'
    cuerpoTexto = 'La transferencia ya salió por SPEI a la cuenta que registraste.'
    if (a.spei_ref) {
      extra = `
      <div style="margin-top:18px;padding:13px 15px;border:1px solid rgba(255,255,255,.12)">
        <div style="font:700 9px/1 system-ui;letter-spacing:1.4px;text-transform:uppercase;color:${TENUE}">Referencia del SPEI</div>
        <div style="margin-top:7px;font:400 15px/1.3 ui-monospace,monospace;color:#F2F0F3">${esc(a.spei_ref)}</div>
      </div>
      <p style="margin:16px 0 0;font:400 14px/1.6 system-ui;color:${APAGADO}">
        Suele aparecer el mismo día. Si pasadas 48 horas no la ves, contesta a
        este correo con esa referencia y lo rastreamos.</p>`
    }
  } else {
    color = '#FF2BD1'
    titular = 'Tu retiro no se aprobó'
    cuerpoTexto = 'Revisamos tu solicitud y esta vez no pudimos aprobarla.'
    extra = `
      ${a.motivo_rechazo ? `
      <div style="margin-top:18px;padding:13px 15px;border:1px solid #FF2BD1;background:rgba(255,43,209,.08)">
        <div style="font:700 9px/1 system-ui;letter-spacing:1.4px;text-transform:uppercase;color:#FF2BD1">El motivo</div>
        <div style="margin-top:7px;font:400 14px/1.5 system-ui;color:#F2F0F3">${esc(a.motivo_rechazo)}</div>
      </div>` : ''}
      <p style="margin:16px 0 0;font:400 14px/1.6 system-ui;color:${APAGADO}">
        <b style="color:#F2F0F3">Tu saldo sigue completo:</b> no se te descontó
        nada. Puedes volver a pedir el retiro cuando quieras. Y si el motivo no
        te queda claro, contesta a este correo.</p>`
  }

  return `<!doctype html><html><body style="margin:0;background:#08080A;padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;background:#0E0E11;border:1px solid rgba(255,255,255,.12)">
  <tr><td style="padding:30px 26px">

    <div style="font:700 10px/1 system-ui;letter-spacing:2px;text-transform:uppercase;color:${color}">RAWstudio</div>

    <h1 style="margin:18px 0 0;font:700 25px/1.2 system-ui;color:#F2F0F3">${titular}</h1>

    <p style="margin:16px 0 0;font:400 15px/1.6 system-ui;color:#F2F0F3">${hola}</p>
    <p style="margin:10px 0 0;font:400 15px/1.6 system-ui;color:#F2F0F3">${cuerpoTexto}</p>

    ${a.estado === 'rechazada' ? '' : desglose(a)}
    ${extra}

    <a href="${RETIROS}" style="display:inline-block;margin-top:24px;background:${color};color:#08080A;padding:14px 22px;font:700 10px/1 system-ui;letter-spacing:1.6px;text-transform:uppercase;text-decoration:none">Ver mis retiros</a>

    <p style="margin:26px 0 0;padding-top:18px;border-top:1px solid rgba(255,255,255,.12);font:400 12px/1.6 system-ui;color:${TENUE}">
      Este correo sale de ${BUZON} y lo lee una persona: si contestas, te
      contestamos. No incluimos tus datos bancarios por correo nunca; si algún
      mensaje que parezca nuestro te los pide, no es nuestro.
    </p>

  </td></tr>
</table>
</td></tr></table>
</body></html>`
}

/* ---------- Modo muestra ---------- */

/** Manda a administracion los TRES correos tal como los recibiria ella, con
 *  numeros de ejemplo. Son tres y no uno junto a proposito: lo que hay que
 *  poder revisar es cada asunto y cada correo como llegan de verdad, no un
 *  resumen de los tres. No toca ningun dato: ni lee solicitudes reales ni
 *  marca nada.
 *
 *  Los correos de administracion se piden a `retiro_pendiente`, que ya los
 *  devuelve. Es la unica cosa que esta funcion le pide a la otra, y es de
 *  lectura: no hay plantilla compartida, que es justo lo que se queria
 *  evitar separandolas. */
async function muestra(
  admins: { correo: string; nombre: string }[], llave: string,
): Promise<Response> {
  if (!admins.length) {
    return responder({ ok: false, error: 'Ningun admin con correo al que mandar la muestra' }, 500)
  }

  // 20 dolares a 18.50, con las tasas de persona fisica ya corregidas por
  // 20261107000000: bruto 370.00, ISR 7.77, IVA 29.60, neto 332.63.
  const base = {
    id: 'muestra', quien: 'Ana', correo: '', coins: 2000,
    bruto_mxn: 37000, isr_mxn: 777, iva_ret_mxn: 2960, neto_mxn: 33263,
    motivo_rechazo: null as string | null, spei_ref: null as string | null,
  }
  const casos: Aviso[] = [
    { ...base, estado: 'aprobada' },
    { ...base, estado: 'pagada', spei_ref: '2026110540014000001234567890' },
    {
      ...base, estado: 'rechazada',
      motivo_rechazo: 'La CLABE que registraste tiene 17 dígitos y necesita 18. Corrígela en Cobro y vuelve a pedirlo.',
    },
  ]

  let ok = 0
  const fallos: string[] = []
  for (const a of admins) {
    for (const caso of casos) {
      try {
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${llave}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: `RAWstudio <${BUZON}>`,
            to: [a.correo],
            subject: `[muestra] ${asuntoDe(caso)}`,
            html: cuerpo(caso),
          }),
        })
        if (r.ok) ok++
        else fallos.push(`${caso.estado}: HTTP ${r.status}`)
      } catch (e) {
        fallos.push(`${caso.estado}: ${(e as Error).message}`)
      }
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

  // Un cuerpo ausente o que no sea JSON es el caso normal: el cron no manda
  // nada. Por eso se traga el error en vez de responder 400.
  const peticion = await req.json().catch(() => ({})) as { muestra?: boolean }

  if (peticion.muestra) {
    const { data, error } = await supa.rpc('retiro_pendiente')
    if (error) return responder({ error: error.message }, 500)
    const { admins } = data as { admins: { correo: string; nombre: string }[] }
    return await muestra(admins, llave)
  }

  const { data, error } = await supa.rpc('retiro_para_avisar_creadora')
  if (error) return responder({ error: error.message }, 500)

  const { avisos, sin_correo: sinCorreo } = data as {
    avisos: Aviso[]; sin_correo: number
  }

  if (!avisos.length) {
    return responder({
      ok: true, enviados: 0, motivo: 'nada que avisar', sin_correo: sinCorreo,
    })
  }

  // Se marca cada una por separado, y solo la que salio. A diferencia del
  // aviso a administracion —donde todos reciben el mismo correo y basta con
  // que uno salga—, aqui cada correo es de una persona distinta: si el de una
  // falla, la suya tiene que seguir pendiente aunque las demas salgan.
  const dichos: { id: string; estado: string }[] = []
  const fallos: string[] = []

  for (const a of avisos) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${llave}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `RAWstudio <${BUZON}>`,
          to: [a.correo],
          subject: asuntoDe(a),
          html: cuerpo(a),
        }),
      })
      if (r.ok) dichos.push({ id: a.id, estado: a.estado })
      // El correo de la creadora NO entra en el mensaje de error: estos
      // registros los lee GitHub Actions y quedan guardados ahi.
      else fallos.push(`${a.id}: HTTP ${r.status} ${(await r.json().catch(() => ({})))?.message ?? ''}`)
    } catch (e) {
      fallos.push(`${a.id}: ${(e as Error).message}`)
    }
  }

  let marcadas = 0
  if (dichos.length) {
    const { data: m, error: e2 } = await supa.rpc('marcar_creadora_avisada',
      { avisos: dichos })
    if (e2) fallos.push(`no pude marcar como avisadas: ${e2.message}`)
    else marcadas = m as number
  }

  return responder({
    ok: fallos.length === 0,
    pendientes: avisos.length, enviados: dichos.length, marcadas,
    sin_correo: sinCorreo, fallos,
  })
})
