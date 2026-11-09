/* Piezas comunes del panel.
 *
 * El resto de la aplicacion es de celular: una columna, pocos elementos, dedos.
 * El panel es lo contrario —escritorio, sesion larga, muchas filas a la vista—
 * asi que necesita sus propios componentes en vez de estirar los de la app.
 * Comparte los tokens de diseño, no el diseño.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { COLOR, LINEA, FUENTE } from '../lib/diseño'
import { Pulsable } from '../components/Pulsable'
import { cuantos } from '../lib/plural'
import { humano } from '../lib/humano'
import { useEscape, tecladoComoBoton } from '../lib/teclado'

export const ANCHO_MINIMO = 1280

/* ---------- Botones ---------- */

type TonoBoton = 'normal' | 'primario' | 'peligro'

export function Boton({ children, al, tono = 'normal', activo = true, chico }: {
  children: ReactNode; al: () => void; tono?: TonoBoton
  activo?: boolean; chico?: boolean
}) {
  // El primario es CIAN, no magenta: el panel es el contexto privilegiado, y el
  // cian es el color que el sitio ya reserva para eso. El peligro sigue en rojo.
  const color = tono === 'peligro' ? '#FF4444' : tono === 'primario' ? COLOR.admin : COLOR.textoSuave
  return (
    <button type="button" disabled={!activo} onClick={al} className="boton-admin" style={{
      font: `700 ${chico ? 10 : 11}px/1 ${FUENTE.ui}`,
      letterSpacing: 1.2, textTransform: 'uppercase',
      padding: chico ? '7px 11px' : '10px 15px',
      background: tono === 'primario' && activo ? COLOR.admin : 'transparent',
      color: tono === 'primario' && activo ? COLOR.fondo : color,
      border: `1px solid ${activo ? color : LINEA.tenue}`,
      opacity: activo ? 1 : .4,
      cursor: activo ? 'pointer' : 'not-allowed',
      borderRadius: 8, whiteSpace: 'nowrap',
    }}>{children}</button>
  )
}

/** El rotulo de una columna. Es un boton cuando la columna se puede ordenar y
 *  texto cuando no: asi el teclado solo se detiene en las que hacen algo. */
function Encabezado({ ordenable, al, alinea, children }: {
  ordenable: boolean; al: () => void; alinea: 'left' | 'right'; children: ReactNode
}) {
  const pinta = {
    display: 'block', width: '100%', boxSizing: 'border-box' as const,
    textAlign: alinea, padding: '10px 12px',
    font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.2,
    textTransform: 'uppercase' as const, color: 'inherit',
  }
  if (!ordenable) return <div style={pinta}>{children}</div>
  return <Pulsable al={al} style={{ ...pinta, cursor: 'pointer' }}>{children}</Pulsable>
}

/* ---------- Campos ---------- */

// El fondo, el borde y el foco salen de `.campo-admin` (index.css).
const campoBase = {
  width: '100%', boxSizing: 'border-box' as const,
  padding: '9px 11px', font: `400 13px/1.45 ${FUENTE.ui}`,
}

export function Campo({ valor, cambia, marcador, tipo = 'text', mono, autoFoco }: {
  valor: string; cambia: (v: string) => void; marcador?: string
  tipo?: string; mono?: boolean; autoFoco?: boolean
}) {
  return (
    <input type={tipo} value={valor} placeholder={marcador} autoFocus={autoFoco}
      className="campo-admin" onChange={e => cambia(e.target.value)}
      style={{ ...campoBase, fontFamily: mono ? FUENTE.mono : FUENTE.ui }} />
  )
}

export function AreaTexto({ valor, cambia, marcador, filas = 3 }: {
  valor: string; cambia: (v: string) => void; marcador?: string; filas?: number
}) {
  return (
    <textarea value={valor} placeholder={marcador} rows={filas}
      className="campo-admin" onChange={e => cambia(e.target.value)}
      style={{ ...campoBase, resize: 'vertical' }} />
  )
}

export function Selector<T extends string>({ valor, cambia, opciones }: {
  valor: T; cambia: (v: T) => void; opciones: { v: T; t: string }[]
}) {
  return (
    <select value={valor} onChange={e => cambia(e.target.value as T)} className="campo-admin"
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
        font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.2,
        textTransform: 'uppercase', color: COLOR.textoSuave,
      }}>{texto}</span>
      {hijo}
    </label>
  )
}

/** Aviso dentro de una pantalla o de un recuadro. Un error o una atención se
 *  anuncian (`role="alert"`); un resultado bueno o una propuesta pendiente son
 *  informativos (`role="status"`). Siempre se pone DENTRO de lo que el
 *  administrador tiene abierto: un aviso en la pantalla de atras queda tapado
 *  por la ficha o el recuadro y es como no haberlo dado. */
