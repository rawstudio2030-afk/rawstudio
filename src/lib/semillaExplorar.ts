/* Semilla del orden de Explorar.
 *
 * El catalogo sale revuelto, pero el orden tiene que ser el MISMO mientras la
 * persona sigue ahi: si abre un clip y vuelve con «atras», no se le reacomoda
 * lo que estaba viendo. Y distinto cuando llega de nuevo (otra visita, o
 * volver pasado un rato), para que no parezca que no hay nada nuevo.
 *
 * Se guarda en sessionStorage junto con la hora del ultimo uso. Si pasaron mas
 * de 30 minutos desde entonces —o no hay nada guardado—, se crea otra. Cada
 * uso refresca la hora.
 *
 * Si sessionStorage falla (modo privado raro, almacenamiento bloqueado), se
 * usa una semilla en memoria con la misma regla: la pantalla no se rompe.
 */
const CLAVE = 'rawstudio.explorar_semilla'
export const VIGENCIA_MS = 30 * 60 * 1000

type Guardada = { semilla: string; ultimo: number }

// Respaldo si sessionStorage no sirve. Vive lo que viva la pestaña.
let enMemoria: Guardada | null = null

const nueva = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

function leer(): Guardada | null {
  try {
    const crudo = sessionStorage.getItem(CLAVE)
    if (!crudo) return enMemoria
    const g = JSON.parse(crudo) as Partial<Guardada>
    if (typeof g.semilla === 'string' && g.semilla && typeof g.ultimo === 'number') {
      return { semilla: g.semilla, ultimo: g.ultimo }
    }
    return null
  } catch {
    return enMemoria
  }
}

function escribir(g: Guardada) {
  enMemoria = g
  try { sessionStorage.setItem(CLAVE, JSON.stringify(g)) } catch { /* se queda en memoria */ }
}

/** La semilla vigente (creandola si hace falta) y refresca su hora de uso. */
export function semillaDeExplorar(ahora: number = Date.now()): string {
  const g = leer()
  const semilla = g && ahora - g.ultimo <= VIGENCIA_MS ? g.semilla : nueva()
  escribir({ semilla, ultimo: ahora })
  return semilla
}
