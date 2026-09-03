/* Carga masiva de expedientes: una carpeta por creadora.
 *
 * Es el cuello de botella real del alta en volumen. Dar de alta cincuenta
 * creadoras toma un CSV; subir sus documentos de uno en uno toma una tarde, y
 * sin documentos no hay verificacion, sin verificacion no se aprueba nada y
 * sin aprobar no se ve nada. Esta pantalla no cambia ninguna regla: sube los
 * mismos dos archivos por la misma funcion que el alta de una sola, cincuenta
 * veces seguidas.
 *
 * Lo unico que agrega es desconfianza: enseña que archivo va a quedar como
 * identificacion y cual como consentimiento ANTES de subir nada, marca las
 * que adivino por orden alfabetico, y avisa si el mismo archivo aparece en dos
 * expedientes. Un expediente completo enciende la verificacion solo —lo hace
 * un disparador en la base—, asi que equivocarse aqui no se nota despues.
 */
import { useCallback, useEffect, useState } from 'react'
import { COLOR, LINEA, FUENTE } from '../lib/diseño'
import {
  creadorasGestionables, agruparExpedientes, agruparExpedientesDeTabla,
  documentosRepetidos, subirExpediente, leerCSV,
  type ExpedienteEnLote,
} from '../lib/admin'
import { Boton } from './piezas'

