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
import { COLOR, LINEA, FUENTE } from '../lib/diseño'
import {
  creadorasGestionables, agruparVideos, aplicarCatalogo, publicarPara, leerCSV,
  type VideoEnLote,
} from '../lib/admin'
import { usd } from '../lib/dinero'
import { Boton } from './piezas'

export default function SubidaMasiva() {
  const [lote, setLote] = useState<VideoEnLote[]>([])
  const [creadoras, setCreadoras] = useState<
    { id: string; handle: string; verificada: boolean }[]>([])
  const [aviso, setAviso] = useState('')
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [avance, setAvance] = useState('')

  const cargarCreadoras = useCallback(async () => {
    const r = await creadorasGestionables('')
    setCreadoras(r.filas.map(c => ({
      id: c.id, handle: c.handle, verificada: c.verificada,
    })))
  }, [])
  useEffect(() => { cargarCreadoras() }, [cargarCreadoras])

  const elegirCarpeta = (fs: FileList | null) => {
    if (!fs) return
    const l = agruparVideos([...fs], creadoras)
    setLote(l); setError(''); setAviso('')
    if (!l.length) setError('No encontré videos en esa carpeta (busco .mp4, .mov, .webm y .m4v).')
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
      setAviso(`${r.emparejados} de ${filas.length} filas del catálogo se aplicaron.` +
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
      setLote(x => x.map((y, j) => j === i ? { ...y, estado: 'subiendo' } : y))
      const r = await publicarPara(
        { creadora: v.creadora!, titulo: v.titulo, video: v.archivo, portada: null,
          descripcion: v.descripcion, precio: v.precio, visibilidad: v.visibilidad },
        (etapa, f) => setAvance(
          `${++n === 1 ? '' : ''}${v.carpeta}/${v.titulo} · ` +
          (etapa === 'guardando' ? 'guardando'
           : etapa === 'portada' && f === 0 ? 'sacando la portada'
           : `${Math.round(f * 100)}%`)),
      )
      setLote(x => x.map((y, j) => j === i ? {
        ...y,
        estado: 'error' in r ? 'fallo' : 'listo',
        detalle: 'error' in r ? r.error! : '',
      } : y))
    }
    setOcupado(false); setAvance('')
  }

  const cuenta = (e: VideoEnLote['estado']) => lote.filter(v => v.estado === e).length
  const porSubir = lote.filter(v => v.creadora && v.estado !== 'listo').length
  const carpetas = [...new Set(lote.map(v => v.carpeta))]
  const sinCreadora = [...new Set(lote.filter(v => !v.creadora).map(v => v.carpeta))]

  return (
    <div style={{ marginTop: 30, borderTop: `1px solid ${LINEA.suave}`, paddingTop: 24 }}>
      <div style={{ font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 2,
        textTransform: 'uppercase', color: COLOR.dinero, marginBottom: 12 }}>
        2 · Subir sus videos
      </div>

      <div style={{ marginBottom: 16, padding: '12px 14px', border: `1px solid ${LINEA.tenue}`,
        font: `400 11px/1.6 ${FUENTE.ui}`, color: COLOR.textoTenue }}>
        Elige la carpeta que contiene una subcarpeta por creadora. El nombre de cada
        subcarpeta tiene que coincidir con su <b style={{ color: COLOR.texto }}>usuario</b>{' '}
        en la plataforma. El título de cada clip sale del nombre del archivo, y la portada
        se saca del propio video.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
        <div style={{ border: `1px dashed ${LINEA.marcada}`, padding: '16px 15px' }}>
          <div style={{ font: `700 9px/1 ${FUENTE.ui}`, letterSpacing: 1.4,
            textTransform: 'uppercase', color: COLOR.textoTenue, marginBottom: 10 }}>
            La carpeta con los videos
          </div>
          <input type="file" multiple
            ref={el => { if (el) el.setAttribute('webkitdirectory', '') }}
            onChange={e => { elegirCarpeta(e.target.files); e.target.value = '' }}
            style={{ font: `400 12px/1 ${FUENTE.ui}`, color: COLOR.textoSuave }} />
          <div style={{ marginTop: 8, font: `400 10px/1.4 ${FUENTE.mono}`, color: COLOR.textoApagado }}>
            {lote.length
              ? `${lote.length} videos en ${carpetas.length} carpetas`
              : 'mp4, mov, webm o m4v'}
          </div>
        </div>

        <div style={{ border: `1px dashed ${LINEA.marcada}`, padding: '16px 15px' }}>
          <div style={{ font: `700 9px/1 ${FUENTE.ui}`, letterSpacing: 1.4,
            textTransform: 'uppercase', color: COLOR.textoTenue, marginBottom: 10 }}>
            Catálogo de títulos · opcional
          </div>
          <input type="file" accept=".csv,text/csv"
            onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) cargarCatalogo(f) }}
            style={{ font: `400 12px/1 ${FUENTE.ui}`, color: COLOR.textoSuave }} />
          <div style={{ marginTop: 8, font: `400 10px/1.4 ${FUENTE.mono}`, color: COLOR.textoApagado }}>
            archivo, titulo, descripcion, precio, visibilidad
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
          font: `400 12px/1.55 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
          <b style={{ color: '#FFB020' }}>{sinCreadora.length} carpetas sin creadora:</b>{' '}
          {sinCreadora.slice(0, 6).join(', ')}
          {sinCreadora.length > 6 && ` y ${sinCreadora.length - 6} más`}.
          <div style={{ marginTop: 6, color: COLOR.textoTenue }}>
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
              {avance || (porSubir ? `Subir los ${porSubir}` : 'Nada que subir')}
            </Boton>
          </div>

          <div style={{ border: `1px solid ${LINEA.tenue}`, maxHeight: 420, overflowY: 'auto' }}>
            {carpetas.map(carp => {
              const suyos = lote.filter(v => v.carpeta === carp)
              const sin = !suyos[0]?.creadora
              return (
                <div key={carp || '(raiz)'}>
                  <div style={{ padding: '8px 13px', background: COLOR.superficie,
                    borderBottom: `1px solid ${LINEA.tenue}`,
                    font: `700 10px/1 ${FUENTE.mono}`, letterSpacing: 1,
                    color: sin ? '#FFB020' : COLOR.admin }}>
                    {carp || '(sin carpeta)'} · {suyos.length} video{suyos.length > 1 ? 's' : ''}
                    {sin && ' · sin creadora'}
                  </div>
                  {suyos.map((v, i) => {
                    const color = v.estado === 'listo' ? COLOR.dinero
                      : v.estado === 'fallo' ? '#FF4444'
                      : v.estado === 'subiendo' ? COLOR.admin
                      : v.estado === 'espera' ? COLOR.textoTenue : '#FFB020'
                    return (
                      <div key={i} style={{
                        padding: '7px 13px 7px 26px',
                        borderBottom: `1px solid ${LINEA.tenue}`,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ flex: 1, font: `400 12px/1.3 ${FUENTE.ui}`,
                            color: COLOR.texto, overflow: 'hidden', textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap' }}>{v.titulo}</span>
                          <span style={{ font: `400 10px/1 ${FUENTE.mono}`, color: COLOR.textoApagado }}>
                            {usd(v.precio)} · {(v.archivo.size / 1048576).toFixed(0)} MB
                          </span>
                          <span style={{ font: `700 8px/1.6 ${FUENTE.ui}`, letterSpacing: 1,
                            textTransform: 'uppercase', color, minWidth: 74, textAlign: 'right' }}>
                            {v.estado === 'sin_creadora' ? '—'
                              : v.estado === 'no_publica' ? 'pendiente' : v.estado}
                          </span>
                        </div>
                        {/* El motivo del fallo se guardaba y no se pintaba:
                            "FALLO" a secas no le sirve a nadie para arreglarlo. */}
                        {v.detalle && (
                          <div style={{ marginTop: 3, font: `400 11px/1.45 ${FUENTE.ui}`,
                            color: v.estado === 'fallo' ? '#FF4444' : COLOR.textoTenue }}>
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
