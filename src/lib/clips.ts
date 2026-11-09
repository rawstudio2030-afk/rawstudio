import { supabase } from './supabase'
import { leido, noSePudo, type Lectura } from './lectura'

export type Visibilidad = 'pago' | 'suscriptores' | 'gratis'

export type Clip = {
  id: string
  creator_id: string
  title: string
  description: string | null
  cover_path: string | null
  preview_path: string | null
  /** Si hay video. Reemplaza al viejo `storage_path`, que era la ruta dentro
   *  del bucket privado y no hacia falta aqui: lo unico que se preguntaba era
   *  si vale la pena pedir la URL firmada. */
  tiene_video: boolean
  caduca_at: string | null
  caduca_modo: string
  duration_s: number | null
  visibility: Visibilidad
  price_coins: number
  published: boolean
  published_at: string | null
  renta_horas: number | null
  renta_coins: number | null
  es_demo: boolean
  /** `album` = de 10 a 40 fotos y precio fijo; `video` = lo de siempre. */
  formato: 'video' | 'album'
  /** Fotos del album (0 en un video). */
  num_fotos: number
  created_at: string
}

export type ClipConAutora = Clip & {
  profiles: { handle: string; display_name: string; avatar_path: string | null; verified: boolean } | null
}

/** Las columnas del catalogo, nombradas una por una.
 *
 *  Antes aqui habia un `*`. Dejo de servir el 4 de noviembre de 2026, cuando
 *  `clips` paso a dar permiso por columna: un `select=*` pide TODAS, y en
 *  cuanto una esta vedada Postgres responde 42501 y la consulta entera falla
 *  —no devuelve el resto sin ella—. O sea que el `*` no solo publicaba las
 *  notas de moderacion: hacia imposible dejar de publicarlas.
 *
 *  Si se agrega una columna aqui hay que agregarla tambien al `grant select`
 *  de la migracion y al tipo `Clip`; esa tercera parte la comprueba el
 *  compilador, porque nombrarlas le deja inferir el resultado. Igual que
 *  `COLUMNAS_PUBLICAS` en `./supabase` para `profiles`. */
/* Van en una sola linea y repetidas, sin concatenar ni interpolar, porque
 * supabase-js saca el tipo del resultado LEYENDO la cadena: partirla con `+`
 * o armarla con plantilla la convierte en `string` y el tipo se cae. Es feo a
 * proposito; lo alternativo es un `as unknown as` que apaga la unica
 * comprobacion que avisa si esta lista y el tipo `Clip` dejan de coincidir. */
const COLUMNAS = 'id,creator_id,title,description,cover_path,preview_path,tiene_video,duration_s,visibility,price_coins,renta_horas,renta_coins,published,published_at,created_at,es_demo,caduca_at,caduca_modo,formato,num_fotos' as const

const CON_AUTORA = 'id,creator_id,title,description,cover_path,preview_path,tiene_video,duration_s,visibility,price_coins,renta_horas,renta_coins,published,published_at,created_at,es_demo,caduca_at,caduca_modo,formato,num_fotos,profiles!clips_creator_id_fkey(handle,display_name,avatar_path,verified)' as const

/** La portada que ve cualquiera: la de 32 px del bucket publico.
 *
 *  El nombre no miente aunque devuelva la version chica. La ruta es la misma
 *  en los dos buckets —`clip-covers` publico y `clip-covers-full` privado—,
 *  asi que lo que decide cuanto se ve es de donde se lee, no cual se pide. */
export function urlPortada(path: string | null): string | null {
  if (!path) return null
  return supabase.storage.from('clip-covers').getPublicUrl(path).data.publicUrl
}

