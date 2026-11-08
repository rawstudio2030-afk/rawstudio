/* Marco del panel: barra lateral fija y area de trabajo.
 *
 * Deliberadamente NO es responsivo. El resto de la aplicacion se diseño para
 * el celular; esto es una herramienta de escritorio para revisar tablas,
 * comparar cifras y moderar. Por debajo del ancho minimo aparece scroll
 * horizontal en vez de reacomodarse: preferimos que se vea incomodo a que se
 * vea distinto, porque una tabla apilada en tarjetas deja de ser una tabla.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { COLOR, LINEA, FUENTE } from '../lib/diseño'
import Wordmark from '../components/Wordmark'
import { elegirModo } from '../lib/modo'
import { ANCHO_MINIMO } from './piezas'
import { Pulsable, Enlace } from '../components/Pulsable'
import { GRUPOS, MODULOS } from './modulos'
import { PendientesCtx, SIN_DATOS, cargarPendientes, type Pendientes } from './pendientes'

export function useModulo() {
  const { modulo } = useParams()
  // Sin modulo en la URL (`/admin`) o con uno desconocido cae en el Resumen: antes
  // caia en Usuarios y una URL inventada parecia una seccion valida.
  return MODULOS.find(m => m.clave === modulo) ?? MODULOS[0]
}

/* (Ahora forma parte del lote de `pendientes.ts`.) Archivos vencidos esperando a que alguien pulse «Purgar».
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
/** Lote de pendientes para los avisos del menu y el Resumen: al montar y al volver a la
 *  ventana, con un minimo de 30 s entre pedidos. */
