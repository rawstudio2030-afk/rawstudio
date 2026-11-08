/* Portada del panel: lo que necesita atencion y los indicadores que YA existen.
 *
 * NO HAY METRICAS INVENTADAS. Nada de visitas, conversion, embudo ni «usuarios
 * nuevos hoy»: la plataforma no registra vistas (lo dice Finanzas) y no existe una
 * consulta agregada de eso. Todo lo de aqui sale de una funcion de la base que ya
 * existia —los conteos de cada cola, las cifras de Finanzas y el uso de
 * almacenamiento— y cada tarjeta lleva al modulo donde se resuelve.
 *
 * Los numeros de «Por atender» son los MISMOS del menu (`pendientes.ts`), pedidos
 * una vez. Si no hay nada pendiente, la pantalla lo dice con todas las letras: una
 * fila de ceros sin contexto parece un panel roto.
 *
 * DOS MONEDAS, SIN MEZCLAR. «Reparto a creadoras» es lo que les corresponde por sus
 * ventas dentro de la app (dolares). «Dispersado» es lo que de verdad se transfirio
 * por SPEI (pesos). Una no es la otra, y no se presenta lo devengado como si fuera
 * una transferencia hecha.
 */
import { useEffect, useState } from 'react'
import { cuantos } from '../lib/plural'
import { COLOR, LINEA, FUENTE } from '../lib/diseño'
import { usd } from '../lib/dinero'
import {
  finanzas, dineroReal, usoAlmacenamiento, tamano, leerBitacora,
  type FilaFinanzas, type DineroReal, type UsoBucket, type EventoBitacora,
} from '../lib/admin'
import { Enlace } from '../components/Pulsable'
import { Cifra, desde as hace, fechaHora, lleva, falta } from './piezas'
import { NOMBRE, GRAVE } from './acciones'
import { usePendientes, totalPendientes } from './pendientes'