/** La portada nitida, firmada y de vida corta, PEDIDA DESDE EL NAVEGADOR.
 *
 *  Por aqui solo la abre su autora o un admin: el bucket privado no tiene
 *  politica de lectura para nadie mas, y eso es deliberado. Si la tuviera, el
 *  navegador de quien compra podria firmarla por su cuenta y se saltaria el
 *  geobloqueo, que no se puede decidir aqui —la base no sabe de que pais llega
 *  la peticion—.
 *
 *  A QUIEN PAGA se le entrega por otro camino: `urlVideoFirmada` la devuelve
 *  ya firmada junto con el video, porque la funcion de borde `ver-clip` ve la
 *  IP real y decide acceso y pais antes de que exista una URL. Esta funcion
 *  sigue existiendo para las pantallas de la autora y de administracion, que
 *  no pasan por ahi. */
/* Tampoco devuelve Lectura, y aqui si es por poca cosa: si falla, arriba se
 * cae a la portada borrosa de siempre. Nadie se queda sin saber nada ni ve
 * una afirmacion falsa — ve una imagen peor. */
export async function urlPortadaNitida(
  path: string | null, segundos = 60,
): Promise<string | null> {
  if (!path) return null
  const { data, error } = await supabase.storage
    .from('clip-covers-full').createSignedUrl(path, segundos)
  if (error) { console.warn('[clips] portada nitida:', error.message); return null }
  return data?.signedUrl ?? null
}

export type Acceso =
  /** `portada` es la NÍTIDA, firmada por la función de borde. Puede venir
   *  null —clip sin portada, o un fallo al firmarla— y entonces arriba se usa
   *  la pública de 160 px: una imagen peor, nunca un error. */
  | { url: string; portada: string | null; pais: string | null }
  | { error: string; motivo?: 'sin_acceso' | 'geobloqueo'; pais?: string }

/** Pide la URL del video a la funcion de borde, no directo a Storage.
 *
 *  El paywall ya lo sostienen las politicas, pero el GEOBLOQUEO no puede
 *  decidirse aqui: la base no sabe desde que pais llega la peticion, y el
 *  navegador no es fuente confiable de eso. La funcion ve la IP real —la pone
 *  la red, no quien llama— y decide antes de que exista una URL que entregar.
 *
 *  La URL que devuelve dura 15 minutos: si se filtrara, expira pronto. */
export async function urlVideoFirmada(clipId: string): Promise<Acceso> {
  const r = await pedirAcceso(clipId)
  if ('error' in r) return r
  // Un album no tiene una sola URL: se abre con `fotosDeAlbum`.
  if (r.tipo === 'album') return { error: 'Este contenido es un álbum de fotos' }
  return { url: r.url, portada: r.portada ?? null, pais: r.pais ?? null }
}

export type FotoFirmada = {
  orden: number; url: string
  /** Miniatura firmada de ~480 px; `null` si el album es de antes de las miniaturas. */
  mini: string | null
  ancho: number | null; alto: number | null
}

export type AccesoAlbum =
  | { fotos: FotoFirmada[]; portada: string | null; pais: string | null; expira_en: number }
  | { error: string; motivo?: 'sin_acceso' | 'geobloqueo'; pais?: string }

/** Las fotos de un album, ya firmadas por la funcion de borde (con las mismas
 *  comprobaciones de acceso, edad, cuenta y pais que el video). Las URLs duran
 *  30 minutos (`expira_en`, en segundos): quien mire mas que eso tiene que volver
 *  a pedirlas. */
export async function fotosDeAlbum(clipId: string): Promise<AccesoAlbum> {
  const r = await pedirAcceso(clipId)
  if ('error' in r) return r
  if (r.tipo !== 'album') return { error: 'Este contenido no es un álbum' }
  return { fotos: r.fotos, portada: r.portada ?? null, pais: r.pais ?? null, expira_en: r.expira_en ?? 1800 }
}

type RespuestaAcceso =
  | { tipo: 'video'; url: string; portada: string | null; pais: string | null; expira_en?: number }
  | { tipo: 'album'; fotos: FotoFirmada[]; portada: string | null; pais: string | null; expira_en?: number }
  | { error: string; motivo?: 'sin_acceso' | 'geobloqueo'; pais?: string }

