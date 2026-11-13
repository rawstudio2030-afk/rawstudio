/* Modulo «Articulos» del panel: escribir, publicar y quitar articulos,
 * instrucciones y preguntas frecuentes.
 *
 * Todo nace como BORRADOR; publicar y despublicar son acciones aparte. Lo
 * publicado lo lee cualquier cuenta con sesion en `/articulos`. Si un articulo se
 * marca «en el bot», el bot de Telegram lo lista con un enlace al sitio (nunca
 * manda el texto): por eso hay un «titulo para el bot» corto y neutro, que es lo
 * unico que Telegram ve.
 *
 * El borrado es real (no suave): el articulo y su PDF desaparecen. La bitacora
 * conserva quien lo hizo y el titulo.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { COLOR, FUENTE, LINEA } from '../lib/diseño'
import { cuantos } from '../lib/plural'
import TextoArticulo from '../components/TextoArticulo'
import {
  TIPOS, LIMITES, TOPE_PDF_MB, nombreTipo, adminArticulos, guardarArticulo, publicarArticulo,
  borrarArticulo, subirPdf, quitarPdf, type ArticuloAdmin, type TipoArticulo,
} from '../lib/articulos'
import { Boton, Campo, AreaTexto, Selector, Etiquetado, Aviso, Confirmar, Insignia, fecha } from './piezas'

type Borrador = {
  id: string | null; tipo: TipoArticulo; titulo: string; tituloBot: string; resumen: string
  cuerpo: string; pdfPath: string | null; enBot: boolean; orden: string
}

const VACIO: Borrador = {
  id: null, tipo: 'articulo', titulo: '', tituloBot: '', resumen: '', cuerpo: '', pdfPath: null, enBot: false, orden: '0',
}

const deFila = (a: ArticuloAdmin): Borrador => ({
  id: a.id, tipo: a.tipo, titulo: a.titulo, tituloBot: a.titulo_bot ?? '', resumen: a.resumen ?? '',
  cuerpo: a.cuerpo, pdfPath: a.pdf_path, enBot: a.en_bot, orden: String(a.orden),
})

const nombreArchivo = (ruta: string) => ruta.split('/').pop() ?? ruta

export default function ArticulosAdmin() {
  const [filas, setFilas] = useState<ArticuloAdmin[] | null>(null)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [filtro, setFiltro] = useState<'todos' | 'borradores' | 'publicados'>('todos')
  const [edita, setEdita] = useState<Borrador | null>(null)
  const [pdfNuevo, setPdfNuevo] = useState<File | null>(null)
  const [vista, setVista] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [aBorrar, setABorrar] = useState<ArticuloAdmin | null>(null)
  const selectorPdf = useRef<HTMLInputElement>(null)

  const cargar = useCallback(async () => {
    const r = await adminArticulos()
    if ('error' in r) { setError(r.error); return }
    setError(''); setFilas(r.filas)
  }, [])
  useEffect(() => { cargar() }, [cargar])

  const abrir = (b: Borrador) => { setEdita(b); setPdfNuevo(null); setVista(false); setAviso(null) }
  const cerrar = () => { setEdita(null); setPdfNuevo(null); setVista(false) }

  const guardar = async (publicarAlTerminar: boolean) => {
    if (!edita || guardando) return
    setGuardando(true); setAviso(null)
    try {
      let ruta = edita.pdfPath
      const rutaVieja = filas?.find(f => f.id === edita.id)?.pdf_path ?? null
      if (pdfNuevo) {
        const s = await subirPdf(pdfNuevo)
        if ('error' in s) { setAviso({ tipo: 'error', texto: s.error }); return }
        ruta = s.ruta
      }
      const r = await guardarArticulo({
        id: edita.id, tipo: edita.tipo, titulo: edita.titulo, tituloBot: edita.tituloBot,
        resumen: edita.resumen, cuerpo: edita.cuerpo, pdfPath: ruta, enBot: edita.enBot,
        orden: Number.parseInt(edita.orden, 10) || 0,
      })
      if ('error' in r) {
        // Si el articulo no se guardo, el PDF recien subido no debe quedar suelto.
        if (pdfNuevo && ruta) await quitarPdf(ruta)
        setAviso({ tipo: 'error', texto: r.error }); return
      }
      // El PDF anterior ya no lo usa nadie: se borra del bucket.
      if (rutaVieja && rutaVieja !== ruta) await quitarPdf(rutaVieja)
      if (publicarAlTerminar) {
        const e = await publicarArticulo(r.id, true)
        if (e) { setAviso({ tipo: 'error', texto: `Se guardó, pero no se pudo publicar: ${e}` }); await cargar(); return }
      }
      setAviso({ tipo: 'ok', texto: publicarAlTerminar ? 'Guardado y publicado.' : 'Guardado como borrador.' })
      cerrar(); await cargar()
    } finally { setGuardando(false) }
  }

  const cambiarPublicado = async (a: ArticuloAdmin) => {
    setAviso(null)
    const e = await publicarArticulo(a.id, !a.publicado)
    if (e) { setAviso({ tipo: 'error', texto: e }); return }
    setAviso({ tipo: 'ok', texto: a.publicado ? 'Quedó como borrador: ya no se ve en el sitio ni en el bot.' : 'Publicado.' })
    await cargar()
  }

  const visibles = (filas ?? []).filter(f =>
    filtro === 'todos' || (filtro === 'publicados' ? f.publicado : !f.publicado))

  const tituloBotVisto = edita ? (edita.tituloBot.trim() || edita.titulo.trim().slice(0, LIMITES.tituloBot)) : ''

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <Boton tono="primario" al={() => abrir(VACIO)} activo={!edita}>Nuevo artículo</Boton>
        <Selector valor={filtro} cambia={setFiltro} opciones={[
          { v: 'todos', t: 'Todos' }, { v: 'borradores', t: 'Borradores' }, { v: 'publicados', t: 'Publicados' },
        ]} />
        {filas && <span style={{ font: `400 12px/1 ${FUENTE.ui}`, color: COLOR.textoTenue }}>{cuantos(visibles.length, 'artículo')}</span>}
      </div>

      {/* Con el formulario abierto el aviso va DENTRO, junto a los botones: arriba del todo
          quedaria fuera de la vista justo cuando se pulsa «Guardar» al final. */}
      {aviso && !edita && <div style={{ marginBottom: 14 }}><Aviso tipo={aviso.tipo} cierra={() => setAviso(null)}>{aviso.texto}</Aviso></div>}
      {error && <div style={{ marginBottom: 14 }}><Aviso tipo="error">No se pudo cargar: {error}</Aviso></div>}

      {edita && (
        <div style={{ border: `1px solid ${COLOR.admin}`, borderRadius: 10, padding: 18, marginBottom: 20, background: COLOR.superficie }}>
          <div style={{ font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 1.6, textTransform: 'uppercase', color: COLOR.admin, marginBottom: 14 }}>
            {edita.id ? 'Editar' : 'Nuevo'} {nombreTipo(edita.tipo).toLowerCase()}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr 120px', gap: 14, marginBottom: 14 }}>
            <Etiquetado texto="Tipo" hijo={<Selector valor={edita.tipo} cambia={t => setEdita({ ...edita, tipo: t })}
              opciones={TIPOS.map(t => ({ v: t.v, t: t.t }))} />} />
            <Etiquetado texto={edita.tipo === 'pregunta' ? 'Pregunta' : 'Título'} hijo={
              <Campo valor={edita.titulo} cambia={v => setEdita({ ...edita, titulo: v })} marcador={edita.tipo === 'pregunta' ? '¿Cómo…?' : 'Título del artículo'} />} />
            <Etiquetado texto="Orden" hijo={<Campo valor={edita.orden} tipo="number" cambia={v => setEdita({ ...edita, orden: v })} />} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <Etiquetado texto={`Resumen (opcional, ${edita.resumen.length}/${LIMITES.resumen})`} hijo={
              <AreaTexto filas={2} valor={edita.resumen} cambia={v => setEdita({ ...edita, resumen: v.slice(0, LIMITES.resumen) })}
                marcador="Una o dos frases que salen en la lista." />} />
          </div>

          <div style={{ marginBottom: 6 }}>
            <Etiquetado texto={edita.tipo === 'pregunta' ? 'Respuesta' : 'Texto'} hijo={
              <AreaTexto filas={16} valor={edita.cuerpo} cambia={v => setEdita({ ...edita, cuerpo: v })}
                marcador="Escribe aquí. Deja una línea en blanco entre párrafos." />} />
          </div>
          <div style={{ font: `400 12px/1.5 ${FUENTE.ui}`, color: COLOR.textoTenue, marginBottom: 14 }}>
            Formato: <code style={{ fontFamily: FUENTE.mono }}>## Encabezado</code> · <code style={{ fontFamily: FUENTE.mono }}>- elemento</code> para listas ·
            {' '}<code style={{ fontFamily: FUENTE.mono }}>1. paso</code> para pasos ·
            {' '}<code style={{ fontFamily: FUENTE.mono }}>**negrita**</code> · una dirección https se vuelve enlace.
            {' '}{edita.cuerpo.length.toLocaleString('es-MX')} de {LIMITES.cuerpo.toLocaleString('es-MX')} caracteres.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 14 }}>
            <div>
              <Etiquetado texto="PDF adjunto (opcional)" hijo={
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <input ref={selectorPdf} type="file" accept="application/pdf,.pdf" style={{ display: 'none' }}
                    onChange={e => { setPdfNuevo(e.target.files?.[0] ?? null); e.target.value = '' }} />
                  <Boton chico al={() => selectorPdf.current?.click()}>{edita.pdfPath || pdfNuevo ? 'Cambiar PDF' : 'Elegir PDF'}</Boton>
                  {(edita.pdfPath || pdfNuevo) && (
                    <>
                      <span style={{ font: `400 12px/1.3 ${FUENTE.ui}`, color: COLOR.textoSuave, overflowWrap: 'anywhere' }}>
                        {pdfNuevo ? `${pdfNuevo.name} (se sube al guardar)` : nombreArchivo(edita.pdfPath!)}
                      </span>
                      <Boton chico tono="peligro" al={() => { setPdfNuevo(null); setEdita({ ...edita, pdfPath: null }) }}>Quitar</Boton>
                    </>
                  )}
                </div>} />
              <div style={{ font: `400 11px/1.5 ${FUENTE.ui}`, color: COLOR.textoTenue, marginTop: 5 }}>Hasta {TOPE_PDF_MB} MB. Solo lo descargan las cuentas con sesión.</div>
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', font: `700 12px/1.3 ${FUENTE.ui}`, color: COLOR.texto }}>
                <input type="checkbox" checked={edita.enBot} onChange={e => setEdita({ ...edita, enBot: e.target.checked })} />
                Mostrar en el bot de Telegram
              </label>
              {edita.enBot && (
                <div style={{ marginTop: 10 }}>
                  <Etiquetado texto={`Título para el bot (${edita.tituloBot.length}/${LIMITES.tituloBot})`} hijo={
                    <Campo valor={edita.tituloBot} cambia={v => setEdita({ ...edita, tituloBot: v.slice(0, LIMITES.tituloBot) })}
                      marcador="Corto y neutro" />} />
                  <div style={{ font: `400 11px/1.5 ${FUENTE.ui}`, color: COLOR.textoTenue, marginTop: 5 }}>
                    Es lo único que Telegram ve: usa palabras neutras (por ejemplo «Salud: prevención»). El texto no pasa por Telegram, solo un enlace al sitio.
                    En el bot se verá como: <b style={{ color: COLOR.textoSuave }}>{tituloBotVisto || '—'}</b>
                  </div>
                </div>
              )}
            </div>
          </div>

          {vista && (
            <div style={{ border: `1px solid ${LINEA.marcada}`, borderRadius: 8, padding: '16px 20px', marginBottom: 14, background: COLOR.fondo }}>
              <div style={{ font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 1.4, textTransform: 'uppercase', color: COLOR.textoSuave, marginBottom: 10 }}>Vista previa</div>
              <h3 style={{ margin: '0 0 10px', font: `700 22px/1.25 ${FUENTE.ui}`, color: COLOR.texto }}>{edita.titulo || 'Sin título'}</h3>
              {edita.resumen && <p style={{ margin: '0 0 14px', font: `400 16px/1.5 ${FUENTE.ui}`, color: COLOR.texto }}>{edita.resumen}</p>}
              <TextoArticulo texto={edita.cuerpo || ' '} />
            </div>
          )}

          {aviso && <div style={{ marginBottom: 12 }}><Aviso tipo={aviso.tipo} cierra={() => setAviso(null)}>{aviso.texto}</Aviso></div>}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Boton tono="primario" activo={!guardando} al={() => guardar(false)}>{guardando ? 'Guardando…' : 'Guardar borrador'}</Boton>
            <Boton activo={!guardando} al={() => guardar(true)}>Guardar y publicar</Boton>
            <Boton activo={!guardando} al={() => setVista(!vista)}>{vista ? 'Ocultar vista previa' : 'Vista previa'}</Boton>
            <Boton activo={!guardando} al={cerrar}>Cancelar</Boton>
          </div>
        </div>
      )}

      {filas && visibles.length === 0 && !edita && (
        <div style={{ padding: '28px 4px', font: `400 14px/1.5 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
          {filas.length === 0 ? 'Todavía no hay artículos. Crea el primero con «Nuevo artículo».' : 'Ninguno con ese filtro.'}
        </div>
      )}

      <div style={{ display: 'grid', gap: 8 }}>
        {visibles.map(a => (
          <div key={a.id} style={{
            display: 'grid', gridTemplateColumns: '1fr auto', gap: 14, alignItems: 'center',
            padding: '12px 14px', border: `1px solid ${LINEA.tenue}`, borderRadius: 8, background: COLOR.superficie,
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ font: `700 14px/1.35 ${FUENTE.ui}`, color: COLOR.texto, overflowWrap: 'anywhere' }}>{a.titulo}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 7 }}>
                <Insignia texto={a.publicado ? 'Publicado' : 'Borrador'} color={a.publicado ? COLOR.dinero : COLOR.textoTenue} />
                <Insignia texto={nombreTipo(a.tipo)} color={COLOR.admin} />
                {a.en_bot && <Insignia texto="En el bot" color={COLOR.acento} />}
                {a.pdf_path && <Insignia texto="PDF" color={COLOR.textoSuave} />}
                <span style={{ font: `400 11px/1 ${FUENTE.ui}`, color: COLOR.textoTenue }}>Editado {fecha(a.actualizado_at)}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Boton chico al={() => abrir(deFila(a))}>Editar</Boton>
              <Boton chico al={() => cambiarPublicado(a)}>{a.publicado ? 'Despublicar' : 'Publicar'}</Boton>
              <Boton chico tono="peligro" al={() => setABorrar(a)}>Borrar</Boton>
            </div>
          </div>
        ))}
      </div>

      {aBorrar && (
        <Confirmar
          titulo="Borrar artículo"
          cuerpo={<>Se borra «{aBorrar.titulo}»{aBorrar.pdf_path ? ' y su PDF' : ''}. No se puede deshacer. Si solo quieres quitarlo del sitio y del bot, usa «Despublicar».</>}
          etiqueta="Borrar"
          al={async () => {
            const e = await borrarArticulo(aBorrar.id)
            if (e) return e
            setABorrar(null)
            if (edita?.id === aBorrar.id) cerrar()
            setAviso({ tipo: 'ok', texto: 'Artículo borrado.' })
            await cargar()
          }}
          cancela={() => setABorrar(null)} />
      )}
    </div>
  )
}
