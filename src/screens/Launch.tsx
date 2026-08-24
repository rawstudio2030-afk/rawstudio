// Pantalla 00 — Launch
// Generada desde el deck de Claude Design. El markup se conserva tal cual;
// solo se anadio el cableado de navegacion.
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSesion } from '../lib/sesion'
import wordmark from '../assets/wordmark.png'
import launchVideo from '../assets/launch.mp4'
import { COLOR } from '../lib/diseño'

export default function Launch() {
  const nav = useNavigate()
  const { sesion, perfil, cargando } = useSesion()
  const vidRef = useRef<HTMLVideoElement>(null)
  const barraRef = useRef<HTMLSpanElement>(null)
  const replay = () => {
    const v = vidRef.current
    if (v) { v.currentTime = 0; v.play() }
  }

  // Al llenarse la barra de progreso (agBar, 6.5 s) la intro termino y se pasa
  // solo al age gate. Se escucha el fin real de la animacion y no un
  // temporizador a ciegas: si la pestaña se va a segundo plano el navegador
  // pausa la animacion, y con temporizador el usuario volveria a una pantalla
  // que nunca llego a ver.
  useEffect(() => {
    const barra = barraRef.current
    if (!barra) return

    let hecho = false
    const avanzar = () => {
      if (hecho) return
      hecho = true
      // Preguntar la edad a quien ya entro y ya la confirmo es redundante y se
      // siente a error. La puerta de edad solo aparece si hace falta cruzarla.
      if (cargando) { nav('/age'); return }
      if (sesion && perfil?.adult_confirmed_at) { nav('/clip'); return }
      nav('/age')
    }

    barra.addEventListener('animationend', avanzar)

    // El video puede tardar mas que la animacion en descargarse: en una
    // conexion movil mediana, un archivo pesado no alcanza a empezar antes de
    // los 6.5 s y la intro se iba con la pantalla en negro. Si aun no arranca,
    // se le concede espera extra en vez de avanzar sobre nada.
    const video = vidRef.current
    const yaCorre = () => !!video && !video.paused && video.readyState > 2

    const avanzarSiHayQueVer = () => {
      if (yaCorre() || !video) { avanzar(); return }
      // Espera acotada: mejor una intro corta que una pantalla negra eterna
      // si la red esta muy mal o el navegador bloquea la reproduccion.
      const empezar = () => avanzar()
      video.addEventListener('playing', empezar, { once: true })
      window.setTimeout(avanzar, 6000)
    }

    barra.removeEventListener('animationend', avanzar)
    barra.addEventListener('animationend', avanzarSiHayQueVer)

    // Respaldo duro: si nada de lo anterior ocurre —animacion que no corre,
    // video que nunca carga— la intro no puede quedarse congelada.
    const respaldo = window.setTimeout(() => {
      if (document.visibilityState === 'visible') avanzar()
    }, 14000)

    return () => {
      barra.removeEventListener('animationend', avanzar)
      barra.removeEventListener('animationend', avanzarSiHayQueVer)
      window.clearTimeout(respaldo)
      hecho = true
    }
  }, [nav, sesion, perfil, cargando])
  return (
    <div onClick={() => nav('/age')} style={{height: "100%", boxSizing: "border-box", background: COLOR.fondo, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", fontFamily: "'Space Grotesk',sans-serif"}}>
      <video ref={vidRef} src={launchVideo} autoPlay muted loop playsInline style={{position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", display: "block"}} />
      <div style={{position: "absolute", inset: "0", background: `radial-gradient(circle at 50% 34%,transparent 26%,rgba(8,8,10,.4) 62%,rgba(8,8,10,.92) 100%),linear-gradient(180deg,rgba(8,8,10,.55) 0%,transparent 24%,rgba(8,8,10,.45) 52%,rgba(8,8,10,.9) 70%,${COLOR.fondo} 82%)`, pointerEvents: "none"}} />
      <div style={{position: "absolute", bottom: "118px", textAlign: "center", animation: "agWordIn 6.5s ease-out both"}}>
        <div style={{position: "relative", width: "242px", height: "90px", margin: "0 auto", transform: "rotate(-2deg)", filter: "drop-shadow(0 0 22px rgba(255,43,209,.7))"}}>
          <img src={wordmark} alt="RAWstudio" style={{width: "100%", height: "auto", display: "block"}} />
        </div>
        <div style={{fontFamily: "'Instrument Serif',serif", fontStyle: "italic", fontSize: "17px", color: COLOR.textoSuave, marginTop: "8px"}}>
          pay to see it
        </div>
      </div>
      <div style={{position: "absolute", bottom: "78px", width: "96px", height: "2px", background: "#1E1E24", overflow: "hidden"}}>
        <span ref={barraRef} style={{display: "block", height: "2px", background: COLOR.dinero, boxShadow: `0 0 10px ${COLOR.dinero}`, animation: "agBar 6.5s ease-out both"}} />
      </div>
      <div style={{position: "absolute", bottom: "46px", font: "400 9.5px/1 'Space Mono',monospace", letterSpacing: "1.6px", textTransform: "uppercase", color: "#7E7A83"}}>
        18+ only
      </div>
      <div style={{position: "absolute", top: "56px", right: "16px", font: "700 9px/1 'Space Grotesk'", letterSpacing: "1.4px", textTransform: "uppercase", color: COLOR.fondo, background: COLOR.admin, padding: "7px 9px", cursor: "pointer"}} onClick={(e) => { e.stopPropagation(); replay() }}>
        Replay
      </div>
    </div>
  )
}
