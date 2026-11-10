/* Bandeja de consultas por Telegram, en el Estudio.
 *
 * Solo LECTURA: se ve quien escribio, sobre que clip, que dijo y cuanto falta
 * para que venza el plazo de respuesta. Se contesta en Telegram («Responder»
 * sobre el mensaje), porque ahi es donde el bot valida las reglas. Ninguna de
 * las partes ve el telefono ni la cuenta de la otra: aqui solo sale el usuario
 * publico.
 *
 * Lo que escribe una persona se pinta como TEXTO (pre-wrap, nunca HTML).
 */
import { useEffect, useState } from 'react'
import { Pulsable } from './Pulsable'
import Avatar from './Avatar'
import { cuantos } from '../lib/plural'
import {
  misConsultas, mensajesDe, type Consulta, type MensajeConsulta,
} from '../lib/consultas'
import { BOT_TELEGRAM } from '../content/consultas'
import { COLOR, FUENTE, LINEA } from '../lib/diseño'

/** «hace 5 min», «hace 3 h», «hace 2 d» y, pasada una semana, la fecha. */
function hace(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'ahora'
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`
  if (s < 7 * 86400) return `hace ${Math.floor(s / 86400)} d`
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

/** Lo que falta para el plazo: «1 d 4 h», «3 h», «20 min». */
function queda(iso: string): string {
  const s = Math.max(0, (new Date(iso).getTime() - Date.now()) / 1000)
  if (s >= 86400) return `${Math.floor(s / 86400)} d ${Math.floor((s % 86400) / 3600)} h`
  if (s >= 3600) return `${Math.floor(s / 3600)} h`
  return `${Math.max(1, Math.floor(s / 60))} min`
}

const mini: React.CSSProperties = {
  font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 1.2, textTransform: 'uppercase',
}

export default function BandejaConsultas() {
  const [filas, setFilas] = useState<Consulta[] | null>(null)
  const [error, setError] = useState('')
  const [abierta, setAbierta] = useState<string | null>(null)
  const [hilo, setHilo] = useState<MensajeConsulta[] | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let vivo = true
    misConsultas().then(r => {
      if (!vivo) return
      if ('error' in r) setError(r.error)
      else { setError(''); setFilas(r.filas.filter(f => f.soy_creadora)) }
    })
    return () => { vivo = false }
  }, [version])

  const abrir = (id: string) => {
    if (abierta === id) { setAbierta(null); return }
    setAbierta(id); setHilo(null)
    mensajesDe(id).then(r => {
      if ('error' in r) { setError(r.error); return }
      setHilo(r.filas)
    })
  }

  if (filas === null && !error) return null

  const pendientes = (filas ?? []).reduce((n, f) => n + f.sin_responder, 0)

  return (
    <section aria-label="Bandeja de mensajes" style={{
      margin: '0 0 22px', padding: 16, border: `1px solid ${LINEA.suave}`, borderRadius: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
        <h2 style={{ margin: 0, ...mini, color: COLOR.textoSuave }}>
          Bandeja de mensajes
          {pendientes > 0 && (
            <span style={{ color: COLOR.acento }}> · {cuantos(pendientes, 'mensaje')} sin responder</span>
          )}
        </h2>
        <Pulsable al={() => setVersion(v => v + 1)}
          style={{ font: `400 12px/1 ${FUENTE.ui}`, color: COLOR.textoSuave, textDecoration: 'underline', minHeight: 32 }}>
          Actualizar
        </Pulsable>
      </div>

      {error && (
        <div role="alert" style={{ marginTop: 10, font: `400 13px/1.4 ${FUENTE.ui}`, color: COLOR.acento }}>
          {error}
        </div>
      )}

      {filas && filas.length === 0 && (
        <p style={{ margin: '10px 0 0', font: `400 14px/1.5 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
          Todavía no tienes consultas. Cuando alguien te escriba desde la ficha de un clip, la
          conversación aparece aquí.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: filas?.length ? 12 : 0 }}>
        {(filas ?? []).map(f => {
          const abierto = abierta === f.id
          const quien = f.otra_handle ? `@${f.otra_handle}` : 'Cuenta eliminada'
          return (
            <div key={f.id} style={{ border: `1px solid ${LINEA.suave}`, borderRadius: 10 }}>
              <Pulsable al={() => abrir(f.id)} activado={abierto} style={{
                width: '100%', textAlign: 'left', padding: '12px 12px', display: 'flex', gap: 10,
                alignItems: 'flex-start', cursor: 'pointer',
              }}>
                <Avatar ruta={f.otra_avatar} nombre={f.otra_handle} handle={f.otra_handle} tam={36} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <b style={{ font: `700 14px/1.3 ${FUENTE.ui}`, color: COLOR.texto }}>{quien}</b>
                    <span style={{ font: `400 12px/1.3 ${FUENTE.mono}`, color: COLOR.textoSuave, whiteSpace: 'nowrap' }}>
                      {hace(f.ultimo_at)}
                    </span>
                  </span>
                  <span style={{ display: 'block', font: `400 12px/1.4 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
                    Sobre «{f.clip_titulo}»
                  </span>
                  <span style={{
                    display: 'block', marginTop: 4, font: `400 13px/1.4 ${FUENTE.ui}`, color: COLOR.texto,
                    overflowWrap: 'anywhere',
                  }}>
                    {f.ultimo_de === 'creadora' ? 'Tú: ' : ''}{f.ultimo_texto}
                  </span>
                  {(f.sin_responder > 0 || f.vencidos > 0) && (
                    <span style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
                      {f.sin_responder > 0 && f.vencen_at && (
                        <span style={{ ...mini, color: COLOR.acento }}>
                          {cuantos(f.sin_responder, 'mensaje')} sin responder · vence en {queda(f.vencen_at)}
                        </span>
                      )}
                      {f.vencidos > 0 && (
                        <span style={{ ...mini, color: COLOR.textoSuave }}>
                          {cuantos(f.vencidos, 'vencido')}
                        </span>
                      )}
                    </span>
                  )}
                </span>
              </Pulsable>

              {abierto && (
                <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {hilo === null && (
                    <span style={{ font: `400 13px/1.4 ${FUENTE.ui}`, color: COLOR.textoSuave }}>Cargando…</span>
                  )}
                  {(hilo ?? []).map(m => (
                    <div key={m.id} style={{
                      alignSelf: m.es_mio ? 'flex-end' : 'flex-start', maxWidth: '88%',
                      padding: '9px 12px', borderRadius: 10,
                      background: m.es_mio ? 'rgba(224,177,90,.08)' : 'rgba(255,255,255,.05)',
                      border: `1px solid ${m.es_mio ? 'rgba(224,177,90,.3)' : LINEA.suave}`,
                    }}>
                      <div style={{
                        font: `400 14px/1.5 ${FUENTE.ui}`, color: COLOR.texto,
                        whiteSpace: 'pre-wrap', overflowWrap: 'anywhere',
                      }}>{m.cuerpo}</div>
                      <div style={{ marginTop: 4, font: `400 11px/1.3 ${FUENTE.mono}`, color: COLOR.textoSuave }}>
                        {hace(m.created_at)}
                        {m.de === 'cliente' && m.estado === 'vencido' && ' · vencido'}
                        {m.de === 'cliente' && m.estado === 'enviado' && m.vence_at && ` · vence en ${queda(m.vence_at)}`}
                      </div>
                    </div>
                  ))}
                  {f.sin_responder > 0 && BOT_TELEGRAM && (
                    <a href={`https://t.me/${BOT_TELEGRAM}`} target="_blank" rel="noopener noreferrer"
                      className="boton-principal"
                      style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center',
                        minHeight: 44, padding: '0 20px', textDecoration: 'none', marginTop: 4 }}>
                      Responder en Telegram
                    </a>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p style={{ margin: '12px 0 0', font: `400 12px/1.5 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
        Para contestar, usa «Responder» sobre el mensaje en Telegram: ahí se revisa que tu respuesta avance algo.
      </p>
    </section>
  )
}
