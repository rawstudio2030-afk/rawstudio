/* Modulo 5: finanzas.
 *
 * Las cifras van en COINS, no en pesos. No es pereza: la plataforma mueve dos
 * monedas —coins adentro, pesos afuera— y el puente entre ambas es la recarga,
 * que no existe porque no hay procesador de pagos. Nadie ha definido cuanto
 * vale un coin, asi que ponerle un signo de pesos a estas cifras seria
 * inventar los ingresos.
 */
import { useCallback, useEffect, useState } from 'react'
import { COLOR, LINEA, FUENTE } from '../lib/diseño'
import {
  finanzas, dineroReal, serieFinanzas, rankingCreadoras,
  type FilaFinanzas, type DineroReal, type PuntoSerie, type FilaRanking,
} from '../lib/admin'
import { Boton, Campo, Etiquetado, Tabla, fecha, type Columna } from './piezas'

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
      finanzas(d, h), dineroReal(d, h), serieFinanzas(30), rankingCreadoras(d, h),
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

  const csv = () => {
    const cab = 'fuente,operaciones,bruto_coins,comision_coins,para_creadoras'
    const cuerpo = filas.map(f =>
      [NOMBRE[f.fuente] ?? f.fuente, f.operaciones, f.bruto_coins,
       f.comision_coins, f.para_creadoras].join(',')).join('\n')
    const blob = new Blob([`${cab}\n${cuerpo}\n`], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `finanzas-${desde || 'inicio'}-a-${hasta || 'hoy'}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const columnas: Columna<FilaFinanzas>[] = [
    { clave: 'fuente', titulo: 'Fuente', pinta: f => NOMBRE[f.fuente] ?? f.fuente },
    { clave: 'operaciones', titulo: 'Operaciones', numerica: true, pinta: f => f.operaciones },
    { clave: 'bruto', titulo: 'Bruto', numerica: true,
      pinta: f => <span style={{ color: COLOR.dinero }}>{f.bruto_coins} ⨯</span> },
    { clave: 'comision', titulo: 'Comisión', numerica: true,
      pinta: f => <span style={{ color: COLOR.admin }}>{f.comision_coins} ⨯</span> },
    { clave: 'creadoras', titulo: 'A creadoras', numerica: true,
      pinta: f => <span style={{ color: COLOR.textoSuave }}>{f.para_creadoras} ⨯</span> },
    { clave: 'ticket', titulo: 'Ticket medio', numerica: true,
      pinta: f => <span style={{ color: COLOR.textoTenue }}>
        {f.operaciones ? Math.round(f.bruto_coins / f.operaciones) : 0} ⨯</span> },
  ]

  return (
    <>
      <div style={{
        marginBottom: 16, padding: '10px 13px', border: `1px solid ${LINEA.tenue}`,
        font: `400 11px/1.55 ${FUENTE.ui}`, color: COLOR.textoTenue,
      }}>
        Las cifras de la economía interna van en <b style={{ color: COLOR.dinero }}>coins</b>, no
        en pesos. Nadie ha definido cuánto vale un coin porque todavía no hay procesador de
        pagos; convertirlos sería inventar el número. El dinero real, abajo, sí va en pesos.
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 18 }}>
        <Etiquetado texto="Desde" hijo={<Campo tipo="date" valor={desde} cambia={setDesde} mono />} />
        <Etiquetado texto="Hasta" hijo={<Campo tipo="date" valor={hasta} cambia={setHasta} mono />} />
        {(desde || hasta) && (
          <Boton al={() => { setDesde(''); setHasta('') }}>Todo el histórico</Boton>
        )}
        <div style={{ flex: 1 }} />
        <Boton activo={filas.length > 0} al={csv}>Exportar CSV</Boton>
      </div>

      {error && (
        <div style={{ marginBottom: 14, padding: '10px 13px', border: '1px solid #FF4444',
          color: '#FF4444', font: `400 12px/1.4 ${FUENTE.ui}` }}>{error}</div>
      )}

      {/* ---- Cifras principales ---- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1,
        background: LINEA.tenue, border: `1px solid ${LINEA.tenue}`, marginBottom: 20 }}>
        <Cifra t="Bruto movido" v={`${bruto} ⨯`} c={COLOR.dinero} />
        <Cifra t="Comisión de la plataforma" v={`${comision} ⨯`} c={COLOR.admin}
          pie={bruto ? `${Math.round(comision / bruto * 100)}% del bruto` : undefined} />
        <Cifra t="Pagado a creadoras" v={`${paraEllas} ⨯`} c={COLOR.texto} />
        <Cifra t="Operaciones" v={String(ops)} c={COLOR.texto}
          pie={ventas ? `${ventas.operaciones} clips vendidos` : undefined} />
      </div>

      {/* ---- Gráfica ---- */}
      <Grafica serie={serie} />

      {/* ---- Desglose ---- */}
      <div style={{ margin: '22px 0 10px', font: `700 10px/1 ${FUENTE.ui}`,
        letterSpacing: 1.4, textTransform: 'uppercase', color: COLOR.textoTenue }}>
        Por fuente de ingreso
      </div>
      <Tabla columnas={columnas} filas={filas} clave={f => f.fuente}
        vacia={cargando ? 'Cargando…' : 'Todavía no hay ninguna operación en este rango'} />

      {/* ---- Dinero real ---- */}
      <div style={{ margin: '26px 0 10px', font: `700 10px/1 ${FUENTE.ui}`,
        letterSpacing: 1.4, textTransform: 'uppercase', color: COLOR.textoTenue }}>
        Dinero real, en pesos
      </div>
      {real && (real.ordenes_pagadas > 0 || real.ordenes_pendientes > 0) ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1,
          background: LINEA.tenue, border: `1px solid ${LINEA.tenue}` }}>
          <Cifra t="Entrado" v={pesos(real.entrado_mxn)} c={COLOR.dinero}
            pie={`${real.ordenes_pagadas} órdenes pagadas`} />
          <Cifra t="Pendiente de cobro" v={pesos(real.pendiente_mxn)} c="#FFB020"
            pie={`${real.ordenes_pendientes} órdenes`} />
          <Cifra t="Dispersado a creadoras" v={pesos(real.dispersado_mxn)} c={COLOR.texto} />
          <Cifra t="Retenido (ISR + IVA)" v={pesos(real.isr_mxn + real.iva_ret_mxn)} c={COLOR.admin}
            pie="Se entera al SAT" />
        </div>
      ) : (
        <div style={{ padding: '26px 20px', border: `1px solid ${LINEA.tenue}`,
          font: `400 12px/1.6 ${FUENTE.ui}`, color: COLOR.textoTenue }}>
          <b style={{ color: COLOR.texto }}>No ha entrado ni un peso todavía</b>, y no es un
          error: falta integrar el procesador de pagos. Las tablas y los cálculos de retención
          ya existen — en cuanto haya una orden pagada, estas cifras se llenan solas.
        </div>
      )}

      {/* ---- Ranking ---- */}
      <div style={{ margin: '26px 0 10px', font: `700 10px/1 ${FUENTE.ui}`,
        letterSpacing: 1.4, textTransform: 'uppercase', color: COLOR.textoTenue }}>
        Creadoras por ingresos
      </div>
      {ranking.length === 0 ? (
        <div style={{ padding: '26px 20px', border: `1px solid ${LINEA.tenue}`,
          textAlign: 'center', font: `400 12px/1 ${FUENTE.ui}`, color: COLOR.textoApagado }}>
          Ninguna creadora ha ganado nada todavía
        </div>
      ) : (
        <div style={{ border: `1px solid ${LINEA.tenue}` }}>
          {ranking.map((r, i) => (
            <div key={r.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
              borderBottom: i < ranking.length - 1 ? `1px solid ${LINEA.tenue}` : 'none',
            }}>
              <span style={{ width: 22, font: `400 12px/1 ${FUENTE.mono}`, color: COLOR.textoApagado }}>
                {i + 1}
              </span>
              <span style={{ flex: 1, font: `400 13px/1 ${FUENTE.ui}` }}>
                {r.nombre} <span style={{ color: COLOR.textoTenue,
                  font: `400 11px/1 ${FUENTE.mono}` }}>@{r.handle}</span>
              </span>
              <span style={{ font: `400 11px/1 ${FUENTE.mono}`, color: COLOR.textoTenue }}>
                {r.ventas} ventas · {r.propinas} propinas · {r.clips_publicados} clips
              </span>
              <span style={{ width: 90, textAlign: 'right',
                font: `400 14px/1 ${FUENTE.mono}`, color: COLOR.dinero }}>{r.ganado} ⨯</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 22, padding: '10px 13px', border: `1px dashed ${LINEA.tenue}`,
        font: `400 11px/1.55 ${FUENTE.ui}`, color: COLOR.textoApagado }}>
        <b>Falta la tasa de conversión.</b> No se puede calcular sin contar cuánta gente vio
        un clip sin comprarlo, y hoy no se registran las vistas. Requiere decidir antes qué
        se guarda de cada visita, que es una decisión de privacidad además de técnica.
      </div>
    </>
  )
}

function Cifra({ t, v, c, pie }: { t: string; v: string; c: string; pie?: string }) {
  return (
    <div style={{ background: COLOR.superficie, padding: '13px 15px' }}>
      <div style={{ font: `700 8px/1 ${FUENTE.ui}`, letterSpacing: 1.3,
        textTransform: 'uppercase', color: COLOR.textoTenue }}>{t}</div>
      <div style={{ marginTop: 7, font: `400 21px/1 ${FUENTE.mono}`, color: c }}>{v}</div>
      {pie && <div style={{ marginTop: 5, font: `400 10px/1.3 ${FUENTE.mono}`,
        color: COLOR.textoApagado }}>{pie}</div>}
    </div>
  )
}

/* Grafica en SVG a mano: el proyecto no tiene libreria de graficos y meter
 * una para dibujar treinta barras seria desproporcionado. */
function Grafica({ serie }: { serie: PuntoSerie[] }) {
  const max = Math.max(1, ...serie.map(p => p.coins))
  const vacia = serie.every(p => p.coins === 0)
  const an = 900, al = 130, paso = serie.length ? an / serie.length : an

  if (vacia) {
    return (
      <div style={{ padding: '30px 20px', border: `1px solid ${LINEA.tenue}`,
        font: `400 12px/1.5 ${FUENTE.ui}`, color: COLOR.textoTenue }}>
        Sin movimiento en los últimos 30 días. No se dibuja una gráfica plana en cero
        porque parecería que algo se rompió.
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
              <title>{`${p.dia}: ${p.coins} coins en ${p.operaciones} operaciones`}</title>
            </rect>
          )
        })}
        <line x1="0" y1={al} x2={an} y2={al} stroke={LINEA.suave} strokeWidth="1" />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between',
        font: `400 10px/1 ${FUENTE.mono}`, color: COLOR.textoApagado }}>
        <span>{fecha(serie[0]?.dia)}</span>
        <span>máximo {max} ⨯ en un día</span>
        <span>{fecha(serie[serie.length - 1]?.dia)}</span>
      </div>
    </div>
  )
}
