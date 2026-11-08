/* Modulo 5: finanzas.
 *
 * DOS MONEDAS, Y SIGUEN SIN SUMARSE. La economia interna se cuenta en DOLARES:
 * lo que paga quien compra y lo que gana quien publica. Las dispersiones van
 * en PESOS, porque el SPEI es en pesos y el SAT retiene sobre pesos.
 *
 * El puente entre ambas es el tipo de cambio dolar-peso, que a diferencia del
 * viejo valor del coin SI es un numero real y comprobable. Aun asi no se
 * mezclan en la misma cifra: un total que sumara dolares con pesos no
 * significaria nada.
 */
import { useCallback, useEffect, useState } from 'react'
import { cuantos, palabra } from '../lib/plural'
import { COLOR, LINEA, FUENTE } from '../lib/diseño'
import {
  finanzas, dineroReal, serieFinanzasRango, rankingCreadoras,
  type FilaFinanzas, type DineroReal, type PuntoSerie, type FilaRanking,
} from '../lib/admin'
import { Boton, Campo, Etiquetado, Tabla, Cifra, fecha, type Columna } from './piezas'
import { usd, usdPlano } from '../lib/dinero'
import { descargarCSV, type Celda } from './csv'

const NOMBRE: Record<string, string> = {
  venta_clip: 'Venta de clips', renta: 'Rentas', propina: 'Propinas',
  chat: 'Chat monetizado', encargo: 'Videos personalizados',
  entrada_show: 'Entradas a shows',
}

