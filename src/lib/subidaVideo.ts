/* Subida de VIDEO reanudable (TUS) a Supabase Storage.
 *
 * Un video puede pesar hasta 2 GB. Mandarlo en UNA peticion (el `.upload()` de
 * supabase-js o un XHR) es fragil a ese tamaño: un corte de red, un cambio de
 * Wi‑Fi o un proxy que cierra la conexion obliga a empezar desde cero, justo
 * cuando mas parece que «la pagina se trabo». TUS parte el archivo en trozos de
 * 6 MiB y, si algo falla, pregunta al servidor hasta donde llego y sigue desde
 * ahi (tambien tras recargar la pagina, mientras la subida siga vigente).
 *
 * Es el UNICO camino de video. Portadas, fotos de album, avatar y documentos
 * son archivos chicos y siguen con `.upload()` / URL firmada.
 *
 * Mismos buckets, rutas y politicas RLS que la subida normal: el permiso lo
 * revisa Storage con la sesion de quien sube. NO hay funcion de borde de por
 * medio y no se guarda ningun secreto aqui: el token es el de la sesion.
 *
 * Reanudar: `tus-js-client` guarda en localStorage la URL de la subida
 * (huella = nombre + tipo + tamaño + fecha del archivo + endpoint). Si ya hay una
 * para este archivo se continua ESA, con la misma ruta de destino; si no (o ya
 * caduco, ~24 h), se empieza de nuevo. `removeFingerprintOnSuccess` la borra al
 * terminar, para poder volver a subir el mismo archivo otro dia.
 *
 * Esta funcion NUNCA lanza: devuelve la ruta o un texto de error en español. */
import * as tus from 'tus-js-client'
import { supabase } from './supabase'

/** Requisito de Supabase: trozos de exactamente 6 MiB. No cambiar. */
export const CHUNK_TUS = 6 * 1024 * 1024

const URL_PROYECTO = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? ''
const CLAVE_PUBLICA = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? ''

/** El endpoint resumible. Si la URL del proyecto es la de siempre
 *  (`https://<ref>.supabase.co`) se usa el host de Storage directo
 *  (`<ref>.storage.supabase.co`), que es el que Supabase recomienda para archivos
 *  grandes; en cualquier otro caso (otro dominio, local) el de la propia URL. */
export function endpointTus(base: string = URL_PROYECTO): string {
  const m = /^https:\/\/([a-z0-9]+)\.supabase\.co\/?$/.exec(base)
  const host = m ? `https://${m[1]}.storage.supabase.co` : base.replace(/\/+$/, '')
  return `${host}/storage/v1/upload/resumable`
}

export type ProgresoVideo = { loaded: number; total: number; fraction: number }

export type OpcionesVideo = {
  bucket: string
  /** Donde guardarlo si es una subida NUEVA. Si hay una anterior reanudable de este
   *  mismo archivo se usa la ruta de aquella, y la devuelta puede ser distinta. */
  ruta: string
  archivo: File
  contentType?: string
  signal?: AbortSignal
  alProgreso?: (p: ProgresoVideo) => void
}

export type ResultadoVideo =
  | { ruta: string; reanudada: boolean }
  | { error: string; cancelada?: boolean }

export const TEXTO_CANCELADA = 'Subida cancelada.'

/** El error de TUS, en palabras de persona. Un corte de red dice que al
 *  reintentar se continua, no que se perdio todo. */
