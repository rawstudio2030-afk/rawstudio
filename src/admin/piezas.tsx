/* Piezas comunes del panel.
 *
 * El resto de la aplicacion es de celular: una columna, pocos elementos, dedos.
 * El panel es lo contrario —escritorio, sesion larga, muchas filas a la vista—
 * asi que necesita sus propios componentes en vez de estirar los de la app.
 * Comparte los tokens de diseño, no el diseño.
 */
import { useEffect, useState, type ReactNode } from 'react'
import { COLOR, LINEA, FUENTE } from '../lib/diseño'

export const ANCHO_MINIMO = 1280

/* ---------- Botones ---------- */

type TonoBoton = 'normal' | 'primario' | 'peligro'

export function Boton({ children, al, tono = 'normal', activo = true, chico }: {
  children: ReactNode; al: () => void; tono?: TonoBoton
  activo?: boolean; chico?: boolean
}) {
  const color = tono === 'peligro' ? '#FF4444' : tono === 'primario' ? COLOR.acento : COLOR.textoSuave
  return (
    <button type="button" disabled={!activo} onClick={al} style={{
      font: `700 ${chico ? 9 : 10}px/1 ${FUENTE.ui}`,
      letterSpacing: 1.4, textTransform: 'uppercase',
      padding: chico ? '6px 10px' : '9px 14px',
      background: tono === 'primario' && activo ? COLOR.acento : 'transparent',
      color: tono === 'primario' && activo ? COLOR.fondo : color,
      border: `1px solid ${activo ? color : LINEA.tenue}`,
      opacity: activo ? 1 : .4,
      cursor: activo ? 'pointer' : 'not-allowed',
      borderRadius: 0, whiteSpace: 'nowrap',
    }}>{children}</button>
  )
}

/* ---------- Campos ---------- */

const campoBase = {
  width: '100%', boxSizing: 'border-box' as const,
  background: COLOR.fondo, color: COLOR.texto,
  border: `1px solid ${LINEA.suave}`, borderRadius: 0,
  padding: '9px 11px', font: `400 13px/1.4 ${FUENTE.ui}`, outline: 'none',
}

export function Campo({ valor, cambia, marcador, tipo = 'text', mono, autoFoco }: {
  valor: string; cambia: (v: string) => void; marcador?: string
  tipo?: string; mono?: boolean; autoFoco?: boolean
}) {
  return (
    <input type={tipo} value={valor} placeholder={marcador} autoFocus={autoFoco}
      onChange={e => cambia(e.target.value)}
      style={{ ...campoBase, fontFamily: mono ? FUENTE.mono : FUENTE.ui }} />
  )
}

export function AreaTexto({ valor, cambia, marcador, filas = 3 }: {
  valor: string; cambia: (v: string) => void; marcador?: string; filas?: number
}) {
  return (
    <textarea value={valor} placeholder={marcador} rows={filas}
      onChange={e => cambia(e.target.value)}
      style={{ ...campoBase, resize: 'vertical' }} />
  )
}

export function Selector<T extends string>({ valor, cambia, opciones }: {
  valor: T; cambia: (v: T) => void; opciones: { v: T; t: string }[]
}) {
  return (
    <select value={valor} onChange={e => cambia(e.target.value as T)}
      style={{ ...campoBase, cursor: 'pointer', width: 'auto', minWidth: 120 }}>
      {opciones.map(o => <option key={o.v} value={o.v}>{o.t}</option>)}
    </select>
  )
}

export function Etiquetado({ texto, hijo, ancho }: {
  texto: string; hijo: ReactNode; ancho?: number | string
}) {
  return (
    <label style={{ display: 'block', width: ancho }}>
      <span style={{
        display: 'block', marginBottom: 5,
        font: `700 9px/1 ${FUENTE.ui}`, letterSpacing: 1.3,
        textTransform: 'uppercase', color: COLOR.textoTenue,
      }}>{texto}</span>
      {hijo}
    </label>
  )
}

