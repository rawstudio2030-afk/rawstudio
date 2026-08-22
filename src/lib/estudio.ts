import { supabase } from './supabase'

/** Los siete canales de ingreso de la plataforma, con su estado real.
 *
 *  Existe esta lista porque el estudio solo ofrecia "publicar un clip", aunque
 *  la plataforma promete siete formas de ganar. Cada canal declara si ya se
 *  puede usar: decirlo es mas util que esconder lo que falta. */
export type EstadoCanal = 'listo' | 'sin_configurar' | 'en_obra'

export type Canal = {
  clave: string
  titulo: string
  descripcion: string
  icono: string
  ruta: string | null
  estado: EstadoCanal
  nota?: string
}

export type ResumenEstudio = {
  clips: number
  clipsPublicados: number
  niveles: number
  encargosAbiertos: number
  posts: number
  ganancias: number
}

export async function resumen(uid: string): Promise<ResumenEstudio> {
  const [clips, niveles, encargos, posts, mov] = await Promise.all([
    supabase.from('clips').select('id,published').eq('creator_id', uid),
    supabase.from('subscription_tiers').select('id').eq('creator_id', uid).eq('activo', true),
    supabase.from('custom_requests').select('id')
      .eq('creator_id', uid).in('estado', ['propuesta', 'negociando', 'aceptado', 'pagado', 'en_proceso']),
    supabase.from('posts').select('id').eq('creator_id', uid),
    supabase.from('coin_ledger').select('delta').in('motivo', ['venta_clip', 'propina']),
  ])

  const lista = clips.data ?? []
  return {
    clips: lista.length,
    clipsPublicados: lista.filter((c: { published: boolean }) => c.published).length,
    niveles: niveles.data?.length ?? 0,
    encargosAbiertos: encargos.data?.length ?? 0,
    posts: posts.data?.length ?? 0,
    ganancias: (mov.data ?? []).reduce(
      (s: number, m: { delta: number }) => s + (m.delta > 0 ? m.delta : 0), 0),
  }
}

export function canales(r: ResumenEstudio): Canal[] {
  return [
    {
      clave: 'clips', titulo: 'Videos de pago', icono: '▶', ruta: '/upload',
      descripcion: r.clipsPublicados > 0
        ? `${r.clipsPublicados} publicados de ${r.clips}`
        : 'Cobra por desbloquear cada video',
      estado: 'listo',
    },
    {
      clave: 'renta', titulo: 'Renta por tiempo', icono: '⏱', ruta: '/upload',
      descripcion: 'Acceso de 48 o 72 horas, más barato que la compra',
      estado: 'listo',
    },
    {
      clave: 'niveles', titulo: 'Suscripción mensual', icono: '★', ruta: '/estudio/niveles',
      descripcion: r.niveles > 0
        ? `${r.niveles} ${r.niveles === 1 ? 'nivel activo' : 'niveles activos'}`
        : 'Ingreso fijo cada mes',
      estado: r.niveles > 0 ? 'listo' : 'sin_configurar',
      nota: r.niveles === 0 ? 'Aún no defines ningún nivel' : undefined,
    },
    {
      clave: 'encargos', titulo: 'Contenido a la medida', icono: '✎', ruta: '/estudio/encargos',
      descripcion: r.encargosAbiertos > 0
        ? `${r.encargosAbiertos} ${r.encargosAbiertos === 1 ? 'solicitud abierta' : 'solicitudes abiertas'}`
        : 'Las fans piden algo y negocian el precio contigo',
      estado: 'listo',
    },
    {
      clave: 'blog', titulo: 'Blog', icono: '✍', ruta: '/estudio/blog',
      descripcion: r.posts > 0 ? `${r.posts} entrada(s)` : 'Texto para tus suscriptoras',
      estado: 'listo',
    },
    {
      clave: 'mensajes', titulo: 'Mensajes y propinas', icono: '✉', ruta: '/chat',
      descripcion: 'Conversación directa, con contenido de pago y propinas',
      estado: 'en_obra',
      nota: 'La base ya existe; falta la pantalla',
    },
  ]
}
