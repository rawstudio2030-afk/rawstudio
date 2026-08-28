/* Subir material a nombre de una creadora ya dada de alta.
 *
 * Existe porque publicar por otra persona solo se podia DENTRO del asistente
 * de alta, en el tercer paso, justo despues de crearla. Cerrado el asistente,
 * esa creadora quedaba sin ninguna via para recibir contenido aunque su
 * expediente estuviera completo.
 *
 * Solo se listan las que tienen expediente: son las mismas a las que las
 * politicas de storage permiten escribirles, asi que la lista no ofrece a
 * nadie a quien luego la subida vaya a fallar.
 */
import { useCallback, useEffect, useState } from 'react'
import { COLOR, LINEA, FUENTE } from '../lib/diseño'
import {
  creadorasGestionables, publicarPara, fijarAvatar,
  type CreadoraGestionable,
} from '../lib/admin'
import { urlAvatar } from '../lib/perfiles'
import { aCentavos } from '../lib/dinero'
import { Boton, Campo, Etiquetado, Insignia, Selector, desde } from './piezas'

export default function PublicarPor() {
  const [texto, setTexto] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [lista, setLista] = useState<CreadoraGestionable[]>([])
  const [elegida, setElegida] = useState<CreadoraGestionable | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setBusqueda(texto), 300)
    return () => clearTimeout(t)
  }, [texto])

  const cargar = useCallback(async () => {
    const r = await creadorasGestionables(busqueda)
    setLista(r.filas); setError(r.error)
  }, [busqueda])

  useEffect(() => { cargar() }, [cargar])

  if (elegida) {
    return <Formulario c={elegida} vuelve={() => { setElegida(null); cargar() }} />
  }

  return (
    <>
      <div style={{ marginBottom: 16, padding: '10px 13px', border: `1px solid ${LINEA.tenue}`,
        font: `400 11px/1.55 ${FUENTE.ui}`, color: COLOR.textoTenue }}>
        Solo aparecen las creadoras con expediente. A las demás, las políticas de
        almacenamiento no dejan escribirles — listarlas aquí sería ofrecer algo que
        después fallaría.
      </div>

      <div style={{ marginBottom: 16, maxWidth: 320 }}>
        <Etiquetado texto="Buscar" hijo={
          <Campo valor={texto} cambia={setTexto} marcador="Nombre o usuaria" />
        } />
      </div>

      {error && (
        <div style={{ marginBottom: 14, padding: '10px 13px', border: '1px solid #FF4444',
          color: '#FF4444', font: `400 12px/1.4 ${FUENTE.ui}` }}>{error}</div>
      )}

      {lista.length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center', border: `1px solid ${LINEA.tenue}`,
          font: `400 13px/1.5 ${FUENTE.ui}`, color: COLOR.textoTenue }}>
          {busqueda ? 'Nadie con ese nombre.'
            : 'Todavía no has dado de alta a ninguna creadora.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 9 }}>
          {lista.map(c => (
            <div key={c.id} onClick={() => c.verificada && setElegida(c)} style={{
              display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px',
              border: `1px solid ${LINEA.tenue}`, background: COLOR.superficie,
              cursor: c.verificada ? 'pointer' : 'not-allowed',
              opacity: c.verificada ? 1 : .55,
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%', flex: '0 0 auto',
                border: `1px solid ${LINEA.suave}`,
                background: urlAvatar(c.avatar_path)
                  ? `center/cover url(${urlAvatar(c.avatar_path)})`
                  : `repeating-linear-gradient(130deg,${COLOR.superficieAlta} 0 5px,${COLOR.superficie} 5px 10px)`,
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ font: `400 14px/1.25 ${FUENTE.ui}` }}>{c.nombre}</div>
                <div style={{ font: `400 10px/1.4 ${FUENTE.mono}`, color: COLOR.textoTenue }}>
                  @{c.handle} · alta {desde(c.alta_at)} · {c.clips_publicados}/{c.clips_total} publicados
                </div>
              </div>
              {c.verificada
                ? <Insignia texto="Puede publicar" color={COLOR.dinero} />
                : <Insignia texto={c.tiene_documentos ? 'Sin verificar' : 'Faltan documentos'}
                    color="#FFB020" />}
            </div>
          ))}
        </div>
      )}

      {lista.some(c => !c.verificada) && (
        <div style={{ marginTop: 14, font: `400 11px/1.5 ${FUENTE.ui}`, color: COLOR.textoApagado }}>
          Las apagadas no se pueden elegir: sin identidad verificada, la base rechaza
          cualquier publicación. Sube sus documentos desde el alta o resuelve su
          verificación en el módulo 09.
        </div>
      )}
    </>
  )
}

