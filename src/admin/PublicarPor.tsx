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

function Formulario({ c, vuelve }: { c: CreadoraGestionable; vuelve: () => void }) {
  const [titulo, setTitulo] = useState('')
  const [desc, setDesc] = useState('')
  const [precio, setPrecio] = useState('240')
  const [visibilidad, setVisibilidad] = useState<'pago' | 'suscriptores' | 'gratis'>('pago')
  const [video, setVideo] = useState<File | null>(null)
  const [portada, setPortada] = useState<File | null>(null)
  const [avatar, setAvatar] = useState<File | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [avance, setAvance] = useState('')
  const [error, setError] = useState('')
  const [hechos, setHechos] = useState(0)

  const publicar = async () => {
    if (!video || !titulo.trim() || ocupado) return
    setOcupado(true); setError(''); setAvance('Preparando…')
    const r = await publicarPara(
      { creadora: c.id, titulo, video, portada, descripcion: desc,
        precio: parseInt(precio || '0', 10), visibilidad },
      (etapa, f) => setAvance(
        etapa === 'guardando' ? 'Guardando…'
          : etapa === 'portada' && f === 0 ? 'Sacando la portada del video…'
          : `Subiendo ${etapa === 'video' ? 'el video' : 'la portada'} · ${Math.round(f * 100)}%`),
    )
    setOcupado(false); setAvance('')
    if ('error' in r) { setError(r.error!); return }
    setHechos(n => n + 1)
    setTitulo(''); setDesc(''); setVideo(null); setPortada(null)
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
          <Etiquetado texto="Título" hijo={
            <Campo valor={titulo} cambia={setTitulo} marcador="Cómo se llama el clip" />
          } />
          <div style={{ height: 14 }} />
          <Etiquetado texto="Descripción (opcional)" hijo={
            <Campo valor={desc} cambia={setDesc} marcador="De qué va" />
          } />
          <div style={{ height: 14 }} />
          <div style={{ display: 'flex', gap: 12 }}>
            <Etiquetado texto="Precio en coins" hijo={
              <Campo tipo="number" valor={precio} cambia={setPrecio} mono />
            } />
            <Etiquetado texto="Visibilidad" hijo={
              <Selector valor={visibilidad} cambia={setVisibilidad} opciones={[
                { v: 'pago' as const, t: 'De pago' },
                { v: 'suscriptores' as const, t: 'Solo suscriptoras' },
                { v: 'gratis' as const, t: 'Gratis' },
              ]} />
            } />
          </div>

          <div style={{ marginTop: 18, display: 'grid', gap: 12 }}>
            <ArchivoCampo t="Video" f={video} pon={setVideo}
              acepta="video/mp4,video/quicktime,video/webm"
              nota="MP4, MOV o WebM · hasta 2 GB" />
            <ArchivoCampo t="Portada (opcional)" f={portada} pon={setPortada}
              acepta="image/jpeg,image/png,image/webp"
              nota="Si no pones una, se saca un cuadro del video" />
          </div>

          {error && (
            <div style={{ marginTop: 14, padding: '10px 13px', border: '1px solid #FF4444',
              color: '#FF4444', font: `400 12px/1.45 ${FUENTE.ui}` }}>{error}</div>
          )}

          <div style={{ marginTop: 18 }}>
            <Boton tono="primario" activo={!!video && !!titulo.trim() && !ocupado}
              al={publicar}>{avance || 'Publicar por ella'}</Boton>
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

function ArchivoCampo({ t, f, pon, acepta, nota }: {
  t: string; f: File | null; pon: (f: File | null) => void
  acepta: string; nota: string
}) {
  return (
    <div style={{ border: `1px solid ${f ? COLOR.dinero : LINEA.tenue}`, padding: '12px 14px' }}>
      <div style={{ font: `700 9px/1 ${FUENTE.ui}`, letterSpacing: 1.3,
        textTransform: 'uppercase', color: f ? COLOR.dinero : COLOR.textoTenue }}>{t}</div>
      <div style={{ marginTop: 8 }}>
        <input type="file" accept={acepta}
          onChange={e => {
            const x = e.target.files?.[0]
            // Se limpia para que reelegir el MISMO archivo vuelva a disparar
            // el evento; si no, tras un fallo el selector parece muerto.
            e.target.value = ''
            pon(x ?? null)
          }}
          style={{ font: `400 12px/1 ${FUENTE.ui}`, color: COLOR.textoSuave }} />
      </div>
      <div style={{ marginTop: 7, font: `400 10px/1.4 ${FUENTE.mono}`, color: COLOR.textoApagado }}>
        {f ? `${f.name} · ${(f.size / 1048576).toFixed(1)} MB` : nota}
      </div>
    </div>
  )
}
