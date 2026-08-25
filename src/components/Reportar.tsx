/* Reportar un clip o un perfil.
 *
 * Cierra un lazo que estaba abierto: la moderacion ya despublicaba sola un
 * clip con tres reportes, pero nadie tenia forma de reportar. La regla existia
 * y no podia dispararse nunca.
 *
 * Es deliberadamente discreto —un enlace pequeño, no un boton grande— porque
 * denunciar no es una accion que haya que invitar a hacer, sino una que tiene
 * que estar cuando hace falta.
 */
import { useState } from 'react'
import { useSesion } from '../lib/sesion'
import { reportar, MOTIVOS, type MotivoReporte } from '../lib/admin'
import { COLOR, LINEA, FUENTE } from '../lib/diseño'

export default function Reportar({ clip, perfil, etiqueta = 'Reportar' }: {
  clip?: string; perfil?: string; etiqueta?: string
}) {
  const { sesion } = useSesion()
  const [abierto, setAbierto] = useState(false)
  const [motivo, setMotivo] = useState<MotivoReporte | ''>('')
  const [texto, setTexto] = useState('')
  const [estado, setEstado] = useState<'' | 'enviando' | 'listo' | 'repetido'>('')
  const [error, setError] = useState('')

  if (!sesion) return null

  const enviar = async () => {
    if (!motivo) return
    setEstado('enviando'); setError('')
    const r = await reportar({ clip, perfil }, motivo, texto)
    if ('error' in r) { setError(r.error); setEstado(''); return }
    setEstado(r.repetido ? 'repetido' : 'listo')
  }

  return (
    <>
      <span onClick={() => setAbierto(true)} style={{
        font: `400 11px/1 ${FUENTE.ui}`, color: COLOR.textoApagado,
        cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3,
      }}>{etiqueta}</span>

      {abierto && (
        <div onClick={() => setAbierto(false)} style={{
          position: 'fixed', inset: 0, zIndex: 95, background: 'rgba(8,8,10,.88)',
          display: 'grid', placeItems: 'center', padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: 400, maxWidth: '100%', maxHeight: '86vh', overflowY: 'auto',
            background: COLOR.superficie, border: `1px solid ${LINEA.fuerte}`, padding: 24,
          }}>
            {estado === 'listo' || estado === 'repetido' ? (
              <>
                <div style={{ font: `400 21px/1.15 ${FUENTE.display}`,
                  textTransform: 'uppercase', color: COLOR.dinero }}>
                  {estado === 'repetido' ? 'Ya lo habías reportado' : 'Gracias'}
                </div>
                <div style={{ marginTop: 12, font: `400 13px/1.6 ${FUENTE.ui}`,
                  color: COLOR.textoSuave }}>
                  {estado === 'repetido'
                    ? 'Tu reporte anterior sigue en la fila. No hace falta mandarlo otra vez.'
                    : 'Lo va a revisar una persona. Si el motivo es grave, se revisa con prioridad.'}
                </div>
                <div onClick={() => { setAbierto(false); setEstado(''); setMotivo(''); setTexto('') }}
                  style={{ marginTop: 20, textAlign: 'center', padding: '12px 0',
                    border: `1px solid ${LINEA.fuerte}`, cursor: 'pointer',
                    font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.6,
                    textTransform: 'uppercase', color: COLOR.textoSuave }}>Cerrar</div>
              </>
            ) : (
              <>
                <div style={{ font: `400 21px/1.15 ${FUENTE.display}`, textTransform: 'uppercase' }}>
                  Reportar
                </div>
                <div style={{ marginTop: 10, font: `400 12px/1.55 ${FUENTE.ui}`,
                  color: COLOR.textoTenue }}>
                  Lo revisa una persona, no un programa. Quien lo publicó no sabe quién reportó.
                </div>

                <div style={{ marginTop: 18, display: 'grid', gap: 6 }}>
                  {MOTIVOS.map(m => (
                    <div key={m.v} onClick={() => setMotivo(m.v)} style={{
                      padding: '10px 12px', cursor: 'pointer',
                      border: `1px solid ${motivo === m.v ? COLOR.acento : LINEA.tenue}`,
                      background: motivo === m.v ? 'rgba(255,43,209,.06)' : 'transparent',
                    }}>
                      <div style={{ font: `400 13px/1.35 ${FUENTE.ui}`,
                        color: motivo === m.v ? COLOR.texto : COLOR.textoSuave }}>{m.t}</div>
                      {motivo === m.v && m.ayuda && (
                        <div style={{ marginTop: 5, font: `400 11px/1.45 ${FUENTE.ui}`,
                          color: COLOR.textoTenue }}>{m.ayuda}</div>
                      )}
                    </div>
                  ))}
                </div>

                <textarea value={texto} onChange={e => setTexto(e.target.value)}
                  rows={3} maxLength={1000} placeholder="Cuéntanos qué pasa (opcional)"
                  style={{
                    width: '100%', boxSizing: 'border-box', marginTop: 14,
                    background: COLOR.fondo, color: COLOR.texto, resize: 'vertical',
                    border: `1px solid ${LINEA.suave}`, borderRadius: 0,
                    padding: '10px 12px', font: `400 13px/1.5 ${FUENTE.ui}`, outline: 'none',
                  }} />

                {error && (
                  <div style={{ marginTop: 10, font: `400 12px/1.4 ${FUENTE.ui}`, color: '#FF4444' }}>
                    {error}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                  <div onClick={() => setAbierto(false)} style={{
                    flex: 1, textAlign: 'center', padding: '13px 0', cursor: 'pointer',
                    border: `1px solid ${LINEA.fuerte}`, font: `700 10px/1 ${FUENTE.ui}`,
                    letterSpacing: 1.6, textTransform: 'uppercase', color: COLOR.textoSuave,
                  }}>Cancelar</div>
                  <div onClick={enviar} style={{
                    flex: 1, textAlign: 'center', padding: '13px 0',
                    cursor: motivo && estado !== 'enviando' ? 'pointer' : 'not-allowed',
                    background: motivo ? COLOR.acento : 'transparent',
                    border: `1px solid ${motivo ? COLOR.acento : LINEA.tenue}`,
                    color: motivo ? COLOR.fondo : COLOR.textoApagado,
                    font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.6,
                    textTransform: 'uppercase', opacity: estado === 'enviando' ? .6 : 1,
                  }}>{estado === 'enviando' ? 'Enviando…' : 'Enviar reporte'}</div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
