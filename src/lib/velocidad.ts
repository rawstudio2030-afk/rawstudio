/* Velocidad de subida y tiempo restante.
 *
 * Se mide sobre una ventana reciente (los ultimos ~10 s), no sobre toda la subida:
 * una red que mejora o empeora a mitad de camino tiene que verse en la estimacion.
 * Hasta tener ~2 s de historial NO se inventa nada: `restante` devuelve null y la
 * pantalla no muestra tiempo (nada de «∞»).
 *
 * Es logica pura (el reloj entra como argumento) para poder probarla. */

const VENTANA_MS = 10_000
const HISTORIAL_MIN_MS = 2_000

export class MedidorVelocidad {
  private muestras: { t: number; bytes: number }[] = []

  /** Registra cuantos bytes van, a la hora `t` (ms). */
  agregar(bytes: number, t: number = Date.now()): void {
    const ult = this.muestras[this.muestras.length - 1]
    // Si el contador retrocede (se reanudo, o empezo otra subida) se parte de cero.
    if (ult && bytes < ult.bytes) this.muestras = []
    this.muestras.push({ t, bytes })
    const corte = t - VENTANA_MS
    while (this.muestras.length > 2 && this.muestras[1].t < corte) this.muestras.shift()
  }

  reiniciar(): void { this.muestras = [] }

  /** Bytes por segundo, o null si aun no hay datos suficientes. */
  bytesPorSegundo(): number | null {
    if (this.muestras.length < 2) return null
    const a = this.muestras[0]
    const b = this.muestras[this.muestras.length - 1]
    const dt = b.t - a.t
    if (dt < HISTORIAL_MIN_MS) return null
    const v = ((b.bytes - a.bytes) / dt) * 1000
    return v > 0 ? v : null
  }

  /** Segundos que faltan, o null si no se puede estimar honestamente. */
  restante(total: number): number | null {
    const v = this.bytesPorSegundo()
    const ult = this.muestras[this.muestras.length - 1]
    if (v == null || !ult || total <= ult.bytes) return null
    return (total - ult.bytes) / v
  }
}
