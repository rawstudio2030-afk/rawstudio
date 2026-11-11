/* El sonido del elevador, SINTETIZADO con Web Audio: no hay ningun archivo de
 * audio (ni licencias, ni descargas). Se importa con `import()` solo cuando
 * alguien pulsa «Sonido»; hasta entonces no existe.
 *
 * Reglas de la casa:
 *   - APAGADO por defecto y nunca solo: el contexto de audio se crea dentro del
 *     clic que lo activa (los navegadores lo exigen, y es lo correcto en un sitio
 *     que se mira en publico). No se recuerda entre visitas.
 *   - Bajito: el volumen general es 0.5 y los picos de cada efecto, menores. Un
 *     compresor evita que se sume de mas.
 *   - Cada sonido sigue a lo que se ve: la reja suena mientras SE MUEVE (si la
 *     persona deja de bajar, calla), la cabina retumba mientras baja, la
 *     campanilla suena al abrirse las puertas.
 *   - Se calla con la pestaña oculta.
 */
import type { SonidoApi } from './sonidoTipos'

type CtorAudio = typeof AudioContext

function crearContexto(): AudioContext | null {
  const w = window as unknown as { AudioContext?: CtorAudio; webkitAudioContext?: CtorAudio }
  const C = w.AudioContext ?? w.webkitAudioContext
  return C ? new C() : null
}

/** Ruido blanco (`brown` = integrado: grave, de retumbo). 2 s en bucle. */
function bufferRuido(ctx: AudioContext, brown: boolean): AudioBuffer {
  const n = ctx.sampleRate * 2
  const b = ctx.createBuffer(1, n, ctx.sampleRate)
  const d = b.getChannelData(0)
  let ult = 0
  for (let i = 0; i < n; i++) {
    const r = Math.random() * 2 - 1
    if (brown) { ult = (ult + 0.02 * r) / 1.02; d[i] = ult * 3.5 } else d[i] = r
  }
  return b
}

class Sonido implements SonidoApi {
  private ctx: AudioContext
  private salida: GainNode
  private blanco: AudioBuffer
  private marron: AudioBuffer
  private cab: { g: GainNode }
  private nivelReja = 0
  private relojReja = 0
  private relojFuego = 0
  private fuegoOn = false
  private fuegoGan: GainNode
  private visible = () => { if (document.hidden) void this.ctx.suspend(); else void this.ctx.resume() }

  constructor(ctx: AudioContext) {
    this.ctx = ctx
    const comp = ctx.createDynamicsCompressor()
    this.salida = ctx.createGain()
    this.salida.gain.value = 0.5
    this.salida.connect(comp)
    comp.connect(ctx.destination)
    this.blanco = bufferRuido(ctx, false)
    this.marron = bufferRuido(ctx, true)

    // Retumbo de la cabina: ruido marron grave + un seno bajo, siempre corriendo y
    // con la ganancia en 0 hasta que la cabina baja.
    const g = ctx.createGain(); g.gain.value = 0
    const r = ctx.createBufferSource(); r.buffer = this.marron; r.loop = true
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 150
    r.connect(lp); lp.connect(g)
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 47
    const og = ctx.createGain(); og.gain.value = 0.22
    o.connect(og); og.connect(g)
    g.connect(this.salida)
    r.start(); o.start()
    this.cab = { g }

    // Fuego de fondo: un soplo grave constante (muy bajo), solo con las antorchas a la vista.
    const fg = ctx.createGain(); fg.gain.value = 0
    const fr = ctx.createBufferSource(); fr.buffer = this.marron; fr.loop = true
    const fl = ctx.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = 520; fl.Q.value = 0.6
    fr.connect(fl); fl.connect(fg); fg.connect(this.salida); fr.start()
    this.fuegoGan = fg

    document.addEventListener('visibilitychange', this.visible)
  }

