/* «Consultar por Telegram», en la ficha del clip.
 *
 * Solo se pinta si la creadora ya vinculo su Telegram: ofrecer algo que de todos
 * modos fallaria es peor que no ofrecerlo. El servidor vuelve a comprobar todo
 * (sesion, edad, cuenta, que el clip sea visible), asi que esconder o mostrar
 * aqui no protege nada.
 *
 * Tocar el boton pide un enlace de un solo uso; el enlace se muestra como un
 * boton aparte («Abrir Telegram») porque abrir una pestana despues de una
 * llamada asincrona lo bloquea el navegador, y asi lo abre un toque de verdad.
 */
import { useEffect, useState } from 'react'
import { Pulsable, Enlace } from './Pulsable'
import {
  creadoraAceptaConsultas, iniciarConsulta,
} from '../lib/consultas'
import { COBRO_CONSULTAS_ACTIVO, PRECIO_CONSULTA_TELEGRAM, MIN_PALABRAS } from '../content/consultas'
import { COLOR, FUENTE, LINEA } from '../lib/diseño'

export default function ConsultarPorTelegram({ clip, creadora, haySesion, handle }: {
  clip: string; creadora: string; haySesion: boolean
  /** Usuario de la creadora, para enlazar a su perfil (donde se hace el encargo). */
  handle?: string
}) {
  const [acepta, setAcepta] = useState(false)
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [pidiendo, setPidiendo] = useState(false)

  useEffect(() => {
    let vivo = true
    creadoraAceptaConsultas(creadora).then(v => { if (vivo) setAcepta(v) })
    return () => { vivo = false }
  }, [creadora])

  if (!acepta) return null

  const pedir = async () => {
    setError(''); setPidiendo(true)
    const r = await iniciarConsulta(clip)
    setPidiendo(false)
    if ('error' in r) setError(r.error)
    else setUrl(r.url)
  }

  return (
    <section aria-label="Consultar por Telegram" style={{
      marginTop: 30, padding: 16, border: `1px solid ${LINEA.suave}`, borderRadius: 12,
    }}>
      <h2 style={{ margin: 0, font: `700 18px/1.2 ${FUENTE.ui}` }}>Consultar por Telegram</h2>
      <p style={{ margin: '8px 0 0', font: `400 14px/1.5 ${FUENTE.ui}`, color: COLOR.texto }}>
        ¿Quieres preguntarle algo a esta creadora? Escríbele por mensaje privado.
      </p>
      <ol style={{ margin: '10px 0 0', paddingLeft: 20, font: `400 13px/1.55 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
        <li>Pulsa el botón: se abre Telegram con el bot de RAWstudio (necesitas tener Telegram).
          Toca «Iniciar».</li>
        <li>Escribe tu mensaje ahí mismo: mínimo {MIN_PALABRAS} palabras y que tenga que ver con
          este clip o con ella. Si no cumple, el bot te dice por qué.</li>
        <li>Ella te responde por ese mismo chat, en un máximo de 2 días.{COBRO_CONSULTAS_ACTIVO && ' Si no responde, se te devuelve el saldo.'}</li>
      </ol>
      {/* La consulta es para PREGUNTAR; lo que se pide grabado es un encargo. */}
      {handle && (
        <p style={{ margin: '10px 0 0', font: `400 13px/1.55 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
          ¿Ya sabes lo que quieres que grabe para ti? No hace falta preguntar:{' '}
          <Enlace a={`/creator/${handle}`} style={{ color: COLOR.acento, textDecoration: 'underline' }}>
            pídele un encargo a la medida
          </Enlace>.
        </p>
      )}
      <p style={{ margin: '10px 0 0', font: `400 12px/1.5 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
        Ni ella ve tu número ni tú el suyo: el puente es el bot.{' '}
        {COBRO_CONSULTAS_ACTIVO ? `${PRECIO_CONSULTA_TELEGRAM} por mensaje.` : 'Por ahora sin costo.'}
      </p>

      {!haySesion ? (
        <Enlace a="/acceso" style={{ display: 'inline-block', marginTop: 12, color: COLOR.acento,
          font: `700 14px/1 ${FUENTE.ui}` }}>
          Entra para consultar →
        </Enlace>
      ) : url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="boton-principal"
          style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, padding: '0 22px',
            marginTop: 12, textDecoration: 'none' }}>
          Abrir Telegram
        </a>
      ) : (
        <Pulsable al={pedir} activo={!pidiendo} className="boton-principal"
          style={{ marginTop: 12, minHeight: 44, padding: '0 22px' }}>
          {pidiendo ? 'Preparando…' : 'Consultar por Telegram'}
        </Pulsable>
      )}

      {error && (
        <div role="alert" style={{ marginTop: 10, font: `400 13px/1.4 ${FUENTE.ui}`, color: COLOR.acento }}>
          {error}
        </div>
      )}
      <div style={{ marginTop: 12 }}>
        <Enlace a="/consultas" style={{ font: `400 13px/1 ${FUENTE.ui}`, color: COLOR.textoSuave,
          textDecoration: 'underline' }}>
          Leer las reglas
        </Enlace>
      </div>
    </section>
  )
}
