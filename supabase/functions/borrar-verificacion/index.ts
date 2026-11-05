// Borrar del almacen las fotos de verificacion que ya no deben conservarse.
//
// La unica funcion de borde de este proyecto que BORRA en vez de avisar.
//
// ---------- Por que existe ----------
//
// A cada persona que manda su identificacion se le promete, con estas
// palabras, que «una persona del equipo revisa tus fotos y las borra al
// terminar», y la base escribe `borrar_despues_de = now() + 30 dias`. Nada
// borraba nada: la columna se escribia, el panel la enseñaba, y las imagenes
// seguian enteras en el bucket. Son datos biometricos, el plazo lo anunciamos
// nosotros, y la finalidad se agota al resolver la verificacion.
//
// ---------- Por que no lo hace la base ----------
//
// Postgres puede borrar la fila de `storage.objects`, pero eso deja el
// archivo huerfano en el almacen: la base se olvida de el y el objeto sigue
// existiendo. Parece borrado y no lo esta, que es peor que no tocarlo. El
// borrado de verdad pasa por la API de Storage, y eso solo se puede hacer
// desde aqui.
//
// ---------- El orden importa, y es este ----------
//
// 1. preguntar que hay que borrar
// 2. borrarlo en Storage
// 3. SOLO SI Storage confirmo, olvidar las rutas en la base
//
// Al reves —marcar primero— la base diria que no hay imagenes mientras
// siguen en el almacen, y entonces nadie volveria a buscarlas nunca: la
// consulta busca por `ine_path is not null`. Un fallo asi no se nota, y deja
// datos biometricos sueltos para siempre.
//
// Se procesa fila por fila a proposito. Un `remove` de todas las rutas de
// golpe es una llamada menos, pero si falla no se sabe cuales se borraron, y
// marcar de mas es justo el error irreversible de arriba. Son volumenes de
// decenas: la llamada de mas no cuesta nada y la duda si.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10'

const BUCKET = 'verificacion'

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

type PorBorrar = {
  id: string
  ine_path: string | null
  selfie_path: string | null
  estado: string
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

  const supa = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Ni el cron ni el disparador mandan cuerpo. `seco: true` hace la consulta
  // y dice que borraria, sin tocar nada: sirve para mirar antes de soltar un
  // borrado irreversible sobre datos que no se pueden recuperar.
  const peticion = await req.json().catch(() => ({})) as { seco?: boolean }

  const { data, error } = await supa.rpc('verificacion_por_borrar')
  if (error) return responder({ error: error.message }, 500)

  const filas = (data ?? []) as PorBorrar[]
  if (!filas.length) {
    return responder({ ok: true, borradas: 0, motivo: 'nada que borrar' })
  }

  if (peticion.seco) {
    return responder({
      ok: true, seco: true, serian: filas.length,
      detalle: filas.map(f => ({
        id: f.id, estado: f.estado,
        archivos: [f.ine_path, f.selfie_path].filter(Boolean).length,
        // Las rutas empiezan por el id de la persona. Se cuentan, no se
        // listan: este volcado acaba en los registros de la funcion.
      })),
    })
  }

  const hechas: string[] = []
  const fallos: string[] = []

  for (const f of filas) {
    const rutas = [f.ine_path, f.selfie_path].filter((r): r is string => !!r)
    if (!rutas.length) { hechas.push(f.id); continue }

    const { error: e } = await supa.storage.from(BUCKET).remove(rutas)

    // Un archivo que ya no esta NO es un fallo: `remove` no se queja de lo
    // que no existe, y la fila tiene que cerrarse igual. Si se tratara como
    // error, una ruta rota dejaria esa fila reintentandose para siempre.
    if (e) fallos.push(`${f.id}: ${e.message}`)
    else hechas.push(f.id)
  }

  let marcadas: unknown = null
  if (hechas.length) {
    const { data: m, error: e2 } = await supa.rpc('marcar_verificacion_borrada',
      { ids: hechas })
    if (e2) {
      // Los archivos ya no estan y la base todavia cree que si. No se pierde
      // nada —la proxima pasada vuelve a intentarlo y `remove` sobre lo que
      // ya no existe no falla— pero tiene que verse en rojo.
      return responder({
        ok: false, borradas: hechas.length, fallos,
        error: `borre los archivos pero no pude marcarlo: ${e2.message}`,
      }, 500)
    }
    marcadas = m
  }

  return responder({
    ok: fallos.length === 0,
    vistas: filas.length, borradas: hechas.length, marcadas, fallos,
  })
})
