/* La parte «viva» del descenso: el scroll acoplado a la reja del ascensor, en
 * que piso se esta, la barra solida, el parallax y la carga de los pisos.
 *
 * Entre piso y piso hay un HUECO DE ASCENSOR (`.umbral`, 280 vh; 190 vh bajo 900
 * px) con una cabina fija (`.shaft`, sticky) dentro. El progreso del hueco,
 *
 *     p = clamp(0, 1, -rect.top / (alturaDelHueco - viewport)),
 *
 * manda todo: la reja interior de tijera cierra primero (`gateInner`), la puerta
 * exterior de rellano la sigue con desfase (`gateOuter`), la escena de salida
 * recede como si bajara la cabina, una losa de concreto cruza el encuadre y, al
 * abrirse las puertas, aparece la placa con el titulo del piso. Los numeros son
 * los de la maqueta aprobada (`docs/diseno/descenso/elevador/`).
 *
 * Todo se calcula desde un solo oyente pasivo de scroll y un rAF. Las puertas
 * llevan lerp (`k = 0.18`) y siguen corriendo en rAF aunque ya no haya evento de
 * scroll, hasta alcanzar su destino; luego el bucle se detiene (no corre en
 * vacio). Con `prefers-reduced-motion` no hay scrubbing ni recede: fotogramas
 * estaticos, la reja solo vela un poco la pantalla durante el cruce.
 *
 * Los pisos de abajo son un chunk perezoso (§2.1). Se piden en el PRIMER gesto de
 * la persona (scroll, rueda, toque, tecla) o cuando algo manda bajar (`bajar`);
 * nunca durante el primer paint. El motor del elevador arranca cuando llegan.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { NombrePiso } from '../lib/diseño'

export const PISOS_INFO: { piso: NombrePiso; id: string; codigo: string; nombre: string; corto: string; etiqueta: string }[] = [
  { piso: 'collins', id: 'nivel-1', codigo: 'PB', nombre: 'Calle Collins', corto: 'Collins', etiqueta: 'Planta baja, Calle Collins' },
  { piso: 'antro', id: 'nivel-2', codigo: '−1', nombre: 'El antro', corto: 'Antro', etiqueta: 'Piso menos uno, El antro' },
  { piso: 'oscuro', id: 'nivel-3', codigo: '−2', nombre: 'Cuarto oscuro', corto: 'Oscuro', etiqueta: 'Piso menos dos, Cuarto oscuro' },
  { piso: 'calabozo', id: 'nivel-4', codigo: '−3', nombre: 'El calabozo', corto: 'Calabozo', etiqueta: 'Piso menos tres, El calabozo' },
]

/** Angulo de la aguja del dial en cada piso (grados). */
export const ANGULOS: Record<NombrePiso, number> = { collins: -78, antro: -26, oscuro: 26, calabozo: 78 }

const quieto = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const movil = () => window.matchMedia('(max-width: 900px)').matches

const clamp = (n: number) => Math.max(0, Math.min(1, n))
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / Math.max(0.0001, b - a))
  return t * t * (3 - 2 * t)
}

/** Reja interior (tijera): cierra en p 0….20, abierta de nuevo en .74….92. */
function gateInner(p: number) {
  if (p < 0.2) return easeInOut(p / 0.2)
  if (p < 0.74) return 1
  if (p < 0.92) return easeInOut(1 - (p - 0.74) / 0.18)
  return 0
}
/** Puerta exterior de rellano: con desfase; cierra .08….26, abre .66….84. */
function gateOuter(p: number) {
  if (p < 0.08) return 0
  if (p < 0.26) return easeInOut((p - 0.08) / 0.18)
  if (p < 0.66) return 1
  if (p < 0.84) return easeInOut(1 - (p - 0.66) / 0.18)
  return 0
}

function progreso(el: HTMLElement) {
  const r = el.getBoundingClientRect()
  const recorrido = r.height - window.innerHeight
  if (recorrido <= 1) return r.top < 0 ? 1 : 0
  return clamp(-r.top / recorrido)
}

