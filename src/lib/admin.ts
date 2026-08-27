import { supabase } from './supabase'
import { miniaturaDeVideo } from './miniatura'

/** Si es admin lo decide la base, no el cliente. Esta consulta solo sirve para
 *  DIBUJAR o no el panel; la proteccion de verdad son las politicas RLS: aunque
 *  alguien forzara esto a true editando el JavaScript, la base seguiria
 *  rechazando cada escritura. */
export async function soyAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('es_admin')
  if (error) { console.warn('[admin] es_admin:', error.message); return false }
  return data === true
}

export type PerfilAdmin = {
  id: string
  email: string
  handle: string
  display_name: string
  avatar_path: string | null
  is_creator: boolean
  verified: boolean
  suspended_at: string | null
  suspended_reason: string | null
  adult_confirmed_at: string | null
  metodos: string
  ultimo_acceso: string | null
  clips_total: number
  clips_publicados: number
  es_admin: boolean
  es_demo: boolean
  created_at: string
}

/** El correo vive en auth.users, que el cliente no puede consultar. Se pide por
 *  una funcion security definer que comprueba es_admin() del lado del servidor:
 *  a un no-admin le devuelve cero filas, y un anonimo ni siquiera puede
 *  ejecutarla. */
export async function listarPerfiles(busqueda: string): Promise<PerfilAdmin[]> {
  const { data, error } = await supabase
    .rpc('admin_listar_usuarios', { busqueda: busqueda.trim() })
  if (error) { console.warn('[admin] listar:', error.message); return [] }
  return (data ?? []) as PerfilAdmin[]
}

/** Toda accion de admin queda en la bitacora. Se escribe DESPUES del cambio y
 *  no antes: si el cambio falla por RLS, no queda una entrada que afirme algo
 *  que nunca paso. */
async function anotar(accion: string, objetivo: string, detalle: object = {}) {
  const { data: s } = await supabase.auth.getSession()
  const admin = s.session?.user.id
  if (!admin) return
  const { error } = await supabase.from('admin_log')
    .insert({ admin_id: admin, accion, objetivo, detalle })
  if (error) console.warn('[admin] bitacora:', error.message)
}

export async function suspender(id: string, motivo: string) {
  const { error } = await supabase.from('profiles')
    .update({ suspended_at: new Date().toISOString(), suspended_reason: motivo || null })
    .eq('id', id)
  if (error) return error.message
  await anotar('suspender', id, { motivo })
  return null
}

export async function reactivar(id: string) {
  const { error } = await supabase.from('profiles')
    .update({ suspended_at: null, suspended_reason: null }).eq('id', id)
  if (error) return error.message
  await anotar('reactivar', id)
  return null
}

export async function cambiarVerificacion(id: string, verificado: boolean) {
  const { error } = await supabase.from('profiles')
    .update({ verified: verificado }).eq('id', id)
  if (error) return error.message
  await anotar(verificado ? 'verificar' : 'quitar_verificacion', id)
  return null
}

export type Entrada = {
  id: number; admin_id: string; accion: string
  objetivo: string | null; detalle: Record<string, unknown>; created_at: string
}

export async function bitacora(limite = 40): Promise<Entrada[]> {
  const { data, error } = await supabase.from('admin_log')
    .select('*').order('created_at', { ascending: false }).limit(limite)
  if (error) { console.warn('[admin] bitacora:', error.message); return [] }
  return (data ?? []) as Entrada[]
}

/** Mover privilegios pasa por funciones del servidor y no por una politica:
 *  hacen falta salvaguardas que una politica no puede expresar —nadie se quita
 *  el rol a si misma, y siempre queda al menos una administradora—. */
export async function otorgarAdmin(id: string, motivo: string) {
  const { error } = await supabase.rpc('admin_otorgar_admin',
    { objetivo: id, motivo: motivo || null })
  return error ? error.message : null
}

export async function revocarAdmin(id: string) {
  const { error } = await supabase.rpc('admin_revocar_admin', { objetivo: id })
  return error ? error.message : null
}

export async function marcarCreadora(id: string, valor: boolean) {
  const { error } = await supabase.rpc('admin_marcar_creadora',
    { objetivo: id, valor })
  return error ? error.message : null
}

/** Siembra y borrado del contenido de demostracion.
 *
 *  Existe para que la plataforma no se vea vacia al enseñarla, sin usar a
 *  personas reales. Todo queda marcado y se puede vaciar de un comando. */
export async function sembrarDemo() {
  const { data, error } = await supabase.rpc('admin_sembrar_demo')
  if (error) return { error: error.message }
  return data as { ok: boolean; perfiles: number; clips: number }
}

export async function borrarDemo() {
  const { data, error } = await supabase.rpc('admin_borrar_demo')
  if (error) return { error: error.message }
  return data as { ok: boolean; borrados: number }
}

// ── Alta de creadoras con expediente ────────────────────────────────────────

export type Expediente = {
  user_id: string
  identificacion_path: string | null
  consentimiento_path: string | null
  consentimiento_fecha: string | null
  nota: string | null
  alta_at: string
}

export async function altaCreadora(datos: {
  handle: string; nombre: string; bio?: string
  consentimientoFecha?: string; nota?: string
}) {
  const { data, error } = await supabase.rpc('admin_alta_creadora', {
    p_handle: datos.handle.trim().toLowerCase(),
    p_nombre: datos.nombre.trim(),
    p_bio: datos.bio?.trim() || null,
    p_consentimiento_fecha: datos.consentimientoFecha || null,
    p_nota: datos.nota?.trim() || null,
  })
  if (error) return { error: error.message }
  return data as { ok: boolean; id: string; handle: string; verificada: boolean }
}

