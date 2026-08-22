// Selector de países donde NO se muestra el contenido.
//
// Es lo que la pagina de creadoras promete: "Muchas creadoras bloquean su
// estado y el de su familia desde el primer dia". Aqui es por pais; el bloqueo
// por estado o ciudad no se ofrece porque la geolocalizacion por IP a ese nivel
// falla seguido, y una creadora confiaria en algo que no la protege.
import { useState } from 'react'

const UI = "'Space Grotesk', system-ui, sans-serif"
const MONO = "'Space Mono', monospace"

// Los mas relevantes para el publico de la plataforma, mas un campo libre.
const FRECUENTES: [string, string][] = [
  ['MX', 'México'], ['US', 'Estados Unidos'], ['ES', 'España'],
  ['CO', 'Colombia'], ['AR', 'Argentina'], ['CL', 'Chile'],
  ['PE', 'Perú'], ['GT', 'Guatemala'], ['CA', 'Canadá'],
]

export default function PaisesBloqueados({
  valor, onCambio, nota,
}: { valor: string[]; onCambio: (v: string[]) => void; nota?: string }) {
  const [otro, setOtro] = useState('')

  const alternar = (c: string) =>
    onCambio(valor.includes(c) ? valor.filter(x => x !== c) : [...valor, c])

  const agregarOtro = () => {
    const c = otro.trim().toUpperCase()
    if (/^[A-Z]{2}$/.test(c) && !valor.includes(c)) { onCambio([...valor, c]); setOtro('') }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <span style={{ font: `700 10px/1 ${UI}`, letterSpacing: 2.2, textTransform: 'uppercase', color: '#6E6A72' }}>
        Ocultar en estos países
      </span>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {FRECUENTES.map(([c, n]) => {
          const on = valor.includes(c)
          return (
            <span key={c} onClick={() => alternar(c)} style={{
              padding: '9px 11px', cursor: 'pointer',
              font: `700 10px/1 ${UI}`, letterSpacing: 1.2, textTransform: 'uppercase',
              background: on ? '#00E5FF' : 'transparent',
              color: on ? '#08080A' : '#9C979F',
              border: `1px solid ${on ? '#00E5FF' : 'rgba(255,255,255,.14)'}`,
            }}>{n}</span>
          )
        })}
      </div>

      {/* Los que no están en la lista corta */}
      <div style={{ display: 'flex', gap: 7 }}>
        <input value={otro} maxLength={2}
          onChange={e => setOtro(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
          onKeyDown={e => { if (e.key === 'Enter') agregarOtro() }}
          placeholder="Otro (ej. FR)"
          style={{
            width: 130, boxSizing: 'border-box', background: '#111116',
            border: '1px solid rgba(255,255,255,.14)', color: '#F2F0F3',
            font: `400 14px/1 ${MONO}`, padding: '11px', outline: 'none',
          }} />
        <span onClick={agregarOtro} style={{
          padding: '11px 14px', border: '1px solid rgba(255,255,255,.16)',
          color: '#9C979F', font: `700 10px/1 ${UI}`, letterSpacing: 1.4,
          textTransform: 'uppercase', cursor: 'pointer',
        }}>Agregar</span>
      </div>

      {valor.filter(c => !FRECUENTES.some(([f]) => f === c)).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {valor.filter(c => !FRECUENTES.some(([f]) => f === c)).map(c => (
            <span key={c} onClick={() => alternar(c)} style={{
              padding: '8px 10px', cursor: 'pointer',
              font: `700 10px/1 ${MONO}`, letterSpacing: 1.2,
              background: '#00E5FF', color: '#08080A',
            }}>{c} ×</span>
          ))}
        </div>
      )}

      <div style={{ font: `400 11.5px/1.6 ${MONO}`, color: '#5E5A63' }}>
        {nota ?? 'Quien se conecte desde ahí no podrá abrirlo.'}
      </div>

      {/* Se dice el limite real. Prometer un bloqueo infalible seria lo peor
          que se le puede decir a alguien que se esconde de su entorno. */}
      <div style={{ font: `400 11px/1.6 ${MONO}`, color: '#6E6A72' }}>
        Ojo: una VPN salta esto. Reduce mucho el riesgo, no lo elimina.
      </div>
    </div>
  )
}
