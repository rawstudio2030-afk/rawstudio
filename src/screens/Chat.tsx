// Pantalla 08 — Chat
// Generada desde el deck de Claude Design. El markup se conserva tal cual;
// solo se anadio el cableado de navegacion.
import { useNavigate } from 'react-router-dom'

export default function Chat() {
  const nav = useNavigate()
  return (
    <div style={{height: "100%", boxSizing: "border-box", background: "#08080A", color: "#F2F0F3", fontFamily: "'Space Grotesk',sans-serif", display: "flex", flexDirection: "column"}}>
      <div style={{padding: "60px 18px 14px", borderBottom: "1px solid rgba(255,255,255,.09)", display: "flex", alignItems: "center", gap: "11px", flex: "none"}}>
        <span style={{font: "700 17px/1 'Space Grotesk'", color: "#6E6A72", cursor: "pointer"}} onClick={() => nav('/creator')}>
          ‹
        </span>
        <span style={{width: "38px", height: "38px", borderRadius: "50%", background: "repeating-linear-gradient(45deg,#2A2A31 0 6px,#1B1B21 6px 12px)", border: "1.5px solid #FF2BD1", flex: "none"}} />
        <div style={{flex: "1"}}>
          <div style={{font: "700 13.5px/1.2 'Space Grotesk'"}}>
            Mira Vanta
          </div>
          <div style={{display: "flex", alignItems: "center", gap: "6px", marginTop: "5px"}}>
            <span style={{width: "6px", height: "6px", borderRadius: "50%", background: "#C8FF3D", boxShadow: "0 0 8px #C8FF3D"}} />
            <span style={{font: "400 10px/1 'Space Mono',monospace", color: "#8E8A93"}}>
              online now
            </span>
          </div>
        </div>
        <span style={{font: "400 9.5px/1 'Space Mono',monospace", color: "#6E6A72", border: "1px solid rgba(255,255,255,.14)", padding: "6px 8px"}}>
          tip ▾
        </span>
      </div>
      <div style={{flex: "1", overflow: "auto", padding: "20px 18px", display: "flex", flexDirection: "column", gap: "14px"}}>
        <div style={{textAlign: "center", font: "400 9.5px/1 'Space Mono',monospace", letterSpacing: "1.4px", textTransform: "uppercase", color: "#4E4A53"}}>
          today
        </div>
        <div style={{alignSelf: "flex-start", maxWidth: "76%", background: "#16161B", border: "1px solid rgba(255,255,255,.07)", padding: "13px 15px", font: "400 13.5px/1.5 'Space Grotesk'", borderRadius: "2px 14px 14px 14px"}}>
          Thank you for the vol.3 unlock 🖤 there's a cut of it nobody has seen.
        </div>
        <div style={{alignSelf: "flex-end", maxWidth: "76%", background: "#FF2BD1", color: "#08080A", padding: "13px 15px", font: "500 13.5px/1.5 'Space Grotesk'", borderRadius: "14px 2px 14px 14px", boxShadow: "0 0 24px rgba(255,43,209,.28)"}}>
          wait. how unseen are we talking
        </div>
        <div style={{alignSelf: "flex-start", maxWidth: "82%", border: "1px solid rgba(200,255,61,.35)", background: "rgba(200,255,61,.05)", borderRadius: "2px 14px 14px 14px", overflow: "hidden"}}>
          <div style={{height: "150px", background: "repeating-linear-gradient(130deg,#1B1B22 0 9px,#121217 9px 18px)", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", filter: "blur(9px) saturate(.7)"}}>
            <span style={{font: "400 10px/1 'Space Mono',monospace", letterSpacing: "1.4px", textTransform: "uppercase", color: "#55515B"}}>
              [ locked · 1:12 ]
            </span>
          </div>
          <div style={{padding: "13px 15px"}}>
            <div style={{font: "400 12.5px/1.5 'Space Grotesk'", color: "#C9C5CE"}}>
              The 4am take. Only in here.
            </div>
            <div style={{marginTop: "11px", background: "#C8FF3D", color: "#08080A", textAlign: "center", padding: "13px", font: "700 11px/1 'Space Grotesk'", letterSpacing: "1.8px", textTransform: "uppercase", cursor: "pointer"}} onClick={() => nav('/wallet')}>
              Unlock 60 coins
            </div>
          </div>
        </div>
        <div style={{alignSelf: "flex-end", display: "flex", alignItems: "center", gap: "9px", border: "1px dashed rgba(0,229,255,.5)", padding: "10px 13px"}}>
          <span style={{font: "700 10px/1 'Space Grotesk'", letterSpacing: "1.6px", textTransform: "uppercase", color: "#00E5FF"}}>
            tipped
          </span>
          <span style={{font: "700 15px/1 'Space Grotesk'", color: "#00E5FF"}}>
            50 coins
          </span>
        </div>
      </div>
      <div style={{flex: "none", borderTop: "1px solid rgba(255,255,255,.09)", padding: "13px 18px 32px", display: "flex", alignItems: "center", gap: "11px"}}>
        <span style={{width: "34px", height: "34px", border: "1px solid rgba(255,255,255,.16)", display: "flex", alignItems: "center", justifyContent: "center", font: "700 17px/1 'Space Grotesk'", color: "#9C979F", flex: "none"}}>
          +
        </span>
        <span style={{flex: "1", font: "400 13px/1 'Space Grotesk'", color: "#5E5A63"}}>
          Say something…
        </span>
        <span style={{font: "700 10px/1 'Space Grotesk'", letterSpacing: "1.6px", textTransform: "uppercase", color: "#08080A", background: "#C8FF3D", padding: "11px 12px", flex: "none"}}>
          Send
        </span>
      </div>
    </div>
  )
}
