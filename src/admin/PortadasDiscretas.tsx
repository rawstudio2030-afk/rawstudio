/* «Portadas más discretas»: el retroactivo para las portadas que YA existen.
 *
 * Casi todo el catalogo salio de la subida en lote, cuya portada era el cuadro del 10%
 * del video: uno que solo busca no ser negro, no uno discreto. Con la copia publica a
 * 240 px ese mismo fotograma se ve tan nitido como es. Aqui se busca OTRO cuadro del
 * video —el mismo criterio que el avatar: seis cuadros de la primera mitad, sin lo
 * negro, lo quemado ni lo liso, con premio a lo temprano—, completo y sin recortar.
 *
 * NO ES UN CLASIFICADOR DE CONTENIDO. No sabe que hay en el cuadro y no garantiza uno
 * inocuo. Por eso NO se aplica a ciegas: por cada clip se PROPONE y se muestra JUNTO a
 * la portada actual, y no se escribe nada hasta que quien administra confirma (puede
 * desmarcar las que no quiera cambiar). No hay forma de saber si una portada la eligio
 * la creadora, la subio a mano o la puso el lote: ver antes y despues es lo que evita
 * pisar a ciegas una que alguien eligio.
 *
 * No parte de `clip-covers-full`: esa es la MISMA imagen explicita, solo mas grande.
 * Decodifica el video, que se pide con la misma URL firmada de siempre.
 *
 * Al aplicar, la misma ruta se reescribe en los dos buckets: la nitida (hasta 720 px) en
 * `clip-covers-full` y la publica (240 px, `achicar`) en `clip-covers`, con `upsert`
 * (solo este relleno lo usa; las subidas normales siguen sin pisar). Sin video, sin
 * cuadro aceptable o con un error NO se inventa una portada: se omite y se cuenta.
 *
 * Corre en el navegador de quien administra, con su sesion y las politicas que ya
 * existen (leer el video firmado, escribir en los dos buckets de portadas). En lotes
 * chicos, como el del avatar, para no colgar el navegador con videos grandes. */
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { urlVideoFirmada, urlPortada } from '../lib/clips'
import { elegirCuadroDiscreto, achicar } from '../lib/miniatura'
import { cuantos } from '../lib/plural'
import { COLOR, LINEA, FUENTE } from '../lib/diseño'
import { Boton, Confirmar } from './piezas'

type Candidato = { id: string; titulo: string; handle: string; coverPath: string }
type Propuesta = Candidato & {
  archivo: File
  /** Object URL de la propuesta. */
  vista: string
  /** La portada actual (la nitida firmada si hay; si no, la publica). */
  actual: string | null
  segundo: number
  marcada: boolean
}
type Omitida = { id: string; titulo: string; motivo: string }
type Resumen = { aplicadas: number; omitidas: number; fallos: string[] }

const LOTE = 8