/** Sube los documentos del expediente. La verificación se enciende sola cuando
 *  ambos están cargados: lo decide un trigger en la base, no este código. */
export async function subirExpediente(
  creadora: string, identificacion: File, consentimiento: File, fecha?: string,
) {
  const subir = async (f: File, nombre: string) => {
    const ext = (f.name.split('.').pop() || 'jpg').toLowerCase()
    const ruta = `${creadora}/${nombre}.${ext}`
    const { error } = await supabase.storage.from('expedientes')
      .upload(ruta, f, { contentType: f.type, upsert: true })
    if (error) throw new Error(error.message)
    return ruta
  }
  try {
    const a = await subir(identificacion, 'identificacion')
    const b = await subir(consentimiento, 'consentimiento')
    const { data, error } = await supabase.rpc('admin_expediente_documentos', {
      creadora, identificacion: a, consentimiento: b, fecha: fecha || null,
    })
    if (error) return { error: error.message }
    return data as { ok: boolean; verificada: boolean }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

/** Publica un clip a nombre de una creadora dada de alta. Rechaza si el
 *  expediente está incompleto: esa regla vive en la base. */
export async function publicarPara(
  datos: {
    creadora: string; titulo: string; video: File; portada?: File | null
    precio: number; visibilidad: 'pago' | 'suscriptores' | 'gratis'
    descripcion?: string
  },
  alAvanzar?: (etapa: string, fraccion: number) => void,
) {
  // Se pide primero una URL firmada y despues se sube por XHR.
  //
  // Dos razones, ambas por lo que se vio en el alta de la primera creadora:
  //
  // 1. El permiso se revisa AL PEDIR la URL, no al terminar de transferir. Si
  //    falta el expediente o no hay privilegios, el error llega en un segundo
  //    y no despues de mandar 17 MB en balde.
  // 2. XHR si emite progreso; el cliente de Supabase no. Sin eso una subida
  //    normal de varios minutos era indistinguible de una atorada.
  const subidos: { bucket: string; ruta: string }[] = []

  const subir = async (bucket: string, f: File, etapa: string) => {
    const ext = (f.name.split('.').pop() || 'bin').toLowerCase()
    const ruta = `${datos.creadora}/${crypto.randomUUID()}.${ext}`
    const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(ruta)
    if (error) throw new Error(error.message)

    await new Promise<void>((listo, falla) => {
      const x = new XMLHttpRequest()
      x.open('PUT', data.signedUrl)
      x.setRequestHeader('content-type', f.type || 'application/octet-stream')
      x.upload.onprogress = e => {
        if (e.lengthComputable) alAvanzar?.(etapa, e.loaded / e.total)
      }
      x.onload = () => (x.status >= 200 && x.status < 300)
        ? listo()
        : falla(new Error(`El servidor rechazo el archivo (${x.status})`))
      x.onerror = () => falla(new Error('Se interrumpio la conexion durante la subida'))
      x.onabort = () => falla(new Error('La subida se cancelo'))
      x.send(f)
    })

    subidos.push({ bucket, ruta })
    alAvanzar?.(etapa, 1)
    return ruta
  }

  // Si el guardado falla, los archivos ya transferidos quedarian ocupando
  // espacio sin ningun clip que los use. Se borran para que un reintento
  // arranque limpio.
  const limpiar = async () => {
    for (const { bucket, ruta } of subidos) {
      await supabase.storage.from(bucket).remove([ruta]).catch(() => {})
    }
  }

  try {
    // Si no viene portada, se saca un cuadro del propio video. Antes se caia
    // siempre al patron generado, que no dice nada de lo que hay dentro.
    let portada = datos.portada ?? null
    if (!portada) {
      alAvanzar?.('portada', 0)
      portada = await miniaturaDeVideo(datos.video)
    }

    const rutaVideo = await subir('clips', datos.video, 'video')
    const rutaPortada = portada
      ? await subir('clip-covers', portada, 'portada')
      : null

    alAvanzar?.('guardando', 0)
    const { data, error } = await supabase.rpc('admin_publicar_para', {
      creadora: datos.creadora, p_titulo: datos.titulo.trim(),
      p_archivo: rutaVideo, p_portada: rutaPortada,
      p_precio: datos.precio, p_visibilidad: datos.visibilidad,
      p_descripcion: datos.descripcion?.trim() || null,
    })
    if (error) { await limpiar(); return { error: error.message } }
    alAvanzar?.('guardando', 1)
    return data as { ok: boolean; clip: string }
  } catch (e) {
    await limpiar()
    return { error: (e as Error).message }
  }
}

/* ==================== Modulo 1: usuarios ==================== */

export type RolUsuario    = 'admin' | 'creadora' | 'usuaria'
export type EstadoCuenta  = 'activa' | 'suspendida' | 'baneada'

/** El rol es DERIVADO, no una columna: alguien puede ser administradora y
 *  creadora a la vez. Se calcula en public.rol_de() y llega de solo lectura;
 *  para cambiarlo hay que llamar a otorgarAdmin o marcarCreadora. */
export type FilaUsuario = {
  id: string; email: string; handle: string; display_name: string
  avatar_path: string | null
  rol: RolUsuario; estado: EstadoCuenta
  verified: boolean; identidad_verificada: boolean
  suspended_at: string | null; suspended_reason: string | null
  suspendido_hasta: string | null
  baneado_at: string | null; baneado_motivo: string | null
  created_at: string; ultimo_acceso: string | null
  saldo: number; total_ganado: number
  clips_total: number; clips_publicados: number
  es_demo: boolean
  /** Total de filas que cumplen el filtro, no las de esta pagina. Viene
   *  repetido en cada fila porque sale de un count() sobre la ventana. */
  total_filas: number
}

export type OrdenUsuarios =
  | 'created_at' | 'ultimo_acceso' | 'handle' | 'email'
  | 'estado' | 'rol' | 'saldo' | 'total_ganado' | 'clips_total'

export type ConsultaUsuarios = {
  busqueda?: string; rol?: RolUsuario | ''; estado?: EstadoCuenta | ''
  orden?: OrdenUsuarios; descendente?: boolean
  pagina?: number; porPagina?: number
}

export async function listarUsuarios(q: ConsultaUsuarios = {}) {
  const { data, error } = await supabase.rpc('admin_usuarios', {
    busqueda: (q.busqueda ?? '').trim(),
    filtro_rol: q.rol ?? '', filtro_estado: q.estado ?? '',
    orden: q.orden ?? 'created_at', descendente: q.descendente ?? true,
    pagina: q.pagina ?? 0, por_pagina: q.porPagina ?? 25,
  })
  if (error) return { filas: [] as FilaUsuario[], total: 0, error: error.message }
  const filas = (data ?? []) as FilaUsuario[]
  return { filas, total: filas[0]?.total_filas ?? 0, error: '' }
}

export type Movimiento = {
  id: number; delta: number; motivo: string
  nota: string | null; creado_por: string | null; created_at: string
}
export type ClipDeUsuario = {
  id: string; titulo: string; publicado: boolean; visibilidad: string
  precio: number; portada: string | null; created_at: string
}
export type AccionRegistrada = {
  id: number; accion: string; detalle: Record<string, unknown>
  admin: string; created_at: string
}
export type FichaUsuario = {
  clips: ClipDeUsuario[]; movimientos: Movimiento[]
  acciones: AccionRegistrada[]; reportes: unknown[]
}

export async function fichaUsuario(id: string) {
  const { data, error } = await supabase.rpc('admin_usuario_detalle', { objetivo: id })
  if (error) return { error: error.message }
  if (data && typeof data === 'object' && 'error' in data)
    return { error: (data as { error: string }).error }
  return { ficha: data as FichaUsuario }
}

/* Las tres acciones de estado pasan por funciones del servidor y no por un
 * update directo. La version anterior escribia en profiles desde el cliente y
 * anotaba la bitacora en una segunda llamada: si la primera pasaba y la
 * segunda no, quedaba un castigo sin registro. Ahora ambas cosas ocurren en
 * la misma transaccion, y ahi viven tambien las salvaguardas (no castigarse a
 * una misma, no castigar a otra administradora, motivo obligatorio). */

export async function suspenderCuenta(id: string, motivo: string, hasta?: string | null) {
  const { error } = await supabase.rpc('admin_suspender', {
    objetivo: id, motivo, hasta: hasta || null,
  })
  return error?.message ?? ''
}

export async function banearCuenta(id: string, motivo: string) {
  const { error } = await supabase.rpc('admin_banear', { objetivo: id, motivo })
  return error?.message ?? ''
}

export async function reactivarCuenta(id: string) {
  const { error } = await supabase.rpc('admin_reactivar', { objetivo: id })
  return error?.message ?? ''
}

export async function ajustarSaldo(id: string, cantidad: number, motivo: string) {
  const { data, error } = await supabase.rpc('admin_ajustar_saldo', {
    objetivo: id, cantidad, motivo_texto: motivo,
  })
  if (error) return { error: error.message }
  return data as { ok: boolean; saldo: number }
}

/* ==================== Modulo 6: bitacora ==================== */

export type EventoBitacora = {
  id: number; accion: string; created_at: string; ip: string | null
  actor: string; actor_handle: string | null; actor_nombre: string | null
  objetivo: string | null; objetivo_handle: string | null; objetivo_nombre: string | null
  detalle: Record<string, unknown>
  total_filas: number
}

export type ConsultaBitacora = {
  busqueda?: string; accion?: string
  desde?: string | null; hasta?: string | null
  pagina?: number; porPagina?: number
}

export async function leerBitacora(q: ConsultaBitacora = {}) {
  const { data, error } = await supabase.rpc('bitacora', {
    busqueda: (q.busqueda ?? '').trim(), filtro_accion: q.accion ?? '',
    desde_: q.desde || null, hasta_: q.hasta || null,
    pagina: q.pagina ?? 0, por_pagina: q.porPagina ?? 50,
  })
  if (error) return { filas: [] as EventoBitacora[], total: 0, error: error.message }
  const filas = (data ?? []) as EventoBitacora[]
  return { filas, total: filas[0]?.total_filas ?? 0, error: '' }
}

export async function accionesBitacora() {
  const { data, error } = await supabase.rpc('bitacora_acciones')
  if (error) return []
  return (data ?? []) as { accion: string; cuantas: number }[]
}

/** Se llama al entrar. La IP NO la manda el navegador —no conoce la suya—
 *  sino que la lee el servidor de las cabeceras que pone Cloudflare. Aqui
 *  solo se avisa de que hubo un acceso y con que metodo. */
export async function registrarAcceso(metodo: string) {
  const { error } = await supabase.rpc('registrar_acceso', { metodo })
  if (error) console.warn('[admin] registrar acceso:', error.message)
}

/* ==================== Modulo 2: moderacion ==================== */

export type EstadoClip = 'pendiente' | 'aprobado' | 'rechazado' | 'retirado'

export type ClipEnCola = {
  id: string; titulo: string; descripcion: string | null
  cover_path: string | null; storage_path: string | null
  duracion: number | null; precio: number; visibilidad: string
  estado: EstadoClip; motivo_rechazo: string | null
  created_at: string; revisado_at: string | null
  creadora: string; creadora_handle: string; creadora_nombre: string
  creadora_verificada: boolean; creadora_estado: string
  reportes: number; gravedad: number; total_filas: number
}

export async function colaModeracion(
  estado: EstadoClip | '' = 'pendiente', pagina = 0, porPagina = 24,
) {
  const { data, error } = await supabase.rpc('admin_cola_moderacion', {
    filtro_estado: estado, pagina, por_pagina: porPagina,
  })
  if (error) return { filas: [] as ClipEnCola[], total: 0, error: error.message }
  const filas = (data ?? []) as ClipEnCola[]
  return { filas, total: filas[0]?.total_filas ?? 0, error: '' }
}

export async function conteoModeracion() {
  const { data, error } = await supabase.rpc('admin_conteo_moderacion')
  if (error) return {} as Record<string, number>
  return Object.fromEntries(
    ((data ?? []) as { estado: string; cuantos: number }[])
      .map(r => [r.estado, Number(r.cuantos)]),
  ) as Record<string, number>
}

export async function moderar(clip: string, decision: EstadoClip, motivo?: string) {
  const { error } = await supabase.rpc('admin_moderar', {
    clip, decision, motivo: motivo ?? null,
  })
  return error?.message ?? ''
}

export async function banderaModeracion(valor: boolean) {
  const { error } = await supabase.rpc('admin_ajustar_bandera', {
    p_clave: 'moderacion_previa_forzada', p_valor: valor,
  })
  return error?.message ?? ''
}

export async function leerBandera(): Promise<boolean> {
  const { data, error } = await supabase
    .from('ajustes').select('valor').eq('clave', 'moderacion_previa_forzada').maybeSingle()
  if (error || !data) return false
  return data.valor === true
}

export type MotivoReporte =
  | 'menor_de_edad' | 'no_consentido' | 'violencia'
  | 'contenido_ilegal' | 'derechos_autor' | 'spam' | 'otro'

export async function reportar(
  objetivo: { clip?: string; perfil?: string },
  motivo: MotivoReporte, comentario?: string,
) {
  const { data, error } = await supabase.rpc('reportar', {
    p_clip: objetivo.clip ?? null, p_perfil: objetivo.perfil ?? null,
    p_motivo: motivo, p_comentario: comentario ?? null,
  })
  if (error) return { error: error.message }
  return data as { ok: boolean; repetido: boolean }
}

/* ==================== Modulo 5: finanzas ==================== */

/** OJO CON LAS UNIDADES: los coins NO son pesos. La plataforma mueve dos
 *  monedas —coins adentro, pesos afuera— y el puente entre ambas es la
 *  recarga, que todavia no existe porque no hay procesador de pagos. Sumarlas
 *  o convertirlas exigiria un tipo de cambio que nadie ha definido. */
export type FilaFinanzas = {
  fuente: string; operaciones: number; bruto_coins: number
  comision_coins: number; para_creadoras: number
}

export type DineroReal = {
  ordenes_pagadas: number; entrado_mxn: number
  ordenes_pendientes: number; pendiente_mxn: number
  dispersado_mxn: number; isr_mxn: number; iva_ret_mxn: number
}

export type PuntoSerie = { dia: string; operaciones: number; coins: number }

export type FilaRanking = {
  id: string; handle: string; nombre: string; ganado: number
  ventas: number; propinas: number; clips_publicados: number
}

const num = <T,>(f: T, ks: (keyof T)[]) => {
  const o = { ...f }
  for (const k of ks) o[k] = Number(o[k]) as T[keyof T]
  return o
}

export async function finanzas(desde?: string | null, hasta?: string | null) {
  const { data, error } = await supabase.rpc('admin_finanzas', {
    desde_: desde || null, hasta_: hasta || null,
  })
  if (error) return { filas: [] as FilaFinanzas[], error: error.message }
  const filas = ((data ?? []) as FilaFinanzas[]).map(f =>
    num(f, ['operaciones', 'bruto_coins', 'comision_coins', 'para_creadoras']))
  return { filas, error: '' }
}

export async function dineroReal(desde?: string | null, hasta?: string | null) {
  const { data, error } = await supabase.rpc('admin_dinero_real', {
    desde_: desde || null, hasta_: hasta || null,
  })
  if (error || !data?.[0]) return null
  return num(data[0] as DineroReal, [
    'ordenes_pagadas', 'entrado_mxn', 'ordenes_pendientes',
    'pendiente_mxn', 'dispersado_mxn', 'isr_mxn', 'iva_ret_mxn',
  ])
}

export async function serieFinanzas(dias = 30) {
  const { data, error } = await supabase.rpc('admin_finanzas_serie', { dias })
  if (error) return [] as PuntoSerie[]
  return ((data ?? []) as PuntoSerie[]).map(p => num(p, ['operaciones', 'coins']))
}

export async function rankingCreadoras(desde?: string | null, hasta?: string | null, limite = 20) {
  const { data, error } = await supabase.rpc('admin_ranking_creadoras', {
    desde_: desde || null, hasta_: hasta || null, limite,
  })
  if (error) return [] as FilaRanking[]
  return ((data ?? []) as FilaRanking[]).map(f =>
    num(f, ['ganado', 'ventas', 'propinas', 'clips_publicados']))
}

/* ==================== Modulo 7: reportes ==================== */

export type EstadoReporte = 'nuevo' | 'en_revision' | 'resuelto' | 'desestimado'

export type Reporte = {
  id: string; motivo: MotivoReporte; gravedad: number
  comentario: string | null; estado: EstadoReporte
  created_at: string; resuelto_at: string | null
  nota_resolucion: string | null; ip: string | null
  reporta: string; reporta_handle: string | null
  clip_id: string | null; clip_titulo: string | null
  clip_estado: string | null; clip_portada: string | null
  perfil_id: string | null; perfil_handle: string | null; perfil_estado: string | null
  creadora: string | null; creadora_handle: string | null
  otros_del_mismo: number; total_filas: number
}

export async function listarReportes(
  estado: EstadoReporte | '' = 'nuevo', motivo: MotivoReporte | '' = '',
  pagina = 0, porPagina = 30,
) {
  const { data, error } = await supabase.rpc('admin_reportes', {
    filtro_estado: estado, filtro_motivo: motivo, pagina, por_pagina: porPagina,
  })
  if (error) return { filas: [] as Reporte[], total: 0, error: error.message }
  const filas = (data ?? []) as Reporte[]
  return { filas, total: Number(filas[0]?.total_filas ?? 0), error: '' }
}

export async function conteoReportes() {
  const { data, error } = await supabase.rpc('admin_conteo_reportes')
  if (error) return {} as Record<string, number>
  return Object.fromEntries(((data ?? []) as { estado: string; cuantos: number }[])
    .map(r => [r.estado, Number(r.cuantos)])) as Record<string, number>
}

export async function resolverReporte(id: string, estado: EstadoReporte, nota?: string) {
  const { error } = await supabase.rpc('admin_resolver_reporte', {
    reporte: id, nuevo_estado: estado, nota: nota ?? null,
  })
  return error?.message ?? ''
}

/** Cierra de golpe todos los pendientes del mismo objetivo. La decision de
 *  moderacion fue una sola; cerrarlos de a uno invita a dejarse alguno
 *  abierto, y los abiertos son los que cuentan para la despublicacion. */
export async function cerrarReportesDe(objetivo: { clip?: string; perfil?: string }, nota?: string) {
  const { data, error } = await supabase.rpc('admin_cerrar_reportes_de', {
    p_clip: objetivo.clip ?? null, p_perfil: objetivo.perfil ?? null, nota: nota ?? null,
  })
  if (error) return { error: error.message }
  return data as { ok: boolean; cerrados: number }
}

export const MOTIVOS: { v: MotivoReporte; t: string; ayuda: string }[] = [
  { v: 'menor_de_edad',    t: 'Parece una persona menor de edad',
    ayuda: 'Lo revisamos de inmediato y con prioridad sobre todo lo demás.' },
  { v: 'no_consentido',    t: 'Se publicó sin consentimiento',
    ayuda: 'Alguien aparece aquí sin haber aceptado que se publicara.' },
  { v: 'violencia',        t: 'Violencia o daño real', ayuda: '' },
  { v: 'contenido_ilegal', t: 'Otro contenido ilegal', ayuda: '' },
  { v: 'derechos_autor',   t: 'Es mío y lo subieron sin permiso',
    ayuda: 'Si eres la persona titular, dínoslo en el comentario.' },
  { v: 'spam',             t: 'Spam o engaño', ayuda: '' },
  { v: 'otro',             t: 'Otra cosa', ayuda: 'Cuéntanos qué pasa.' },
]

/* ==================== Modulo 9: verificacion ==================== */

export type EstadoVerificacion =
  'procesando' | 'aprobada' | 'rechazada' | 'pendiente_revision'

export type Verificacion = {
  id: string; user_id: string; handle: string; nombre: string; email: string
  estado: EstadoVerificacion; similitud: number | null
  paso_fallido: string | null; motivo: string | null
  edad: number | null; fecha_nacimiento: string | null
  ine_path: string | null; selfie_path: string | null
  borrar_despues_de: string | null
  revisada_por: string | null; revisada_at: string | null; nota_revision: string | null
  created_at: string
  identidad_verificada: boolean; intentos: number
  tiene_expediente: boolean; clips_pendientes: number; total_filas: number
}

export async function listarVerificaciones(
  estado: EstadoVerificacion | '' = 'pendiente_revision', pagina = 0, porPagina = 25,
) {
  const { data, error } = await supabase.rpc('admin_verificaciones', {
    filtro_estado: estado, pagina, por_pagina: porPagina,
  })
  if (error) return { filas: [] as Verificacion[], total: 0, error: error.message }
  const filas = (data ?? []) as Verificacion[]
  return { filas, total: Number(filas[0]?.total_filas ?? 0), error: '' }
}

export async function conteoVerificaciones() {
  const { data, error } = await supabase.rpc('admin_conteo_verificaciones')
  if (error) return {} as Record<string, number>
  return Object.fromEntries(((data ?? []) as { estado: string; cuantos: number }[])
    .map(r => [r.estado, Number(r.cuantos)])) as Record<string, number>
}

export async function resolverVerificacion(id: string, aprobar: boolean, nota?: string) {
  const { error } = await supabase.rpc('admin_resolver_verificacion', {
    verificacion: id, aprobar, nota: nota ?? null,
  })
  return error?.message ?? ''
}

/** Los documentos viven en un bucket privado que solo lee la administracion.
 *  La liga dura cinco minutos: es tiempo de sobra para mirarla y poco para
 *  que quede pegada en ningun lado. */
export async function urlDocumento(bucket: 'verificacion' | 'expedientes', path: string) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 300)
  if (error) return null
  return data.signedUrl
}

