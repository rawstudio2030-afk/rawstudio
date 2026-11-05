// Aviso por correo de que alguien pidio un retiro.
//
// Hermana de `avisar-purga`, y con la misma proteccion: corre sin JWT y exige
// la cabecera `x-cron-secret`, que vive como secreto del proyecto en Supabase
// y como secreto del repositorio en GitHub. La llave de servicio no sale de
// aqui: se lee del entorno de la propia funcion.
//
// La diferencia con la purga esta en el ritmo. La purga se avisa una vez por
// semana porque el plazo es de treinta dias y no corre prisa. Un retiro es
// una persona esperando dinero suyo, asi que la tarea corre cada dos horas y
// cada solicitud se avisa exactamente una vez (columna `avisado_at`).
//
// EL CORREO NO LLEVA DATOS BANCARIOS. Dice quien y cuanto, y manda al panel.
// La CLABE y el RFC viven en `solicitudes_retiro` detras de RLS; copiarlos a
// un buzon los saca de ahi para siempre y no hacen falta para decidir si
// abrir el panel.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10'

const PANEL = 'https://rawstudio.biz/#/admin/retiros'

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

/** Los importes se guardan en CENTAVOS de dolar en columnas que todavia se
 *  llaman `coins`. Es el error que este esquema invita a cometer, asi que
 *  aqui tambien pasa todo por una sola funcion. */
const usd = (centavos: number) =>
  '$' + (centavos / 100).toFixed(2)

const pesos = (centavosMxn: number) =>
  '$' + (centavosMxn / 100).toLocaleString('es-MX', { minimumFractionDigits: 2 }) + ' MXN'

/** Misma cuenta que hace `admin_resolver_retiro`, y escrita igual a
 *  proposito: `coins` son centavos de DOLAR y el cambio son centavos de PESO
 *  por dolar, asi que el producto sale en centavos de peso por cien. Si estas
 *  dos formulas se separan, el correo anuncia una cantidad y el panel paga
 *  otra. */
const aPesos = (coins: number, centavosPorDolar: number) =>
  Math.round(coins * centavosPorDolar / 100)

type Nueva = {
  id: string; coins: number; quien: string
  handle: string | null; pedido_at: string
}

function fila(n: Nueva, tipoDeCambio: number | null) {
  const enPesos = tipoDeCambio === null ? '' :
    `<span style="color:#6E6A72"> &middot; ~${pesos(aPesos(n.coins, tipoDeCambio))} antes de retenciones</span>`
  const quien = n.handle ? `${n.quien} (@${n.handle})` : n.quien
  return `<tr>
    <td style="padding:11px 0;border-bottom:1px solid rgba(255,255,255,.08);font:400 14px/1.5 system-ui;color:#F2F0F3">
      ${quien}<br>
      <span style="font:700 15px/1.5 ui-monospace,monospace;color:#C8FF3D">${usd(n.coins)}</span>${enPesos}
    </td></tr>`
}

