/* Reproductor de un clip desbloqueado.
 *
 * Antes era `<video controls>`: el cromo nativo de cada navegador, sin control
 * de velocidad y distinto en cada uno. Este lo reemplaza con controles propios,
 * en modo consumo (fondo plano, tipografia de interfaz; el magenta solo en la
 * barra de progreso, que es lo que se actua).
 *
 * Todo lo que se pulsa es un `Pulsable` (un <button>), nunca un div con onClick:
 * asi recibe foco y responde a Enter y Espacio sin reescribirlo a mano.
 *
 * ---------- Marca de agua y ventanas sin ella ----------
 *
 * La marca vive DENTRO de este componente, y la pantalla completa se pide al
 * contenedor y no al <video>: asi la marca (y los controles) siguen puestos.
 * Hay dos vias que sacan el video de ese contenedor y lo dejan SIN marca:
 *   - Picture-in-Picture, que dibuja solo el video en una ventana aparte;
 *   - en iPhone, donde no existe pantalla completa de elemento y solo queda el
 *     reproductor nativo del sistema (`webkitEnterFullscreen`).
 * Una grabacion de pantalla de cualquiera de las dos no llevaria el nombre de
 * quien mira. `VENTANAS_SIN_MARCA` las permite o las esconde cuando hay marca;
 * hoy estan ESCONDIDAS: con marca no hay boton de PiP ni se llama a
 * `webkitEnterFullscreen`. Sin marca (la autora viendo lo suyo) se ofrecen si el
 * navegador las tiene. La pantalla completa de elemento sigue en los dos casos,
 * porque lleva la marca y la barra dentro.
 *
 * ---------- Lo que NO hace ----------
 *
 * Sin boton de descarga y sin menu de calidad (hay un solo archivo por clip, asi
 * que un selector seria mentira). La URL sigue siendo la firmada.
 */
import {
  useCallback, useEffect, useRef, useState,
  type CSSProperties, type KeyboardEvent, type MouseEvent,
} from 'react'
import { Pulsable } from './Pulsable'
import MarcaDeAgua from './MarcaDeAgua'
import { COLOR, FUENTE } from '../lib/diseño'

/** `true`: PiP y el reproductor nativo de iPhone se ofrecen aunque haya marca de
 *  agua (esas dos vias no la llevan). `false`: con marca, se esconden. */
const VENTANAS_SIN_MARCA = false

const VELOCIDADES = [0.5, 0.75, 1, 1.25, 1.5, 2]
const CLAVE_VELOCIDAD = 'rawstudio.velocidad'
const OCULTAR_TRAS = 2500
const UMBRAL_DOBLE = 280

function velocidadGuardada(): number {
  try {
    const v = Number(localStorage.getItem(CLAVE_VELOCIDAD))
    return VELOCIDADES.includes(v) ? v : 1
  } catch { return 1 }
}

function hora(s: number) {
  if (!isFinite(s) || s < 0) s = 0
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const seg = Math.floor(s % 60).toString().padStart(2, '0')
  return h ? `${h}:${m.toString().padStart(2, '0')}:${seg}` : `${m}:${seg}`
}

type VideoConWebkit = HTMLVideoElement & { webkitEnterFullscreen?: () => void }

