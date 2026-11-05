// Aviso por correo de que alguien mando su identificacion a revisar.
//
// Hermana de `avisar-retiro` y `avisar-purga`, con la misma proteccion: corre
// sin JWT y exige la cabecera `x-cron-secret`, que vive como secreto del
// proyecto en Supabase y como secreto del repositorio en GitHub. La llave de
// servicio no sale de aqui: se lee del entorno de la propia funcion.
//
// ---------- Por que hacia falta ----------
//
// La pantalla de verificacion termina diciendo «Lo estamos revisando a mano»
// y ahi se acababa. La unica forma de enterarse era abrir el panel por
// casualidad. Y no es mantenimiento: `clips_insert_propio` exige
// `identidad_verificada`, asi que hasta que esto se resuelva esa persona no
// puede subir ni un clip.
//
// ---------- EL CORREO NO LLEVA LAS FOTOS ----------
//
// Ni la INE, ni el selfie, ni la fecha de nacimiento, ni el hash del
// documento. Dice quien y desde cuando espera, y manda al panel. Las
// imagenes viven en el bucket privado `verificacion`, que solo lee
// `es_admin()`; adjuntarlas las sacaria de ahi para siempre y las dejaria de
// paso en los servidores de Resend. Son datos biometricos: lo que no sale no
// se filtra.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10'

const PANEL = 'https://rawstudio.biz/#/admin/verificacion'

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

/** «hace 20 minutos», «hace 3 horas», «hace 2 días».
 *
 *  Una marca de tiempo ISO en un correo obliga a restar de cabeza, y el dato
 *  que importa de una verificacion no es cuando llego sino CUANTO LLEVA
 *  esperando. Redondea hacia abajo a proposito: es preferible que diga «hace
 *  1 día» con 47 horas encima a que diga «hace 2 días» con 25. */