function cuerpo(
  nuevas: Nueva[], total: number, tipoDeCambio: number | null, nombre: string,
) {
  const otras = total - nuevas.length
  const cola = otras > 0
    ? `Hay ${otras} solicitud${otras === 1 ? '' : 'es'} más sin resolver de antes.`
    : 'No hay ninguna otra sin resolver.'

  // Si falta el tipo de cambio, aprobar FALLA. Mejor decirlo aqui que dejar
  // que lo descubra pulsando el boton con la creadora esperando.
  const aviso = tipoDeCambio === null ? `
    <div style="margin-top:18px;padding:13px 15px;border:1px solid #FF2BD1;background:rgba(255,43,209,.08)">
      <div style="font:700 10px/1 system-ui;letter-spacing:1.6px;text-transform:uppercase;color:#FF2BD1">
        No vas a poder aprobarlo todavía
      </div>
      <div style="font:400 13px/1.6 system-ui;color:#F2F0F3;margin-top:7px">
        Falta definir <b>tipo_cambio_usd_mxn</b> en Ajustes: cuántos centavos de
        peso vale un dólar (1850 = 18.50). Sin ese número no hay forma de saber
        cuántos pesos transferir, y aprobar se niega en vez de suponerlo.
      </div>
    </div>` : ''

  return `<!doctype html><html><body style="margin:0;background:#08080A;padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;background:#0E0E11;border:1px solid rgba(255,255,255,.12)">
  <tr><td style="padding:28px 26px">
    <div style="font:700 10px/1 system-ui;letter-spacing:2.2px;text-transform:uppercase;color:#C8FF3D">
      RAWstudio &middot; retiro solicitado
    </div>
    <div style="font:400 26px/1.25 Georgia,serif;color:#F2F0F3;margin-top:16px">
      ${nuevas.length === 1
        ? 'Alguien quiere cobrar lo que ha ganado.'
        : `${nuevas.length} personas quieren cobrar lo que han ganado.`}
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px">
      ${nuevas.map(n => fila(n, tipoDeCambio)).join('')}
    </table>
    <div style="font:400 13px/1.7 system-ui;color:#9C979F;margin-top:14px">
      ${cola} Los datos bancarios están en el panel, no en este correo.
    </div>
    ${aviso}
    <a href="${PANEL}" style="display:inline-block;margin-top:22px;background:#C8FF3D;color:#08080A;padding:14px 22px;font:700 10px/1 system-ui;letter-spacing:1.6px;text-transform:uppercase;text-decoration:none">
      Abrir Retiros
    </a>
    <div style="font:400 12px/1.6 ui-monospace,monospace;color:#6E6A72;margin-top:22px;border-top:1px solid rgba(255,255,255,.1);padding-top:14px">
      Para: ${nombre}. De cada solicitud se avisa una sola vez. Si no haces
      nada, no vuelve a llegar: el contador del panel es lo que queda.
    </div>
  </td></tr>
</table>
</td></tr></table>
</body></html>`
}

/* ---------- Modo muestra ----------
 *
 * `POST {"muestra": true}` manda un correo de ejemplo a quien administra, con
 * datos inventados pero con el tipo de cambio y las tasas REALES de la base,
 * y sin tocar nada. Existe para poder mirar la plantilla sin esperar a que
 * alguien pida un retiro de verdad, y para ver de una sola vez las dos caras
 * de esto: lo que llega al buzon de administracion y lo que ella ve en su
 * pantalla. */

function bloque(titulo: string, dentro: string) {
  return `<div style="margin-top:26px">
    <div style="font:700 10px/1 system-ui;letter-spacing:2px;text-transform:uppercase;color:#9C979F;padding-bottom:9px;border-bottom:1px solid rgba(255,255,255,.14)">${titulo}</div>
    ${dentro}
  </div>`
}

function renglon(etiqueta: string, valor: string, color = '#F2F0F3') {
  return `<tr>
    <td style="padding:7px 0;font:400 13px/1.5 system-ui;color:#9C979F">${etiqueta}</td>
    <td style="padding:7px 0;font:400 13px/1.5 ui-monospace,monospace;color:${color};text-align:right">${valor}</td>
  </tr>`
}