  /** Un golpecito de ruido filtrado: la unidad de casi todos los chasquidos. */
  private pulso(freq: number, q: number, dur: number, vol: number, cuando = 0, tipo: BiquadFilterType = 'bandpass') {
    const t = this.ctx.currentTime + cuando
    const s = this.ctx.createBufferSource(); s.buffer = this.blanco
    s.loop = true
    const f = this.ctx.createBiquadFilter(); f.type = tipo; f.frequency.value = freq; f.Q.value = q
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vol, t + 0.004)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    s.connect(f); f.connect(g); g.connect(this.salida)
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05)
  }

  /** Un tono con caida exponencial (campanilla, golpe de metal). */
  private tono(freq: number, dur: number, vol: number, cuando = 0, tipo: OscillatorType = 'sine', hasta?: number) {
    const t = this.ctx.currentTime + cuando
    const o = this.ctx.createOscillator(); o.type = tipo
    o.frequency.setValueAtTime(freq, t)
    if (hasta) o.frequency.exponentialRampToValueAtTime(hasta, t + dur)
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vol, t + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g); g.connect(this.salida)
    o.start(t); o.stop(t + dur + 0.05)
  }

  /** La reja: mientras se mueve, una lluvia de chasquidos de metal (listones que se
   *  rozan) cuya densidad y volumen siguen a la velocidad. */
  reja(velocidad: number) {
    this.nivelReja = Math.min(1, velocidad * 30)
    if (this.nivelReja > 0.03 && !this.relojReja) {
      const paso = () => {
        const n = this.nivelReja
        if (n < 0.03) { this.relojReja = 0; return }
        const golpes = 1 + Math.round(n * 2)
        for (let i = 0; i < golpes; i++) {
          this.pulso(1800 + Math.random() * 3600, 5 + Math.random() * 6, 0.025 + Math.random() * 0.05,
            (0.05 + n * 0.16) * (0.5 + Math.random() * 0.5), Math.random() * 0.04)
        }
        // el roce grave de fondo
        this.pulso(700 + Math.random() * 500, 1.2, 0.09, 0.05 + n * 0.1)
        this.relojReja = window.setTimeout(paso, 45 + Math.random() * 40)
      }
      this.relojReja = window.setTimeout(paso, 0)
    }
  }

  /** El seguro: un golpe grave de metal con su resonancia. */
  choque(tipo: 'cierra' | 'abre') {
    const fuerte = tipo === 'cierra' ? 1 : 0.55
    this.tono(110, 0.22, 0.32 * fuerte, 0, 'sine', 48)
    this.pulso(420, 0.8, 0.14, 0.34 * fuerte, 0, 'lowpass')
    this.tono(412, 0.5, 0.06 * fuerte, 0.01, 'triangle')
    this.tono(773, 0.38, 0.035 * fuerte, 0.012, 'triangle')
  }

  cabina(nivel: number) {
    this.cab.g.gain.setTargetAtTime(Math.max(0, Math.min(1, nivel)) * 0.5, this.ctx.currentTime, 0.18)
  }

  /** La campanilla de llegada: un «ding» limpio, con sus armonicos. */
  ding() {
    this.tono(1046.5, 1.7, 0.2)
    this.tono(1568, 1.2, 0.07, 0.003)
    this.tono(2093, 0.8, 0.035, 0.003)
  }

  /** Un boton de laton. */
  tecla() {
    this.tono(1750, 0.05, 0.16, 0, 'square')
    this.pulso(3200, 1.5, 0.035, 0.3)
  }

  /** Chasquidos de leña de las antorchas, a intervalos irregulares. */
  chisporroteo(on: boolean) {
    this.fuegoOn = on
    this.fuegoGan.gain.setTargetAtTime(on ? 0.16 : 0, this.ctx.currentTime, 0.4)
    if (on && !this.relojFuego) {
      const paso = () => {
        if (!this.fuegoOn) { this.relojFuego = 0; return }
        this.pulso(2200 + Math.random() * 2600, 2 + Math.random() * 3, 0.01 + Math.random() * 0.03, 0.28 + Math.random() * 0.4)
        this.relojFuego = window.setTimeout(paso, 70 + Math.random() * 380)
      }
      this.relojFuego = window.setTimeout(paso, 100)
    }
  }

  /** Apaga todo y suelta el contexto. */
  cerrar() {
    document.removeEventListener('visibilitychange', this.visible)
    window.clearTimeout(this.relojReja); window.clearTimeout(this.relojFuego)
    this.relojReja = 0; this.relojFuego = 0; this.nivelReja = 0; this.fuegoOn = false
    void this.ctx.close()
  }
}

/** Crea el motor. Debe llamarse DENTRO de un gesto de la persona (el clic de
 *  «Sonido»). Devuelve null si el navegador no tiene Web Audio. */
export async function encender(): Promise<(SonidoApi & { cerrar(): void }) | null> {
  const ctx = crearContexto()
  if (!ctx) return null
  try { await ctx.resume() } catch { /* sigue: algunos navegadores lo reanudan solos */ }
  return new Sonido(ctx)
}
