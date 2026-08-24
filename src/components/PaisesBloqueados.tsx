// Selector de países donde NO se muestra el contenido.
//
// Es lo que la pagina de creadoras promete: "Muchas creadoras bloquean su
// estado y el de su familia desde el primer dia". Aqui es por pais; el bloqueo
// por estado o ciudad no se ofrece porque la geolocalizacion por IP a ese nivel
// falla seguido, y una creadora confiaria en algo que no la protege.
import { useState } from 'react'
import { COLOR, LINEA, FUENTE } from '../lib/diseño'


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
      <span style={{ font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 2.2, textTransform: 'uppercase', color: COLOR.textoTenue }}>
        Ocultar en estos países
      </span>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {FRECUENTES.map(([c, n]) => {
          const on = valor.includes(c)
          return (
            <span key={c} onClick={() => alternar(c)} style={{
              padding: '9px 11px', cursor: 'pointer',
              font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.2, textTransform: 'uppercase',
              background: on ? COLOR.admin : 'transparent',
              color: on ? COLOR.fondo : COLOR.textoSuave,
              border: `1px solid ${on ? COLOR.admin : LINEA.media}`,
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
            width: 130, boxSizing: 'border-box', background: COLOR.superficie,
            border: '1px solid rgba(255,255,255,.14)', color: COLOR.texto,
            font: `400 14px/1 ${FUENTE.mono}`, padding: '11px', outline: 'none',
          }} />
        <span onClick={agregarOtro} style={{
          padding: '11px 14px', border: '1px solid rgba(255,255,255,.16)',
          color: COLOR.textoSuave, font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.4,
          textTransform: 'uppercase', cursor: 'pointer',
        }}>Agregar</span>
      </div>

      {valor.filter(c => !FRECUENTES.some(([f]) => f === c)).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {valor.filter(c => !FRECUENTES.some(([f]) => f === c)).map(c => (
            <span key={c} onClick={() => alternar(c)} style={{
              padding: '8px 10px', cursor: 'pointer',
              font: `700 10px/1 ${FUENTE.mono}`, letterSpacing: 1.2,
              background: COLOR.admin, color: COLOR.fondo,
            }}>{c} ×</span>
          ))}
        </div>
      )}

      <div style={{ font: `400 11.5px/1.6 ${FUENTE.mono}`, color: COLOR.textoApagado }}>
        {nota ?? 'Quien se conecte desde ahí no podrá abrirlo.'}
      </div>

      {/* Se dice el limite real. Prometer un bloqueo infalible seria lo peor
          que se le puede decir a alguien que se esconde de su entorno. */}
      <div style={{ font: `400 11px/1.6 ${FUENTE.mono}`, color: COLOR.textoTenue }}>
        Ojo: una VPN salta esto. Reduce mucho el riesgo, no lo elimina.
      </div>
    </div>
  )
}
