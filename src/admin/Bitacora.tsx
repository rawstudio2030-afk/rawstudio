/* Modulo 6: bitacora de auditoria.
 *
 * Solo se lee. No hay ni un boton que escriba, y no es por disciplina: la base
 * tiene un disparador que rechaza cualquier UPDATE o DELETE sobre la tabla,
 * asi que aunque alguien llamara a la API a mano, no podria alterarla.
 */
import { useCallback, useEffect, useState } from 'react'
import { COLOR, LINEA, FUENTE } from '../lib/diseño'
import {
  leerBitacora, accionesBitacora,
  type EventoBitacora,
} from '../lib/admin'
import {
  Tabla, Paginador, Boton, Campo, Selector, Etiquetado,
  fechaHora, type Columna,
} from './piezas'

const POR_PAGINA = 50

/** Nombres legibles. Lo que se guarda es la clave; esto es solo presentacion,
 *  y una accion sin traducir se muestra tal cual en vez de esconderse. */
const NOMBRE: Record<string, string> = {
  iniciar_sesion: 'Inició sesión',
  crear_cuenta: 'Creó su cuenta',
  subir_clip: 'Subió un clip',
  suspender: 'Suspendió una cuenta',
  banear: 'Baneó una cuenta',
  reactivar: 'Reactivó una cuenta',
  ajustar_saldo: 'Ajustó saldo',
  otorgar_admin: 'Otorgó administración',
  revocar_admin: 'Revocó administración',
  marcar_creadora: 'Cambió el rol de creadora',
  alta_creadora: 'Dio de alta una creadora',
  publicar_para: 'Publicó por una creadora',
}

/** Las acciones con consecuencias se pintan distinto. Una bitacora donde todo
 *  se ve igual obliga a leerla entera para encontrar lo que importa. */
const GRAVE = new Set(['banear', 'suspender', 'ajustar_saldo', 'otorgar_admin', 'revocar_admin'])