export default function Reproductor({ src, poster, marca }: {
  src: string; poster?: string | null; marca: string | null
}) {
  const raiz = useRef<HTMLDivElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const barra = useRef<HTMLDivElement>(null)
  const temporizador = useRef<number | undefined>(undefined)
  const clicPendiente = useRef<number | undefined>(undefined)
  const avisoTimer = useRef<number | undefined>(undefined)

  const [pausado, setPausado] = useState(true)
  const [tiempo, setTiempo] = useState(0)
  const [duracion, setDuracion] = useState(0)
  const [volumen, setVolumen] = useState(1)
  const [silencio, setSilencio] = useState(false)
  const [velocidad, setVelocidad] = useState(velocidadGuardada)
  const [menuVel, setMenuVel] = useState(false)
  const [visibles, setVisibles] = useState(true)
  const [completa, setCompleta] = useState(false)
  const [aviso, setAviso] = useState('')

  // Lo que ofrece este navegador. Se calcula una vez.
  const [caps] = useState(() => {
    const el = document.createElement('video') as VideoConWebkit
    const elemento = !!document.fullscreenEnabled
    const nativo = typeof el.webkitEnterFullscreen === 'function'
    const pip = !!document.pictureInPictureEnabled
    return { elemento, nativo, pip }
  })
  const conMarca = !!marca
  const puedePip = caps.pip && (VENTANAS_SIN_MARCA || !conMarca)
  const puedeCompleta = caps.elemento || (caps.nativo && (VENTANAS_SIN_MARCA || !conMarca))

  /* ---------- controles que se ocultan ---------- */

  const programarOcultar = useCallback(() => {
    window.clearTimeout(temporizador.current)
    temporizador.current = window.setTimeout(() => {
      const v = video.current
      if (!v || v.paused || v.ended) return
      // Con el foco en un control o con el menu abierto no se esconde nada:
      // quien navega con teclado no puede perder el control que tiene.
      if (barra.current?.contains(document.activeElement)) return
      setVisibles(false)
    }, OCULTAR_TRAS)
  }, [])

  const mostrar = useCallback(() => {
    setVisibles(true)
    programarOcultar()
  }, [programarOcultar])

  useEffect(() => () => {
    window.clearTimeout(temporizador.current)
    window.clearTimeout(clicPendiente.current)
    window.clearTimeout(avisoTimer.current)
  }, [])

  /* ---------- velocidad ---------- */

  // Se reaplica al cambiar de clip: poner `src` reinicia `playbackRate`.
  const aplicarVelocidad = useCallback(() => {
    const v = video.current
    if (!v) return
    v.defaultPlaybackRate = velocidad
    v.playbackRate = velocidad
  }, [velocidad])
  useEffect(() => { aplicarVelocidad() }, [aplicarVelocidad, src])

  const elegirVelocidad = (n: number) => {
    setVelocidad(n); setMenuVel(false)
    try { localStorage.setItem(CLAVE_VELOCIDAD, String(n)) } catch { /* sin almacenamiento: vale para esta sesion */ }
  }

  /* ---------- acciones ---------- */

  const alternar = useCallback(() => {
    const v = video.current
    if (!v) return
    if (v.paused || v.ended) void v.play().catch(() => {})
    else v.pause()
  }, [])

  const saltar = useCallback((seg: number) => {
    const v = video.current
    if (!v) return
    const fin = isFinite(v.duration) ? v.duration : Infinity
    v.currentTime = Math.min(Math.max(0, v.currentTime + seg), fin)
    setTiempo(v.currentTime)
    window.clearTimeout(avisoTimer.current)
    setAviso(`${seg > 0 ? '+' : '−'}${Math.abs(seg)} s`)
    avisoTimer.current = window.setTimeout(() => setAviso(''), 700)
  }, [])

  const silenciar = useCallback(() => {
    const v = video.current
    if (v) v.muted = !v.muted
  }, [])

  const pantallaCompleta = useCallback(() => {
    const el = raiz.current
    const v = video.current as VideoConWebkit | null
    if (!el || !v) return
    if (document.fullscreenElement) { void document.exitFullscreen(); return }
    if (caps.elemento && el.requestFullscreen) { void el.requestFullscreen().catch(() => {}); return }
    // iPhone: no hay pantalla completa de elemento, solo la del <video>.
    v.webkitEnterFullscreen?.()
  }, [caps.elemento])

  const pip = useCallback(async () => {
    const v = video.current
    if (!v) return
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture()
      else await v.requestPictureInPicture()
    } catch { /* el navegador lo nego: no hay nada que mostrar */ }
  }, [])

  useEffect(() => {
    const al = () => setCompleta(document.fullscreenElement === raiz.current)
    document.addEventListener('fullscreenchange', al)
    return () => document.removeEventListener('fullscreenchange', al)
  }, [])

  /* ---------- clic y doble toque sobre el video ---------- */

  const alClicVideo = (e: MouseEvent<HTMLDivElement>) => {
    mostrar()
    const caja = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - caja.left) / caja.width
    // Segundo clic dentro del umbral: es doble toque, no un clic.
    if (clicPendiente.current !== undefined) {
      window.clearTimeout(clicPendiente.current)
      clicPendiente.current = undefined
      if (x < 1 / 3) saltar(-10)
      else if (x > 2 / 3) saltar(10)
      else if (puedeCompleta) pantallaCompleta()
      return
    }
    clicPendiente.current = window.setTimeout(() => {
      clicPendiente.current = undefined
      alternar()
    }, UMBRAL_DOBLE)
  }

  /* ---------- teclado ---------- */

  const alTecla = (e: KeyboardEvent<HTMLDivElement>) => {
    mostrar()
    if (e.ctrlKey || e.metaKey || e.altKey) return
    const objetivo = e.target as HTMLElement
    const enControl = objetivo !== raiz.current
    const enVolumen = objetivo.dataset.rpvolumen !== undefined
    const tecla = e.key
    let hecho = true
    switch (tecla) {
      // En un boton, Espacio y Enter ya los atiende el propio boton.
      case ' ': case 'k': case 'K':
        if (tecla === ' ' && enControl && objetivo.tagName === 'BUTTON') return
        alternar(); break
      case 'j': case 'J': saltar(-10); break
      case 'l': case 'L': saltar(10); break
      case 'ArrowLeft': if (enVolumen) return; saltar(-5); break
      case 'ArrowRight': if (enVolumen) return; saltar(5); break
      case 'm': case 'M': silenciar(); break
      case 'f': case 'F': if (puedeCompleta) pantallaCompleta(); else hecho = false; break
      case 'Escape':
        if (menuVel) setMenuVel(false); else hecho = false
        break
      default: hecho = false
    }
    if (hecho) e.preventDefault()
  }

  /* ---------- pintado ---------- */

  const pct = duracion > 0 ? (tiempo / duracion) * 100 : 0
  const mostrarBarra = visibles || pausado

  const boton: CSSProperties = {
    width: 44, height: 44, display: 'grid', placeItems: 'center',
    color: COLOR.texto, cursor: 'pointer', borderRadius: 10, flex: '0 0 auto',
  }

  return (
    <div
      ref={raiz} tabIndex={0} role="group" aria-label="Reproductor de video"
      onKeyDown={alTecla}
      onPointerMove={mostrar} onPointerDown={mostrar} onFocus={mostrar}
      onContextMenu={e => e.preventDefault()}
      style={{
        position: 'relative', width: '100%', height: '100%', background: '#000',
        outline: 'none', userSelect: 'none', overflow: 'hidden',
        cursor: mostrarBarra ? 'default' : 'none',
      }}>
      <video
        ref={video} src={src} playsInline preload="metadata"
        poster={poster ?? undefined}
        controlsList="nodownload noremoteplayback" disablePictureInPicture={!puedePip}
        onLoadedMetadata={e => { setDuracion(e.currentTarget.duration); aplicarVelocidad() }}
        onDurationChange={e => setDuracion(e.currentTarget.duration)}
        onTimeUpdate={e => setTiempo(e.currentTarget.currentTime)}
        onPlay={() => { setPausado(false); programarOcultar() }}
        onPause={() => { setPausado(true); setVisibles(true) }}
        onEnded={() => { setPausado(true); setVisibles(true) }}
        onVolumeChange={e => { setVolumen(e.currentTarget.volume); setSilencio(e.currentTarget.muted) }}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          // En pantalla completa se ve entero; en la ficha llena el recuadro.
          objectFit: completa ? 'contain' : 'cover', background: '#000',
        }} />

      {/* Capa de gestos: recibe el clic y el doble toque. Va debajo de la marca,
          de la barra y del boton central. */}
      <div onClick={alClicVideo} style={{ position: 'absolute', inset: 0, zIndex: 1 }} />

      {marca && <MarcaDeAgua texto={marca} />}

      {/* +10 s / −10 s */}
      <div aria-live="polite" style={{
        position: 'absolute', top: '42%', left: 0, right: 0, textAlign: 'center',
        zIndex: 4, pointerEvents: 'none',
        font: `700 15px/1 ${FUENTE.ui}`, color: COLOR.texto,
        textShadow: '0 1px 6px rgba(0,0,0,.9)', opacity: aviso ? 1 : 0,
        transition: 'opacity .2s',
      }}>{aviso}</div>

      {/* Boton central */}
      {mostrarBarra && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 4, display: 'grid', placeItems: 'center',
          pointerEvents: 'none',
        }}>
          <Pulsable al={alternar} rotulo={pausado ? 'Reproducir' : 'Pausar'} style={{
            pointerEvents: pausado ? 'auto' : 'none', width: 64, height: 64, borderRadius: '50%',
            display: 'grid', placeItems: 'center', color: COLOR.texto, cursor: 'pointer',
            background: 'rgba(8,8,10,.62)', border: '1px solid rgba(255,255,255,.22)',
            opacity: pausado ? 1 : 0, transition: 'opacity .2s',
          }}>
            <Icono d={pausado ? PLAY : PAUSA} relleno tam={28} />
          </Pulsable>
        </div>
      )}

      {/* Barra inferior */}
      <div ref={barra} style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 5,
        padding: '28px 8px 4px',
        background: 'linear-gradient(180deg, rgba(8,8,10,0), rgba(8,8,10,.88))',
        opacity: mostrarBarra ? 1 : 0, pointerEvents: mostrarBarra ? 'auto' : 'none',
        transition: 'opacity .25s',
        font: `400 12px/1 ${FUENTE.mono}`, color: COLOR.texto,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 6px' }}>
          <span style={{ minWidth: 38, textAlign: 'right' }}>{hora(tiempo)}</span>
          <input
            type="range" className="rp-rango" min={0} max={duracion || 0} step={1}
            value={Math.min(tiempo, duracion || 0)}
            aria-label="Posición del video"
            aria-valuetext={`${hora(tiempo)} de ${hora(duracion)}`}
            onChange={e => {
              const v = video.current
              if (!v) return
              v.currentTime = Number(e.target.value)
              setTiempo(v.currentTime)
            }}
            style={{ '--p': `${pct}%`, flex: 1 } as CSSProperties} />
          <span style={{ minWidth: 38 }}>{hora(duracion)}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Pulsable al={alternar} rotulo={pausado ? 'Reproducir' : 'Pausar'} style={boton}>
            <Icono d={pausado ? PLAY : PAUSA} relleno tam={22} />
          </Pulsable>
          <Pulsable al={silenciar} rotulo={silencio || volumen === 0 ? 'Activar sonido' : 'Silenciar'} style={boton}>
            <Icono d={silencio || volumen === 0 ? SILENCIO : VOLUMEN} tam={22} />
          </Pulsable>
          <input
            type="range" className="rp-rango rp-volumen" data-rpvolumen min={0} max={1} step={0.05}
            value={silencio ? 0 : volumen} aria-label="Volumen"
            onChange={e => {
              const v = video.current
              if (!v) return
              v.volume = Number(e.target.value)
              v.muted = Number(e.target.value) === 0
            }}
            style={{ '--p': `${(silencio ? 0 : volumen) * 100}%` } as CSSProperties} />

          <span style={{ flex: 1 }} />

          {/* Velocidad */}
          <div style={{ position: 'relative' }}>
            <Pulsable al={() => setMenuVel(m => !m)} rotulo={`Velocidad de reproducción, ahora ${velocidad}×`}
              activado={menuVel}
              style={{ ...boton, width: 'auto', minWidth: 48, padding: '0 10px',
                font: `700 13px/1 ${FUENTE.ui}` }}>
              {velocidad}×
            </Pulsable>
            {menuVel && (
              <div role="menu" aria-label="Velocidad" style={{
                position: 'absolute', right: 0, bottom: 50, minWidth: 110, padding: 4,
                background: COLOR.superficieAlta, border: '1px solid rgba(255,255,255,.16)',
                borderRadius: 10, display: 'grid', gap: 1,
              }}>
                {VELOCIDADES.map(n => (
                  <Pulsable key={n} al={() => elegirVelocidad(n)} activado={n === velocidad}
                    rotulo={n === 1 ? 'Velocidad normal' : `Velocidad ${n}×`}
                    style={{
                      height: 44, padding: '0 12px', textAlign: 'left', cursor: 'pointer',
                      borderRadius: 8, font: `${n === velocidad ? 700 : 400} 14px/1 ${FUENTE.ui}`,
                      color: n === velocidad ? COLOR.acento : COLOR.texto,
                    }}>
                    {n === 1 ? 'Normal' : `${n}×`}
                  </Pulsable>
                ))}
              </div>
            )}
          </div>

          {puedePip && (
            <Pulsable al={pip} rotulo="Imagen en imagen" style={boton}>
              <Icono d={PIP} tam={22} />
            </Pulsable>
          )}
          {puedeCompleta && (
            <Pulsable al={pantallaCompleta} rotulo={completa ? 'Salir de pantalla completa' : 'Pantalla completa'} style={boton}>
              <Icono d={completa ? SALIR : COMPLETA} tam={22} />
            </Pulsable>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------- iconos ---------- */

const PLAY = 'M7 5v14l11.5-7Z'
const PAUSA = 'M7 5h3.4v14H7zM13.6 5H17v14h-3.4z'
const VOLUMEN = 'M4 9.5v5h3.5L12 18.5v-13L7.5 9.5ZM15.5 9a4 4 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11'
const SILENCIO = 'M4 9.5v5h3.5L12 18.5v-13L7.5 9.5ZM16 9.5l5 5M21 9.5l-5 5'
const COMPLETA = 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5'
const SALIR = 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5'
const PIP = 'M3.5 5.5h17v13h-17zM12 11.5h6.5v5H12z'

function Icono({ d, tam, relleno }: { d: string; tam: number; relleno?: boolean }) {
  return (
    <svg aria-hidden width={tam} height={tam} viewBox="0 0 24 24"
      fill={relleno ? 'currentColor' : 'none'} stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}
