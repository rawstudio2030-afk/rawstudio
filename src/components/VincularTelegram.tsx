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
import { COLOR, FUENTE, LINEA } from '../lib/diseño'

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
      marginTop: 30, padding: 16, border: `1px solid ${LINEA.suave}`, borderRadius: 12,
    }}>
      <h2 style={{ margin: 0, font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 2,
        textTransform: 'uppercase', color: COLOR.textoSuave }}>
        Consultas por Telegram
      </h2>
      <p style={{ margin: '10px 0 0', font: `400 14px/1.5 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
        {vinculada
          ? 'Tu Telegram está vinculado. Las consultas te llegan por el bot, sin que nadie vea tu número ni tu cuenta. Responde con «Responder» sobre el mensaje, en un máximo de 2 días.'
          : 'Vincula tu Telegram para recibir consultas pagadas de quien vea tus clips. Nadie verá tu número ni tu cuenta personal: el puente es el bot.'}
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
