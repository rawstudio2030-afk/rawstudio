/* «Tus clips»: lo que la creadora ya subio, y desde aqui lo gestiona.
 *
 * Nacio para algo mas chico: la moderacion guarda un motivo cuando rechaza o
 * retira algo, y sin esta pantalla ese motivo no lo leia nadie — la creadora solo
 * veia que su clip no aparecia, sin saber por que ni que corregir. Eso sigue: cada
 * fila dice en que estado esta y, si se rechazo, el motivo.
 *
 * Ahora tambien es donde se administra lo publicado (precio, renta, portada,
 * datos, dejar de venderlo, eliminarlo). La creadora no puede hacer UPDATE directo
 * sobre `clips`: todo pasa por las funciones de la base que valida
 * `src/lib/misclips.ts`; el panel esta en `GestionarClip`.
 *
 * Lista TODOS sus clips, de 30 en 30. Si la lectura falla se dice que fallo: una
 * lista en blanco leeria como «no has subido nada».
 */
import { useEffect, useRef, useState } from 'react'
import { useSesion } from '../lib/sesion'
import { COLOR, FUENTE } from '../lib/diseño'
import { usd } from '../lib/dinero'
import { cuantos } from '../lib/plural'
import { urlPortada } from '../lib/clips'
import { portadaDe } from '../lib/portadas'
import { misClips, yaCaduco, PAGINA_MIS_CLIPS, type MiClip } from '../lib/misclips'
import { Pulsable } from './Pulsable'
import GestionarClip from './GestionarClip'

const TEXTO: Record<string, { t: string; c: string; nota: string }> = {
  pendiente: { t: 'En revisión', c: '#FFB020',
    nota: 'Lo estamos revisando. Todavía no se ve en público.' },
  aprobado:  { t: 'Publicado', c: '#C8FF3D', nota: '' },
  rechazado: { t: 'Rechazado', c: '#FF4444',
    nota: 'No se publicó. Puedes corregirlo y subirlo de nuevo.' },
  retirado:  { t: 'Retirado', c: '#FF4444',
    nota: 'Estaba publicado y se retiró.' },
}

/** Como se vende, en una linea: «$20.00 · renta 48 h $0.80», «Gratis», etc. */
function ventaDe(c: MiClip): string {
  if (c.formato === 'album') return `${usd(c.price_coins)} · precio fijo`
  if (c.visibility === 'gratis') return 'Gratis'
  if (c.visibility === 'suscriptores') return 'Para suscriptores'
  const renta = c.renta_horas != null && c.renta_coins != null
    ? ` · renta ${c.renta_horas} h ${usd(c.renta_coins)}` : ''
  return usd(c.price_coins) + renta
}

