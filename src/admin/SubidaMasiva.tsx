/* Subida masiva de videos: una carpeta por creadora.
 *
 * El navegador conserva el nombre de la carpeta en webkitRelativePath cuando
 * se elige un directorio completo, asi que "nocturna/clip.mp4" basta para
 * saber a quien pertenece. No hace falta escribir la correspondencia a mano.
 *
 * Solo se empareja contra creadoras CON EXPEDIENTE: son las mismas a las que
 * las politicas de almacenamiento permiten escribirles, asi que emparejar con
 * otras seria prometer una subida que despues falla.
 */
import { useCallback, useEffect, useState } from 'react'
import { cuantos, palabra } from '../lib/plural'
import { COLOR, LINEA, FUENTE } from '../lib/diseño'
import {
  creadorasGestionables, agruparVideos, aplicarCatalogo, publicarPara, leerCSV,
  type VideoEnLote,
} from '../lib/admin'
import { usd } from '../lib/dinero'
import { errorTamanoVideo } from '../lib/clips'
import { Boton } from './piezas'
import BarraSubida from '../components/BarraSubida'
import { tamanoLegible } from '../lib/tamanos'
import { useSubida } from '../lib/useSubida'

export default function SubidaMasiva() {
  const [lote, setLote] = useState<VideoEnLote[]>([])
  const [creadoras, setCreadoras] = useState<
    { id: string; handle: string; verificada: boolean; nombre: string }[]>([])
  const [aviso, setAviso] = useState('')
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const sub = useSubida()
  const [nota, setNota] = useState('')
  const [globalLote, setGlobalLote] = useState<{ hechos: number; total: number } | null>(null)

  const cargarCreadoras = useCallback(async () => {
    const r = await creadorasGestionables('')
    setCreadoras(r.filas.map(c => ({
      id: c.id, handle: c.handle, verificada: c.verificada, nombre: c.nombre,
    })))
  }, [])
  useEffect(() => { cargarCreadoras() }, [cargarCreadoras])

  const elegirCarpeta = (fs: FileList | null) => {
    if (!fs) return
    const todos = [...fs]
    // Los que pasan de 2 GB se dejan fuera al elegir, antes de transferir nada.
    const grandes = todos.filter(a => errorTamanoVideo(a.size) && /\.(mp4|mov|webm|m4v)$/i.test(a.name))
    const l = agruparVideos(todos.filter(a => !errorTamanoVideo(a.size)), creadoras)
    setLote(l); setAviso('')
    if (!l.length) setError('No encontré videos en esa carpeta (busco .mp4, .mov, .webm y .m4v).')
    else setError('')
    if (grandes.length) {
      setError(e => (e ? e + ' ' : '') + `${cuantos(grandes.length, 'video')} se ${palabra(grandes.length, 'omitió', 'omitieron')} por pasar de 2 GB: ` +
        grandes.slice(0, 4).map(a => `${a.name} (${tamanoLegible(a.size)})`).join(', ') +
        (grandes.length > 4 ? ` y ${grandes.length - 4} más.` : '.'))
    }
  }

  const cargarCatalogo = async (f: File) => {
    try {
      const filas = leerCSV(await f.text())
      if (!filas.length || !('archivo' in filas[0])) {
        setError('El catálogo necesita al menos una columna "archivo".')
        return
      }
      const r = aplicarCatalogo(lote, filas)
      setLote(r.lote); setError('')
      setAviso(`${r.emparejados} de ${cuantos(filas.length, 'fila')} del catálogo se ${palabra(filas.length, 'aplicó', 'aplicaron')}.` +
        (r.huerfanos.length
          ? ` No encontré estos archivos: ${r.huerfanos.slice(0, 4).join(', ')}` +
            (r.huerfanos.length > 4 ? ` y ${r.huerfanos.length - 4} más.` : '')
          : ''))
    } catch (e) {
      setError(`No pude leer el catálogo: ${(e as Error).message}`)
    }
  }

  const subir = async () => {
    const listos = lote.map((v, i) => ({ v, i })).filter(({ v }) => v.creadora && v.estado !== 'listo')
    if (!listos.length || ocupado) return
    setOcupado(true); setError('')
    let n = 0
    // En fila y no en paralelo: son archivos grandes, y varias subidas a la
    // vez se roban el ancho de banda entre ellas.
    for (const { v, i } of listos) {
      n++
      setGlobalLote({ hechos: n - 1, total: listos.length })
      // Barra por archivo (bytes del video) + la linea del lote («archivo 3 de 12»).
      setNota(`${v.carpeta}/${v.titulo} · archivo ${n} de ${listos.length}`)
      setLote(x => x.map((y, j) => j === i ? { ...y, estado: 'subiendo', detalle: '' } : y))
      const senal = sub.empezar()
      const r = await publicarPara(
        { creadora: v.creadora!, titulo: v.titulo, video: v.archivo, portada: null,
          descripcion: v.descripcion, precio: v.precio, visibilidad: v.visibilidad,
          nombreCreadora: v.nombreCreadora },
        sub.desdePublicar, { signal: senal },
      )
      if ('error' in r && r.cancelada) {
        // Cancelar detiene TODO el lote: lo ya subido se queda, el resto sigue por subir.
        setLote(x => x.map((y, j) => j === i
          ? { ...y, estado: 'espera', detalle: 'Cancelado. Vuelve a subir el lote para continuar.' } : y))
        break
      }
      setLote(x => x.map((y, j) => j === i ? {
        ...y,
        estado: 'error' in r ? 'fallo' : 'listo',
        detalle: 'error' in r ? r.error! : '',
      } : y))
    }
    sub.terminar(); setNota(''); setGlobalLote(null); setOcupado(false)
  }

  const cuenta = (e: VideoEnLote['estado']) => lote.filter(v => v.estado === e).length
  const porSubir = lote.filter(v => v.creadora && v.estado !== 'listo').length
  const carpetas = [...new Set(lote.map(v => v.carpeta))]
  const sinCreadora = [...new Set(lote.filter(v => !v.creadora).map(v => v.carpeta))]

  return (
    <div style={{ marginTop: 30, borderTop: `1px solid ${LINEA.suave}`, paddingTop: 24 }}>
      <div style={{ font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 2.2,
        textTransform: 'uppercase', color: COLOR.dinero, marginBottom: 12 }}>
        2 · Subir sus videos
      </div>

      <div style={{ marginBottom: 16, padding: '12px 14px', border: `1px solid ${LINEA.tenue}`,
        font: `400 11px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
        Elige la carpeta que contiene una subcarpeta por creadora. El nombre de cada
        subcarpeta tiene que coincidir con su <b style={{ color: COLOR.texto }}>usuario</b>{' '}
        en la plataforma. El título de cada clip sale del nombre del archivo, y la portada
        se saca del propio video.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
        <div style={{ border: `1px dashed ${LINEA.marcada}`, padding: '16px 15px' }}>
          <div style={{ font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.2,
            textTransform: 'uppercase', color: COLOR.textoSuave, marginBottom: 10 }}>
            La carpeta con los videos
          </div>
          <input type="file" multiple
            ref={el => { if (el) el.setAttribute('webkitdirectory', '') }}
            onChange={e => { elegirCarpeta(e.target.files); e.target.value = '' }}
            style={{ font: `400 12px/1 ${FUENTE.ui}`, color: COLOR.textoSuave }} />
          <div style={{ marginTop: 8, font: `400 11px/1.45 ${FUENTE.mono}`, color: COLOR.textoSuave }}>
            {lote.length
              ? `${cuantos(lote.length, 'video')} en ${cuantos(carpetas.length, 'carpeta')}`
              : 'mp4, mov, webm o m4v'}
          </div>
        </div>

        <div style={{ border: `1px dashed ${LINEA.marcada}`, padding: '16px 15px' }}>
          <div style={{ font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.2,
            textTransform: 'uppercase', color: COLOR.textoSuave, marginBottom: 10 }}>
            Catálogo de títulos · opcional
          </div>
          <input type="file" accept=".csv,text/csv"
            onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) cargarCatalogo(f) }}
            style={{ font: `400 12px/1 ${FUENTE.ui}`, color: COLOR.textoSuave }} />
          <div style={{ marginTop: 8, font: `400 11px/1.45 ${FUENTE.mono}`, color: COLOR.textoSuave }}>
            archivo, titulo, descripcion, precio, visibilidad
          </div>
          <div style={{ marginTop: 8, font: `400 12px/1.5 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
            Si el catálogo no trae precio, cada video sale a 10, 20 o 40 dólares, al azar. Si lo
            trae, se respeta tal cual; un video «gratis» queda en $0.00.
          </div>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 14, padding: '10px 13px', border: '1px solid #FF4444',
          color: '#FF4444', font: `400 12px/1.45 ${FUENTE.ui}` }}>{error}</div>
      )}
      {aviso && (
        <div style={{ marginBottom: 14, padding: '10px 13px', border: `1px solid ${COLOR.dinero}`,
          color: COLOR.dinero, font: `400 12px/1.45 ${FUENTE.ui}` }}>{aviso}</div>
      )}

      {sinCreadora.length > 0 && (
        <div style={{ marginBottom: 14, padding: '11px 13px', border: '1px solid #FFB020',
          font: `400 12px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
          <b style={{ color: '#FFB020' }}>{sinCreadora.length} carpetas sin creadora:</b>{' '}
          {sinCreadora.slice(0, 6).join(', ')}
          {sinCreadora.length > 6 && ` y ${sinCreadora.length - 6} más`}.
          <div style={{ marginTop: 6, color: COLOR.textoSuave }}>
            Dales de alta arriba con ese mismo usuario, o renombra la carpeta. Sus videos
            se omiten.
          </div>
        </div>
      )}

      {lote.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 12,
            font: `400 12px/1 ${FUENTE.mono}` }}>
            <span style={{ color: COLOR.dinero }}>{porSubir} por subir</span>
            {cuenta('no_publica') > 0 && (
              <span style={{ color: '#FFB020' }}>
                {cuenta('no_publica')} quedarán pendientes
              </span>
            )}
            {cuenta('listo') > 0 && (
              <span style={{ color: COLOR.admin }}>{cuenta('listo')} subidos</span>
            )}
            {cuenta('fallo') > 0 && (
              <span style={{ color: '#FF4444' }}>{cuenta('fallo')} fallaron</span>
            )}
            <div style={{ flex: 1 }} />
            <Boton tono="primario" activo={porSubir > 0 && !ocupado} al={subir}>
              {ocupado ? 'Subiendo…' : (porSubir ? `Subir los ${porSubir}` : 'Nada que subir')}
            </Boton>
          </div>

          {globalLote && (
            <div style={{ marginBottom: 8 }}>
              <div role="progressbar" aria-label="Avance del lote" aria-valuemin={0}
                aria-valuemax={globalLote.total} aria-valuenow={globalLote.hechos}
                aria-valuetext={`${globalLote.hechos} de ${cuantos(globalLote.total, 'archivo')} terminados`}
                style={{ height: 6, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,.1)' }}>
                <div style={{ height: '100%', background: COLOR.admin, transition: 'width .25s linear',
                  width: `${Math.round((globalLote.hechos / Math.max(1, globalLote.total)) * 100)}%` }} />
              </div>
              <div style={{ marginTop: 5, font: `400 11px/1.4 ${FUENTE.mono}`, color: COLOR.textoSuave }}>
                Lote: {globalLote.hechos} de {cuantos(globalLote.total, 'archivo')} terminados
              </div>
            </div>
          )}
          <div style={{ marginBottom: 12 }}>
            <BarraSubida estado={sub.estado} nota={nota}
              alCancelar={sub.estado.etapa === 'video' ? sub.cancelar : undefined} />
          </div>

          <div style={{ border: `1px solid ${LINEA.tenue}`, maxHeight: 420, overflowY: 'auto' }}>
            {carpetas.map(carp => {
              const suyos = lote.filter(v => v.carpeta === carp)
              const sin = !suyos[0]?.creadora
              return (
                <div key={carp || '(raiz)'}>
                  <div style={{ padding: '8px 13px', background: COLOR.superficie,
                    borderBottom: `1px solid ${LINEA.tenue}`,
                    font: `700 11px/1 ${FUENTE.mono}`, letterSpacing: 1.2,
                    color: sin ? '#FFB020' : COLOR.admin }}>
                    {carp || '(sin carpeta)'} · {suyos.length} video{suyos.length > 1 ? 's' : ''}
                    {sin && ' · sin creadora'}
                  </div>
                  {suyos.map((v, i) => {
                    const color = v.estado === 'listo' ? COLOR.dinero
                      : v.estado === 'fallo' ? '#FF4444'
                      : v.estado === 'subiendo' ? COLOR.admin
                      : v.estado === 'espera' ? COLOR.textoSuave : '#FFB020'
                    return (
                      <div key={i} style={{
                        padding: '7px 13px 7px 26px',
                        borderBottom: `1px solid ${LINEA.tenue}`,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ flex: 1, font: `400 12px/1.3 ${FUENTE.ui}`,
                            color: COLOR.texto, overflow: 'hidden', textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap' }}>{v.titulo}</span>
                          <span style={{ font: `400 11px/1 ${FUENTE.mono}`, color: COLOR.textoSuave }}>
                            {usd(v.precio)} · {(v.archivo.size / 1048576).toFixed(0)} MB
                          </span>
                          <span style={{ font: `700 10px/1.6 ${FUENTE.ui}`, letterSpacing: 1.2,
                            textTransform: 'uppercase', color, minWidth: 74, textAlign: 'right' }}>
                            {v.estado === 'sin_creadora' ? '—'
                              : v.estado === 'no_publica' ? 'pendiente' : v.estado}
                          </span>
                        </div>
                        {/* El motivo del fallo se guardaba y no se pintaba:
                            "FALLO" a secas no le sirve a nadie para arreglarlo. */}
                        {v.detalle && (
                          <div style={{ marginTop: 3, font: `400 11px/1.45 ${FUENTE.ui}`,
                            color: v.estado === 'fallo' ? '#FF4444' : COLOR.textoSuave }}>
                            {v.detalle}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
