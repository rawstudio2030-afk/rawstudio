/* Busqueda general del panel: una paleta que se abre desde cualquier pantalla.
 *
 * Se abre con el boton de la barra lateral o con Ctrl+K / Cmd+K (el boton existe
 * para que nadie dependa del atajo). Busca personas, contenido y consultas en UNA
 * sola llamada (`admin_buscar`): la base devuelve ya los tres grupos, no se pide
 * un grupo por tecla.
 *
 * Un clic lleva al destino reutilizando la busqueda de esa pantalla, con
 * parametros en la URL (`?q=` y, si hay que abrir una ficha o un hilo, `?abrir=`).
 * No se inventa un cuarto tipo de entidad ni una pantalla nueva.
 *
 * PRIVACIDAD: de una consulta solo llegan los handles publicos y el titulo del
 * clip; nunca chat_id, telefono ni token. Ver 20261210000000_admin_busqueda_atencion.sql. */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { COLOR, LINEA, FUENTE } from '../lib/diseño'
import { buscarGeneral, type ResultadoBusqueda, type GrupoBusqueda } from '../lib/admin'
import { useEscape } from '../lib/teclado'
import { COLOR_ESTADO } from './piezas'

const GRUPOS: { clave: GrupoBusqueda; titulo: string }[] = [
  { clave: 'personas', titulo: 'Personas' },
  { clave: 'contenido', titulo: 'Contenido' },
  { clave: 'consultas', titulo: 'Consultas' },
]

/** A donde lleva cada resultado. */
function destinoDe(r: ResultadoBusqueda): string {
  const q = (t: string) => encodeURIComponent(t)
  if (r.grupo === 'personas') return `/admin/usuarios?q=${q(r.titulo.replace(/^@/, ''))}&abrir=${r.id}`
  if (r.grupo === 'contenido') {
    return `/admin/contenido?q=${q(r.titulo)}${r.estado === 'borrado' ? '&filtro=borrados' : ''}`
  }
  return `/admin/consultas?q=${q(r.titulo)}&abrir=${r.id}`
}

export default function BuscadorGeneral({ abierto, cierra }: { abierto: boolean; cierra: () => void }) {
  if (!abierto) return null
  // Se monta solo abierto: cada apertura empieza con el campo vacio y sin restos.
  return <Paleta cierra={cierra} />
}

