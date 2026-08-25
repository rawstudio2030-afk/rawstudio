/* Modulo 3: gestion de contenido.
 *
 * El borrado es SUAVE: la fila se marca y el archivo se conserva 30 dias. Un
 * borrado inmediato e irreversible en una plataforma con reclamaciones legales
 * es una forma de perder la unica prueba de lo que se publico.
 *
 * Pasado el plazo hay que purgar a mano desde aqui. Borrar la fila de
 * storage.objects con SQL NO elimina el archivo —eso solo lo hace la API de
 * almacenamiento—, asi que una tarea programada en la base no bastaria.
 */
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { COLOR, LINEA, FUENTE } from '../lib/diseño'
import {
  clipsAdmin, borrarClipAdmin, restaurarClip, destacar,
  porPurgar, purgar, type ClipAdmin, type PorPurgar,
} from '../lib/admin'
import { urlPortada } from '../lib/clips'
import {
  Tabla, Boton, Campo, Confirmar, Etiquetado, Insignia,
  desde, type Columna,
} from './piezas'

type Filtro = 'todos' | 'destacados' | 'borrados' | 'plataforma'

const PESTANAS: { v: Filtro; t: string }[] = [
  { v: 'todos',      t: 'Todo el contenido' },
  { v: 'destacados', t: 'Destacados'        },
  { v: 'plataforma', t: 'De la plataforma'  },
  { v: 'borrados',   t: 'Borrados'          },
]

