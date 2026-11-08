// Pantalla 05 — Subir clip
// Reescrita: antes era el mock del deck con "hotel_bar_take04.mov" escrito a
// mano. Ahora sube de verdad al bucket privado y crea la fila en la base.
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSesion } from '../lib/sesion'
import { subirArchivo, subirPortada, crearClip, type Visibilidad } from '../lib/clips'
import {
  miniaturaDeVideo, tiraDeVideo, cuadrosDeVideo, achicar,
  ANCHO_PUBLICO, type Cuadro,
} from '../lib/miniatura'
import { COLOR, LINEA, FUENTE, RADIO } from '../lib/diseño'
import Icono from '../components/Iconos'
import MisClips from '../components/MisClips'
import { usd, usdYPesos } from '../lib/dinero'
import { useMoneda } from '../lib/moneda'
import Equivalente from '../components/Equivalente'
import { Pulsable, Enlace } from '../components/Pulsable'
import Centro from '../components/Centro'
import { perfilParaPublicar } from '../lib/trato'
import { configAlbumes } from '../lib/albumes'
import SelectorSubida from '../components/SelectorSubida'


/* Modo consumo: rotulos en `textoSuave` (eran textoTenue, 3.78:1, bajo AA) y
   campos de `.campo-sobrio`, con foco en cian y sin halo. */
const etiqueta: React.CSSProperties = {
  font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 2, textTransform: 'uppercase', color: COLOR.textoSuave,
}
const campo: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  font: `400 16px/1.3 ${FUENTE.ui}`, padding: '15px',
}
const ayuda: React.CSSProperties = { font: `400 12px/1.5 ${FUENTE.ui}`, color: COLOR.textoSuave }

const MODOS: { v: Visibilidad; t: string }[] = [
  { v: 'pago', t: 'Por clip' },
  { v: 'suscriptores', t: 'Suscriptores' },
  { v: 'gratis', t: 'Gratis' },
]

/** Precios de venta de un video: 10, 20 o 40 dolares, en CENTAVOS (como todo el
 *  libro). Son tres botones y no un monto libre a proposito: el valor inicial era
 *  2.40 y la mayoria de los videos se quedaron ahi, sin que nadie lo decidiera. El
 *  album tiene su propio precio fijo y su propia pantalla. */
const PRECIOS_VIDEO = [1000, 2000, 4000] as const
const PRECIO_INICIAL = 2000

