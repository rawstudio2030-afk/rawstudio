/* Piezas compartidas de las pantallas del estudio.
 *
 * El panel de administracion tiene las suyas en src/admin/piezas: son de
 * escritorio, con tablas densas. Estas son de celular, que es donde las
 * creadoras usan la aplicacion. */
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { COLOR, LINEA, FUENTE } from '../lib/diseño'

export function Marco({ titulo, children, volverA = '/estudio' }: {
  titulo: string; children: ReactNode; volverA?: string
}) {
  const nav = useNavigate()
  return (
    <div style={{
      minHeight: '100%', boxSizing: 'border-box', padding: '54px 22px 90px',
      background: COLOR.fondo, color: COLOR.texto, fontFamily: FUENTE.ui,
    }}>
      <div style={{ display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 22 }}>
        <span onClick={() => nav(volverA)} style={{
          font: `400 26px/1 ${FUENTE.ui}`, color: COLOR.textoSuave, cursor: 'pointer',
        }}>‹</span>
        <span style={{
          font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 2.2,
          textTransform: 'uppercase', color: COLOR.dinero,
        }}>{titulo}</span>
        <span style={{ width: 14 }} />
      </div>
      {children}
    </div>
  )
}

export function Boton({ children, al, activo = true, tono = 'normal' }: {
  children: ReactNode; al: () => void; activo?: boolean
  tono?: 'normal' | 'primario' | 'peligro'
}) {
  const color = tono === 'primario' ? COLOR.acento : tono === 'peligro' ? '#FF4444' : null
  return (
    <span onClick={() => activo && al()} style={{
      display: 'inline-block', textAlign: 'center', padding: '13px 22px',
      cursor: activo ? 'pointer' : 'not-allowed', opacity: activo ? 1 : .4,
      background: tono === 'primario' && activo ? COLOR.acento : 'transparent',
      border: `1px solid ${color ?? LINEA.fuerte}`,
      color: tono === 'primario' && activo ? COLOR.fondo : (color ?? COLOR.textoSuave),
      font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.8, textTransform: 'uppercase',
    }}>{children}</span>
  )
}

export function Campo({ valor, cambia, marcador, tipo = 'text', filas }: {
  valor: string; cambia: (v: string) => void; marcador?: string
  tipo?: string; filas?: number
}) {
  const estilo = {
    width: '100%', boxSizing: 'border-box' as const,
    background: 'transparent', color: COLOR.texto,
    border: `1px solid ${LINEA.suave}`, borderRadius: 0,
    padding: '12px 13px', font: `400 15px/1.5 ${FUENTE.ui}`, outline: 'none',
  }
  return filas
    ? <textarea value={valor} onChange={e => cambia(e.target.value)}
        rows={filas} placeholder={marcador} style={{ ...estilo, resize: 'vertical' }} />
    : <input type={tipo} value={valor} onChange={e => cambia(e.target.value)}
        placeholder={marcador} style={estilo} />
}

export function Etiqueta({ texto }: { texto: string }) {
  return (
    <div style={{
      font: `700 9px/1 ${FUENTE.ui}`, letterSpacing: 1.8,
      textTransform: 'uppercase', color: COLOR.textoTenue, marginBottom: 8,
    }}>{texto}</div>
  )
}

export function Aviso({ texto, tono = 'error' }: { texto: string; tono?: 'error' | 'bien' }) {
  if (!texto) return null
  const c = tono === 'bien' ? COLOR.dinero : '#FF4444'
  return (
    <div style={{
      margin: '14px 0', padding: '11px 13px', border: `1px solid ${c}`,
      color: c, font: `400 13px/1.45 ${FUENTE.ui}`,
    }}>{texto}</div>
  )
}

export function Vacio({ texto }: { texto: string }) {
  return (
    <div style={{
      padding: '48px 20px', textAlign: 'center', border: `1px solid ${LINEA.tenue}`,
      font: `400 14px/1.6 ${FUENTE.serif}`, fontStyle: 'italic', color: COLOR.textoTenue,
    }}>{texto}</div>
  )
}
