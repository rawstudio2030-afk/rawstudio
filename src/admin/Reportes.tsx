/* Modulo 7: atencion de reportes.
 *
 * Resolver un reporte y moderar el clip son dos cosas distintas y ambas hacen
 * falta: cerrar el reporte sin tocar el clip lo deja publicado, y moderar sin
 * cerrar los reportes los deja contando para la despublicacion automatica.
 * Por eso las acciones de moderacion de aqui cierran tambien el caso.
 */
import { useCallback, useEffect, useState } from 'react'
import { COLOR, LINEA, FUENTE } from '../lib/diseño'
import {
  listarReportes, conteoReportes, resolverReporte, cerrarReportesDe,
  moderar, banearCuenta, MOTIVOS,
  type Reporte, type EstadoReporte, type MotivoReporte,
} from '../lib/admin'
import { urlPortada } from '../lib/clips'
import {
  Boton, Confirmar, Paginador, Selector, Etiquetado, Insignia,
  fechaHora, desde,
} from './piezas'

const POR_PAGINA = 30

const PESTANAS: { v: EstadoReporte; t: string }[] = [
  { v: 'nuevo',       t: 'Nuevos'       },
  { v: 'en_revision', t: 'En revisión'  },
  { v: 'resuelto',    t: 'Resueltos'    },
  { v: 'desestimado', t: 'Desestimados' },
]

const TEXTO_MOTIVO = Object.fromEntries(MOTIVOS.map(m => [m.v, m.t]))

export default function Reportes() {
  const [estado, setEstado] = useState<EstadoReporte>('nuevo')
  const [motivo, setMotivo] = useState<MotivoReporte | ''>('')
  const [filas, setFilas] = useState<Reporte[]>([])
  const [total, setTotal] = useState(0)
  const [conteo, setConteo] = useState<Record<string, number>>({})
  const [pagina, setPagina] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [dialogo, setDialogo] = useState<{ r: Reporte; que: 'desestimar' | 'retirar' | 'banear' } | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    const r = await listarReportes(estado, motivo, pagina, POR_PAGINA)
    setFilas(r.filas); setTotal(r.total); setError(r.error); setCargando(false)
    setConteo(await conteoReportes())
  }, [estado, motivo, pagina])

  useEffect(() => { cargar() }, [cargar])

  const tras = async (msg: string) => {
    if (msg) { setError(msg); return }
    setError(''); setDialogo(null); await cargar()
  }

  return (
    <>
      <div style={{ display: 'flex', borderBottom: `1px solid ${LINEA.tenue}`, marginBottom: 16 }}>
        {PESTANAS.map(p => (
          <div key={p.v} onClick={() => { setEstado(p.v); setPagina(0) }} style={{
            padding: '9px 15px', cursor: 'pointer',
            font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.2, textTransform: 'uppercase',
            color: estado === p.v ? COLOR.admin : COLOR.textoTenue,
            borderBottom: `2px solid ${estado === p.v ? COLOR.admin : 'transparent'}`,
          }}>
            {p.t}
            <span style={{ marginLeft: 7, font: `400 10px/1 ${FUENTE.mono}`,
              color: p.v === 'nuevo' && conteo.nuevo ? '#FF4444' : COLOR.textoApagado }}>
              {conteo[p.v] ?? 0}
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 16 }}>
        <Etiquetado texto="Motivo" hijo={
          <Selector valor={motivo} cambia={v => { setMotivo(v); setPagina(0) }} opciones={[
            { v: '' as const, t: 'Todos' },
            ...MOTIVOS.map(m => ({ v: m.v, t: m.t })),
          ]} />
        } />
      </div>

      {error && (
        <div style={{ marginBottom: 14, padding: '10px 13px', border: '1px solid #FF4444',
          color: '#FF4444', font: `400 12px/1.4 ${FUENTE.ui}` }}>{error}</div>
      )}

      {filas.length === 0 ? (
        <div style={{ padding: '70px 20px', textAlign: 'center', color: COLOR.textoTenue,
          font: `400 13px/1.5 ${FUENTE.ui}`, border: `1px solid ${LINEA.tenue}` }}>
          {cargando ? 'Cargando…' : estado === 'nuevo'
            ? 'Nada esperando. Es la mejor noticia de este panel.'
            : 'Nada aquí'}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10, opacity: cargando ? .5 : 1 }}>
          {filas.map(r => (
            <Ficha key={r.id} r={r} pide={(que) => setDialogo({ r, que })} tras={tras} />
          ))}
        </div>
      )}

      <Paginador pagina={pagina} porPagina={POR_PAGINA} total={total} cambia={setPagina} />

      {dialogo?.que === 'desestimar' && (
        <Confirmar titulo="Desestimar el reporte" etiqueta="Desestimar" exigeMotivo
          cuerpo="Es decir que quien reportó se equivocó. La nota queda para poder revisar después si la decisión fue buena."
          cancela={() => setDialogo(null)}
          al={m => resolverReporte(dialogo.r.id, 'desestimado', m).then(tras)} />
      )}
      {dialogo?.que === 'retirar' && dialogo.r.clip_id && (
        <Confirmar titulo="Retirar el clip y cerrar el caso" etiqueta="Retirar" exigeMotivo
          cuerpo={<>Deja de verse de inmediato, y se cierran <b style={{ color: COLOR.texto }}>
            los {dialogo.r.otros_del_mismo} reportes</b> sin resolver de este mismo clip.</>}
          cancela={() => setDialogo(null)}
          al={async m => {
            const e = await moderar(dialogo.r.clip_id!, 'retirado', m)
            if (e) return tras(e)
            await cerrarReportesDe({ clip: dialogo.r.clip_id! }, m)
            await tras('')
          }} />
      )}
      {dialogo?.que === 'banear' && (
        <Confirmar titulo={`Banear a @${dialogo.r.creadora_handle}`} etiqueta="Banear" exigeMotivo
          cuerpo="Cierra la cuenta completa. Si lo que sobra es el contenido y no la persona, retira el clip."
          cancela={() => setDialogo(null)}
          al={async m => {
            const e = await banearCuenta(dialogo.r.creadora!, m)
            if (e) return tras(e)
            await cerrarReportesDe(
              dialogo.r.clip_id ? { clip: dialogo.r.clip_id } : { perfil: dialogo.r.perfil_id! }, m)
            await tras('')
          }} />
      )}
    </>
  )
}

