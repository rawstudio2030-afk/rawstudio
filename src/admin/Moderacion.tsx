/* Modulo 2: cola de moderacion. */
import { useCallback, useEffect, useState } from 'react'
import { COLOR, LINEA, FUENTE } from '../lib/diseño'
import {
  colaModeracion, conteoModeracion, moderar, banderaModeracion, leerBandera,
  banearCuenta, type ClipEnCola, type EstadoClip,
} from '../lib/admin'
import { urlPortada, urlVideoFirmada } from '../lib/clips'
import { Boton, Confirmar, Paginador, Insignia, fecha, desde } from './piezas'

const POR_PAGINA = 24

const PESTANAS: { v: EstadoClip; t: string }[] = [
  { v: 'pendiente', t: 'Pendientes' },
  { v: 'aprobado',  t: 'Aprobados'  },
  { v: 'rechazado', t: 'Rechazados' },
  { v: 'retirado',  t: 'Retirados'  },
]

export default function Moderacion() {
  const [estado, setEstado] = useState<EstadoClip>('pendiente')
  const [filas, setFilas] = useState<ClipEnCola[]>([])
  const [total, setTotal] = useState(0)
  const [conteo, setConteo] = useState<Record<string, number>>({})
  const [pagina, setPagina] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [bandera, setBandera] = useState(false)
  const [viendo, setViendo] = useState<ClipEnCola | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    const r = await colaModeracion(estado, pagina, POR_PAGINA)
    setFilas(r.filas); setTotal(r.total); setError(r.error); setCargando(false)
    setConteo(await conteoModeracion())
  }, [estado, pagina])

  useEffect(() => { cargar() }, [cargar])
  useEffect(() => { leerBandera().then(setBandera) }, [])

  const tras = async (msg: string) => {
    if (msg) { setError(msg); return }
    setError(''); setViendo(null); await cargar()
  }

  return (
    <>
      {/* ---- Bandera global ---- */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16,
        padding: '12px 14px',
        border: `1px solid ${bandera ? '#FFB020' : LINEA.tenue}`,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{
            font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.3,
            textTransform: 'uppercase', color: bandera ? '#FFB020' : COLOR.texto,
          }}>Revisión previa forzada · {bandera ? 'encendida' : 'apagada'}</div>
          <div style={{ marginTop: 6, font: `400 11px/1.5 ${FUENTE.ui}`, color: COLOR.textoTenue }}>
            {bandera
              ? 'Todo clip nuevo nace pendiente, sin importar el historial de la creadora.'
              : 'Una creadora verificada con 5 o más clips aprobados publica sola; el resto pasa por revisión previa.'}
          </div>
        </div>
        <Boton tono={bandera ? 'peligro' : 'normal'} al={async () => {
          const m = await banderaModeracion(!bandera)
          if (m) setError(m); else { setBandera(!bandera); setError('') }
        }}>{bandera ? 'Apagar' : 'Encender'}</Boton>
      </div>

      {/* ---- Pestañas ---- */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${LINEA.tenue}`, marginBottom: 18 }}>
        {PESTANAS.map(p => (
          <div key={p.v} onClick={() => { setEstado(p.v); setPagina(0) }} style={{
            padding: '9px 15px', cursor: 'pointer',
            font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.2, textTransform: 'uppercase',
            color: estado === p.v ? COLOR.admin : COLOR.textoTenue,
            borderBottom: `2px solid ${estado === p.v ? COLOR.admin : 'transparent'}`,
          }}>
            {p.t}
            <span style={{ marginLeft: 7, font: `400 10px/1 ${FUENTE.mono}`, color: COLOR.textoApagado }}>
              {conteo[p.v] ?? 0}
            </span>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ marginBottom: 14, padding: '10px 13px', border: '1px solid #FF4444',
          color: '#FF4444', font: `400 12px/1.4 ${FUENTE.ui}` }}>{error}</div>
      )}

      {/* ---- Cuadrícula ---- */}
      {filas.length === 0 ? (
        <div style={{ padding: '70px 20px', textAlign: 'center', color: COLOR.textoTenue,
          font: `400 13px/1.5 ${FUENTE.ui}`, border: `1px solid ${LINEA.tenue}` }}>
          {cargando ? 'Cargando…' : `Nada ${estado === 'pendiente' ? 'esperando revisión' : `en «${estado}»`}`}
        </div>
      ) : (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(232px, 1fr))',
          gap: 14, opacity: cargando ? .5 : 1, transition: 'opacity .15s',
        }}>
          {filas.map(c => <Tarjeta key={c.id} clip={c} al={() => setViendo(c)} />)}
        </div>
      )}

      <Paginador pagina={pagina} porPagina={POR_PAGINA} total={total} cambia={setPagina} />

      {viendo && <Revisor clip={viendo} cierra={() => setViendo(null)} listo={tras} />}
    </>
  )
}

/* ---------- Tarjeta de la cuadrícula ---------- */

function Tarjeta({ clip, al }: { clip: ClipEnCola; al: () => void }) {
  const portada = urlPortada(clip.cover_path)
  const alerta = clip.reportes >= 3
  return (
    <div onClick={al} style={{
      border: `1px solid ${clip.reportes > 0 ? '#FF4444' : LINEA.tenue}`,
      cursor: 'pointer', background: COLOR.superficie,
    }}>
      <div style={{
        aspectRatio: '3/4', position: 'relative',
        background: portada ? `center/cover url(${portada})`
          : `repeating-linear-gradient(130deg,${COLOR.superficieAlta} 0 8px,${COLOR.superficie} 8px 16px)`,
      }}>
        {clip.reportes > 0 && (
          <div style={{ position: 'absolute', top: 8, left: 8 }}>
            <Insignia texto={`${clip.reportes} reporte${clip.reportes > 1 ? 's' : ''}`}
              color={alerta ? '#FF4444' : '#FFB020'} />
          </div>
        )}
        {clip.duracion != null && (
          <div style={{
            position: 'absolute', bottom: 8, right: 8, padding: '2px 6px',
            background: 'rgba(8,8,10,.8)', font: `400 10px/1.4 ${FUENTE.mono}`,
            color: COLOR.texto,
          }}>{clip.duracion}s</div>
        )}
      </div>
      <div style={{ padding: '10px 11px' }}>
        <div style={{ font: `400 12px/1.35 ${FUENTE.ui}`, color: COLOR.texto,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {clip.titulo}
        </div>
        <div style={{ marginTop: 5, font: `400 10px/1.4 ${FUENTE.mono}`, color: COLOR.textoTenue }}>
          @{clip.creadora_handle}
          {!clip.creadora_verificada && (
            <span style={{ color: '#FFB020' }}> · sin verificar</span>
          )}
        </div>
        <div style={{ marginTop: 3, font: `400 10px/1.4 ${FUENTE.mono}`, color: COLOR.textoApagado }}>
          {desde(clip.created_at)} · {clip.precio} ⨯
        </div>
      </div>
    </div>
  )
}

/* ---------- Revisor con reproductor ---------- */

function Revisor({ clip, cierra, listo }: {
  clip: ClipEnCola; cierra: () => void; listo: (m: string) => void
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [fallo, setFallo] = useState('')
  const [dialogo, setDialogo] = useState<'rechazar' | 'retirar' | 'banear' | null>(null)

  useEffect(() => {
    let vivo = true
    // La administracion ve cualquier clip sin pagar ni suscribirse: el bypass
    // vive en tiene_acceso() y en la funcion de borde, no aqui.
    urlVideoFirmada(clip.id).then(r => {
      if (!vivo) return
      if ('url' in r && r.url) setUrl(r.url)
      else setFallo(('error' in r && r.error) || 'No se pudo abrir el video')
    })
    return () => { vivo = false }
  }, [clip.id])

  return (
    <div onClick={cierra} style={{
      position: 'fixed', inset: 0, zIndex: 85, background: 'rgba(8,8,10,.85)',
      display: 'grid', placeItems: 'center', padding: 30,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        display: 'grid', gridTemplateColumns: '460px 380px', gap: 0,
        maxHeight: '90vh', background: COLOR.superficie,
        border: `1px solid ${LINEA.fuerte}`,
      }}>
        {/* Reproductor */}
        <div style={{ background: COLOR.fondo, display: 'grid', placeItems: 'center' }}>
          {url ? (
            <video src={url} controls autoPlay style={{ width: '100%', maxHeight: '90vh' }} />
          ) : (
            <div style={{ padding: 40, textAlign: 'center',
              font: `400 12px/1.5 ${FUENTE.ui}`, color: fallo ? '#FF4444' : COLOR.textoTenue }}>
              {fallo || 'Abriendo el video…'}
            </div>
          )}
        </div>

        {/* Ficha y acciones */}
        <div style={{ padding: '20px 22px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ font: `400 19px/1.2 ${FUENTE.display}`, textTransform: 'uppercase' }}>
              {clip.titulo}
            </div>
            <Boton chico al={cierra}>Cerrar</Boton>
          </div>

          <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
            <Insignia texto={clip.estado} color={
              clip.estado === 'aprobado' ? COLOR.dinero
                : clip.estado === 'pendiente' ? '#FFB020' : '#FF4444'} />
            {clip.reportes > 0 && (
              <Insignia texto={`${clip.reportes} reportes`} color="#FF4444" />
            )}
            {!clip.creadora_verificada && <Insignia texto="Sin verificar" color="#FFB020" />}
          </div>

          <div style={{ marginTop: 14, font: `400 12px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
            {clip.descripcion || <span style={{ color: COLOR.textoApagado }}>Sin descripción</span>}
          </div>

          <div style={{ marginTop: 14, font: `400 11px/1.7 ${FUENTE.mono}`, color: COLOR.textoTenue }}>
            @{clip.creadora_handle} · {clip.creadora_nombre}<br />
            Subido {fecha(clip.created_at)}<br />
            {clip.precio} ⨯ · {clip.visibilidad}
            {clip.duracion != null && <> · {clip.duracion}s</>}
          </div>

          {clip.motivo_rechazo && (
            <div style={{ marginTop: 14, padding: '9px 11px', border: '1px solid #FF4444',
              font: `400 11px/1.5 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
              <b style={{ color: '#FF4444' }}>Motivo registrado:</b> {clip.motivo_rechazo}
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 20 }}>
            {clip.estado !== 'aprobado' && (
              <Boton tono="primario" al={() => moderar(clip.id, 'aprobado').then(listo)}>
                Aprobar
              </Boton>
            )}
            {clip.estado === 'pendiente' && (
              <Boton tono="peligro" al={() => setDialogo('rechazar')}>Rechazar</Boton>
            )}
            {clip.estado === 'aprobado' && (
              <Boton tono="peligro" al={() => setDialogo('retirar')}>Retirar</Boton>
            )}
            <Boton tono="peligro" al={() => setDialogo('banear')}>Banear creadora</Boton>
          </div>
        </div>
      </div>

      {dialogo === 'rechazar' && (
        <Confirmar titulo="Rechazar el clip" etiqueta="Rechazar" exigeMotivo
          cuerpo="El motivo se le comunica a la creadora. Sin explicación no sabrá qué corregir y volverá a subirlo igual."
          cancela={() => setDialogo(null)}
          al={m => moderar(clip.id, 'rechazado', m).then(listo)} />
      )}
      {dialogo === 'retirar' && (
        <Confirmar titulo="Retirar un clip ya publicado" etiqueta="Retirar" exigeMotivo
          cuerpo="Deja de verse de inmediato. Quien ya lo compró tampoco podrá abrirlo."
          cancela={() => setDialogo(null)}
          al={m => moderar(clip.id, 'retirado', m).then(listo)} />
      )}
      {dialogo === 'banear' && (
        <Confirmar titulo={`Banear a @${clip.creadora_handle}`} etiqueta="Banear" exigeMotivo
          cuerpo={<>Cierra la cuenta completa, no solo este clip. Si lo que sobra es el
            clip y no la persona, usa <b style={{ color: COLOR.texto }}>Rechazar</b>.</>}
          cancela={() => setDialogo(null)}
          al={m => banearCuenta(clip.creadora, m).then(listo)} />
      )}
    </div>
  )
}
