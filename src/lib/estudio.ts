import { supabase } from './supabase'
import { cuantos, palabra } from './plural'
import { leido, noSePudo, type Lectura } from './lectura'

/** Los seis canales de ingreso de la plataforma, con su estado real.
 *
 *  Existe esta lista porque el estudio solo ofrecia "publicar un clip", aunque
 *  la plataforma promete siete formas de ganar. Cada canal declara si ya se
 *  puede usar: decirlo es mas util que esconder lo que falta. */
export type EstadoCanal = 'listo' | 'sin_configurar' | 'en_obra'

/** `hacer` es lo que se repite: subir, responder, escribir. `ajustar` es lo
 *  que se toca una vez y no se vuelve a mirar.
 *
 *  La distincion existe porque el estudio trataba igual «subir un clip», que
 *  se hace mil veces, y «define tu nivel de suscripcion», que se hace una. Esa
 *  mezcla es lo que hacia que el estudio pareciera un panel de configuracion
 *  en vez de un sitio de trabajo. */
export type Grupo = 'hacer' | 'ajustar'

export type Canal = {
  clave: string
  titulo: string
  descripcion: string
  icono: string
  ruta: string | null
  estado: EstadoCanal
  grupo: Grupo
  nota?: string
}

export type ResumenEstudio = {
  clips: number
  clipsPublicados: number
  niveles: number
  encargosAbiertos: number
  posts: number
  ganancias: number
  /** Si ya hay cuenta para cobrar. Se consulta para poder APLICAR LA REGLA:
   *  lo que ya esta hecho se esconde, lo que falta y bloquea dinero se queda a
   *  la vista. Sin este dato habria que elegir entre enseñar siempre la cuenta
   *  de cobro —ruido para quien ya la puso— o nunca —y entonces quien no la
   *  tiene no cobra y no sabe por que—. */
  tieneCuenta: boolean
}