const pesos = (centavos: number) =>
  (centavos / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

const DIAS = 30

export default function Resumen() {
  const { p } = usePendientes()
  const [filas, setFilas] = useState<FilaFinanzas[] | null>(null)
  const [real, setReal] = useState<DineroReal | null>(null)
  const [uso, setUso] = useState<UsoBucket[] | null>(null)
  const [actividad, setActividad] = useState<EventoBitacora[] | null>(null)

  useEffect(() => {
    let vivo = true
    const hasta = new Date()
    const desde = new Date(hasta.getTime() - DIAS * 86400000)
    Promise.all([
      finanzas(desde.toISOString(), hasta.toISOString()),
      dineroReal(desde.toISOString(), hasta.toISOString()),
      usoAlmacenamiento(),
      leerBitacora({ pagina: 0, porPagina: 10 }),
    ]).then(([f, r, u, b]) => {
      if (!vivo) return
      setFilas(f.filas); setReal(r); setUso(u.filas); setActividad(b.filas)
    })
    return () => { vivo = false }
  }, [])

  const total = totalPendientes(p)
  const bruto = (filas ?? []).reduce((s, f) => s + f.bruto_coins, 0)
  const comision = (filas ?? []).reduce((s, f) => s + f.comision_coins, 0)
  const reparto = (filas ?? []).reduce((s, f) => s + f.para_creadoras, 0)
  const ops = (filas ?? []).reduce((s, f) => s + f.operaciones, 0)

  // Urgencia: solo con fechas guardadas. Si todo es reciente no hay alarma.
  const a = p.atencion
  const urgenteMod = a.modMasDe24h > 0 && a.modMasAntiguo
    ? `${a.modMasDe24h === 1 ? '1 lleva' : `${a.modMasDe24h} llevan`} más de 24 horas · el más antiguo lleva ${lleva(a.modMasAntiguo)}`
    : undefined
  const urgenteCons = a.consPorVencer > 0 && a.consProximoVence
    ? `${a.consPorVencer === 1 ? '1 se vence' : `${a.consPorVencer} se vencen`} en menos de 12 horas · la próxima, en ${falta(a.consProximoVence)}`
    : undefined

  const totalBytes = uso?.[0]?.total_bytes ?? 0
  const limiteBytes = (uso?.[0]?.limite_mb ?? 0) * 1048576
  const pct = limiteBytes ? Math.min(100, (totalBytes / limiteBytes) * 100) : 0
  const colorUso = totalBytes > limiteBytes ? '#FF4444' : pct >= 80 ? '#FFB020' : COLOR.dinero

  return (
    <>
      <Titulo>Por atender</Titulo>
      {p.listo && total === 0 && (
        <div role="status" style={{ marginBottom: 12, padding: '12px 15px', border: `1px solid ${COLOR.dinero}`,
          color: COLOR.dinero, font: `400 13px/1.5 ${FUENTE.ui}` }}>
          Todo al día: nada esperando revisión.
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12 }}>
        <Tarjeta a="/admin/moderacion" n={p.moderacion} cargando={!p.listo}
          titulo="Clips por revisar" vacio="Nada esperando revisión"
          texto={`${cuantos(p.moderacion, 'clip')} pendiente${p.moderacion === 1 ? '' : 's'} de moderación`}
          urgente={urgenteMod} />
        <Tarjeta a="/admin/verificacion" n={p.verificacion} cargando={!p.listo}
          titulo="Identidades por revisar" vacio="Ninguna identidad esperando"
          texto={`${cuantos(p.verificacion, 'identidad', 'identidades')} esperando revisión manual`} />
        <Tarjeta a="/admin/reportes" n={p.denuncias} cargando={!p.listo}
          titulo="Denuncias abiertas" vacio="Ninguna denuncia por resolver"
          texto={`${cuantos(p.denuncias, 'denuncia')} por resolver`} />
        <Tarjeta a="/admin/retiros" n={p.retirosPorAprobar + p.retirosPorPagar} cargando={!p.listo}
          titulo="Retiros por atender" vacio="Ningún retiro pendiente"
          texto={`${p.retirosPorAprobar} por aprobar · ${p.retirosPorPagar} por pagar`} />
        <Tarjeta a="/admin/consultas" n={p.consultasEsperando} cargando={!p.listo}
          titulo="Consultas por Telegram" vacio={p.consultasVencidas > 0
            ? `Nada esperando · ${cuantos(p.consultasVencidas, 'vencida')} en 30 días`
            : 'Ningún mensaje esperando respuesta'}
          texto={`${cuantos(p.consultasEsperando, 'mensaje')} esperando respuesta · ${cuantos(p.consultasVencidas, 'vencida')} en 30 días`}
          urgente={urgenteCons} />
        <Tarjeta a="/admin/herramientas" n={a.avataresPorRevisar} cargando={!p.listo}
          titulo="Avatares por revisar" vacio="Ninguna creadora sin foto con video publicado"
          texto={`${cuantos(a.avataresPorRevisar, 'creadora')} sin foto con video publicado · se revisan a mano en Herramientas`} />
        <Tarjeta a="/admin/contenido" n={p.purga} cargando={!p.listo}
          titulo="Archivos por purgar" vacio="Ningún archivo vencido"
          texto={`${cuantos(p.purga, 'archivo')} cumplió${p.purga === 1 ? '' : 'eron'} los 30 días`} />
      </div>

      <Titulo>Actividad reciente</Titulo>
      {actividad === null ? (
        <Cargando />
      ) : actividad.length === 0 ? (
        <Vacio>Todavía no hay acciones registradas.</Vacio>
      ) : (
        <div style={{ border: `1px solid ${LINEA.tenue}` }}>
          {actividad.map((e, i) => (
            <div key={e.id} style={{
              display: 'flex', alignItems: 'baseline', gap: 12, padding: '9px 14px',
              borderBottom: i < actividad.length - 1 ? `1px solid ${LINEA.tenue}` : 'none',
              font: `400 12px/1.45 ${FUENTE.ui}`,
            }}>
              <span title={fechaHora(e.created_at)} style={{ flex: '0 0 92px', font: `400 11px/1.45 ${FUENTE.mono}`, color: COLOR.textoSuave }}>
                {hace(e.created_at)}
              </span>
              <span style={{ flex: '0 0 130px', color: e.actor_handle ? COLOR.texto : COLOR.textoSuave }}>
                {e.actor_handle ? `@${e.actor_handle}` : '—'}
              </span>
              <span style={{ flex: 1, color: GRAVE.has(e.accion) ? '#FFB020' : COLOR.texto }}>
                {NOMBRE[e.accion] ?? e.accion.replace(/_/g, ' ')}
              </span>
              <span style={{ flex: '0 0 140px', textAlign: 'right', color: COLOR.textoSuave }}>
                {e.objetivo_handle && e.objetivo !== e.actor ? `@${e.objetivo_handle}` : ''}
              </span>
            </div>
          ))}
        </div>
      )}
      <Enlace a="/admin/bitacora" style={enlaceVer}>Ver bitácora →</Enlace>

      <Titulo>Dinero · últimos {DIAS} días</Titulo>
      {filas === null ? (
        <Cargando />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1,
            background: LINEA.tenue, border: `1px solid ${LINEA.tenue}` }}>
            <Cifra t="Bruto movido" v={usd(bruto)} c={COLOR.dinero} pie="Economía de la app · USD" />
            <Cifra t="Comisión de la plataforma" v={usd(comision)} c={COLOR.admin}
              pie={bruto ? `${Math.round(comision / bruto * 100)}% del bruto` : undefined} />
            <Cifra t="Reparto a creadoras" v={usd(reparto)} c={COLOR.texto}
              pie="Su parte de las ventas · no es una transferencia" />
            <Cifra t="Operaciones" v={String(ops)} c={COLOR.texto} />
          </div>
          <div style={{ marginTop: 1, display: 'grid', gridTemplateColumns: '1fr', gap: 1,
            background: LINEA.tenue, border: `1px solid ${LINEA.tenue}`, borderTop: 0 }}>
            <Cifra t="Dispersado a creadoras" v={real ? pesos(real.dispersado_mxn) : '—'} c={COLOR.texto}
              pie="Transferencias SPEI realmente hechas · MXN" />
          </div>
          <Enlace a="/admin/finanzas" style={enlaceVer}>Ver Finanzas con rango, desglose y ranking →</Enlace>
        </>
      )}

      <Titulo>Almacenamiento</Titulo>
      {uso === null ? (
        <Cargando />
      ) : uso.length === 0 ? (
        <Vacio>No se pudo leer el uso de almacenamiento.</Vacio>
      ) : (
        <div style={{ border: `1px solid ${LINEA.tenue}`, padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ font: `400 22px/1 ${FUENTE.mono}`, color: colorUso }}>{tamano(totalBytes)}</span>
            <span style={{ font: `400 12px/1 ${FUENTE.mono}`, color: COLOR.textoSuave }}>
              de {tamano(limiteBytes)} · {pct.toFixed(1)}%
            </span>
          </div>
          <div aria-hidden style={{ height: 6, marginTop: 10, background: LINEA.tenue }}>
            <div style={{ height: '100%', width: `${pct}%`, background: colorUso }} />
          </div>
          <Enlace a="/admin/herramientas" style={enlaceVer}>Ver el detalle por tipo y por creadora →</Enlace>
        </div>
      )}

      <div style={{ marginTop: 26, font: `400 11px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
        Solo aparecen cifras que existen de verdad. No se registran visitas, así que no hay
        conversión ni embudo.
      </div>
    </>
  )
}

const enlaceVer: React.CSSProperties = {
  display: 'inline-block', marginTop: 10, cursor: 'pointer',
  font: `500 12px/1 ${FUENTE.ui}`, color: COLOR.admin,
}

function Titulo({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ margin: '26px 0 12px', font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 1.6,
      textTransform: 'uppercase', color: COLOR.textoSuave }}>{children}</h2>
  )
}

const Cargando = () => <Vacio>Cargando…</Vacio>

function Vacio({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: '24px 18px', border: `1px solid ${LINEA.tenue}`,
      font: `400 12px/1.45 ${FUENTE.ui}`, color: COLOR.textoSuave }}>{children}</div>
  )
}

/** Una cola: el numero grande si hay algo, y la frase de «nada» si no. */
function Tarjeta({ a, n, titulo, texto, vacio, cargando, urgente }: {
  a: string; n: number; titulo: string; texto: string; vacio: string; cargando: boolean
  /** Una frase de tiempo («2 llevan más de 24 horas…»), solo si de verdad hace falta. */
  urgente?: string
}) {
  const hay = n > 0
  return (
    <Enlace a={a} style={{
      display: 'block', boxSizing: 'border-box', padding: '15px 16px', cursor: 'pointer',
      border: `1px solid ${hay ? COLOR.acento : LINEA.tenue}`, background: COLOR.superficie,
    }}>
      <div style={{ font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.2, textTransform: 'uppercase',
        color: COLOR.textoSuave }}>{titulo}</div>
      <div style={{ marginTop: 10, font: `400 30px/1 ${FUENTE.mono}`,
        color: cargando ? COLOR.textoTenue : hay ? COLOR.acento : COLOR.textoSuave }}>
        {cargando ? '…' : n}
      </div>
      <div style={{ marginTop: 8, font: `400 12px/1.4 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
        {cargando ? 'Cargando…' : hay ? texto : vacio}
      </div>
      {!cargando && hay && urgente && (
        <div style={{ marginTop: 8, font: `700 12px/1.4 ${FUENTE.ui}`, color: '#FFB020' }}>{urgente}</div>
      )}
    </Enlace>
  )
}
