/* Estado de los clips propios, para la creadora.
 *
 * Existe porque la moderacion guarda un motivo cuando rechaza o retira algo, y
 * sin esta pantalla ese motivo no lo leia nadie: la creadora solo veia que su
 * clip no aparecia, sin saber por que ni que corregir. Un rechazo silencioso
 * garantiza que lo vuelva a subir igual.
 */
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSesion } from '../lib/sesion'
import { COLOR, LINEA, FUENTE } from '../lib/diseño'
import { fijarCaducidad, type ModoCaducidad } from '../lib/canales'
import { Pulsable } from './Pulsable'

type Fila = {
  id: string; title: string; estado: string
  motivo_rechazo: string | null; created_at: string
  caduca_at: string | null; caduca_modo: string
}

const TEXTO: Record<string, { t: string; c: string; nota: string }> = {
  pendiente: { t: 'En revisión', c: '#FFB020',
    nota: 'Lo estamos revisando. Todavía no se ve en público.' },
  aprobado:  { t: 'Publicado', c: '#C8FF3D', nota: '' },
  rechazado: { t: 'Rechazado', c: '#FF4444',
    nota: 'No se publicó. Puedes corregirlo y subirlo de nuevo.' },
  retirado:  { t: 'Retirado', c: '#FF4444',
    nota: 'Estaba publicado y se retiró.' },
}

export default function MisClips() {
  const { sesion } = useSesion()
  const [filas, setFilas] = useState<Fila[]>([])
  const [cargando, setCargando] = useState(true)
  const [abierto, setAbierto] = useState<string | null>(null)
  const [fecha, setFecha] = useState('')
  const [modo, setModo] = useState<ModoCaducidad>('deja_de_venderse')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!sesion) return
    recargar()
  }, [sesion])

  const recargar = () => {
    if (!sesion) return
    supabase.from('clips')
      .select('id,title,estado,motivo_rechazo,created_at,caduca_at,caduca_modo')
      .eq('creator_id', sesion.user.id)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => { setFilas((data ?? []) as Fila[]); setCargando(false) })
  }

  if (cargando || filas.length === 0) return null

  return (
    <div>
      <div style={{
        font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 2,
        textTransform: 'uppercase', color: COLOR.textoSuave, marginBottom: 12,
      }}>Tus clips</div>

      {filas.map(f => {
        const e = TEXTO[f.estado] ?? { t: f.estado, c: COLOR.textoTenue, nota: '' }
        return (
          <div key={f.id} className="tarjeta-sobria" style={{ padding: '14px 14px', marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ font: `700 14px/1.3 ${FUENTE.ui}`, color: COLOR.texto }}>
                {f.title}
              </span>
              <span style={{
                font: `700 10px/1.6 ${FUENTE.ui}`, letterSpacing: 1.1,
                textTransform: 'uppercase', color: e.c, whiteSpace: 'nowrap',
              }}>{e.t}</span>
            </div>
            {(e.nota || f.motivo_rechazo) && (
              <div style={{
                marginTop: 6, font: `400 12px/1.5 ${FUENTE.ui}`, color: COLOR.textoSuave,
              }}>
                {e.nota}
                {f.motivo_rechazo && (
                  <div style={{ marginTop: 4, color: COLOR.textoSuave }}>
                    <b style={{ color: e.c }}>Motivo:</b> {f.motivo_rechazo}
                  </div>
                )}
              </div>
            )}

            {/* Caducidad: la creadora decide hasta cuando vive lo que subio. */}
            {abierto === f.id ? (
              <div style={{ marginTop: 12, padding: '14px 14px', borderRadius: 12,
                border: `1px solid ${LINEA.fuerte}`, background: COLOR.fondo }}>
                <div style={{ font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 1.6,
                  textTransform: 'uppercase', color: COLOR.textoSuave }}>
                  Retirar el
                </div>
                <input type="date" value={fecha} className="campo-sobrio"
                  aria-label="Fecha de retiro"
                  min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                  onChange={ev => setFecha(ev.target.value)}
                  style={{
                    width: '100%', boxSizing: 'border-box', marginTop: 8, colorScheme: 'dark',
                    padding: '12px 13px', font: `400 16px/1 ${FUENTE.ui}`,
                  }} />

                <Pulsable al={() => setModo(m =>
                  m === 'retiro_total' ? 'deja_de_venderse' : 'retiro_total')}
                  activado={modo === 'retiro_total'}
                  style={{
                    boxSizing: 'border-box', width: '100%', textAlign: 'left',
                    marginTop: 10, padding: '13px 14px', cursor: 'pointer', borderRadius: 12,
                    border: `1px solid ${modo === 'retiro_total' ? '#FF4444' : LINEA.media}`,
                  }}>
                  <div style={{ font: `700 14px/1.3 ${FUENTE.ui}`,
                    color: modo === 'retiro_total' ? '#FF4444' : COLOR.texto }}>
                    {modo === 'retiro_total'
                      ? 'Quitárselo también a quien lo compró'
                      : 'Dejar de venderlo'}
                  </div>
                  <div style={{ marginTop: 6, font: `400 12px/1.5 ${FUENTE.ui}`,
                    color: COLOR.textoSuave }}>
                    {modo === 'retiro_total'
                      ? 'Nadie podrá verlo, ni quien ya pagó por él. Tienen derecho a que se les devuelva su dinero.'
                      : 'Desaparece del catálogo y nadie más puede comprarlo. Quien ya lo compró lo conserva: eso fue lo que le vendiste.'}
                  </div>
                </Pulsable>

                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <Pulsable al={async () => {
                    const m = await fijarCaducidad(f.id,
                      fecha ? new Date(fecha + 'T23:59:59').toISOString() : null, modo)
                    if (m) { setError(m); return }
                    setError(''); setAbierto(null); recargar()
                  }} className="boton-principal" style={{ flex: 1, fontSize: 12 }}>{fecha ? 'Guardar' : 'Quitar la fecha'}</Pulsable>
                  <Pulsable al={() => { setAbierto(null); setError('') }} style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 52,
                    borderRadius: 14, cursor: 'pointer',
                    border: `1px solid ${LINEA.fuerte}`, color: COLOR.textoSuave,
                    font: `700 12px/1 ${FUENTE.ui}`, letterSpacing: 1.2,
                    textTransform: 'uppercase',
                  }}>Cancelar</Pulsable>
                </div>
                {error && (
                  <div style={{ marginTop: 9, font: `400 12px/1.45 ${FUENTE.ui}`,
                    color: '#FF4444' }}>{error}</div>
                )}
              </div>
            ) : (
              <Pulsable al={() => {
                setAbierto(f.id)
                setFecha(f.caduca_at ? f.caduca_at.slice(0, 10) : '')
                setModo((f.caduca_modo as ModoCaducidad) ?? 'deja_de_venderse')
                setError('')
              }} style={{
                marginTop: 4, padding: '10px 0', font: `400 13px/1.45 ${FUENTE.ui}`, cursor: 'pointer',
                color: f.caduca_at ? '#FFB020' : COLOR.textoSuave,
                textDecoration: 'underline', textUnderlineOffset: 4,
              }}>
                {f.caduca_at
                  ? `Se retira el ${new Date(f.caduca_at).toLocaleDateString('es-MX')}`
                  : 'Ponerle fecha de retiro'}
              </Pulsable>
            )}
          </div>
        )
      })}
    </div>
  )
}