export default function PortadasDiscretas() {
  const [fase, setFase] = useState<'inicio' | 'buscando' | 'lista'>('inicio')
  const [pendientes, setPendientes] = useState<Candidato[]>([])
  const [propuestas, setPropuestas] = useState<Propuesta[]>([])
  const [omitidas, setOmitidas] = useState<Omitida[]>([])
  const [total, setTotal] = useState(0)
  const [trabajando, setTrabajando] = useState(false)
  const [progreso, setProgreso] = useState('')
  const [confirma, setConfirma] = useState(false)
  const [resumen, setResumen] = useState<Resumen | null>(null)
  const [error, setError] = useState('')
  const vistas = useRef<string[]>([])
  // Los que ya se aplicaron en esta sesion: no se vuelven a proponer.
  const aplicadas = useRef<Set<string>>(new Set())

  // Cada vista es un object URL: se revocan al salir.
  useEffect(() => () => { vistas.current.forEach(u => URL.revokeObjectURL(u)) }, [])

  const buscar = async () => {
    setFase('buscando'); setError(''); setResumen(null)
    // Solo VIDEOS con archivo y con portada: un album no entra, y sin `cover_path` no hay
    // ruta que reescribir (esos se resuelven con «Generar portada» en Contenido).
    const { data, error: e } = await supabase.from('clips')
      .select('id,title,cover_path,profiles!clips_creator_id_fkey(handle)')
      .eq('formato', 'video').is('borrado_at', null)
      .not('storage_path', 'is', null).not('cover_path', 'is', null)
      .order('created_at', { ascending: true }).limit(1000)
    if (e) { setError(e.message); setFase('inicio'); return }
    const filas = (data ?? []) as unknown as {
      id: string; title: string; cover_path: string; profiles: { handle: string } | { handle: string }[] | null
    }[]
    const lista: Candidato[] = filas
      .filter(f => !aplicadas.current.has(f.id))
      .map(f => ({
        id: f.id, titulo: f.title, coverPath: f.cover_path,
        handle: (Array.isArray(f.profiles) ? f.profiles[0]?.handle : f.profiles?.handle) ?? '—',
      }))
    setPendientes(lista); setTotal(lista.length)
    setPropuestas([]); setOmitidas([]); setFase('lista')
  }

  const generar = async () => {
    setTrabajando(true); setError('')
    const lote = pendientes.slice(0, LOTE)
    const nuevas: Propuesta[] = [], fuera: Omitida[] = []
    let n = 0
    for (const c of lote) {
      setProgreso(`${++n} de ${lote.length}…`)
      const acceso = await urlVideoFirmada(c.id)
      if (!('url' in acceso) || !acceso.url) {
        fuera.push({ id: c.id, titulo: c.titulo, motivo: 'sin video (no se pudo abrir)' })
        continue
      }
      const cuadro = await elegirCuadroDiscreto(acceso.url)
      // Sin cuadro aceptable —o un video que el navegador no decodifica— NO se inventa
      // una portada: se omite.
      if (!cuadro) {
        fuera.push({ id: c.id, titulo: c.titulo, motivo: 'sin un cuadro aceptable' })
        continue
      }
      const vista = URL.createObjectURL(cuadro.archivo)
      vistas.current.push(vista)
      nuevas.push({
        ...c, archivo: cuadro.archivo, vista, segundo: cuadro.segundo, marcada: true,
        actual: acceso.portada ?? urlPortada(c.coverPath),
      })
    }
    setPendientes(p => p.slice(LOTE))
    setPropuestas(p => [...p, ...nuevas])
    setOmitidas(o => [...o, ...fuera])
    setProgreso(''); setTrabajando(false)
  }

  const aplicar = async () => {
    setConfirma(false); setTrabajando(true); setError('')
    const r: Resumen = { aplicadas: 0, omitidas: 0, fallos: [] }
    const marcadas = propuestas.filter(p => p.marcada)
    let n = 0
    for (const p of marcadas) {
      setProgreso(`Aplicando ${++n} de ${marcadas.length}…`)
      try {
        // La publica se prepara ANTES de escribir nada: si no se puede reducir, no se
        // toca ninguna de las dos copias.
        const chica = await achicar(p.archivo)
        if (!chica) throw new Error('no pude reducir la imagen')
        const a = await supabase.storage.from('clip-covers-full')
          .upload(p.coverPath, p.archivo, { contentType: 'image/jpeg', upsert: true })
        if (a.error) throw new Error(`nítida: ${a.error.message}`)
        const b = await supabase.storage.from('clip-covers')
          .upload(p.coverPath, chica, { contentType: 'image/jpeg', upsert: true })
        if (b.error) throw new Error(`pública: ${b.error.message}`)
        aplicadas.current.add(p.id)
        r.aplicadas++
      } catch (e) {
        r.fallos.push(`${p.titulo.slice(0, 40)}: ${(e as Error).message}`)
      }
    }
    // Las aplicadas salen de la lista; las desmarcadas se quedan por si cambia de idea;
    // las que fallaron tambien, para reintentar.
    const hechas = new Set(marcadas.filter(p => aplicadas.current.has(p.id)).map(p => p.id))
    setPropuestas(ps => ps.filter(p => !hechas.has(p.id)))
    r.omitidas = omitidas.length
    setResumen(r); setProgreso(''); setTrabajando(false)
  }

  const marcadas = propuestas.filter(p => p.marcada).length

  return (
    <div style={{ border: `1px solid ${LINEA.tenue}`, padding: '16px 18px' }}>
      <div style={{ font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 1.2,
        textTransform: 'uppercase', color: COLOR.texto }}>Portadas más discretas</div>
      <div style={{ margin: '9px 0 14px', font: `400 12px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
        Busca <b style={{ color: COLOR.texto }}>otro cuadro</b> del video (de la primera mitad, sin
        lo negro ni lo quemado) y lo muestra junto a la portada actual.{' '}
        <b style={{ color: COLOR.texto }}>No se cambia nada hasta que confirmes</b>: la selección
        automática no sabe qué hay en el cuadro y no garantiza uno inocuo, así que revisa cada uno
        y desmarca los que no quieras cambiar. Al aplicar se reescriben la portada pública (240 px) y la
        nítida privada. Sin video o sin un cuadro aceptable no se inventa nada: se omite.
      </div>

      {fase === 'inicio' && <Boton tono="primario" al={buscar}>Buscar videos</Boton>}
      {fase === 'buscando' && (
        <div style={{ font: `400 12px/1 ${FUENTE.ui}`, color: COLOR.textoSuave }}>Buscando…</div>
      )}

      {fase === 'lista' && (
        <>
          <div style={{ font: `400 12px/1.6 ${FUENTE.mono}`, color: COLOR.textoSuave }}>
            {cuantos(total, 'video')} con portada · {pendientes.length} sin revisar ·{' '}
            {cuantos(propuestas.length, 'propuesta')} · {cuantos(omitidas.length, 'omitido')}
          </div>

          {propuestas.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: 10, margin: '14px 0' }}>
              {propuestas.map(p => (
                <label key={p.id} style={{ display: 'grid', gap: 8, cursor: 'pointer', padding: 10,
                  border: `1px solid ${p.marcada ? COLOR.dinero : LINEA.tenue}` }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <Vista rotulo="Actual" src={p.actual} />
                    <Vista rotulo="Propuesta" src={p.vista} destacada />
                  </div>
                  <div style={{ font: `400 11px/1.4 ${FUENTE.ui}`, color: COLOR.texto,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.titulo}</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                    font: `400 11px/1.3 ${FUENTE.mono}`, color: COLOR.textoSuave }}>
                    <span>@{p.handle} · seg {p.segundo.toFixed(1)}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <input type="checkbox" checked={p.marcada}
                        onChange={e => setPropuestas(ps => ps.map(x => x.id === p.id ? { ...x, marcada: e.target.checked } : x))}
                        aria-label={`Cambiar la portada de ${p.titulo}`} />
                      cambiar
                    </span>
                  </div>
                </label>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            {pendientes.length > 0 && (
              <Boton activo={!trabajando} al={generar}>
                {trabajando && progreso ? `Sacando cuadros… ${progreso}` : `Sacar propuestas (${Math.min(LOTE, pendientes.length)} más)`}
              </Boton>
            )}
            {marcadas > 0 && (
              <Boton tono="primario" activo={!trabajando} al={() => setConfirma(true)}>
                {trabajando && progreso ? progreso : `Aplicar ${marcadas} ${marcadas === 1 ? 'marcada' : 'marcadas'}`}
              </Boton>
            )}
          </div>

          {omitidas.length > 0 && (
            <div style={{ marginTop: 12, font: `400 11px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
              Omitidos (no se tocan): {omitidas.slice(0, 12).map(o => `${o.titulo.slice(0, 30)} — ${o.motivo}`).join(' · ')}
              {omitidas.length > 12 && ` · y ${omitidas.length - 12} más`}
            </div>
          )}
        </>
      )}

      {resumen && (
        <div style={{ marginTop: 12, padding: '10px 13px', border: `1px solid ${COLOR.dinero}`,
          color: COLOR.dinero, font: `400 12px/1.5 ${FUENTE.ui}` }}>
          {cuantos(resumen.aplicadas, 'portada')} {resumen.aplicadas === 1 ? 'aplicada' : 'aplicadas'}
          {resumen.omitidas > 0 && ` · ${cuantos(resumen.omitidas, 'omitida')} (sin video o sin cuadro aceptable)`}
          {resumen.fallos.length > 0 && ` · ${cuantos(resumen.fallos.length, 'error', 'errores')}: ${resumen.fallos.slice(0, 3).join(' · ')}`}
          {resumen.aplicadas > 0 && '. Quien ya vio la portada anterior puede tardar hasta una hora en ver la nueva.'}
        </div>
      )}
      {error && (
        <div role="alert" style={{ marginTop: 12, font: `400 12px/1.5 ${FUENTE.ui}`, color: COLOR.error }}>{error}</div>
      )}

      {confirma && (
        <Confirmar titulo="Cambiar las portadas" tono="primario" etiqueta="Cambiar"
          cuerpo={<>Videos marcados: {marcadas}. Se reescribe la portada de cada uno: la <b style={{ color: COLOR.texto }}>pública</b> (240 px,
            la que ve cualquiera) y la nítida privada, que pasan a ser el cuadro nuevo. El cuadro anterior
            no se guarda. Los desmarcados no se tocan.</>}
          cancela={() => setConfirma(false)}
          al={aplicar} />
      )}
    </div>
  )
}

/** Una portada en miniatura (3/4) con su rotulo. */
function Vista({ rotulo, src, destacada }: { rotulo: string; src: string | null; destacada?: boolean }) {
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      <div style={{ font: `700 9px/1 ${FUENTE.ui}`, letterSpacing: 1.2, textTransform: 'uppercase',
        color: destacada ? COLOR.dinero : COLOR.textoSuave }}>{rotulo}</div>
      <div style={{ aspectRatio: '3/4', background: COLOR.fondo, overflow: 'hidden',
        border: `1px solid ${destacada ? COLOR.dinero : LINEA.tenue}`, borderRadius: 6,
        backgroundImage: src ? `url("${src}")` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}
        role="img" aria-label={`Portada ${rotulo.toLowerCase()}`} />
    </div>
  )
}