export function textoErrorTus(e: unknown): string {
  const d = e as { originalResponse?: { getStatus(): number; getBody(): string } | null; message?: string }
  const st = d.originalResponse ? d.originalResponse.getStatus() : null
  let cuerpo = ''
  try { cuerpo = d.originalResponse?.getBody() ?? '' } catch { /* sin cuerpo */ }

  if (st === 401 || st === 403) {
    return 'Tu sesión caducó o no tienes permiso para subir aquí. Vuelve a entrar y reintenta.'
  }
  if (st === 413 || /exceeded the maximum|payload too large|too large/i.test(cuerpo)) {
    return 'El servidor rechazó el video por pesar demasiado.'
  }
  if (st === 415 || /mime type|not supported/i.test(cuerpo)) {
    return 'Ese formato de video no es válido. Usa MP4, MOV o WebM.'
  }
  if (st === 409) {
    return 'Ya hay un archivo en ese lugar. Reintenta para subirlo otra vez.'
  }
  if (st != null && st >= 500) {
    return 'El servidor falló al recibir el video. Reintenta: continúa donde se quedó.'
  }
  if (st == null) {
    return 'Se cortó la conexión durante la subida. Reintenta: continúa donde se quedó.'
  }
  return `El servidor rechazó el video (${st}). Reintenta en un momento.`
}

export async function subirVideoResumible(o: OpcionesVideo): Promise<ResultadoVideo> {
  try {
    if (o.signal?.aborted) return { error: TEXTO_CANCELADA, cancelada: true }
    if (!URL_PROYECTO) return { error: 'Falta configurar la dirección del servidor.' }

    const { data: s } = await supabase.auth.getSession()
    if (!s.session) return { error: 'Necesitas entrar para subir un video.' }

    const contentType = o.contentType || o.archivo.type || 'application/octet-stream'

    // El token se pide en CADA peticion: una subida de 2 GB puede durar mas que la
    // vida del token y supabase-js lo renueva solo si se le pregunta.
    const comunes = {
      endpoint: endpointTus(),
      chunkSize: CHUNK_TUS,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      headers: { apikey: CLAVE_PUBLICA },
      onBeforeRequest: async (req: tus.HttpRequest) => {
        const { data } = await supabase.auth.getSession()
        const token = data.session?.access_token
        if (token) req.setHeader('Authorization', `Bearer ${token}`)
      },
    }

    // ¿Hay una subida anterior de ESTE archivo, a este bucket, que se pueda seguir?
    const sonda = new tus.Upload(o.archivo, { ...comunes, metadata: {} })
    let anterior: tus.PreviousUpload | null = null
    try {
      const previas = await sonda.findPreviousUploads()
      anterior = previas
        .filter(p => p.metadata?.bucketName === o.bucket && !!p.metadata?.objectName)
        .sort((a, b) => (a.creationTime < b.creationTime ? 1 : -1))[0] ?? null
    } catch { anterior = null }

    const ruta = anterior ? anterior.metadata.objectName : o.ruta

    return await new Promise<ResultadoVideo>(resolver => {
      let terminado = false
      const terminar = (r: ResultadoVideo) => {
        if (terminado) return
        terminado = true
        o.signal?.removeEventListener('abort', alAbortar)
        resolver(r)
      }

      const subida = new tus.Upload(o.archivo, {
        ...comunes,
        metadata: { bucketName: o.bucket, objectName: ruta, contentType, cacheControl: '3600' },
        onProgress: (loaded, total) =>
          o.alProgreso?.({ loaded, total, fraction: total > 0 ? loaded / total : 0 }),
        onSuccess: () => terminar({ ruta, reanudada: anterior != null }),
        onError: err => terminar({ error: textoErrorTus(err) }),
      })

      const alAbortar = () => {
        // Cancelar BORRA lo parcial en el servidor (terminate), no solo detiene.
        subida.abort(true)
          .catch(() => {})
          .finally(() => {
            // Por si ya habia terminado de subirse justo antes: que no quede el objeto.
            supabase.storage.from(o.bucket).remove([ruta]).catch(() => {})
            terminar({ error: TEXTO_CANCELADA, cancelada: true })
          })
      }
      o.signal?.addEventListener('abort', alAbortar)

      if (anterior) subida.resumeFromPreviousUpload(anterior)
      subida.start()
    })
  } catch (e) {
    return { error: textoErrorTus(e) }
  }
}