/* ==================== Modulo 3: contenido ==================== */

export async function borrarClipAdmin(clip: string, motivo: string) {
  const { error } = await supabase.rpc('admin_borrar_clip', { clip, motivo })
  return error?.message ?? ''
}
export async function restaurarClip(clip: string) {
  const { error } = await supabase.rpc('admin_restaurar_clip', { clip })
  return error?.message ?? ''
}
export async function destacar(clip: string, posicion: number | null) {
  const { error } = await supabase.rpc('admin_destacar', { clip, posicion })
  return error?.message ?? ''
}

export type PorPurgar = {
  id: string; titulo: string; storage_path: string | null
  cover_path: string | null; creadora_handle: string
  borrado_at: string; purgar_despues_de: string
}

export async function porPurgar() {
  const { data, error } = await supabase.rpc('admin_por_purgar')
  if (error) return [] as PorPurgar[]
  return (data ?? []) as PorPurgar[]
}

/** Borra los archivos DE VERDAD y solo entonces limpia las rutas.
 *
 *  El orden importa: si se limpiaran las rutas primero y el borrado fallara,
 *  quedarian archivos ocupando espacio sin ninguna fila que los mencione, o
 *  sea invisibles para siempre. */
export async function purgar(c: PorPurgar) {
  const errores: string[] = []
  if (c.storage_path) {
    const { error } = await supabase.storage.from('clips').remove([c.storage_path])
    if (error) errores.push(`video: ${error.message}`)
  }
  if (c.cover_path) {
    const { error } = await supabase.storage.from('clip-covers').remove([c.cover_path])
    if (error) errores.push(`portada: ${error.message}`)
  }
  if (errores.length) return errores.join(' · ')
  const { error } = await supabase.rpc('admin_marcar_purgado', { clip: c.id })
  return error?.message ?? ''
}

