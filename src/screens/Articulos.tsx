/* Articulos, instrucciones y preguntas: lo que se publica desde el panel.
 *
 * Se leen SOLO con sesion iniciada (decision de Sergio, 12 nov 2026) y detras de la
 * puerta de edad del sitio, como el catalogo. El texto lo escribe administracion;
 * aqui solo se muestra, sin interpretar nada como HTML (ver `TextoArticulo`).
 *
 * El bot de Telegram NO manda el contenido: solo un enlace a `/articulos/<id>`.
 */
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { MarcoDocumento } from '../components/Documento'
import TextoArticulo from '../components/TextoArticulo'
import { Pulsable, Enlace } from '../components/Pulsable'
import { useSesion } from '../lib/sesion'
import {
  TIPOS, nombreTipo, articulosPublicados, articuloPublicado, urlPdf,
  type ArticuloResumen, type ArticuloPublico, type TipoArticulo,
} from '../lib/articulos'
import { COLOR, FUENTE, LINEA, RADIO } from '../lib/diseño'

const etiqueta = { font: `700 11px/1.3 ${FUENTE.ui}`, letterSpacing: 2, textTransform: 'uppercase' as const, color: COLOR.admin }
const fechaLarga = (s: string) => new Date(s).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })

/** Lo que se ve cuando no hay sesion: el articulo no se pide siquiera. */
function PideSesion() {
  return (
    <div style={{ margin: '24px 0', padding: '18px 16px', borderRadius: RADIO.filo, border: `1px solid ${LINEA.marcada}` }}>
      <p style={{ margin: '0 0 14px', font: `400 16px/1.55 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
        Los artículos son para cuentas con sesión iniciada.
      </p>
      <Enlace a="/entrar" className="boton-principal">Entrar</Enlace>
    </div>
  )
}

/* ==================== Lista ==================== */

export default function Articulos() {
  const { sesion, cargando } = useSesion()
  const [filas, setFilas] = useState<ArticuloResumen[] | null>(null)
  const [error, setError] = useState('')
  const [tipo, setTipo] = useState<TipoArticulo | 'todos'>('todos')

  useEffect(() => {
    if (cargando || !sesion) return
    let vivo = true
    articulosPublicados().then(r => {
      if (!vivo) return
      if ('error' in r) setError(r.error); else setFilas(r.filas)
    })
    return () => { vivo = false }
  }, [sesion, cargando])

  const visibles = (filas ?? []).filter(f => tipo === 'todos' || f.tipo === tipo)
  const tiposConContenido = TIPOS.filter(t => (filas ?? []).some(f => f.tipo === t.v))

  return (
    <MarcoDocumento titulo={['Artículos', 'y ayuda']}>
      {!cargando && !sesion && <PideSesion />}
      {sesion && error && (
        <p role="alert" style={{ margin: '24px 0', font: `400 15px/1.5 ${FUENTE.ui}`, color: COLOR.error }}>
          No pudimos cargar los artículos. Intenta de nuevo en un momento.
        </p>
      )}
      {sesion && !error && filas === null && (
        <p style={{ margin: '24px 0', font: `400 15px/1.5 ${FUENTE.ui}`, color: COLOR.textoTenue }}>Cargando…</p>
      )}
      {sesion && filas !== null && filas.length === 0 && (
        <p style={{ margin: '24px 0', font: `400 16px/1.55 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
          Todavía no hay artículos publicados. Vuelve pronto.
        </p>
      )}

      {sesion && filas !== null && filas.length > 0 && (
        <>
          {tiposConContenido.length > 1 && (
            <div role="group" aria-label="Filtrar por tipo" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '18px 0' }}>
              {([{ v: 'todos' as const, t: 'Todo' }, ...tiposConContenido.map(t => ({ v: t.v, t: t.plural }))]).map(o => (
                <Pulsable key={o.v} al={() => setTipo(o.v)} activado={tipo === o.v} style={{
                  minHeight: 44, padding: '0 16px', borderRadius: 999, cursor: 'pointer',
                  font: `700 12px/1 ${FUENTE.ui}`, letterSpacing: 1.2, textTransform: 'uppercase',
                  border: `1px solid ${tipo === o.v ? COLOR.admin : LINEA.marcada}`,
                  color: tipo === o.v ? COLOR.admin : COLOR.textoSuave,
                }}>{o.t}</Pulsable>
              ))}
            </div>
          )}
          <div style={{ display: 'grid', gap: 10, marginTop: tiposConContenido.length > 1 ? 0 : 18 }}>
            {visibles.map(f => (
              <Enlace key={f.id} a={`/articulos/${f.id}`} style={{
                display: 'block', padding: '16px 16px 14px', borderRadius: RADIO.filo,
                border: `1px solid ${LINEA.marcada}`, background: COLOR.superficie, cursor: 'pointer', textDecoration: 'none',
              }}>
                <div style={etiqueta}>{nombreTipo(f.tipo)}{f.tiene_pdf ? ' · PDF' : ''}</div>
                <div style={{ margin: '8px 0 0', font: `700 18px/1.3 ${FUENTE.ui}`, color: COLOR.texto }}>{f.titulo}</div>
                {f.resumen && (
                  <div style={{ margin: '6px 0 0', font: `400 15px/1.5 ${FUENTE.ui}`, color: COLOR.textoSuave }}>{f.resumen}</div>
                )}
              </Enlace>
            ))}
          </div>
        </>
      )}
    </MarcoDocumento>
  )
}

