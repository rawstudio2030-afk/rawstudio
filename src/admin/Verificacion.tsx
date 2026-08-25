/* Modulo 9: verificacion de identidad y edad.
 *
 * Es el modulo con mas consecuencias de todo el panel: aqui se decide si una
 * persona puede publicar contenido adulto. La regla de fondo —sin verificar
 * no se publica ni se cobra— NO vive aqui sino en la base, porque en la
 * interfaz seria una sugerencia que se salta con una llamada a la API.
 *
 * Las imagenes no se guardan en el navegador ni se copian a ningun lado: se
 * piden con una liga firmada de cinco minutos cada vez que se abre la ficha.
 */
import { useCallback, useEffect, useState } from 'react'
import { COLOR, LINEA, FUENTE } from '../lib/diseño'
import {
  listarVerificaciones, conteoVerificaciones, resolverVerificacion, urlDocumento,
  type Verificacion, type EstadoVerificacion,
} from '../lib/admin'
import { Boton, Confirmar, Paginador, Insignia, fecha, fechaHora, desde } from './piezas'

const POR_PAGINA = 25

const PESTANAS: { v: EstadoVerificacion; t: string }[] = [
  { v: 'pendiente_revision', t: 'Esperando revisión' },
  { v: 'procesando',         t: 'Procesando'         },
  { v: 'aprobada',           t: 'Aprobadas'          },
  { v: 'rechazada',          t: 'Rechazadas'         },
]

