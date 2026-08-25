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

type Fila = {
  id: string; title: string; estado: string
  motivo_rechazo: string | null; created_at: string
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

  useEffect(() => {
    if (!sesion) return
    supabase.from('clips')
      .select('id,title,estado,motivo_rechazo,created_at')
      .eq('creator_id', sesion.user.id)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => { setFilas((data ?? []) as Fila[]); setCargando(false) })
  }, [sesion])

  if (cargando || filas.length === 0) return null

  return (
    <div>
      <div style={{
        font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 2.2,
        textTransform: 'uppercase', color: COLOR.textoTenue, marginBottom: 12,
      }}>Tus clips</div>

      {filas.map(f => {
        const e = TEXTO[f.estado] ?? { t: f.estado, c: COLOR.textoTenue, nota: '' }
        return (
          <div key={f.id} style={{
            padding: '11px 0', borderBottom: `1px solid ${LINEA.tenue}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ font: `400 13px/1.35 ${FUENTE.ui}`, color: COLOR.texto }}>
                {f.title}
              </span>
              <span style={{
                font: `700 9px/1.6 ${FUENTE.ui}`, letterSpacing: 1,
                textTransform: 'uppercase', color: e.c, whiteSpace: 'nowrap',
              }}>{e.t}</span>
            </div>
            {(e.nota || f.motivo_rechazo) && (
              <div style={{
                marginTop: 5, font: `400 11px/1.5 ${FUENTE.ui}`, color: COLOR.textoTenue,
              }}>
                {e.nota}
                {f.motivo_rechazo && (
                  <div style={{ marginTop: 4, color: COLOR.textoSuave }}>
                    <b style={{ color: e.c }}>Motivo:</b> {f.motivo_rechazo}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
