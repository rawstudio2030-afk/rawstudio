/* Las pestanas de la ficha de una cuenta (modulo Usuarios).
 *
 * La idea: ver TODO lo de una persona sin ir modulo por modulo. Cada pestana
 * pide su seccion al abrirse (admin_usuario_seccion) y no antes: abrir la ficha
 * no dispara ocho consultas.
 *
 * DATOS DE COBRO. La CLABE llega enmascarada (ultimos 4). Para verla completa
 * hay que pulsar «Ver completa», escribir un motivo y confirmar: el servidor lo
 * registra en la bitacora (sin la CLABE) y devuelve el numero, que se muestra un
 * minuto y se vuelve a ocultar. No se pide «la contrasena de la usuaria»: un
 * admin no debe conocerla y quien entra con Google no tiene.
 */
import { useEffect, useState, type ReactNode } from 'react'
import { COLOR, LINEA, FUENTE } from '../lib/diseño'
import { usd, mxn } from '../lib/dinero'
import { cuantos } from '../lib/plural'
import {
  seccionUsuario, verClabe,
  type SeccionFicha, type TiposSeccion, type FichaUsuario,
} from '../lib/admin'
import { Boton, Confirmar, Aviso, Insignia, fecha, fechaHora } from './piezas'
import { Pulsable } from '../components/Pulsable'

type Pestana = SeccionFicha | 'movimientos'

const PESTANAS: [Pestana, string][] = [
  ['resumen', 'Resumen'],
  ['contenido', 'Contenido'],
  ['comentarios', 'Comentarios'],
  ['compras', 'Compras y pedidos'],
  ['cobros', 'Cobros'],
  ['consultas', 'Consultas y reportes'],
  ['movimientos', 'Movimientos'],
  ['bitacora', 'Bitácora'],
]

const limpio = (s: string) => s.replace(/_/g, ' ')

export default function Actividad({ id, ficha, errorFicha }: {
  id: string; ficha: FichaUsuario | null; errorFicha: string
}) {
  const [pestana, setPestana] = useState<Pestana>('resumen')

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0, marginTop: 22,
        borderBottom: `1px solid ${LINEA.tenue}` }}>
        {PESTANAS.map(([k, t]) => (
          <Pulsable key={k} al={() => setPestana(k)} activado={pestana === k} style={{
            padding: '8px 11px', cursor: 'pointer',
            font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.1, textTransform: 'uppercase',
            color: pestana === k ? COLOR.admin : COLOR.textoSuave,
            borderBottom: `2px solid ${pestana === k ? COLOR.admin : 'transparent'}`,
          }}>{t}</Pulsable>
        ))}
      </div>

      <div style={{ marginTop: 12 }}>
        {pestana === 'movimientos'
          ? <Movimientos ficha={ficha} errorFicha={errorFicha} />
          : <Seccion key={`${id}:${pestana}`} id={id} nombre={pestana}>
              {(d) => {
                switch (pestana) {
                  case 'resumen': return <Resumen d={d as TiposSeccion['resumen']} />
                  case 'contenido': return <Contenido d={d as TiposSeccion['contenido']} />
                  case 'comentarios': return <Comentarios d={d as TiposSeccion['comentarios']} />
                  case 'compras': return <Compras d={d as TiposSeccion['compras']} />
                  case 'cobros': return <Cobros id={id} d={d as TiposSeccion['cobros']} />
                  case 'consultas': return <Consultas d={d as TiposSeccion['consultas']} />
                  case 'bitacora': return <Bitacora d={d as TiposSeccion['bitacora']} />
                }
              }}
            </Seccion>}
      </div>
    </>
  )
}

/** Pide UNA seccion al montarse y pinta el resultado. Se monta de nuevo (key)
 *  al cambiar de cuenta o de pestana, asi que no hay estado viejo que limpiar. */