export default function Verificacion() {
  const [estado, setEstado] = useState<EstadoVerificacion>('pendiente_revision')
  const [filas, setFilas] = useState<Verificacion[]>([])
  const [total, setTotal] = useState(0)
  const [conteo, setConteo] = useState<Record<string, number>>({})
  const [pagina, setPagina] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [abierta, setAbierta] = useState<Verificacion | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    const r = await listarVerificaciones(estado, pagina, POR_PAGINA)
    setFilas(r.filas); setTotal(r.total); setError(r.error); setCargando(false)
    setConteo(await conteoVerificaciones())
  }, [estado, pagina])

  useEffect(() => { cargar() }, [cargar])

  const tras = async (m: string) => {
    if (m) { setError(m); return }
    setError(''); setAbierta(null); await cargar()
  }

  return (
    <>
      <div style={{ marginBottom: 16, padding: '10px 13px', border: `1px solid ${LINEA.tenue}`,
        font: `400 11px/1.55 ${FUENTE.ui}`, color: COLOR.textoTenue }}>
        Los documentos se ven con una liga firmada que caduca en cinco minutos y no se
        copian a ningún lado. De cada persona solo se conserva un sí o un no y la fecha;
        las imágenes se borran en la fecha marcada en su ficha.
      </div>

      <div style={{ display: 'flex', borderBottom: `1px solid ${LINEA.tenue}`, marginBottom: 18 }}>
        {PESTANAS.map(p => (
          <div key={p.v} onClick={() => { setEstado(p.v); setPagina(0) }} style={{
            padding: '9px 15px', cursor: 'pointer',
            font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.2, textTransform: 'uppercase',
            color: estado === p.v ? COLOR.admin : COLOR.textoTenue,
            borderBottom: `2px solid ${estado === p.v ? COLOR.admin : 'transparent'}`,
          }}>
            {p.t}
            <span style={{ marginLeft: 7, font: `400 10px/1 ${FUENTE.mono}`,
              color: COLOR.textoApagado }}>{conteo[p.v] ?? 0}</span>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ marginBottom: 14, padding: '10px 13px', border: '1px solid #FF4444',
          color: '#FF4444', font: `400 12px/1.4 ${FUENTE.ui}` }}>{error}</div>
      )}

      {filas.length === 0 ? (
        <div style={{ padding: '70px 20px', textAlign: 'center', color: COLOR.textoTenue,
          font: `400 13px/1.5 ${FUENTE.ui}`, border: `1px solid ${LINEA.tenue}` }}>
          {cargando ? 'Cargando…' : 'Nada aquí'}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10, opacity: cargando ? .5 : 1 }}>
          {filas.map(v => (
            <div key={v.id} onClick={() => setAbierta(v)} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '13px 15px',
              border: `1px solid ${LINEA.tenue}`, background: COLOR.superficie, cursor: 'pointer',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ font: `400 13px/1.3 ${FUENTE.ui}` }}>
                  {v.nombre} <span style={{ color: COLOR.textoTenue,
                    font: `400 11px/1 ${FUENTE.mono}` }}>@{v.handle}</span>
                </div>
                <div style={{ marginTop: 5, font: `400 10px/1.5 ${FUENTE.mono}`,
                  color: COLOR.textoApagado }}>
                  Solicitó {desde(v.created_at)}
                  {v.edad != null && <> · {v.edad} años</>}
                  {v.intentos > 1 && <> · {v.intentos} intentos</>}
                  {v.clips_pendientes > 0 && <> · {v.clips_pendientes} clips esperando</>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {v.identidad_verificada && <Insignia texto="Verificada" color={COLOR.dinero} />}
                {v.tiene_expediente && <Insignia texto="Expediente" color={COLOR.admin} />}
                {v.similitud != null && (
                  <Insignia texto={`${Math.round(Number(v.similitud) * 100)}% parecido`}
                    color={Number(v.similitud) > .7 ? COLOR.dinero : '#FFB020'} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Paginador pagina={pagina} porPagina={POR_PAGINA} total={total} cambia={setPagina} />

      {abierta && <Ficha v={abierta} cierra={() => setAbierta(null)} listo={tras} />}
    </>
  )
}

function Ficha({ v, cierra, listo }: {
  v: Verificacion; cierra: () => void; listo: (m: string) => void
}) {
  const [ine, setIne] = useState<string | null>(null)
  const [selfie, setSelfie] = useState<string | null>(null)
  const [dialogo, setDialogo] = useState<'aprobar' | 'rechazar' | null>(null)

  useEffect(() => {
    let vivo = true
    if (v.ine_path) urlDocumento('verificacion', v.ine_path).then(u => vivo && setIne(u))
    if (v.selfie_path) urlDocumento('verificacion', v.selfie_path).then(u => vivo && setSelfie(u))
    return () => { vivo = false }
  }, [v.ine_path, v.selfie_path])

  return (
    <div onClick={cierra} style={{
      position: 'fixed', inset: 0, zIndex: 85, background: 'rgba(8,8,10,.88)',
      display: 'grid', placeItems: 'center', padding: 28,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 860, maxWidth: '96vw', maxHeight: '90vh', overflowY: 'auto',
        background: COLOR.superficie, border: `1px solid ${LINEA.fuerte}`, padding: 24,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ font: `400 23px/1.15 ${FUENTE.display}`, textTransform: 'uppercase' }}>
              {v.nombre}
            </div>
            <div style={{ marginTop: 5, font: `400 11px/1.5 ${FUENTE.mono}`, color: COLOR.textoTenue }}>
              @{v.handle} · {v.email}
            </div>
          </div>
          <Boton chico al={cierra}>Cerrar</Boton>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 18 }}>
          <Documento titulo="Identificación" url={ine} />
          <Documento titulo="Selfie" url={selfie} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, marginTop: 16,
          background: LINEA.tenue, border: `1px solid ${LINEA.tenue}` }}>
          <Dato t="Nacimiento" v={v.fecha_nacimiento ? fecha(v.fecha_nacimiento) : '—'} />
          <Dato t="Edad declarada" v={v.edad != null ? `${v.edad} años` : '—'}
            c={v.edad != null && v.edad < 18 ? '#FF4444' : COLOR.texto} />
          <Dato t="Parecido facial"
            v={v.similitud != null ? `${Math.round(Number(v.similitud) * 100)}%` : 'no medido'}
            c={v.similitud != null && Number(v.similitud) > .7 ? COLOR.dinero : '#FFB020'} />
          <Dato t="Intentos" v={String(v.intentos)} />
        </div>

        {v.paso_fallido && (
          <div style={{ marginTop: 14, padding: '9px 12px', border: '1px solid #FFB020',
            font: `400 12px/1.5 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
            <b style={{ color: '#FFB020' }}>Falló en:</b> {v.paso_fallido}
            {v.motivo && <> — {v.motivo}</>}
          </div>
        )}

        <div style={{ marginTop: 14, font: `400 11px/1.7 ${FUENTE.mono}`, color: COLOR.textoApagado }}>
          Solicitó {fechaHora(v.created_at)}<br />
          {v.borrar_despues_de
            ? <>Las imágenes se borran el {fecha(v.borrar_despues_de)}</>
            : <>Sin fecha de borrado registrada</>}
          {v.revisada_at && <><br />Revisada {fechaHora(v.revisada_at)}
            {v.nota_revision && <> — {v.nota_revision}</>}</>}
        </div>

        {v.clips_pendientes > 0 && (
          <div style={{ marginTop: 14, padding: '9px 12px', border: `1px solid ${COLOR.admin}`,
            font: `400 12px/1.5 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
            Tiene <b style={{ color: COLOR.admin }}>{v.clips_pendientes} clips esperando</b>. No se
            pueden aprobar hasta que esta verificación quede resuelta: la base lo impide.
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <Boton tono="primario" al={() => setDialogo('aprobar')}>Aprobar</Boton>
          <Boton tono="peligro" al={() => setDialogo('rechazar')}>Rechazar</Boton>
        </div>
      </div>

      {dialogo === 'aprobar' && (
        <Confirmar titulo="Aprobar la verificación" tono="primario" etiqueta="Aprobar"
          cuerpo={<>Confirmas que la identificación es de <b style={{ color: COLOR.texto }}>
            {v.nombre}</b>, que coincide con la selfie y que es mayor de edad. A partir de aquí
            puede publicar y cobrar.</>}
          cancela={() => setDialogo(null)}
          al={m => resolverVerificacion(v.id, true, m || undefined).then(listo)} />
      )}
      {dialogo === 'rechazar' && (
        <Confirmar titulo="Rechazar la verificación" etiqueta="Rechazar" exigeMotivo
          cuerpo="El motivo le llega a quien lo solicitó, para que sepa qué volver a mandar."
          cancela={() => setDialogo(null)}
          al={m => resolverVerificacion(v.id, false, m).then(listo)} />
      )}
    </div>
  )
}

function Documento({ titulo, url }: { titulo: string; url: string | null }) {
  return (
    <div>
      <div style={{ font: `700 9px/1 ${FUENTE.ui}`, letterSpacing: 1.3,
        textTransform: 'uppercase', color: COLOR.textoTenue, marginBottom: 6 }}>{titulo}</div>
      <div style={{
        aspectRatio: '4/3', border: `1px solid ${LINEA.tenue}`, background: COLOR.fondo,
        display: 'grid', placeItems: 'center', overflow: 'hidden',
      }}>
        {url
          ? <img src={url} alt={titulo} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          : <span style={{ font: `400 11px/1 ${FUENTE.ui}`, color: COLOR.textoApagado }}>
              Sin archivo
            </span>}
      </div>
    </div>
  )
}

function Dato({ t, v, c }: { t: string; v: string; c?: string }) {
  return (
    <div style={{ background: COLOR.superficie, padding: '11px 13px' }}>
      <div style={{ font: `700 8px/1 ${FUENTE.ui}`, letterSpacing: 1.2,
        textTransform: 'uppercase', color: COLOR.textoTenue }}>{t}</div>
      <div style={{ marginTop: 6, font: `400 15px/1 ${FUENTE.mono}`, color: c ?? COLOR.texto }}>{v}</div>
    </div>
  )
}
