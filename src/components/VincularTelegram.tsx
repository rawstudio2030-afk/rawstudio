/* Vincular el Telegram de la creadora, en el estudio.
 *
 * Sin esto el bot no sabe a donde mandarle las consultas. El enlace es de un
 * solo uso y dura 15 minutos; al abrirlo en Telegram, el bot guarda el chat y
 * nada mas. Su numero y su cuenta personal no se guardan ni se muestran a nadie.
 */
import { useEffect, useState } from 'react'
import { Pulsable, Enlace } from './Pulsable'
import {
  vincularTelegram, telegramVinculado, desvincularTelegram,
} from '../lib/consultas'
import { MIN_PALABRAS, COBRO_CONSULTAS_ACTIVO, PRECIO_CONSULTA_TELEGRAM } from '../content/consultas'
import { COLOR, FUENTE, LINEA } from '../lib/diseño'

const mini: React.CSSProperties = {
  font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 1.2, textTransform: 'uppercase',
}

export default function VincularTelegram() {
  const [vinculada, setVinculada] = useState<boolean | null>(null)
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [ocupada, setOcupada] = useState(false)

  useEffect(() => {
    let vivo = true
    telegramVinculado().then(v => { if (vivo) setVinculada(v) })
    return () => { vivo = false }
  }, [])

  if (vinculada === null) return null

  const pedir = async () => {
    setError(''); setOcupada(true)
    const r = await vincularTelegram()
    setOcupada(false)
    if ('error' in r) setError(r.error)
    else setUrl(r.url)
  }
  const quitar = async () => {
    setError(''); setOcupada(true)
    const m = await desvincularTelegram()
    setOcupada(false)
    if (m) { setError(m); return }
    setVinculada(false); setUrl('')
  }

  return (
    <section aria-label="Consultas por Telegram" style={{
      margin: '0 0 22px', padding: 16, border: `1px solid ${LINEA.suave}`, borderRadius: 12,
    }}>
      <h2 style={{ margin: 0, font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 2,
        textTransform: 'uppercase', color: COLOR.textoSuave }}>
        Mensajes · Consultas por Telegram
      </h2>
      <p style={{ margin: '10px 0 0', font: `400 14px/1.5 ${FUENTE.ui}`, color: COLOR.texto }}>
        {vinculada
          ? 'Tu Telegram está vinculado: ya pueden consultarte desde la ficha de tus clips.'
          : 'Deja que quien vea tus clips te haga preguntas por mensaje privado. Primero vincula tu Telegram (un toque).'}
      </p>

      <div style={{ ...mini, marginTop: 14, color: COLOR.textoSuave }}>Cómo funciona</div>
      <ol style={{ margin: '8px 0 0', paddingLeft: 20, font: `400 13px/1.55 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
        <li>Vinculas tu Telegram con el botón de abajo. Se abre nuestro bot y le das «Iniciar».</li>
        <li>Quien vea uno de tus clips toca «Consultar por Telegram» y te escribe a través del bot
          (mínimo {MIN_PALABRAS} palabras, sobre ese clip o sobre ti).</li>
        <li>El mensaje te llega a Telegram. Contéstalo con «Responder» sobre ese mensaje, en un
          máximo de 2 días. Tu respuesta tiene que avanzar algo: una pregunta, un dato o una oferta.</li>
        <li>Aquí abajo, en la bandeja, ves todas tus conversaciones y cuánto falta para cada plazo.</li>
      </ol>
      <p style={{ margin: '10px 0 0', font: `400 12px/1.5 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
        Nadie ve tu número ni tu cuenta de Telegram, ni tú los de quien te escribe: el puente es el bot.{' '}
        {COBRO_CONSULTAS_ACTIVO ? `Cada mensaje cuesta ${PRECIO_CONSULTA_TELEGRAM}.` : 'Por ahora el servicio es sin costo.'}
      </p>

      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="boton-principal"
          style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, padding: '0 22px',
            marginTop: 12, textDecoration: 'none' }}>
          Abrir Telegram
        </a>
      ) : (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
          <Pulsable al={pedir} activo={!ocupada} className="boton-principal"
            style={{ minHeight: 44, padding: '0 22px' }}>
            {ocupada ? 'Preparando…' : vinculada ? 'Vincular otro Telegram' : 'Vincular mi Telegram'}
          </Pulsable>
          {vinculada && (
            <Pulsable al={quitar} activo={!ocupada}
              style={{ minHeight: 44, padding: '0 16px', color: COLOR.textoSuave,
                border: `1px solid ${LINEA.suave}`, borderRadius: 10 }}>
              Desvincular
            </Pulsable>
          )}
        </div>
      )}

      {error && (
        <div role="alert" style={{ marginTop: 10, font: `400 13px/1.4 ${FUENTE.ui}`, color: COLOR.acento }}>
          {error}
        </div>
      )}
      <div style={{ marginTop: 12 }}>
        <Enlace a="/consultas" style={{ font: `400 13px/1 ${FUENTE.ui}`, color: COLOR.textoSuave,
          textDecoration: 'underline' }}>
          Leer las reglas del servicio
        </Enlace>
      </div>
    </section>
  )
}