/* ==================== Detalle ==================== */

export function ArticuloDetalle() {
  const { id = '' } = useParams()
  const { sesion, cargando } = useSesion()
  const [a, setA] = useState<ArticuloPublico | null | undefined>(undefined)
  const [error, setError] = useState('')
  const [pdfError, setPdfError] = useState('')

  useEffect(() => {
    if (cargando || !sesion) return
    let vivo = true
    articuloPublicado(id).then(r => {
      if (!vivo) return
      if ('error' in r) setError(r.error); else setA(r.articulo)
    })
    return () => { vivo = false }
  }, [id, sesion, cargando])

  const bajarPdf = async () => {
    if (!a?.pdf_path) return
    setPdfError('')
    const url = await urlPdf(a.pdf_path, `${a.titulo}.pdf`)
    if (!url) { setPdfError('No pudimos abrir el PDF. Intenta de nuevo.'); return }
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <MarcoDocumento titulo={[a ? nombreTipo(a.tipo) : 'Artículo', '']}>
      <div style={{ margin: '4px 0 18px' }}>
        <Enlace a="/articulos" style={{
          display: 'inline-flex', alignItems: 'center', minHeight: 44, cursor: 'pointer',
          font: `700 12px/1 ${FUENTE.ui}`, letterSpacing: 1.6, textTransform: 'uppercase',
          color: COLOR.textoSuave, textDecoration: 'none',
        }}>← Todos los artículos</Enlace>
      </div>
      {!cargando && !sesion && <PideSesion />}
      {sesion && error && (
        <p role="alert" style={{ font: `400 15px/1.5 ${FUENTE.ui}`, color: COLOR.error }}>
          No pudimos cargar el artículo. Intenta de nuevo en un momento.
        </p>
      )}
      {sesion && !error && a === undefined && (
        <p style={{ font: `400 15px/1.5 ${FUENTE.ui}`, color: COLOR.textoTenue }}>Cargando…</p>
      )}
      {sesion && a === null && (
        <p style={{ font: `400 16px/1.55 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
          Este artículo no existe o ya no está disponible.
        </p>
      )}
      {a && (
        <article style={{ paddingBottom: 90 }}>
          <h1 style={{ margin: '0 0 10px', font: `700 28px/1.2 ${FUENTE.ui}`, color: COLOR.texto, overflowWrap: 'anywhere' }}>{a.titulo}</h1>
          <div style={etiqueta}>{fechaLarga(a.publicado_at)}</div>
          {a.resumen && (
            <p style={{ margin: '12px 0 20px', font: `400 18px/1.5 ${FUENTE.ui}`, color: COLOR.texto }}>{a.resumen}</p>
          )}
          <div style={{ marginTop: a.resumen ? 0 : 18 }}><TextoArticulo texto={a.cuerpo} /></div>
          {a.pdf_path && (
            <div style={{ marginTop: 26 }}>
              <Pulsable al={bajarPdf} className="boton-principal">Descargar PDF</Pulsable>
              {pdfError && <p role="alert" style={{ margin: '10px 0 0', font: `400 14px/1.5 ${FUENTE.ui}`, color: COLOR.error }}>{pdfError}</p>}
            </div>
          )}
        </article>
      )}
    </MarcoDocumento>
  )
}