/** El titulo de llegada: placa y titular se funden y suben al partirse las puertas. */
function aplicaLlegada(el: HTMLElement, p: number, reduce: boolean) {
  const card = el.querySelector<HTMLElement>('.llegada')
  if (!card) return
  const vis = reduce ? (p >= 0.78 ? 1 : 0) : smoothstep(0.78, 0.88, p)
  card.style.opacity = vis.toFixed(3)
  card.style.transform = reduce ? 'none' : `translate3d(0,${((1 - vis) * 40).toFixed(2)}px,0)`
}

function aplicaHueco(el: HTMLElement, p: number, reduce: boolean) {
  const out = el.querySelector<HTMLElement>('.shaft-out')
  const inn = el.querySelector<HTMLElement>('.shaft-in')
  const losa = el.querySelector<HTMLElement>('.losa')
  const recede = clamp((p - 0.12) / 0.32)
  const appear = clamp((p - 0.56) / 0.32)
  const slab = smoothstep(0.32, 0.44, p) * (1 - smoothstep(0.56, 0.68, p))
  const luz = 1 - recede * 0.18
  const blur = !reduce && !movil() ? recede * 3.2 : 0
  aplicaLlegada(el, p, reduce)

  if (reduce) {
    if (out) { out.style.transform = 'none'; out.style.filter = 'none'; out.style.opacity = String(1 - appear) }
    if (inn) { inn.style.transform = 'none'; inn.style.filter = 'none'; inn.style.opacity = String(appear) }
    if (losa) { losa.style.opacity = String(slab * 0.85); losa.style.top = '33vh' }
    return
  }
  if (out) {
    out.style.transform = `translate3d(0,${(-recede * 14).toFixed(2)}%,0) scale(${(1 - recede * 0.18).toFixed(4)})`
    out.style.filter = blur ? `blur(${blur.toFixed(2)}px) brightness(${luz.toFixed(3)})` : `brightness(${luz.toFixed(3)})`
    out.style.opacity = String(1 - recede * 0.15 - slab * 0.55)
  }
  if (inn) {
    inn.style.transform = `translate3d(0,${((1 - appear) * 12).toFixed(2)}%,0) scale(${(1.12 - appear * 0.12).toFixed(4)})`
    inn.style.filter = 'none'
    inn.style.opacity = String(appear * (1 - slab * 0.55))
  }
  if (losa) {
    // La losa cruza el encuadre de abajo arriba entre p ≈ .30 y .70.
    const t = (p - 0.3) / (0.7 - 0.3)
    losa.style.top = `${(100 - t * (100 + 42)).toFixed(2)}vh`
    losa.style.opacity = (smoothstep(-0.04, 0.08, t) * (1 - smoothstep(0.92, 1.04, t))).toFixed(3)
  }
}

