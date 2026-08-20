// Pantalla 04 — Creator
// Generada desde el deck de Claude Design. El markup se conserva tal cual;
// solo se anadio el cableado de navegacion.
import { useNavigate } from 'react-router-dom'

export default function CreatorProfile() {
  const nav = useNavigate()
  return (
    <div style={{minHeight: "100%", boxSizing: "border-box", background: "#08080A", color: "#F2F0F3", fontFamily: "'Space Grotesk',sans-serif", paddingBottom: "40px"}}>
      <div style={{height: "150px", background: "repeating-linear-gradient(100deg,#1A1A20 0 10px,#101015 10px 20px)", position: "relative"}}>
        <div style={{position: "absolute", inset: "0", background: "linear-gradient(180deg,rgba(8,8,10,.4),#08080A)"}} />
        <div style={{position: "absolute", bottom: "14px", right: "16px", font: "400 9.5px/1 'Space Mono',monospace", letterSpacing: "1.4px", color: "#4E4A53", textTransform: "uppercase"}}>
          [ cover still ]
        </div>
      </div>
      <div style={{padding: "0 20px"}}>
        <div style={{display: "flex", alignItems: "flex-end", gap: "14px", marginTop: "-40px"}}>
          <span style={{width: "86px", height: "86px", borderRadius: "50%", background: "repeating-linear-gradient(45deg,#2A2A31 0 7px,#1B1B21 7px 14px)", border: "2px solid #FF2BD1", boxShadow: "0 0 26px rgba(255,43,209,.35)", flex: "none"}} />
          <div style={{paddingBottom: "6px"}}>
            <div style={{fontFamily: "Anton,sans-serif", fontSize: "27px", lineHeight: "1", textTransform: "uppercase"}}>
              Mira Vanta
            </div>
            <div style={{display: "flex", alignItems: "center", gap: "7px", marginTop: "7px"}}>
              <span style={{font: "400 11px/1 'Space Mono',monospace", color: "#7E7A83"}}>
                @miravanta
              </span>
              <span style={{font: "700 8.5px/1 'Space Grotesk'", letterSpacing: "1.3px", textTransform: "uppercase", color: "#08080A", background: "#00E5FF", padding: "4px 6px"}}>
                verified
              </span>
            </div>
          </div>
        </div>
        <div style={{fontFamily: "'Instrument Serif',serif", fontStyle: "italic", fontSize: "18px", lineHeight: "1.4", color: "#B4AFB8", marginTop: "16px"}}>
          Film-only. One take or nothing. I answer every DM by Sunday.
        </div>
        <div style={{display: "flex", gap: "0", marginTop: "18px", borderTop: "1px solid rgba(255,255,255,.09)", borderBottom: "1px solid rgba(255,255,255,.09)"}}>
          <div style={{flex: "1", padding: "14px 0"}}>
            <div style={{font: "700 18px/1 'Space Grotesk'"}}>
              214
            </div>
            <div style={{font: "400 9.5px/1 'Space Mono',monospace", letterSpacing: "1.2px", textTransform: "uppercase", color: "#6E6A72", marginTop: "6px"}}>
              clips
            </div>
          </div>
          <div style={{flex: "1", padding: "14px 0", borderLeft: "1px solid rgba(255,255,255,.09)"}}>
            <div style={{font: "700 18px/1 'Space Grotesk'", color: "#FF2BD1"}}>
              8.9k
            </div>
            <div style={{font: "400 9.5px/1 'Space Mono',monospace", letterSpacing: "1.2px", textTransform: "uppercase", color: "#6E6A72", marginTop: "6px"}}>
              subs
            </div>
          </div>
          <div style={{flex: "1", padding: "14px 0", borderLeft: "1px solid rgba(255,255,255,.09)"}}>
            <div style={{font: "700 18px/1 'Space Grotesk'"}}>
              4.9
            </div>
            <div style={{font: "400 9.5px/1 'Space Mono',monospace", letterSpacing: "1.2px", textTransform: "uppercase", color: "#6E6A72", marginTop: "6px"}}>
              rating
            </div>
          </div>
        </div>
        <div style={{marginTop: "16px", border: "1.5px solid #FF2BD1", background: "rgba(255,43,209,.07)", padding: "16px", display: "flex", alignItems: "center", gap: "14px"}}>
          <div style={{flex: "1"}}>
            <div style={{font: "700 9.5px/1 'Space Grotesk'", letterSpacing: "2px", textTransform: "uppercase", color: "#FF2BD1"}}>
              Monthly pass
            </div>
            <div style={{font: "700 15px/1.2 'Space Grotesk'", marginTop: "8px"}}>
              Everything, $14.99
            </div>
            <div style={{font: "400 10.5px/1.4 'Space Mono',monospace", color: "#8E8A93", marginTop: "5px"}}>
              cancel any time, keeps working till the 1st
            </div>
          </div>
          <span style={{background: "#FF2BD1", color: "#08080A", font: "700 11px/1 'Space Grotesk'", letterSpacing: "1.6px", textTransform: "uppercase", padding: "14px 15px", flex: "none", cursor: "pointer"}} onClick={() => nav('/wallet')}>
            Join
          </span>
        </div>
        <div style={{display: "flex", gap: "20px", margin: "24px 0 14px", borderBottom: "1px solid rgba(255,255,255,.09)"}}>
          <span style={{font: "700 11px/1 'Space Grotesk'", letterSpacing: "1.8px", textTransform: "uppercase", color: "#C8FF3D", paddingBottom: "11px", borderBottom: "2px solid #C8FF3D"}}>
            Clips
          </span>
          <span style={{font: "700 11px/1 'Space Grotesk'", letterSpacing: "1.8px", textTransform: "uppercase", color: "#6E6A72", paddingBottom: "11px"}}>
            Bundles
          </span>
          <span style={{font: "700 11px/1 'Space Grotesk'", letterSpacing: "1.8px", textTransform: "uppercase", color: "#6E6A72", paddingBottom: "11px"}}>
            Free
          </span>
        </div>
        <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px"}}>
          <div style={{aspectRatio: "3/4", background: "repeating-linear-gradient(130deg,#191920 0 8px,#111116 8px 16px)", position: "relative", display: "flex", alignItems: "flex-end", padding: "9px", boxSizing: "border-box"}}>
            <span style={{font: "700 9.5px/1 'Space Grotesk'", letterSpacing: "1.2px", textTransform: "uppercase", color: "#08080A", background: "#C8FF3D", padding: "5px 6px", cursor: "pointer"}} onClick={() => nav('/clip')}>
              240 · 12:04
            </span>
          </div>
          <div style={{aspectRatio: "3/4", background: "repeating-linear-gradient(130deg,#191920 0 8px,#111116 8px 16px)", position: "relative", display: "flex", alignItems: "flex-end", padding: "9px", boxSizing: "border-box"}}>
            <span style={{font: "700 9.5px/1 'Space Grotesk'", letterSpacing: "1.2px", textTransform: "uppercase", color: "#08080A", background: "#fff", padding: "5px 6px"}}>
              owned
            </span>
          </div>
          <div style={{aspectRatio: "3/4", background: "repeating-linear-gradient(130deg,#191920 0 8px,#111116 8px 16px)", position: "relative", display: "flex", alignItems: "flex-end", padding: "9px", boxSizing: "border-box"}}>
            <span style={{font: "700 9.5px/1 'Space Grotesk'", letterSpacing: "1.2px", textTransform: "uppercase", color: "#08080A", background: "#C8FF3D", padding: "5px 6px", cursor: "pointer"}} onClick={() => nav('/clip')}>
              180 · 6:20
            </span>
          </div>
          <div style={{aspectRatio: "3/4", background: "repeating-linear-gradient(130deg,#191920 0 8px,#111116 8px 16px)", position: "relative", display: "flex", alignItems: "flex-end", padding: "9px", boxSizing: "border-box"}}>
            <span style={{font: "700 9.5px/1 'Space Grotesk'", letterSpacing: "1.2px", textTransform: "uppercase", color: "#08080A", background: "#00E5FF", padding: "5px 6px"}}>
              subs only
            </span>
          </div>
        </div>
        <div onClick={() => nav('/creadoras')} style={{display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginTop: "22px", padding: "17px 16px", border: "1px dashed rgba(200,255,61,.4)", background: "rgba(200,255,61,.05)", cursor: "pointer"}}>
          <span style={{font: "700 11px/1.4 'Space Grotesk'", letterSpacing: "1.4px", textTransform: "uppercase", color: "#C8FF3D"}}>
            ¿Quieres publicar lo tuyo?
          </span>
          <span style={{font: "700 15px/1 'Space Grotesk'", color: "#C8FF3D"}}>
            &#8594;
          </span>
        </div>
      </div>
    </div>
  )
}
