/* Alta masiva de creadoras desde una tabla.
 *
 * Existe porque el asistente de alta va de una en una, con tres pasos y subida
 * de archivos: con cincuenta personas eso es una tarde entera de trabajo
 * mecanico, y el trabajo mecanico es donde se cometen los errores.
 *
 * SE VALIDA TODO ANTES DE CREAR NADA. Las mismas reglas que la base, para que
 * un usuario repetido o una bio de trescientos cinco caracteres se vean en la
 * pantalla y no a mitad del alta numero treinta y siete.
 */
import { useState } from 'react'
import { COLOR, LINEA, FUENTE } from '../lib/diseño'
import {
  leerCSV, validarAlta, handlesExistentes, altaConDocumentos, type FilaAlta,
} from '../lib/admin'
import { Boton } from './piezas'
import SubidaMasiva from './SubidaMasiva'

export default function AltaMasiva() {
  const [filas, setFilas] = useState<FilaAlta[]>([])
  const [archivos, setArchivos] = useState<Map<string, File>>(new Map())
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [avance, setAvance] = useState('')

  const cargarTabla = async (f: File) => {
    setError('')
    try {
      const filas = leerCSV(await f.text())
      if (!filas.length) { setError('El archivo no tiene filas.'); return }
      if (!('handle' in filas[0]) || !('nombre' in filas[0])) {
        setError('Faltan las columnas handle y nombre. Usa la plantilla.')
        return
      }
      setFilas(validarAlta(filas, await handlesExistentes()))
    } catch (e) {
      setError(`No pude leer el archivo: ${(e as Error).message}`)
    }
  }

  const crear = async () => {
    const listas = filas.map((f, i) => ({ f, i })).filter(({ f }) => f.estado === 'lista')
    if (!listas.length || ocupado) return
    setOcupado(true); setError('')
    let hechas = 0
    for (const { f, i } of listas) {
      setAvance(`Creando ${hechas + 1} de ${listas.length}: @${f.handle}`)
      setFilas(x => x.map((y, j) => j === i ? { ...y, estado: 'creando' } : y))
      const r = await altaConDocumentos(f, archivos)
      setFilas(x => x.map((y, j) => j === i ? {
        ...y,
        estado: 'error' in r ? 'fallo' : 'creada',
        detalle: 'error' in r ? r.error! : (r.aviso ?? ''),
      } : y))
      hechas++
    }
    setOcupado(false); setAvance('')
  }

  const cuenta = (e: FilaAlta['estado']) => filas.filter(f => f.estado === e).length
  const listas = cuenta('lista')

  return (
    <>
      <div style={{ font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 2,
        textTransform: 'uppercase', color: COLOR.dinero, marginBottom: 12 }}>
        1 · Dar de alta las creadoras
      </div>

      <div style={{ marginBottom: 18, padding: '12px 14px', border: `1px solid ${LINEA.tenue}`,
        font: `400 11px/1.6 ${FUENTE.ui}`, color: COLOR.textoTenue }}>
        Sube la tabla con <b style={{ color: COLOR.texto }}>handle</b> y{' '}
        <b style={{ color: COLOR.texto }}>nombre</b> como mínimo. Si además trae{' '}
        <code>archivo_identificacion</code> y <code>archivo_consentimiento</code>, elige
        también esos archivos abajo y se emparejan por nombre: así el expediente queda
        cargado y la creadora nace verificada. Sin documentos se crea igual, pero{' '}
        <b style={{ color: '#FFB020' }}>no podrá publicar ni cobrar</b> hasta que se
        carguen.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
        <div style={{ border: `1px dashed ${LINEA.marcada}`, padding: '16px 15px' }}>
          <div style={{ font: `700 9px/1 ${FUENTE.ui}`, letterSpacing: 1.4,
            textTransform: 'uppercase', color: COLOR.textoTenue, marginBottom: 10 }}>
            1 · La tabla
          </div>
          <input type="file" accept=".csv,text/csv"
            onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) cargarTabla(f) }}
            style={{ font: `400 12px/1 ${FUENTE.ui}`, color: COLOR.textoSuave }} />
          <div style={{ marginTop: 8, font: `400 10px/1.4 ${FUENTE.mono}`, color: COLOR.textoApagado }}>
            {filas.length ? `${filas.length} filas leídas` : 'CSV separado por comas'}
          </div>
        </div>

        <div style={{ border: `1px dashed ${LINEA.marcada}`, padding: '16px 15px' }}>
          <div style={{ font: `700 9px/1 ${FUENTE.ui}`, letterSpacing: 1.4,
            textTransform: 'uppercase', color: COLOR.textoTenue, marginBottom: 10 }}>
            2 · Los documentos y fotos
          </div>
          <input type="file" multiple accept="image/*,application/pdf"
            onChange={e => {
              const m = new Map<string, File>()
              for (const f of e.target.files ?? []) m.set(f.name.toLowerCase(), f)
              e.target.value = ''
              setArchivos(m)
            }}
            style={{ font: `400 12px/1 ${FUENTE.ui}`, color: COLOR.textoSuave }} />
          <div style={{ marginTop: 8, font: `400 10px/1.4 ${FUENTE.mono}`, color: COLOR.textoApagado }}>
            {archivos.size ? `${archivos.size} archivos listos` : 'Selecciónalos todos de golpe'}
          </div>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 14, padding: '10px 13px', border: '1px solid #FF4444',
          color: '#FF4444', font: `400 12px/1.45 ${FUENTE.ui}` }}>{error}</div>
      )}

      {filas.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: 16, marginBottom: 14, alignItems: 'center',
            font: `400 12px/1 ${FUENTE.mono}` }}>
            <span style={{ color: COLOR.dinero }}>{listas} listas</span>
            {cuenta('invalida') > 0 && (
              <span style={{ color: '#FF4444' }}>{cuenta('invalida')} con errores</span>
            )}
            {cuenta('creada') > 0 && (
              <span style={{ color: COLOR.admin }}>{cuenta('creada')} creadas</span>
            )}
            {cuenta('fallo') > 0 && (
              <span style={{ color: '#FF4444' }}>{cuenta('fallo')} fallaron</span>
            )}
            <div style={{ flex: 1 }} />
            <Boton tono="primario" activo={listas > 0 && !ocupado} al={crear}>
              {avance || (listas ? `Dar de alta las ${listas}` : 'Nada que crear')}
            </Boton>
          </div>

          <div style={{ border: `1px solid ${LINEA.tenue}`, maxHeight: 460, overflowY: 'auto' }}>
            {filas.map((f, i) => {
              const tieneDocs = !!archivos.get(f.archivo_identificacion.toLowerCase())
                && !!archivos.get(f.archivo_consentimiento.toLowerCase())
              const color = f.estado === 'creada' ? COLOR.dinero
                : f.estado === 'fallo' || f.estado === 'invalida' ? '#FF4444'
                : f.estado === 'creando' ? COLOR.admin : COLOR.textoTenue
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '9px 13px',
                  borderBottom: i < filas.length - 1 ? `1px solid ${LINEA.tenue}` : 'none',
                }}>
                  <span style={{ width: 34, font: `400 10px/1 ${FUENTE.mono}`,
                    color: COLOR.textoApagado }}>{f.linea}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: `400 13px/1.3 ${FUENTE.ui}`, color: COLOR.texto }}>
                      {f.nombre || <i style={{ color: '#FF4444' }}>sin nombre</i>}
                      <span style={{ marginLeft: 8, font: `400 11px/1 ${FUENTE.mono}`,
                        color: COLOR.textoTenue }}>@{f.handle}</span>
                    </div>
                    {(f.errores.length > 0 || f.detalle) && (
                      <div style={{ marginTop: 3, font: `400 11px/1.4 ${FUENTE.ui}`, color }}>
                        {f.errores.join(' · ') || f.detalle}
                      </div>
                    )}
                  </div>
                  {f.estado === 'lista' && (
                    <span style={{ font: `400 10px/1 ${FUENTE.mono}`,
                      color: tieneDocs ? COLOR.dinero : '#FFB020' }}>
                      {tieneDocs ? 'con expediente' : 'sin documentos'}
                    </span>
                  )}
                  <span style={{ font: `700 8px/1.6 ${FUENTE.ui}`, letterSpacing: 1,
                    textTransform: 'uppercase', color, minWidth: 62, textAlign: 'right' }}>
                    {f.estado === 'invalida' ? 'error' : f.estado}
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}

      <SubidaMasiva />
    </>
  )
}