export default function MisClips({ sinRotulo = false }: { sinRotulo?: boolean }) {
  const { sesion } = useSesion()
  const uid = sesion?.user.id ?? null
  const [filas, setFilas] = useState<MiClip[]>([])
  const [cargando, setCargando] = useState(true)
  const [fallo, setFallo] = useState<string | null>(null)
  const [intento, setIntento] = useState(0)
  const [hayMas, setHayMas] = useState(false)
  const [cargandoMas, setCargandoMas] = useState(false)
  const [falloMas, setFalloMas] = useState(false)
  const [abierto, setAbierto] = useState<string | null>(null)
  // «Ahora» no se lee al pintar (da resultados que cambian solos): se fija al
  // montar y se refresca cada vez que se lee la lista del servidor.
  const [ahora, setAhora] = useState(() => Date.now())
  // Cuantas filas hay cargadas, para releer EXACTAMENTE esas tras un cambio.
  const cargadas = useRef(0)

  useEffect(() => {
    if (!uid) return
    let vivo = true
    const pedidos = Math.max(PAGINA_MIS_CLIPS, cargadas.current)
    misClips(uid, 0, pedidos).then(r => {
      if (!vivo) return
      // Si la relectura falla NO se vacia la lista: se conserva lo que habia.
      if (r.fallo) { setFallo(r.fallo); setCargando(false); return }
      setFilas(r.datos); cargadas.current = r.datos.length; setAhora(Date.now())
      // Si llego completo lo que se pidio, puede haber mas.
      setHayMas(r.datos.length >= pedidos)
      setFallo(null); setCargando(false)
    })
    return () => { vivo = false }
  }, [uid, intento])

  const recargar = () => setIntento(n => n + 1)

  const verMas = () => {
    if (!uid || cargandoMas) return
    setCargandoMas(true); setFalloMas(false)
    misClips(uid, cargadas.current).then(r => {
      setCargandoMas(false)
      if (r.fallo) { setFalloMas(true); return }
      // Sin duplicar: por si algo se movio entre una pagina y otra.
      setFilas(prev => {
        const vistos = new Set(prev.map(f => f.id))
        const nuevas = r.datos.filter(f => !vistos.has(f.id))
        cargadas.current = prev.length + nuevas.length
        return [...prev, ...nuevas]
      })
      setHayMas(r.datos.length >= PAGINA_MIS_CLIPS)
    })
  }

  const rotulo = sinRotulo ? null : (
    <div style={{
      font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 2,
      textTransform: 'uppercase', color: COLOR.textoSuave, marginBottom: 12,
    }}>Tus clips</div>
  )

  if (!uid) return null
  if (cargando) return <div>{rotulo}<div style={ayuda}>Cargando…</div></div>

  if (fallo && filas.length === 0) {
    return (
      <div>
        {rotulo}
        <div role="alert" style={aviso}>
          No pudimos cargar tus clips. No es que no tengas: no conseguimos preguntar.
        </div>
        <Pulsable al={recargar} style={reintento}>Reintentar</Pulsable>
      </div>
    )
  }
  if (filas.length === 0) {
    return <div>{rotulo}<div style={ayuda}>Todavía no has subido nada.</div></div>
  }

  return (
    <div>
      {rotulo}
      {fallo && (
        <div role="alert" style={{ ...aviso, marginBottom: 12 }}>
          No pudimos actualizar la lista. Lo que ves puede estar desfasado.{' '}
          <Pulsable al={recargar} style={{ ...reintento, display: 'inline', padding: 0 }}>Reintentar</Pulsable>
        </div>
      )}

      {filas.map(f => {
        const e = TEXTO[f.estado] ?? { t: f.estado, c: COLOR.textoTenue, nota: '' }
        const detenido = yaCaduco(f.caduca_at, ahora)
        const portada = portadaDe(f.id, urlPortada(f.cover_path))
        const abiertoAhora = abierto === f.id
        return (
          <div key={f.id} className="tarjeta-sobria" style={{ padding: '14px 14px', marginBottom: 8 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div role="img" aria-label={`Portada de ${f.title}`} style={{
                flex: '0 0 auto', width: 48, height: 64, borderRadius: 8,
                background: `center/cover url("${portada}")`, border: '1px solid rgba(255,255,255,.14)',
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{
                    font: `700 14px/1.3 ${FUENTE.ui}`, color: COLOR.texto,
                    overflowWrap: 'anywhere', minWidth: 0,
                  }}>{f.title}</span>
                  <span style={{
                    font: `700 10px/1.6 ${FUENTE.ui}`, letterSpacing: 1.1,
                    textTransform: 'uppercase', color: e.c, whiteSpace: 'nowrap',
                  }}>{e.t}</span>
                </div>
                <div style={{ marginTop: 6, font: `400 12px/1.5 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
                  {f.formato === 'album' ? `Álbum · ${cuantos(f.num_fotos, 'foto')}` : 'Video'}
                  {' · '}{ventaDe(f)}
                  {detenido && <b style={{ color: '#FFB020' }}> · Dejó de venderse</b>}
                </div>
              </div>
            </div>

            {(e.nota || f.motivo_rechazo) && (
              <div style={{ marginTop: 8, font: `400 12px/1.5 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
                {e.nota}
                {f.motivo_rechazo && (
                  <div style={{ marginTop: 4, color: COLOR.textoSuave }}>
                    <b style={{ color: e.c }}>Motivo:</b> {f.motivo_rechazo}
                  </div>
                )}
              </div>
            )}

            {abiertoAhora ? (
              <GestionarClip clip={f} uid={uid} ahora={ahora}
                alCambiar={recargar}
                alEliminado={() => { setAbierto(null); recargar() }}
                alCerrar={() => setAbierto(null)} />
            ) : (
              <Pulsable al={() => setAbierto(f.id)} style={{
                marginTop: 8, minHeight: 44, padding: '0 16px', cursor: 'pointer', borderRadius: 12,
                border: '1px solid rgba(255,255,255,.28)', color: COLOR.texto,
                font: `700 12px/1 ${FUENTE.ui}`, letterSpacing: 1.4, textTransform: 'uppercase',
              }}>Gestionar</Pulsable>
            )}
          </div>
        )
      })}

      {falloMas && (
        <div role="alert" style={{ ...aviso, marginTop: 8 }}>
          No pudimos cargar más clips. Lo que ya ves sigue aquí.
        </div>
      )}
      {(hayMas || falloMas) && (
        <Pulsable al={verMas} activo={!cargandoMas} style={{
          width: '100%', minHeight: 48, marginTop: 8, cursor: cargandoMas ? 'default' : 'pointer',
          borderRadius: 12, border: '1px solid rgba(255,255,255,.28)', color: COLOR.textoSuave,
          opacity: cargandoMas ? .6 : 1,
          font: `700 12px/1 ${FUENTE.ui}`, letterSpacing: 1.4, textTransform: 'uppercase',
        }}>{cargandoMas ? 'Cargando…' : falloMas ? 'Reintentar' : 'Ver más'}</Pulsable>
      )}
    </div>
  )
}

const ayuda: React.CSSProperties = { font: `400 13px/1.5 ${FUENTE.ui}`, color: COLOR.textoSuave }
const aviso: React.CSSProperties = {
  padding: '12px 14px', borderRadius: 12, border: '1px solid #FF4444', color: '#FF4444',
  font: `400 13px/1.45 ${FUENTE.ui}`,
}
const reintento: React.CSSProperties = {
  marginTop: 10, padding: '8px 0', cursor: 'pointer', font: `700 12px/1 ${FUENTE.ui}`,
  letterSpacing: 1.2, textTransform: 'uppercase', color: COLOR.texto,
  textDecoration: 'underline', textUnderlineOffset: 4,
}
