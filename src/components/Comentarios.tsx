/* Comentarios y reseñas de un clip, en la ficha.
 *
 * Modo consumo: fondo plano y tipografia de interfaz; el magenta solo en lo que
 * se actua (las estrellas marcadas y el boton de publicar).
 *
 * El texto de quien comenta se pinta como TEXTO, nunca como HTML: un
 * `<script>` escrito en un comentario se ve literal. Por eso no hay
 * `dangerouslySetInnerHTML` aqui, y `pre-wrap` y `overflow-wrap: anywhere` para
 * que ni una palabra interminable ni los saltos de linea rompan la ficha.
 *
 * Quien puede escribir lo decide el servidor (acceso al video, edad, cuenta no
 * vetada). Aqui solo se evita ofrecer lo que de todos modos rechazaria.
 */
import { useEffect, useState } from 'react'
import { Pulsable, Enlace } from './Pulsable'
import Avatar from './Avatar'
import { cuantos } from '../lib/plural'
import {
  comentariosDe, resumenResenas, comentar, calificar, quitarCalificacion,
  borrarComentario, POR_PAGINA, MAX_TEXTO,
  type Comentario, type ResumenResenas,
} from '../lib/comentarios'
import { COLOR, FUENTE, LINEA } from '../lib/diseño'

const ESTRELLA = 'M12 3.2l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.6 6.8 19.4l1-5.9L3.5 9.4l5.9-.8Z'

function Estrella({ llena, tam = 26 }: { llena: boolean; tam?: number }) {
  return (
    <svg aria-hidden width={tam} height={tam} viewBox="0 0 24 24"
      fill={llena ? 'currentColor' : 'none'} stroke="currentColor"
      strokeWidth="1.6" strokeLinejoin="round">
      <path d={ESTRELLA} />
    </svg>
  )
}

