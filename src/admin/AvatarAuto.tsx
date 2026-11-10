/* «Generar avatares faltantes»: el retroactivo para las creadoras sin foto.
 *
 * Recorre a las creadoras (no vetadas) con `avatar_path` nulo. A las que tienen
 * al menos un clip publicado les saca un cuadro de su PROPIO video —el mas
 * antiguo, con la misma heuristica que usa la subida (`avatarDeVideo`)— y lo
 * muestra como PROPUESTA. No se publica nada hasta confirmar: es contenido
 * 18+, la heuristica no sabe lo que hay en el cuadro, y el avatar es publico.
 *
 * Las que no tienen ningun video se quedan con su inicial, sin subir nada.
 *
 * Corre en el navegador de quien administra, con su sesion: el video se pide con
 * la URL firmada de siempre, el cuadro se saca aqui y se sube con `fijarAvatar`.
 * Solo se escribe si `avatar_path` SIGUE nulo en el momento de aplicar. */
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { urlVideoFirmada } from '../lib/clips'
import { avatarDeVideo } from '../lib/miniatura'
import { fijarAvatar } from '../lib/admin'
import { cuantos } from '../lib/plural'
import { COLOR, LINEA, FUENTE } from '../lib/diseño'
import { Boton, Confirmar } from './piezas'

type Candidata = { id: string; handle: string; nombre: string; clip: string }
type Propuesta = Candidata & { archivo: File; vista: string; marcada: boolean }
type Resumen = { aplicadas: number; yaTenian: number; fallos: string[] }

const LOTE = 8