export function hace(desde: string, ahora = Date.now()): string {
  const min = Math.floor((ahora - new Date(desde).getTime()) / 60000)
  if (min < 1) return 'ahora mismo'
  if (min < 60) return `hace ${min} ${min === 1 ? 'minuto' : 'minutos'}`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} ${h === 1 ? 'hora' : 'horas'}`
  const d = Math.floor(h / 24)
  return `hace ${d} ${d === 1 ? 'día' : 'días'}`
}

/** Dias que faltan para una fecha, SIN redondear: negativo si ya paso.
 *
 *  Devuelve un numero con decimales a proposito, y quien lo use decide como
 *  redondear. La primera version devolvia `Math.floor` y contaba mal justo
 *  donde importa: para un plazo vencido hace un dia y un milisegundo,
 *  `floor(-1.00000001)` es -2, y el correo decia «llevas 2 días» el primer
 *  dia. `Math.floor` redondea hacia abajo, que en negativo es ALEJARSE del
 *  cero; para contar lo que ya paso hay que redondear la magnitud, no el
 *  signo. */
export function diasPara(fecha: string | null, ahora = Date.now()): number | null {
  if (!fecha) return null
  return (new Date(fecha).getTime() - ahora) / 86400000
}

export type Nueva = {
  id: string; quien: string; handle: string | null
  pedido_at: string; borrar_despues_de: string | null
}

function fila(n: Nueva, ahora: number) {
  const quien = n.handle ? `${n.quien} (@${n.handle})` : n.quien
  const dias = diasPara(n.borrar_despues_de, ahora)

  // El plazo solo se menciona cuando aprieta. Repetir «quedan 30 días» en
  // cada correo lo convierte en adorno, y entonces no se lee el dia que
  // quedan dos.
  //
  // CUIDADO CON COMO SE DICE ESTO. `borrar_despues_de` es la fecha que se le
  // PROMETIO a ella, no una fecha en la que algo pase: hoy no existe ninguna
  // tarea que borre el bucket `verificacion`, asi que las imagenes siguen
  // ahi pasado el plazo. Decir «las imagenes dejan de conservarse» seria
  // exactamente la clase de frase que suena a garantia y no lo es. Lo que se
  // dice es lo unico comprobable: cuanto queda del plazo, y que pasarse
  // significa estar guardando su INE mas tiempo del prometido.
  const alarma = (t: string) =>
    `<br><span style="font:400 12px/1.6 system-ui;color:#FF2BD1">${t}</span>`

  let plazo = ''
  if (dias !== null && dias < 0) {
    const pasados = Math.floor(-dias)
    plazo = alarma(pasados === 0
      ? 'Se pasó hoy el plazo de conservación que le prometimos.'
      : `Se pasó el plazo: llevas ${pasados} ${pasados === 1 ? 'día' : 'días'} guardando su identificación más de lo que le prometimos.`)
  } else if (dias !== null && dias <= 7) {
    const quedan = Math.floor(dias)
    plazo = alarma(quedan === 0
      ? 'Hoy se acaba el plazo de conservación que le prometimos.'
      : `${quedan === 1 ? 'Queda 1 día' : `Quedan ${quedan} días`} del plazo de conservación que le prometimos.`)
  }

  return `<tr>
    <td style="padding:11px 0;border-bottom:1px solid rgba(255,255,255,.08);font:400 14px/1.5 system-ui;color:#F2F0F3">
      ${quien}<br>
      <span style="font:400 13px/1.5 ui-monospace,monospace;color:#9C979F">Lo mandó ${hace(n.pedido_at, ahora)}</span>${plazo}
    </td></tr>`
}

/** La tarjeta, sin el documento que la envuelve.
 *
 *  Sale aparte para que el modo muestra pueda ENSEÑAR LA TARJETA DE VERDAD en
 *  vez de una imitacion suya. El primer intento recortaba la salida de
 *  `cuerpo()` con expresiones regulares, que es la clase de truco que sigue
 *  funcionando hasta el dia que alguien mueve una etiqueta y entonces la
 *  muestra miente sin avisar. */
export function panel(
  nuevas: Nueva[], total: number, masVieja: string | null, nombre: string,
  /** El instante se fija UNA vez por correo y se pasa a todo lo que cuenta
   *  tiempo. Antes cada fila llamaba a `Date.now()` por su cuenta: en
   *  produccion la diferencia son milisegundos, pero basta para que un plazo
   *  justo en el filo salga contado de una forma en una linea y de otra en la
   *  siguiente, y vuelve imposible comprobar los bordes. */
  ahora = Date.now(),
) {
  const otras = total - nuevas.length
  const cola = otras > 0
    ? `Hay ${otras} ${otras === 1 ? 'otra esperando' : 'más esperando'} de antes` +
      (masVieja ? `, la más vieja desde ${hace(masVieja, ahora)}.` : '.')
    : 'No hay ninguna otra esperando.'

  return `<div style="background:#0E0E11;border:1px solid rgba(255,255,255,.12);padding:28px 26px">
    <div style="font:700 10px/1 system-ui;letter-spacing:2.2px;text-transform:uppercase;color:#C8FF3D">
      RAWstudio &middot; identidad por revisar
    </div>
    <div style="font:400 26px/1.25 Georgia,serif;color:#F2F0F3;margin-top:16px">
      ${nuevas.length === 1
        ? 'Alguien mandó su identificación.'
        : `${nuevas.length} personas mandaron su identificación.`}
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px">
      ${nuevas.map(n => fila(n, ahora)).join('')}
    </table>

    <div style="font:400 13px/1.7 system-ui;color:#9C979F;margin-top:14px">
      ${cola}
    </div>

    <div style="margin-top:18px;padding:13px 15px;border:1px solid rgba(200,255,61,.35);background:rgba(200,255,61,.06)">
      <div style="font:400 13px/1.6 system-ui;color:#F2F0F3">
        Hasta que resuelvas esto, ${nuevas.length === 1 ? 'esa persona' : 'esas personas'}
        <b>no ${nuevas.length === 1 ? 'puede' : 'pueden'} subir nada</b>. Publicar
        exige la identidad verificada, así que la cuenta está hecha y parada.
      </div>
    </div>

    <a href="${PANEL}" style="display:inline-block;margin-top:22px;background:#C8FF3D;color:#08080A;padding:14px 22px;font:700 10px/1 system-ui;letter-spacing:1.6px;text-transform:uppercase;text-decoration:none">
      Abrir Verificación
    </a>

    <div style="font:400 12px/1.6 ui-monospace,monospace;color:#6E6A72;margin-top:22px;border-top:1px solid rgba(255,255,255,.1);padding-top:14px">
      Para: ${nombre}. Las fotos están en el panel, no en este correo. De cada
      solicitud se avisa una sola vez: si no haces nada, no vuelve a llegar y
      el contador del panel es lo que queda.
    </div>
  </div>`
}

/** El documento de correo: fondo, centrado y ancho maximo alrededor de una
 *  tarjeta. Las tablas no son decoracion: son lo unico que centra igual en
 *  Outlook y en Gmail. */
function documento(dentro: string, ancho = 520) {
  return `<!doctype html><html><body style="margin:0;background:#08080A;padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="${ancho}" cellpadding="0" cellspacing="0" style="max-width:${ancho}px">
  <tr><td>${dentro}</td></tr>
