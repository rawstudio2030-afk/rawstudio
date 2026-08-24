/* Modulo 1: usuarios. */
import { useCallback, useEffect, useState } from 'react'
import { COLOR, LINEA, FUENTE } from '../lib/diseño'
import {
  listarUsuarios, fichaUsuario, suspenderCuenta, banearCuenta, reactivarCuenta,
  ajustarSaldo, otorgarAdmin, revocarAdmin, marcarCreadora,
  type FilaUsuario, type FichaUsuario, type OrdenUsuarios,
  type RolUsuario, type EstadoCuenta,
} from '../lib/admin'
import {
  Tabla, Paginador, Boton, Campo, Selector, Etiquetado, Confirmar, Insignia,
  COLOR_ESTADO, COLOR_ROL, fecha, fechaHora, desde,
  type Columna,
} from './piezas'

const POR_PAGINA = 25

/** Que confirmacion esta abierta. Cada accion destructiva o de dinero tiene
 *  la suya; ninguna se ejecuta con un solo clic desde la tabla. */
type Dialogo = 'suspender' | 'banear' | 'reactivar' | 'saldo' | 'rol' | null

export default function Usuarios() {
  const [filas, setFilas]   = useState<FilaUsuario[]>([])
  const [total, setTotal]   = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError]   = useState('')

  const [busqueda, setBusqueda] = useState('')
  const [texto, setTexto]       = useState('')
  const [rol, setRol]           = useState<RolUsuario | ''>('')
  const [estado, setEstado]     = useState<EstadoCuenta | ''>('')
  const [orden, setOrden]       = useState<OrdenUsuarios>('created_at')
  const [desc, setDesc]         = useState(true)
  const [pagina, setPagina]     = useState(0)

  const [abierta, setAbierta]   = useState<FilaUsuario | null>(null)
  const [ficha, setFicha]       = useState<FichaUsuario | null>(null)
  const [dialogo, setDialogo]   = useState<Dialogo>(null)

  // El buscador espera a que dejes de escribir. Sin esto, cada tecla dispara
  // una consulta y la tabla parpadea con resultados de busquedas ya viejas.
  useEffect(() => {
    const t = setTimeout(() => { setBusqueda(texto); setPagina(0) }, 300)
    return () => clearTimeout(t)
  }, [texto])

  const cargar = useCallback(async () => {
    setCargando(true)
    const r = await listarUsuarios({
      busqueda, rol, estado, orden, descendente: desc, pagina, porPagina: POR_PAGINA,
    })
    setFilas(r.filas); setTotal(r.total); setError(r.error); setCargando(false)
  }, [busqueda, rol, estado, orden, desc, pagina])

  useEffect(() => { cargar() }, [cargar])

  useEffect(() => {
    if (!abierta) { setFicha(null); return }
    let vivo = true
    fichaUsuario(abierta.id).then(r => {
      if (!vivo) return
      if ('ficha' in r && r.ficha) setFicha(r.ficha)
    })
    return () => { vivo = false }
  }, [abierta])

  const ordenar = (c: string) => {
    if (c === orden) setDesc(d => !d)
    else { setOrden(c as OrdenUsuarios); setDesc(true) }
    setPagina(0)
  }

  const tras = async (msg: string) => {
    if (msg) { setError(msg); return }
    setError(''); setDialogo(null)
    await cargar()
    if (abierta) {
      const r = await listarUsuarios({ busqueda: abierta.handle, porPagina: 1 })
      setAbierta(r.filas[0] ?? null)
    }
  }

  const columnas: Columna<FilaUsuario>[] = [
    {
      clave: 'handle', titulo: 'Usuaria', ordenable: true,
      pinta: f => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%', flex: '0 0 auto',
            background: `repeating-linear-gradient(130deg,${COLOR.superficieAlta} 0 4px,${COLOR.superficie} 4px 8px)`,
            border: `1px solid ${LINEA.suave}`,
          }} />
          <div>
            <div style={{ color: COLOR.texto }}>{f.display_name}</div>
            <div style={{ font: `400 10px/1.3 ${FUENTE.mono}`, color: COLOR.textoTenue }}>
              @{f.handle}{f.es_demo && ' · demo'}
            </div>
          </div>
        </div>
      ),
    },
    { clave: 'email', titulo: 'Correo', ordenable: true,
      pinta: f => <span style={{ font: `400 11px/1 ${FUENTE.mono}`, color: COLOR.textoSuave }}>{f.email}</span> },
    { clave: 'rol', titulo: 'Rol', ordenable: true,
      pinta: f => <Insignia texto={f.rol} color={COLOR_ROL[f.rol]} /> },
    { clave: 'estado', titulo: 'Estado', ordenable: true,
      pinta: f => (
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          <Insignia texto={f.estado} color={COLOR_ESTADO[f.estado]} />
          {f.identidad_verificada && <Insignia texto="ID" color={COLOR.dinero} />}
        </div>
      ) },
    { clave: 'created_at', titulo: 'Alta', ordenable: true,
      pinta: f => <span style={{ color: COLOR.textoSuave }}>{fecha(f.created_at)}</span> },
    { clave: 'ultimo_acceso', titulo: 'Último acceso', ordenable: true,
      pinta: f => (
        <span style={{ color: f.ultimo_acceso ? COLOR.textoSuave : COLOR.textoApagado }}>
          {desde(f.ultimo_acceso)}
        </span>
      ) },
    { clave: 'saldo', titulo: 'Saldo', ordenable: true, numerica: true,
      pinta: f => <span style={{ color: f.saldo > 0 ? COLOR.dinero : COLOR.textoApagado }}>{f.saldo}</span> },
    { clave: 'total_ganado', titulo: 'Ganado', ordenable: true, numerica: true,
      pinta: f => <span style={{ color: f.total_ganado > 0 ? COLOR.dinero : COLOR.textoApagado }}>{f.total_ganado}</span> },
    { clave: 'clips_total', titulo: 'Clips', ordenable: true, numerica: true,
      pinta: f => (
        <span style={{ color: f.clips_total ? COLOR.textoSuave : COLOR.textoApagado }}>
          {f.clips_publicados}/{f.clips_total}
        </span>
      ) },
  ]

  return (
    <>
      {/* ---- Filtros ---- */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 16 }}>
        <Etiquetado texto="Buscar" ancho={280} hijo={
          <Campo valor={texto} cambia={setTexto} marcador="Nombre, @handle o correo" />
        } />
        <Etiquetado texto="Rol" hijo={
          <Selector valor={rol} cambia={v => { setRol(v); setPagina(0) }} opciones={[
            { v: '' as const, t: 'Todos' }, { v: 'usuaria' as const, t: 'Usuarias' },
            { v: 'creadora' as const, t: 'Creadoras' }, { v: 'admin' as const, t: 'Admins' },
          ]} />
        } />
        <Etiquetado texto="Estado" hijo={
          <Selector valor={estado} cambia={v => { setEstado(v); setPagina(0) }} opciones={[
            { v: '' as const, t: 'Todos' }, { v: 'activa' as const, t: 'Activas' },
            { v: 'suspendida' as const, t: 'Suspendidas' }, { v: 'baneada' as const, t: 'Baneadas' },
          ]} />
        } />
        <div style={{ flex: 1 }} />
        {(busqueda || rol || estado) && (
          <Boton al={() => { setTexto(''); setRol(''); setEstado(''); setPagina(0) }}>
            Limpiar filtros
          </Boton>
        )}
      </div>

      {error && (
        <div style={{
          marginBottom: 14, padding: '10px 13px', border: '1px solid #FF4444',
          color: '#FF4444', font: `400 12px/1.4 ${FUENTE.ui}`,
        }}>{error}</div>
      )}

      <div style={{ opacity: cargando ? .5 : 1, transition: 'opacity .15s' }}>
        <Tabla columnas={columnas} filas={filas} clave={f => f.id}
          orden={orden} descendente={desc} ordenar={ordenar}
          alElegir={setAbierta} elegida={abierta?.id}
          vacia={cargando ? 'Cargando…' : 'Ninguna usuaria cumple ese filtro'} />
      </div>

      <Paginador pagina={pagina} porPagina={POR_PAGINA} total={total} cambia={setPagina} />

      {abierta && (
        <Ficha fila={abierta} ficha={ficha} cierra={() => setAbierta(null)}
          pide={setDialogo} />
      )}

      {/* ---- Confirmaciones ---- */}
      {dialogo === 'suspender' && abierta && (
        <SuspenderDialogo fila={abierta} cancela={() => setDialogo(null)} listo={tras} />
      )}
      {dialogo === 'banear' && abierta && (
        <Confirmar titulo="Banear permanentemente" tono="peligro" etiqueta="Banear"
          exigeMotivo
          cuerpo={<>Se cierra la cuenta de <b style={{ color: COLOR.texto }}>@{abierta.handle}</b> de
            forma indefinida. A diferencia de la suspensión, el baneo no caduca solo.</>}
          cancela={() => setDialogo(null)}
          al={m => banearCuenta(abierta.id, m).then(tras)} />
      )}
      {dialogo === 'reactivar' && abierta && (
        <Confirmar titulo="Reactivar cuenta" tono="primario" etiqueta="Reactivar"
          cuerpo={<>Se levanta el castigo de <b style={{ color: COLOR.texto }}>@{abierta.handle}</b> y
            la cuenta vuelve a quedar activa.</>}
          cancela={() => setDialogo(null)}
          al={() => reactivarCuenta(abierta.id).then(tras)} />
      )}
      {dialogo === 'saldo' && abierta && (
        <SaldoDialogo fila={abierta} cancela={() => setDialogo(null)} listo={tras} />
      )}
      {dialogo === 'rol' && abierta && (
        <RolDialogo fila={abierta} cancela={() => setDialogo(null)} listo={tras} />
      )}
    </>
  )
}