export type ClipAdmin = {
  id: string; creator_id: string; title: string; estado: EstadoClip; published: boolean
  tipo: string; price_coins: number; visibility: string
  cover_path: string | null; storage_path: string | null
  destacado_orden: number | null
  borrado_at: string | null; borrado_motivo: string | null
  purgar_despues_de: string | null
  created_at: string
  profiles: { handle: string; display_name: string } | null
}

/** Se consulta la tabla directamente y no por RPC: la politica de lectura ya
 *  deja ver todo a la administracion, asi que una funcion nueva solo repetiria
 *  la regla en un segundo sitio desde donde podria desincronizarse. */
export async function clipsAdmin(
  filtro: 'todos' | 'destacados' | 'borrados' | 'plataforma' = 'todos',
  busqueda = '',
) {
  let q = supabase.from('clips')
    .select('id,creator_id,title,estado,published,tipo,price_coins,visibility,cover_path,' +
            'storage_path,destacado_orden,borrado_at,borrado_motivo,' +
            'purgar_despues_de,created_at,' +
            'profiles!clips_creator_id_fkey(handle,display_name)')
    .limit(100)

  if (filtro === 'destacados') q = q.not('destacado_orden', 'is', null)
    .order('destacado_orden', { ascending: true })
  else if (filtro === 'borrados') q = q.not('borrado_at', 'is', null)
    .order('borrado_at', { ascending: false })
  else if (filtro === 'plataforma') q = q.neq('tipo', 'creadora')
    .order('created_at', { ascending: false })
  else q = q.is('borrado_at', null).order('created_at', { ascending: false })

  if (busqueda.trim()) q = q.ilike('title', `%${busqueda.trim()}%`)

  const { data, error } = await q
  if (error) return { filas: [] as ClipAdmin[], error: error.message }
  return { filas: (data ?? []) as unknown as ClipAdmin[], error: '' }
}