function Ficha({ r, pide, tras }: {
  r: Reporte; pide: (q: 'desestimar' | 'retirar' | 'banear') => void
  tras: (m: string) => void
}) {
  const grave = r.gravedad >= 80
  const portada = urlPortada(r.clip_portada)
  const abierto = r.estado === 'nuevo' || r.estado === 'en_revision'

  return (
    <div style={{
      display: 'flex', gap: 14, padding: 14,
      border: `1px solid ${grave && abierto ? '#FF4444' : LINEA.tenue}`,
      background: COLOR.superficie,
    }}>
      <div style={{
        width: 64, height: 84, flex: '0 0 auto',
        background: portada ? `center/cover url(${portada})`
          : `repeating-linear-gradient(130deg,${COLOR.superficieAlta} 0 6px,${COLOR.superficie} 6px 12px)`,
        border: `1px solid ${LINEA.tenue}`,
      }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
          <Insignia texto={TEXTO_MOTIVO[r.motivo] ?? r.motivo} color={grave ? '#FF4444' : '#FFB020'} />
          {r.otros_del_mismo > 1 && abierto && (
            <Insignia texto={`${r.otros_del_mismo} sobre lo mismo`} color="#FF4444" />
          )}
          {r.clip_estado && r.clip_estado !== 'aprobado' && (
            <Insignia texto={`clip ${r.clip_estado}`} color={COLOR.textoTenue} />
          )}
          {r.perfil_estado && r.perfil_estado !== 'activa' && (
            <Insignia texto={`cuenta ${r.perfil_estado}`} color={COLOR.textoTenue} />
          )}
        </div>

        <div style={{ marginTop: 8, font: `400 13px/1.35 ${FUENTE.ui}`, color: COLOR.texto }}>
          {r.clip_id
            ? <>Clip «{r.clip_titulo ?? 'sin título'}» de @{r.creadora_handle}</>
            : <>Perfil de @{r.perfil_handle}</>}
        </div>

        {r.comentario && (
          <div style={{ marginTop: 6, padding: '7px 10px', background: COLOR.fondo,
            font: `400 12px/1.5 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
            «{r.comentario}»
          </div>
        )}

        <div style={{ marginTop: 7, font: `400 10px/1.5 ${FUENTE.mono}`, color: COLOR.textoApagado }}>
          Reportó @{r.reporta_handle ?? '—'} · {desde(r.created_at)} · {fechaHora(r.created_at)}
          {r.ip && <> · {r.ip}</>}
        </div>

        {r.nota_resolucion && (
          <div style={{ marginTop: 7, font: `400 11px/1.5 ${FUENTE.ui}`, color: COLOR.textoTenue }}>
            <b style={{ color: COLOR.dinero }}>Resolución:</b> {r.nota_resolucion}
          </div>
        )}

        {abierto && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            {r.estado === 'nuevo' && (
              <Boton chico al={() => resolverReporte(r.id, 'en_revision').then(tras)}>
                Tomar el caso
              </Boton>
            )}
            {r.clip_id && r.clip_estado === 'aprobado' && (
              <Boton chico tono="peligro" al={() => pide('retirar')}>Retirar el clip</Boton>
            )}
            <Boton chico tono="peligro" al={() => pide('banear')}>Banear</Boton>
            <Boton chico al={() => pide('desestimar')}>Desestimar</Boton>
            <Boton chico tono="primario"
              al={async () => {
                const x = await cerrarReportesDe(
                  r.clip_id ? { clip: r.clip_id } : { perfil: r.perfil_id! },
                  'Revisado sin encontrar problema')
                tras('error' in x ? x.error : '')
              }}>Cerrar sin acción</Boton>
          </div>
        )}
      </div>
    </div>
  )
}