function muestraCuerpo(
  tipoDeCambio: number | null,
  tasa: { isr_pct: number; iva_ret_pct: number } | null,
  nombre: string,
) {
  const coins = 2000                       // $20.00 USD de incentivo
  const cambio = tipoDeCambio ?? 1850
  const bruto = aPesos(coins, cambio)
  const isrPct = tasa?.isr_pct ?? 2.1
  const ivaPct = tasa?.iva_ret_pct ?? 50
  const isr = Math.round(bruto * isrPct / 100)
  const ivaTrasladado = Math.round(bruto * 16 / 100)
  const iva = Math.round(ivaTrasladado * ivaPct / 100)
  const neto = bruto - isr - iva

  const loQueTuRecibes = `
    <div style="background:#0E0E11;border:1px solid rgba(255,255,255,.12);padding:22px 20px;margin-top:12px">
      <div style="font:700 10px/1 system-ui;letter-spacing:2.2px;text-transform:uppercase;color:#C8FF3D">
        RAWstudio &middot; retiro solicitado
      </div>
      <div style="font:400 23px/1.3 Georgia,serif;color:#F2F0F3;margin-top:14px">
        Alguien quiere cobrar lo que ha ganado.
      </div>
      <div style="padding:11px 0;border-bottom:1px solid rgba(255,255,255,.08);font:400 14px/1.5 system-ui;color:#F2F0F3;margin-top:12px">
        Valeria (@valeriahotlatina016)<br>
        <span style="font:700 15px/1.5 ui-monospace,monospace;color:#C8FF3D">${usd(coins)}</span>
        <span style="color:#6E6A72"> &middot; ~${pesos(bruto)} antes de retenciones</span>
      </div>
      <div style="font:400 13px/1.7 system-ui;color:#9C979F;margin-top:12px">
        No hay ninguna otra sin resolver. Los datos bancarios están en el panel,
        no en este correo.
      </div>
      <div style="display:inline-block;margin-top:18px;background:#C8FF3D;color:#08080A;padding:13px 20px;font:700 10px/1 system-ui;letter-spacing:1.6px;text-transform:uppercase">
        Abrir Retiros
      </div>
    </div>`

  const loQueEllaVe = `
    <div style="background:#0E0E11;border:1px solid rgba(255,255,255,.12);padding:22px 20px;margin-top:12px">
      <div style="font:700 10px/1 system-ui;letter-spacing:2px;text-transform:uppercase;color:#9C979F">
        Disponible para retirar
      </div>
      <div style="font:400 40px/1 Georgia,serif;color:#C8FF3D;margin-top:9px">${usd(coins)}</div>
      <div style="font:400 12px/1.6 system-ui;color:#9C979F;margin-top:9px">
        Es tu saldo menos lo que ya pediste y sigue sin resolverse. El mínimo
        por solicitud son $5.00.
      </div>
      <div style="margin-top:17px;font:700 10px/1 system-ui;letter-spacing:2px;text-transform:uppercase;color:#9C979F">
        Cuánto quieres retirar, en dólares
      </div>
      <div style="margin-top:7px;border:1px solid rgba(255,255,255,.25);padding:11px 13px;font:400 15px/1.3 ui-monospace,monospace;color:#F2F0F3">20.00</div>
      <div style="font:400 12px/1.6 system-ui;color:#9C979F;margin-top:8px">
        Se te transfiere en pesos al tipo de cambio del día, con las retenciones
        ya calculadas.
      </div>
      <div style="display:inline-block;margin-top:15px;background:#FF2BD1;color:#08080A;padding:13px 20px;font:700 10px/1 system-ui;letter-spacing:1.6px;text-transform:uppercase">
        Pedir el retiro
      </div>
      <div style="margin-top:17px;padding-top:13px;border-top:1px solid rgba(255,255,255,.1);font:400 13px/1.5 system-ui;color:#C8FF3D">
        Solicitud enviada. Te avisamos en cuanto se resuelva.
      </div>
      <div style="margin-top:13px;font:700 10px/1 system-ui;letter-spacing:2px;text-transform:uppercase;color:#9C979F">Tus solicitudes</div>
      <div style="margin-top:9px;font:500 16px/1.3 system-ui;color:#F2F0F3">${usd(coins)}
        <span style="font:400 10px/1 ui-monospace,monospace;color:#6E6A72;padding-left:8px">EN REVISIÓN</span>
      </div>
    </div>`

  const cuentas = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px">
      ${renglon('Ella pide', usd(coins))}
      ${renglon(`Tipo de cambio (${(cambio / 100).toFixed(2)} MXN/USD)`, pesos(bruto))}
      ${renglon(`ISR ${isrPct}% de la base`, '− ' + pesos(isr))}
      ${renglon(`IVA: ${ivaPct}% del IVA trasladado (16%)`, '− ' + pesos(iva))}
      ${renglon('<b style="color:#F2F0F3">Lo que transfieres por SPEI</b>', '<b>' + pesos(neto) + '</b>', '#C8FF3D')}
    </table>`

  return `<!doctype html><html><body style="margin:0;background:#08080A;padding:30px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px">
  <tr><td>
    <div style="font:700 10px/1 system-ui;letter-spacing:2.2px;text-transform:uppercase;color:#FF2BD1">
      RAWstudio &middot; muestra, no es un retiro real
    </div>
    <div style="font:400 26px/1.25 Georgia,serif;color:#F2F0F3;margin-top:14px">
      Así se ve un retiro de $20 por las dos caras.
    </div>
    <div style="font:400 14px/1.7 system-ui;color:#9C979F;margin-top:12px">
      Nadie ha pedido nada: esto es un ejemplo. Los números sí son reales,
      salen del tipo de cambio y las tasas que hay ahora mismo en la base.
    </div>

    ${bloque('1 &middot; El correo que te llega a ti', loQueTuRecibes)}
    ${bloque('2 &middot; La pantalla que ve ella', loQueEllaVe)}
    ${bloque('3 &middot; Las cuentas', cuentas)}

    <div style="margin-top:26px;padding:14px 16px;border:1px solid #FF2BD1;background:rgba(255,43,209,.08)">
      <div style="font:700 10px/1 system-ui;letter-spacing:1.6px;text-transform:uppercase;color:#FF2BD1">
        Lo que ella NO recibe
      </div>
      <div style="font:400 13px/1.6 system-ui;color:#F2F0F3;margin-top:7px">
        Su pantalla dice <b>«Te avisamos en cuanto se resuelva»</b>, pero hoy no
        existe ningún correo hacia ella: ni al aprobar, ni al pagar, ni al
        rechazar. Si no vuelve a entrar a mirar, no se entera de nada. Tampoco
        ve en ninguna parte el desglose del apartado 3 &mdash; solo los dólares
        que pidió.
      </div>
    </div>

    <div style="font:400 12px/1.6 ui-monospace,monospace;color:#6E6A72;margin-top:24px;border-top:1px solid rgba(255,255,255,.1);padding-top:14px">
      Para: ${nombre}. Muestra pedida a mano. No se ha tocado ningún dato.
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

  const { data, error } = await supa.rpc('retiro_pendiente')
  if (error) return responder({ error: error.message }, 500)

  const {
    nuevas, pendientes_total: total, tipo_de_cambio: tipoDeCambio, admins,
  } = data as {
    nuevas: Nueva[]; pendientes_total: number
    tipo_de_cambio: number | null
    admins: { correo: string; nombre: string }[]
  }

  if (peticion.muestra) {
    if (!admins.length) {
      return responder({ ok: false, error: 'Ningun admin con correo al que mandar la muestra' }, 500)
    }
    const { data: t } = await supa.from('tasas_retencion')
      .select('isr_pct,iva_ret_pct').eq('regimen', 'persona_fisica')
      .order('vigente_desde', { ascending: false }).limit(1).maybeSingle()

    let ok = 0
    const fallos: string[] = []
    for (const a of admins) {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${llave}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'RAWstudio <hola@rawstudio.biz>',
          to: [a.correo],
          subject: 'RAWstudio: así se ve un retiro, por las dos caras',
          html: muestraCuerpo(tipoDeCambio, t, a.nombre),
        }),
      })
      if (r.ok) ok++
      else fallos.push(`${a.correo}: HTTP ${r.status}`)
    }
    return responder({ ok: fallos.length === 0, muestra: true, enviados: ok, fallos })
  }

  // El silencio es el caso normal: casi siempre no habra pedido nadie nada.
  if (!nuevas.length) {
    return responder({ ok: true, enviados: 0, motivo: 'nada nuevo', pendientes: total })
  }
  if (!admins.length) {
    return responder({ ok: false, error: 'Hay retiros pendientes y ningun admin con correo' }, 500)
  }

  const asunto = nuevas.length === 1
    ? `RAWstudio: ${nuevas[0].quien} pidió retirar ${usd(nuevas[0].coins)}`
    : `RAWstudio: ${nuevas.length} retiros solicitados`

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
          html: cuerpo(nuevas, total, tipoDeCambio, a.nombre),
        }),
      })
      if (r.ok) ok++
      else fallos.push(`${a.correo}: HTTP ${r.status} ${(await r.json().catch(() => ({})))?.message ?? ''}`)
    } catch (e) {
      fallos.push(`${a.correo}: ${(e as Error).message}`)
    }
  }

  // Se marca DESPUES de que Resend acepte, y solo si acepto para alguien. Si
  // se marcara antes y fallara el envio, la solicitud quedaria avisada sin
  // que nadie la hubiera visto: alguien esperando su dinero en silencio.
  let marcadas = 0
  if (ok > 0) {
    const { data: m, error: e2 } = await supa.rpc('marcar_retiros_avisados',
      { ids: nuevas.map(n => n.id) })
    if (e2) fallos.push(`no pude marcar como avisadas: ${e2.message}`)
    else marcadas = m as number
  }

  return responder({
    ok: fallos.length === 0,
    nuevas: nuevas.length, pendientes: total, enviados: ok, marcadas, fallos,
  })
})