export type TipoAviso = 'ok' | 'propuesto' | 'atencion' | 'error'
const COLOR_AVISO: Record<TipoAviso, string> = {
  ok: COLOR.dinero, propuesto: '#FFB020', atencion: '#FFB020', error: '#FF4444',
}
const ROTULO_AVISO: Record<TipoAviso, string> = {
  ok: 'Listo', propuesto: 'Propuesto, aún no aplicado', atencion: 'Atención', error: 'No se pudo',
}

export function Aviso({ tipo, children, cierra }: {
  tipo: TipoAviso; children: ReactNode; cierra?: () => void
}) {
  const c = COLOR_AVISO[tipo]
  return (
    <div role={tipo === 'error' || tipo === 'atencion' ? 'alert' : 'status'} style={{
      marginTop: 14, padding: '10px 13px', border: `1px solid ${c}`,
      display: 'flex', gap: 12, alignItems: 'flex-start',
      font: `400 12px/1.5 ${FUENTE.ui}`, color: COLOR.textoSuave,
    }}>
      <div style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
        <b style={{ color: c }}>{ROTULO_AVISO[tipo]}.</b> {children}
      </div>
      {cierra && <Boton chico al={cierra}>Cerrar</Boton>}
    </div>
  )
}

/* ---------- Modal de confirmacion ----------
 *
 * Toda accion destructiva o de dinero pasa por aqui. No es adorno: el panel
 * mueve saldos y cierra cuentas, y un clic de mas en una tabla densa es
 * facilisimo. Cuando `exigeMotivo` esta puesto, el boton no se habilita hasta
 * que hay texto, porque el motivo termina en la bitacora y un registro sin
 * explicacion no sirve de nada dentro de un mes.
 *
 * EL RESULTADO SE VE AQUI MISMO. `al` puede devolver un texto: es el error, y se
 * pinta dentro del recuadro, con el motivo y los campos intactos, sin cerrar.
 * Antes el error se mandaba al aviso de la pantalla de atras, que el propio
 * recuadro (y la ficha, si estaba abierta) tapaba: se pulsaba, no pasaba nada
 * y nadie decia por que. Si `al` lanza (red, excepcion) tambien se muestra, sin
 * dejar el boton ocupado ni dar el exito por hecho. Un segundo clic mientras
 * corre el primero no hace nada: un abono no puede enviarse dos veces.
 *
 * `bloqueo` es una razon por la que la accion no puede hacerse ahora (por
 * ejemplo, el usuario escrito no coincide): se explica dentro y el boton queda
 * inactivo, sin llamar al servidor.
 */