export default function Upload() {
  const nav = useNavigate()
  const { sesion, perfil, trato, cargando, refrescarPerfil } = useSesion()
  useMoneda()
  const refVideo = useRef<HTMLInputElement>(null)
  const refPortada = useRef<HTMLInputElement>(null)

  // Si la identidad se aprobo mientras esta sesion seguia abierta, el perfil en
  // memoria sigue diciendo «sin verificar». Se vuelve a leer UNA vez al entrar.
  // ¿Se ofrecen los albumes de fotos? Solo si el interruptor del panel esta encendido.
  const [hayAlbumes, setHayAlbumes] = useState(false)
  useEffect(() => {
    if (!sesion) return
    let vivo = true
    configAlbumes().then(c => { if (vivo) setHayAlbumes(c.activos) })
    return () => { vivo = false }
  }, [sesion])

  const yaRefresco = useRef(false)
  useEffect(() => {
    if (yaRefresco.current || !perfil || perfil.identidad_verificada) return
    yaRefresco.current = true
    refrescarPerfil()
  }, [perfil, refrescarPerfil])

  const [video, setVideo] = useState<File | null>(null)
  const [portada, setPortada] = useState<File | null>(null)
  const [suya, setSuya] = useState<string | null>(null)   // vista de la portada propia
  const [cuadros, setCuadros] = useState<Cuadro[]>([])
  const [elegido, setElegido] = useState(0)
  const [sacando, setSacando] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [desc, setDesc] = useState('')
  const [modo, setModo] = useState<Visibilidad>('pago')
  const [precio, setPrecio] = useState<number>(PRECIO_INICIAL) // 20 USD
  const [renta, setRenta] = useState(false)
  const [rentaHoras, setRentaHoras] = useState<48 | 72>(48)
  const [rentaCoins, setRentaCoins] = useState(80) // 0.80 USD
  const [estado, setEstado] = useState<'listo' | 'subiendo' | 'error' | 'sin-portada'>('listo')
  const [detalle, setDetalle] = useState('')
  const [clipNuevo, setClipNuevo] = useState<string | null>(null)
  const [paso, setPaso] = useState('')

  // Los cuadros candidatos se sacan en cuanto hay video, no al publicar: asi
  // la creadora elige mientras escribe el titulo, y si el navegador no puede
  // con el formato se sabe ahora y no al final de una subida de 2 GB.
  useEffect(() => {
    if (!video) return
    let vivo = true
    const sueltos: Cuadro[] = []
    setSacando(true)
    cuadrosDeVideo(video).then(cs => {
      sueltos.push(...cs)
      if (!vivo) return
      setCuadros(cs)
      setElegido(Math.min(1, Math.max(0, cs.length - 1)))  // ni el primerisimo
      setSacando(false)
    })
    return () => {
      vivo = false
      // Cada vista es un object URL: sin revocarlos, cambiar de video seis
      // veces deja seis juegos de imagenes retenidos en memoria.
      for (const c of sueltos) URL.revokeObjectURL(c.vista)
      setCuadros([])
    }
  }, [video])

  // Lo mismo para la portada que sube ella a mano. Antes se llamaba a
  // createObjectURL dentro del render, que crea una URL nueva en cada pintada
  // y no revoca ninguna.
  useEffect(() => {
    if (!portada) { setSuya(null); return }
    const u = URL.createObjectURL(portada)
    setSuya(u)
    return () => URL.revokeObjectURL(u)
  }, [portada])

  if (cargando) return <Centro texto="Cargando…" />
  if (!sesion) return <Centro texto="Necesitas entrar para publicar." accion={{ texto: 'Entrar', al: () => nav('/acceso') }} />
  if (!perfil?.is_creator) return (
    <Centro
      texto={`Activa tu ${perfilParaPublicar(trato)} para poder publicar.`}
      accion={{ texto: 'Ir a mi perfil', al: () => nav('/perfil') }}
    />
  )
  // MisClips estaba DENTRO del componente local, asi que se pintaba en los
  // cuatro estados: tambien debajo de «Cargando…» y de «Necesitas entrar para
  // publicar», donde no hay sesion y por tanto no hay clips que listar. Se
  // queda solo aqui, que es el unico caso donde quien mira SI tiene clips y le
  // sirve verlos: su cuenta esta suspendida y quiere saber que pasa con ellos.
  if (perfil.suspended_at) return (
    <Centro texto="Tu cuenta está suspendida. Escríbenos si crees que es un error.">
      <MisClips />
    </Centro>
  )
  // Se bloquea ANTES del formulario. La politica de la base ya lo impide, pero
  // dejar llenar todo para rechazar al final seria cruel: se sube el video, se
  // espera, y hasta entonces el error.
  // NO se bloquea la pantalla a quien no esta verificada. La base ya la deja
  // subir —el clip nace pendiente y no se puede aprobar ni cobrar hasta que se
  // verifique— y cerrarle la puerta aqui la mandaba de vuelta sin haber hecho
  // nada. Quien se registra y se va no suele volver. Sube, y mientras tanto se
  // revisan sus documentos; si no cumple, se baja todo.

  // 'sin-portada' cuenta como no-listo: el clip YA se publico, y volver a
  // pulsar publicaria un duplicado con el mismo video.
  // Sin identidad verificada el servidor rechaza guardar el clip, asi que ni se
  // ofrece: subir un video grande para recibir un error al final no sirve.
  const verificada = !!perfil?.identidad_verificada
  const listo = verificada && !!video && titulo.trim().length > 0
    && estado !== 'subiendo' && estado !== 'sin-portada'
  const gana = modo === 'pago' ? Math.round(precio * 0.8) : 0

  const publicar = async () => {
    if (!listo || !video || !sesion) return
    setEstado('subiendo'); setDetalle('')

    // La portada: la que subio ella, el cuadro que eligio, o —si el navegador
    // no pudo decodificar el video— el automatico de siempre. Todo esto pasa
    // ANTES de subir el video: el archivo ya esta aqui, y si se hiciera
    // despues habria que esperar toda la subida para descubrir que el formato
    // no se puede leer.
    let nitida: File | null = portada ?? cuadros[elegido]?.nitida ?? null
    if (!nitida) {
      setPaso('Sacando la portada del video…')
      nitida = await miniaturaDeVideo(video)
    }

    // La copia publica se achica AQUI, antes de que la grande salga de esta
    // maquina. Pedirle la reduccion al servidor obligaria a subir primero la
    // grande al bucket publico, que es justo el agujero que esto cierra.
    setPaso('Preparando la portada…')
    const chica = nitida ? await achicar(nitida) : null

    // La tira de seis cuadros solo tiene sentido en los clips GRATIS, donde
    // enseñar vende. En uno de pago era regalar seis fotogramas del contenido
    // a cualquiera que pasara el mouse — por 183 clips, unos 1.098 cuadros.
    const tira = modo === 'gratis' ? await tiraDeVideo(video) : null

    setPaso('Subiendo el video…')
    const v = await subirArchivo('clips', sesion.user.id, video)
    if (v.error) { setEstado('error'); setDetalle(v.error); return }

    let coverPath: string | null = null
    let falloPortada: string | null = null
    if (nitida && chica) {
      setPaso('Subiendo la portada…')
      // Las dos copias, misma ruta: la chica al bucket publico y la nitida al
      // privado. Que falle NO tumba la publicacion —perder el video ya subido
      // por una imagen seria mucho peor— pero SI se dice. Antes se ponia
      // `null` en silencio: el clip aparecia sin portada y nadie sabia por
      // que, ni que se podia reintentar.
      const c = await subirPortada(sesion.user.id, nitida, chica)
      if (c.error) falloPortada = c.error
      coverPath = c.path ?? null
    } else if (video) {
      falloPortada = 'No pude sacar un cuadro de este video.'
    }

    let previewPath: string | null = null
    if (tira) {
      const t = await subirArchivo('clip-covers', sesion.user.id, tira)
      previewPath = t.error ? null : (t.path ?? null)
    }

    setPaso('Publicando…')
    const r = await crearClip({
      creator_id: sesion.user.id,
      title: titulo.trim(),
      description: desc.trim() || null,
      storage_path: v.path ?? null,
      cover_path: coverPath,
      visibility: modo,
      price_coins: modo === 'pago' ? precio : 0,
      renta_horas: modo === 'pago' && renta ? rentaHoras : null,
      renta_coins: modo === 'pago' && renta ? rentaCoins : null,
      preview_path: previewPath,
      published: true,
    })
    if (r.error) {
      setEstado('error')
      // El servidor responde con un texto de permisos que no explica nada.
      setDetalle(/row-level security|pol[ií]tica de seguridad/i.test(r.error)
        ? `Tu cuenta todavía no puede publicar. Revisa que tu identidad esté verificada y que tu ${perfilParaPublicar(trato)} esté activo.`
        : r.error)
      return
    }

    // NO se asigna avatar aqui. Antes, sin foto de perfil, un cuadro del video se
    // subia al bucket publico `avatars` y pasaba a ser la foto de perfil ANTES de
    // que administracion moderara el clip, y la heuristica no sabe si el cuadro es
    // explicito. Ahora se queda la inicial; el relleno es manual, con revision
    // humana, en Herramientas -> avatares faltantes.

    // El clip SI se publico. Si la portada se quedo fuera no se navega: se
    // dice, con el clip ya a salvo y una liga para ir a verlo. Irse en
    // silencio dejaria a la creadora descubriendolo sola en el catalogo.
    if (falloPortada) { setEstado('sin-portada'); setDetalle(falloPortada); setClipNuevo(r.id ?? null); return }

    nav(`/clip/${r.id}`)
  }

  return (
    <div style={{
      minHeight: '100%', boxSizing: 'border-box', padding: '20px 18px 40px',
      background: COLOR.fondo, color: COLOR.texto, fontFamily: FUENTE.ui,
      display: 'flex', flexDirection: 'column', gap: 18,
      width: '100%', maxWidth: 680, margin: '0 auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pulsable al={() => nav(-1)} rotulo="Volver" style={{
          width: 44, height: 44, borderRadius: '50%', display: 'grid', placeItems: 'center',
          border: '1px solid rgba(255,255,255,.22)', color: COLOR.texto, cursor: 'pointer',
        }}><span aria-hidden style={{ font: `400 22px/1 ${FUENTE.ui}` }}>&#8249;</span></Pulsable>
        <h1 style={{ ...etiqueta, margin: 0, color: COLOR.dinero }}>Nuevo clip</h1>
        <span aria-hidden style={{ width: 44 }} />
      </div>

      {!perfil.identidad_verificada && (
        <div style={{ padding: '15px 16px', borderRadius: RADIO.neon, border: `1px solid ${COLOR.admin}` }}>
          <div style={{ font: `400 14px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
            Para subir y publicar, primero tenemos que{' '}
            <b style={{ color: COLOR.texto }}>verificar tu identidad y tu edad</b>.
            Cuando la aprobemos, este formulario se activa.
          </div>
          <Enlace a="/verificar" className="boton-principal" style={{ marginTop: 14 }}>
            Verificar mi identidad
          </Enlace>
        </div>
      )}

      {hayAlbumes && <SelectorSubida actual="video" />}

      {/* video */}
      <Pulsable al={() => refVideo.current?.click()} style={{
        boxSizing: 'border-box', width: '100%',
        padding: '26px 18px', textAlign: 'center', cursor: 'pointer', borderRadius: RADIO.neon,
        border: `1.5px dashed ${video ? 'rgba(200,255,61,.6)' : LINEA.marcada}`,
        background: video ? 'rgba(200,255,61,.05)' : 'transparent',
      }}>
        <span aria-hidden style={{ display: 'grid', placeItems: 'center', color: video ? COLOR.dinero : COLOR.textoSuave, marginBottom: 10 }}>
          <Icono nombre="subir" tam={28} />
        </span>
        <div style={{ ...etiqueta, color: video ? COLOR.dinero : COLOR.textoSuave }}>
          {video ? 'Video listo' : 'Elegir video'}
        </div>
        <div style={{ font: `400 16px/1.4 ${FUENTE.ui}`, color: COLOR.textoSuave, marginTop: 9, wordBreak: 'break-all' }}>
          {video ? `${video.name} · ${(video.size / 1048576).toFixed(1)} MB` : 'MP4, MOV o WebM · hasta 2 GB'}
        </div>
      </Pulsable>
      <input ref={refVideo} type="file" accept="video/mp4,video/quicktime,video/webm" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) setVideo(f) }} />

      {/* portada */}
      <div className="tarjeta-sobria" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={etiqueta}>Portada</div>
          <div style={{ ...ayuda, marginTop: 8 }}>
            {modo === 'gratis'
              ? 'Se ve completa: este clip es gratis.'
              : `Sin pagar se ve una miniatura de ${ANCHO_PUBLICO} px. La nítida se guarda en privado.`}
          </div>
        </div>

        {!video && (
          <div style={ayuda}>Elige el video y te enseño los cuadros.</div>
        )}
        {video && sacando && (
          <div style={ayuda}>Sacando cuadros del video…</div>
        )}

        {/* Los cuadros a elegir. Antes la portada la decidia una constante —el
            10% del video— y nadie podia cambiarla. */}
        {cuadros.length > 0 && !portada && (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '2px 2px 4px' }}>
            {cuadros.map((c, i) => (
              <Pulsable
                key={c.vista}
                al={() => setElegido(i)}
                activado={elegido === i}
                rotulo={`Usar el cuadro del segundo ${c.segundo.toFixed(1)}`}
                style={{
                  flex: '0 0 auto', width: 58, height: 78, padding: 0, cursor: 'pointer', borderRadius: 8,
                  overflow: 'hidden',
                  background: `center/cover url(${c.vista})`,
                  border: `2px solid ${elegido === i ? COLOR.dinero : 'transparent'}`,
                  outlineOffset: 3,
                }}
              ><span style={{
                display: 'block', marginTop: 58, background: 'rgba(8,8,10,.78)',
                font: `700 10px/18px ${FUENTE.mono}`, color: COLOR.texto,
              }}>{c.segundo.toFixed(1)}s</span></Pulsable>
            ))}
          </div>
        )}

        {/* La suya, si la sube, gana sobre cualquier cuadro. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          {suya && <div style={{
            width: 58, height: 78, flex: '0 0 auto', borderRadius: 8,
            background: `center/cover url(${suya})`,
            border: `2px solid ${COLOR.dinero}`,
          }} />}
          <Pulsable al={() => refPortada.current?.click()} style={{
            flex: 1, textAlign: 'left', cursor: 'pointer', minHeight: 48, display: 'flex', alignItems: 'center',
            font: `700 12px/1.2 ${FUENTE.ui}`, letterSpacing: 1.3, textTransform: 'uppercase',
            color: COLOR.textoSuave, border: `1px solid ${LINEA.fuerte}`, padding: '0 14px', borderRadius: 12,
          }}>{portada ? 'Cambiar mi imagen' : 'O subir mi propia imagen'}</Pulsable>
          {portada && (
            <Pulsable al={() => setPortada(null)} rotulo="Quitar mi imagen y volver a los cuadros" style={{
              flex: '0 0 auto', width: 48, height: 48, display: 'grid', placeItems: 'center', cursor: 'pointer',
              font: `400 20px/1 ${FUENTE.ui}`, color: COLOR.textoSuave, borderRadius: 12,
              border: `1px solid ${LINEA.fuerte}`,
            }}>×</Pulsable>
          )}
        </div>
      </div>
      <input ref={refPortada} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) setPortada(f) }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label htmlFor="clip-titulo" style={etiqueta}>Título</label>
        <input id="clip-titulo" value={titulo} onChange={e => setTitulo(e.target.value)} maxLength={90}
          className="campo-sobrio" placeholder="Cómo se llama este clip" style={campo} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label htmlFor="clip-desc" style={etiqueta}>Descripción</label>
        <textarea id="clip-desc" value={desc} onChange={e => setDesc(e.target.value)} rows={3} maxLength={600}
          className="campo-sobrio"
          placeholder="Qué van a ver" style={{ ...campo, resize: 'vertical', fontFamily: FUENTE.ui }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span style={etiqueta}>Cómo se vende</span>
        <div role="group" aria-label="Cómo se vende" style={{ display: 'flex', gap: 8 }}>
          {MODOS.map(m => (
            <Pulsable key={m.v} al={() => setModo(m.v)} activado={modo === m.v} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
              minHeight: 48, padding: '0 6px', cursor: 'pointer', borderRadius: 999,
              font: `700 11px/1.2 ${FUENTE.ui}`, letterSpacing: 1.2, textTransform: 'uppercase',
              background: modo === m.v ? COLOR.dinero : 'transparent',
              color: modo === m.v ? COLOR.fondo : COLOR.textoSuave,
              border: `1px solid ${modo === m.v ? COLOR.dinero : LINEA.fuerte}`,
            }}>{m.t}</Pulsable>
          ))}
        </div>
      </div>

      {modo === 'pago' && (
        <div className="tarjeta-sobria" style={{ padding: 16 }}>
          <div style={etiqueta}>Precio</div>
          <div role="radiogroup" aria-label="Precio de venta" style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            {PRECIOS_VIDEO.map(v => (
              <Pulsable key={v} al={() => setPrecio(v)} activado={precio === v} rotulo={usd(v)} style={{
                flex: 1, minHeight: 56, display: 'grid', placeItems: 'center', cursor: 'pointer', borderRadius: 12,
                font: `700 22px/1 ${FUENTE.mono}`,
                background: precio === v ? COLOR.dinero : 'transparent',
                color: precio === v ? COLOR.fondo : COLOR.dinero,
                border: `1px solid ${precio === v ? COLOR.dinero : LINEA.fuerte}`,
              }}>{usd(v)}</Pulsable>
            ))}
          </div>
          <Equivalente centavos={precio} estilo={{ textAlign: 'right', marginTop: 6 }} />
          <div style={{ ...ayuda, marginTop: 14, borderTop: '1px solid rgba(255,255,255,.1)', paddingTop: 14 }}>
            plataforma 20% · <span style={{ color: COLOR.texto }}>tú recibes {usdYPesos(gana)}</span>
          </div>
        </div>
      )}

      {modo === 'pago' && (
        <div className="tarjeta-sobria" style={{ padding: 16 }}>
          <Pulsable
            al={() => setRenta(v => !v)}
            activado={renta}
            style={{ boxSizing: 'border-box', width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, cursor: 'pointer', minHeight: 48 }}>
            <div>
              <div style={{ ...etiqueta, color: renta ? COLOR.dinero : COLOR.textoSuave }}>También en renta</div>
              <div style={{ ...ayuda, marginTop: 7 }}>
                Acceso por tiempo, más barato que comprarlo
              </div>
            </div>
            <div aria-hidden style={{
              width: 48, height: 28, borderRadius: 14, flex: '0 0 auto', boxSizing: 'border-box',
              background: renta ? COLOR.dinero : COLOR.superficieAlta, position: 'relative', transition: 'background .18s',
              border: renta ? 'none' : '1px solid rgba(255,255,255,.2)',
            }}>
              <div style={{
                position: 'absolute', top: renta ? 4 : 3, left: renta ? 24 : 3, width: 20, height: 20,
                borderRadius: '50%', background: renta ? COLOR.fondo : COLOR.textoSuave, transition: 'left .18s',
              }} />
            </div>
          </Pulsable>

          {renta && (
            <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,.1)', paddingTop: 16 }}>
              <div role="group" aria-label="Duración de la renta" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {([48, 72] as const).map(h => (
                  <Pulsable key={h} al={() => setRentaHoras(h)} activado={rentaHoras === h} style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                    minHeight: 48, padding: '0 6px', cursor: 'pointer', borderRadius: 999,
                    font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 1.2, textTransform: 'uppercase',
                    background: rentaHoras === h ? COLOR.dinero : 'transparent',
                    color: rentaHoras === h ? COLOR.fondo : COLOR.textoSuave,
                    border: `1px solid ${rentaHoras === h ? COLOR.dinero : LINEA.fuerte}`,
                  }}>{h} horas</Pulsable>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
                <span style={etiqueta}>Precio de renta</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Paso t="−" al={() => setRentaCoins(p => Math.max(0, p - 25))} />
                  <span style={{ font: `700 24px/1 ${FUENTE.mono}`, color: COLOR.dinero, minWidth: 80, textAlign: 'center' }}>{usd(rentaCoins)}</span>
                  <Paso t="+" al={() => setRentaCoins(p => p + 25)} />
                </div>
              </div>
              {rentaCoins >= precio && (
                <div style={{ ...ayuda, color: '#FF7BE6', marginTop: 12 }}>
                  Rentar cuesta igual o más que comprarlo. Nadie elegiría la renta.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {estado === 'error' && (
        <div role="alert" style={{ font: `400 14px/1.45 ${FUENTE.ui}`, color: '#FF7BE6' }}>{detalle}</div>
      )}

      {estado === 'sin-portada' && (
        <div style={{ borderRadius: RADIO.neon, border: `1px solid ${COLOR.admin}`, padding: '15px 16px' }}>
          <div style={{ font: `400 14px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
            <b style={{ color: COLOR.texto }}>Tu clip se publicó</b> — el video está
            a salvo. Lo que no se pudo guardar fue la portada: se muestra con el
            patrón generado hasta que la pongas.
          </div>
          <div style={{ ...ayuda, marginTop: 8 }}>{detalle}</div>
          {clipNuevo && (
            <Enlace a={`/clip/${clipNuevo}`} className="boton-principal" style={{ marginTop: 14 }}>
              Ver mi clip
            </Enlace>
          )}
        </div>
      )}

      <Pulsable al={publicar} activo={listo} className="boton-principal"
        style={{ width: '100%', marginTop: 'auto' }}>
        {estado === 'subiendo' ? paso : 'Publicar'}
      </Pulsable>
    </div>
  )
}

function Paso({ t, al }: { t: string; al: () => void }) {
  return (
    <Pulsable al={al} rotulo={t === '+' ? 'Subir' : 'Bajar'} style={{
      width: 44, height: 44, display: 'grid', placeItems: 'center', borderRadius: 12,
      border: '1px solid rgba(255,255,255,.28)', color: COLOR.texto,
      font: `400 22px/1 ${FUENTE.ui}`, cursor: 'pointer',
    }}>{t}</Pulsable>
  )
}