/** Una sola puerta a la funcion de borde. Una respuesta anterior a los albumes
 *  no trae `tipo`: se toma por video. */
async function pedirAcceso(clipId: string): Promise<RespuestaAcceso> {
  const base = import.meta.env.VITE_SUPABASE_URL
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) return { error: 'Necesitas entrar para ver este clip' }

  try {
    const r = await fetch(`${base}/functions/v1/ver-clip`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ clip: clipId }),
    })
    const j = await r.json()
    if (!r.ok) return { error: j.error ?? 'No se pudo abrir el clip', motivo: j.motivo, pais: j.pais }
    if (j.tipo === 'album') return { tipo: 'album', fotos: j.fotos ?? [], portada: j.portada ?? null, pais: j.pais ?? null, expira_en: j.expira_en }
    return { tipo: 'video', url: j.url, portada: j.portada ?? null, pais: j.pais ?? null, expira_en: j.expira_en }
  } catch {
    return { error: 'No pudimos contactar el servidor. Revisa tu conexión.' }
  }
}

export async function clipsPublicados(limite = 30): Promise<Lectura<ClipConAutora[]>> {
  // Lo destacado va primero, en el orden que le puso la administracion, y
  // despues lo demas por fecha. nullsFirst:false manda al final lo que no
  // esta destacado, que es todo salvo un puñado.
  // La caducidad se filtra AQUI y no con una tarea programada: una que
  // dependiera de que un proceso haya corrido dejaria una ventana en la que
  // el clip sigue en el catalogo despues de su fecha.
  const ahora = new Date().toISOString()
  const { data, error } = await supabase.from('clips')
    .select(CON_AUTORA).eq('published', true)
    .or(`caduca_at.is.null,caduca_at.gt.${ahora}`)
    .order('destacado_orden', { ascending: true, nullsFirst: false })
    .order('published_at', { ascending: false }).limit(limite)
  // Devolver lista vacia aqui hacia que el catalogo dijera «todavia nadie ha
  // publicado nada» con 186 clips en la base. Paso de verdad, veinte minutos,
  // el 4 de noviembre de 2026.
  if (error) return noSePudo([], error)
  // `as unknown as` solo por la cardinalidad del join: sin tipos generados de
  // la base, supabase-js no sabe que clips_creator_id_fkey es muchos-a-uno y
  // asume que `profiles` es un array. En ejecucion llega un objeto —o null—,
  // que es lo que dice `ClipConAutora` y lo que usa toda la interfaz. Las
  // COLUMNAS si quedan comprobadas: si una deja de coincidir con `Clip`, esto
  // vuelve a fallar aqui.
  return leido((data ?? []) as unknown as ClipConAutora[])
}

/** Una pagina del catalogo de Explorar: destacados primero, el resto en un
 *  orden revuelto pero ESTABLE para una misma semilla (ver `explorar_ids`).
 *  El filtro ('gratis' | 'pago' | cualquier otro = todo) lo aplica el
 *  servidor, asi que llega a todo el catalogo y no solo a lo ya cargado.
 *  `clipsPublicados` sigue como estaba: lo usa ClipDetail. */
export async function clipsExplorar(
  semilla: string, filtro: string, desde: number, cuantos = 30,
): Promise<Lectura<ClipConAutora[]>> {
  const { data: ids, error: errIds } = await supabase.rpc('explorar_ids', {
    p_semilla: semilla, p_filtro: filtro, p_desde: desde, p_cuantos: cuantos,
  })
  // Un fallo nunca se presenta como «no hay clips».
  if (errIds) return noSePudo([], errIds)
  const orden = ((ids ?? []) as { id: string }[]).map(f => f.id)
  if (orden.length === 0) return leido([])

  const { data, error } = await supabase.from('clips')
    .select(CON_AUTORA).in('id', orden)
  if (error) return noSePudo([], error)
  // `in` no conserva el orden: se reacomoda segun los ids. Un id que ya no
  // este (caduco o lo quitaron entre una consulta y otra) simplemente no sale.
  const porId = new Map(((data ?? []) as unknown as ClipConAutora[]).map(c => [c.id, c]))
  return leido(orden.flatMap(id => { const c = porId.get(id); return c ? [c] : [] }))
}

