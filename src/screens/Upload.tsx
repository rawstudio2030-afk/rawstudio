// Pantalla 05 — Upload
// Generada desde el deck de Claude Design. El markup se conserva tal cual;
// solo se anadio el cableado de navegacion.
import { useNavigate } from 'react-router-dom'

export default function Upload() {
  const nav = useNavigate()
  return (
    <div style={{minHeight: "100%", boxSizing: "border-box", padding: "62px 20px 40px", background: "#08080A", color: "#F2F0F3", fontFamily: "'Space Grotesk',sans-serif"}}>
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "baseline"}}>
        <span style={{fontFamily: "Anton,sans-serif", fontSize: "26px", lineHeight: "1", textTransform: "uppercase"}}>
          New drop
        </span>
        <span style={{font: "400 10.5px/1 'Space Mono',monospace", color: "#6E6A72"}}>
          step 2 of 3
        </span>
      </div>
      <div style={{display: "flex", gap: "5px", marginTop: "14px"}}>
        <span style={{flex: "1", height: "3px", background: "#C8FF3D"}} />
        <span style={{flex: "1", height: "3px", background: "#C8FF3D"}} />
        <span style={{flex: "1", height: "3px", background: "#26262C"}} />
      </div>
      <div style={{display: "flex", gap: "12px", marginTop: "24px", alignItems: "center"}}>
        <div style={{width: "92px", height: "122px", background: "repeating-linear-gradient(130deg,#191920 0 8px,#111116 8px 16px)", flex: "none", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: "8px"}}>
          <span style={{font: "400 9px/1 'Space Mono',monospace", color: "#55515B"}}>
            3:41
          </span>
        </div>
        <div>
          <div style={{font: "700 14px/1.3 'Space Grotesk'"}}>
            hotel_bar_take04.mov
          </div>
          <div style={{font: "400 10.5px/1.6 'Space Mono',monospace", color: "#8E8A93", marginTop: "7px"}}>
            2.1 GB · 4K · uploaded
          </div>
          <span style={{display: "inline-block", marginTop: "9px", font: "700 9.5px/1 'Space Grotesk'", letterSpacing: "1.4px", textTransform: "uppercase", color: "#C8FF3D", border: "1px solid rgba(200,255,61,.4)", padding: "6px 8px"}}>
            Change cover
          </span>
        </div>
      </div>
      <div style={{font: "700 9.5px/1 'Space Grotesk'", letterSpacing: "2.2px", textTransform: "uppercase", color: "#6E6A72", margin: "26px 0 10px"}}>
        Title
      </div>
      <div style={{borderBottom: "1px solid rgba(255,255,255,.16)", paddingBottom: "11px", font: "500 16px/1 'Space Grotesk'"}}>
        Neon Hours vol. 3
        <span style={{color: "#FF2BD1", animation: "agPulse 1.1s infinite"}}>
          |
        </span>
      </div>
      <div style={{font: "700 9.5px/1 'Space Grotesk'", letterSpacing: "2.2px", textTransform: "uppercase", color: "#6E6A72", margin: "24px 0 10px"}}>
        How it sells
      </div>
      <div style={{display: "flex", border: "1px solid rgba(255,255,255,.12)"}}>
        <span style={{flex: "1", textAlign: "center", padding: "13px 0", font: "700 10.5px/1 'Space Grotesk'", letterSpacing: "1.4px", textTransform: "uppercase", background: "#C8FF3D", color: "#08080A"}}>
          Pay per clip
        </span>
        <span style={{flex: "1", textAlign: "center", padding: "13px 0", font: "700 10.5px/1 'Space Grotesk'", letterSpacing: "1.4px", textTransform: "uppercase", color: "#8E8A93"}}>
          Subs only
        </span>
        <span style={{flex: "1", textAlign: "center", padding: "13px 0", font: "700 10.5px/1 'Space Grotesk'", letterSpacing: "1.4px", textTransform: "uppercase", color: "#8E8A93"}}>
          Free teaser
        </span>
      </div>
      <div style={{marginTop: "16px", border: "1px solid rgba(255,255,255,.09)", background: "#101014", padding: "18px"}}>
        <div style={{display: "flex", alignItems: "center", justifyContent: "space-between"}}>
          <span style={{font: "700 9.5px/1 'Space Grotesk'", letterSpacing: "2px", textTransform: "uppercase", color: "#6E6A72"}}>
            Price
          </span>
          <div style={{display: "flex", alignItems: "center", gap: "16px"}}>
            <span style={{width: "34px", height: "34px", border: "1px solid rgba(255,255,255,.18)", display: "flex", alignItems: "center", justifyContent: "center", font: "700 17px/1 'Space Grotesk'", color: "#9C979F"}}>
              −
            </span>
            <span style={{fontFamily: "Anton,sans-serif", fontSize: "32px", lineHeight: "1", color: "#C8FF3D", minWidth: "62px", textAlign: "center"}}>
              240
            </span>
            <span style={{width: "34px", height: "34px", border: "1px solid #C8FF3D", display: "flex", alignItems: "center", justifyContent: "center", font: "700 17px/1 'Space Grotesk'", color: "#C8FF3D"}}>
              +
            </span>
          </div>
        </div>
        <div style={{height: "1px", background: "rgba(255,255,255,.09)", margin: "16px 0"}} />
        <div style={{display: "flex", justifyContent: "space-between", font: "400 11.5px/1.6 'Space Mono',monospace", color: "#8E8A93"}}>
          <span>
            buyer pays
          </span>
          <span style={{color: "#F2F0F3"}}>
            $9.99
          </span>
        </div>
        <div style={{display: "flex", justifyContent: "space-between", font: "400 11.5px/1.6 'Space Mono',monospace", color: "#8E8A93"}}>
          <span>
            platform 20%
          </span>
          <span>
            −$2.00
          </span>
        </div>
        <div style={{display: "flex", justifyContent: "space-between", font: "700 13px/1.6 'Space Grotesk'", marginTop: "6px"}}>
          <span>
            you keep
          </span>
          <span style={{color: "#FF2BD1"}}>
            $7.99
          </span>
        </div>
      </div>
      <div style={{font: "700 9.5px/1 'Space Grotesk'", letterSpacing: "2.2px", textTransform: "uppercase", color: "#6E6A72", margin: "24px 0 10px"}}>
        Protection
      </div>
      <div style={{display: "flex", flexDirection: "column", gap: "1px", border: "1px solid rgba(255,255,255,.09)"}}>
        <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px", background: "#101014"}}>
          <span style={{font: "500 12.5px/1.3 'Space Grotesk'"}}>
            Watermark with buyer ID
          </span>
          <span style={{width: "42px", height: "24px", borderRadius: "12px", background: "#C8FF3D", position: "relative", flex: "none"}}>
            <span style={{position: "absolute", top: "3px", right: "3px", width: "18px", height: "18px", borderRadius: "50%", background: "#08080A"}} />
          </span>
        </div>
        <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px", background: "#101014"}}>
          <span style={{font: "500 12.5px/1.3 'Space Grotesk'"}}>
            Hide from public search
          </span>
          <span style={{width: "42px", height: "24px", borderRadius: "12px", background: "#26262C", position: "relative", flex: "none"}}>
            <span style={{position: "absolute", top: "3px", left: "3px", width: "18px", height: "18px", borderRadius: "50%", background: "#6E6A72"}} />
          </span>
        </div>
        <div style={{display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px", background: "#101014"}}>
          <span style={{font: "500 12.5px/1.3 'Space Grotesk'"}}>
            Block 3 countries
          </span>
          <span style={{font: "400 11px/1 'Space Mono',monospace", color: "#00E5FF"}}>
            edit
          </span>
        </div>
      </div>
      <div style={{marginTop: "22px", background: "#fff", color: "#08080A", textAlign: "center", padding: "19px", font: "700 13px/1 'Space Grotesk'", letterSpacing: "2.2px", textTransform: "uppercase", cursor: "pointer"}} onClick={() => nav('/earnings')}>
        Review & publish
      </div>
    </div>
  )
}
