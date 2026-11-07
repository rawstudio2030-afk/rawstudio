/* Visor de un album de fotos: cuadricula + vista ampliada.
 *
 * ---------- Lo que protege y lo que no ----------
 * Cada foto lleva encima el usuario de quien mira, REPETIDO EN MOSAICO sobre toda
 * la imagen. El video usa una marca que se mueve (una grabacion la captura en
 * algun momento); en una foto, una captura congela un instante, y una marca en un
 * rincon se recorta de un tajo. En mosaico no se puede recortar sin perder la
 * foto. Es DISUASION: quien la comparta lleva su nombre puesto. No impide una
 * captura de pantalla, ni una persona decidida puede evitar quitarla con las
 * herramientas del navegador. Lo mismo que se dice de la marca del video.
 *
 * Para dificultar guardar la foto «normalmente»: se pinta como FONDO de un div (no
 * como <img>, asi no hay «guardar imagen como…» ni se arrastra), sin menu
 * contextual, sin seleccion y sin el menu de pulsacion larga del telefono, y no
 * sale al imprimir. No hay boton de descargar.
 *
 * Las URLs de las fotos duran 30 minutos: se piden de nuevo ANTES de que venzan,
 * sin cerrar la vista ni perder la foto en que se iba.
 *
 * La creadora viendo su propio album no lleva marca (no tiene a quien delatar).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { fotosDeAlbum, type FotoFirmada } from '../lib/clips'
import { COLOR, FUENTE, LINEA } from '../lib/diseño'

const ANTICIPO_MS = 120_000   // se renuevan 2 minutos antes de vencer

/** El mosaico de la marca, como imagen de fondo (SVG en un data URI). */
function mosaicoDeMarca(texto: string, fuerte: boolean): string {
  const seguro = texto.replace(/[<>&"']/g, '')
  const w = fuerte ? 220 : 130
  const fs = fuerte ? 17 : 11
  const rel = fuerte ? 0.34 : 0.4
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${Math.round(w * 0.62)}">` +
    `<text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" ` +
    `transform="rotate(-24 ${w / 2} ${Math.round(w * 0.31)})" font-family="sans-serif" ` +
    `font-weight="700" font-size="${fs}" fill="rgba(255,255,255,${rel})" ` +
    `stroke="rgba(0,0,0,${rel * 0.9})" stroke-width="0.7" paint-order="stroke">${seguro}</text></svg>`
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`
}

type Estado =
  | { tipo: 'cargando' }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'listo'; fotos: FotoFirmada[]; obtenidoEn: number; expiraEn: number }

export default function VisorAlbum({ clip, marca, titulo }: {
  clip: string
  /** El usuario de quien mira, p. ej. «@juanpedro». `null` para la autora. */
  marca: string | null
  titulo: string
}) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' })
  const [abierta, setAbierta] = useState<number | null>(null)

  const cargar = useCallback(async (silencioso: boolean) => {
    const r = await fotosDeAlbum(clip)
    if ('error' in r) {
      // Un fallo al RENOVAR no tira lo que ya se esta viendo.
      if (!silencioso) setEstado({ tipo: 'error', mensaje: r.error })
      return
    }
    setEstado({ tipo: 'listo', fotos: r.fotos, obtenidoEn: Date.now(), expiraEn: r.expira_en })
  }, [clip])

  useEffect(() => {
    let vivo = true
    fotosDeAlbum(clip).then(r => {
      if (!vivo) return
      if ('error' in r) setEstado({ tipo: 'error', mensaje: r.error })
      else setEstado({ tipo: 'listo', fotos: r.fotos, obtenidoEn: Date.now(), expiraEn: r.expira_en })
    })
    return () => { vivo = false }
  }, [clip])

  // Renovar las URLs antes de que venzan, y al volver a la pestaña si ya casi vencen.
  useEffect(() => {
    if (estado.tipo !== 'listo') return
    const resta = estado.expiraEn * 1000 - ANTICIPO_MS - (Date.now() - estado.obtenidoEn)
    const t = window.setTimeout(() => { cargar(true) }, Math.max(5000, resta))
    const alVolver = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - estado.obtenidoEn > estado.expiraEn * 1000 - ANTICIPO_MS) cargar(true)
    }
    document.addEventListener('visibilitychange', alVolver)
    return () => { window.clearTimeout(t); document.removeEventListener('visibilitychange', alVolver) }
  }, [estado, cargar])

  if (estado.tipo === 'cargando') {
    return <div role="status" style={{ padding: '30px 0', textAlign: 'center', font: `400 14px/1 ${FUENTE.mono}`, color: COLOR.textoSuave }}>Cargando las fotos…</div>
  }
  if (estado.tipo === 'error') {
    return (
      <div role="alert" style={{ padding: '24px 16px', textAlign: 'center', font: `400 14px/1.5 ${FUENTE.ui}`, color: COLOR.acento }}>
        {estado.mensaje}
      </div>
    )
  }

  const { fotos } = estado
  return (
    <div className="visor-album">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 6 }}>
        {fotos.map((f, i) => (
          <Mosaico key={f.orden} foto={f} indice={i} marca={marca} alAbrir={() => setAbierta(i)} />
        ))}
      </div>
      {abierta !== null && (
        <Ampliada fotos={fotos} inicio={abierta} marca={marca} titulo={titulo} alCerrar={() => setAbierta(null)} />
      )}
    </div>
  )
}

const sinGuardar: React.CSSProperties = {
  userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none',
}
const sinMenu = (e: React.SyntheticEvent) => e.preventDefault()

/** Una miniatura. El fondo se pone solo cuando esta cerca de la pantalla: 40 fotos
 *  de ~1 MB cargadas de golpe en un telefono serian demasiado. */
function Mosaico({ foto, indice, marca, alAbrir }: {
  foto: FotoFirmada; indice: number; marca: string | null; alAbrir: () => void
}) {
  const ref = useRef<HTMLButtonElement>(null)
  // Sin IntersectionObserver (navegadores muy viejos) se carga todo, como antes.
  const [cerca, setCerca] = useState(typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const o = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { setCerca(true); o.disconnect() } }, { rootMargin: '400px' })
    o.observe(el)
    return () => o.disconnect()
  }, [])
  return (
    <button ref={ref} type="button" onClick={alAbrir} onContextMenu={sinMenu}
      aria-label={`Abrir la foto ${indice + 1}`}
      style={{
        position: 'relative', aspectRatio: '1 / 1', padding: 0, border: `1px solid ${LINEA.suave}`,
        borderRadius: 8, overflow: 'hidden', background: COLOR.superficie, cursor: 'pointer', ...sinGuardar,
      }}>
      {cerca && (
        <div aria-hidden style={{ position: 'absolute', inset: 0,
          backgroundImage: `url("${foto.url}")`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
      )}
      {marca && <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: mosaicoDeMarca(marca, false) }} />}
    </button>
  )
}

/** La vista ampliada: pantalla completa, flechas, teclado y deslizar. */
function Ampliada({ fotos, inicio, marca, titulo, alCerrar }: {
  fotos: FotoFirmada[]; inicio: number; marca: string | null; titulo: string; alCerrar: () => void
}) {
  const [i, setI] = useState(inicio)
  const cierre = useRef<HTMLButtonElement>(null)
  const toque = useRef<{ x: number; y: number } | null>(null)
  const n = fotos.length
  const ir = useCallback((d: number) => setI(k => (k + d + n) % n), [n])

  // Teclado, sin desplazar la pagina de fondo, y el foco de vuelta al cerrar.
  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    cierre.current?.focus()
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') alCerrar()
      else if (e.key === 'ArrowRight') ir(1)
      else if (e.key === 'ArrowLeft') ir(-1)
    }
    window.addEventListener('keydown', tecla)
    return () => {
      window.removeEventListener('keydown', tecla)
      document.body.style.overflow = overflow
      previo?.focus?.()
    }
  }, [alCerrar, ir])

  // Las vecinas se cargan antes de que se pidan.
  useEffect(() => {
    for (const d of [1, -1]) { const im = new Image(); im.src = fotos[(i + d + n) % n].url }
  }, [i, fotos, n])

  const f = fotos[i]
  const ratio = f.ancho && f.alto ? f.ancho / f.alto : 3 / 2
  return (
    <div role="dialog" aria-modal="true" aria-label={`${titulo}: foto ${i + 1} de ${n}`}
      onContextMenu={sinMenu}
      onPointerDown={e => { toque.current = { x: e.clientX, y: e.clientY } }}
      onPointerUp={e => {
        const t = toque.current; toque.current = null
        if (!t) return
        const dx = e.clientX - t.x, dy = e.clientY - t.y
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) ir(dx < 0 ? 1 : -1)
      }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(5,5,7,.97)', display: 'grid',
        placeItems: 'center', touchAction: 'pan-y', ...sinGuardar,
      }}>
      <button ref={cierre} type="button" onClick={alCerrar} aria-label="Cerrar" style={{
        position: 'absolute', top: 'calc(10px + env(safe-area-inset-top))', right: 12, width: 48, height: 48,
        borderRadius: '50%', border: `1px solid ${LINEA.fuerte}`, background: 'rgba(8,8,10,.8)',
        color: COLOR.texto, font: `400 24px/1 ${FUENTE.ui}`, cursor: 'pointer', zIndex: 2,
      }}>×</button>

      {n > 1 && (<>
        <button type="button" onClick={() => ir(-1)} aria-label="Foto anterior" style={flecha('left')}>‹</button>
        <button type="button" onClick={() => ir(1)} aria-label="Foto siguiente" style={flecha('right')}>›</button>
      </>)}

      {/* La caja tiene la PROPORCION de la foto: asi la marca cubre exactamente la
          imagen y no las franjas negras de alrededor. */}
      <div style={{
        position: 'relative', aspectRatio: String(ratio),
        width: `min(100vw, calc((100vh - 110px) * ${ratio}))`, maxHeight: 'calc(100vh - 110px)',
      }}>
        <div role="img" aria-label={`${titulo}, foto ${i + 1}`} style={{
          position: 'absolute', inset: 0, backgroundImage: `url("${f.url}")`,
          backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center',
        }} />
        {marca && <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: mosaicoDeMarca(marca, true) }} />}
      </div>

      <div style={{
        position: 'absolute', bottom: 'calc(14px + env(safe-area-inset-bottom))', left: 0, right: 0,
        textAlign: 'center', font: `400 13px/1 ${FUENTE.mono}`, color: COLOR.textoSuave,
      }}>{i + 1} / {n}</div>
    </div>
  )
}

function flecha(lado: 'left' | 'right'): React.CSSProperties {
  return {
    position: 'absolute', top: '50%', [lado]: 8, transform: 'translateY(-50%)', width: 48, height: 64,
    border: 0, borderRadius: 10, background: 'rgba(8,8,10,.55)', color: COLOR.texto,
    font: `400 34px/1 ${FUENTE.ui}`, cursor: 'pointer', zIndex: 2,
  }
}