export async function resumen(uid: string): Promise<ResumenEstudio> {
  const [clips, niveles, encargos, posts, mov, cuenta] = await Promise.all([
    supabase.from('clips').select('id,published').eq('creator_id', uid),
    supabase.from('subscription_tiers').select('id').eq('creator_id', uid).eq('activo', true),
    supabase.from('custom_requests').select('id')
      .eq('creator_id', uid).in('estado', ['propuesta', 'negociando', 'aceptado', 'pagado', 'en_proceso']),
    supabase.from('posts').select('id').eq('creator_id', uid),
    supabase.from('coin_ledger').select('delta').in('motivo', ['venta_clip', 'propina', 'venta_consulta']),
    supabase.from('payout_accounts').select('user_id').eq('user_id', uid),
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
    // Si la consulta falla se asume que SI la tiene: la alternativa es
    // insistirle con un aviso de «te falta la cuenta» a quien ya la puso, y
    // eso es peor que no recordarselo a quien no.
    tieneCuenta: cuenta.error ? true : (cuenta.data?.length ?? 0) > 0,
  }
}

/** Los canales, en dos grupos.
 *
 *  Antes eran seis en una sola lista y dos de ellos mentian de formas
 *  distintas:
 *
 *  - «Renta por tiempo» era una entrada propia que llevaba a /upload, igual
 *    que «Videos de pago». No es un canal: es una casilla que se marca al
 *    subir. Dos renglones para la misma pantalla hacen pensar que son dos
 *    sitios. Ahora es una nota dentro del primero.
 *
 *  - «Mensajes y propinas» decia «en construccion» mientras los ENCARGOS
 *    —que son una conversacion con alguien que quiere algo— figuraban como un
 *    canal aparte. Eran lo mismo visto por dos lados. Ahora es un solo
 *    renglon, y existe de verdad.
 */
export function canales(
  r: ResumenEstudio,
  /** Reglas de los albumes, si estan ENCENDIDOS (si no, no hay tarjeta). */
  albumes?: { precio: number; min: number; max: number } | null,
): Canal[] {
  const lista: Canal[] = [
    {
      clave: 'clips', titulo: 'Videos de pago', icono: 'play', ruta: '/upload',
      grupo: 'hacer',
      descripcion: r.clipsPublicados > 0
        ? `${r.clipsPublicados} ${palabra(r.clipsPublicados, 'publicado')} de ${r.clips}`
        : 'Cobra por desbloquear cada video',
      estado: 'listo',
      nota: 'Al subir eliges tambien si se puede rentar por 48 o 72 horas',
    },
    {
      // Lo ya publicado: cambiar el precio, la portada, los datos, dejar de venderlo.
      clave: 'misclips', titulo: 'Tus clips', icono: 'estudio', ruta: '/estudio/clips',
      grupo: 'hacer',
      descripcion: r.clips > 0
        ? `Precio, portada y más de ${cuantos(r.clips, 'publicación', 'publicaciones')}`
        : 'Aquí vas a gestionar lo que publiques',
      estado: 'listo',
    },
    ...(albumes ? [{
      clave: 'albumes', titulo: 'Álbumes de fotos', icono: 'estudio', ruta: '/upload/album',
      grupo: 'hacer' as const,
      descripcion: `De ${albumes.min} a ${cuantos(albumes.max, 'foto')} por un precio fijo`,
      estado: 'listo' as const,
    }] : []),
    {
      clave: 'encargos', titulo: 'Encargos', icono: 'sobre', ruta: '/chat',
      grupo: 'hacer',
      descripcion: r.encargosAbiertos > 0
        ? `${cuantos(r.encargosAbiertos, 'solicitud', 'solicitudes')} ${palabra(r.encargosAbiertos, 'abierta')}`
        : 'Las fans piden algo y negocian el precio contigo',
      estado: 'listo',
    },
    {
      clave: 'blog', titulo: 'Blog', icono: 'texto', ruta: '/estudio/blog',
      grupo: 'hacer',
      descripcion: r.posts > 0 ? cuantos(r.posts, 'entrada') : 'Texto para tus suscriptoras',
      estado: 'listo',
    },
    {
      // LA SUSCRIPCION NO SE RENUEVA SOLA: `suscribirse` cobra una vez y deja 30
      // dias de acceso; al vencer hay que suscribirse otra vez. El texto lo
      // dice asi, y el icono es la corona (el mismo de la portada) y no el
      // ciclo de flechas, que prometia un cobro que se repite.
      clave: 'niveles', titulo: 'Suscripción mensual', icono: 'corona', ruta: '/estudio/niveles',
      grupo: 'ajustar',
      descripcion: r.niveles > 0
        ? `${cuantos(r.niveles, 'nivel', 'niveles')} ${palabra(r.niveles, 'activo')}`
        : 'Pon un precio: quien se suscribe paga una vez y tiene 30 días',
      estado: r.niveles > 0 ? 'listo' : 'sin_configurar',
      nota: r.niveles === 0 ? 'Sin un nivel, nadie puede suscribirse' : undefined,
    },
  ]

  // LA REGLA: lo que ya esta hecho se esconde; lo que falta y bloquea dinero
  // se queda a la vista. La cuenta para cobrar solo aparece mientras no
  // exista. Quien ya la puso no vuelve a verla —la cambia desde Retirar, que
  // es donde importa— y quien no la tiene se encuentra con lo unico que le
  // impide cobrar, en vez de descubrirlo al pulsar el boton.
  if (!r.tieneCuenta) {
    lista.push({
      clave: 'cobro', titulo: 'Cuenta para cobrar', icono: 'banco',
      ruta: '/estudio/cobro', grupo: 'ajustar',
      descripcion: 'Sin esto puedes ganar, pero no puedes retirar',
      estado: 'sin_configurar',
      nota: 'Se transfiere por SPEI a la cuenta que registres',
    })
  }

  return lista
}


/** Lo que dejo UNA publicacion propia, en centavos de dolar (lo que llego a la
 *  cuenta, ya sin la comision). Ver `estudio_desempeno_clips` en la base.
 *
 *  Una suscripcion, un encargo y una propina del perfil NO estan aqui: no van
 *  atados a un clip, y por eso la suma de esta lista no cuadra con «Has ganado». */
export type DesempenoClip = {
  id: string
  title: string
  cover_path: string | null
  formato: 'video' | 'album'
  published: boolean
  price_coins: number
  desbloqueos: number
  rentas: number
  ganado_ventas: number
  ganado_propinas: number
  ganado_consultas: number
  consultas_pagadas: number
  ganado_total: number
}

export async function desempenoClips(): Promise<Lectura<DesempenoClip[]>> {
  const { data, error } = await supabase.rpc('estudio_desempeno_clips')
  if (error) return noSePudo([], error)
  // Los conteos y sumas llegan como bigint: se pasan a numero para no
  // encontrarse con un texto al sumar o comparar.
  const filas = ((data ?? []) as Record<string, unknown>[]).map(f => ({
    ...f,
    price_coins: Number(f.price_coins), desbloqueos: Number(f.desbloqueos), rentas: Number(f.rentas),
    ganado_ventas: Number(f.ganado_ventas), ganado_propinas: Number(f.ganado_propinas),
    ganado_consultas: Number(f.ganado_consultas), consultas_pagadas: Number(f.consultas_pagadas),
    ganado_total: Number(f.ganado_total),
  })) as DesempenoClip[]
  return leido(filas)
}