function Paleta({ cierra }: { cierra: () => void }) {
  const nav = useNavigate()
  const [texto, setTexto] = useState('')
  const [filas, setFilas] = useState<ResultadoBusqueda[]>([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [buscado, setBuscado] = useState('')
  const [sel, setSel] = useState(0)
  const turno = useRef(0)
  useEscape(true, cierra)

  const limpio = texto.trim()
  const corto = limpio.length < 2

  // Debounce, y un turno por busqueda: una respuesta vieja que llega tarde no
  // pisa a la nueva.
  useEffect(() => {
    if (corto) return
    const mio = ++turno.current
    const t = setTimeout(async () => {
      setCargando(true)
      const r = await buscarGeneral(limpio)
      if (mio !== turno.current) return
      setFilas(r.filas); setError(r.error); setBuscado(limpio); setCargando(false); setSel(0)
    }, 250)
    return () => clearTimeout(t)
  }, [limpio, corto])

  // En el orden en que se ven: por grupo.
  const ordenadas = GRUPOS.flatMap(g => filas.filter(f => f.grupo === g.clave))

  const ir = useCallback((r: ResultadoBusqueda) => {
    cierra()
    nav(destinoDe(r))
  }, [cierra, nav])

  const alTeclear = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, ordenadas.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)) }
    else if (e.key === 'Enter' && ordenadas[sel]) { e.preventDefault(); ir(ordenadas[sel]) }
  }

  const hayResultados = !corto && buscado === limpio && !cargando
  let n = -1

  return (
    <div onClick={cierra} style={{
      position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(14,21,32,.65)',
      display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '12vh',
    }}>
      <div role="dialog" aria-modal="true" aria-label="Buscar en el panel" onClick={e => e.stopPropagation()}
        style={{
          width: 600, maxHeight: '70vh', display: 'flex', flexDirection: 'column',
          background: COLOR.superficie, border: `1px solid ${LINEA.fuerte}`,
        }}>
        <input autoFocus value={texto} onChange={e => setTexto(e.target.value)} onKeyDown={alTeclear}
          placeholder="Buscar una cuenta, un clip o una consulta…"
          aria-label="Buscar" role="combobox" aria-expanded={ordenadas.length > 0}
          aria-controls="resultados-busqueda"
          aria-activedescendant={ordenadas[sel] ? `res-${ordenadas[sel].grupo}-${ordenadas[sel].id}` : undefined}
          className="campo-admin"
          style={{
            boxSizing: 'border-box', width: '100%', padding: '15px 18px', background: 'transparent',
            border: 'none', borderBottom: `1px solid ${LINEA.suave}`, outline: 'none',
            color: COLOR.texto, font: `400 15px/1.3 ${FUENTE.ui}`,
          }} />

        <div id="resultados-busqueda" role="listbox" style={{ overflowY: 'auto', padding: '6px 0 10px' }}>
          {corto && (
            <Nota>Escribe al menos 2 letras: handle, nombre o correo de una persona; título o id de un clip; o el
              usuario de quien consulta.</Nota>
          )}
          {!corto && cargando && <Nota>Buscando…</Nota>}
          {!corto && error && <Nota rojo>{error}</Nota>}
          {hayResultados && !error && ordenadas.length === 0 && (
            <Nota>Nada coincide con «{buscado}».</Nota>
          )}
          {hayResultados && !error && GRUPOS.map(g => {
            const del = filas.filter(f => f.grupo === g.clave)
            if (!del.length) return null
            return (
              <div key={g.clave}>
                <div style={{ padding: '10px 18px 5px', font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.2,
                  textTransform: 'uppercase', color: COLOR.textoSuave }}>{g.titulo}</div>
                {del.map(r => {
                  n++
                  const activa = n === sel
                  const mia = n
                  return (
                    <div key={`${r.grupo}-${r.id}`} id={`res-${r.grupo}-${r.id}`} role="option" aria-selected={activa}
                      onClick={() => ir(r)} onMouseEnter={() => setSel(mia)}
                      style={{
                        cursor: 'pointer', padding: '8px 18px', display: 'flex', alignItems: 'baseline', gap: 10,
                        background: activa ? 'rgba(126,191,179,.1)' : 'transparent',
                        borderLeft: `2px solid ${activa ? COLOR.admin : 'transparent'}`,
                      }}>
                      <span style={{ font: `500 13px/1.35 ${FUENTE.ui}`, color: COLOR.texto,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 250 }}>{r.titulo}</span>
                      <span style={{ flex: 1, minWidth: 0, font: `400 12px/1.35 ${FUENTE.ui}`, color: COLOR.textoSuave,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.detalle}</span>
                      {r.estado && (
                        <span style={{ flex: '0 0 auto', font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1,
                          textTransform: 'uppercase',
                          color: r.grupo === 'personas' ? (COLOR_ESTADO[r.estado] ?? COLOR.textoSuave) : COLOR.textoSuave }}>
                          {r.estado}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

        <div style={{ padding: '8px 18px', borderTop: `1px solid ${LINEA.tenue}`,
          font: `400 11px/1.4 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
          ↑ ↓ para moverte · Enter para abrir · Esc para cerrar
        </div>
      </div>
    </div>
  )
}

function Nota({ children, rojo }: { children: React.ReactNode; rojo?: boolean }) {
  return (
    <div role={rojo ? 'alert' : 'status'} style={{ padding: '14px 18px', font: `400 12px/1.5 ${FUENTE.ui}`,
      color: rojo ? COLOR.error : COLOR.textoSuave }}>{children}</div>
  )
}