export default function Contenido() {
  const nav = useNavigate()
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [texto, setTexto] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [filas, setFilas] = useState<ClipAdmin[]>([])
  const [pendientes, setPendientes] = useState<PorPurgar[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [dialogo, setDialogo] = useState<{ c: ClipAdmin; que: 'borrar' | 'destacar' } | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setBusqueda(texto), 300)
    return () => clearTimeout(t)
  }, [texto])

  const cargar = useCallback(async () => {
    setCargando(true)
    const r = await clipsAdmin(filtro, busqueda)
    setFilas(r.filas); setError(r.error); setCargando(false)
    setPendientes(await porPurgar())
  }, [filtro, busqueda])

  useEffect(() => { cargar() }, [cargar])

  const tras = async (m: string) => {
    if (m) { setError(m); return }
    setError(''); setDialogo(null); await cargar()
  }

  const columnas: Columna<ClipAdmin>[] = [
    { clave: 'clip', titulo: 'Clip', pinta: c => {
      const p = urlPortada(c.cover_path)
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 40, flex: '0 0 auto',
            border: `1px solid ${LINEA.tenue}`,
            background: p ? `center/cover url(${p})`
              : `repeating-linear-gradient(130deg,${COLOR.superficieAlta} 0 4px,${COLOR.superficie} 4px 8px)` }} />
          <div>
            <div style={{ color: COLOR.texto }}>{c.title}</div>
            <div style={{ font: `400 10px/1.3 ${FUENTE.mono}`, color: COLOR.textoTenue }}>
              {c.tipo === 'creadora'
                ? `@${c.profiles?.handle ?? '—'}`
                : <span style={{ color: COLOR.admin }}>RAWstudio · {c.tipo}</span>}
            </div>
          </div>
        </div>
      )
    } },
    { clave: 'estado', titulo: 'Estado', ancho: 150, pinta: c => (
      <div style={{ display: 'flex', gap: 5 }}>
        {c.borrado_at
          ? <Insignia texto="borrado" color="#FF4444" />
          : <Insignia texto={c.estado} color={
              c.estado === 'aprobado' ? COLOR.dinero
                : c.estado === 'pendiente' ? '#FFB020' : '#FF4444'} />}
        {c.destacado_orden != null && (
          <Insignia texto={`#${c.destacado_orden}`} color={COLOR.acento} />
        )}
      </div>
    ) },
    { clave: 'precio', titulo: 'Precio', numerica: true, ancho: 90,
      pinta: c => <span style={{ color: c.price_coins ? COLOR.dinero : COLOR.textoApagado }}>
        {c.price_coins || 'gratis'}</span> },
    { clave: 'fecha', titulo: 'Subido', ancho: 130,
      pinta: c => <span style={{ color: COLOR.textoSuave }}>{desde(c.created_at)}</span> },
    { clave: 'acciones', titulo: '', pinta: c => (
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        {c.borrado_at ? (
          <Boton chico tono="primario" al={() => restaurarClip(c.id).then(tras)}>Restaurar</Boton>
        ) : (
          <>
            {c.estado === 'aprobado' && (
              c.destacado_orden != null
                ? <Boton chico al={() => destacar(c.id, null).then(tras)}>Quitar de portada</Boton>
                : <Boton chico al={() => setDialogo({ c, que: 'destacar' })}>Destacar</Boton>
            )}
            <Boton chico tono="peligro" al={() => setDialogo({ c, que: 'borrar' })}>Borrar</Boton>
          </>
        )}
      </div>
    ) },
  ]

  return (
    <>
      {/* ---- Purga pendiente ---- */}
      {pendientes.length > 0 && (
        <div style={{ marginBottom: 16, padding: '13px 15px', border: '1px solid #FFB020' }}>
          <div style={{ font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.3,
            textTransform: 'uppercase', color: '#FFB020' }}>
            {pendientes.length} archivo{pendientes.length > 1 ? 's' : ''} cumplió los 30 días
          </div>
          <div style={{ margin: '8px 0 12px', font: `400 11px/1.55 ${FUENTE.ui}`, color: COLOR.textoTenue }}>
            Siguen ocupando espacio. Purgarlos borra el video y la portada de forma
            irreversible; la ficha del clip se conserva para la bitácora.
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Boton tono="peligro" al={async () => {
              let ok = 0; const fallos: string[] = []
              for (const c of pendientes) {
                const e = await purgar(c)
                if (e) fallos.push(`${c.titulo}: ${e}`); else ok++
              }
              setAviso(`Purgados ${ok} de ${pendientes.length}.` +
                (fallos.length ? ` Fallaron: ${fallos.join(' · ')}` : ''))
              await cargar()
            }}>Purgar los {pendientes.length}</Boton>
          </div>
        </div>
      )}

      {aviso && (
        <div style={{ marginBottom: 14, padding: '10px 13px', border: `1px solid ${COLOR.dinero}`,
          color: COLOR.dinero, font: `400 12px/1.4 ${FUENTE.ui}` }}>{aviso}</div>
      )}

      <div style={{ display: 'flex', borderBottom: `1px solid ${LINEA.tenue}`, marginBottom: 16 }}>
        {PESTANAS.map(p => (
          <div key={p.v} onClick={() => setFiltro(p.v)} style={{
            padding: '9px 15px', cursor: 'pointer',
            font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.2, textTransform: 'uppercase',
            color: filtro === p.v ? COLOR.admin : COLOR.textoTenue,
            borderBottom: `2px solid ${filtro === p.v ? COLOR.admin : 'transparent'}`,
          }}>{p.t}</div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 16 }}>
        <Etiquetado texto="Buscar por título" ancho={280} hijo={
          <Campo valor={texto} cambia={setTexto} marcador="Título del clip" />
        } />
        <div style={{ flex: 1 }} />
        <Boton tono="primario" al={() => nav('/alta-creadora')}>Subir por una creadora</Boton>
      </div>

      {error && (
        <div style={{ marginBottom: 14, padding: '10px 13px', border: '1px solid #FF4444',
          color: '#FF4444', font: `400 12px/1.4 ${FUENTE.ui}` }}>{error}</div>
      )}

      <div style={{ opacity: cargando ? .5 : 1 }}>
        <Tabla columnas={columnas} filas={filas} clave={c => c.id}
          vacia={cargando ? 'Cargando…'
            : filtro === 'destacados' ? 'Nada destacado en portada todavía'
            : filtro === 'plataforma' ? 'No hay contenido propio de la plataforma'
            : filtro === 'borrados'   ? 'Nada borrado'
            : 'Todavía no hay clips'} />
      </div>

      {filtro === 'destacados' && filas.length > 0 && (
        <div style={{ marginTop: 12, font: `400 11px/1.5 ${FUENTE.ui}`, color: COLOR.textoApagado }}>
          El número es la posición en la portada: el 1 sale primero. Lo no destacado va
          después, por fecha.
        </div>
      )}

      {dialogo?.que === 'borrar' && (
        <Confirmar titulo="Borrar el clip" etiqueta="Borrar" exigeMotivo
          cuerpo={<>Deja de verse de inmediato para todo el mundo, incluida quien lo compró.
            El archivo se conserva <b style={{ color: COLOR.texto }}>30 días</b> por si el
            borrado fue un error o hace falta para una reclamación, y después hay que
            purgarlo desde aquí.</>}
          cancela={() => setDialogo(null)}
          al={m => borrarClipAdmin(dialogo.c.id, m).then(tras)} />
      )}
      {dialogo?.que === 'destacar' && (
        <PosicionDialogo clip={dialogo.c} cancela={() => setDialogo(null)} listo={tras} />
      )}
    </>
  )
}

function PosicionDialogo({ clip, cancela, listo }: {
  clip: ClipAdmin; cancela: () => void; listo: (m: string) => void
}) {
  const [pos, setPos] = useState('1')
  const n = parseInt(pos || '0', 10)
  return (
    <Confirmar titulo="Destacar en portada" tono="primario"
      etiqueta={n > 0 ? `Poner en la posición ${n}` : 'Pon una posición'}
      cuerpo={<>«{clip.title}» aparecerá al principio de la pantalla de explorar. Si ya hay
        otro clip en esa posición, ambos comparten número y se ordenan por fecha entre sí.</>}
      extra={() => (
        <div style={{ marginTop: 14 }}>
          <Etiquetado texto="Posición (1 sale primero)" hijo={
            <Campo tipo="number" valor={pos} cambia={setPos} mono autoFoco />
          } />
        </div>
      )}
      cancela={cancela}
      al={async () => { if (n > 0) listo(await destacar(clip.id, n)) }} />
  )
}
