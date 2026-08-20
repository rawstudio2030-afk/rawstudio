// Pantalla 07 — Library
// Generada desde el deck de Claude Design. El markup se conserva tal cual;
// solo se anadio el cableado de navegacion.
import { useNavigate } from 'react-router-dom'

export default function Library() {
  const nav = useNavigate()
  return (
    <div style={{minHeight: "100%", boxSizing: "border-box", padding: "62px 0 40px", background: "#08080A", color: "#F2F0F3", fontFamily: "'Space Grotesk',sans-serif"}}>
      <div style={{padding: "0 20px"}}>
        <div style={{fontFamily: "Anton,sans-serif", fontSize: "26px", lineHeight: "1", textTransform: "uppercase"}}>
          Yours
          <span style={{fontFamily: "'Instrument Serif',serif", fontStyle: "italic", textTransform: "none", color: "#8E8A93"}}>
            forever
          </span>
        </div>
        <div style={{display: "flex", gap: "7px", marginTop: "16px", flexWrap: "wrap"}}>
          <span style={{font: "700 10px/1 'Space Grotesk'", letterSpacing: "1.4px", textTransform: "uppercase", background: "#fff", color: "#08080A", padding: "8px 11px"}}>
            All 38
          </span>
          <span style={{font: "700 10px/1 'Space Grotesk'", letterSpacing: "1.4px", textTransform: "uppercase", color: "#9C979F", border: "1px solid rgba(255,255,255,.14)", padding: "8px 11px"}}>
            Unlocked
          </span>
          <span style={{font: "700 10px/1 'Space Grotesk'", letterSpacing: "1.4px", textTransform: "uppercase", color: "#9C979F", border: "1px solid rgba(255,255,255,.14)", padding: "8px 11px"}}>
            Subscribed
          </span>
          <span style={{font: "700 10px/1 'Space Grotesk'", letterSpacing: "1.4px", textTransform: "uppercase", color: "#9C979F", border: "1px solid rgba(255,255,255,.14)", padding: "8px 11px"}}>
            Saved
          </span>
        </div>
      </div>
      <div style={{marginTop: "22px", borderTop: "1px solid rgba(255,255,255,.08)"}}>
        <div style={{display: "flex", gap: "13px", padding: "15px 20px", borderBottom: "1px solid rgba(255,255,255,.08)", alignItems: "center"}}>
          <span style={{width: "70px", height: "92px", background: "repeating-linear-gradient(130deg,#191920 0 8px,#111116 8px 16px)", flex: "none", display: "flex", alignItems: "flex-end", justifyContent: "flex-end", padding: "6px", boxSizing: "border-box"}}>
            <span style={{font: "400 9px/1 'Space Mono',monospace", color: "#8E8A93", background: "rgba(8,8,10,.8)", padding: "3px 4px"}}>
              12:04
            </span>
          </span>
          <div style={{flex: "1"}}>
            <div style={{font: "700 13.5px/1.25 'Space Grotesk'", cursor: "pointer"}} onClick={() => nav('/clip')}>
              Neon Hours vol. 3
            </div>
            <div style={{font: "400 10.5px/1 'Space Mono',monospace", color: "#7E7A83", marginTop: "7px"}}>
              @miravanta
            </div>
            <div style={{display: "flex", gap: "6px", marginTop: "10px"}}>
              <span style={{font: "700 9px/1 'Space Grotesk'", letterSpacing: "1.2px", textTransform: "uppercase", color: "#08080A", background: "#C8FF3D", padding: "5px 6px"}}>
                unlocked
              </span>
              <span style={{font: "400 9.5px/1 'Space Mono',monospace", color: "#5E5A63", padding: "5px 0"}}>
                aug 12 · 240 coins
              </span>
            </div>
          </div>
          <span style={{font: "700 20px/1 'Space Grotesk'", color: "#C8FF3D", flex: "none"}}>
            ▸
          </span>
        </div>
        <div style={{display: "flex", gap: "13px", padding: "15px 20px", borderBottom: "1px solid rgba(255,255,255,.08)", alignItems: "center", background: "rgba(0,229,255,.04)"}}>
          <span style={{width: "70px", height: "92px", background: "repeating-linear-gradient(130deg,#191920 0 8px,#111116 8px 16px)", flex: "none"}} />
          <div style={{flex: "1"}}>
            <div style={{font: "700 13.5px/1.25 'Space Grotesk'", cursor: "pointer"}} onClick={() => nav('/clip')}>
              Rooftop, 6am
            </div>
            <div style={{font: "400 10.5px/1 'Space Mono',monospace", color: "#7E7A83", marginTop: "7px"}}>
              @lowbeam
            </div>
            <div style={{display: "flex", gap: "6px", marginTop: "10px"}}>
              <span style={{font: "700 9px/1 'Space Grotesk'", letterSpacing: "1.2px", textTransform: "uppercase", color: "#08080A", background: "#00E5FF", padding: "5px 6px"}}>
                rented
              </span>
              <span style={{font: "400 9.5px/1 'Space Mono',monospace", color: "#00E5FF", padding: "5px 0"}}>
                expires in 3 days
              </span>
            </div>
          </div>
          <span style={{font: "700 20px/1 'Space Grotesk'", color: "#00E5FF", flex: "none"}}>
            ▸
          </span>
        </div>
        <div style={{display: "flex", gap: "13px", padding: "15px 20px", borderBottom: "1px solid rgba(255,255,255,.08)", alignItems: "center"}}>
          <span style={{width: "70px", height: "92px", background: "repeating-linear-gradient(130deg,#191920 0 8px,#111116 8px 16px)", flex: "none"}} />
          <div style={{flex: "1"}}>
            <div style={{font: "700 13.5px/1.25 'Space Grotesk'", cursor: "pointer"}} onClick={() => nav('/clip')}>
              The Long Drive
            </div>
            <div style={{font: "400 10.5px/1 'Space Mono',monospace", color: "#7E7A83", marginTop: "7px"}}>
              @saintcassette
            </div>
            <div style={{display: "flex", gap: "6px", marginTop: "10px"}}>
              <span style={{font: "700 9px/1 'Space Grotesk'", letterSpacing: "1.2px", textTransform: "uppercase", color: "#08080A", background: "#FF2BD1", padding: "5px 6px"}}>
                via pass
              </span>
              <span style={{font: "400 9.5px/1 'Space Mono',monospace", color: "#5E5A63", padding: "5px 0"}}>
                watched 2 of 4
              </span>
            </div>
          </div>
          <span style={{font: "700 20px/1 'Space Grotesk'", color: "#FF2BD1", flex: "none"}}>
            ▸
          </span>
        </div>
        <div style={{display: "flex", gap: "13px", padding: "15px 20px", borderBottom: "1px solid rgba(255,255,255,.08)", alignItems: "center", opacity: ".55"}}>
          <span style={{width: "70px", height: "92px", background: "repeating-linear-gradient(130deg,#191920 0 8px,#111116 8px 16px)", flex: "none"}} />
          <div style={{flex: "1"}}>
            <div style={{font: "700 13.5px/1.25 'Space Grotesk'"}}>
              Static / Bloom
            </div>
            <div style={{font: "400 10.5px/1 'Space Mono',monospace", color: "#7E7A83", marginTop: "7px"}}>
              @nulldoll
            </div>
            <div style={{display: "flex", gap: "6px", marginTop: "10px"}}>
              <span style={{font: "700 9px/1 'Space Grotesk'", letterSpacing: "1.2px", textTransform: "uppercase", color: "#9C979F", border: "1px solid rgba(255,255,255,.2)", padding: "5px 6px"}}>
                saved
              </span>
              <span style={{font: "400 9.5px/1 'Space Mono',monospace", color: "#5E5A63", padding: "5px 0"}}>
                180 coins to unlock
              </span>
            </div>
          </div>
        </div>
      </div>
      <div style={{position: "sticky", bottom: "0", marginTop: "18px", background: "rgba(8,8,10,.94)", borderTop: "1px solid rgba(255,255,255,.1)", display: "flex", padding: "14px 20px 20px"}}>
        <span style={{flex: "1", textAlign: "center", font: "700 9.5px/1 'Space Grotesk'", letterSpacing: "1.4px", textTransform: "uppercase", color: "#6E6A72"}}>
          Browse
        </span>
        <span style={{flex: "1", textAlign: "center", font: "700 9.5px/1 'Space Grotesk'", letterSpacing: "1.4px", textTransform: "uppercase", color: "#C8FF3D"}}>
          Library
        </span>
        <span style={{flex: "1", textAlign: "center", font: "700 9.5px/1 'Space Grotesk'", letterSpacing: "1.4px", textTransform: "uppercase", color: "#6E6A72"}}>
          Inbox
        </span>
        <span style={{flex: "1", textAlign: "center", font: "700 9.5px/1 'Space Grotesk'", letterSpacing: "1.4px", textTransform: "uppercase", color: "#6E6A72"}}>
          You
        </span>
      </div>
    </div>
  )
}
