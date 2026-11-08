/* Consultas por Telegram: consola de SOLO LECTURA.
 *
 * Sirve para saber si el servicio funciona —si las creadoras contestan, si hay
 * mensajes que vencen sin respuesta— sin entrar a Telegram. Aqui no se responde,
 * no se cobra ni se reembolsa nada: las respuestas se escriben en Telegram.
 *
 * PRIVACIDAD. Las funciones de la base nunca devuelven chat_id, telefono ni token:
 * de cada parte solo llega el usuario publico de la app, o nada si la cuenta se
 * anonimizo (se pinta «Cuenta eliminada»). Esta pantalla no tiene a donde
 * mostrar un dato de contacto porque el dato no llega.
 *
 * Solo aparece lo que SI se envio: el bot valida el mensaje (minimo de palabras,
 * pertinencia) antes de registrarlo, y los rechazados no se guardan.
 */
import { useCallback, useEffect, useState } from 'react'
import { COLOR, LINEA, FUENTE } from '../lib/diseño'
import { cuantos } from '../lib/plural'
import {
  listarConsultas, mensajesDeConsulta,
  type FilaConsulta, type MensajeConsulta, type FiltroConsultas,
} from '../lib/admin'
import {
  Tabla, Paginador, Boton, Campo, Selector, Etiquetado, Insignia,
  fechaHora, desde, type Columna,
} from './piezas'
import { useEscape } from '../lib/teclado'

const POR_PAGINA = 25
const ROJO = '#FF4444'

const quien = (handle: string | null) => (handle ? `@${handle}` : 'Cuenta eliminada')

