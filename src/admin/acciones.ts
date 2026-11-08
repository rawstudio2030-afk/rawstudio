/* Como se llaman las acciones de la bitacora, compartido por la bitacora y el Resumen. */

/** Nombres legibles. Lo que se guarda es la clave; esto es solo presentacion,
 *  y una accion sin traducir se muestra tal cual en vez de esconderse. */
export const NOMBRE: Record<string, string> = {
  iniciar_sesion: 'Inició sesión',
  crear_cuenta: 'Creó su cuenta',
  subir_clip: 'Subió un clip',
  suspender: 'Suspendió una cuenta',
  banear: 'Baneó una cuenta',
  reactivar: 'Reactivó una cuenta',
  ajustar_saldo: 'Ajustó saldo',
  otorgar_admin: 'Otorgó administración',
  revocar_admin: 'Revocó administración',
  marcar_creadora: 'Cambió el rol de creadora',
  alta_creadora: 'Dio de alta una creadora',
  publicar_para: 'Publicó por una creadora',
}

/** Las acciones con consecuencias se pintan distinto. Una bitacora donde todo
 *  se ve igual obliga a leerla entera para encontrar lo que importa. */
export const GRAVE = new Set(['banear', 'suspender', 'ajustar_saldo', 'otorgar_admin', 'revocar_admin'])

