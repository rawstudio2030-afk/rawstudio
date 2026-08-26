/* Lo que una creadora ofrece, en su perfil: suscripcion, encargo y blog.
 *
 * Vive aparte del perfil porque son tres canales con su propia logica, y
 * meterlos dentro habria convertido esa pantalla en un archivo imposible de
 * leer. */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { COLOR, LINEA, FUENTE } from '../lib/diseño'
import { useSesion } from '../lib/sesion'
import {
  nivelesDe, suscribirse, miSuscripcion, cancelarSuscripcion,
  crearEncargo, postsDe, type Nivel, type Post,
} from '../lib/canales'

export default function OfertaCreadora({ creadora, handle }: {
  creadora: string; handle: string
}) {
  const { sesion } = useSesion()
  const nav = useNavigate()
  const [niveles, setNiveles] = useState<Nivel[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [suscrita, setSuscrita] = useState<{ periodo_fin: string; cancela_al_fin: boolean } | null>(null)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [encargando, setEncargando] = useState(false)
  const [desc, setDesc] = useState('')
  const [oferta, setOferta] = useState('400')

  const mio = sesion?.user.id === creadora

  const cargar = () => {
    nivelesDe(creadora).then(setNiveles)
    postsDe(creadora).then(setPosts)
    if (sesion && !mio) miSuscripcion(creadora).then(setSuscrita)
  }
  useEffect(cargar, [creadora, sesion])

  const etiqueta = {
    font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 2.2,
    textTransform: 'uppercase' as const, color: COLOR.textoTenue,
  }

  if (!niveles.length && !posts.length && (mio || !sesion)) return null

  return (
    <div style={{ marginTop: 30, display: 'grid', gap: 26 }}>
      {error && (
        <div style={{ padding: '10px 12px', border: '1px solid #FF4444', color: '#FF4444',
          font: `400 13px/1.45 ${FUENTE.ui}` }}>{error}</div>
      )}
      {aviso && (
        <div style={{ padding: '10px 12px', border: `1px solid ${COLOR.dinero}`,
          color: COLOR.dinero, font: `400 13px/1.45 ${FUENTE.ui}` }}>{aviso}</div>
      )}

      {/* ---- Suscripcion ---- */}
      {niveles.length > 0 && (
        <div>
          <div style={etiqueta}>Suscripción</div>
          {suscrita ? (
            <div style={{ marginTop: 12, padding: '14px 15px',
              border: `1px solid ${COLOR.dinero}` }}>
              <div style={{ font: `400 14px/1.5 ${FUENTE.ui}`, color: COLOR.texto }}>
                Estás suscrita hasta el{' '}
                {new Date(suscrita.periodo_fin).toLocaleDateString('es-MX')}
              </div>
              {suscrita.cancela_al_fin ? (
                <div style={{ marginTop: 6, font: `400 12px/1.5 ${FUENTE.ui}`,
                  color: COLOR.textoTenue }}>
                  No se renovará. Conservas el acceso hasta esa fecha.
                </div>
              ) : (
                <div onClick={async () => {
                  const m = await cancelarSuscripcion(creadora)
                  if (m) setError(m); else { setAviso('No se renovará.'); cargar() }
                }} style={{ marginTop: 8, font: `400 12px/1.5 ${FUENTE.ui}`,
                  color: COLOR.textoApagado, cursor: 'pointer',
                  textDecoration: 'underline', textUnderlineOffset: 3 }}>
                  No renovar
                </div>
              )}
            </div>
          ) : (
            <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
              {niveles.map(t => (
                <div key={t.id} style={{ padding: '15px 16px', border: `1px solid ${LINEA.tenue}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <span style={{ font: `400 17px/1.2 ${FUENTE.ui}` }}>{t.nombre}</span>
                    <span style={{ font: `400 19px/1 ${FUENTE.mono}`, color: COLOR.dinero,
                      whiteSpace: 'nowrap' }}>{t.precio_coins} ⨯</span>
                  </div>
                  {t.descripcion && (
                    <div style={{ marginTop: 7, font: `400 13px/1.55 ${FUENTE.ui}`,
                      color: COLOR.textoTenue }}>{t.descripcion}</div>
                  )}
                  {!mio && (
                    <div onClick={async () => {
                      if (!sesion) return nav('/entrar')
                      const r = await suscribirse(t.id)
                      if ('error' in r) { setError(r.error!); return }
                      setError(''); setAviso('Listo, ya estás suscrita.'); cargar()
                    }} style={{
                      marginTop: 13, textAlign: 'center', padding: 14, cursor: 'pointer',
                      background: COLOR.acento, color: COLOR.fondo,
                      font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 1.8,
                      textTransform: 'uppercase',
                    }}>
                      {sesion ? 'Suscribirme 30 días' : 'Entra para suscribirte'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---- Encargo ---- */}
      {!mio && sesion && (
        <div>
          <div style={etiqueta}>Contenido a la medida</div>
          {encargando ? (
            <div style={{ marginTop: 12, border: `1px solid ${LINEA.suave}`, padding: 15 }}>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={4}
                placeholder="Qué te gustaría que grabara"
                style={{ width: '100%', boxSizing: 'border-box', background: 'transparent',
                  color: COLOR.texto, border: `1px solid ${LINEA.suave}`, borderRadius: 0,
                  padding: '11px 12px', font: `400 14px/1.5 ${FUENTE.ui}`,
                  outline: 'none', resize: 'vertical' }} />
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ font: `400 12px/1 ${FUENTE.ui}`, color: COLOR.textoTenue }}>
                  Ofrezco
                </span>
                <input type="number" value={oferta} onChange={e => setOferta(e.target.value)}
                  style={{ width: 100, background: 'transparent', color: COLOR.dinero,
                    border: `1px solid ${LINEA.suave}`, borderRadius: 0, padding: '9px 11px',
                    font: `400 16px/1 ${FUENTE.mono}`, outline: 'none' }} />
                <span style={{ font: `400 14px/1 ${FUENTE.mono}`, color: COLOR.dinero }}>⨯</span>
              </div>
              <div style={{ marginTop: 10, font: `400 11px/1.55 ${FUENTE.ui}`,
                color: COLOR.textoApagado }}>
                Puede aceptar o pedirte otro precio. No pagas nada hasta que acepte, y el
                dinero queda retenido hasta que entregue.
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <span onClick={async () => {
                  const n = parseInt(oferta || '0', 10)
                  if (!desc.trim() || n <= 0) return
                  const r = await crearEncargo(creadora, desc.trim(), n)
                  if ('error' in r) { setError(r.error!); return }
                  setEncargando(false); setDesc(''); setError('')
                  nav('/estudio/encargos')
                }} style={{ flex: 1, textAlign: 'center', padding: 13, cursor: 'pointer',
                  background: COLOR.acento, color: COLOR.fondo, font: `700 10px/1 ${FUENTE.ui}`,
                  letterSpacing: 1.6, textTransform: 'uppercase' }}>Enviar propuesta</span>
                <span onClick={() => setEncargando(false)} style={{ flex: 1, textAlign: 'center',
                  padding: 13, cursor: 'pointer', border: `1px solid ${LINEA.fuerte}`,
                  color: COLOR.textoSuave, font: `700 10px/1 ${FUENTE.ui}`,
                  letterSpacing: 1.6, textTransform: 'uppercase' }}>Cancelar</span>
              </div>
            </div>
          ) : (
            <div onClick={() => setEncargando(true)} style={{
              marginTop: 12, padding: '15px 16px', cursor: 'pointer',
              border: `1px solid ${LINEA.tenue}`,
            }}>
              <div style={{ font: `400 15px/1.3 ${FUENTE.ui}` }}>Pídele algo a la medida</div>
              <div style={{ marginTop: 6, font: `400 12px/1.55 ${FUENTE.ui}`,
                color: COLOR.textoTenue }}>
                Le dices qué quieres y cuánto ofreces. Ella acepta o propone otro precio.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---- Blog ---- */}
      {posts.length > 0 && (
        <div>
          <div style={etiqueta}>Lo que escribe</div>
          <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
            {posts.map(p => (
              <div key={p.id} style={{ padding: '14px 15px', border: `1px solid ${LINEA.tenue}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ font: `400 16px/1.25 ${FUENTE.ui}` }}>{p.titulo}</span>
                  {!p.completo && (
                    <span style={{ font: `700 8px/1.6 ${FUENTE.ui}`, letterSpacing: 1,
                      textTransform: 'uppercase', color: COLOR.acento, whiteSpace: 'nowrap' }}>
                      Suscriptoras
                    </span>
                  )}
                </div>
                <div style={{ marginTop: 8, font: `400 14px/1.65 ${FUENTE.ui}`,
                  color: COLOR.textoSuave, whiteSpace: 'pre-wrap' }}>{p.cuerpo}</div>
                {!p.completo && (
                  <div style={{ marginTop: 8, font: `400 12px/1.5 ${FUENTE.ui}`,
                    color: COLOR.textoApagado }}>
                    Suscríbete a @{handle} para leerlo completo.
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