export function useDescenso(raiz: React.RefObject<HTMLElement | null>) {
  const [piso, setPiso] = useState<NombrePiso>('collins')
  const [solida, setSolida] = useState(false)
  const [pisosPedidos, setPisosPedidos] = useState(false)
  const [pisosMontados, setPisosMontados] = useState(false)
  const pendiente = useRef<string | null>(null)
  const viaje = useRef(0)

  // El elevador maneja el scroll a mano (rideTo, parallax): el `scroll-behavior:
  // smooth` global pelearia con cada cuadro. Se apaga mientras la portada vive.
  useEffect(() => {
    const html = document.documentElement
    const antes = html.style.scrollBehavior
    html.style.scrollBehavior = 'auto'
    return () => { html.style.scrollBehavior = antes }
  }, [])

  /** El viaje en ascensor: scroll suave de ~2.5 s con easing in-out (0.8 s con
   *  `prefers-reduced-motion`). Un gesto de la persona lo interrumpe. */
  const viajarA = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    const inicio = document.documentElement.scrollTop || window.scrollY
    const fin = el.getBoundingClientRect().top + inicio - (parseFloat(getComputedStyle(el).scrollMarginTop) || 74)
    const dur = quieto() ? 800 : 2500
    const t0 = performance.now()
    const mio = ++viaje.current
    const paso = (ahora: number) => {
      if (viaje.current !== mio) return
      const t = Math.min(1, (ahora - t0) / dur)
      document.documentElement.scrollTop = inicio + (fin - inicio) * easeInOut(t)
      if (t < 1) requestAnimationFrame(paso)
    }
    requestAnimationFrame(paso)
  }, [])

  /** Baja a un piso o hueco. Si los pisos aun no se descargaron, los pide y baja
   *  cuando llegan (`pisosListos`). */
  const bajar = useCallback((id: string) => {
    if (id === 'nivel-1' || document.getElementById(id)) { viajarA(id); return }
    pendiente.current = id
    setPisosPedidos(true)
  }, [viajarA])

  /** Lo llama el chunk de los pisos al montarse. */
  const pisosListos = useCallback(() => {
    setPisosMontados(true)
    const id = pendiente.current
    pendiente.current = null
    // Un cuadro despues: que el layout de los pisos ya este calculado.
    if (id) requestAnimationFrame(() => viajarA(id))
  }, [viajarA])

  useEffect(() => {
    const el = raiz.current
    if (!el) return
    const reduce = quieto()
    const q = <T extends HTMLElement>(s: string) => el.querySelector<T>(s)

    const reja = q<HTMLElement>('#reja')
    const umbrales = [...el.querySelectorAll<HTMLElement>('.umbral')]
    const pisos = [...el.querySelectorAll<HTMLElement>('.nivel[data-piso]')]
    const heroBg = q('#hero-bg')
    const clubBg = q('#club-bg')
    const camBg = q('#cam-bg')
    const cala = q('#nivel-4')
    if (reja && reduce) reja.classList.add('reduce-mode')

    // Estado de las puertas (el valor actual y el objetivo; el actual lo persigue).
    let cIn = 0, cOut = 0, velo = 0
    let tIn = 0, tOut = 0, tVelo = 0

    function ponPuertas(i: number, o: number, v: number) {
      if (!reja) return
      cIn = i; cOut = o; velo = v
      reja.style.setProperty('--cierre-in', i.toFixed(4))
      reja.style.setProperty('--cierre-out', o.toFixed(4))
      reja.style.setProperty('--velo', v.toFixed(4))
      if (!reduce) reja.classList.toggle('abierta', i < 0.02 && o < 0.02)
    }

    function muestraScroll() {
      let mejorIn = 0, mejorOut = 0, mejorVis = 0
      for (const u of umbrales) {
        const r = u.getBoundingClientRect()
        const vis = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0)
        if (vis <= 0) continue
        const p = progreso(u)
        aplicaHueco(u, p, reduce)
        if (vis > mejorVis) { mejorVis = vis; mejorIn = gateInner(p); mejorOut = gateOuter(p) }
      }
      tIn = mejorIn; tOut = mejorOut
      tVelo = reduce ? Math.max(mejorIn, mejorOut) * 0.45 : 0
    }

    /** El piso en que se esta. Dentro de un hueco manda el que sale o el que llega. */
    function pisoActual(): NombrePiso {
      const mid = window.innerHeight * 0.42
      for (const u of umbrales) {
        const r = u.getBoundingClientRect()
        if (r.top <= mid && r.bottom > mid) {
          return (progreso(u) < 0.45 ? u.dataset.from : u.dataset.to) as NombrePiso
        }
      }
      let mejor = pisos[0], dist = Infinity
      for (const p of pisos) {
        const r = p.getBoundingClientRect()
        if (r.top <= mid && r.bottom > mid) return p.dataset.piso as NombrePiso
        const d = Math.abs(r.top - mid)
        if (d < dist) { dist = d; mejor = p }
      }
      return (mejor?.dataset.piso as NombrePiso) ?? 'collins'
    }

    let bucle = 0
    function persigue() {
      bucle = 0
      const k = 0.18
      ponPuertas(cIn + (tIn - cIn) * k, cOut + (tOut - cOut) * k, velo + (tVelo - velo) * k)
      if (Math.abs(tIn - cIn) > 0.001 || Math.abs(tOut - cOut) > 0.001 || Math.abs(tVelo - velo) > 0.001) {
        bucle = requestAnimationFrame(persigue)
      }
    }

    function tick() {
      const y = window.scrollY
      setSolida(y > 40)
      muestraScroll()
      if (!reduce) { if (!bucle) bucle = requestAnimationFrame(persigue) } else ponPuertas(tIn, tOut, tVelo)
      setPiso(pisoActual())
      if (!reduce) {
        if (heroBg) heroBg.style.transform = `translate3d(0,${y * 0.18}px,0)`
        if (clubBg?.parentElement) {
          const r = clubBg.parentElement.getBoundingClientRect()
          const p = (window.innerHeight - r.top) / (window.innerHeight + r.height)
          clubBg.style.transform = `translate3d(0,${((p - 0.5) * 28).toFixed(1)}px,0)`
        }
        if (cala && cala.classList.contains('en-escena')) {
          const r = cala.getBoundingClientRect()
          const p = (window.innerHeight - r.top) / (window.innerHeight + r.height)
          for (const [c, f] of [['.cala-capa.c1', 28], ['.cala-capa.c2', 56], ['.cala-capa.c3', 88]] as const) {
            const n = q(c); if (n) n.style.transform = `translate3d(0,${((p - 0.5) * f).toFixed(1)}px,0)`
          }
          if (camBg) camBg.style.transform = `translate3d(0,${((p - 0.5) * 36).toFixed(1)}px,0)`
        }
      }
    }

    // El calabozo en vista: enciende las antorchas (video + luz) y las apaga al salir.
    const videos = [...el.querySelectorAll<HTMLVideoElement>('.fuego-loop')]
    let io: IntersectionObserver | null = null
    if (cala && typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(([e]) => {
        const on = e.isIntersecting
        cala.classList.toggle('en-escena', on)
        if (reduce) return
        for (const v of videos) {
          if (on) { if (v.preload !== 'auto') v.preload = 'auto'; v.play()?.catch(() => {}) } else v.pause()
        }
      }, { threshold: 0.04, rootMargin: '180px 0px' })
      io.observe(cala)
    }

    let raf = 0
    const alScroll = () => {
      // El primer gesto pide los pisos de abajo.
      setPisosPedidos(true)
      if (raf) return
      raf = requestAnimationFrame(() => { raf = 0; tick() })
    }
    const alGesto = () => setPisosPedidos(true)
    // Un gesto de la persona interrumpe el viaje en ascensor.
    const alInterrumpir = () => { viaje.current++ }

    window.addEventListener('scroll', alScroll, { passive: true })
    window.addEventListener('wheel', alGesto, { passive: true, once: true })
    window.addEventListener('touchstart', alGesto, { passive: true, once: true })
    window.addEventListener('keydown', alGesto, { once: true })
    window.addEventListener('wheel', alInterrumpir, { passive: true })
    window.addEventListener('touchstart', alInterrumpir, { passive: true })
    window.addEventListener('resize', tick)
    tick()
    return () => {
      window.removeEventListener('scroll', alScroll)
      window.removeEventListener('wheel', alGesto)
      window.removeEventListener('touchstart', alGesto)
      window.removeEventListener('keydown', alGesto)
      window.removeEventListener('wheel', alInterrumpir)
      window.removeEventListener('touchstart', alInterrumpir)
      window.removeEventListener('resize', tick)
      if (raf) cancelAnimationFrame(raf)
      if (bucle) cancelAnimationFrame(bucle)
      io?.disconnect()
      for (const v of videos) v.pause()
    }
  }, [raiz, pisosMontados])

  return { piso, solida, pisosPedidos, bajar, pisosListos }
}

/** Baja a un elemento por id sin el viaje en ascensor (para «Sobre nosotros»). */
export function irA(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: quieto() ? 'auto' : 'smooth', block: 'start' })
}
