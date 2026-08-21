/** Cierre de sesion por inactividad.
 *
 *  Importa en una plataforma como esta: la gente entra desde teléfonos
 *  prestados, computadoras compartidas o el trabajo, y una sesion abierta
 *  expone su biblioteca, su saldo y sus mensajes a quien tome el aparato.
 */

export const MINUTOS_LIMITE = 30
export const MINUTOS_AVISO = 1        // cuanto antes se avisa

const CLAVE = 'rawstudio.ultima_actividad'

/** Marca actividad. Se guarda en localStorage y no solo en memoria para que
 *  cerrar la pestaña y volver dos horas despues NO reinicie el reloj: si no,
 *  bastaria con recargar para burlar el limite. */
export function marcarActividad() {
  try { localStorage.setItem(CLAVE, String(Date.now())) } catch { /* modo privado */ }
}

export function ultimaActividad(): number {
  try {
    const v = localStorage.getItem(CLAVE)
    return v ? parseInt(v, 10) : Date.now()
  } catch { return Date.now() }
}

export function limpiarActividad() {
  try { localStorage.removeItem(CLAVE) } catch { /* nada */ }
}

/** Un video reproduciendose cuenta como actividad aunque nadie toque nada.
 *
 *  Sin esto, ver un clip de doce minutos sin mover el dedo dispararia el cierre
 *  a mitad de la reproduccion. Es el error mas facil de cometer al implementar
 *  un temporizador de inactividad, y en una plataforma de video seria fatal:
 *  cerraria sesion justo al usuario que MAS esta usando la app. */
export function hayVideoReproduciendo(): boolean {
  const videos = document.querySelectorAll('video')
  for (const v of videos) {
    if (!v.paused && !v.ended && v.readyState > 2) return true
  }
  return false
}

export const EVENTOS = [
  'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel', 'pointerdown',
] as const
