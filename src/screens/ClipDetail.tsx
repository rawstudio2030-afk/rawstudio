// Pantalla 02 — Clip + paywall
// Generada desde el deck de Claude Design. El markup se conserva tal cual;
// solo se anadio el cableado de navegacion.
import { useNavigate } from 'react-router-dom'

export default function ClipDetail() {
  const nav = useNavigate()
  return (
    <div style={{minHeight: "100%", boxSizing: "border-box", background: "#08080A", color: "#F2F0F3", fontFamily: "'Space Grotesk',sans-serif", paddingBottom: "40px"}}>
      <div style={{position: "relative", height: "300px", background: "repeating-linear-gradient(122deg,#17171C 0 9px,#0F0F13 9px 18px)", display: "flex", alignItems: "center", justifyContent: "center", filter: "blur(9px) saturate(.7)"}}>
        <span style={{font: "400 10.5px/1 'Space Mono',monospace", letterSpacing: "1.6px", color: "#55515B", textTransform: "uppercase"}}>
          [ preview frame — 9:16 still ]
        </span>
      </div>
      <div style={{height: "300px", marginTop: "-300px", position: "relative", background: "linear-gradient(180deg,rgba(8,8,10,.35) 0%,rgba(8,8,10,.1) 45%,#08080A 100%)", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "60px 20px 18px", boxSizing: "border-box"}}>
        <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
          <span style={{width: "34px", height: "34px", border: "1px solid rgba(255,255,255,.2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", font: "700 15px/1 'Space Grotesk'", color: "#fff", cursor: "pointer"}} onClick={() => nav('/library')}>
            ‹
          </span>
          <span style={{background: "rgba(8,8,10,.72)", border: "1px solid rgba(200,255,61,.5)", color: "#C8FF3D", font: "700 9.5px/1 'Space Grotesk'", letterSpacing: "1.6px", textTransform: "uppercase", padding: "7px 10px"}}>
            Locked · 12:04
          </span>
        </div>
        <div style={{display: "flex", alignItems: "center", gap: "11px"}}>
          <span style={{width: "46px", height: "46px", borderRadius: "50%", background: "repeating-linear-gradient(45deg,#2A2A31 0 6px,#1B1B21 6px 12px)", border: "1.5px solid #FF2BD1", flex: "none"}} />
          <div>
            <div style={{font: "700 14px/1.2 'Space Grotesk'", letterSpacing: ".2px"}}>
              MIRA VANTA
              <span style={{color: "#00E5FF"}}>
                ✦
              </span>
            </div>
            <div style={{font: "400 11px/1.3 'Space Mono',monospace", color: "#7E7A83", cursor: "pointer"}} onClick={() => nav('/creator')}>
              @miravanta · 214 clips
            </div>
          </div>
          <span style={{marginLeft: "auto", border: "1px solid #FF2BD1", color: "#FF2BD1", font: "700 10px/1 'Space Grotesk'", letterSpacing: "1.6px", textTransform: "uppercase", padding: "9px 12px", cursor: "pointer"}} onClick={() => nav('/creator')}>
            Follow
          </span>
        </div>
      </div>
      <div style={{padding: "20px 20px 0"}}>
        <div style={{fontFamily: "Anton,sans-serif", fontSize: "33px", lineHeight: ".94", letterSpacing: "-.2px", textTransform: "uppercase"}}>
          Neon Hours
          <span style={{fontFamily: "'Instrument Serif',serif", fontStyle: "italic", textTransform: "none", letterSpacing: "0", color: "#C8FF3D"}}>
            vol. 3
          </span>
        </div>
        <div style={{font: "400 13px/1.55 'Space Grotesk'", color: "#9C979F", marginTop: "10px"}}>
          Shot on one roll of tungsten film in a rented hotel bar at 4am. Twelve minutes, no cuts, sound on.
        </div>
        <div style={{display: "flex", gap: "7px", flexWrap: "wrap", marginTop: "14px"}}>
          <span style={{font: "400 10px/1 'Space Mono',monospace", letterSpacing: "1.2px", textTransform: "uppercase", color: "#9C979F", border: "1px solid rgba(255,255,255,.13)", padding: "7px 9px"}}>
            #slow
          </span>
          <span style={{font: "400 10px/1 'Space Mono',monospace", letterSpacing: "1.2px", textTransform: "uppercase", color: "#9C979F", border: "1px solid rgba(255,255,255,.13)", padding: "7px 9px"}}>
            #film
          </span>
          <span style={{font: "400 10px/1 'Space Mono',monospace", letterSpacing: "1.2px", textTransform: "uppercase", color: "#9C979F", border: "1px solid rgba(255,255,255,.13)", padding: "7px 9px"}}>
            #one-take
          </span>
          <span style={{font: "400 10px/1 'Space Mono',monospace", letterSpacing: "1.2px", textTransform: "uppercase", color: "#08080A", background: "#00E5FF", padding: "7px 9px"}}>
            4k · hdr
          </span>
        </div>
        <div style={{marginTop: "20px", border: "1px solid rgba(255,255,255,.09)", background: "#101014"}}>
          <div style={{padding: "16px 16px 14px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", borderBottom: "1px dashed rgba(255,255,255,.12)"}}>
            <div>
              <div style={{font: "700 9.5px/1 'Space Grotesk'", letterSpacing: "2.2px", textTransform: "uppercase", color: "#6E6A72", marginBottom: "8px"}}>
                Unlock forever
              </div>
              <div style={{fontFamily: "Anton,sans-serif", fontSize: "30px", lineHeight: "1", color: "#C8FF3D"}}>
                240 coins
              </div>
            </div>
            <div style={{font: "400 10.5px/1.5 'Space Mono',monospace", color: "#6E6A72", textAlign: "right"}}>
              yours to rewatch
              <br />
              on any device
            </div>
          </div>
          <div style={{padding: "14px 16px"}}>
            <div style={{background: "#C8FF3D", color: "#08080A", textAlign: "center", padding: "17px", font: "700 13px/1 'Space Grotesk'", letterSpacing: "2.2px", textTransform: "uppercase", boxShadow: "0 0 30px rgba(200,255,61,.3)", cursor: "pointer"}} onClick={() => nav('/wallet')}>
              Unlock this clip
            </div>
          </div>
        </div>
        <div style={{marginTop: "12px", display: "flex", gap: "10px"}}>
          <div style={{flex: "1", border: "1px solid rgba(255,43,209,.34)", background: "rgba(255,43,209,.07)", padding: "14px"}}>
            <div style={{font: "700 9.5px/1 'Space Grotesk'", letterSpacing: "1.8px", textTransform: "uppercase", color: "#FF2BD1", marginBottom: "7px", cursor: "pointer"}} onClick={() => nav('/wallet')}>
              Subscribe
            </div>
            <div style={{font: "700 17px/1.1 'Space Grotesk'"}}>
              $14.99
              <span style={{font: "400 11px 'Space Mono',monospace", color: "#9C979F"}}>
                /mo
              </span>
            </div>
            <div style={{font: "400 10.5px/1.45 'Space Mono',monospace", color: "#8E8A93", marginTop: "6px"}}>
              all 214 clips + DMs
            </div>
          </div>
          <div style={{flex: "1", border: "1px solid rgba(255,255,255,.1)", padding: "14px", position: "relative"}}>
            <span style={{position: "absolute", top: "-9px", right: "8px", transform: "rotate(4deg)", background: "#fff", color: "#08080A", font: "700 8.5px/1 'Space Grotesk'", letterSpacing: "1.2px", textTransform: "uppercase", padding: "5px 7px"}}>
              save 40%
            </span>
            <div style={{font: "700 9.5px/1 'Space Grotesk'", letterSpacing: "1.8px", textTransform: "uppercase", color: "#6E6A72", marginBottom: "7px", cursor: "pointer"}} onClick={() => nav('/wallet')}>
              Bundle
            </div>
            <div style={{font: "700 17px/1.1 'Space Grotesk'"}}>
              Vol. 1–3
            </div>
            <div style={{font: "400 10.5px/1.45 'Space Mono',monospace", color: "#8E8A93", marginTop: "6px"}}>
              480 coins · $17.99
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