export default function Bitacora() {
  const [filas, setFilas] = useState<EventoBitacora[]>([])
  const [total, setTotal] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [catalogo, setCatalogo] = useState<{ accion: string; cuantas: number }[]>([])

  const [texto, setTexto] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [accion, setAccion] = useState('')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [pagina, setPagina] = useState(0)
  const [abierto, setAbierto] = useState<number | null>(null)

  useEffect(() => {
    const t = setTimeout(() => { setBusqueda(texto); setPagina(0) }, 300)
    return () => clearTimeout(t)
  }, [texto])

  useEffect(() => { accionesBitacora().then(setCatalogo) }, [])

  const cargar = useCallback(async () => {
    setCargando(true)
    const r = await leerBitacora({
      busqueda, accion,
      desde: desde ? new Date(desde).toISOString() : null,
      hasta: hasta ? new Date(hasta).toISOString() : null,
      pagina, porPagina: POR_PAGINA,
    })
    setFilas(r.filas); setTotal(r.total); setError(r.error); setCargando(false)
  }, [busqueda, accion, desde, hasta, pagina])

  useEffect(() => { cargar() }, [cargar])

  const columnas: Columna<EventoBitacora>[] = [
    { clave: 'created_at', titulo: 'Cuándo', ancho: 165,
      pinta: e => <span style={{ font: `400 11px/1.3 ${FUENTE.mono}`, color: COLOR.textoSuave }}>
        {fechaHora(e.created_at)}</span> },
    { clave: 'actor', titulo: 'Quién', ancho: 165,
      pinta: e => e.actor_handle
        ? <span>@{e.actor_handle}</span>
        : <span style={{ color: COLOR.textoApagado }}>—</span> },
    { clave: 'accion', titulo: 'Qué hizo',
      pinta: e => (
        <span style={{ color: GRAVE.has(e.accion) ? '#FFB020' : COLOR.texto }}>
          {NOMBRE[e.accion] ?? e.accion.replace(/_/g, ' ')}
        </span>
      ) },
    { clave: 'objetivo', titulo: 'Sobre quién', ancho: 165,
      pinta: e => e.objetivo_handle && e.objetivo !== e.actor
        ? <span style={{ color: COLOR.textoSuave }}>@{e.objetivo_handle}</span>
        : <span style={{ color: COLOR.textoApagado }}>—</span> },
    { clave: 'ip', titulo: 'IP', ancho: 130,
      pinta: e => e.ip
        ? <span style={{ font: `400 11px/1.3 ${FUENTE.mono}`, color: COLOR.textoSuave }}>{e.ip}</span>
        : <span style={{ font: `400 10px/1.3 ${FUENTE.mono}`, color: COLOR.textoApagado }}
            title="El evento no nació de una petición HTTP, o no había cabeceras">sin IP</span> },
    { clave: 'detalle', titulo: 'Detalle',
      pinta: e => {
        const abierto_ = abierto === e.id
        const txt = JSON.stringify(e.detalle)
        return (
          <span onClick={ev => { ev.stopPropagation(); setAbierto(abierto_ ? null : e.id) }}
            style={{
              font: `400 10px/1.4 ${FUENTE.mono}`, color: COLOR.textoTenue,
              cursor: 'pointer',
              whiteSpace: abierto_ ? 'pre-wrap' : 'nowrap',
              display: 'inline-block',
              maxWidth: abierto_ ? 520 : 260,
              overflow: 'hidden', textOverflow: 'ellipsis', verticalAlign: 'top',
            }}>
            {abierto_ ? JSON.stringify(e.detalle, null, 2) : txt}
          </span>
        )
      } },
  ]

  return (
    <>
      <div style={{
        marginBottom: 14, padding: '9px 12px', border: `1px solid ${LINEA.tenue}`,
        font: `400 11px/1.5 ${FUENTE.ui}`, color: COLOR.textoTenue,
      }}>
        Registro inmutable. La base rechaza cualquier intento de editarlo o borrarlo,
        venga de donde venga.
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 16 }}>
        <Etiquetado texto="Buscar" ancho={260} hijo={
          <Campo valor={texto} cambia={setTexto} marcador="Persona, acción, IP o detalle" />
        } />
        <Etiquetado texto="Acción" hijo={
          <Selector valor={accion} cambia={v => { setAccion(v); setPagina(0) }} opciones={[
            { v: '', t: `Todas (${catalogo.reduce((s, c) => s + Number(c.cuantas), 0)})` },
            ...catalogo.map(c => ({
              v: c.accion, t: `${NOMBRE[c.accion] ?? c.accion} (${c.cuantas})`,
            })),
          ]} />
        } />
        <Etiquetado texto="Desde" hijo={
          <Campo tipo="date" valor={desde} cambia={v => { setDesde(v); setPagina(0) }} mono />
        } />
        <Etiquetado texto="Hasta" hijo={
          <Campo tipo="date" valor={hasta} cambia={v => { setHasta(v); setPagina(0) }} mono />
        } />
        <div style={{ flex: 1 }} />
        {(busqueda || accion || desde || hasta) && (
          <Boton al={() => {
            setTexto(''); setAccion(''); setDesde(''); setHasta(''); setPagina(0)
          }}>Limpiar</Boton>
        )}
      </div>

      {error && (
        <div style={{
          marginBottom: 14, padding: '10px 13px', border: '1px solid #FF4444',
          color: '#FF4444', font: `400 12px/1.4 ${FUENTE.ui}`,
        }}>{error}</div>
      )}

      <div style={{ opacity: cargando ? .5 : 1, transition: 'opacity .15s' }}>
        <Tabla columnas={columnas} filas={filas} clave={e => String(e.id)}
          vacia={cargando ? 'Cargando…' : 'No hay eventos con ese filtro'} />
      </div>

      <Paginador pagina={pagina} porPagina={POR_PAGINA} total={total} cambia={setPagina} />
    </>
  )
}
