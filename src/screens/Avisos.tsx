// Pantalla 29 — Avisos
//
// Todo lo que le pasa a tu cuenta en un solo lugar, y arriba lo que te toca
// hacer: responder una consulta antes de que venza, entregar un encargo pagado,
// volver a verificarte. Es el centro de avisos de la campana.
//
// Al abrirla se marca como vista: lo nuevo deja de contar en la campana, pero lo
// que sigue pendiente sigue arriba hasta que se resuelva.
import { useEffect, useState } from 'react'
import { useSesion } from '../lib/sesion'
import { misAvisos, marcarAvisosVistos, type Aviso, type TipoAviso } from '../lib/avisos'
import { Marco } from '../estudio/piezas'
import { Enlace } from '../components/Pulsable'
import Icono from '../components/Iconos'
import Centro from '../components/Centro'
import { cuantos } from '../lib/plural'
import { COLOR, FUENTE, LINEA } from '../lib/diseño'

const ICONO: Record<TipoAviso, string> = {
  consulta: 'sobre', encargo: 'lapiz', venta: 'dinero', comentario: 'texto',
  cuenta: 'escudo', dinero: 'banco', compra: 'biblioteca',
}

/** «hace 5 min», «hace 3 h», «hace 2 d» y, pasada una semana, la fecha. */
function hace(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 0) return 'pronto'
  if (s < 60) return 'ahora'
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`
  if (s < 7 * 86400) return `hace ${Math.floor(s / 86400)} d`
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

export default function Avisos() {
  const { sesion, cargando } = useSesion()
  const [filas, setFilas] = useState<Aviso[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (cargando || !sesion) return
    let vivo = true
    misAvisos().then(r => {
      if (!vivo) return
      if ('error' in r) { setError(r.error); return }
      setFilas(r.filas)
      // Se marca DESPUES de traer la lista: asi esta vista aun sabe que era nuevo.
      marcarAvisosVistos()
    })
    return () => { vivo = false }
  }, [sesion, cargando])

  if (cargando) return <Centro texto="Cargando…" />
  if (!sesion) return <Centro texto="Entra para ver tus avisos." accion={{ texto: 'Entrar', al: () => { window.location.hash = '#/entrar' } }} />

  const urgentes = (filas ?? []).filter(a => a.urgente)
  const recientes = (filas ?? []).filter(a => !a.urgente)

  return (
    <Marco titulo="Avisos" volverA="/clip">
      {error && (
        <div role="alert" style={{ font: `400 14px/1.5 ${FUENTE.ui}`, color: COLOR.acento, marginBottom: 14 }}>{error}</div>
      )}
      {filas === null && !error && <Centro texto="Cargando…" />}

      {filas && filas.length === 0 && (
        <p style={{ margin: 0, font: `400 15px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
          No tienes avisos. Aquí aparece cuando alguien te compre, te escriba o haya algo
          que te toque hacer.
        </p>
      )}

      {urgentes.length > 0 && (
        <Grupo titulo={`Te toca · ${urgentes.length}`} color={COLOR.acento} filas={urgentes} />
      )}
      {recientes.length > 0 && (
        <Grupo titulo={urgentes.length > 0 ? 'Recientes' : cuantos(recientes.length, 'aviso')}
          color={COLOR.textoSuave} filas={recientes} />
      )}
    </Marco>
  )
}

function Grupo({ titulo, color, filas }: { titulo: string; color: string; filas: Aviso[] }) {
  return (
    <section style={{ marginBottom: 24 }}>
      <h2 style={{ margin: '0 0 10px', font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 2,
        textTransform: 'uppercase', color }}>{titulo}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filas.map(a => (
          <Enlace key={a.clave} a={a.ruta} className="tarjeta-sobria" style={{
            display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 14px',
            cursor: 'pointer',
            border: `1px solid ${a.urgente ? COLOR.acento : LINEA.suave}`,
          }}>
            <span aria-hidden style={{ color: a.urgente ? COLOR.acento : COLOR.textoSuave, marginTop: 2 }}>
              <Icono nombre={ICONO[a.tipo] ?? 'chispa'} tam={20} />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <b style={{ font: `700 14px/1.35 ${FUENTE.ui}`, color: COLOR.texto, overflowWrap: 'anywhere' }}>
                  {a.nuevo && (
                    <span aria-label="Nuevo" style={{ display: 'inline-block', width: 8, height: 8,
                      borderRadius: '50%', background: COLOR.acento, marginRight: 8 }} />
                  )}
                  {a.titulo}
                </b>
                <span style={{ font: `400 12px/1.35 ${FUENTE.mono}`, color: COLOR.textoSuave, whiteSpace: 'nowrap' }}>
                  {hace(a.at)}
                </span>
              </span>
              <span style={{ display: 'block', marginTop: 4, font: `400 13px/1.5 ${FUENTE.ui}`,
                color: COLOR.textoSuave, overflowWrap: 'anywhere' }}>
                {a.detalle}
              </span>
            </span>
          </Enlace>
        ))}
      </div>
    </section>
  )
}