export function Confirmar({ titulo, cuerpo, etiqueta, tono = 'peligro',
  exigeMotivo, extra, bloqueo, inactivo, al, cancela }: {
  titulo: string; cuerpo: ReactNode; etiqueta: string; tono?: TonoBoton
  exigeMotivo?: boolean
  extra?: (motivo: string) => ReactNode
  bloqueo?: ReactNode
  /** Desactiva el boton sin decir nada (falta un dato obvio, como escribir el usuario). */
  inactivo?: boolean
  /** Devuelve un texto para mostrar un error dentro del recuadro; nada o '' si salio bien. */
  al: (motivo: string) => void | string | Promise<void | string>
  cancela: () => void
}) {
  const [motivo, setMotivo] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const enCurso = useRef(false)
  const zonaError = useRef<HTMLDivElement>(null)

  useEscape(true, cancela)

  // Con el diagnostico y el motivo el recuadro puede ser alto: el error se lleva
  // a la vista en vez de quedar por debajo del pliegue.
  useEffect(() => {
    if (error) zonaError.current?.scrollIntoView?.({ block: 'nearest' })
  }, [error])

  const listo = !ocupado && !bloqueo && !inactivo && (!exigeMotivo || motivo.trim().length > 0)

  const enviar = async () => {
    if (enCurso.current) return
    enCurso.current = true
    setOcupado(true); setError('')
    try {
      const r = await al(motivo.trim())
      if (typeof r === 'string' && r) setError(humano(r))
    } catch (e) {
      setError(humano(e instanceof Error && e.message ? e.message : 'fetch failed'))
    } finally {
      enCurso.current = false
      setOcupado(false)
    }
  }

  return (
    <div onClick={cancela} style={{
      position: 'fixed', inset: 0, zIndex: 90,
      background: 'rgba(8,8,10,.82)', display: 'grid', placeItems: 'center',
    }}>
      <div role="dialog" aria-modal="true" aria-label={titulo} onClick={e => e.stopPropagation()} style={{
        width: 460, maxWidth: '92vw', maxHeight: '92vh', overflowY: 'auto',
        background: COLOR.superficie,
        border: `1px solid ${LINEA.fuerte}`, borderRadius: 14, padding: 26,
      }}>
        <div style={{
          font: `700 20px/1.2 ${FUENTE.ui}`,
        }}>{titulo}</div>

        <div style={{
          marginTop: 12, font: `400 13px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave,
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

        {bloqueo && <Aviso tipo="atencion">{bloqueo}</Aviso>}

        <div ref={zonaError}>
          {error && <Aviso tipo="error">{error}</Aviso>}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
          <Boton al={cancela} tono="normal">Cancelar</Boton>
          <Boton tono={tono} activo={listo} al={enviar}>{ocupado ? 'Un momento…' : etiqueta}</Boton>
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
        padding: '60px 20px', textAlign: 'center', color: COLOR.textoSuave,
        font: `400 13px/1.45 ${FUENTE.ui}`, border: `1.5px dashed ${LINEA.marcada}`, borderRadius: 10,
      }}>{vacia ?? 'Sin resultados'}</div>
    )
  }
  return (
    <div style={{ border: `1px solid ${LINEA.suave}`, borderRadius: 10, overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {columnas.map(c => (
              <th key={c.clave}
                aria-sort={orden === c.clave ? (descendente ? 'descending' : 'ascending') : undefined}
                style={{
                  position: 'sticky', top: 0, zIndex: 1,
                  background: COLOR.superficieAlta,
                  textAlign: c.numerica ? 'right' : 'left',
                  padding: 0, width: c.ancho,
                  color: orden === c.clave ? COLOR.admin : COLOR.textoSuave,
                  borderBottom: `1px solid ${LINEA.suave}`,
                  userSelect: 'none', whiteSpace: 'nowrap',
                }}>
                {/* El boton va DENTRO del <th> y no en su lugar: una celda de
                    cabecera no se puede cambiar por otro elemento sin romper la
                    tabla, pero si puede contener uno. */}
                <Encabezado ordenable={!!c.ordenable} al={() => ordenar?.(c.clave)}
                  alinea={c.numerica ? 'right' : 'left'}>
                  {c.titulo}
                  {orden === c.clave && (
                    <span style={{ marginLeft: 5 }}>{descendente ? '▾' : '▴'}</span>
                  )}
                </Encabezado>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map(f => {
            const k = clave(f)
            return (
              <tr key={k} className={alElegir ? 'fila-admin' : undefined}
                {...(alElegir ? tecladoComoBoton(() => alElegir(f)) : {})}
                style={{
                background: elegida === k ? 'rgba(0,229,255,.1)' : undefined,
                cursor: alElegir ? 'pointer' : 'default',
              }}>
                {columnas.map(c => (
                  <td key={c.clave} style={{
                    padding: '9px 12px',
                    textAlign: c.numerica ? 'right' : 'left',
                    font: `400 12px/1.45 ${c.numerica ? FUENTE.mono : FUENTE.ui}`,
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
      marginTop: 12, font: `400 11px/1 ${FUENTE.mono}`, color: COLOR.textoSuave,
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
      display: 'inline-block', padding: '2px 8px', borderRadius: 6,
      font: `700 10px/1.45 ${FUENTE.ui}`, letterSpacing: 1.2,
      textTransform: 'uppercase', color, border: `1px solid ${color}`,
    }}>{texto}</span>
  )
}

export const COLOR_ESTADO: Record<string, string> = {
  activa: COLOR.dinero, suspendida: '#FFB020', baneada: '#FF4444',
}
export const COLOR_ROL: Record<string, string> = {
  admin: COLOR.admin, creadora: COLOR.acento, usuaria: COLOR.textoSuave,
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


/** «2 horas», «3 días»: cuanto lleva algo esperando, a partir de una fecha guardada. */
export function lleva(iso: string): string {
  const h = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000))
  if (h < 48) return cuantos(h, 'hora')
  return cuantos(Math.floor(h / 24), 'día')
}

/** «5 horas», «40 min»: cuanto falta para una fecha guardada. */
export function falta(iso: string): string {
  const min = Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 60_000))
  if (min < 60) return `${Math.max(1, min)} min`
  return cuantos(Math.floor(min / 60), 'hora')
}

/** Una cifra con su rotulo, para las rejillas de indicadores (Resumen, Finanzas). */
export function Cifra({ t, v, c, pie }: { t: string; v: string; c: string; pie?: string }) {
  return (
    <div style={{ background: COLOR.superficie, padding: '13px 15px' }}>
      <div style={{ font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.2,
        textTransform: 'uppercase', color: COLOR.textoSuave }}>{t}</div>
      <div style={{ marginTop: 7, font: `400 22px/1 ${FUENTE.mono}`, color: c }}>{v}</div>
      {pie && <div style={{ marginTop: 5, font: `400 11px/1.3 ${FUENTE.mono}`,
        color: COLOR.textoSuave }}>{pie}</div>}
    </div>
  )
}
