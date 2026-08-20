// Pantalla 06 — Earnings
// Generada desde el deck de Claude Design. El markup se conserva tal cual;
// solo se anadio el cableado de navegacion.
import { useNavigate } from 'react-router-dom'

export default function Earnings() {
  const nav = useNavigate()
  return (
    <div style={{minHeight: "100%", boxSizing: "border-box", padding: "62px 20px 40px", background: "#08080A", color: "#F2F0F3", fontFamily: "'Space Grotesk',sans-serif"}}>
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
        <span style={{fontFamily: "Anton,sans-serif", fontSize: "26px", lineHeight: "1", textTransform: "uppercase"}}>
          Money
        </span>
        <span style={{font: "400 10.5px/1 'Space Mono',monospace", color: "#6E6A72", border: "1px solid rgba(255,255,255,.14)", padding: "7px 9px"}}>
          August ▾
        </span>
      </div>
      <div style={{marginTop: "22px"}}>
        <div style={{font: "700 9.5px/1 'Space Grotesk'", letterSpacing: "2.2px", textTransform: "uppercase", color: "#6E6A72"}}>
          Earned this month
        </div>
        <div style={{display: "flex", alignItems: "baseline", gap: "10px", marginTop: "12px"}}>
          <span style={{fontFamily: "Anton,sans-serif", fontSize: "62px", lineHeight: ".86", color: "#C8FF3D", textShadow: "0 0 34px rgba(200,255,61,.34)"}}>
            $4,182
          </span>
          <span style={{fontFamily: "Anton,sans-serif", fontSize: "26px", lineHeight: "1", color: "#5E5A63"}}>
            .60
          </span>
        </div>
        <div style={{font: "400 11px/1.4 'Space Mono',monospace", color: "#8E8A93", marginTop: "10px"}}>
          +31% vs July · best month yet
        </div>
      </div>
      <div style={{display: "flex", alignItems: "flex-end", gap: "5px", height: "104px", marginTop: "26px"}}>
        <span style={{flex: "1", height: "34%", background: "#26262C"}} />
        <span style={{flex: "1", height: "52%", background: "#26262C"}} />
        <span style={{flex: "1", height: "41%", background: "#26262C"}} />
        <span style={{flex: "1", height: "66%", background: "#26262C"}} />
        <span style={{flex: "1", height: "58%", background: "#26262C"}} />
        <span style={{flex: "1", height: "79%", background: "#FF2BD1", boxShadow: "0 0 18px rgba(255,43,209,.5)"}} />
        <span style={{flex: "1", height: "100%", background: "#C8FF3D", boxShadow: "0 0 18px rgba(200,255,61,.45)"}} />
      </div>
      <div style={{display: "flex", justifyContent: "space-between", font: "400 9.5px/1 'Space Mono',monospace", color: "#55515B", marginTop: "9px"}}>
        <span>
          feb
        </span>
        <span>
          aug
        </span>
      </div>
      <div style={{font: "700 9.5px/1 'Space Grotesk'", letterSpacing: "2.2px", textTransform: "uppercase", color: "#6E6A72", margin: "28px 0 12px"}}>
        Where it came from
      </div>
      <div style={{display: "flex", flexDirection: "column", gap: "14px"}}>
        <div>
          <div style={{display: "flex", justifyContent: "space-between", font: "500 12.5px/1 'Space Grotesk'", marginBottom: "8px"}}>
            <span>
              Clip unlocks
            </span>
            <span style={{fontFamily: "'Space Mono',monospace", fontSize: "12px"}}>
              $2,104
            </span>
          </div>
          <div style={{height: "5px", background: "#1A1A20"}}>
            <span style={{display: "block", height: "5px", width: "50%", background: "#C8FF3D"}} />
          </div>
        </div>
        <div>
          <div style={{display: "flex", justifyContent: "space-between", font: "500 12.5px/1 'Space Grotesk'", marginBottom: "8px"}}>
            <span>
              Subscriptions
            </span>
            <span style={{fontFamily: "'Space Mono',monospace", fontSize: "12px"}}>
              $1,340
            </span>
          </div>
          <div style={{height: "5px", background: "#1A1A20"}}>
            <span style={{display: "block", height: "5px", width: "32%", background: "#FF2BD1"}} />
          </div>
        </div>
        <div>
          <div style={{display: "flex", justifyContent: "space-between", font: "500 12.5px/1 'Space Grotesk'", marginBottom: "8px"}}>
            <span>
              Tips in DMs
            </span>
            <span style={{fontFamily: "'Space Mono',monospace", fontSize: "12px"}}>
              $478
            </span>
          </div>
          <div style={{height: "5px", background: "#1A1A20"}}>
            <span style={{display: "block", height: "5px", width: "12%", background: "#00E5FF"}} />
          </div>
        </div>
        <div>
          <div style={{display: "flex", justifyContent: "space-between", font: "500 12.5px/1 'Space Grotesk'", marginBottom: "8px"}}>
            <span>
              Bundles
            </span>
            <span style={{fontFamily: "'Space Mono',monospace", fontSize: "12px"}}>
              $260
            </span>
          </div>
          <div style={{height: "5px", background: "#1A1A20"}}>
            <span style={{display: "block", height: "5px", width: "6%", background: "#fff"}} />
          </div>
        </div>
      </div>
      <div style={{marginTop: "26px", border: "1px solid rgba(255,255,255,.09)", background: "#101014", padding: "18px", display: "flex", alignItems: "center", gap: "14px"}}>
        <div style={{flex: "1"}}>
          <div style={{font: "700 9.5px/1 'Space Grotesk'", letterSpacing: "2px", textTransform: "uppercase", color: "#6E6A72"}}>
            Next payout
          </div>
          <div style={{font: "700 17px/1.2 'Space Grotesk'", marginTop: "8px"}}>
            $3,610.40
            <span style={{font: "400 11px 'Space Mono',monospace", color: "#8E8A93"}}>
              on Aug 25
            </span>
          </div>
          <div style={{font: "400 10.5px/1.4 'Space Mono',monospace", color: "#5E5A63", marginTop: "6px"}}>
            held 7 days for chargebacks
          </div>
        </div>
        <span style={{border: "1px solid #C8FF3D", color: "#C8FF3D", font: "700 10.5px/1 'Space Grotesk'", letterSpacing: "1.4px", textTransform: "uppercase", padding: "13px 12px", flex: "none", cursor: "pointer"}} onClick={() => nav('/earnings')}>
          Cash out
        </span>
      </div>
      <div style={{marginTop: "14px", display: "flex", alignItems: "center", gap: "12px", border: "1px dashed rgba(255,255,255,.16)", padding: "14px"}}>
        <span style={{width: "44px", height: "56px", background: "repeating-linear-gradient(130deg,#191920 0 7px,#111116 7px 14px)", flex: "none"}} />
        <div style={{flex: "1"}}>
          <div style={{font: "500 12.5px/1.3 'Space Grotesk'"}}>
            Neon Hours vol. 2
          </div>
          <div style={{font: "400 10.5px/1 'Space Mono',monospace", color: "#8E8A93", marginTop: "6px"}}>
            412 unlocks · your top seller
          </div>
        </div>
        <span style={{font: "700 13px/1 'Space Grotesk'", color: "#C8FF3D"}}>
          $3.2k
        </span>
      </div>
    </div>
  )
}