function useLotePendientes() {
  const [p, setP] = useState<Pendientes>(SIN_DATOS)
  const ultimo = useRef(0)
  const refrescar = useCallback(() => {
    ultimo.current = Date.now()
    cargarPendientes().then(setP)
  }, [])
  useEffect(() => {
    refrescar()
    const alVolver = () => {
      if (document.visibilityState === 'visible' && Date.now() - ultimo.current > 30_000) refrescar()
    }
    window.addEventListener('focus', alVolver)
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      window.removeEventListener('focus', alVolver)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [refrescar])
  return { p, refrescar }
}

/** Cuantas cosas esperan en cada modulo, y como decirlo en voz alta. */
function avisoDe(clave: string, p: Pendientes): { n: number; texto: string } | null {
  const hay = (n: number, texto: string) => (n > 0 ? { n, texto } : null)
  switch (clave) {
    case 'moderacion':   return hay(p.moderacion, `${p.moderacion} ${p.moderacion === 1 ? 'clip' : 'clips'} por revisar`)
    case 'verificacion': return hay(p.verificacion, `${p.verificacion} ${p.verificacion === 1 ? 'identidad' : 'identidades'} por revisar`)
    case 'reportes':     return hay(p.denuncias, `${p.denuncias} ${p.denuncias === 1 ? 'denuncia abierta' : 'denuncias abiertas'}`)
    case 'retiros': {
      const n = p.retirosPorAprobar + p.retirosPorPagar
      return hay(n, `${n} ${n === 1 ? 'retiro' : 'retiros'} por atender`)
    }
    case 'contenido':    return hay(p.purga, `${p.purga} ${p.purga === 1 ? 'archivo vencido' : 'archivos vencidos'} por purgar`)
    default:             return null
  }
}

export function Marco({ children, titulo, resumen }: {
  children: ReactNode; titulo: string; resumen?: ReactNode
}) {
  const nav = useNavigate()
  const actual = useModulo()
  const lote = useLotePendientes()

  return (
    <PendientesCtx.Provider value={lote}>
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
        {/* La misma marca que en el resto del sitio. El panel es otro lugar,
            pero no otra empresa: lo que lo distingue es el rotulo cian de
            abajo, no un logo distinto. */}
        <div style={{
          boxSizing: 'border-box', width: '100%', padding: '18px 18px 14px',
          borderBottom: `1px solid ${LINEA.tenue}`,
        }}>
          <Wordmark ancho={118} glow={7} />
          <div style={{
            marginTop: 9, font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 1.6,
            textTransform: 'uppercase', color: COLOR.admin,
          }}>Administración</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0 10px' }}>
          {GRUPOS.map(g => (
            <div key={g.titulo} role="group" aria-label={g.titulo}>
              <div style={{
                padding: '14px 18px 6px', font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.6,
                textTransform: 'uppercase', color: COLOR.textoTenue,
              }}>{g.titulo}</div>
              {g.modulos.map(m => {
                const aqui = m.clave === actual.clave
                const aviso = avisoDe(m.clave, lote.p)
                return (
                  <Pulsable key={m.clave}
                    al={() => nav(`/admin/${m.clave}`)}
                    activo={m.listo}
                    // Un numero suelto no dice nada en voz alta. Con rotulo, el
                    // lector lee «Moderación, 3 clips por revisar» en vez de
                    // «Moderación 3».
                    rotulo={aviso ? `${m.titulo}, ${aviso.texto}` : undefined}
                    titulo={m.listo ? (aviso?.texto ?? undefined) : 'Todavía no construido'}
                    style={{
                      boxSizing: 'border-box', width: '100%', textAlign: 'left',
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 18px',
                      cursor: m.listo ? 'pointer' : 'not-allowed',
                      opacity: m.listo ? 1 : .45,
                      background: aqui ? 'rgba(0,229,255,.1)' : 'transparent',
                      borderLeft: `2px solid ${aqui ? COLOR.admin : 'transparent'}`,
                    }}>
                    <span style={{
                      font: `${aqui ? 700 : 500} 13px/1 ${FUENTE.ui}`,
                      color: aqui ? COLOR.texto : COLOR.textoSuave,
                    }}>{m.titulo}</span>

                    {/* El aviso va en magenta y no en el cian del panel: el cian
                        es «estas aqui», y esto es «hay algo que hacer». */}
                    {aviso && (
                      <span aria-hidden style={{
                        marginLeft: 'auto', flex: '0 0 auto',
                        background: COLOR.acento, color: COLOR.fondo,
                        borderRadius: 9, padding: '2px 7px',
                        font: `700 11px/1.4 ${FUENTE.mono}`,
                      }}>{aviso.n > 99 ? '99+' : aviso.n}</span>
                    )}
                  </Pulsable>
                )
              })}
            </div>
          ))}
        </div>

        {/* El cambiador de vuelta. Ademas de navegar, deja apuntado el
            sombrero: si no, al recargar el porton volveria a aparecer o la
            siguiente entrada caeria en el panel sin haberlo pedido. */}
        <Enlace a="/clip" al={() => elegirModo('app')} style={{
          display: 'block', boxSizing: 'border-box', width: '100%',
          padding: '14px 18px', borderTop: `1px solid ${LINEA.tenue}`,
          cursor: 'pointer', font: `500 12px/1 ${FUENTE.ui}`, color: COLOR.textoSuave,
        }}>‹ Volver a la aplicación</Enlace>
      </nav>

      {/* ---- Area de trabajo ---- */}
      <main style={{ padding: '22px 26px 60px', minWidth: 0 }}>
        <header style={{
          display: 'flex', alignItems: 'baseline', gap: 14,
          paddingBottom: 16, borderBottom: `1px solid ${LINEA.tenue}`,
        }}>
          <h1 style={{
            margin: 0, font: `700 24px/1.1 ${FUENTE.ui}`,
          }}>{titulo}</h1>
          {resumen && (
            <span style={{ font: `400 13px/1 ${FUENTE.mono}`, color: COLOR.textoSuave }}>
              {resumen}
            </span>
          )}
        </header>
        <div style={{ marginTop: 20 }}>{children}</div>
      </main>
    </div>
    </PendientesCtx.Provider>
  )
}