export default function Consultas() {
  const [filas, setFilas] = useState<FilaConsulta[]>([])
  const [total, setTotal] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const [filtro, setFiltro] = useState<FiltroConsultas>('todas')
  const [texto, setTexto] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [pagina, setPagina] = useState(0)
  const [abierta, setAbierta] = useState<FilaConsulta | null>(null)

  // Espera a que dejes de escribir: sin esto cada tecla dispara una consulta.
  useEffect(() => {
    const t = setTimeout(() => { setBusqueda(texto); setPagina(0) }, 300)
    return () => clearTimeout(t)
  }, [texto])

  const cargar = useCallback(async () => {
    setCargando(true)
    const r = await listarConsultas(filtro, busqueda, pagina, POR_PAGINA)
    setFilas(r.filas); setTotal(r.total); setError(r.error); setCargando(false)
  }, [filtro, busqueda, pagina])

  useEffect(() => { cargar() }, [cargar])

  const columnas: Columna<FilaConsulta>[] = [
    { clave: 'estado', titulo: 'Estado', ancho: 150,
      pinta: f => f.vencidos > 0
        ? <Insignia texto={f.sin_responder > 0 ? 'Vencida + espera' : 'Venció sin respuesta'} color={ROJO} />
        : f.sin_responder > 0
          ? <Insignia texto="Esperando respuesta" color={COLOR.acento} />
          : <Insignia texto="Al día" color={COLOR.dinero} /> },
    { clave: 'creadora', titulo: 'Creadora',
      pinta: f => <span style={{ color: f.creadora_handle ? COLOR.texto : COLOR.textoSuave }}>{quien(f.creadora_handle)}</span> },
    { clave: 'cliente', titulo: 'Quien consulta',
      pinta: f => <span style={{ color: f.otra_handle ? COLOR.texto : COLOR.textoSuave }}>{quien(f.otra_handle)}</span> },
    { clave: 'clip', titulo: 'Clip',
      pinta: f => <span style={{ display: 'inline-block', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', verticalAlign: 'bottom' }}>{f.clip_titulo}</span> },
    { clave: 'mensajes', titulo: 'Mensajes', numerica: true, pinta: f => f.mensajes },
    { clave: 'ultimo', titulo: 'Último mensaje',
      pinta: f => (
        <span title={f.ultimo_texto} style={{ display: 'inline-block', maxWidth: 260 }}>
          <span style={{ color: COLOR.textoSuave }}>{f.ultimo_de === 'cliente' ? 'Cliente' : 'Creadora'} · {desde(f.ultimo_at)}</span>
        </span>
      ) },
  ]

  const hayFiltro = !!(busqueda || filtro !== 'todas')

  return (
    <>
      <div style={{
        marginBottom: 16, padding: '10px 13px', border: `1px solid ${LINEA.suave}`,
        font: `400 12px/1.5 ${FUENTE.ui}`, color: COLOR.textoSuave,
      }}>
        Solo lectura. Aquí se ve si las consultas por Telegram se están atendiendo; las respuestas se
        escriben en Telegram. No se muestran teléfonos ni datos de contacto. Los mensajes que el bot
        rechaza al validarlos (muy cortos o fuera de tema) no se guardan, así que no aparecen.
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 16 }}>
        <Etiquetado texto="Buscar" ancho={280} hijo={
          <Campo valor={texto} cambia={setTexto} marcador="@creadora, @cliente o título del clip" />
        } />
        <Etiquetado texto="Mostrar" hijo={
          <Selector valor={filtro} cambia={v => { setFiltro(v); setPagina(0) }} opciones={[
            { v: 'todas' as const, t: 'Todas' },
            { v: 'esperando' as const, t: 'Esperando respuesta' },
            { v: 'vencidas' as const, t: 'Con mensajes vencidos' },
          ]} />
        } />
        <div style={{ flex: 1 }} />
        {hayFiltro && (
          <Boton al={() => { setTexto(''); setFiltro('todas'); setPagina(0) }}>Limpiar filtros</Boton>
        )}
      </div>

      {error && (
        <div role="alert" style={{
          marginBottom: 14, padding: '10px 13px', border: `1px solid ${ROJO}`,
          color: ROJO, font: `400 12px/1.45 ${FUENTE.ui}`,
        }}>{error}</div>
      )}

      <div style={{ opacity: cargando ? .5 : 1, transition: 'opacity .15s' }}>
        <Tabla columnas={columnas} filas={filas} clave={f => f.id}
          alElegir={setAbierta} elegida={abierta?.id}
          vacia={cargando ? 'Cargando…'
            : hayFiltro ? 'Ninguna consulta cumple ese filtro'
            : 'Todavía no hay consultas por Telegram. Aparecen aquí cuando alguien escribe a una creadora.'} />
      </div>

      <Paginador pagina={pagina} porPagina={POR_PAGINA} total={total} cambia={setPagina} />

      {abierta && <Hilo fila={abierta} cierra={() => setAbierta(null)} />}
    </>
  )
}

/* ---------- Conversacion (panel lateral, solo lectura) ---------- */

const ESTADO_MENSAJE: Record<MensajeConsulta['estado'], { t: string; c: string }> = {
  enviado:    { t: 'Esperando respuesta', c: COLOR.acento },
  respondido: { t: 'Respondido',          c: COLOR.dinero },
  vencido:    { t: 'Venció sin respuesta', c: ROJO },
}

function Hilo({ fila, cierra }: { fila: FilaConsulta; cierra: () => void }) {
  const [mensajes, setMensajes] = useState<MensajeConsulta[] | null>(null)
  const [error, setError] = useState('')
  useEscape(true, cierra)

  useEffect(() => {
    let vivo = true
    mensajesDeConsulta(fila.id).then(r => {
      if (!vivo) return
      setMensajes(r.mensajes); setError(r.error)
    })
    return () => { vivo = false }
  }, [fila.id])

  return (
    <div onClick={cierra} style={{
      position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(8,8,10,.6)',
      display: 'flex', justifyContent: 'flex-end',
    }}>
      <aside onClick={e => e.stopPropagation()} aria-label="Conversación de la consulta" style={{
        width: 520, height: '100vh', overflowY: 'auto', boxSizing: 'border-box',
        background: COLOR.superficie, borderLeft: `1px solid ${LINEA.fuerte}`,
        padding: '22px 24px 50px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ font: `700 18px/1.25 ${FUENTE.ui}` }}>{fila.clip_titulo}</div>
            <div style={{ marginTop: 6, font: `400 12px/1.5 ${FUENTE.mono}`, color: COLOR.textoSuave }}>
              Creadora: {quien(fila.creadora_handle)}<br />
              Consulta: {quien(fila.otra_handle)}
            </div>
          </div>
          <Boton chico al={cierra}>Cerrar</Boton>
        </div>

        <div style={{ marginTop: 14, font: `400 11px/1.5 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
          Solo lectura. {cuantos(fila.mensajes, 'mensaje')} guardados; no se muestran datos de contacto.
        </div>

        {error && (
          <div role="alert" style={{ marginTop: 14, padding: '10px 13px', border: `1px solid ${ROJO}`,
            color: ROJO, font: `400 12px/1.45 ${FUENTE.ui}` }}>{error}</div>
        )}
        {!mensajes && !error && (
          <div style={{ marginTop: 20, color: COLOR.textoSuave, font: `400 12px/1 ${FUENTE.ui}` }}>Cargando…</div>
        )}

        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(mensajes ?? []).map(m => {
            const delCliente = m.de === 'cliente'
            const e = ESTADO_MENSAJE[m.estado]
            return (
              <div key={m.id} style={{
                alignSelf: delCliente ? 'flex-start' : 'flex-end', maxWidth: '88%',
                padding: '10px 12px', background: COLOR.fondo,
                border: `1px solid ${delCliente ? LINEA.suave : COLOR.admin + '66'}`,
              }}>
                <div style={{ font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.2, textTransform: 'uppercase',
                  color: delCliente ? COLOR.textoSuave : COLOR.admin }}>
                  {delCliente ? `Consulta · ${quien(fila.otra_handle)}` : `Creadora · ${quien(fila.creadora_handle)}`}
                </div>
                <div style={{ marginTop: 7, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere',
                  font: `400 13px/1.5 ${FUENTE.ui}`, color: COLOR.texto }}>{m.cuerpo}</div>
                <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
                  font: `400 11px/1 ${FUENTE.mono}`, color: COLOR.textoSuave }}>
                  <span>{fechaHora(m.created_at)}</span>
                  <span>· {cuantos(m.palabras, 'palabra')}</span>
                  {delCliente && <Insignia texto={e.t} color={e.c} />}
                </div>
                {delCliente && m.estado === 'enviado' && m.vence_at && (
                  <div style={{ marginTop: 6, font: `400 11px/1.4 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
                    Vence el {fechaHora(m.vence_at)}
                  </div>
                )}
                {delCliente && m.estado === 'vencido' && m.vence_at && (
                  <div style={{ marginTop: 6, font: `400 11px/1.4 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
                    Venció el {fechaHora(m.vence_at)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </aside>
    </div>
  )
}