/* ==================== Modulo 4: comunicacion ==================== */

export type Canal = 'correo' | 'mensaje' | 'redes_sociales'

export type Segmento = {
  clave: string; titulo: string; nota: string
}

/** Las claves tienen que coincidir EXACTAMENTE con las de admin_segmento():
 *  una que no exista devuelve cero personas y la campaña se rechaza sola, que
 *  es preferible a mandarle correo a quien no tocaba. */
export const SEGMENTOS: Segmento[] = [
  { clave: 'todas', titulo: 'Todas las cuentas', nota: 'Menos las baneadas y las de demostración.' },
  { clave: 'creadoras', titulo: 'Creadoras', nota: 'Todas las que pueden publicar.' },
  { clave: 'creadoras_sin_chat', titulo: 'Creadoras que no cobran por chat',
    nota: 'Nunca han mandado un mensaje de paga. Probablemente no saben que se puede.' },
  { clave: 'creadoras_sin_ventas_30d', titulo: 'Creadoras sin ventas en 30 días', nota: '' },
  { clave: 'creadoras_sin_clips', titulo: 'Creadoras sin ningún clip aprobado',
    nota: 'Se registraron y no llegaron a publicar.' },
  { clave: 'creadoras_sin_verificar', titulo: 'Creadoras sin verificar',
    nota: 'No pueden publicar ni cobrar hasta que se verifiquen.' },
  { clave: 'usuarias', titulo: 'Usuarias (no creadoras)', nota: '' },
  { clave: 'inactivas_30d', titulo: 'Sin entrar en 30 días', nota: '' },
]