const pesos = (centavos: number) =>
  (centavos / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

export default function Finanzas() {
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [filas, setFilas] = useState<FilaFinanzas[]>([])
  const [real, setReal] = useState<DineroReal | null>(null)
  const [serie, setSerie] = useState<PuntoSerie[]>([])
  const [ranking, setRanking] = useState<FilaRanking[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    const d = desde ? new Date(desde).toISOString() : null
    const h = hasta ? new Date(hasta + 'T23:59:59').toISOString() : null
    const [f, r, s, k] = await Promise.all([
      finanzas(d, h), dineroReal(d, h), serieFinanzasRango(d, h), rankingCreadoras(d, h),
    ])
    setFilas(f.filas); setError(f.error); setReal(r); setSerie(s); setRanking(k)
    setCargando(false)
  }, [desde, hasta])

  useEffect(() => { cargar() }, [cargar])

  const bruto = filas.reduce((s, f) => s + f.bruto_coins, 0)
  const comision = filas.reduce((s, f) => s + f.comision_coins, 0)
  const paraEllas = filas.reduce((s, f) => s + f.para_creadoras, 0)
  const ops = filas.reduce((s, f) => s + f.operaciones, 0)
  const ventas = filas.find(f => f.fuente === 'venta_clip')

  // Lo que se ve en pantalla, en un archivo: las mismas cifras del rango elegido.
  // Dolares y pesos NUNCA comparten columna: la economia interna va en USD y lo
  // realmente transferido por SPEI, en MXN. El reparto a creadoras es lo que les
  // corresponde por sus ventas, no una transferencia hecha.
  const hayReal = !!real && (real.ordenes_pagadas > 0 || real.ordenes_pendientes > 0 || real.dispersado_mxn > 0)
  const csv = () => {
    const cab = [
      'Fuente', 'Operaciones', 'Bruto (USD)', 'Comisión de la plataforma (USD)',
      'Reparto a creadoras (USD, no es una transferencia)', 'Dispersado a creadoras por SPEI (MXN)',
    ]
    const cuerpo: Celda[][] = filas.map(f => [
      NOMBRE[f.fuente] ?? f.fuente, f.operaciones, usdPlano(f.bruto_coins),
      usdPlano(f.comision_coins), usdPlano(f.para_creadoras), '',
    ])
    cuerpo.push(['Total', ops, usdPlano(bruto), usdPlano(comision), usdPlano(paraEllas), ''])
    if (hayReal && real) cuerpo.push(['Dinero real: dispersado a creadoras', '', '', '', '', (real.dispersado_mxn / 100).toFixed(2)])
    descargarCSV(`finanzas-${desde || 'inicio'}-a-${hasta || 'hoy'}.csv`, cab, cuerpo)
  }

  const columnas: Columna<FilaFinanzas>[] = [
    { clave: 'fuente', titulo: 'Fuente', pinta: f => NOMBRE[f.fuente] ?? f.fuente },
    { clave: 'operaciones', titulo: 'Operaciones', numerica: true, pinta: f => f.operaciones },
    { clave: 'bruto', titulo: 'Bruto', numerica: true,
      pinta: f => <span style={{ color: COLOR.dinero }}>{usd(f.bruto_coins)}</span> },
    { clave: 'comision', titulo: 'Comisión', numerica: true,
      pinta: f => <span style={{ color: COLOR.admin }}>{usd(f.comision_coins)}</span> },
    { clave: 'creadoras', titulo: 'Parte de creadoras', numerica: true,
      pinta: f => <span style={{ color: COLOR.textoSuave }}>{usd(f.para_creadoras)}</span> },
    { clave: 'ticket', titulo: 'Ticket medio', numerica: true,
      pinta: f => <span style={{ color: COLOR.textoSuave }}>
        {usd(f.operaciones ? Math.round(f.bruto_coins / f.operaciones) : 0)}</span> },
  ]

  return (
    <>
      <div style={{
        marginBottom: 16, padding: '10px 13px', border: `1px solid ${LINEA.tenue}`,
        font: `400 11px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave,
      }}>
        Las cifras de la economía interna van en <b style={{ color: COLOR.dinero }}>dólares</b>: lo
        que paga quien compra y lo que le corresponde a quien publica. Los <b style={{ color: COLOR.texto }}>pesos</b>{' '}
        aparecen solo abajo, en «Dinero real», y son lo que de verdad se transfirió por SPEI. Una
        cosa no se convierte en la otra aquí, y lo que se les debe a las creadoras no se presenta
        como una transferencia hecha.
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 18 }}>
        <Etiquetado texto="Desde" hijo={<Campo tipo="date" valor={desde} cambia={setDesde} mono />} />
        <Etiquetado texto="Hasta" hijo={<Campo tipo="date" valor={hasta} cambia={setHasta} mono />} />
        {(desde || hasta) && (
          <Boton al={() => { setDesde(''); setHasta('') }}>Todo el histórico</Boton>
        )}
        <div style={{ flex: 1 }} />
        <Boton activo={filas.length > 0 || hayReal} al={csv}>Descargar CSV del rango</Boton>
      </div>

      {error && (
        <div style={{ marginBottom: 14, padding: '10px 13px', border: '1px solid #FF4444',
          color: '#FF4444', font: `400 12px/1.45 ${FUENTE.ui}` }}>{error}</div>
      )}

      {/* ---- Cifras principales ---- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1,
        background: LINEA.tenue, border: `1px solid ${LINEA.tenue}`, marginBottom: 20 }}>
        <Cifra t="Bruto movido" v={`${usd(bruto)}`} c={COLOR.dinero} />
        <Cifra t="Comisión de la plataforma" v={`${usd(comision)}`} c={COLOR.admin}
          pie={bruto ? `${Math.round(comision / bruto * 100)}% del bruto` : undefined} />
        <Cifra t="Reparto a creadoras" v={`${usd(paraEllas)}`} c={COLOR.texto}
          pie="Su parte de las ventas, en la app · no es una transferencia" />
        <Cifra t="Operaciones" v={String(ops)} c={COLOR.texto}
          pie={ventas ? `${cuantos(ventas.operaciones, 'clip')} ${palabra(ventas.operaciones, 'vendido')}` : undefined} />
      </div>

      {/* ---- Gráfica ---- */}
      <Grafica serie={serie} sinRango={!desde && !hasta} />

      {/* ---- Desglose ---- */}
      <div style={{ margin: '22px 0 10px', font: `700 11px/1 ${FUENTE.ui}`,
        letterSpacing: 1.2, textTransform: 'uppercase', color: COLOR.textoSuave }}>
        Por fuente de ingreso
      </div>
      <Tabla columnas={columnas} filas={filas} clave={f => f.fuente}
        vacia={cargando ? 'Cargando…' : 'Todavía no hay ninguna operación en este rango'} />

      {/* ---- Dinero real ---- */}
      <div style={{ margin: '26px 0 10px', font: `700 11px/1 ${FUENTE.ui}`,
        letterSpacing: 1.2, textTransform: 'uppercase', color: COLOR.textoSuave }}>
        Dinero real, en pesos
      </div>
      {real && (real.ordenes_pagadas > 0 || real.ordenes_pendientes > 0 || real.dispersado_mxn > 0) ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1,
          background: LINEA.tenue, border: `1px solid ${LINEA.tenue}` }}>
          <Cifra t="Entrado" v={pesos(real.entrado_mxn)} c={COLOR.dinero}
            pie={`${cuantos(real.ordenes_pagadas, 'orden', 'órdenes')} ${palabra(real.ordenes_pagadas, 'pagada')}`} />
          <Cifra t="Pendiente de cobro" v={pesos(real.pendiente_mxn)} c="#FFB020"
            pie={cuantos(real.ordenes_pendientes, 'orden', 'órdenes')} />
          <Cifra t="Dispersado a creadoras" v={pesos(real.dispersado_mxn)} c={COLOR.texto}
            pie="Transferencias SPEI realmente hechas" />
          <Cifra t="Retenido (ISR + IVA)" v={pesos(real.isr_mxn + real.iva_ret_mxn)} c={COLOR.admin}
            pie="Se entera al SAT" />
        </div>
      ) : (
        <div style={{ padding: '26px 20px', border: `1px solid ${LINEA.tenue}`,
          font: `400 12px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
          <b style={{ color: COLOR.texto }}>No ha entrado ni un peso todavía</b>, y no es un
          error: falta integrar el procesador de pagos. Las tablas y los cálculos de retención
          ya existen — en cuanto haya una orden pagada, estas cifras se llenan solas.
        </div>
      )}

      {/* ---- Ranking ---- */}
      <div style={{ margin: '26px 0 10px', font: `700 11px/1 ${FUENTE.ui}`,
        letterSpacing: 1.2, textTransform: 'uppercase', color: COLOR.textoSuave }}>
        Creadoras por ingresos
      </div>
      {ranking.length === 0 ? (
        <div style={{ padding: '26px 20px', border: `1px solid ${LINEA.tenue}`,
          textAlign: 'center', font: `400 12px/1 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
          Ninguna creadora ha ganado nada todavía
        </div>
      ) : (
        <div style={{ border: `1px solid ${LINEA.tenue}` }}>
          {ranking.map((r, i) => (
            <div key={r.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
              borderBottom: i < ranking.length - 1 ? `1px solid ${LINEA.tenue}` : 'none',
            }}>
              <span style={{ width: 22, font: `400 12px/1 ${FUENTE.mono}`, color: COLOR.textoSuave }}>
                {i + 1}
              </span>
              <span style={{ flex: 1, font: `400 13px/1 ${FUENTE.ui}` }}>
                {r.nombre} <span style={{ color: COLOR.textoSuave,
                  font: `400 11px/1 ${FUENTE.mono}` }}>@{r.handle}</span>
              </span>
              <span style={{ font: `400 11px/1 ${FUENTE.mono}`, color: COLOR.textoSuave }}>
                {r.ventas} ventas · {r.propinas} propinas · {r.clips_publicados} clips
              </span>
              <span style={{ width: 90, textAlign: 'right',
                font: `400 13px/1 ${FUENTE.mono}`, color: COLOR.dinero }}>{usd(r.ganado)}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 22, padding: '10px 13px', border: `1px dashed ${LINEA.tenue}`,
        font: `400 11px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
        <b>Falta la tasa de conversión.</b> No se puede calcular sin contar cuánta gente vio
        un clip sin comprarlo, y hoy no se registran las vistas. Requiere decidir antes qué
        se guarda de cada visita, que es una decisión de privacidad además de técnica.
      </div>
    </>
  )
}

/* Grafica en SVG a mano: el proyecto no tiene libreria de graficos y meter
 * una para dibujar treinta barras seria desproporcionado. */
function Grafica({ serie, sinRango }: { serie: PuntoSerie[]; sinRango: boolean }) {
  const max = Math.max(1, ...serie.map(p => p.coins))
  const vacia = serie.every(p => p.coins === 0)
  const an = 900, al = 130, paso = serie.length ? an / serie.length : an

  if (vacia) {
    return (
      <div style={{ padding: '30px 20px', border: `1px solid ${LINEA.tenue}`,
        font: `400 12px/1.45 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
        {sinRango ? 'Sin movimiento en los últimos 30 días.' : 'Sin movimiento en el rango elegido.'}{' '}
        No se dibuja una gráfica plana en cero porque parecería que algo se rompió.
      </div>
    )
  }
  return (
    <div style={{ border: `1px solid ${LINEA.tenue}`, padding: '14px 16px 10px' }}>
      <svg viewBox={`0 0 ${an} ${al + 18}`} style={{ width: '100%', height: 150 }}>
        {serie.map((p, i) => {
          const h = p.coins / max * al
          return (
            <rect key={p.dia} x={i * paso + 1} y={al - h}
              width={Math.max(1, paso - 3)} height={h}
              fill={p.coins ? COLOR.dinero : LINEA.tenue}>
              <title>{`${p.dia}: ${usd(p.coins)} en ${cuantos(p.operaciones, 'operación', 'operaciones')}`}</title>
            </rect>
          )
        })}
        <line x1="0" y1={al} x2={an} y2={al} stroke={LINEA.suave} strokeWidth="1" />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between',
        font: `400 11px/1 ${FUENTE.mono}`, color: COLOR.textoSuave }}>
        <span>{fecha(serie[0]?.dia)}</span>
        <span>máximo {usd(max)} en un día</span>
        <span>{fecha(serie[serie.length - 1]?.dia)}</span>
      </div>
    </div>
  )
}