export async function clipPorId(id: string): Promise<Lectura<ClipConAutora | null>> {
  const { data, error } = await supabase.from('clips')
    .select(CON_AUTORA).eq('id', id).maybeSingle()
  // null significaba «ese clip no existe». Si la consulta fallo, significa
  // otra cosa muy distinta, y la pantalla decia «este clip ya no existe».
  if (error) return noSePudo(null, error)
  // Mismo motivo que arriba: la cardinalidad del join, no las columnas.
  return leido((data as unknown as ClipConAutora) ?? null)
}

/** Incluye borradores solo cuando quien consulta es la propia autora: de eso
 *  se encarga RLS, no este codigo. */
export async function clipsDe(creatorId: string): Promise<Lectura<Clip[]>> {
  const { data, error } = await supabase.from('clips')
    .select(COLUMNAS).eq('creator_id', creatorId)
    .order('created_at', { ascending: false })
  if (error) return noSePudo([], error)
  return leido((data ?? []) as Clip[])
}

export type Bucket = 'clips' | 'clip-covers' | 'clip-covers-full' | 'albumes'

export async function subirArchivo(
  bucket: Bucket, uid: string, archivo: File, ruta?: string,
): Promise<{ path?: string; error?: string }> {
  // La ruta DEBE empezar con el uid: las politicas de storage se apoyan en eso.
  const ext = (archivo.name.split('.').pop() || 'bin').toLowerCase()
  const path = ruta ?? `${uid}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(bucket)
    .upload(path, archivo, { contentType: archivo.type, upsert: false })
  if (error) return { error: error.message }
  return { path }
}

/** Sube la portada en sus dos tamaños, A LA MISMA RUTA en los dos buckets.
 *
 *  Esa igualdad de rutas es lo que hace que `clips.cover_path` sirva para las
 *  dos y que no haga falta una columna nueva. Vive en una sola funcion para
 *  que no se pueda romper por descuido desde dos pantallas distintas.
 *
 *  El orden importa: primero la PRIVADA. Si fuera al contrario y la segunda
 *  subida fallara, quedaria la version publica sin su original guardada en
 *  ninguna parte — la nitida se perderia, y es la unica copia que existe de
 *  ese cuadro. Al revés, lo que queda es una nitida huerfana en un bucket
 *  privado: ocupa espacio y no se ve, que es el fallo barato de los dos. */
export async function subirPortada(
  uid: string, nitida: File, chica: File,
): Promise<{ path?: string; error?: string }> {
  const ruta = `${uid}/${crypto.randomUUID()}.jpg`

  const n = await subirArchivo('clip-covers-full', uid, nitida, ruta)
  if (n.error) return { error: n.error }

  const c = await subirArchivo('clip-covers', uid, chica, ruta)
  if (c.error) return { error: c.error }

  return { path: ruta }
}

export async function crearClip(c: {
  creator_id: string; title: string; description?: string | null
  storage_path?: string | null; cover_path?: string | null; duration_s?: number | null
  visibility: Visibilidad; price_coins: number; published: boolean
  renta_horas?: number | null; renta_coins?: number | null
  preview_path?: string | null
  caduca_at?: string | null
  /** `album` para un album de fotos; sin esto es un video. */
  formato?: 'video' | 'album'
}): Promise<{ id?: string; error?: string }> {
  const { data, error } = await supabase.from('clips').insert(c).select('id').single()
  if (error) return { error: error.message }
  return { id: (data as { id: string }).id }
}

export async function borrarClip(id: string): Promise<string | null> {
  const { error } = await supabase.from('clips').delete().eq('id', id)
  return error ? error.message : null
}