/* ---------- Modal de confirmacion ----------
 *
 * Toda accion destructiva o de dinero pasa por aqui. No es adorno: el panel
 * mueve saldos y cierra cuentas, y un clic de mas en una tabla densa es
 * facilisimo. Cuando `exigeMotivo` esta puesto, el boton no se habilita hasta
 * que hay texto, porque el motivo termina en la bitacora y un registro sin
 * explicacion no sirve de nada dentro de un mes.
 */
export function Confirmar({ titulo, cuerpo, etiqueta, tono = 'peligro',
  exigeMotivo, extra, al, cancela }: {
  titulo: string; cuerpo: ReactNode; etiqueta: string; tono?: TonoBoton
  exigeMotivo?: boolean
  extra?: (motivo: string) => ReactNode
  al: (motivo: string) => void | Promise<void>
  cancela: () => void
}) {
  const [motivo, setMotivo] = useState('')
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') cancela() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [cancela])

  const listo = !ocupado && (!exigeMotivo || motivo.trim().length > 0)

  return (
    <div onClick={cancela} style={{
      position: 'fixed', inset: 0, zIndex: 90,
      background: 'rgba(8,8,10,.82)', display: 'grid', placeItems: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 460, maxWidth: '92vw', background: COLOR.superficie,
        border: `1px solid ${LINEA.fuerte}`, padding: 26,
      }}>
        <div style={{
          font: `400 22px/1.15 ${FUENTE.display}`, textTransform: 'uppercase',
          color: COLOR.texto, letterSpacing: .4,
        }}>{titulo}</div>

        <div style={{
          marginTop: 12, font: `400 13px/1.55 ${FUENTE.ui}`, color: COLOR.textoSuave,
        }}>{cuerpo}</div>

        {exigeMotivo && (
          <div style={{ marginTop: 18 }}>
            <Etiquetado texto="Motivo (obligatorio)" hijo={
              <AreaTexto valor={motivo} cambia={setMotivo}
                marcador="Queda registrado en la bitácora" />
            } />
          </div>
        )}

        {extra?.(motivo)}

        <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
          <Boton al={cancela} tono="normal">Cancelar</Boton>
          <Boton tono={tono} activo={listo} al={async () => {
            setOcupado(true)
            try { await al(motivo.trim()) } finally { setOcupado(false) }
          }}>{ocupado ? 'Un momento…' : etiqueta}</Boton>
        </div>
      </div>
    </div>
  )
}

/* ---------- Tabla ---------- */

export type Columna<T> = {
  clave: string
  titulo: string
  ancho?: number
  ordenable?: boolean
  /** Alinea a la derecha. Para cifras: leerlas en columna exige el punto
   *  decimal alineado, si no hay que comparar contando digitos. */
  numerica?: boolean
  pinta: (fila: T) => ReactNode
}

