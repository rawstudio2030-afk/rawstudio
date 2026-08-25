// Entrega la URL firmada de un clip, decidiendo del lado del servidor.
//
// POR QUE EXISTE
// Hasta ahora el navegador pedia la URL firmada directo a Supabase. Eso basta
// para el paywall —las politicas de storage ya comprueban la compra— pero NO
// alcanza para el geobloqueo: la base no sabe desde que pais llega la
// peticion, y el navegador no es una fuente confiable de eso.
//
// Aqui si: la IP la pone la red, no el cliente, y la decision ocurre antes de
// que exista una URL que entregar.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10'

const CORS = {
  'Access-Control-Allow-Origin': Deno.env.get('ORIGEN_PERMITIDO') ?? 'https://rawstudio.biz',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const responder = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), {
    status, headers: { ...CORS, 'Content-Type': 'application/json' },
  })

/** El pais lo pone la infraestructura, no quien llama. Supabase pasa la
 *  cabecera de Cloudflare; si faltara, se prefiere NO bloquear: dejar fuera a
 *  alguien por un dato que no tenemos es peor que el riesgo que evita. */
function paisDe(req: Request): string | null {
  const cf = req.headers.get('cf-ipcountry')
  if (cf && cf !== 'XX' && cf.length === 2) return cf.toUpperCase()
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return responder({ error: 'Método no permitido' }, 405)

  const auth = req.headers.get('Authorization') ?? ''
  if (!auth.startsWith('Bearer ')) {
    return responder({ error: 'Necesitas entrar' }, 401)
  }

  let clip: string
  try {
    const cuerpo = await req.json()
    clip = String(cuerpo.clip ?? '')
    if (!/^[0-9a-f-]{36}$/i.test(clip)) throw new Error()
  } catch {
    return responder({ error: 'Petición inválida' }, 400)
  }

  // Cliente CON el token de quien llama: asi auth.uid() dentro de la base es esa
  // persona y las politicas siguen aplicando. Usar service_role aqui saltaria
  // RLS y habria que reimplementar el permiso a mano.
  const comoUsuario = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: auth } } },
  )

  const { data: usuario } = await comoUsuario.auth.getUser()
  if (!usuario?.user) return responder({ error: 'Sesión inválida' }, 401)

  // 1 · ¿Tiene derecho a verlo? Lo decide la misma funcion que usa el resto del
  //     sistema; no se reimplementa la regla aqui.
  const { data: puede, error: e1 } = await comoUsuario.rpc('tiene_acceso', { clip })
  if (e1) return responder({ error: e1.message }, 500)
  if (!puede) return responder({ error: 'No tienes acceso a este clip', motivo: 'sin_acceso' }, 403)

  // 2 · ¿Está bloqueado en su país?
  //
  // BYPASS EXPLÍCITO DE ADMINISTRACIÓN. tiene_acceso() ya deja pasar a un
  // admin sin pagar ni suscribirse, pero el geobloqueo es una segunda puerta
  // y sin esto un administrador que estuviera en un país bloqueado no podría
  // revisar el clip para moderarlo — justo cuando más falta le hace verlo.
  // El bloqueo por país protege a la creadora de su público, no de quien
  // administra la plataforma.
  const { data: esAdmin } = await comoUsuario.rpc('es_admin')

  const pais = paisDe(req)
  if (pais && !esAdmin) {
    const { data: bloqueado } = await comoUsuario.rpc('bloqueado_en', { clip, pais })
    if (bloqueado) {
      return responder({
        error: 'Este contenido no está disponible en tu país',
        motivo: 'geobloqueo', pais,
      }, 451)
    }
  }

  // 3 · Recién ahora se emite la URL, y de vida corta: si se filtrara, expira
  //     antes de servir de mucho.
  const { data: fila, error: e2 } = await comoUsuario
    .from('clips').select('storage_path').eq('id', clip).single()
  if (e2 || !fila?.storage_path) return responder({ error: 'Ese clip no tiene archivo' }, 404)

  const { data: firmada, error: e3 } = await comoUsuario
    .storage.from('clips').createSignedUrl(fila.storage_path, 900)   // 15 min
  if (e3) return responder({ error: e3.message }, 500)

  return responder({ url: firmada.signedUrl, expira_en: 900, pais })
})