export type PersonaSegmento = { id: string; handle: string; nombre: string; correo: string }

export async function verSegmento(clave: string) {
  const { data, error } = await supabase.rpc('admin_segmento', { clave })
  if (error) return { gente: [] as PersonaSegmento[], error: error.message }
  return { gente: (data ?? []) as PersonaSegmento[], error: '' }
}

/** Sustituye las variables. Es el MISMO texto que usa la Edge Function para
 *  el correo, para que la vista previa no mienta. */
export function personalizar(texto: string, p: PersonaSegmento) {
  return texto
    .replaceAll('{nombre_usuario}', p.nombre || p.handle)
    .replaceAll('{handle}', '@' + p.handle)
    .replaceAll('{correo}', p.correo)
}

export type Plantilla = {
  id: string; nombre: string; canal: Canal
  asunto: string | null; cuerpo: string; updated_at: string
}

export async function plantillas() {
  const { data, error } = await supabase.from('plantillas')
    .select('id,nombre,canal,asunto,cuerpo,updated_at')
    .order('updated_at', { ascending: false })
  if (error) return [] as Plantilla[]
  return (data ?? []) as Plantilla[]
}

export async function guardarPlantilla(
  nombre: string, canal: Canal, asunto: string | null, cuerpo: string, id?: string,
) {
  const { data, error } = await supabase.rpc('admin_guardar_plantilla', {
    p_nombre: nombre, p_canal: canal, p_asunto: asunto,
    p_cuerpo: cuerpo, p_id: id ?? null,
  })
  if (error) return { error: error.message }
  return { id: data as string }
}