</table>
</td></tr></table>
</body></html>`
}

const cuerpo = (
  nuevas: Nueva[], total: number, masVieja: string | null, nombre: string,
) => documento(panel(nuevas, total, masVieja, nombre))

/* ---------- Modo muestra ----------
 *
 * `POST {"muestra": true}` manda un ejemplo a quien administra, con datos
 * inventados y sin tocar nada. Existe por la misma razon que el de
 * `avisar-retiro`: poder mirar la plantilla sin esperar a que alguien de
 * verdad mande su INE, que es justo lo que no se puede provocar a voluntad. */

export function muestraCuerpo(nombre: string): string {
  const ahora = Date.now()
  const viejas = new Date(ahora - 26 * 86400000).toISOString()
  const inventadas: Nueva[] = [
    {
      id: 'muestra-1', quien: 'Valeria', handle: 'valeriahotlatina016',
      pedido_at: new Date(ahora - 40 * 60000).toISOString(),
      borrar_despues_de: new Date(ahora + 30 * 86400000).toISOString(),
    },
    {
      id: 'muestra-2', quien: 'Renata', handle: 'renata.mx',
      pedido_at: viejas,
      // A cuatro dias de su fecha: asi se ve la advertencia del plazo.
      borrar_despues_de: new Date(ahora + 4 * 86400000).toISOString(),
    },
  ]

  return documento(`
    <div style="font:700 10px/1 system-ui;letter-spacing:2.2px;text-transform:uppercase;color:#FF2BD1">
      RAWstudio &middot; muestra, nadie mandó nada
    </div>
    <div style="font:400 26px/1.25 Georgia,serif;color:#F2F0F3;margin-top:14px">
      Así se ve el aviso de una identidad por revisar.
    </div>
    <div style="font:400 14px/1.7 system-ui;color:#9C979F;margin-top:12px">
      Las dos personas son inventadas. La segunda lleva veintiséis días
      esperando, para que se vea la advertencia del plazo: a cada quien se le
      promete que sus imágenes se conservan treinta días y no más.
    </div>

    <div style="margin-top:22px">${panel(inventadas, 3, viejas, nombre, ahora)}</div>

    <div style="font:400 12px/1.6 ui-monospace,monospace;color:#6E6A72;margin-top:24px;border-top:1px solid rgba(255,255,255,.1);padding-top:14px">
      Para: ${nombre}. Muestra pedida a mano. No se ha tocado ningún dato.
    </div>`, 560)
}

async function mandar(llave: string, a: string, asunto: string, html: string) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${llave}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'RAWstudio <hola@rawstudio.biz>',
      to: [a], subject: asunto, html,
    }),
  })
  if (r.ok) return null
  const j = await r.json().catch(() => ({})) as { message?: string }
  return `HTTP ${r.status} ${j.message ?? ''}`.trim()
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

  // Un cuerpo ausente o que no sea JSON es el caso normal: ni el cron ni el
  // disparador mandan nada. Por eso se traga el error en vez de responder 400.
  const peticion = await req.json().catch(() => ({})) as { muestra?: boolean }

  const { data, error } = await supa.rpc('verificacion_pendiente')
  if (error) return responder({ error: error.message }, 500)

  const {
    nuevas, pendientes_total: total, espera_mas_vieja: masVieja, admins,
  } = data as {
    nuevas: Nueva[]; pendientes_total: number
    espera_mas_vieja: string | null
    admins: { correo: string; nombre: string }[]
  }

  if (peticion.muestra) {
    if (!admins.length) {
      return responder({ ok: false, error: 'Ningun admin con correo al que mandar la muestra' }, 500)
    }
    let ok = 0
    const fallos: string[] = []
    for (const a of admins) {
      const f = await mandar(llave, a.correo,
        'RAWstudio: así se ve el aviso de una identidad por revisar',
        muestraCuerpo(a.nombre))
      if (f) fallos.push(`${a.correo}: ${f}`); else ok++
    }
    return responder({ ok: fallos.length === 0, muestra: true, enviados: ok, fallos })
  }

  // El silencio es el caso normal: casi siempre no habra mandado nadie nada.
  if (!nuevas.length) {
    return responder({ ok: true, enviados: 0, motivo: 'nada nuevo', pendientes: total })
  }
  if (!admins.length) {
    return responder({ ok: false, error: 'Hay verificaciones pendientes y ningun admin con correo' }, 500)
  }

  const asunto = nuevas.length === 1
    ? `RAWstudio: ${nuevas[0].quien} mandó su identificación a revisar`
    : `RAWstudio: ${nuevas.length} identificaciones esperan revisión`

  let ok = 0
  const fallos: string[] = []
  for (const a of admins) {
    try {
      const f = await mandar(llave, a.correo, asunto,
        cuerpo(nuevas, total, masVieja, a.nombre))
      if (f) fallos.push(`${a.correo}: ${f}`); else ok++
    } catch (e) {
      fallos.push(`${a.correo}: ${(e as Error).message}`)
    }
  }

  // Se marca DESPUES de que Resend acepte, y solo si acepto para alguien. Si
  // se marcara antes y fallara el envio, la solicitud quedaria avisada sin
  // que nadie la hubiera visto: alguien esperando con su cuenta parada.
  let marcadas = 0
  if (ok > 0) {
    const { data: m, error: e2 } = await supa.rpc('marcar_verificaciones_avisadas',
      { ids: nuevas.map(n => n.id) })
    if (e2) fallos.push(`no pude marcar como avisadas: ${e2.message}`)
    else marcadas = m as number
  }

  return responder({
    ok: fallos.length === 0,
    nuevas: nuevas.length, pendientes: total, enviados: ok, marcadas, fallos,
  })
})
