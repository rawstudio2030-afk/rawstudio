// Pantalla 03 — Wallet
// Generada desde el deck de Claude Design. El markup se conserva tal cual;
// solo se anadio el cableado de navegacion.
import { useNavigate } from 'react-router-dom'

export default function Wallet() {
  const nav = useNavigate()
  return (
    <div style={{minHeight: "100%", boxSizing: "border-box", padding: "62px 20px 40px", background: "#08080A", color: "#F2F0F3", fontFamily: "'Space Grotesk',sans-serif"}}>
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "26px"}}>
        <span style={{font: "700 13px/1 'Space Grotesk'", letterSpacing: "2px", textTransform: "uppercase"}}>
          Wallet
        </span>
        <span style={{font: "700 20px/1 'Space Grotesk'", color: "#6E6A72", cursor: "pointer"}} onClick={() => nav('/clip')}>
          ×
        </span>
      </div>
      <div style={{border: "1px solid rgba(255,255,255,.09)", background: "linear-gradient(160deg,#141419 0%,#0C0C10 100%)", padding: "22px", position: "relative", overflow: "hidden"}}>
        <div style={{position: "absolute", right: "-40px", top: "-40px", width: "150px", height: "150px", borderRadius: "50%", background: "radial-gradient(circle,rgba(255,43,209,.28) 0%,transparent 70%)"}} />
        <div style={{font: "700 9.5px/1 'Space Grotesk'", letterSpacing: "2.2px", textTransform: "uppercase", color: "#6E6A72"}}>
          Balance
        </div>
        <div style={{display: "flex", alignItems: "baseline", gap: "9px", marginTop: "10px"}}>
          <span style={{fontFamily: "Anton,sans-serif", fontSize: "52px", lineHeight: ".9", color: "#fff", textShadow: "0 0 22px rgba(255,43,209,.6)"}}>
            180
          </span>
          <span style={{font: "700 12px/1 'Space Grotesk'", letterSpacing: "2px", textTransform: "uppercase", color: "#FF2BD1"}}>
            coins
          </span>
        </div>
        <div style={{font: "400 11px/1.4 'Space Mono',monospace", color: "#8E8A93", marginTop: "10px"}}>
          Neon Hours vol.3 costs 240. You're 60 short.
        </div>
      </div>
      <div style={{font: "700 9.5px/1 'Space Grotesk'", letterSpacing: "2.2px", textTransform: "uppercase", color: "#6E6A72", margin: "26px 0 12px"}}>
        Top up
      </div>
      <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px"}}>
        <div style={{border: "1px solid rgba(255,255,255,.1)", padding: "15px"}}>
          <div style={{font: "700 20px/1 'Space Grotesk'"}}>
            100
          </div>
          <div style={{font: "400 10.5px/1 'Space Mono',monospace", color: "#8E8A93", marginTop: "7px"}}>
            $4.99
          </div>
        </div>
        <div style={{border: "1.5px solid #C8FF3D", background: "rgba(200,255,61,.07)", padding: "15px", position: "relative", boxShadow: "0 0 26px rgba(200,255,61,.14)"}}>
          <span style={{position: "absolute", top: "-9px", left: "10px", transform: "rotate(-3deg)", background: "#C8FF3D", color: "#08080A", font: "700 8.5px/1 'Space Grotesk'", letterSpacing: "1.2px", textTransform: "uppercase", padding: "5px 7px"}}>
            best value
          </span>
          <div style={{font: "700 20px/1 'Space Grotesk'", color: "#C8FF3D"}}>
            300
          </div>
          <div style={{font: "400 10.5px/1 'Space Mono',monospace", color: "#8E8A93", marginTop: "7px"}}>
            $11.99 · +20 free
          </div>
        </div>
        <div style={{border: "1px solid rgba(255,255,255,.1)", padding: "15px"}}>
          <div style={{font: "700 20px/1 'Space Grotesk'"}}>
            700
          </div>
          <div style={{font: "400 10.5px/1 'Space Mono',monospace", color: "#8E8A93", marginTop: "7px"}}>
            $24.99
          </div>
        </div>
        <div style={{border: "1px solid rgba(255,255,255,.1)", padding: "15px"}}>
          <div style={{font: "700 20px/1 'Space Grotesk'"}}>
            1500
          </div>
          <div style={{font: "400 10.5px/1 'Space Mono',monospace", color: "#8E8A93", marginTop: "7px"}}>
            $49.99
          </div>
        </div>
      </div>
      <div style={{font: "700 9.5px/1 'Space Grotesk'", letterSpacing: "2.2px", textTransform: "uppercase", color: "#6E6A72", margin: "26px 0 12px"}}>
        Pay with
      </div>
      <div style={{display: "flex", flexDirection: "column", gap: "8px"}}>
        <div style={{display: "flex", alignItems: "center", gap: "12px", border: "1px solid rgba(0,229,255,.4)", background: "rgba(0,229,255,.05)", padding: "15px"}}>
          <span style={{width: "9px", height: "9px", borderRadius: "50%", background: "#00E5FF", boxShadow: "0 0 10px #00E5FF"}} />
          <span style={{font: "500 13px/1 'Space Grotesk'"}}>
            Apple Pay
          </span>
          <span style={{marginLeft: "auto", font: "400 10.5px/1 'Space Mono',monospace", color: "#6E6A72"}}>
            instant
          </span>
        </div>
        <div style={{display: "flex", alignItems: "center", gap: "12px", border: "1px solid rgba(255,255,255,.1)", padding: "15px"}}>
          <span style={{width: "9px", height: "9px", borderRadius: "50%", border: "1px solid #4A464F"}} />
          <span style={{font: "500 13px/1 'Space Grotesk'", color: "#C9C5CE"}}>
            Card ···· 4417
          </span>
        </div>
      </div>
      <div style={{marginTop: "22px", background: "#FF2BD1", color: "#08080A", textAlign: "center", padding: "19px", font: "700 13px/1 'Space Grotesk'", letterSpacing: "2.2px", textTransform: "uppercase", boxShadow: "0 0 34px rgba(255,43,209,.4)", cursor: "pointer"}} onClick={() => nav('/library')}>
        Pay $11.99 · unlock
      </div>
      <div style={{font: "400 10.5px/1.55 'Space Mono',monospace", color: "#5E5A63", textAlign: "center", marginTop: "12px"}}>
        Your statement will read
        <span style={{color: "#9C979F"}}>
          AG DIGITAL LTD
        </span>
        . Nothing else.
      </div>
    </div>
  )
}