/* ---------- Ficha lateral ---------- */

function Ficha({ fila, ficha, cierra, pide }: {
  fila: FilaUsuario; ficha: FichaUsuario | null
  cierra: () => void; pide: (d: Dialogo) => void
}) {
  const [pestana, setPestana] = useState<'clips' | 'movimientos' | 'acciones'>('clips')

  return (
    <div onClick={cierra} style={{
      position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(8,8,10,.6)',
      display: 'flex', justifyContent: 'flex-end',
    }}>
      <aside onClick={e => e.stopPropagation()} style={{
        width: 520, height: '100vh', overflowY: 'auto',
        background: COLOR.superficie, borderLeft: `1px solid ${LINEA.fuerte}`,
        padding: '22px 24px 50px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ font: `400 24px/1.1 ${FUENTE.display}`, textTransform: 'uppercase' }}>
              {fila.display_name}
            </div>
            <div style={{ marginTop: 4, font: `400 12px/1 ${FUENTE.mono}`, color: COLOR.textoTenue }}>
              @{fila.handle} · {fila.email}
            </div>
          </div>
          <Boton chico al={cierra}>Cerrar</Boton>
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 14 }}>
          <Insignia texto={fila.rol} color={COLOR_ROL[fila.rol]} />
          <Insignia texto={fila.estado} color={COLOR_ESTADO[fila.estado]} />
          {fila.identidad_verificada && <Insignia texto="Identidad verificada" color={COLOR.dinero} />}
        </div>

        {fila.estado !== 'activa' && (
          <div style={{
            marginTop: 14, padding: '10px 12px',
            border: `1px solid ${COLOR_ESTADO[fila.estado]}`,
            font: `400 12px/1.5 ${FUENTE.ui}`, color: COLOR.textoSuave,
          }}>
            <b style={{ color: COLOR_ESTADO[fila.estado] }}>
              {fila.estado === 'baneada' ? 'Baneada' : 'Suspendida'}
            </b>{' '}
            {fila.estado === 'baneada'
              ? <>desde {fechaHora(fila.baneado_at)} — {fila.baneado_motivo}</>
              : <>desde {fechaHora(fila.suspended_at)}
                  {fila.suspendido_hasta
                    ? <> hasta {fechaHora(fila.suspendido_hasta)}</>
                    : <> (sin fecha de fin)</>} — {fila.suspended_reason}</>}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, marginTop: 18,
          background: LINEA.tenue, border: `1px solid ${LINEA.tenue}` }}>
          {[
            { t: 'Saldo', v: fila.saldo, c: COLOR.dinero },
            { t: 'Total ganado', v: fila.total_ganado, c: COLOR.dinero },
            { t: 'Clips', v: `${fila.clips_publicados}/${fila.clips_total}`, c: COLOR.texto },
          ].map(x => (
            <div key={x.t} style={{ background: COLOR.superficie, padding: '11px 13px' }}>
              <div style={{ font: `700 8px/1 ${FUENTE.ui}`, letterSpacing: 1.3,
                textTransform: 'uppercase', color: COLOR.textoTenue }}>{x.t}</div>
              <div style={{ marginTop: 5, font: `400 18px/1 ${FUENTE.mono}`, color: x.c }}>{x.v}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
          {fila.estado === 'activa'
            ? <>
                <Boton al={() => pide('suspender')}>Suspender</Boton>
                <Boton tono="peligro" al={() => pide('banear')}>Banear</Boton>
              </>
            : <Boton tono="primario" al={() => pide('reactivar')}>Reactivar</Boton>}
          <Boton al={() => pide('saldo')}>Ajustar saldo</Boton>
          <Boton al={() => pide('rol')}>Cambiar rol</Boton>
        </div>

        <div style={{ marginTop: 12, font: `400 11px/1.5 ${FUENTE.mono}`, color: COLOR.textoApagado }}>
          Alta {fecha(fila.created_at)} · último acceso {desde(fila.ultimo_acceso)}
        </div>

        {/* ---- Pestañas ---- */}
        <div style={{ display: 'flex', gap: 0, marginTop: 22,
          borderBottom: `1px solid ${LINEA.tenue}` }}>
          {([['clips', `Clips (${ficha?.clips.length ?? 0})`],
             ['movimientos', `Movimientos (${ficha?.movimientos.length ?? 0})`],
             ['acciones', `Historial (${ficha?.acciones.length ?? 0})`]] as const).map(([k, t]) => (
            <div key={k} onClick={() => setPestana(k)} style={{
              padding: '8px 13px', cursor: 'pointer',
              font: `700 9px/1 ${FUENTE.ui}`, letterSpacing: 1.2, textTransform: 'uppercase',
              color: pestana === k ? COLOR.admin : COLOR.textoTenue,
              borderBottom: `2px solid ${pestana === k ? COLOR.admin : 'transparent'}`,
            }}>{t}</div>
          ))}
        </div>

        <div style={{ marginTop: 12 }}>
          {!ficha && <Vacio texto="Cargando…" />}
          {ficha && pestana === 'clips' && (
            ficha.clips.length === 0 ? <Vacio texto="No ha publicado nada" /> :
            ficha.clips.map(c => (
              <Renglon key={c.id} izq={c.titulo}
                der={`${c.precio} ⨯`} pie={`${fecha(c.created_at)} · ${c.visibilidad}`}
                marca={c.publicado ? undefined : 'sin publicar'} />
            ))
          )}
          {ficha && pestana === 'movimientos' && (
            ficha.movimientos.length === 0 ? <Vacio texto="Sin movimientos" /> :
            ficha.movimientos.map(m => (
              <Renglon key={m.id} izq={m.motivo.replace(/_/g, ' ')}
                der={`${m.delta > 0 ? '+' : ''}${m.delta}`}
                colorDer={m.delta > 0 ? COLOR.dinero : '#FF4444'}
                pie={`${fechaHora(m.created_at)}${m.nota ? ` · ${m.nota}` : ''}`} />
            ))
          )}
          {ficha && pestana === 'acciones' && (
            ficha.acciones.length === 0 ? <Vacio texto="Sin acciones registradas" /> :
            ficha.acciones.map(a => (
              <Renglon key={a.id} izq={a.accion.replace(/_/g, ' ')}
                pie={`${fechaHora(a.created_at)} · ${JSON.stringify(a.detalle)}`} />
            ))
          )}
        </div>
      </aside>
    </div>
  )
}

function Vacio({ texto }: { texto: string }) {
  return <div style={{ padding: '26px 0', textAlign: 'center',
    font: `400 12px/1 ${FUENTE.ui}`, color: COLOR.textoApagado }}>{texto}</div>
}

function Renglon({ izq, der, pie, colorDer, marca }: {
  izq: string; der?: string; pie?: string; colorDer?: string; marca?: string
}) {
  return (
    <div style={{ padding: '9px 0', borderBottom: `1px solid ${LINEA.tenue}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ font: `400 12px/1.3 ${FUENTE.ui}`, color: COLOR.texto }}>
          {izq}
          {marca && <span style={{ marginLeft: 7, font: `700 8px/1 ${FUENTE.ui}`,
            letterSpacing: 1, textTransform: 'uppercase', color: '#FFB020' }}>{marca}</span>}
        </span>
        {der && <span style={{ font: `400 12px/1.3 ${FUENTE.mono}`,
          color: colorDer ?? COLOR.textoSuave, whiteSpace: 'nowrap' }}>{der}</span>}
      </div>
      {pie && <div style={{ marginTop: 3, font: `400 10px/1.4 ${FUENTE.mono}`,
        color: COLOR.textoApagado, wordBreak: 'break-word' }}>{pie}</div>}
    </div>
  )
}

/* ---------- Dialogos con campos propios ---------- */

function SuspenderDialogo({ fila, cancela, listo }: {
  fila: FilaUsuario; cancela: () => void; listo: (m: string) => void
}) {
  const [hasta, setHasta] = useState('')
  return (
    <Confirmar titulo="Suspender temporalmente" etiqueta="Suspender" exigeMotivo
      cuerpo={<>Se suspende a <b style={{ color: COLOR.texto }}>@{fila.handle}</b>. Si
        pones fecha de fin, la cuenta vuelve sola a estar activa ese día; si la dejas
        vacía, la suspensión es indefinida hasta que la levantes a mano.</>}
      extra={() => (
        <div style={{ marginTop: 14 }}>
          <Etiquetado texto="Hasta (opcional)" hijo={
            <Campo tipo="datetime-local" valor={hasta} cambia={setHasta} mono />
          } />
        </div>
      )}
      cancela={cancela}
      al={m => suspenderCuenta(fila.id, m, hasta ? new Date(hasta).toISOString() : null).then(listo)} />
  )
}

function SaldoDialogo({ fila, cancela, listo }: {
  fila: FilaUsuario; cancela: () => void; listo: (m: string) => void
}) {
  const [cantidad, setCantidad] = useState('')
  const n = parseInt(cantidad || '0', 10)
  return (
    <Confirmar titulo="Ajustar saldo" tono="primario"
      etiqueta={n === 0 ? 'Pon una cantidad' : n > 0 ? `Acreditar ${n}` : `Descontar ${-n}`}
      exigeMotivo
      cuerpo={<>Saldo actual de <b style={{ color: COLOR.texto }}>@{fila.handle}</b>:{' '}
        <b style={{ color: COLOR.dinero }}>{fila.saldo}</b>. Usa un número negativo para
        descontar. Esto NO edita un número suelto: escribe un asiento en el libro
        contable, que es append-only, y queda en la bitácora.</>}
      extra={() => (
        <div style={{ marginTop: 14 }}>
          <Etiquetado texto="Cantidad (negativa para descontar)" hijo={
            <Campo tipo="number" valor={cantidad} cambia={setCantidad} mono autoFoco />
          } />
          {n !== 0 && (
            <div style={{ marginTop: 8, font: `400 12px/1 ${FUENTE.mono}`, color: COLOR.textoTenue }}>
              {fila.saldo} → <b style={{ color: COLOR.dinero }}>{fila.saldo + n}</b>
            </div>
          )}
        </div>
      )}
      cancela={cancela}
      al={async m => {
        if (n === 0) return
        const r = await ajustarSaldo(fila.id, n, m)
        listo('error' in r ? r.error : '')
      }} />
  )
}

function RolDialogo({ fila, cancela, listo }: {
  fila: FilaUsuario; cancela: () => void; listo: (m: string) => void
}) {
  return (
    <div onClick={cancela} style={{
      position: 'fixed', inset: 0, zIndex: 95, background: 'rgba(8,8,10,.82)',
      display: 'grid', placeItems: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 460, maxWidth: '92vw', background: COLOR.superficie,
        border: `1px solid ${LINEA.fuerte}`, padding: 26,
      }}>
        <div style={{ font: `400 22px/1.15 ${FUENTE.display}`, textTransform: 'uppercase' }}>
          Cambiar rol
        </div>
        <div style={{ marginTop: 12, font: `400 13px/1.55 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
          Los papeles NO son excluyentes: alguien puede ser creadora y administradora a
          la vez. Por eso son dos interruptores y no una lista.
        </div>

        <div style={{ marginTop: 20, display: 'grid', gap: 10 }}>
          <Interruptor titulo="Creadora" activo={fila.rol === 'creadora' || fila.clips_total > 0}
            puesto={fila.rol === 'creadora'}
            nota="Puede subir contenido y cobrar."
            al={() => marcarCreadora(fila.id, fila.rol !== 'creadora').then(() => listo(''))} />
          <Interruptor titulo="Administradora" puesto={fila.rol === 'admin'} activo
            nota="Ve todo el contenido sin pagar y puede mover saldos. Se registra quién y cuándo lo otorgó."
            al={() => (fila.rol === 'admin'
              ? revocarAdmin(fila.id)
              : otorgarAdmin(fila.id, 'desde el panel')).then(() => listo(''))} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 22 }}>
          <Boton al={cancela}>Cerrar</Boton>
        </div>
      </div>
    </div>
  )
}

function Interruptor({ titulo, nota, puesto, activo, al }: {
  titulo: string; nota: string; puesto: boolean; activo: boolean; al: () => void
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      border: `1px solid ${puesto ? COLOR.admin : LINEA.tenue}`, padding: '12px 14px',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 1,
          textTransform: 'uppercase', color: puesto ? COLOR.admin : COLOR.texto }}>{titulo}</div>
        <div style={{ marginTop: 5, font: `400 11px/1.45 ${FUENTE.ui}`, color: COLOR.textoTenue }}>
          {nota}
        </div>
      </div>
      <Boton chico activo={activo} tono={puesto ? 'peligro' : 'primario'} al={al}>
        {puesto ? 'Quitar' : 'Otorgar'}
      </Boton>
    </div>
  )
}