export async function borrarPlantilla(id: string) {
  const { error } = await supabase.rpc('admin_borrar_plantilla', { p_id: id })
  return error?.message ?? ''
}

export type Campana = {
  id: string; canal: Canal; segmento: string
  asunto: string | null; cuerpo: string; estado: string
  destinatarios: number; enviados: number; fallidos: number
  created_at: string; terminada_at: string | null
}

export async function campanas() {
  const { data, error } = await supabase.from('campanas')
    .select('id,canal,segmento,asunto,cuerpo,estado,destinatarios,enviados,fallidos,created_at,terminada_at')
    .order('created_at', { ascending: false }).limit(50)
  if (error) return [] as Campana[]
  return (data ?? []) as Campana[]
}

/** Manda la campaña.
 *
 *  El mensaje interno se envia desde aqui, uno por persona. El correo NO: va
 *  a una Edge Function porque la llave de Resend tiene que quedarse del lado
 *  del servidor. Puesta en el navegador la leeria cualquiera con las
 *  herramientas de desarrollo y podria mandar correo en nombre del dominio. */
export async function enviarCampana(
  canal: Canal, segmento: string, asunto: string, cuerpo: string,
  avance?: (hechos: number, total: number) => void,
) {
  const { data: id, error } = await supabase.rpc('admin_abrir_campana', {
    p_canal: canal, p_segmento: segmento,
    p_asunto: canal === 'correo' ? asunto : null, p_cuerpo: cuerpo,
  })
  if (error) return { error: error.message }
  const campana = id as string

  if (canal === 'mensaje') {
    const { gente, error: e2 } = await verSegmento(segmento)
    if (e2) return { error: e2 }
    let hechos = 0
    for (const p of gente) {
      await supabase.rpc('admin_mensaje_interno', {
        destino: p.id, texto: personalizar(cuerpo, p), campana,
      })
      avance?.(++hechos, gente.length)
    }
    const { data } = await supabase.rpc('admin_cerrar_campana', { campana })
    return { resultado: data as { enviados: number; fallidos: number } }
  }

  const { data: s } = await supabase.auth.getSession()
  const base = import.meta.env.VITE_SUPABASE_URL
  try {
    const r = await fetch(`${base}/functions/v1/enviar-campana`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${s.session?.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ campana, segmento, asunto, cuerpo }),
    })
    const j = await r.json()
    if (!r.ok) return { error: j.ayuda ? `${j.error}. ${j.ayuda}` : (j.error ?? 'Falló el envío') }
    return { resultado: j as { enviados: number; fallidos: number } }
  } catch (e) {
    return { error: (e as Error).message }
  }
}

/* ==================== Modulo 8: retiros y reembolsos ==================== */

export type EstadoRetiro = 'pendiente' | 'aprobada' | 'pagada' | 'rechazada'

export type Retiro = {
  id: string; creator_id: string; handle: string; nombre: string
  coins: number; estado: EstadoRetiro
  clabe: string | null; banco: string | null; titular: string | null
  rfc: string | null; regimen: string | null
  motivo_rechazo: string | null
  created_at: string; resuelta_at: string | null
  saldo_actual: number; verificada: boolean
  bruto_mxn: number | null; neto_mxn: number | null; spei_ref: string | null
  total_filas: number
}

