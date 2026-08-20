// Pantalla 01 — Age gate
// Generada desde el deck de Claude Design. El markup se conserva tal cual;
// solo se anadio el cableado de navegacion.
import { useNavigate } from 'react-router-dom'
import wordmark from '../assets/wordmark.png'

export default function AgeGate() {
  const nav = useNavigate()
  return (
    <div style={{minHeight: "100%", boxSizing: "border-box", padding: "64px 26px 44px", background: "#08080A", color: "#F2F0F3", fontFamily: "'Space Grotesk',sans-serif", display: "flex", flexDirection: "column"}}>
      <div style={{position: "relative", width: "150px", height: "56px", transform: "rotate(-2deg)", filter: "drop-shadow(0 0 16px rgba(255,43,209,.6))"}}>
        <img src={wordmark} alt="RAWstudio" style={{width: "100%", height: "auto", display: "block"}} />
      </div>
      <div style={{flex: "1", display: "flex", flexDirection: "column", justifyContent: "center", gap: "22px", padding: "34px 0"}}>
        <div style={{width: "64px", height: "3px", background: "#FF2BD1"}} />
        <div style={{fontFamily: "Anton,sans-serif", fontSize: "58px", lineHeight: ".9", letterSpacing: "-.5px", textTransform: "uppercase"}}>
          Prove
          <br />
          you're
          <br />
          <span style={{color: "#C8FF3D"}}>
            grown.
          </span>
        </div>
        <div style={{fontFamily: "'Instrument Serif',serif", fontStyle: "italic", fontSize: "21px", lineHeight: "1.35", color: "#9C979F"}}>
          Everything past this door is paid, private, and made by people who chose to be here.
        </div>
        <div style={{display: "flex", gap: "8px", alignItems: "center", marginTop: "4px"}}>
          <span style={{display: "inline-block", transform: "rotate(-4deg)", background: "#C8FF3D", color: "#08080A", font: "700 9.5px/1 'Space Grotesk'", letterSpacing: "1.4px", textTransform: "uppercase", padding: "6px 9px"}}>
            Screenshots blocked
          </span>
          <span style={{display: "inline-block", transform: "rotate(3deg)", background: "#fff", color: "#08080A", font: "700 9.5px/1 'Space Grotesk'", letterSpacing: "1.4px", textTransform: "uppercase", padding: "6px 9px"}}>
            No resale
          </span>
        </div>
      </div>
      <div style={{display: "flex", flexDirection: "column", gap: "10px"}}>
        <div style={{background: "#FF2BD1", color: "#08080A", textAlign: "center", padding: "19px", font: "700 13px/1 'Space Grotesk'", letterSpacing: "2.2px", textTransform: "uppercase", boxShadow: "0 0 34px rgba(255,43,209,.42)", cursor: "pointer"}} onClick={() => nav('/clip')}>
          I'm 18 or older
        </div>
        <div style={{border: "1px solid rgba(255,255,255,.16)", color: "#9C979F", textAlign: "center", padding: "18px", font: "700 12px/1 'Space Grotesk'", letterSpacing: "2px", textTransform: "uppercase", cursor: "pointer"}} onClick={() => nav('/')}>
          Not yet — show me out
        </div>
        <div style={{font: "400 10.5px/1.5 'Space Mono',monospace", color: "#5E5A63", textAlign: "center", padding: "8px 6px 0"}}>
          ID check may be requested before your first payout. We store a hash, not your face.
        </div>
      </div>
    </div>
  )
}
