/* Modulo 8: retiros y reembolsos.
 *
 * Aqui sale dinero de verdad, asi que todo pasa por confirmacion y queda en la
 * bitacora con IP. El detalle que manda: la creadora gana en DOLARES y el SPEI
 * se manda en PESOS. La aprobacion se niega mientras no este puesto el tipo de
 * cambio: un numero supuesto aqui se convierte en una transferencia real por
 * la cantidad equivocada.
 */
import { useCallback, useEffect, useState } from 'react'
import { COLOR, LINEA, FUENTE } from '../lib/diseño'
import { usd, aCentavos } from '../lib/dinero'
import {
  listarRetiros, resolverRetiro, marcarPagado, encargosEnDisputa,
  reembolsar, tipoCambio, fijarTipoCambio, mostrarPesos, fijarMostrarPesos,
  tasasConfirmadas, confirmarTasas,
  ajustesPendientes, aprobarAjuste, rechazarAjuste, type AjustePendiente,
  type Retiro, type EstadoRetiro, type EncargoDisputa,
} from '../lib/admin'
import {
  Tabla, Boton, Campo, Confirmar, Etiquetado, Paginador,
  desde, type Columna,
} from './piezas'
import { Pulsable } from '../components/Pulsable'

const POR_PAGINA = 30
const pesos = (c: number | null) => c == null ? '—'
  : (c / 100).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

const PESTANAS: { v: EstadoRetiro; t: string }[] = [
  { v: 'pendiente',  t: 'Pendientes' },
  { v: 'aprobada',   t: 'Por pagar'  },
  { v: 'pagada',     t: 'Pagadas'    },
  { v: 'rechazada',  t: 'Rechazadas' },
]

