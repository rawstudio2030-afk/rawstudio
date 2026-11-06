// Pantalla 01 — Puerta de edad
//
// Venia del deck de Claude Design y se conservo tal cual, incluido su texto en
// INGLES: era la primera pantalla que veia cualquiera, en un sitio que habla
// español de principio a fin. Traducida el 5 de noviembre de 2026.
//
// ---------- Y dos promesas que el producto no podia cumplir ----------
//
// Decia «SCREENSHOTS BLOCKED». No habia ningun mecanismo detras, y no puede
// haberlo: la web no permite impedir una captura de pantalla, en ningun
// navegador. Era una etiqueta y nada mas, puesta donde una creadora decide si
// entrar y dirigida justo a quien arriesga su imagen. Si alguien publica
// confiando en eso y su clip acaba circulando, la etiqueta es parte del
// problema. Fuera.
//
// En su lugar va algo que SI existe y hace el mismo trabajo: `MarcaDeAgua`
// pinta el @ de quien mira encima del video, en ClipDetail, siempre que no
// sea su propia autora. Eso si disuade de revender.
//
// Y el pie decia «We store a hash, not your face». Tambien era falso:
// Verificar.tsx sube la INE y el selfie a `supabase.storage.from(
// 'verificacion')` y guarda sus rutas. La cara SI se guarda; el hash de la
// CURP se guarda ademas, para no admitir dos veces a la misma persona. Lo que
// si es cierto —y es lo que ahora dice— es que ese bucket es privado y que su
// politica de lectura solo deja entrar a quien administra.
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSesion } from '../lib/sesion'
import { marcarEdad } from '../lib/edad'
import { supabase } from '../lib/supabase'
import Wordmark from '../components/Wordmark'
import cortina from '../assets/cortina.jpg'
import { COLOR, FUENTE } from '../lib/diseño'
import { Pulsable, Enlace } from '../components/Pulsable'

export default function AgeGate() {
  const nav = useNavigate()
  const { sesion, perfil, cargando, refrescarPerfil } = useSesion()

  // Si ya cruzo esta puerta, no se le vuelve a poner enfrente.
  useEffect(() => {
    if (cargando) return
    if (sesion && perfil?.adult_confirmed_at) nav('/clip', { replace: true })
  }, [cargando, sesion, perfil, nav])

  // Deja de ser decorativo: registra la autodeclaracion de mayoria de edad y,
  // si aun no hay sesion, manda a acceder antes de dejar ver nada.
  // Ojo: esto es autodeclaracion, no verificacion de identidad. Sirve como
  // registro de que se mostro la puerta, no como prueba legal de edad.
  const confirmarEdad = async () => {
    if (sesion) {
      await supabase
        .from('profiles')
        .update({ adult_confirmed_at: new Date().toISOString() })
        .eq('id', sesion.user.id)
      await refrescarPerfil()
      nav('/clip')
      return
    }
    // Sin sesion todavia: se guarda la constancia y se registra al abrir
    // cuenta, cuando ya existe una fila de perfil que actualizar.
    //
    // Y se va al CATALOGO, no a la puerta de acceso. Quien acaba de decir
    // «solo vengo a ver» y se topa con un formulario de registro se va: no
    // ha visto nada por lo que valga la pena dar un correo. Asi funciona
    // cualquier sitio de este giro —se mira primero y se paga despues—, y
    // aqui cada clip trae su propio muro cuando toca cobrar.
    marcarEdad()
    nav('/clip')
  }
  return (
    <div style={{minHeight: "100%", boxSizing: "border-box", padding: "64px 26px 44px", background: COLOR.fondo, color: COLOR.texto, fontFamily: "'Space Grotesk',sans-serif", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden"}}>
      {/* La ilustracion va al fondo, anclada abajo: la rendija verde queda a la
          altura de los botones y apunta hacia el titular. */}
      <div aria-hidden style={{position: "absolute", inset: 0, background: `bottom center / cover no-repeat url(${cortina})`, zIndex: 0}} />
      {/* Degradado sobre la imagen. Sin esto el titular en Anton compite con los
          pliegues de la cortina y se vuelve ilegible; es el mismo recurso que usa
          la pantalla de inicio sobre el video. */}
      <div aria-hidden style={{position: "absolute", inset: 0, background: `linear-gradient(180deg,${COLOR.fondo} 0%,rgba(8,8,10,.94) 26%,rgba(8,8,10,.55) 52%,rgba(8,8,10,.82) 100%)`, zIndex: 1}} />
      <div style={{position: "relative", zIndex: 2, display: "flex", flexDirection: "column", flex: 1}}>
      <Wordmark ancho={150} glow={16} />
      <div style={{flex: "1", display: "flex", flexDirection: "column", justifyContent: "center", gap: "22px", padding: "34px 0"}}>
        <div style={{width: "64px", height: "3px", background: COLOR.acento}} />
        <div style={{fontFamily: FUENTE.display, fontSize: "60px", lineHeight: "1", letterSpacing: "-.5px", textTransform: "uppercase"}}>
          {/* Sin acentos a proposito: Anton recorta las tildes con interlineado
              1, y aqui el interlineado es 1. Ver la nota de FUENTE.display. */}
          Demuestra
          <br />
          que eres
          <br />
          <span style={{color: COLOR.dinero}}>
            mayor.
          </span>
        </div>
        <div style={{fontFamily: FUENTE.ui, fontSize: "22px", lineHeight: "1.3", color: COLOR.textoSuave}}>
          Todo lo que hay detrás de esta puerta se paga, es privado, y lo hacen personas que eligieron estar aquí.
        </div>
        <div style={{display: "flex", gap: "8px", alignItems: "center", marginTop: "4px"}}>
          <span style={{display: "inline-block", transform: "rotate(-4deg)", background: COLOR.dinero, color: COLOR.fondo, font: "700 9px/1 'Space Grotesk'", letterSpacing: "1.2px", textTransform: "uppercase", padding: "6px 9px"}}>
            Tu @ sobre el video
          </span>
          <span style={{display: "inline-block", transform: "rotate(3deg)", background: "#fff", color: COLOR.fondo, font: "700 9px/1 'Space Grotesk'", letterSpacing: "1.2px", textTransform: "uppercase", padding: "6px 9px"}}>
            Prohibida la reventa
          </span>
        </div>
      </div>
      <div style={{display: "flex", flexDirection: "column", gap: "10px"}}>
        <Pulsable style={{boxSizing: "border-box", width: "100%", background: COLOR.acento, color: COLOR.fondo, textAlign: "center", padding: "19px", font: "700 13px/1 'Space Grotesk'", letterSpacing: "2.2px", textTransform: "uppercase", boxShadow: "0 0 34px rgba(255,43,209,.42)", cursor: "pointer"}} al={confirmarEdad}>
          Tengo 18 años o más
        </Pulsable>
        <Enlace a="/" style={{display: "block", boxSizing: "border-box", width: "100%", border: "1px solid rgba(255,255,255,.16)", color: COLOR.textoSuave, textAlign: "center", padding: "18px", font: "700 12px/1 'Space Grotesk'", letterSpacing: "2.2px", textTransform: "uppercase", cursor: "pointer"}}>
          Todavía no — sácame de aquí
        </Enlace>
        <div style={{font: "400 10px/1.45 'Space Mono',monospace", color: COLOR.textoApagado, textAlign: "center", padding: "8px 6px 0"}}>
          Para cobrar te pediremos una identificación y una selfie. Se guardan en privado y solo las ve quien administra.
        </div>
      </div>
      </div>
    </div>
  )
}
