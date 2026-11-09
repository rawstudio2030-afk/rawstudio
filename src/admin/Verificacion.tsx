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
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { cuantos } from '../lib/plural'
import { COLOR, LINEA, FUENTE } from '../lib/diseño'
import {
  listarVerificaciones, conteoVerificaciones, resolverVerificacion, urlDocumento,
  type Verificacion, type EstadoVerificacion,
} from '../lib/admin'
import { Boton, Confirmar, Paginador, Insignia, Aviso, fecha, fechaHora, desde } from './piezas'
import { usePendientes } from './pendientes'
import { Pulsable } from '../components/Pulsable'
import { useEscape } from '../lib/teclado'

const POR_PAGINA = 25

const PESTANAS: { v: EstadoVerificacion; t: string }[] = [
  { v: 'pendiente_revision', t: 'Esperando revisión' },
  { v: 'procesando',         t: 'Procesando'         },
  { v: 'aprobada',           t: 'Aprobadas'          },
  { v: 'rechazada',          t: 'Rechazadas'         },
]

export default function Verificacion() {
  // Lo que se resuelve aqui cambia los avisos del menu y del Resumen: se piden de nuevo.
  const { refrescar } = usePendientes()
  const [estado, setEstado] = useState<EstadoVerificacion>('pendiente_revision')
  const [filas, setFilas] = useState<Verificacion[]>([])
  const [total, setTotal] = useState(0)
  const [conteo, setConteo] = useState<Record<string, number>>({})
  const [pagina, setPagina] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [abierta, setAbierta] = useState<Verificacion | null>(null)
  // Lo que paso con la ultima ficha resuelta. Se ve en la pantalla porque la ficha ya se cerro.
  const [aviso, setAviso] = useState<ReactNode>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    const r = await listarVerificaciones(estado, pagina, POR_PAGINA)
    setFilas(r.filas); setTotal(r.total); setError(r.error); setCargando(false)
    setConteo(await conteoVerificaciones())
    refrescar()
  }, [estado, pagina, refrescar])

  useEffect(() => { cargar() }, [cargar])

  // Se llama cuando la solicitud ya quedo resuelta. Un fallo NO pasa por aqui: lo
  // enseña el recuadro de confirmacion, que sigue abierto, no esta pantalla.
  const resuelta = async (ok: ReactNode) => {
    setError(''); setAbierta(null); setAviso(ok); await cargar()
  }

  return (
    <>
      <div style={{ marginBottom: 16, padding: '10px 13px', border: `1px solid ${LINEA.tenue}`,
        font: `400 11px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
        Los documentos se ven con una liga firmada que caduca en cinco minutos y no se
        copian a ningún lado. De cada persona solo se conserva un sí o un no y la fecha;
        las imágenes se borran en la fecha marcada en su ficha.
      </div>

      <div style={{ display: 'flex', borderBottom: `1px solid ${LINEA.tenue}`, marginBottom: 18 }}>
        {PESTANAS.map(p => (
          <Pulsable key={p.v} al={() => { setEstado(p.v); setPagina(0) }} activado={estado === p.v} style={{
            padding: '9px 15px', cursor: 'pointer',
            font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 1.2, textTransform: 'uppercase',
            color: estado === p.v ? COLOR.admin : COLOR.textoSuave,
            borderBottom: `2px solid ${estado === p.v ? COLOR.admin : 'transparent'}`,
          }}>
            {p.t}
            <span style={{ marginLeft: 7, font: `400 11px/1 ${FUENTE.mono}`,
              color: COLOR.textoSuave }}>{conteo[p.v] ?? 0}</span>
          </Pulsable>
        ))}
      </div>

      {error && (
        <div role="alert" style={{ marginBottom: 14, padding: '10px 13px', border: '1px solid #FF4444',
          color: '#FF4444', font: `400 12px/1.45 ${FUENTE.ui}` }}>{error}</div>
      )}
      {aviso && !abierta && (
        <div style={{ marginBottom: 14 }}><Aviso tipo="ok" cierra={() => setAviso(null)}>{aviso}</Aviso></div>
      )}

      {filas.length === 0 ? (
        <div style={{ padding: '70px 20px', textAlign: 'center', color: COLOR.textoSuave,
          font: `400 13px/1.45 ${FUENTE.ui}`, border: `1px solid ${LINEA.tenue}` }}>
          {cargando ? 'Cargando…' : 'Nada aquí'}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10, opacity: cargando ? .5 : 1 }}>
          {filas.map(v => (
            <Pulsable key={v.id} al={() => setAbierta(v)} style={{
              boxSizing: 'border-box', width: '100%', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: 14, padding: '13px 15px',
              border: `1px solid ${LINEA.tenue}`, background: COLOR.superficie, cursor: 'pointer',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ font: `400 13px/1.3 ${FUENTE.ui}` }}>
                  {v.nombre} <span style={{ color: COLOR.textoSuave,
                    font: `400 11px/1 ${FUENTE.mono}` }}>@{v.handle}</span>
                </div>
                <div style={{ marginTop: 5, font: `400 11px/1.45 ${FUENTE.mono}`,
                  color: COLOR.textoSuave }}>
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
            </Pulsable>
          ))}
        </div>
      )}

      <Paginador pagina={pagina} porPagina={POR_PAGINA} total={total} cambia={setPagina} />

      {abierta && <Ficha v={abierta} cierra={() => setAbierta(null)} listo={resuelta} />}
    </>
  )
}

/** Una imagen del expediente: cargando, lista, o NO se pudo cargar. «Sin archivo» es
 *  otra cosa (nunca hubo imagen o ya se borro) y no se confunde con un fallo. */
type Imagen = { estado: 'cargando' } | { estado: 'lista'; url: string } | { estado: 'fallo'; error: string }

function useImagen(path: string | null): Imagen | null {
  const [img, setImg] = useState<Imagen | null>(path ? { estado: 'cargando' } : null)
  useEffect(() => {
    if (!path) return
    let vivo = true
    urlDocumento('verificacion', path)
      .then(r => vivo && setImg('url' in r ? { estado: 'lista', url: r.url } : { estado: 'fallo', error: r.error }))
      .catch(() => vivo && setImg({ estado: 'fallo', error: 'sin conexión' }))
    return () => { vivo = false }
  }, [path])
  return img
}

function Ficha({ v, cierra, listo }: {
  v: Verificacion; cierra: () => void; listo: (ok: ReactNode) => void | Promise<void>
}) {
  const ine = useImagen(v.ine_path)
  const selfie = useImagen(v.selfie_path)
  const [dialogo, setDialogo] = useState<'aprobar' | 'rechazar' | null>(null)
  useEscape(true, cierra)

  // Un hueco que dice «Sin archivo» se lee como «nunca subio nada», que es lo
  // contrario de lo que paso: subio su INE y la borramos, que es la promesa
  // cumpliendose.
  const borradas = v.imagenes_borradas_at
    ? `Se borró el ${fecha(v.imagenes_borradas_at)}, al cumplirse el plazo.`
    : 'Sin archivo'

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
            <div style={{ font: `700 20px/1.2 ${FUENTE.ui}`, }}>
              {v.nombre}
            </div>
            <div style={{ marginTop: 5, font: `400 11px/1.45 ${FUENTE.mono}`, color: COLOR.textoSuave }}>
              @{v.handle} · {v.email}
            </div>
          </div>
          <Boton chico al={cierra}>Cerrar</Boton>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 18 }}>
          <Documento titulo="Identificación" imagen={ine} vacio={borradas} />
          <Documento titulo="Selfie" imagen={selfie} vacio={borradas} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, marginTop: 16,
          background: LINEA.tenue, border: `1px solid ${LINEA.tenue}` }}>
          <Dato t="Nacimiento" v={v.fecha_nacimiento ? fecha(v.fecha_nacimiento) : '—'} />
          <Dato t="Edad declarada" v={v.edad != null ? cuantos(v.edad, 'año') : '—'}
            c={v.edad != null && v.edad < 18 ? '#FF4444' : COLOR.texto} />
          <Dato t="Parecido facial"
            v={v.similitud != null ? `${Math.round(Number(v.similitud) * 100)}%` : 'no medido'}
            c={v.similitud != null && Number(v.similitud) > .7 ? COLOR.dinero : '#FFB020'} />
          <Dato t="Intentos" v={String(v.intentos)} />
        </div>

        {v.paso_fallido && (
          <div style={{ marginTop: 14, padding: '9px 12px', border: '1px solid #FFB020',
            font: `400 12px/1.45 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
            <b style={{ color: '#FFB020' }}>Falló en:</b> {v.paso_fallido}
            {v.motivo && <> — {v.motivo}</>}
          </div>
        )}

        <div style={{ marginTop: 14, font: `400 11px/1.6 ${FUENTE.mono}`, color: COLOR.textoSuave }}>
          Solicitó {fechaHora(v.created_at)}<br />
          {/* Esto decia «se borran el <fecha>» SIEMPRE, en futuro, incluso en
              una ficha de hace dos meses cuyas imágenes seguían enteras. Era
              verdad a medias en un sitio donde importa que sea entera: hasta
              noviembre de 2026 no había nada que las borrara. Ahora hay tres
              frases porque hay tres situaciones distintas. */}
          {v.imagenes_borradas_at
            ? <>Las imágenes se borraron el {fecha(v.imagenes_borradas_at)}</>
            : v.borrar_despues_de
              ? new Date(v.borrar_despues_de) <= new Date()
                ? <span style={{ color: '#FFB020' }}>
                    Las imágenes debían borrarse el {fecha(v.borrar_despues_de)} y
                    siguen aquí. Se borran solas en la siguiente pasada.
                  </span>
                : <>Las imágenes se borran el {fecha(v.borrar_despues_de)}</>
              : <>Sin fecha de borrado registrada</>}
          {v.revisada_at && <><br />Revisada {fechaHora(v.revisada_at)}
            {v.nota_revision && <> — {v.nota_revision}</>}</>}
        </div>

        {v.clips_pendientes > 0 && (
          <div style={{ marginTop: 14, padding: '9px 12px', border: `1px solid ${COLOR.admin}`,
            font: `400 12px/1.45 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
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
          al={async m => {
            const e = await resolverVerificacion(v.id, true, m || undefined)
            if (e) return e
            await listo(<>La verificación de {v.nombre} (@{v.handle}) quedó <b>aprobada</b>. Sus imágenes se borran solas.</>)
          }} />
      )}
      {dialogo === 'rechazar' && (
        <Confirmar titulo="Rechazar la verificación" etiqueta="Rechazar" exigeMotivo
          cuerpo="El motivo le llega a quien lo solicitó, para que sepa qué volver a mandar."
          cancela={() => setDialogo(null)}
          al={async m => {
            const e = await resolverVerificacion(v.id, false, m)
            if (e) return e
            await listo(<>La verificación de {v.nombre} (@{v.handle}) quedó <b>rechazada</b>; se le comunicó el motivo. Sus imágenes se borran solas.</>)
          }} />
      )}
    </div>
  )
}

function Documento({ titulo, imagen, vacio = 'Sin archivo' }: {
  titulo: string; imagen: Imagen | null; vacio?: string
}) {
  const falla = imagen?.estado === 'fallo'
  return (
    <div>
      <div style={{ font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.2,
        textTransform: 'uppercase', color: COLOR.textoSuave, marginBottom: 6 }}>{titulo}</div>
      <div style={{
        aspectRatio: '4/3', border: `1px solid ${falla ? '#FF4444' : LINEA.tenue}`, background: COLOR.fondo,
        display: 'grid', placeItems: 'center', overflow: 'hidden',
      }}>
        {imagen?.estado === 'lista'
          ? <img src={imagen.url} alt={titulo} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          : <span role={falla ? 'alert' : undefined} style={{ font: `400 11px/1.5 ${FUENTE.ui}`,
              color: falla ? '#FF4444' : COLOR.textoSuave, textAlign: 'center', padding: '0 14px' }}>
              {imagen?.estado === 'cargando' ? 'Cargando…'
                : falla ? `No se pudo cargar la imagen (${imagen.error}). Cierra la ficha y vuelve a abrirla; el archivo puede seguir ahí.`
                : vacio}
            </span>}
      </div>
    </div>
  )
}

function Dato({ t, v, c }: { t: string; v: string; c?: string }) {
  return (
    <div style={{ background: COLOR.superficie, padding: '11px 13px' }}>
      <div style={{ font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.2,
        textTransform: 'uppercase', color: COLOR.textoSuave }}>{t}</div>
      <div style={{ marginTop: 6, font: `400 16px/1 ${FUENTE.mono}`, color: c ?? COLOR.texto }}>{v}</div>
    </div>
  )
}
