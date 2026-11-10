// Pantalla 00 — Launch (/intro)
//
// Modo marca (DESIGN-BRIEF.md): el salon de Collins fijo y el wordmark que
// aparece con unos parpadeos. Ya no lleva el video del ojo —es del
// lenguaje anterior de la marca—; el video sigue en la portada, dentro del iris.
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSesion } from '../lib/sesion'
import Wordmark from '../components/Wordmark'
import FondoCollins from '../components/FondoCollins'
import { COLOR, FUENTE } from '../lib/diseño'
import { Pulsable } from '../components/Pulsable'

export default function Launch() {
  const nav = useNavigate()
  const { sesion, perfil, cargando } = useSesion()
  const barraRef = useRef<HTMLSpanElement>(null)

  // Al llenarse la barra de progreso (agBar) la intro termino y se pasa solo al
  // age gate. Se escucha el fin real de la animacion y no un temporizador a
  // ciegas: si la pestaña se va a segundo plano el navegador pausa la
  // animacion, y con temporizador el usuario volveria a una pantalla que nunca
  // llego a ver.
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

    // Respaldo duro: si la animacion no corre —ahorro de energia, movimiento
    // reducido— la intro no puede quedarse congelada.
    const respaldo = window.setTimeout(() => {
      if (document.visibilityState === 'visible') avanzar()
    }, 7000)

    return () => {
      barra.removeEventListener('animationend', avanzar)
      window.clearTimeout(respaldo)
      hecho = true
    }
  }, [nav, sesion, perfil, cargando])

  return (
    <div onClick={() => nav('/age')} style={{
      height: '100%', minHeight: '100svh', boxSizing: 'border-box', position: 'relative', overflow: 'hidden',
      background: COLOR.fondo, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: FUENTE.ui,
    }}>
      <FondoCollins />

      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 22px', marginTop: '-6vh' }}>
        <div className="intro-neon">
          <Wordmark ancho={Math.min(360, Math.round(window.innerWidth * 0.86))} centrado />
        </div>
        <div className="intro-texto" style={{
          font: `500 16px/1 ${FUENTE.ui}`, letterSpacing: 6, textTransform: 'uppercase',
          color: COLOR.textoSuave, marginTop: 22, textShadow: '0 1px 14px rgba(14,21,32,.9)',
        }}>
          Paga para ver
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: 'calc(86px + env(safe-area-inset-bottom))', width: 96, height: 2, background: 'rgba(255,255,255,.14)', overflow: 'hidden', zIndex: 1 }}>
        <span ref={barraRef} style={{ display: 'block', height: 2, background: COLOR.dinero, boxShadow: `0 0 10px ${COLOR.dinero}`, animation: 'agBar 4.5s ease-out both' }} />
      </div>
      <Pulsable al={() => nav('/age')} style={{
        position: 'absolute', bottom: 'calc(30px + env(safe-area-inset-bottom))', zIndex: 1,
        minHeight: 44, padding: '0 14px', display: 'inline-flex', alignItems: 'center',
        font: `400 12px/1 'IBM Plex Mono', ui-monospace, monospace`, letterSpacing: 1.6, textTransform: 'uppercase',
        color: COLOR.textoTenue, cursor: 'pointer',
      }}>
        Solo mayores de 18 — entrar
      </Pulsable>
    </div>
  )
}
