// Pantalla 00 — Launch
// Generada desde el deck de Claude Design. El markup se conserva tal cual;
// solo se anadio el cableado de navegacion.
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import wordmark from '../assets/wordmark.png'
import launchVideo from '../assets/launch.mp4'

export default function Launch() {
  const nav = useNavigate()
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
      nav('/age')
    }

    barra.addEventListener('animationend', avanzar)

    // Respaldo por si la animacion nunca corre —motion reducido, estilos que
    // no cargaron—: sin esto la intro se queda congelada. Tocar la pantalla
    // tambien avanza, pero no conviene depender de que lo adivinen.
    const respaldo = window.setTimeout(() => {
      if (document.visibilityState === 'visible') avanzar()
    }, 9000)

    return () => {
      barra.removeEventListener('animationend', avanzar)
      window.clearTimeout(respaldo)
      hecho = true
    }
  }, [nav])
  return (
    <div onClick={() => nav('/age')} style={{height: "100%", boxSizing: "border-box", background: "#08080A", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", fontFamily: "'Space Grotesk',sans-serif"}}>
      <video ref={vidRef} src={launchVideo} autoPlay muted loop playsInline style={{position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", display: "block"}} />
      <div style={{position: "absolute", inset: "0", background: "radial-gradient(circle at 50% 34%,transparent 26%,rgba(8,8,10,.4) 62%,rgba(8,8,10,.92) 100%),linear-gradient(180deg,rgba(8,8,10,.55) 0%,transparent 24%,rgba(8,8,10,.45) 52%,rgba(8,8,10,.9) 70%,#08080A 82%)", pointerEvents: "none"}} />
      <div style={{position: "absolute", bottom: "118px", textAlign: "center", animation: "agWordIn 6.5s ease-out both"}}>
        <div style={{position: "relative", width: "242px", height: "90px", margin: "0 auto", transform: "rotate(-2deg)", filter: "drop-shadow(0 0 22px rgba(255,43,209,.7))"}}>
          <img src={wordmark} alt="RAWstudio" style={{width: "100%", height: "auto", display: "block"}} />
        </div>
        <div style={{fontFamily: "'Instrument Serif',serif", fontStyle: "italic", fontSize: "17px", color: "#9C979F", marginTop: "8px"}}>
          pay to see it
        </div>
      </div>
      <div style={{position: "absolute", bottom: "78px", width: "96px", height: "2px", background: "#1E1E24", overflow: "hidden"}}>
        <span ref={barraRef} style={{display: "block", height: "2px", background: "#C8FF3D", boxShadow: "0 0 10px #C8FF3D", animation: "agBar 6.5s ease-out both"}} />
      </div>
      <div style={{position: "absolute", bottom: "46px", font: "400 9.5px/1 'Space Mono',monospace", letterSpacing: "1.6px", textTransform: "uppercase", color: "#7E7A83"}}>
        18+ only
      </div>
      <div style={{position: "absolute", top: "56px", right: "16px", font: "700 9px/1 'Space Grotesk'", letterSpacing: "1.4px", textTransform: "uppercase", color: "#08080A", background: "#00E5FF", padding: "7px 9px", cursor: "pointer"}} onClick={(e) => { e.stopPropagation(); replay() }}>
        Replay
      </div>
    </div>
  )
}