export default function ExpedientesMasivos() {
  const [lote, setLote] = useState<ExpedienteEnLote[]>([])
  const [creadoras, setCreadoras] = useState<
    { id: string; handle: string; verificada: boolean }[]>([])
  const [choques, setChoques] = useState<string[]>([])
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [avance, setAvance] = useState('')
  const [sueltos, setSueltos] = useState<Map<string, File>>(new Map())

  const cargarCreadoras = useCallback(async () => {
    const r = await creadorasGestionables('')
    setCreadoras(r.filas.map(c => ({ id: c.id, handle: c.handle, verificada: c.verificada })))
  }, [])
  useEffect(() => { cargarCreadoras() }, [cargarCreadoras])

  const elegirCarpeta = (fs: FileList | null) => {
    if (!fs) return
    const l = agruparExpedientes([...fs], creadoras)
    setLote(l); setChoques(documentosRepetidos(l))
    setError(l.length ? '' : 'No encontré subcarpetas con documentos en esa carpeta.')
  }

  /* Segunda via: una tabla que dice de quien es cada archivo, y los archivos
     sueltos. Los documentos casi nunca llegan ya ordenados en una carpeta por
     persona; llegan de un formulario, con nombres que no dicen de quien son.
     Con la tabla no hay nada que adivinar. */
  const cargarTabla = async (f: File) => {
    try {
      const filas = leerCSV(await f.text())
      if (!filas.length) { setError('La tabla no tiene filas.'); return }
      if (!('handle' in filas[0])) {
        setError('A la tabla le falta la columna «handle».'); return
      }
      if (!sueltos.size) {
        setError('Primero elige los archivos: la tabla dice sus nombres, pero los archivos hay que mandarlos.')
        return
      }
      const l = agruparExpedientesDeTabla(filas, sueltos, creadoras)
      setLote(l); setChoques(documentosRepetidos(l)); setError('')
    } catch (e) {
      setError(`No pude leer la tabla: ${(e as Error).message}`)
    }
  }

  const subir = async () => {
    const listos = lote.map((e, i) => ({ e, i })).filter(({ e }) => e.estado === 'espera')
    if (!listos.length || ocupado) return
    setOcupado(true); setError('')
    for (const { e, i } of listos) {
      setLote(x => x.map((y, j) => j === i ? { ...y, estado: 'subiendo' } : y))
      setAvance(e.carpeta)
      // En fila: son cincuenta pares de archivos y en paralelo se estorban.
      const r = await subirExpediente(
        e.creadora!, e.identificacion!, e.consentimiento!, e.fecha || undefined)
      setLote(x => x.map((y, j) => j === i ? {
        ...y,
        estado: 'error' in r ? 'fallo' : 'listo',
        detalle: 'error' in r ? r.error!
          : r.verificada ? 'verificada' : 'cargado, sin verificar',
      } : y))
    }
    setOcupado(false); setAvance('')
    await cargarCreadoras()
  }

  const cuenta = (e: ExpedienteEnLote['estado']) => lote.filter(x => x.estado === e).length
  const porSubir = cuenta('espera')
  const adivinadas = lote.filter(e => e.adivinado && e.estado === 'espera').length

  return (
    <div style={{ marginTop: 34, paddingTop: 26, borderTop: `1px solid ${LINEA.tenue}` }}>
      <div style={{ font: `700 12px/1 ${FUENTE.ui}`, letterSpacing: 1.6,
        textTransform: 'uppercase', color: COLOR.texto, marginBottom: 8 }}>
        Expedientes por carpeta
      </div>
      <p style={{ margin: '0 0 14px', font: `400 12px/1.6 ${FUENTE.ui}`, color: COLOR.textoTenue,
        maxWidth: 720 }}>
        Una subcarpeta por creadora, con el nombre de usuario, y dentro sus dos documentos:
        la identificación y el consentimiento firmado. Reconozco los nombres que traigan
        «ine», «id» o «pasaporte» y «consentimiento», «acuerdo» o «2257»; si no dicen nada
        y hay exactamente dos archivos, los reparto por orden alfabético y te lo marco.
        Se aceptan jpg, png, webp y pdf, hasta 12 MB cada uno.
      </p>

      <label style={{ display: 'inline-block' }}>
        <input type="file" multiple
          // @ts-expect-error -- atributo no estandar, es el unico modo de
          // pedir una carpeta entera y quedarse con el nombre de cada una.
          webkitdirectory="" directory=""
          onChange={e => { elegirCarpeta(e.target.files); e.target.value = '' }}
          style={{ display: 'none' }} />
        <span style={{
          display: 'inline-block', padding: '11px 16px', cursor: 'pointer',
          border: `1px solid ${COLOR.admin}`, color: COLOR.admin,
          font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 1.6, textTransform: 'uppercase',
        }}>Elegir carpeta de expedientes</span>
      </label>

      <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px dashed ${LINEA.tenue}` }}>
        <div style={{ font: `400 12px/1.6 ${FUENTE.ui}`, color: COLOR.textoTenue,
          marginBottom: 10, maxWidth: 720 }}>
          <b style={{ color: COLOR.textoSuave }}>O con una tabla</b>, si los documentos no
          están ordenados por carpeta. Columnas: <code>handle</code>,{' '}
          <code>archivo_identificacion</code>, <code>archivo_consentimiento</code> y,
          opcional, <code>fecha_consentimiento</code> como AAAA-MM-DD. Elige primero los
          archivos —todos de golpe, da igual el orden— y luego la tabla.
        </div>
        <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div>
            <div style={{ font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.4,
              textTransform: 'uppercase', color: COLOR.textoTenue, marginBottom: 7 }}>
              1 · Los archivos
            </div>
            <input type="file" multiple accept="image/*,application/pdf"
              onChange={e => {
                const m = new Map<string, File>()
                for (const f of e.target.files ?? []) m.set(f.name.toLowerCase(), f)
                e.target.value = ''
                setSueltos(m)
              }}
              style={{ font: `400 12px/1 ${FUENTE.ui}`, color: COLOR.textoSuave }} />
            <div style={{ marginTop: 6, font: `400 10px/1.4 ${FUENTE.mono}`, color: COLOR.textoApagado }}>
              {sueltos.size ? `${sueltos.size} archivos listos` : 'ninguno todavía'}
            </div>
          </div>
          <div>
            <div style={{ font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.4,
              textTransform: 'uppercase', color: COLOR.textoTenue, marginBottom: 7 }}>
              2 · La tabla
            </div>
            <input type="file" accept=".csv,text/csv"
              onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) cargarTabla(f) }}
              style={{ font: `400 12px/1 ${FUENTE.ui}`, color: COLOR.textoSuave }} />
          </div>
        </div>
      </div>

      {error && <Aviso tono={COLOR.acento}>{error}</Aviso>}

      {choques.length > 0 && (
        <Aviso tono={COLOR.acento}>
          <b>El mismo archivo está en dos expedientes.</b> Revísalo antes de subir: dejaría
          una constancia de identidad respaldada por el documento de otra persona.
          <div style={{ marginTop: 6 }}>{choques.slice(0, 5).map(c => <div key={c}>{c}</div>)}</div>
        </Aviso>
      )}

      {adivinadas > 0 && (
        <Aviso tono={COLOR.dinero}>
          En {adivinadas} {adivinadas === 1 ? 'carpeta' : 'carpetas'} los nombres de archivo no
          dicen cuál documento es cuál, así que los repartí por orden alfabético. Están
          marcadas abajo con <b>?</b> — compruébalas antes de subir.
        </Aviso>
      )}

      {lote.length > 0 && (
        <>
          <div style={{ margin: '16px 0 10px', font: `400 12px/1.6 ${FUENTE.mono}`,
            color: COLOR.textoSuave }}>
            {lote.length} carpetas · {porSubir} por subir · {cuenta('ya')} ya verificadas ·{' '}
            {cuenta('sin_creadora') + cuenta('incompleto')} con problema
            {cuenta('listo') > 0 && ` · ${cuenta('listo')} cargadas`}
            {cuenta('fallo') > 0 && ` · ${cuenta('fallo')} fallaron`}
          </div>

          <div style={{ overflowX: 'auto', border: `1px solid ${LINEA.tenue}` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse',
              font: `400 12px/1.5 ${FUENTE.ui}` }}>
              <thead>
                <tr>{['Creadora', 'Identificación', 'Consentimiento', 'Estado'].map(t => (
                  <th key={t} style={{ textAlign: 'left', padding: '9px 12px',
                    borderBottom: `1px solid ${LINEA.tenue}`, color: COLOR.textoTenue,
                    font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.4,
                    textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{t}</th>
                ))}</tr>
              </thead>
              <tbody>
                {lote.map(e => (
                  <tr key={e.carpeta} style={{ borderBottom: `1px solid ${LINEA.tenue}` }}>
                    <td style={celda}>
                      <span style={{ fontFamily: FUENTE.mono }}>{e.carpeta}</span>
                      {e.adivinado && e.estado === 'espera' && (
                        <span title="El reparto salió del orden alfabético" style={{
                          marginLeft: 7, color: COLOR.dinero, fontWeight: 700 }}>?</span>
                      )}
                    </td>
                    <td style={{ ...celda, color: COLOR.textoSuave }}>
                      {e.identificacion?.name ?? '—'}
                    </td>
                    <td style={{ ...celda, color: COLOR.textoSuave }}>
                      {e.consentimiento?.name ?? '—'}
                    </td>
                    <td style={{ ...celda, color: colorDe(e.estado) }}>
                      {etiqueta(e.estado)}
                      {e.detalle && (
                        <div style={{ color: COLOR.textoTenue, font: `400 11px/1.45 ${FUENTE.ui}` }}>
                          {e.detalle}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
            <Boton al={subir} activo={!!porSubir && !ocupado} tono="primario">
              {ocupado ? 'Subiendo…' : `Subir ${porSubir} ${porSubir === 1 ? 'expediente' : 'expedientes'}`}
            </Boton>
            {avance && (
              <span style={{ font: `400 12px/1 ${FUENTE.mono}`, color: COLOR.textoTenue }}>
                {avance}
              </span>
            )}
          </div>

          <p style={{ marginTop: 12, font: `400 11px/1.6 ${FUENTE.ui}`, color: COLOR.textoTenue,
            maxWidth: 720 }}>
            Con los dos documentos cargados la verificación se enciende sola. Los clips que
            ya estén subidos <b>no</b> aparecen por eso: siguen pendientes de moderación
            hasta que los apruebes en Moderación.
          </p>
        </>
      )}
    </div>
  )
}

const celda: React.CSSProperties = { padding: '9px 12px', verticalAlign: 'top' }

function colorDe(e: ExpedienteEnLote['estado']) {
  return e === 'listo' ? COLOR.dinero
    : e === 'fallo' || e === 'sin_creadora' || e === 'incompleto' ? COLOR.acento
    : e === 'ya' ? COLOR.textoTenue
    : COLOR.textoSuave
}

function etiqueta(e: ExpedienteEnLote['estado']) {
  return e === 'espera' ? 'Por subir'
    : e === 'subiendo' ? 'Subiendo…'
    : e === 'listo' ? 'Cargado'
    : e === 'fallo' ? 'Falló'
    : e === 'sin_creadora' ? 'Sin creadora'
    : e === 'ya' ? 'Ya verificada'
    : 'Incompleto'
}

function Aviso({ tono, children }: { tono: string; children: React.ReactNode }) {
  return (
    <div style={{
      marginTop: 12, padding: '10px 13px', borderLeft: `2px solid ${tono}`,
      font: `400 12px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave, maxWidth: 720,
    }}>{children}</div>
  )
}