export default function AvatarAuto() {
  const [fase, setFase] = useState<'inicio' | 'buscando' | 'lista'>('inicio')
  const [pendientes, setPendientes] = useState<Candidata[]>([])
  const [sinVideo, setSinVideo] = useState(0)
  const [propuestas, setPropuestas] = useState<Propuesta[]>([])
  const [sinCuadro, setSinCuadro] = useState<string[]>([])
  const [trabajando, setTrabajando] = useState(false)
  const [confirma, setConfirma] = useState(false)
  const [resumen, setResumen] = useState<Resumen | null>(null)
  const [error, setError] = useState('')
  const vistas = useRef<string[]>([])

  // Cada vista es un object URL: se revocan al salir.
  useEffect(() => () => { vistas.current.forEach(u => URL.revokeObjectURL(u)) }, [])

  const buscar = async () => {
    setFase('buscando'); setError(''); setResumen(null)
    const { data: perfiles, error: e1 } = await supabase.from('profiles')
      .select('id,handle,display_name').eq('is_creator', true)
      .is('avatar_path', null).is('baneado_at', null).limit(1000)
    if (e1) { setError(e1.message); setFase('inicio'); return }
    const lista = (perfiles ?? []) as { id: string; handle: string; display_name: string }[]
    if (lista.length === 0) { setPendientes([]); setSinVideo(0); setFase('lista'); return }

    // El clip publicado mas antiguo de cada una: las primeras tomas suelen ser
    // la presentacion.
    const { data: clips, error: e2 } = await supabase.from('clips')
      .select('id,creator_id,created_at').in('creator_id', lista.map(p => p.id))
      .eq('published', true).eq('tiene_video', true).order('created_at', { ascending: true })
    if (e2) { setError(e2.message); setFase('inicio'); return }
    const primero = new Map<string, string>()
    for (const c of (clips ?? []) as { id: string; creator_id: string }[]) {
      if (!primero.has(c.creator_id)) primero.set(c.creator_id, c.id)
    }
    const con = lista.filter(p => primero.has(p.id))
      .map(p => ({ id: p.id, handle: p.handle, nombre: p.display_name, clip: primero.get(p.id)! }))
    setPendientes(con); setSinVideo(lista.length - con.length)
    setPropuestas([]); setSinCuadro([]); setFase('lista')
  }

  const generar = async () => {
    setTrabajando(true); setError('')
    const lote = pendientes.slice(0, LOTE)
    const nuevas: Propuesta[] = [], fallidas: string[] = []
    for (const c of lote) {
      const acceso = await urlVideoFirmada(c.clip)
      const f = 'url' in acceso && acceso.url ? await avatarDeVideo(acceso.url) : null
      if (!f) { fallidas.push(c.handle); continue }
      const vista = URL.createObjectURL(f)
      vistas.current.push(vista)
      nuevas.push({ ...c, archivo: f, vista, marcada: true })
    }
    setPendientes(p => p.slice(LOTE))
    setPropuestas(p => [...p, ...nuevas])
    setSinCuadro(s => [...s, ...fallidas])
    setTrabajando(false)
  }

  const aplicar = async () => {
    setConfirma(false); setTrabajando(true)
    const r: Resumen = { aplicadas: 0, yaTenian: 0, fallos: [] }
    for (const p of propuestas.filter(x => x.marcada)) {
      // Se vuelve a mirar: si mientras tanto la creadora subio su foto, no se pisa.
      const { data } = await supabase.from('profiles').select('avatar_path').eq('id', p.id).maybeSingle()
      if (data?.avatar_path) { r.yaTenian++; continue }
      const res = await fijarAvatar(p.id, p.archivo)
      if ('error' in res) r.fallos.push(`@${p.handle}: ${res.error}`)
      else r.aplicadas++
    }
    setPropuestas(ps => ps.filter(x => !x.marcada))
    setResumen(r); setTrabajando(false)
  }

  const marcadas = propuestas.filter(p => p.marcada).length

  return (
    <div style={{ border: `1px solid ${LINEA.tenue}`, padding: '16px 18px' }}>
      <div style={{ font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 1.2,
        textTransform: 'uppercase', color: COLOR.texto }}>Avatares faltantes</div>
      <div style={{ margin: '9px 0 14px', font: `400 12px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
        A las creadoras sin foto que ya tienen un clip publicado les propone un cuadro de su
        propio video. <b style={{ color: COLOR.texto }}>No se publica nada hasta que confirmes</b>:
        el avatar es público y la selección automática no sabe qué hay en el cuadro, así que
        revisa cada uno. Las que no tienen video se quedan con su inicial.
      </div>

      {fase === 'inicio' && (
        <Boton tono="primario" al={buscar}>Buscar creadoras sin foto</Boton>
      )}
      {fase === 'buscando' && (
        <div style={{ font: `400 12px/1 ${FUENTE.ui}`, color: COLOR.textoSuave }}>Buscando…</div>
      )}

      {fase === 'lista' && (
        <>
          <div style={{ font: `400 12px/1.6 ${FUENTE.mono}`, color: COLOR.textoSuave }}>
            {cuantos(propuestas.length + pendientes.length + sinCuadro.length, 'creadora')} con
            video · {sinVideo} sin video (inicial) · {pendientes.length} por revisar
          </div>

          {propuestas.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
              gap: 10, margin: '14px 0' }}>
              {propuestas.map(p => (
                <label key={p.id} style={{ display: 'grid', gap: 6, justifyItems: 'center', cursor: 'pointer',
                  padding: 8, border: `1px solid ${p.marcada ? COLOR.dinero : LINEA.tenue}` }}>
                  <img src={p.vista} alt={`Propuesta para @${p.handle}`}
                    style={{ width: 84, height: 84, borderRadius: '50%', objectFit: 'cover' }} />
                  <span style={{ font: `400 11px/1.3 ${FUENTE.mono}`, color: COLOR.textoSuave,
                    maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>@{p.handle}</span>
                  <input type="checkbox" checked={p.marcada}
                    onChange={e => setPropuestas(ps => ps.map(x => x.id === p.id ? { ...x, marcada: e.target.checked } : x))}
                    aria-label={`Aplicar el avatar propuesto a @${p.handle}`} />
                </label>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            {pendientes.length > 0 && (
              <Boton activo={!trabajando} al={generar}>
                {trabajando ? 'Sacando cuadros…' : `Sacar propuestas (${Math.min(LOTE, pendientes.length)} más)`}
              </Boton>
            )}
            {marcadas > 0 && (
              <Boton tono="primario" activo={!trabajando} al={() => setConfirma(true)}>
                Aplicar {marcadas} {marcadas === 1 ? 'seleccionada' : 'seleccionadas'}
              </Boton>
            )}
          </div>

          {sinCuadro.length > 0 && (
            <div style={{ marginTop: 12, font: `400 11px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
              Sin un cuadro aceptable (se quedan con su inicial): {sinCuadro.map(h => `@${h}`).join(', ')}
            </div>
          )}
        </>
      )}

      {resumen && (
        <div style={{ marginTop: 12, padding: '10px 13px', border: `1px solid ${COLOR.dinero}`,
          color: COLOR.dinero, font: `400 12px/1.5 ${FUENTE.ui}` }}>
          {cuantos(resumen.aplicadas, 'avatar')} {resumen.aplicadas === 1 ? 'aplicado' : 'aplicados'}
          {resumen.yaTenian > 0 && ` · ${resumen.yaTenian} ya tenía${resumen.yaTenian === 1 ? '' : 'n'} foto y no se tocó`}
          {resumen.fallos.length > 0 && ` · fallaron: ${resumen.fallos.join(' · ')}`}
        </div>
      )}
      {error && (
        <div role="alert" style={{ marginTop: 12, font: `400 12px/1.5 ${FUENTE.ui}`, color: COLOR.error }}>{error}</div>
      )}

      {confirma && (
        <Confirmar titulo="Aplicar los avatares" tono="primario" etiqueta="Aplicar"
          cuerpo={<>Se sube y se fija como foto de perfil el cuadro de cada una de las {marcadas} marcadas.
            Es <b style={{ color: COLOR.texto }}>público</b>. Solo se escribe si la creadora sigue sin
            foto, y ella puede cambiarla cuando quiera desde Ajustes.</>}
          cancela={() => setConfirma(false)}
          al={aplicar} />
      )}
    </div>
  )
}
