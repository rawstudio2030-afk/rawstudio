/* «Lo que dejó cada publicación»: el desglose de lo ganado, por clip.
 *
 * «Has ganado» es un solo numero. Esto dice cuales publicaciones lo dejaron y cuales
 * no. Solo habla de DINERO: la plataforma no registra visitas ni cuanto se ve de un
 * video, y aqui no se inventan.
 *
 * LA SUMA DE ESTA LISTA NO CUADRA CON «HAS GANADO», Y ESTA BIEN. Una suscripcion, un
 * encargo entregado y una propina del perfil no van atados a un clip, asi que no
 * pueden aparecer aqui, pero si cuentan arriba. La nota de abajo lo dice. Lo que
 * decide que movimiento es de un clip lo decide la base (`estudio_desempeno_clips`),
 * que solo une los que apuntan a un clip SUYO.
 *
 * Los importes llegan en centavos de dolar y pasan por `usd()`. */
import { useEffect, useState } from 'react'
import { COLOR, FUENTE } from '../lib/diseño'
import { usd } from '../lib/dinero'
import { cuantos } from '../lib/plural'
import { urlPortada } from '../lib/clips'
import { desempenoClips, type DesempenoClip } from '../lib/estudio'
import { Enlace, Pulsable } from './Pulsable'
import TarjetaClip from './TarjetaClip'

/** Cuantas filas se ven de entrada: con muchas publicaciones la lista empujaria
 *  todo lo demas del Estudio fuera de la pantalla. */
const VISIBLES = 8

const etiqueta = {
  font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 2, textTransform: 'uppercase' as const,
  color: COLOR.textoSuave,
}

/** «3 desbloqueos · 1 renta · 2 consultas pagadas · propinas $1.20», solo lo que no es cero. */
function desglose(c: DesempenoClip): string {
  const partes: string[] = []
  if (c.desbloqueos > 0) partes.push(cuantos(c.desbloqueos, 'desbloqueo'))
  if (c.rentas > 0) partes.push(cuantos(c.rentas, 'renta'))
  if (c.consultas_pagadas > 0) partes.push(cuantos(c.consultas_pagadas, 'consulta pagada', 'consultas pagadas'))
  if (c.ganado_propinas > 0) partes.push(`propinas ${usd(c.ganado_propinas)}`)
  return partes.join(' · ')
}

export default function DesempenoClips() {
  const [filas, setFilas] = useState<DesempenoClip[] | null>(null)
  const [fallo, setFallo] = useState<string | null>(null)
  const [todas, setTodas] = useState(false)

  useEffect(() => {
    let vivo = true
    desempenoClips().then(r => { if (vivo) { setFilas(r.datos); setFallo(r.fallo) } })
    return () => { vivo = false }
  }, [])

  const lista = filas ?? []
  const vistas = todas ? lista : lista.slice(0, VISIBLES)

  return (
    <section aria-label="Lo que dejó cada publicación" style={{ marginBottom: 22 }}>
      <h2 style={{ ...etiqueta, margin: '0 0 12px' }}>Lo que dejó cada publicación</h2>

      {filas === null && (
        <div style={{ font: `400 13px/1.45 ${FUENTE.ui}`, color: COLOR.textoSuave }}>Cargando…</div>
      )}

      {/* «No pude leerlo» no es lo mismo que «no hay nada»: sin esto, un fallo
          pareceria una cuenta sin ventas. */}
      {filas !== null && fallo && (
        <div role="alert" style={{ font: `400 13px/1.45 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
          No pude cargar esta lista ahora. Tu saldo y «Has ganado» no cambian; vuelve a intentarlo en un momento.
        </div>
      )}

      {filas !== null && !fallo && lista.length === 0 && (
        <div style={{ font: `400 14px/1.5 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
          Cuando publiques un video o un álbum, aquí verás cuánto dejó cada uno.
        </div>
      )}

      {filas !== null && !fallo && lista.length > 0 && (
        <>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {vistas.map(c => {
              const portada = urlPortada(c.cover_path)
              const texto = desglose(c)
              return (
                <li key={c.id}>
                  <Enlace a={`/clip/${c.id}`} className="tarjeta-sobria" style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px',
                    width: '100%', boxSizing: 'border-box', cursor: 'pointer',
                  }}>
                    <span style={{ flex: '0 0 auto', width: 48, display: 'block', borderRadius: 6, overflow: 'hidden', background: COLOR.fondo }}>
                      {portada
                        ? <TarjetaClip portada={portada} tira={null} />
                        : <span aria-hidden style={{ display: 'block', aspectRatio: '3/4' }} />}
                    </span>
                    <span style={{ flex: 1, minWidth: 0, display: 'block' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ font: `700 15px/1.3 ${FUENTE.ui}`, color: COLOR.texto,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{c.title}</span>
                        <span style={{ font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.1, textTransform: 'uppercase',
                          color: COLOR.textoSuave, border: '1px solid rgba(255,255,255,.18)', borderRadius: 6, padding: '3px 6px' }}>
                          {c.formato === 'album' ? 'Álbum' : 'Video'}
                        </span>
                        {!c.published && (
                          <span style={{ font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.1, textTransform: 'uppercase',
                            color: COLOR.admin, border: `1px solid ${COLOR.admin}`, borderRadius: 6, padding: '3px 6px' }}>
                            Sin publicar
                          </span>
                        )}
                      </span>
                      <span style={{ display: 'block', marginTop: 5, font: `400 12px/1.45 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
                        {texto || 'Todavía no ha dejado nada'}
                      </span>
                    </span>
                    <span style={{ flex: '0 0 auto', font: `700 18px/1 ${FUENTE.ui}`,
                      color: c.ganado_total > 0 ? COLOR.dinero : COLOR.textoSuave }}>
                      {usd(c.ganado_total)}
                    </span>
                  </Enlace>
                </li>
              )
            })}
          </ul>

          {lista.length > VISIBLES && (
            <Pulsable al={() => setTodas(t => !t)} style={{
              marginTop: 10, padding: '10px 0', cursor: 'pointer', minHeight: 44,
              font: `700 12px/1 ${FUENTE.ui}`, letterSpacing: 1.4, textTransform: 'uppercase', color: COLOR.admin,
            }}>
              {todas ? 'Ver menos' : `Ver todas (${lista.length})`}
            </Pulsable>
          )}

          {/* Por que esta suma no cuadra con «Has ganado». */}
          <p style={{ margin: '12px 0 0', font: `400 12px/1.5 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
            Las suscripciones, los encargos y las propinas de tu perfil no aparecen aquí porque no van atadas
            a un clip. Sí cuentan en «Has ganado».
          </p>
        </>
      )}
    </section>
  )
}