export async function listarRetiros(
  estado: EstadoRetiro | '' = 'pendiente', pagina = 0, porPagina = 30,
) {
  const { data, error } = await supabase.rpc('admin_retiros', {
    filtro_estado: estado, pagina, por_pagina: porPagina,
  })
  if (error) return { filas: [] as Retiro[], total: 0, error: error.message }
  const filas = (data ?? []) as Retiro[]
  return { filas, total: Number(filas[0]?.total_filas ?? 0), error: '' }
}

export async function resolverRetiro(id: string, aprobar: boolean, motivo?: string) {
  const { data, error } = await supabase.rpc('admin_resolver_retiro', {
    solicitud: id, aprobar, motivo: motivo ?? null,
  })
  if (error) return { error: error.message }
  return data as { ok: boolean; estado: string; bruto_mxn?: number; neto_mxn?: number }
}

export async function marcarPagado(id: string, referencia: string) {
  const { error } = await supabase.rpc('admin_marcar_pagado', {
    solicitud: id, referencia,
  })
  return error?.message ?? ''
}

export async function reembolsar(
  destino: string, deQuien: string, cantidad: number, motivo: string, ref?: string,
) {
  const { data, error } = await supabase.rpc('admin_reembolsar', {
    destino, de_quien: deQuien, cantidad, motivo, referencia: ref ?? null,
  })
  if (error) return { error: error.message }
  return data as { ok: boolean; saldo_origen: number }
}

export type EncargoDisputa = {
  id: string; fan: string; fan_handle: string
  creadora: string; creadora_handle: string
  descripcion: string; coins: number; estado: string
  entrega_max: string; created_at: string; dias_de_retraso: number
}

export async function encargosEnDisputa() {
  const { data, error } = await supabase.rpc('admin_encargos_en_disputa')
  if (error) return [] as EncargoDisputa[]
  return (data ?? []) as EncargoDisputa[]
}

export async function valorCoin(): Promise<number | null> {
  const { data } = await supabase.from('ajustes')
    .select('valor').eq('clave', 'valor_coin_mxn').maybeSingle()
  const v = data?.valor
  return typeof v === 'number' ? v : null
}

export async function fijarValorCoin(centavos: number) {
  const { error } = await supabase.rpc('admin_ajustar_bandera_num', {
    p_clave: 'valor_coin_mxn', p_valor: centavos,
  })
  return error?.message ?? ''
}

/** Genera la portada de un clip que se subio sin ella, sacando un cuadro del
 *  video ya publicado. Para los que quedaron antes de que la subida lo hiciera
 *  sola. */
export async function generarPortada(clip: string, creadora: string) {
  const { urlVideoFirmada } = await import('./clips')
  const { miniaturaDeUrl } = await import('./miniatura')

  const acceso = await urlVideoFirmada(clip)
  if (!('url' in acceso) || !acceso.url) {
    return { error: ('error' in acceso && acceso.error) || 'No se pudo abrir el video' }
  }
  const imagen = await miniaturaDeUrl(acceso.url)
  if (!imagen) {
    return { error: 'El navegador no pudo decodificar ese video para sacar un cuadro' }
  }
  const ruta = `${creadora}/${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage.from('clip-covers')
    .upload(ruta, imagen, { contentType: 'image/jpeg' })
  if (error) return { error: error.message }

  const { error: e2 } = await supabase.rpc('admin_fijar_portada', { clip, ruta })
  if (e2) return { error: e2.message }
  return { ok: true }
}

/* ==================== Módulo: Redes Sociales ==================== */

export type PostRedSocial = {
  id: string; plataforma: string; contenido: string; video_url: string | null
  estado: string; url_plataforma: string | null; likes: number; compartidas: number
  respuestas: number; views: number; created_at: string; updated_at: string
}

export async function publicarEnX(contenido: string, videoUrl?: string | null) {
  const { data, error } = await supabase.rpc('admin_publicar_en_x', {
    p_contenido: contenido, p_video_url: videoUrl ?? null,
  })
  if (error) return { error: error.message }
  return { id: data as string }
}

export async function publicarEnTikTok(contenido: string, videoUrl: string) {
  const { data, error } = await supabase.rpc('admin_publicar_en_tiktok', {
    p_contenido: contenido, p_video_url: videoUrl,
  })
  if (error) return { error: error.message }
  return { id: data as string }
}

export async function historialRedSocial(plataforma?: string) {
  const query = supabase.from('redes_sociales_posts')
    .select('id,plataforma,contenido,video_url,estado,url_plataforma,likes,compartidas,respuestas,views,created_at,updated_at')
    .order('created_at', { ascending: false }).limit(50)

  if (plataforma) {
    query.eq('plataforma', plataforma)
  }

  const { data, error } = await query
  if (error) return [] as PostRedSocial[]
  return (data ?? []) as PostRedSocial[]
}

/** Pone la foto de perfil de una creadora dada de alta por administracion.
 *
 *  Hace falta porque esas creadoras no pueden entrar a su cuenta: si el admin
 *  no puede ponerles foto, no la tienen nunca. */
export async function fijarAvatar(creadora: string, f: File, anterior?: string | null) {
  const { subirAvatar } = await import('./perfiles')
  const r = await subirAvatar(creadora, f, anterior)
  if ('error' in r) return { error: r.error }
  const { error } = await supabase.rpc('admin_fijar_avatar', {
    creadora, ruta: r.ruta,
  })
  if (error) return { error: error.message }
  return { ok: true, ruta: r.ruta }
}
