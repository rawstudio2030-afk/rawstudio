/* La barra de una subida en curso.
 *
 * Una subida de varios minutos sin avance visible parece una pagina trabada; lo
 * unico que decia algo era el texto del boton. Esto la hace visible: etapa,
 * porcentaje real, «85 MB de 200 MB» y, cuando ya hay ~2 s de historial de
 * velocidad, cuanto falta. Con menos historial NO se muestra tiempo: estimarlo
 * antes seria inventarlo.
 *
 * Accesible: `role="progressbar"` con valor y nombre (la etapa). En las etapas sin
 * avance medible (preparar, guardar) la barra queda «indeterminada»: sin
 * `aria-valuenow`, con un brillo que corre. Con «reducir movimiento» el brillo se
 * quita.
 *
 * Cancelar mide al menos 44 px de alto. */
import { COLOR, FUENTE, LINEA } from '../lib/diseño'
import { tamanoLegible, duracionLegible } from '../lib/tamanos'
import { ETIQUETA_ETAPA, type EstadoSubida } from '../lib/useSubida'
import { Pulsable } from './Pulsable'

export default function BarraSubida({
  estado, alCancelar, nota,
}: {
  estado: EstadoSubida
  /** Sin esto no se pinta el boton Cancelar. */
  alCancelar?: () => void
  /** Linea extra encima de la barra (p. ej. «Archivo 2 de 7»). */
  nota?: string
}) {
  if (!estado.activa || !estado.etapa) return null
  const etapa = estado.etapa
  const nombre = ETIQUETA_ETAPA[etapa]
  const f = estado.fraccion
  const pct = f == null ? null : Math.min(100, Math.max(0, Math.floor(f * 100)))

  const detalle: string[] = []
  if (pct != null) detalle.push(`${pct}%`)
  if (etapa === 'video' && estado.total > 0) {
    detalle.push(`${tamanoLegible(estado.cargado)} de ${tamanoLegible(estado.total)}`)
  }
  if (estado.restanteS != null) detalle.push(`faltan ${duracionLegible(estado.restanteS)}`)

  return (
    <div style={{
      boxSizing: 'border-box', width: '100%', padding: '14px 16px', borderRadius: 14,
      border: `1px solid ${LINEA.marcada}`, background: 'rgba(255,255,255,.03)',
    }}>
      <style>{`
        @keyframes barra-subida-corre { from { transform: translateX(-100%) } to { transform: translateX(300%) } }
        @media (prefers-reduced-motion: reduce) { .barra-subida-brillo { animation: none !important } }
      `}</style>
      {nota && (
        <div style={{ font: `400 12px/1.4 ${FUENTE.ui}`, color: COLOR.textoSuave, marginBottom: 6 }}>{nota}</div>
      )}
      <div style={{
        display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8,
        font: `700 12px/1.3 ${FUENTE.ui}`, letterSpacing: 1.2, textTransform: 'uppercase', color: COLOR.texto,
      }}>
        <span>{nombre}</span>
        {pct != null && <span style={{ fontFamily: FUENTE.mono, color: COLOR.dinero }}>{pct}%</span>}
      </div>

      <div
        role="progressbar" aria-label={nombre} aria-valuemin={0} aria-valuemax={100}
        aria-valuenow={pct ?? undefined}
        aria-valuetext={detalle.length ? `${nombre}: ${detalle.join(', ')}` : nombre}
        style={{ position: 'relative', height: 10, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,.1)' }}
      >
        {pct != null ? (
          <div style={{
            width: `${pct}%`, height: '100%', borderRadius: 999, background: COLOR.dinero,
            transition: 'width .25s linear',
          }} />
        ) : (
          <div className="barra-subida-brillo" style={{
            position: 'absolute', top: 0, bottom: 0, width: '33%', borderRadius: 999, background: COLOR.dinero,
            animation: 'barra-subida-corre 1.3s ease-in-out infinite',
          }} />
        )}
      </div>

      {detalle.length > 0 && (
        <div style={{ marginTop: 8, font: `400 12px/1.4 ${FUENTE.mono}`, color: COLOR.textoSuave }}>
          {detalle.join(' · ')}
        </div>
      )}

      {alCancelar && (
        <Pulsable al={alCancelar} style={{
          marginTop: 12, minHeight: 44, padding: '0 18px', cursor: 'pointer', borderRadius: 12,
          border: '1px solid rgba(255,255,255,.28)', color: COLOR.texto,
          font: `700 12px/1 ${FUENTE.ui}`, letterSpacing: 1.4, textTransform: 'uppercase',
        }}>Cancelar</Pulsable>
      )}
    </div>
  )
}