export function Tabla<T>({ columnas, filas, clave, orden, descendente, ordenar,
  alElegir, elegida, vacia }: {
  columnas: Columna<T>[]; filas: T[]; clave: (f: T) => string
  orden?: string; descendente?: boolean; ordenar?: (c: string) => void
  alElegir?: (f: T) => void; elegida?: string; vacia?: ReactNode
}) {
  if (!filas.length) {
    return (
      <div style={{
        padding: '60px 20px', textAlign: 'center', color: COLOR.textoTenue,
        font: `400 13px/1.5 ${FUENTE.ui}`, border: `1px solid ${LINEA.tenue}`,
      }}>{vacia ?? 'Sin resultados'}</div>
    )
  }
  return (
    <div style={{ border: `1px solid ${LINEA.tenue}`, overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {columnas.map(c => (
              <th key={c.clave}
                onClick={() => c.ordenable && ordenar?.(c.clave)}
                style={{
                  position: 'sticky', top: 0, zIndex: 1,
                  background: COLOR.superficieAlta,
                  textAlign: c.numerica ? 'right' : 'left',
                  padding: '9px 12px', width: c.ancho,
                  font: `700 9px/1 ${FUENTE.ui}`, letterSpacing: 1.2,
                  textTransform: 'uppercase',
                  color: orden === c.clave ? COLOR.admin : COLOR.textoTenue,
                  borderBottom: `1px solid ${LINEA.suave}`,
                  cursor: c.ordenable ? 'pointer' : 'default',
                  userSelect: 'none', whiteSpace: 'nowrap',
                }}>
                {c.titulo}
                {orden === c.clave && (
                  <span style={{ marginLeft: 5 }}>{descendente ? '▾' : '▴'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map(f => {
            const k = clave(f)
            return (
              <tr key={k} onClick={() => alElegir?.(f)} style={{
                background: elegida === k ? 'rgba(0,229,255,.06)' : 'transparent',
                cursor: alElegir ? 'pointer' : 'default',
              }}>
                {columnas.map(c => (
                  <td key={c.clave} style={{
                    padding: '9px 12px',
                    textAlign: c.numerica ? 'right' : 'left',
                    font: `400 12px/1.4 ${c.numerica ? FUENTE.mono : FUENTE.ui}`,
                    color: COLOR.texto,
                    borderBottom: `1px solid ${LINEA.tenue}`,
                    whiteSpace: 'nowrap',
                  }}>{c.pinta(f)}</td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ---------- Paginador ---------- */

export function Paginador({ pagina, porPagina, total, cambia }: {
  pagina: number; porPagina: number; total: number; cambia: (p: number) => void
}) {
  const paginas = Math.max(1, Math.ceil(total / porPagina))
  const desde = total === 0 ? 0 : pagina * porPagina + 1
  const hasta = Math.min((pagina + 1) * porPagina, total)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginTop: 12, font: `400 11px/1 ${FUENTE.mono}`, color: COLOR.textoTenue,
    }}>
      <span>{desde}–{hasta} de {total}</span>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Boton chico activo={pagina > 0} al={() => cambia(pagina - 1)}>‹ Anterior</Boton>
        <span style={{ minWidth: 70, textAlign: 'center' }}>{pagina + 1} / {paginas}</span>
        <Boton chico activo={pagina + 1 < paginas} al={() => cambia(pagina + 1)}>Siguiente ›</Boton>
      </div>
    </div>
  )
}

/* ---------- Marcas de estado ---------- */

export function Insignia({ texto, color }: { texto: string; color: string }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 7px',
      font: `700 9px/1.5 ${FUENTE.ui}`, letterSpacing: 1,
      textTransform: 'uppercase', color, border: `1px solid ${color}`,
    }}>{texto}</span>
  )
}

export const COLOR_ESTADO: Record<string, string> = {
  activa: COLOR.dinero, suspendida: '#FFB020', baneada: '#FF4444',
}
export const COLOR_ROL: Record<string, string> = {
  admin: COLOR.admin, creadora: COLOR.acento, usuaria: COLOR.textoTenue,
}

/* ---------- Formato ---------- */

export const fecha = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export const fechaHora = (s: string | null) =>
  s ? new Date(s).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }) : '—'

/** Hace cuanto, en palabras. En una tabla de ultimo acceso importa mas "hace
 *  3 meses" que la fecha exacta: la pregunta real es si la cuenta sigue viva. */
export function desde(s: string | null): string {
  if (!s) return 'nunca'
  const min = (Date.now() - new Date(s).getTime()) / 60000
  if (min < 60) return `hace ${Math.max(1, Math.floor(min))} min`
  if (min < 1440) return `hace ${Math.floor(min / 60)} h`
  const d = Math.floor(min / 1440)
  if (d < 30) return `hace ${d} d`
  if (d < 365) return `hace ${Math.floor(d / 30)} mes${Math.floor(d / 30) > 1 ? 'es' : ''}`
  return `hace ${Math.floor(d / 365)} año${Math.floor(d / 365) > 1 ? 's' : ''}`
}
