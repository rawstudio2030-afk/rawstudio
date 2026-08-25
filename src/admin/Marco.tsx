/* Marco del panel: barra lateral fija y area de trabajo.
 *
 * Deliberadamente NO es responsivo. El resto de la aplicacion se diseño para
 * el celular; esto es una herramienta de escritorio para revisar tablas,
 * comparar cifras y moderar. Por debajo del ancho minimo aparece scroll
 * horizontal en vez de reacomodarse: preferimos que se vea incomodo a que se
 * vea distinto, porque una tabla apilada en tarjetas deja de ser una tabla.
 */
import { type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { COLOR, LINEA, FUENTE } from '../lib/diseño'
import { ANCHO_MINIMO } from './piezas'

export type Modulo = {
  clave: string; titulo: string; n: string
  /** Los modulos aun no construidos se muestran apagados y no se pueden
   *  abrir. Ocultarlos daria la impresion de que el panel esta terminado;
   *  dejarlos entrar a una pantalla vacia seria peor. */
  listo: boolean
}

export const MODULOS: Modulo[] = [
  { clave: 'usuarios',     titulo: 'Usuarios',      n: '01', listo: true  },
  { clave: 'moderacion',   titulo: 'Moderación',    n: '02', listo: true  },
  { clave: 'contenido',    titulo: 'Contenido',     n: '03', listo: true  },
  { clave: 'comunicacion', titulo: 'Comunicación',  n: '04', listo: false },
  { clave: 'finanzas',     titulo: 'Finanzas',      n: '05', listo: true  },
  { clave: 'bitacora',     titulo: 'Bitácora',      n: '06', listo: true  },
  { clave: 'reportes',     titulo: 'Reportes',      n: '07', listo: true  },
  { clave: 'retiros',      titulo: 'Retiros',       n: '08', listo: false },
  { clave: 'verificacion', titulo: 'Verificación',  n: '09', listo: true  },
  { clave: 'herramientas', titulo: 'Herramientas',  n: '—',  listo: true  },
]

export function useModulo() {
  const { modulo } = useParams()
  return MODULOS.find(m => m.clave === modulo) ?? MODULOS[0]
}

export function Marco({ children, titulo, resumen }: {
  children: ReactNode; titulo: string; resumen?: ReactNode
}) {
  const nav = useNavigate()
  const actual = useModulo()

  return (
    <div style={{
      minWidth: ANCHO_MINIMO, minHeight: '100vh',
      background: COLOR.fondo, color: COLOR.texto,
      display: 'grid', gridTemplateColumns: '212px 1fr',
    }}>
      {/* ---- Barra lateral ---- */}
      <nav style={{
        borderRight: `1px solid ${LINEA.tenue}`,
        background: COLOR.superficie,
        position: 'sticky', top: 0, height: '100vh',
        display: 'flex', flexDirection: 'column',
      }}>
        <div onClick={() => nav('/clip')} style={{
          padding: '20px 18px 16px', cursor: 'pointer',
          borderBottom: `1px solid ${LINEA.tenue}`,
        }}>
          <div style={{
            font: `400 19px/1 ${FUENTE.display}`, textTransform: 'uppercase',
            letterSpacing: .5, color: COLOR.texto,
          }}>RAWstudio</div>
          <div style={{
            marginTop: 5, font: `700 8px/1 ${FUENTE.ui}`, letterSpacing: 1.8,
            textTransform: 'uppercase', color: COLOR.admin,
          }}>Administración</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
          {MODULOS.map(m => {
            const aqui = m.clave === actual.clave
            return (
              <div key={m.clave}
                onClick={() => m.listo && nav(`/admin/${m.clave}`)}
                title={m.listo ? undefined : 'Todavía no construido'}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 18px',
                  cursor: m.listo ? 'pointer' : 'not-allowed',
                  opacity: m.listo ? 1 : .32,
                  background: aqui ? 'rgba(0,229,255,.07)' : 'transparent',
                  borderLeft: `2px solid ${aqui ? COLOR.admin : 'transparent'}`,
                }}>
                <span style={{
                  font: `400 10px/1 ${FUENTE.mono}`,
                  color: aqui ? COLOR.admin : COLOR.textoApagado,
                }}>{m.n}</span>
                <span style={{
                  font: `${aqui ? 700 : 400} 12px/1 ${FUENTE.ui}`,
                  color: aqui ? COLOR.texto : COLOR.textoSuave,
                }}>{m.titulo}</span>
              </div>
            )
          })}
        </div>

        <div onClick={() => nav('/clip')} style={{
          padding: '14px 18px', borderTop: `1px solid ${LINEA.tenue}`,
          cursor: 'pointer', font: `400 11px/1 ${FUENTE.ui}`, color: COLOR.textoTenue,
        }}>‹ Volver a la aplicación</div>
      </nav>

      {/* ---- Area de trabajo ---- */}
      <main style={{ padding: '22px 26px 60px', minWidth: 0 }}>
        <header style={{
          display: 'flex', alignItems: 'baseline', gap: 14,
          paddingBottom: 16, borderBottom: `1px solid ${LINEA.tenue}`,
        }}>
          <h1 style={{
            margin: 0, font: `400 27px/1 ${FUENTE.display}`,
            textTransform: 'uppercase', letterSpacing: .5,
          }}>{titulo}</h1>
          {resumen && (
            <span style={{ font: `400 12px/1 ${FUENTE.mono}`, color: COLOR.textoTenue }}>
              {resumen}
            </span>
          )}
        </header>
        <div style={{ marginTop: 20 }}>{children}</div>
      </main>
    </div>
  )
}
