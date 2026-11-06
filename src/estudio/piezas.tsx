/* Piezas compartidas de las pantallas del estudio.
 *
 * El panel de administracion tiene las suyas en src/admin/piezas: son de
 * escritorio, con tablas densas. Estas son de celular, que es donde las
 * creadoras usan la aplicacion. */
import type { ReactNode } from 'react'
import { COLOR, LINEA, FUENTE, RADIO } from '../lib/diseño'
import { Pulsable, Enlace } from '../components/Pulsable'

/* Modo consumo (DESIGN-BRIEF.md): el estudio es donde se trabaja, asi que va
 * sobrio. Esquina suave, campos con foco en cian sin halo (.campo-sobrio) y el
 * boton magenta solo para lo principal (.boton-principal). Lo comparten Niveles,
 * Blog, Cobro, Retirar y Encargos: cambiar esto las alinea a todas. */
export function Marco({ titulo, children, volverA = '/estudio' }: {
  titulo: string; children: ReactNode; volverA?: string
}) {
  return (
    <div style={{
      minHeight: '100%', boxSizing: 'border-box', padding: '20px 18px 90px',
      background: COLOR.fondo, color: COLOR.texto, fontFamily: FUENTE.ui,
      width: '100%', maxWidth: 680, margin: '0 auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 22 }}>
        <Enlace a={volverA} rotulo="Volver" style={{
          width: 44, height: 44, borderRadius: '50%', display: 'grid', placeItems: 'center',
          border: '1px solid rgba(255,255,255,.22)', color: COLOR.texto, cursor: 'pointer',
        }}><span aria-hidden style={{ font: `400 22px/1 ${FUENTE.ui}` }}>&#8249;</span></Enlace>
        <h1 style={{
          margin: 0, font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 2,
          textTransform: 'uppercase', color: COLOR.dinero,
        }}>{titulo}</h1>
        <span aria-hidden style={{ width: 44 }} />
      </div>
      {children}
    </div>
  )
}

export function Boton({ children, al, activo = true, tono = 'normal' }: {
  children: ReactNode; al: () => void; activo?: boolean
  tono?: 'normal' | 'primario' | 'peligro'
}) {
  // El primario es el boton magenta de siempre; los demas, de contorno.
  if (tono === 'primario') {
    return (
      <Pulsable al={al} activo={activo} className="boton-principal"
        style={{ display: 'inline-flex', minHeight: 48, padding: '0 22px', fontSize: 12 }}>{children}</Pulsable>
    )
  }
  const color = tono === 'peligro' ? '#FF4444' : COLOR.textoSuave
  return (
    <Pulsable al={al} activo={activo} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
      minHeight: 48, padding: '0 22px', borderRadius: 12,
      cursor: activo ? 'pointer' : 'not-allowed', opacity: activo ? 1 : .4,
      border: `1px solid ${tono === 'peligro' ? '#FF4444' : LINEA.fuerte}`, color,
      font: `700 12px/1 ${FUENTE.ui}`, letterSpacing: 1.4, textTransform: 'uppercase',
    }}>{children}</Pulsable>
  )
}

export function Campo({ valor, cambia, marcador, tipo = 'text', filas }: {
  valor: string; cambia: (v: string) => void; marcador?: string
  tipo?: string; filas?: number
}) {
  // El borde, el fondo y el foco salen de `.campo-sobrio` (index.css).
  const estilo = {
    width: '100%', boxSizing: 'border-box' as const,
    padding: '14px 15px', font: `400 16px/1.45 ${FUENTE.ui}`,
  }
  return filas
    ? <textarea value={valor} onChange={e => cambia(e.target.value)} className="campo-sobrio"
        rows={filas} placeholder={marcador} style={{ ...estilo, resize: 'vertical' }} />
    : <input type={tipo} value={valor} onChange={e => cambia(e.target.value)} className="campo-sobrio"
        placeholder={marcador} style={estilo} />
}

export function Etiqueta({ texto }: { texto: string }) {
  // Era `textoTenue` a 9 px: 3.78:1, bajo AA.
  return (
    <div style={{
      font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 1.6,
      textTransform: 'uppercase', color: COLOR.textoSuave, marginBottom: 8,
    }}>{texto}</div>
  )
}

export function Aviso({ texto, tono = 'error' }: { texto: string; tono?: 'error' | 'bien' }) {
  if (!texto) return null
  const c = tono === 'bien' ? COLOR.dinero : '#FF4444'
  return (
    <div role={tono === 'error' ? 'alert' : 'status'} style={{
      margin: '14px 0', padding: '12px 14px', border: `1px solid ${c}`, borderRadius: 12,
      color: c, font: `400 14px/1.45 ${FUENTE.ui}`,
    }}>{texto}</div>
  )
}

export function Vacio({ texto }: { texto: string }) {
  return (
    <div style={{
      padding: '48px 20px', textAlign: 'center', border: `1.5px dashed ${LINEA.marcada}`,
      borderRadius: RADIO.neon, font: `400 14px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave,
    }}>{texto}</div>
  )
}