export default function Retiros() {
  const [estado, setEstado] = useState<EstadoRetiro>('pendiente')
  const [filas, setFilas] = useState<Retiro[]>([])
  const [total, setTotal] = useState(0)
  const [pagina, setPagina] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [coin, setCoin] = useState<number | null>(null)
  const [verPesos, setVerPesos] = useState(false)
  const [editandoCoin, setEditandoCoin] = useState(false)
  const [nuevoCoin, setNuevoCoin] = useState('')
  const [disputas, setDisputas] = useState<EncargoDisputa[]>([])
  const [dialogo, setDialogo] = useState<
    { r: Retiro; que: 'aprobar' | 'rechazar' | 'pagar' } | null>(null)
  const [reembolso, setReembolso] = useState<EncargoDisputa | null>(null)
  const [tasas, setTasas] = useState(false)
  const [confirmaTasas, setConfirmaTasas] = useState(false)
  const [pend, setPend] = useState<AjustePendiente[]>([])
  const [firma, setFirma] = useState<{ a: AjustePendiente; que: 'aprobar' | 'rechazar' } | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    const r = await listarRetiros(estado, pagina, POR_PAGINA)
    setFilas(r.filas); setTotal(r.total); setError(r.error); setCargando(false)
    setCoin(await tipoCambio())
    setVerPesos(await mostrarPesos())
    setDisputas(await encargosEnDisputa())
    setTasas(await tasasConfirmadas())
    setPend(await ajustesPendientes())
  }, [estado, pagina])

  useEffect(() => { cargar() }, [cargar])

  const tras = async (m: string) => {
    if (m) { setError(m); return }
    setError(''); setDialogo(null); setReembolso(null); setFirma(null)
    setConfirmaTasas(false); await cargar()
  }

  const columnas: Columna<Retiro>[] = [
    { clave: 'quien', titulo: 'Creadora', pinta: r => (
      <div>
        <div style={{ color: COLOR.texto }}>{r.nombre}</div>
        <div style={{ font: `400 11px/1.3 ${FUENTE.mono}`, color: COLOR.textoSuave }}>
          @{r.handle}{!r.verificada && <span style={{ color: '#FF4444' }}> · sin verificar</span>}
        </div>
      </div>
    ) },
    { clave: 'coins', titulo: 'Pide', numerica: true, ancho: 110,
      pinta: r => <span style={{ color: COLOR.dinero }}>{usd(r.coins)}</span> },
    { clave: 'pesos', titulo: 'En pesos', numerica: true, ancho: 130,
      pinta: r => r.bruto_mxn != null
        ? <span>{pesos(r.bruto_mxn)}</span>
        : <span style={{ color: coin ? COLOR.textoSuave : '#FFB020' }}>
            {coin ? pesos(Math.round(r.coins * coin / 100)) : 'falta el tipo de cambio'}</span> },
    { clave: 'neto', titulo: 'Neto', numerica: true, ancho: 120,
      pinta: r => <span style={{ color: r.neto_mxn ? COLOR.dinero : COLOR.textoSuave }}>
        {pesos(r.neto_mxn)}</span> },
    { clave: 'saldo', titulo: 'Saldo actual', numerica: true, ancho: 110,
      pinta: r => <span style={{ color: COLOR.textoSuave }}>{usd(r.saldo_actual)}</span> },
    { clave: 'cuando', titulo: 'Pedido', ancho: 120,
      pinta: r => <span style={{ color: COLOR.textoSuave }}>{desde(r.created_at)}</span> },
    { clave: 'acc', titulo: '', pinta: r => (
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        {r.estado === 'pendiente' && <>
          <Boton chico tono="primario" al={() => setDialogo({ r, que: 'aprobar' })}>Aprobar</Boton>
          <Boton chico tono="peligro" al={() => setDialogo({ r, que: 'rechazar' })}>Rechazar</Boton>
        </>}
        {r.estado === 'aprobada' && (
          <Boton chico tono="primario" al={() => setDialogo({ r, que: 'pagar' })}>
            Marcar como pagado
          </Boton>
        )}
        {r.spei_ref && (
          <span style={{ font: `400 11px/1.6 ${FUENTE.mono}`, color: COLOR.textoSuave }}>
            {r.spei_ref}
          </span>
        )}
      </div>
    ) },
  ]

  return (
    <>
      {/* ---- Tipo de cambio ---- */}
      <div style={{ marginBottom: 16, padding: '12px 14px',
        border: `1px solid ${coin ? LINEA.tenue : '#FFB020'}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 1.2,
              textTransform: 'uppercase', color: coin ? COLOR.texto : '#FFB020' }}>
              {coin ? `1 USD = ${pesos(coin)}` : 'Falta definir el tipo de cambio dólar-peso'}
            </div>
            <div style={{ marginTop: 6, font: `400 11px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
              {coin
                ? 'Con este tipo de cambio se convierten los dólares que ganó a los pesos que se le transfieren, y sobre esos pesos se calculan las retenciones del SAT.'
                : 'Sin este número no se puede aprobar ningún retiro: la creadora gana en dólares y el SPEI se manda en pesos.'}
            </div>
          </div>
          {editandoCoin ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <Etiquetado texto="Pesos por dólar" hijo={
                <Campo valor={nuevoCoin} cambia={setNuevoCoin} mono autoFoco marcador="18.50" />
              } />
              <Boton tono="primario" activo={(aCentavos(nuevoCoin) ?? 0) > 0}
                al={async () => {
                  const m = await fijarTipoCambio(aCentavos(nuevoCoin) ?? 0)
                  if (m) setError(m)
                  else { setEditandoCoin(false); setAviso('Tipo de cambio guardado.'); await cargar() }
                }}>Guardar</Boton>
              <Boton al={() => setEditandoCoin(false)}>Cancelar</Boton>
            </div>
          ) : (
            <Boton tono={coin ? 'normal' : 'primario'}
              al={() => { setNuevoCoin(coin ? (coin / 100).toFixed(2) : '18.50'); setEditandoCoin(true) }}>
              {coin ? 'Cambiar' : 'Definirlo'}
            </Boton>
          )}
        </div>
      </div>

      {/* ---- Equivalente en pesos para quien ve el sitio ---- */}
      <div style={{ marginBottom: 16, padding: '12px 14px', border: `1px solid ${LINEA.tenue}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 1.2,
              textTransform: 'uppercase', color: COLOR.texto }}>
              Equivalente en pesos en el sitio: {verPesos ? 'encendido' : 'apagado'}
            </div>
            <div style={{ marginTop: 6, font: `400 11px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
              {verPesos
                ? `Junto a cada monto en dólares se muestra su equivalente aproximado en pesos${coin ? ` (por ejemplo, $2.40 ≈ ${pesos(Math.round(240 * coin / 100))})` : ', pero NO se ve mientras falte el tipo de cambio'}. Es solo informativo: lo que se cobra son los dólares. Mantén el tipo de cambio al día.`
                : 'Los montos se ven solo en dólares. Al encenderlo se agrega el equivalente aproximado en pesos junto a cada monto.'}
            </div>
          </div>
          <Boton tono={verPesos ? 'normal' : 'primario'}
            al={async () => {
              const m = await fijarMostrarPesos(!verPesos)
              if (m) setError(m)
              else { setAviso(verPesos ? 'Equivalente en pesos apagado.' : 'Equivalente en pesos encendido.'); await cargar() }
            }}>{verPesos ? 'Apagar' : 'Encender'}</Boton>
        </div>
      </div>

      {/* ---- Tasas de retencion ---- */}
      <div style={{ marginBottom: 16, padding: '12px 14px',
        border: `1px solid ${tasas ? LINEA.tenue : '#FFB020'}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 1.2,
              textTransform: 'uppercase', color: tasas ? COLOR.texto : '#FFB020' }}>
              {tasas ? 'Tasas de retención confirmadas' : 'Tasas de retención provisionales'}
            </div>
            <div style={{ marginTop: 6, font: `400 11px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
              {tasas
                ? 'Un contador las confirmó. Los retiros se pueden aprobar.'
                : 'Las tasas de ISR e IVA son un marcador de posición. Sin que un contador las confirme no se puede aprobar ningún retiro.'}
            </div>
          </div>
          <Boton tono={tasas ? 'normal' : 'primario'} al={() => setConfirmaTasas(true)}>
            {tasas ? 'Marcar como provisionales' : 'Ya las confirmó mi contador'}
          </Boton>
        </div>
      </div>

      {/* ---- Ajustes por aprobar ---- */}
      {pend.length > 0 && (
        <div style={{ marginBottom: 16, padding: '13px 15px', border: '1px solid #FFB020' }}>
          <div style={{ font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 1.2,
            textTransform: 'uppercase', color: '#FFB020' }}>
            Ajustes por aprobar · {pend.length}
          </div>
          <div style={{ marginTop: 6, font: `400 11px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
            Pasaron del tope y no se han aplicado. Los aprueba otra administradora; si solo hay una,
            ella misma pasadas 24 horas.
          </div>
          <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
            {pend.map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12,
                padding: '9px 11px', background: COLOR.superficie }}>
                <div style={{ flex: 1 }}>
                  <div style={{ font: `400 12px/1.45 ${FUENTE.ui}`, color: COLOR.texto }}>
                    {a.tipo === 'ajuste'
                      ? <>Ajuste de <b style={{ color: COLOR.dinero }}>{usd(a.cantidad)}</b> a @{a.objetivo_handle}</>
                      : <>Reembolso de <b style={{ color: COLOR.dinero }}>{usd(a.cantidad)}</b> de @{a.de_quien_handle} a @{a.objetivo_handle}</>}
                  </div>
                  <div style={{ marginTop: 4, font: `400 11px/1.45 ${FUENTE.mono}`, color: COLOR.textoSuave }}>
                    {a.motivo} · propuso @{a.propuesto_handle} · {desde(a.propuesto_at)}
                  </div>
                </div>
                <Boton chico tono="primario" activo={a.puede_aprobar}
                  al={() => setFirma({ a, que: 'aprobar' })}>Aprobar</Boton>
                <Boton chico tono="peligro" al={() => setFirma({ a, que: 'rechazar' })}>Rechazar</Boton>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- Disputas ---- */}
      {disputas.length > 0 && (
        <div style={{ marginBottom: 16, padding: '13px 15px', border: '1px solid #FF4444' }}>
          <div style={{ font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 1.2,
            textTransform: 'uppercase', color: '#FF4444' }}>
            {disputas.length} encargo{disputas.length > 1 ? 's' : ''} pagado y no entregado
          </div>
          <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
            {disputas.map(d => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12,
                padding: '9px 11px', background: COLOR.superficie }}>
                <div style={{ flex: 1 }}>
                  <div style={{ font: `400 12px/1.45 ${FUENTE.ui}`, color: COLOR.texto }}>
                    {d.descripcion.slice(0, 90)}{d.descripcion.length > 90 ? '…' : ''}
                  </div>
                  <div style={{ marginTop: 4, font: `400 11px/1.45 ${FUENTE.mono}`,
                    color: COLOR.textoSuave }}>
                    @{d.fan_handle} pagó {usd(d.coins)} a @{d.creadora_handle} ·{' '}
                    <span style={{ color: '#FF4444' }}>{d.dias_de_retraso} días de retraso</span>
                  </div>
                </div>
                <Boton chico tono="peligro" al={() => setReembolso(d)}>Reembolsar</Boton>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', borderBottom: `1px solid ${LINEA.tenue}`, marginBottom: 16 }}>
        {PESTANAS.map(p => (
          <Pulsable key={p.v} al={() => { setEstado(p.v); setPagina(0) }} activado={estado === p.v} style={{
            padding: '9px 15px', cursor: 'pointer',
            font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 1.2, textTransform: 'uppercase',
            color: estado === p.v ? COLOR.admin : COLOR.textoSuave,
            borderBottom: `2px solid ${estado === p.v ? COLOR.admin : 'transparent'}`,
          }}>{p.t}</Pulsable>
        ))}
      </div>

      {error && (
        <div style={{ marginBottom: 14, padding: '10px 13px', border: '1px solid #FF4444',
          color: '#FF4444', font: `400 12px/1.45 ${FUENTE.ui}` }}>{error}</div>
      )}
      {aviso && (
        <div style={{ marginBottom: 14, padding: '10px 13px', border: `1px solid ${COLOR.dinero}`,
          color: COLOR.dinero, font: `400 12px/1.45 ${FUENTE.ui}` }}>{aviso}</div>
      )}

      <div style={{ opacity: cargando ? .5 : 1 }}>
        <Tabla columnas={columnas} filas={filas} clave={r => r.id}
          vacia={cargando ? 'Cargando…' : 'Ninguna solicitud aquí'} />
      </div>
      <Paginador pagina={pagina} porPagina={POR_PAGINA} total={total} cambia={setPagina} />

      {confirmaTasas && (
        <Confirmar titulo={tasas ? 'Volver a marcar las tasas como provisionales' : 'Confirmar las tasas de retención'}
          tono={tasas ? 'peligro' : 'primario'} etiqueta={tasas ? 'Marcar provisionales' : 'Confirmar'}
          cuerpo={tasas
            ? <>Mientras estén provisionales no se podrá aprobar ningún retiro.</>
            : <>Confirmas que un contador revisó las tasas de ISR e IVA de la tabla de retenciones. A partir de
              aquí los retiros se aprueban y se calculan con ellas. Queda en la bitácora a tu nombre.</>}
          cancela={() => setConfirmaTasas(false)}
          al={async () => tras(await confirmarTasas(!tasas))} />
      )}

      {firma?.que === 'aprobar' && (
        <Confirmar titulo="Aprobar el ajuste" tono="primario" etiqueta="Aprobar y aplicar"
          cuerpo={<>Se aplica de inmediato en el libro: {firma.a.tipo === 'ajuste'
            ? <>{usd(firma.a.cantidad)} a @{firma.a.objetivo_handle}</>
            : <>{usd(firma.a.cantidad)} de @{firma.a.de_quien_handle} a @{firma.a.objetivo_handle}</>}.
            Lo propuso @{firma.a.propuesto_handle}: «{firma.a.motivo}».</>}
          cancela={() => setFirma(null)}
          al={async () => tras(await aprobarAjuste(firma.a.id))} />
      )}

      {firma?.que === 'rechazar' && (
        <Confirmar titulo="Rechazar el ajuste" etiqueta="Rechazar" exigeMotivo
          cuerpo={<>No se aplica nada. Queda anotado quién lo rechazó y por qué.</>}
          cancela={() => setFirma(null)}
          al={async m => tras(await rechazarAjuste(firma.a.id, m))} />
      )}

      {dialogo?.que === 'aprobar' && (
        <Confirmar titulo="Aprobar el retiro" tono="primario" etiqueta="Aprobar"
          cuerpo={<>Se le descuentan <b style={{ color: COLOR.dinero }}>{usd(dialogo.r.coins)}</b> a
            @{dialogo.r.handle} y se calcula la dispersión con las retenciones de ISR e IVA que
            correspondan a su régimen. Todavía no manda el dinero: eso lo haces tú por SPEI y
            después lo marcas como pagado.
            <div style={{ marginTop: 10, font: `400 11px/1.6 ${FUENTE.mono}`, color: COLOR.textoSuave }}>
              {dialogo.r.titular} · {dialogo.r.banco}<br />CLABE {dialogo.r.clabe}
              {dialogo.r.rfc && <> · RFC {dialogo.r.rfc}</>}
            </div></>}
          cancela={() => setDialogo(null)}
          al={async () => {
            const r = await resolverRetiro(dialogo.r.id, true)
            if ('error' in r) return tras(r.error)
            setAviso(`Aprobado. Bruto ${pesos(r.bruto_mxn ?? 0)}, neto a transferir ${pesos(r.neto_mxn ?? 0)}.`)
            await tras('')
          }} />
      )}
      {dialogo?.que === 'rechazar' && (
        <Confirmar titulo="Rechazar el retiro" etiqueta="Rechazar" exigeMotivo
          cuerpo="El motivo se le comunica. Su saldo no se toca y puede volver a solicitarlo."
          cancela={() => setDialogo(null)}
          al={async m => {
            const r = await resolverRetiro(dialogo.r.id, false, m)
            await tras('error' in r ? r.error : '')
          }} />
      )}
      {dialogo?.que === 'pagar' && (
        <PagarDialogo r={dialogo.r} cancela={() => setDialogo(null)} listo={tras} />
      )}
      {reembolso && (
        <ReembolsoDialogo d={reembolso} cancela={() => setReembolso(null)} listo={tras} />
      )}
    </>
  )
}

function PagarDialogo({ r, cancela, listo }: {
  r: Retiro; cancela: () => void; listo: (m: string) => void
}) {
  const [ref, setRef] = useState('')
  return (
    <Confirmar titulo="Marcar como pagado" tono="primario" etiqueta="Confirmar el pago"
      cuerpo={<>Confirmas que ya transferiste <b style={{ color: COLOR.dinero }}>
        {pesos(r.neto_mxn)}</b> a la CLABE {r.clabe}. La referencia del SPEI es la única
        prueba de que salió, así que es obligatoria.</>}
      extra={() => (
        <div style={{ marginTop: 14 }}>
          <Etiquetado texto="Referencia del SPEI" hijo={
            <Campo valor={ref} cambia={setRef} mono autoFoco />
          } />
        </div>
      )}
      cancela={cancela}
      al={async () => { if (ref.trim()) listo(await marcarPagado(r.id, ref.trim())) }} />
  )
}

function ReembolsoDialogo({ d, cancela, listo }: {
  d: EncargoDisputa; cancela: () => void; listo: (m: string) => void
}) {
  const [cantidad, setCantidad] = useState((d.coins / 100).toFixed(2))
  const n = aCentavos(cantidad) ?? 0
  return (
    <Confirmar titulo="Reembolsar el encargo" etiqueta={n > 0 ? `Devolver ${usd(n)}` : 'Pon una cantidad'}
      exigeMotivo
      cuerpo={<>Se le devuelven dólares a @{d.fan_handle} y se le descuentan a @{d.creadora_handle}.
        Puedes devolver menos del total si hubo entrega parcial. Si la creadora ya se gastó el
        dinero, su saldo quedará en negativo: eso es a propósito, para poder cobrárselo después
        en vez de esconderlo.</>}
      extra={() => (
        <div style={{ marginTop: 14 }}>
          <Etiquetado texto={`Cantidad a devolver (pagó ${usd(d.coins)})`} hijo={
            <Campo valor={cantidad} cambia={setCantidad} mono autoFoco marcador="2.40" />
          } />
        </div>
      )}
      cancela={cancela}
      al={async m => {
        if (n <= 0) return
        const r = await reembolsar(d.fan, d.creadora, n, m, d.id)
        listo('error' in r ? r.error : '')
      }} />
  )
}