function Seccion({ id, nombre, children }: {
  id: string; nombre: SeccionFicha; children: (d: TiposSeccion[SeccionFicha]) => ReactNode
}) {
  const [est, setEst] = useState<{ datos?: TiposSeccion[SeccionFicha]; error?: string }>({})
  useEffect(() => {
    let vivo = true
    seccionUsuario(id, nombre).then(r => {
      if (vivo) setEst('error' in r ? { error: r.error } : { datos: r.datos })
    })
    return () => { vivo = false }
  }, [id, nombre])

  if (est.error) return <Aviso tipo="error">No se pudo cargar esta sección: {est.error}</Aviso>
  if (!est.datos) return <Vacio texto="Cargando…" />
  return <>{children(est.datos)}</>
}

/* ---------- Piezas de la ficha ---------- */

function Vacio({ texto }: { texto: string }) {
  return <div style={{ padding: '18px 0', textAlign: 'center',
    font: `400 12px/1 ${FUENTE.ui}`, color: COLOR.textoSuave }}>{texto}</div>
}

function Renglon({ izq, der, pie, colorDer, marca, colorMarca }: {
  izq: string; der?: string; pie?: string; colorDer?: string; marca?: string; colorMarca?: string
}) {
  return (
    <div style={{ padding: '9px 0', borderBottom: `1px solid ${LINEA.tenue}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ font: `400 12px/1.4 ${FUENTE.ui}`, color: COLOR.texto, wordBreak: 'break-word' }}>
          {izq}
          {marca && <span style={{ marginLeft: 7, font: `700 10px/1 ${FUENTE.ui}`,
            letterSpacing: 1.2, textTransform: 'uppercase', color: colorMarca ?? COLOR.aviso }}>{marca}</span>}
        </span>
        {der && <span style={{ font: `400 12px/1.3 ${FUENTE.mono}`,
          color: colorDer ?? COLOR.textoSuave, whiteSpace: 'nowrap' }}>{der}</span>}
      </div>
      {pie && <div style={{ marginTop: 3, font: `400 11px/1.45 ${FUENTE.mono}`,
        color: COLOR.textoSuave, wordBreak: 'break-word' }}>{pie}</div>}
    </div>
  )
}

/** Un bloque con titulo y conteo. Vacio muestra una linea en vez de desaparecer:
 *  «no tiene» tambien es informacion. */
function Grupo({ titulo, n, vacio, children }: {
  titulo: string; n: number; vacio: string; children: ReactNode
}) {
  return (
    <section style={{ marginTop: 18 }}>
      <div style={{ font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.3, textTransform: 'uppercase',
        color: COLOR.textoSuave }}>{titulo} ({n})</div>
      {n === 0
        ? <div style={{ padding: '9px 0', font: `400 12px/1.3 ${FUENTE.ui}`, color: COLOR.textoSuave }}>{vacio}</div>
        : children}
    </section>
  )
}

function Dato({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, padding: '7px 0',
      borderBottom: `1px solid ${LINEA.tenue}` }}>
      <span style={{ font: `400 12px/1.4 ${FUENTE.ui}`, color: COLOR.textoSuave }}>{k}</span>
      <span style={{ font: `400 12px/1.4 ${FUENTE.mono}`, color: COLOR.texto, textAlign: 'right',
        wordBreak: 'break-word' }}>{v}</span>
    </div>
  )
}

const si = (b: boolean) => (b ? 'Sí' : 'No')
const corto = (s: string, n = 280) => (s.length > n ? `${s.slice(0, n)}…` : s)

/* ---------- Pestanas ---------- */

function Resumen({ d }: { d: TiposSeccion['resumen'] }) {
  return (
    <>
      <Dato k="Correo" v={`${d.correo ?? '—'}${d.correo_confirmado ? ' (confirmado)' : ' (sin confirmar)'}`} />
      <Dato k="Nombre en Google" v={d.nombre_google ?? '—'} />
      <Dato k="Teléfono" v={d.telefono ?? '—'} />
      <Dato k="Entra con" v={d.proveedores.length ? d.proveedores.join(', ') : '—'} />
      <Dato k="Cuenta creada" v={fechaHora(d.creada)} />
      <Dato k="Último acceso" v={fechaHora(d.ultimo_acceso)} />
      <Dato k="Es creadora" v={si(d.es_creadora)} />
      <Dato k="Mayoría de edad confirmada" v={d.edad_confirmada ? fechaHora(d.edad_confirmada) : 'No'} />
      <Dato k="Identidad verificada"
        v={d.identidad_verificada ? `Sí, ${fechaHora(d.identidad_verificada_at)}` : 'No'} />
      {d.suspendida_at && <Dato k="Suspendida desde" v={fechaHora(d.suspendida_at)} />}
      {d.baneada_at && <Dato k="Baneada desde" v={fechaHora(d.baneada_at)} />}
      <Dato k="Telegram vinculado" v={d.telegram_vinculada_at ? fechaHora(d.telegram_vinculada_at) : 'No'} />
      <Dato k="Cuenta de cobro" v={si(d.tiene_cuenta_cobro)} />

      <Grupo titulo="Expediente" n={d.expediente ? 1 : 0} vacio="Sin expediente.">
        {d.expediente && <>
          <Dato k="Identificación cargada" v={si(d.expediente.identificacion)} />
          <Dato k="Consentimiento cargado" v={si(d.expediente.consentimiento)} />
          <Dato k="Fecha del consentimiento" v={fecha(d.expediente.consentimiento_fecha)} />
          <Dato k="Alta del expediente" v={fechaHora(d.expediente.alta_at)} />
          {d.expediente.nota && <Dato k="Nota" v={d.expediente.nota} />}
        </>}
      </Grupo>

      <Grupo titulo="Consentimientos" n={d.consentimientos.length} vacio="Ninguno registrado.">
        {d.consentimientos.map((c, i) => (
          <Renglon key={i} izq={`${limpio(c.tipo)} · ${c.version}`}
            der={c.otorgado ? 'otorgado' : 'retirado'} pie={fechaHora(c.created_at)} />
        ))}
      </Grupo>

      <Grupo titulo="Verificaciones de identidad" n={d.verificaciones.length} vacio="Sin solicitudes de verificación.">
        {d.verificaciones.map((v, i) => (
          <Renglon key={i} izq={limpio(v.estado)} pie={`${fechaHora(v.created_at)}${v.motivo ? ` · ${v.motivo}` : ''}`} />
        ))}
      </Grupo>
    </>
  )
}

function Contenido({ d }: { d: TiposSeccion['contenido'] }) {
  const cuenta = (e: string) => d.clips.filter(c => !c.borrado_at && c.estado === e).length
  const borrados = d.clips.filter(c => c.borrado_at).length
  const estados = [...new Set(d.clips.filter(c => !c.borrado_at).map(c => c.estado))]
  if (d.clips.length === 0) return <Vacio texto="No ha subido nada" />
  return (
    <>
      <div style={{ font: `400 12px/1.5 ${FUENTE.ui}`, color: COLOR.textoSuave, marginBottom: 6 }}>
        {estados.map(e => `${cuenta(e)} ${limpio(e)}`).join(' · ')}
        {borrados ? ` · ${cuantos(borrados, 'borrado')}` : ''}
      </div>
      {d.clips.map(c => {
        const malo = c.estado !== 'aprobado'
        const rev = c.revisado_at
          ? ` · revisó ${c.revisado_por ? `@${c.revisado_por} ` : ''}el ${fechaHora(c.revisado_at)}` : ''
        return (
          <Renglon key={c.id} izq={c.titulo} der={usd(c.precio)}
            marca={c.borrado_at ? 'borrado' : malo ? limpio(c.estado) : undefined}
            colorMarca={c.estado === 'rechazado' || c.borrado_at ? COLOR.error : COLOR.aviso}
            pie={[
              fecha(c.created_at), limpio(c.tipo), limpio(c.visibilidad),
              c.fotos ? cuantos(c.fotos, 'foto') : '', c.publicado ? 'publicado' : 'sin publicar',
            ].filter(Boolean).join(' · ') + rev
              + (c.motivo_rechazo ? ` · motivo: ${c.motivo_rechazo}` : '')
              + (c.borrado_at ? ` · borrado ${fecha(c.borrado_at)}${c.borrado_motivo ? `: ${c.borrado_motivo}` : ''}` : '')} />
        )
      })}
    </>
  )
}

function Comentarios({ d }: { d: TiposSeccion['comentarios'] }) {
  return (
    <>
      <Grupo titulo="Le han hecho" n={d.recibidos.length} vacio="Nadie ha comentado sus clips.">
        {d.recibidos.map(c => (
          <Renglon key={c.id} izq={corto(c.texto)}
            marca={c.borrado_at ? 'borrado' : undefined} colorMarca={COLOR.error}
            pie={`@${c.autora ?? '—'} · en «${c.clip ?? '—'}» · ${fechaHora(c.created_at)}`} />
        ))}
      </Grupo>
      <Grupo titulo="Ha hecho" n={d.hechos.length} vacio="No ha comentado nada.">
        {d.hechos.map(c => (
          <Renglon key={c.id} izq={corto(c.texto)}
            marca={c.borrado_at ? 'borrado' : undefined} colorMarca={COLOR.error}
            pie={`en «${c.clip ?? '—'}» · ${fechaHora(c.created_at)}`} />
        ))}
      </Grupo>
    </>
  )
}

function Compras({ d }: { d: TiposSeccion['compras'] }) {
  return (
    <>
      <Grupo titulo="Pedidos personalizados" n={d.pedidos.length} vacio="Sin pedidos.">
        {d.pedidos.map(p => (
          <Renglon key={p.id} izq={corto(p.descripcion, 160)} marca={limpio(p.estado)}
            der={usd(p.acordado ?? p.oferta ?? 0)}
            pie={`${p.como === 'pidio' ? 'pidió a' : 'recibió de'} @${p.otra ?? '—'} · ${fechaHora(p.created_at)}`
              + (p.entrega_max ? ` · entrega máx. ${fecha(p.entrega_max)}` : '')} />
        ))}
      </Grupo>
      <Grupo titulo="Compras" n={d.compras.length} vacio="No ha comprado clips.">
        {d.compras.map(c => (
          <Renglon key={c.id} izq={c.clip ?? '(clip borrado)'} der={usd(c.precio)} pie={fechaHora(c.created_at)} />
        ))}
      </Grupo>
      <Grupo titulo="Rentas" n={d.rentas.length} vacio="Sin rentas.">
        {d.rentas.map(r => (
          <Renglon key={r.id} izq={r.clip ?? '(clip borrado)'} der={usd(r.precio)}
            pie={`${fechaHora(r.inicio)} → ${fechaHora(r.vence)}`} />
        ))}
      </Grupo>
      <Grupo titulo="Suscripciones" n={d.suscripciones.length} vacio="Sin suscripciones.">
        {d.suscripciones.map(s => (
          <Renglon key={s.id} izq={`${s.como === 'suscriptora' ? 'A' : 'De'} @${s.otra ?? '—'}`}
            marca={limpio(s.estado)}
            pie={`desde ${fecha(s.inicio)}${s.periodo_fin ? ` · hasta ${fecha(s.periodo_fin)}` : ''}${s.cancela_al_fin ? ' · se cancela al fin' : ''}`} />
        ))}
      </Grupo>
      <Grupo titulo="Propinas" n={d.propinas.length} vacio="Sin propinas.">
        {d.propinas.map(t => (
          <Renglon key={t.id} izq={t.mensaje ? corto(t.mensaje, 160) : (t.como === 'dio' ? 'Propina dada' : 'Propina recibida')}
            der={`${t.como === 'dio' ? '−' : '+'}${usd(t.coins)}`}
            colorDer={t.como === 'dio' ? COLOR.error : COLOR.dinero}
            pie={`${t.como === 'dio' ? 'para' : 'de'} @${t.otra ?? '—'} · ${fechaHora(t.created_at)}`} />
        ))}
      </Grupo>
      <Grupo titulo="Recargas y pagos" n={d.recargas.length} vacio="Sin recargas.">
        {d.recargas.map(o => (
          <Renglon key={o.id} izq={limpio(o.concepto)} marca={limpio(o.estado)}
            der={mxn(o.monto_mxn)}
            pie={`${fechaHora(o.created_at)} · ${limpio(o.proveedor)}${o.pagado_at ? ` · pagado ${fechaHora(o.pagado_at)}` : ''}`} />
        ))}
      </Grupo>
    </>
  )
}

function Cobros({ id, d }: { id: string; d: TiposSeccion['cobros'] }) {
  const [pidiendo, setPidiendo] = useState(false)
  const [visible, setVisible] = useState<{ clabe: string; banco: string | null; titular: string } | null>(null)

  // La CLABE completa se oculta sola al minuto: no debe quedar a la vista si se
  // deja la ficha abierta.
  useEffect(() => {
    if (!visible) return
    const t = setTimeout(() => setVisible(null), 60_000)
    return () => clearTimeout(t)
  }, [visible])

  return (
    <>
      <Grupo titulo="Cuenta de depósito" n={d.cuenta ? 1 : 0} vacio="No ha registrado una cuenta de cobro.">
        {d.cuenta && <>
          <Dato k="Titular" v={d.cuenta.titular} />
          <Dato k="Banco" v={d.cuenta.banco ?? '—'} />
          <Dato k="CLABE" v={visible ? visible.clabe : d.cuenta.clabe} />
          <Dato k="Verificada" v={si(d.cuenta.verificado)} />
          <Dato k="Régimen fiscal" v={limpio(d.cuenta.regimen)} />
          <Dato k="RFC registrado" v={si(d.cuenta.tiene_rfc)} />
          <Dato k="Actualizada" v={fechaHora(d.cuenta.actualizada)} />
          <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
            {visible
              ? <Boton chico al={() => setVisible(null)}>Ocultar CLABE</Boton>
              : <Boton chico al={() => setPidiendo(true)}>Ver completa</Boton>}
            <span style={{ font: `400 11px/1.4 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
              {visible ? 'Se oculta sola en un minuto.' : 'Pide un motivo y queda en la bitácora.'}
            </span>
          </div>
        </>}
      </Grupo>

      <Grupo titulo="Retiros" n={d.retiros.length} vacio="No ha pedido retiros.">
        {d.retiros.map(r => (
          <Renglon key={r.id} izq={`${r.banco ?? '—'} · ${r.clabe}`} marca={limpio(r.estado)}
            colorMarca={r.estado === 'rechazada' ? COLOR.error : COLOR.aviso}
            der={usd(r.coins)}
            pie={`${fechaHora(r.created_at)}${r.resuelta_at ? ` · resuelta ${fechaHora(r.resuelta_at)}` : ''}`
              + (r.motivo_rechazo ? ` · motivo: ${r.motivo_rechazo}` : '')} />
        ))}
      </Grupo>

      {pidiendo && (
        <Confirmar
          titulo="Ver la CLABE completa"
          etiqueta="Ver CLABE"
          tono="primario"
          exigeMotivo
          cuerpo={<>Es un dato bancario de la persona. Escribe para qué lo necesitas (al menos 10
            caracteres): queda en la bitácora con tu nombre. La CLABE <b style={{ color: COLOR.texto }}>no</b> se
            guarda ahí.</>}
          cancela={() => setPidiendo(false)}
          al={async (motivo) => {
            const r = await verClabe(id, motivo)
            if ('error' in r) return r.error
            setVisible(r.datos)
            setPidiendo(false)
          }} />
      )}
    </>
  )
}

function Consultas({ d }: { d: TiposSeccion['consultas'] }) {
  return (
    <>
      <Grupo titulo="Consultas por Telegram" n={d.consultas.length} vacio="Sin consultas.">
        {d.consultas.map(c => (
          <Renglon key={c.id} izq={`${c.como === 'cliente' ? 'Con' : 'De'} @${c.otra ?? '—'}`}
            pie={`${c.clip ? `sobre «${c.clip}» · ` : ''}${fechaHora(c.created_at)}${c.ultimo_at ? ` · último mensaje ${fechaHora(c.ultimo_at)}` : ''}`} />
        ))}
      </Grupo>
      <Grupo titulo="Reportes en su contra o sobre su contenido" n={d.reportes_recibidos.length} vacio="Sin reportes.">
        {d.reportes_recibidos.map(r => (
          <Renglon key={r.id} izq={limpio(r.motivo)} marca={limpio(r.estado)}
            pie={`${fechaHora(r.created_at)}${r.clip ? ` · «${r.clip}»` : ''}${r.comentario ? ` · ${corto(r.comentario, 200)}` : ''}${r.nota_resolucion ? ` · resolución: ${r.nota_resolucion}` : ''}`} />
        ))}
      </Grupo>
      <Grupo titulo="Reportes que ella hizo" n={d.reportes_hechos.length} vacio="No ha reportado a nadie.">
        {d.reportes_hechos.map(r => (
          <Renglon key={r.id} izq={limpio(r.motivo)} marca={limpio(r.estado)}
            pie={`${fechaHora(r.created_at)}${r.comentario ? ` · ${corto(r.comentario, 200)}` : ''}${r.nota_resolucion ? ` · resolución: ${r.nota_resolucion}` : ''}`} />
        ))}
      </Grupo>
    </>
  )
}

function Movimientos({ ficha, errorFicha }: { ficha: FichaUsuario | null; errorFicha: string }) {
  if (!ficha && errorFicha) return <Aviso tipo="error">No se pudo cargar el detalle de la cuenta: {errorFicha}</Aviso>
  if (!ficha) return <Vacio texto="Cargando…" />
  if (ficha.movimientos.length === 0) return <Vacio texto="Sin movimientos" />
  return <>
    {ficha.movimientos.map(m => (
      <Renglon key={m.id} izq={limpio(m.motivo)}
        der={`${m.delta > 0 ? '+' : ''}${usd(m.delta)}`}
        colorDer={m.delta > 0 ? COLOR.dinero : COLOR.error}
        pie={`${fechaHora(m.created_at)}${m.nota ? ` · ${m.nota}` : ''}`} />
    ))}
  </>
}

function Bitacora({ d }: { d: TiposSeccion['bitacora'] }) {
  if (d.registros.length === 0) return <Vacio texto="Sin registros" />
  return <>
    {d.registros.map(r => (
      <div key={r.id}>
        <Renglon izq={limpio(r.accion)}
          marca={r.hecho_por_ella && !r.sobre_ella ? 'hecho por ella' : undefined} colorMarca={COLOR.textoSuave}
          pie={`${fechaHora(r.created_at)}${r.admin && !r.hecho_por_ella ? ` · por @${r.admin}` : ''}${r.ip ? ` · IP ${r.ip}` : ''} · ${JSON.stringify(r.detalle)}`} />
      </div>
    ))}
    {d.registros.length >= 200 && (
      <div style={{ marginTop: 10 }}><Insignia texto="Se muestran los últimos 200" color={COLOR.textoSuave} /></div>
    )}
  </>
}
