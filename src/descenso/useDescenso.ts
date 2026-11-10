/* La parte «viva» del descenso: en que piso se esta, la barra solida al bajar,
 * el parallax suave de los fondos y la carga de los pisos de abajo.
 *
 * Todo se calcula a partir del scroll con un solo oyente pasivo y un solo
 * requestAnimationFrame por cuadro. Con `prefers-reduced-motion` no hay
 * parallax (los fondos se quedan quietos); lo demas (la barra, el piso activo)
 * sigue, porque no es movimiento decorativo.
 *
 * Los pisos de abajo son un chunk perezoso (§2.1). Se piden en el PRIMER gesto
 * de la persona (scroll, rueda, toque, tecla) o cuando algo manda bajar
 * (`bajar`); nunca durante el primer paint.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { NombrePiso } from '../lib/diseño'

export const PISOS_INFO: { piso: NombrePiso; id: string; codigo: string; nombre: string; corto: string }[] = [
  { piso: 'collins', id: 'nivel-1', codigo: 'PB', nombre: 'Calle Collins', corto: 'Collins' },
  { piso: 'antro', id: 'nivel-2', codigo: '−1', nombre: 'El antro', corto: 'Antro' },
  { piso: 'oscuro', id: 'nivel-3', codigo: '−2', nombre: 'Cuarto oscuro', corto: 'Oscuro' },
  { piso: 'calabozo', id: 'nivel-4', codigo: '−3', nombre: 'El calabozo', corto: 'Calabozo' },
]

const quieto = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Baja a un elemento por id. Sin animacion si la persona pidio menos movimiento. */
export function irA(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: quieto() ? 'auto' : 'smooth', block: 'start' })
}

export function useDescenso(raiz: React.RefObject<HTMLElement | null>) {
  const [piso, setPiso] = useState<NombrePiso>('collins')
  const [solida, setSolida] = useState(false)
  const [pisosPedidos, setPisosPedidos] = useState(false)
  const pendiente = useRef<string | null>(null)

  // Pide los pisos de abajo; si ya estan, no hace nada.
  const pedirPisos = useCallback(() => setPisosPedidos(true), [])

  /** Baja a un piso o umbral. Si los pisos aun no se descargaron, los pide y baja
   *  cuando llegan (`pisosListos`). */
  const bajar = useCallback((id: string) => {
    if (id === 'nivel-1') { irA(id); return }
    if (document.getElementById(id)) { irA(id); return }
    pendiente.current = id
    setPisosPedidos(true)
  }, [])

  /** Lo llama el chunk de los pisos al montarse: si habia una bajada pendiente,
   *  se hace ahora que el destino existe. */
  const pisosListos = useCallback(() => {
    const id = pendiente.current
    pendiente.current = null
    // Un cuadro despues: que el layout de los pisos ya este calculado.
    if (id) requestAnimationFrame(() => irA(id))
  }, [])

  useEffect(() => {
    const el = raiz.current
    if (!el) return
    const parallax = (img: HTMLElement | null, padre: HTMLElement | null, f: number) => {
      if (!img || !padre) return
      const r = padre.getBoundingClientRect()
      const p = (window.innerHeight - r.top) / (window.innerHeight + r.height)
      img.style.transform = `translate3d(0,${(p - 0.5) * f}px,0)`
    }
    const q = (s: string) => el.querySelector<HTMLElement>(s)

    function pisoActual(): NombrePiso {
      const pisos = [...el!.querySelectorAll<HTMLElement>('.nivel[data-piso]')]
      const mid = window.innerHeight * 0.42
      let mejor = pisos[0], dist = Infinity
      for (const p of pisos) {
        const r = p.getBoundingClientRect()
        if (r.top <= mid && r.bottom > mid) return p.dataset.piso as NombrePiso
        const d = Math.abs(r.top - mid)
        if (d < dist) { dist = d; mejor = p }
      }
      return (mejor?.dataset.piso as NombrePiso) ?? 'collins'
    }

    function tick() {
      const y = window.scrollY
      setSolida(y > 40)
      setPiso(pisoActual())
      if (!quieto()) {
        const hero = q('#hero-bg')
        if (hero) hero.style.transform = `translate3d(0,${y * 0.18}px,0)`
        for (const [id, f] of [['stairs-bg', 36], ['club-bg', 28], ['door-bg', 36], ['cam-bg', 40]] as const) {
          const img = q('#' + id)
          parallax(img, img?.parentElement ?? null, f)
        }
      }
    }

    let raf = 0
    const alScroll = () => {
      // El primer gesto pide los pisos de abajo.
      setPisosPedidos(true)
      if (raf) return
      raf = requestAnimationFrame(() => { raf = 0; tick() })
    }
    const alGesto = () => setPisosPedidos(true)

    window.addEventListener('scroll', alScroll, { passive: true })
    window.addEventListener('wheel', alGesto, { passive: true, once: true })
    window.addEventListener('touchstart', alGesto, { passive: true, once: true })
    window.addEventListener('keydown', alGesto, { once: true })
    window.addEventListener('resize', tick)
    tick()
    return () => {
      window.removeEventListener('scroll', alScroll)
      window.removeEventListener('wheel', alGesto)
      window.removeEventListener('touchstart', alGesto)
      window.removeEventListener('keydown', alGesto)
      window.removeEventListener('resize', tick)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [raiz])

  return { piso, solida, pisosPedidos, pedirPisos, bajar, pisosListos }
}
