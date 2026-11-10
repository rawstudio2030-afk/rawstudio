/* Gestionar los clips propios desde el Estudio.
 *
 * La creadora NO tiene UPDATE sobre `clips` (20261115): todo cambio pasa por
 * funciones de la base que validan que el clip sea suyo y tocan solo lo que
 * le corresponde. Aqui estan sus envolturas, con el patron del resto de la
 * carpeta: devuelven `null` si salio bien y el texto del error si no. Un
 * fallo NUNCA se pinta como exito; y un corte de red dice que la accion pudo
 * haberse aplicado (ver `humano`), porque repetirla a ciegas no es seguro.
 *
 * Los errores de las reglas (precio, renta, clip ajeno…) ya vienen en espanol
 * desde la base, y se muestran tal cual. */
import { supabase } from './supabase'
import { humano } from './humano'
import { leido, noSePudo, type Lectura } from './lectura'
import { borrarClip, type Visibilidad } from './clips'

export type MiClip = {
  id: string
  title: string
  description: string | null
  estado: string
  motivo_rechazo: string | null
  created_at: string
  cover_path: string | null
  formato: 'video' | 'album'
  visibility: Visibilidad
  price_coins: number
  renta_horas: number | null
  renta_coins: number | null
  published: boolean
  caduca_at: string | null
  caduca_modo: string
  num_fotos: number
  /** Para saber si tiene video del cual sacar cuadros. */
  tiene_video: boolean | null
}

const COLUMNAS = 'id,title,description,estado,motivo_rechazo,created_at,cover_path,formato,visibility,price_coins,renta_horas,renta_coins,published,caduca_at,caduca_modo,num_fotos,tiene_video'

/** De cuantos en cuantos se pagina «Tus clips». */
export const PAGINA_MIS_CLIPS = 30

/** Una pagina de los clips de la creadora, los mas nuevos primero. Los que ya
 *  se borraron (borrado logico) no salen: para ella ya no existen. */
export async function misClips(
  uid: string, desde: number, cuantos = PAGINA_MIS_CLIPS,
): Promise<Lectura<MiClip[]>> {
  const { data, error } = await supabase.from('clips').select(COLUMNAS)
    .eq('creator_id', uid).is('borrado_at', null)
    .order('created_at', { ascending: false })
    .range(desde, desde + cuantos - 1)
  if (error) return noSePudo([], error)
  return leido((data ?? []) as unknown as MiClip[])
}

async function llamar(fn: string, args: Record<string, unknown>): Promise<string | null> {
  const r = await llamarConDatos(fn, args)
  return r.error
}

/** Lo que devuelven las funciones de edicion: `enRevision` = el cambio mando el
 *  clip de vuelta a moderacion (ya no se ve en el catalogo hasta que se apruebe). */
export type ResultadoEdicion = { error: string | null; enRevision: boolean }

async function llamarConDatos(
  fn: string, args: Record<string, unknown>,
): Promise<ResultadoEdicion> {
  try {
    const { data, error } = await supabase.rpc(fn, args)
    if (error) return { error: humano(error.message), enRevision: false }
    const enRevision = (data as { en_revision?: unknown } | null)?.en_revision === true
    return { error: null, enRevision }
  } catch (e) {
    return { error: humano(e instanceof Error ? e.message : 'No se pudo completar'), enRevision: false }
  }
}

/** Lo que se le dice a la creadora cuando su cambio quedo en revision. */
export const AVISO_EN_REVISION =
  'Tu cambio quedó en revisión; el clip vuelve a mostrarse cuando lo aprueben. Quien ya lo compró sigue viéndolo.'

export type CambiosClip = {
  titulo: string
  descripcion: string
  /** Un album no manda esto: solo cambia titulo y descripcion. */
  venta?: {
    visibilidad: Visibilidad
    precio: number
    /** Las dos o ninguna; ninguna = sin renta. */
    renta: { horas: 48 | 72; coins: number } | null
  }
}

export function editarMiClip(id: string, c: CambiosClip): Promise<ResultadoEdicion> {
  return llamarConDatos('editar_mi_clip', {
    p_clip: id,
    p_titulo: c.titulo,
    p_descripcion: c.descripcion,
    p_visibilidad: c.venta?.visibilidad ?? null,
    p_precio: c.venta ? c.venta.precio : null,
    p_renta_horas: c.venta?.renta?.horas ?? null,
    p_renta_coins: c.venta?.renta?.coins ?? null,
  })
}

/** La portada (sus dos copias) ya debe estar subida: ver `subirPortada`. */
export function cambiarMiPortada(id: string, ruta: string): Promise<ResultadoEdicion> {
  return llamarConDatos('cambiar_mi_portada', { p_clip: id, p_cover_path: ruta })
}

/** Lo saca del catalogo YA. Quien lo compro o lo renta lo conserva. */
export function dejarDeVenderMiClip(id: string): Promise<string | null> {
  return llamar('dejar_de_vender_mi_clip', { p_clip: id })
}

/** ¿Tiene compras, rentas, reportes o reembolsos? Si si, NO se ofrece eliminar.
 *  Si la consulta falla se devuelve el error y no una respuesta: ante la duda
 *  no se deja borrar. */
export async function miClipTieneHistorial(
  id: string,
): Promise<{ tiene: boolean } | { error: string }> {
  try {
    const { data, error } = await supabase.rpc('mi_clip_tiene_historial', { p_clip: id })
    if (error) return { error: humano(error.message) }
    return { tiene: data === true }
  } catch (e) {
    return { error: humano(e instanceof Error ? e.message : 'No se pudo comprobar') }
  }
}

const CON_HISTORIAL =
  'Este clip tiene compras, rentas o reportes, así que no se puede eliminar. Puedes dejar de venderlo ya o programar su retiro.'

/** Borra un clip SIN historial. Vuelve a comprobarlo justo antes: si entre que
 *  se abrio el panel y este toque alguien lo compro, borrarlo lo convertiria en
 *  un borrado logico y quien pago perderia el acceso. Ante la duda, no se borra. */
export async function eliminarMiClip(id: string): Promise<string | null> {
  const h = await miClipTieneHistorial(id)
  if ('error' in h) return `No pudimos comprobar que se pueda eliminar. ${h.error}`
  if (h.tiene) return CON_HISTORIAL
  const m = await borrarClip(id)
  if (!m) return null
  // El servidor tambien lo rechaza si el clip tiene historial (aunque la pantalla
  // ya no lo ofrezca): se dice igual que arriba, en lugar de un error de base.
  if (/ya tiene compras|restrict_violation|23001/i.test(m)) return CON_HISTORIAL
  return humano(m)
}

/** ¿Ya paso la fecha de retiro? Con un minuto de margen: la fecha la pone el
 *  reloj del servidor y `ahora` el del telefono; sin margen, un «dejar de venderlo
 *  ya» recien hecho aparecia como programado si el telefono iba unos segundos atrasado.
 *  Una fecha de retiro puesta por la creadora siempre es de mañana en adelante. */
export function yaCaduco(iso: string | null, ahora: number): boolean {
  return iso != null && new Date(iso).getTime() <= ahora + 60_000
}