/** «hace 5 min», «hace 3 h», «hace 2 d» y, pasada una semana, la fecha. */
function hace(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'ahora'
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`
  if (s < 7 * 86400) return `hace ${Math.floor(s / 86400)} d`
  return new Date(iso).toLocaleDateString('es-MX')
}

const mini: React.CSSProperties = {
  font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 1.2, textTransform: 'uppercase',
  color: COLOR.textoSuave, cursor: 'pointer', padding: '14px 4px',
}

export default function Comentarios({ clip, esDuenia, haySesion, desbloqueado }: {
  clip: string; esDuenia: boolean; haySesion: boolean; desbloqueado: boolean
}) {
  const [filas, setFilas] = useState<Comentario[]>([])
  const [hayMas, setHayMas] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [cargandoMas, setCargandoMas] = useState(false)
  const [resumen, setResumen] = useState<ResumenResenas>({ promedio: null, cantidad: 0, mi_calificacion: null })
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [borrando, setBorrando] = useState<string | null>(null)

  const puedeEscribir = haySesion && desbloqueado

  /** Primera pagina y resumen, tras publicar, calificar o borrar: el servidor
   *  es la fuente de verdad, no una copia local. */
  const recargar = async () => {
    const [c, r] = await Promise.all([comentariosDe(clip), resumenResenas(clip)])
    if ('filas' in c) { setFilas(c.filas); setHayMas(c.filas.length === POR_PAGINA) }
    setResumen(r)
    setCargando(false)
  }

  // Carga inicial. Se vuelve a pedir si cambia la sesion: `es_mio` y
  // `puede_borrar` dependen de ella.
  useEffect(() => {
    let vivo = true
    Promise.all([comentariosDe(clip), resumenResenas(clip)]).then(([c, r]) => {
      if (!vivo) return
      if ('filas' in c) { setFilas(c.filas); setHayMas(c.filas.length === POR_PAGINA) }
      setResumen(r)
      setCargando(false)
    })
    return () => { vivo = false }
  }, [clip, haySesion])

  const cargarMas = async () => {
    const ultimo = filas[filas.length - 1]
    if (!ultimo || cargandoMas) return
    setCargandoMas(true)
    const c = await comentariosDe(clip, ultimo.created_at)
    setCargandoMas(false)
    if ('error' in c) { setError(c.error); return }
    setFilas(f => {
      const ya = new Set(f.map(x => x.id))
      return [...f, ...c.filas.filter(x => !ya.has(x.id))]
    })
    setHayMas(c.filas.length === POR_PAGINA)
  }

  const publicar = async () => {
    const limpio = texto.trim()
    if (!limpio || enviando) return
    setEnviando(true); setError('')
    const m = await comentar(clip, limpio)
    setEnviando(false)
    if (m) { setError(m); return }
    setTexto('')
    await recargar()
  }

  const poner = async (n: number) => {
    setError('')
    const m = await calificar(clip, n)
    if (m) { setError(m); return }
    await recargar()
  }

  const quitar = async () => {
    setError('')
    const m = await quitarCalificacion(clip)
    if (m) { setError(m); return }
    await recargar()
  }

  const borrar = async (id: string) => {
    setError('')
    const m = await borrarComentario(id)
    setBorrando(null)
    if (m) { setError(m); return }
    await recargar()
  }

  const mi = resumen.mi_calificacion ?? 0

  return (
    <section aria-label="Comentarios y reseñas" style={{ marginTop: 34 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, font: `700 18px/1.2 ${FUENTE.ui}` }}>Comentarios</h2>
        {resumen.cantidad > 0 && resumen.promedio !== null && (
          <span style={{ font: `400 13px/1 ${FUENTE.mono}`, color: COLOR.textoSuave }}>
            <span aria-hidden style={{ color: COLOR.acento }}>★</span>{' '}
            <span style={{ color: COLOR.texto }}>{resumen.promedio.toFixed(1)}</span>
            {' · '}{cuantos(resumen.cantidad, 'reseña')}
          </span>
        )}
      </div>

      {/* ---- quien puede opinar / quien no ---- */}
      {puedeEscribir ? (
        <div style={{ marginTop: 16, padding: 14, border: `1px solid ${LINEA.suave}`, borderRadius: 12 }}>
          {!esDuenia && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 1.2,
                textTransform: 'uppercase', color: COLOR.textoSuave }}>
                Tu calificación
              </div>
              <div role="group" aria-label="Tu calificación" style={{ display: 'flex', gap: 2, marginTop: 6, alignItems: 'center' }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <Pulsable key={n} al={() => poner(n)} activado={n === mi}
                    rotulo={`Calificar con ${n} ${n === 1 ? 'estrella' : 'estrellas'}`}
                    style={{
                      width: 44, height: 44, display: 'grid', placeItems: 'center', cursor: 'pointer',
                      color: n <= mi ? COLOR.acento : COLOR.textoTenue,
                    }}>
                    <Estrella llena={n <= mi} />
                  </Pulsable>
                ))}
                {mi > 0 && (
                  <Pulsable al={quitar} style={{ ...mini, marginLeft: 6, padding: '0 8px', height: 44 }}>
                    Quitar
                  </Pulsable>
                )}
              </div>
            </div>
          )}

          <label htmlFor="comentario-texto" style={{ position: 'absolute', left: -9999 }}>
            Escribe un comentario
          </label>
          <textarea id="comentario-texto" className="campo-sobrio" value={texto} rows={3}
            maxLength={MAX_TEXTO} placeholder="Escribe un comentario"
            onChange={e => { setTexto(e.target.value); if (error) setError('') }}
            style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical',
              font: `400 15px/1.5 ${FUENTE.ui}`, padding: '12px 13px' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ font: `400 12px/1 ${FUENTE.mono}`,
              color: texto.length >= MAX_TEXTO ? COLOR.acento : COLOR.textoSuave }}>
              {texto.length}/{MAX_TEXTO}
            </span>
            <Pulsable al={publicar} activo={texto.trim().length > 0 && !enviando}
              className="boton-principal" style={{ minHeight: 44, padding: '0 22px' }}>
              {enviando ? 'Publicando…' : 'Publicar'}
            </Pulsable>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 14, font: `400 14px/1.5 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
          {haySesion
            ? 'Desbloquea el video para comentar.'
            : <Enlace a="/entrar" style={{ color: COLOR.admin, textDecoration: 'underline', textUnderlineOffset: 3 }}>
                Entra para comentar
              </Enlace>}
        </div>
      )}

      {error && (
        <div role="alert" style={{ marginTop: 10, font: `400 13px/1.45 ${FUENTE.ui}`, color: '#FF7BE6' }}>
          {error}
        </div>
      )}

      {/* ---- la lista ---- */}
      <div style={{ marginTop: 18 }}>
        {cargando ? (
          <div style={{ font: `400 14px/1 ${FUENTE.ui}`, color: COLOR.textoSuave }}>Cargando…</div>
        ) : filas.length === 0 ? (
          <div style={{ font: `400 14px/1.5 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
            Todavía no hay comentarios.
          </div>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {filas.map(c => {
              const nombre = c.handle ? `@${c.handle}` : 'Cuenta eliminada'
              return (
                <li key={c.id} style={{ display: 'flex', gap: 12, padding: '14px 0',
                  borderTop: `1px solid ${LINEA.tenue}` }}>
                  <Avatar ruta={c.avatar_path} nombre={c.display_name} handle={c.handle} tam={36} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                      font: `700 13px/1.2 ${FUENTE.ui}` }}>
                      <span style={{ color: COLOR.texto }}>{nombre}</span>
                      {c.es_creadora && (
                        <span style={{ font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.2,
                          textTransform: 'uppercase', color: COLOR.acento,
                          border: `1px solid ${COLOR.acento}`, borderRadius: 6, padding: '3px 6px' }}>
                          Creadora
                        </span>
                      )}
                      <span style={{ font: `400 12px/1 ${FUENTE.mono}`, color: COLOR.textoTenue }}>
                        {hace(c.created_at)}
                      </span>
                    </div>
                    <p style={{ margin: '6px 0 0', font: `400 15px/1.5 ${FUENTE.ui}`, color: COLOR.texto,
                      whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{c.texto}</p>

                    {c.puede_borrar && (borrando === c.id ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                        <span style={{ font: `400 13px/1 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
                          ¿Borrar este comentario?
                        </span>
                        <Pulsable al={() => borrar(c.id)} style={{ ...mini, color: COLOR.acento }}>Sí, borrar</Pulsable>
                        <Pulsable al={() => setBorrando(null)} style={mini}>Cancelar</Pulsable>
                      </div>
                    ) : (
                      <Pulsable al={() => setBorrando(c.id)} rotulo={`Borrar el comentario de ${nombre}`}
                        style={{ ...mini, paddingLeft: 0 }}>Borrar</Pulsable>
                    ))}
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {hayMas && (
          <Pulsable al={cargarMas} activo={!cargandoMas} className="boton-sobrio"
            style={{ width: '100%', minHeight: 44, marginTop: 10, cursor: 'pointer',
              border: `1px solid ${LINEA.fuerte}`, borderRadius: 10, color: COLOR.textoSuave,
              font: `700 12px/1 ${FUENTE.ui}`, letterSpacing: 1.6, textTransform: 'uppercase' }}>
            {cargandoMas ? 'Cargando…' : 'Cargar más'}
          </Pulsable>
        )}
      </div>
    </section>
  )
}