/** Un video en la fila de subida. El titulo se propone a partir del nombre
 *  del archivo —quitando extension y separadores— porque escribirlos uno por
 *  uno era justo lo que hacia insoportable subir diez. */
type EnFila = {
  archivo: File; titulo: string
  estado: 'espera' | 'subiendo' | 'listo' | 'error'
  detalle: string
}

function tituloDesde(nombre: string) {
  return nombre
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90) || 'Sin título'
}

function Formulario({ c, vuelve }: { c: CreadoraGestionable; vuelve: () => void }) {
  const [fila, setFila] = useState<EnFila[]>([])
  const [desc, setDesc] = useState('')
  const [precio, setPrecio] = useState('2.40')
  const [visibilidad, setVisibilidad] = useState<'pago' | 'suscriptores' | 'gratis'>('pago')
  const [avatar, setAvatar] = useState<File | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [avance, setAvance] = useState('')
  const [error, setError] = useState('')
  const [hechos, setHechos] = useState(0)

  const cambiar = (i: number, cambio: Partial<EnFila>) =>
    setFila(f => f.map((x, j) => j === i ? { ...x, ...cambio } : x))

  const publicar = async () => {
    const pendientes = fila
      .map((f, i) => ({ f, i }))
      .filter(({ f }) => f.estado !== 'listo' && f.titulo.trim())
    if (!pendientes.length || ocupado) return

    setOcupado(true); setError('')
    let ok = 0
    // De uno en uno y no en paralelo: son archivos grandes, y varias subidas
    // simultaneas se roban el ancho de banda entre ellas y acaban tardando
    // mas que en fila.
    for (const { f, i } of pendientes) {
      cambiar(i, { estado: 'subiendo', detalle: '' })
      const r = await publicarPara(
        { creadora: c.id, titulo: f.titulo, video: f.archivo, portada: null,
          descripcion: desc, precio: aCentavos(precio) ?? 0, visibilidad },
        (etapa, frac) => setAvance(
          `${f.titulo} · ` + (etapa === 'guardando' ? 'guardando'
            : etapa === 'portada' && frac === 0 ? 'sacando la portada'
            : `${etapa === 'video' ? 'video' : 'portada'} ${Math.round(frac * 100)}%`)),
      )
      if ('error' in r) {
        // Un fallo no detiene la fila: los demas videos no tienen la culpa.
        cambiar(i, { estado: 'error', detalle: r.error! })
      } else {
        cambiar(i, { estado: 'listo', detalle: '' })
        ok++
      }
    }
    setOcupado(false); setAvance('')
    setHechos(n => n + ok)
    const fallaron = fila.filter(f => f.estado === 'error').length
    if (fallaron) setError(`${fallaron} no se pudieron subir. Están marcados abajo.`)
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 20 }}>
        <span onClick={vuelve} style={{ cursor: 'pointer', font: `400 22px/1 ${FUENTE.ui}`,
          color: COLOR.textoSuave }}>‹</span>
        <div style={{
          width: 38, height: 38, borderRadius: '50%',
          border: `1px solid ${LINEA.suave}`,
          background: urlAvatar(c.avatar_path)
            ? `center/cover url(${urlAvatar(c.avatar_path)})`
            : `repeating-linear-gradient(130deg,${COLOR.superficieAlta} 0 5px,${COLOR.superficie} 5px 10px)`,
        }} />
        <div>
          <div style={{ font: `400 17px/1.2 ${FUENTE.ui}` }}>{c.nombre}</div>
          <div style={{ font: `400 11px/1.4 ${FUENTE.mono}`, color: COLOR.textoTenue }}>
            @{c.handle}
          </div>
        </div>
        <div style={{ flex: 1 }} />
        {hechos > 0 && (
          <Insignia texto={`${hechos} publicado${hechos > 1 ? 's' : ''} en esta sesión`}
            color={COLOR.dinero} />
        )}
      </div>

      {/* Foto de perfil: se puede cambiar desde aqui porque ella no puede
          entrar a su cuenta a ponersela. */}
      {!urlAvatar(c.avatar_path) && (
        <div style={{ marginBottom: 18, padding: '12px 14px', border: `1px solid ${LINEA.tenue}` }}>
          <div style={{ font: `400 12px/1.5 ${FUENTE.ui}`, color: COLOR.textoTenue,
            marginBottom: 10 }}>
            No tiene foto de perfil, y no puede ponérsela sola.
          </div>
          <input type="file" accept="image/jpeg,image/png,image/webp"
            onChange={async e => {
              const f = e.target.files?.[0]; e.target.value = ''
              if (!f) return
              setAvatar(f)
              const r = await fijarAvatar(c.id, f, c.avatar_path)
              if ('error' in r) { setError(r.error!); setAvatar(null) }
            }}
            style={{ font: `400 12px/1 ${FUENTE.ui}`, color: COLOR.textoSuave }} />
          {avatar && <span style={{ marginLeft: 10, color: COLOR.dinero,
            font: `400 12px/1 ${FUENTE.ui}` }}>listo</span>}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 22 }}>
        <div>
          {/* Elegir varios de una vez: subir diez videos escribiendo el titulo
              de cada uno por separado era lo que hacia el trabajo insoportable.
              El titulo se propone del nombre del archivo y se puede corregir. */}
          <div style={{ border: `1px dashed ${LINEA.marcada}`, padding: '18px 16px',
            textAlign: 'center' }}>
            <input type="file" multiple
              accept="video/mp4,video/quicktime,video/webm"
              onChange={e => {
                const nuevos = [...(e.target.files ?? [])].map(a => ({
                  archivo: a, titulo: tituloDesde(a.name),
                  estado: 'espera' as const, detalle: '',
                }))
                e.target.value = ''
                setFila(f => [...f, ...nuevos])
              }}
              style={{ font: `400 12px/1 ${FUENTE.ui}`, color: COLOR.textoSuave }} />
            <div style={{ marginTop: 9, font: `400 11px/1.5 ${FUENTE.ui}`,
              color: COLOR.textoApagado }}>
              Puedes elegir varios a la vez. MP4, MOV o WebM · hasta 2 GB cada uno.
              La portada se saca del propio video.
            </div>
          </div>

          {fila.length > 0 && (
            <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
              {fila.map((f, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px',
                  border: `1px solid ${
                    f.estado === 'listo' ? COLOR.dinero
                    : f.estado === 'error' ? '#FF4444'
                    : f.estado === 'subiendo' ? COLOR.admin : LINEA.tenue}`,
                }}>
                  <input value={f.titulo}
                    onChange={e => cambiar(i, { titulo: e.target.value.slice(0, 90) })}
                    disabled={f.estado === 'listo' || ocupado}
                    style={{
                      flex: 1, background: 'transparent', color: COLOR.texto,
                      border: 'none', outline: 'none',
                      font: `400 13px/1.3 ${FUENTE.ui}`,
                      opacity: f.estado === 'listo' ? .5 : 1,
                    }} />
                  <span style={{ font: `400 10px/1.4 ${FUENTE.mono}`,
                    color: COLOR.textoApagado, whiteSpace: 'nowrap' }}>
                    {(f.archivo.size / 1048576).toFixed(1)} MB
                  </span>
                  {f.estado === 'listo'    && <Insignia texto="publicado" color={COLOR.dinero} />}
                  {f.estado === 'subiendo' && <Insignia texto="subiendo" color={COLOR.admin} />}
                  {f.estado === 'error'    && <Insignia texto="falló" color="#FF4444" />}
                  {f.estado === 'espera' && !ocupado && (
                    <span onClick={() => setFila(x => x.filter((_, j) => j !== i))}
                      style={{ cursor: 'pointer', color: COLOR.textoApagado,
                        font: `400 17px/1 ${FUENTE.ui}`, padding: '0 3px' }}>×</span>
                  )}
                </div>
              ))}
              {fila.some(f => f.detalle) && (
                <div style={{ font: `400 11px/1.5 ${FUENTE.mono}`, color: '#FF4444' }}>
                  {fila.filter(f => f.detalle).map((f, i) => (
                    <div key={i}>{f.titulo}: {f.detalle}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ height: 18 }} />
          <Etiquetado texto="Descripción, igual para todos (opcional)" hijo={
            <Campo valor={desc} cambia={setDesc} marcador="De qué van" />
          } />
          <div style={{ height: 14 }} />
          <div style={{ display: 'flex', gap: 12 }}>
            <Etiquetado texto="Precio" hijo={
              <Campo valor={precio} cambia={setPrecio} mono marcador="2.40" />
            } />
            <Etiquetado texto="Visibilidad" hijo={
              <Selector valor={visibilidad} cambia={setVisibilidad} opciones={[
                { v: 'pago' as const, t: 'De pago' },
                { v: 'suscriptores' as const, t: 'Solo suscriptoras' },
                { v: 'gratis' as const, t: 'Gratis' },
              ]} />
            } />
          </div>
          <div style={{ marginTop: 7, font: `400 11px/1.5 ${FUENTE.ui}`,
            color: COLOR.textoApagado }}>
            El precio y la visibilidad se aplican a todos los de la fila. Se cambian
            después uno por uno si hace falta.
          </div>

          {error && (
            <div style={{ marginTop: 14, padding: '10px 13px', border: '1px solid #FF4444',
              color: '#FF4444', font: `400 12px/1.45 ${FUENTE.ui}` }}>{error}</div>
          )}

          <div style={{ marginTop: 18, display: 'flex', gap: 10, alignItems: 'center' }}>
            <Boton tono="primario"
              activo={fila.some(f => f.estado !== 'listo' && f.titulo.trim()) && !ocupado}
              al={publicar}>
              {avance || (() => {
                const n = fila.filter(f => f.estado !== 'listo' && f.titulo.trim()).length
                return n > 1 ? `Publicar los ${n}` : 'Publicar por ella'
              })()}
            </Boton>
            {fila.some(f => f.estado === 'listo') && !ocupado && (
              <Boton al={() => setFila(f => f.filter(x => x.estado !== 'listo'))}>
                Quitar los ya publicados
              </Boton>
            )}
          </div>
        </div>

        <div style={{ border: `1px solid ${LINEA.tenue}`, padding: 14, height: 'fit-content' }}>
          <div style={{ font: `700 9px/1 ${FUENTE.ui}`, letterSpacing: 1.3,
            textTransform: 'uppercase', color: COLOR.textoTenue, marginBottom: 10 }}>
            Queda registrado
          </div>
          <div style={{ font: `400 11px/1.6 ${FUENTE.ui}`, color: COLOR.textoTenue }}>
            El clip aparece como suyo y el dinero va a su saldo. En la bitácora queda
            anotado que lo subiste tú, con tu IP — la marca <b style={{ color: COLOR.texto }}>
            por_administración</b> en el detalle del evento.
          </div>
        </div>
      </div>
    </>
  )
}
