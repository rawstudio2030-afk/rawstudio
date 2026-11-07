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
import { COBRO_CONSULTAS_ACTIVO, PRECIO_CONSULTA_TELEGRAM } from '../content/consultas'
import { COLOR, FUENTE, LINEA } from '../lib/diseño'

export default function ConsultarPorTelegram({ clip, creadora, haySesion }: {
  clip: string; creadora: string; haySesion: boolean
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
      <p style={{ margin: '8px 0 0', font: `400 14px/1.5 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
        Escríbele a la creadora a través del bot. Ninguna de las dos partes ve el teléfono ni la
        cuenta de la otra. Ella responde en un máximo de 2 días.{' '}
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
