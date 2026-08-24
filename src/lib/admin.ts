import { supabase } from './supabase'

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
    const rutaVideo = await subir('clips', datos.video, 'video')
    const rutaPortada = datos.portada
      ? await subir('clip-covers', datos.portada, 'portada')
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
