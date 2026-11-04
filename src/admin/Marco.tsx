/* Marco del panel: barra lateral fija y area de trabajo.
 *
 * Deliberadamente NO es responsivo. El resto de la aplicacion se diseño para
 * el celular; esto es una herramienta de escritorio para revisar tablas,
 * comparar cifras y moderar. Por debajo del ancho minimo aparece scroll
 * horizontal en vez de reacomodarse: preferimos que se vea incomodo a que se
 * vea distinto, porque una tabla apilada en tarjetas deja de ser una tabla.
 */
import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { COLOR, LINEA, FUENTE } from '../lib/diseño'
import { elegirModo } from '../lib/modo'
import { ANCHO_MINIMO } from './piezas'
import { Pulsable, Enlace } from '../components/Pulsable'
import { porPurgar } from '../lib/admin'

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
  { clave: 'comunicacion', titulo: 'Comunicación',  n: '04', listo: true  },
  { clave: 'finanzas',     titulo: 'Finanzas',      n: '05', listo: true  },
  { clave: 'bitacora',     titulo: 'Bitácora',      n: '06', listo: true  },
  { clave: 'reportes',     titulo: 'Reportes',      n: '07', listo: true  },
  { clave: 'retiros',      titulo: 'Retiros',       n: '08', listo: true  },
  { clave: 'verificacion', titulo: 'Verificación',  n: '09', listo: true  },
  { clave: 'herramientas', titulo: 'Herramientas',  n: '—',  listo: true  },
]

export function useModulo() {
  const { modulo } = useParams()
  return MODULOS.find(m => m.clave === modulo) ?? MODULOS[0]
}

/* Archivos vencidos esperando a que alguien pulse «Purgar».
 *
 * La purga funciona y esta bien hecha, pero NADA la dispara: hay que entrar a
 * Contenido y pulsar. Se descubrio el 3 de noviembre de 2026 que llevaba sin
 * pulsarse desde que existe — un clip borrado el 28 de agosto, con fecha de
 * purga el 27 de septiembre, seguia con su portada descargable sin
 * credenciales treinta y siete dias despues.
 *
 * El arreglo no es automatizarla. Borrar archivos de verdad necesita la API
 * de Storage, no SQL, y el orden importa —archivos primero, rutas despues, o
 * quedan huerfanos invisibles—; una tarea programada que lo hiciera mal
 * borraria cosas sin nadie mirando. Lo que faltaba no era el musculo, era el
 * aviso: que no haga falta acordarse de ir a ver.
 *
 * Por eso cuenta solo lo VENCIDO (de eso ya se encarga `admin_por_purgar`, que
 * filtra por `purgar_despues_de <= now()`): lo que todavia esta en su plazo de
 * treinta dias no es una tarea pendiente, es una espera a proposito.
 */
function usePorPurgar() {
  const [cuantos, setCuantos] = useState(0)
  useEffect(() => {
    let vivo = true
    porPurgar().then(f => { if (vivo) setCuantos(f.length) })
    return () => { vivo = false }
  }, [])
  return cuantos
}

export function Marco({ children, titulo, resumen }: {
  children: ReactNode; titulo: string; resumen?: ReactNode
}) {
  const nav = useNavigate()
  const actual = useModulo()
  const vencidos = usePorPurgar()

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
        <Enlace a="/clip" style={{
          display: 'block', boxSizing: 'border-box', width: '100%',
          padding: '20px 18px 16px', cursor: 'pointer',
          borderBottom: `1px solid ${LINEA.tenue}`,
        }}>
          <div style={{
            font: `400 19px/1 ${FUENTE.display}`, textTransform: 'uppercase',
            letterSpacing: 0.5, color: COLOR.texto,
          }}>RAWstudio</div>
          <div style={{
            marginTop: 5, font: `700 9px/1 ${FUENTE.ui}`, letterSpacing: 1.6,
            textTransform: 'uppercase', color: COLOR.admin,
          }}>Administración</div>
        </Enlace>

        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
          {MODULOS.map(m => {
            const aqui = m.clave === actual.clave
            const aviso = m.clave === 'contenido' && vencidos > 0
              ? `${vencidos} ${vencidos === 1 ? 'archivo vencido' : 'archivos vencidos'} por purgar`
              : null
            return (
              <Pulsable key={m.clave}
                al={() => nav(`/admin/${m.clave}`)}
                activo={m.listo}
                // Un numero suelto no dice nada en voz alta. Con rotulo, el
                // lector lee «Contenido, 3 archivos vencidos por purgar» en
                // vez de «Contenido 3».
                rotulo={aviso ? `${m.titulo}, ${aviso}` : undefined}
                titulo={m.listo ? (aviso ?? undefined) : 'Todavía no construido'}
                style={{
                  boxSizing: 'border-box', width: '100%', textAlign: 'left',
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

                {/* El aviso va en magenta y no en el cian del panel: el cian
                    es «estas aqui», y esto es «hay algo que hacer». */}
                {m.clave === 'contenido' && vencidos > 0 && (
                  <span style={{
                    marginLeft: 'auto', flex: '0 0 auto',
                    background: COLOR.acento, color: COLOR.fondo,
                    borderRadius: 9, padding: '2px 7px',
                    font: `700 10px/1.4 ${FUENTE.mono}`,
                  }}>{vencidos}</span>
                )}
              </Pulsable>
            )
          })}
        </div>

        {/* El cambiador de vuelta. Ademas de navegar, deja apuntado el
            sombrero: si no, al recargar el porton volveria a aparecer o la
            siguiente entrada caeria en el panel sin haberlo pedido. */}
        <Enlace a="/clip" al={() => elegirModo('app')} style={{
          display: 'block', boxSizing: 'border-box', width: '100%',
          padding: '14px 18px', borderTop: `1px solid ${LINEA.tenue}`,
          cursor: 'pointer', font: `400 10px/1 ${FUENTE.ui}`, color: COLOR.textoTenue,
        }}>‹ Volver a la aplicación</Enlace>
      </nav>

      {/* ---- Area de trabajo ---- */}
      <main style={{ padding: '22px 26px 60px', minWidth: 0 }}>
        <header style={{
          display: 'flex', alignItems: 'baseline', gap: 14,
          paddingBottom: 16, borderBottom: `1px solid ${LINEA.tenue}`,
        }}>
          <h1 style={{
            margin: 0, font: `400 26px/1 ${FUENTE.display}`,
            textTransform: 'uppercase', letterSpacing: 0.5,
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
