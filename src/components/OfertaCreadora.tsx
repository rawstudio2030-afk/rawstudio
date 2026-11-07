/* Lo que una creadora ofrece, en su perfil: suscripcion, encargo y blog.
 *
 * Vive aparte del perfil porque son tres canales con su propia logica, y
 * meterlos dentro habria convertido esa pantalla en un archivo imposible de
 * leer. */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { COLOR, LINEA, FUENTE, RADIO } from '../lib/diseño'
import { useSesion } from '../lib/sesion'
import { usdYPesos } from '../lib/dinero'
import { useMoneda } from '../lib/moneda'
import {
  nivelesDe, suscribirse, miSuscripcion, cancelarSuscripcion,
  crearEncargo, postsDe, type Nivel, type Post,
} from '../lib/canales'
import { Pulsable } from './Pulsable'

/** Tarjeta de neon, del mismo estilo que las de la portada y el catalogo. */
function neon(rgb: string, borde: string) {
  return {
    borderRadius: RADIO.neon, border: `1.5px solid ${borde}`,
    background: `linear-gradient(180deg, rgba(${rgb},.09), rgba(8,8,10,.7))`,
    boxShadow: `0 0 8px rgba(${rgb},.38), 0 0 22px rgba(${rgb},.16)`,
  }
}
const M = { rgb: '255,43,209', borde: '#FF4FE0' }
const C = { rgb: '0,229,255', borde: '#19E6FF' }

const BOTON_MAGENTA = {
  boxSizing: 'border-box', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
  minHeight: 50, cursor: 'pointer', borderRadius: RADIO.neon, color: '#FFF',
  background: 'linear-gradient(135deg, #FF2BD1, #9B2BE8)', boxShadow: '0 0 16px rgba(255,43,209,.42)',
  font: `700 13px/1 ${FUENTE.ui}`, letterSpacing: 1.6, textTransform: 'uppercase',
} as const

export default function OfertaCreadora({ creadora, handle }: {
  creadora: string; handle: string
}) {
  const { sesion } = useSesion()
  useMoneda()
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
    font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 2.2,
    textTransform: 'uppercase' as const, color: COLOR.textoSuave,
  }

  if (!niveles.length && !posts.length && (mio || !sesion)) return null

  return (
    <div style={{ marginTop: 30, display: 'grid', gap: 26 }}>
      {error && (
        <div style={{ padding: '10px 12px', border: '1px solid #FF4444', color: '#FF4444', borderRadius: RADIO.neon,
          font: `400 13px/1.45 ${FUENTE.ui}` }}>{error}</div>
      )}
      {aviso && (
        <div style={{ padding: '10px 12px', border: `1px solid ${COLOR.dinero}`, borderRadius: RADIO.neon,
          color: COLOR.dinero, font: `400 13px/1.45 ${FUENTE.ui}` }}>{aviso}</div>
      )}

      {/* ---- Suscripcion ---- */}
      {niveles.length > 0 && (
        <div id="suscripcion" style={{ scrollMarginTop: 24 }}>
          <div style={etiqueta}>Suscripción</div>
          {suscrita ? (
            <div style={{ marginTop: 12, padding: '14px 15px', borderRadius: RADIO.neon,
              border: `1.5px solid ${COLOR.dinero}`, background: 'rgba(200,255,61,.05)' }}>
              <div style={{ font: `400 13px/1.45 ${FUENTE.ui}`, color: COLOR.texto }}>
                Estás suscrita hasta el{' '}
                {new Date(suscrita.periodo_fin).toLocaleDateString('es-MX')}
              </div>
              {suscrita.cancela_al_fin ? (
                <div style={{ marginTop: 6, font: `400 12px/1.45 ${FUENTE.ui}`,
                  color: COLOR.textoTenue }}>
                  No se renovará. Conservas el acceso hasta esa fecha.
                </div>
              ) : (
                <Pulsable al={async () => {
                  const m = await cancelarSuscripcion(creadora)
                  if (m) setError(m); else { setAviso('No se renovará.'); cargar() }
                }} style={{ marginTop: 8, font: `400 12px/1.45 ${FUENTE.ui}`,
                  color: COLOR.textoApagado, cursor: 'pointer',
                  textDecoration: 'underline', textUnderlineOffset: 3 }}>
                  No renovar
                </Pulsable>
              )}
            </div>
          ) : (
            <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
              {niveles.map(t => (
                <div key={t.id} style={{ padding: '16px 16px', ...neon(C.rgb, C.borde) }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <span style={{ font: `700 16px/1.3 ${FUENTE.ui}` }}>{t.nombre}</span>
                    <span style={{ font: `700 20px/1 ${FUENTE.mono}`, color: COLOR.dinero,
                      whiteSpace: 'nowrap' }}>{usdYPesos(t.precio_coins)}</span>
                  </div>
                  {t.descripcion && (
                    <div style={{ marginTop: 7, font: `400 13px/1.6 ${FUENTE.ui}`,
                      color: COLOR.textoTenue }}>{t.descripcion}</div>
                  )}
                  {!mio && (
                    <Pulsable al={async () => {
                      if (!sesion) return nav('/entrar')
                      const r = await suscribirse(t.id)
                      if ('error' in r) { setError(r.error!); return }
                      setError(''); setAviso('Listo, ya estás suscrita.'); cargar()
                    }} style={{ ...BOTON_MAGENTA, marginTop: 14 }}>
                      {sesion ? 'Suscribirme 30 días' : 'Entra para suscribirte'}
                    </Pulsable>
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
            <div style={{ marginTop: 12, padding: 15, ...neon(M.rgb, M.borde) }}>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={4}
                placeholder="Qué te gustaría que grabara"
                style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(8,8,10,.6)',
                  color: COLOR.texto, border: `1px solid ${LINEA.fuerte}`, borderRadius: 10,
                  padding: '12px 13px', font: `400 16px/1.45 ${FUENTE.ui}`,
                  outline: 'none', resize: 'vertical' }} />
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ font: `400 12px/1 ${FUENTE.ui}`, color: COLOR.textoTenue }}>
                  Ofrezco
                </span>
                <input type="number" value={oferta} onChange={e => setOferta(e.target.value)}
                  style={{ width: 100, background: 'rgba(8,8,10,.6)', color: COLOR.dinero,
                    border: `1px solid ${LINEA.fuerte}`, borderRadius: 10, padding: '10px 11px',
                    font: `400 16px/1 ${FUENTE.mono}`, outline: 'none' }} />
                <span style={{ font: `400 13px/1 ${FUENTE.mono}`, color: COLOR.dinero }}>⨯</span>
              </div>
              <div style={{ marginTop: 10, font: `400 10px/1.6 ${FUENTE.ui}`,
                color: COLOR.textoApagado }}>
                Puede aceptar o pedirte otro precio. No pagas nada hasta que acepte, y el
                dinero queda retenido hasta que entregue.
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <Pulsable al={async () => {
                  const n = parseInt(oferta || '0', 10)
                  if (!desc.trim() || n <= 0) return
                  const r = await crearEncargo(creadora, desc.trim(), n)
                  if ('error' in r) { setError(r.error!); return }
                  setEncargando(false); setDesc(''); setError('')
                  nav('/estudio/encargos')
                }} style={{ ...BOTON_MAGENTA, flex: 1, width: 'auto', fontSize: 12 }}>Enviar propuesta</Pulsable>
                <Pulsable al={() => setEncargando(false)} style={{ flex: 1, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', minHeight: 50, cursor: 'pointer', borderRadius: RADIO.neon,
                  border: `1px solid ${LINEA.fuerte}`, color: COLOR.textoSuave,
                  font: `700 12px/1 ${FUENTE.ui}`, letterSpacing: 1.6, textTransform: 'uppercase' }}>Cancelar</Pulsable>
              </div>
            </div>
          ) : (
            <Pulsable al={() => setEncargando(true)} style={{
              boxSizing: 'border-box', width: '100%', textAlign: 'left',
              marginTop: 12, padding: '16px 16px', cursor: 'pointer', ...neon(M.rgb, M.borde),
            }}>
              <div style={{ font: `700 16px/1.3 ${FUENTE.ui}` }}>Pídele algo a la medida</div>
              <div style={{ marginTop: 6, font: `400 12px/1.6 ${FUENTE.ui}`,
                color: COLOR.textoSuave }}>
                Le dices qué quieres y cuánto ofreces. Ella acepta o propone otro precio.
              </div>
            </Pulsable>
          )}
        </div>
      )}

      {/* ---- Blog ---- */}
      {posts.length > 0 && (
        <div>
          <div style={etiqueta}>Lo que escribe</div>
          <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
            {posts.map(p => (
              <div key={p.id} style={{ padding: '14px 15px', borderRadius: RADIO.neon, border: `1px solid ${LINEA.media}`, background: 'rgba(255,255,255,.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ font: `700 16px/1.3 ${FUENTE.ui}` }}>{p.titulo}</span>
                  {!p.completo && (
                    <span style={{ font: `700 9px/1.6 ${FUENTE.ui}`, letterSpacing: 1.2,
                      textTransform: 'uppercase', color: COLOR.acento, whiteSpace: 'nowrap' }}>
                      Suscriptoras
                    </span>
                  )}
                </div>
                <div style={{ marginTop: 8, font: `400 13px/1.6 ${FUENTE.ui}`,
                  color: COLOR.textoSuave, whiteSpace: 'pre-wrap' }}>{p.cuerpo}</div>
                {!p.completo && (
                  <div style={{ marginTop: 8, font: `400 12px/1.45 ${FUENTE.ui}`,
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
