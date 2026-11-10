/* El panel «Gestionar» de un clip propio, dentro de «Tus clips» del Estudio.
 *
 * Cuatro secciones, cada una con su propio mensaje de error DENTRO del panel
 * (nunca detras de un modal, ni solo en la consola):
 *
 *   Datos y precio   titulo, descripcion, como se vende, precio y renta
 *   Portada          otro cuadro del video, o una imagen propia
 *   Fecha de retiro  la de siempre (`fijar_caducidad`), sin cambios
 *   Quitar           eliminar (sin historial) o dejar de venderlo ya (con historial)
 *
 * Todo cambio pasa por funciones de la base que validan que el clip sea suyo
 * (`src/lib/misclips.ts`): aqui no hay UPDATE directo y la pantalla no es la
 * que decide lo que se puede.
 *
 * QUE NO PROMETE: cambiar un precio o quitar la renta solo vale para compras
 * NUEVAS. Quien ya pago conserva lo que pago, y el panel lo dice.
 */
import { useEffect, useRef, useState } from 'react'
import { COLOR, LINEA, FUENTE } from '../lib/diseño'
import { usd, usdYPesos } from '../lib/dinero'
import { PRECIOS_VIDEO, PRECIO_INICIAL } from '../lib/precios'
import { subirPortada, urlPortada, urlVideoFirmada, type Visibilidad } from '../lib/clips'
import { portadaDe } from '../lib/portadas'
import {
  cuadrosDeUrl, achicar, prepararPortada, ANCHO_PUBLICO, type Cuadro,
} from '../lib/miniatura'
import { fijarCaducidad, type ModoCaducidad } from '../lib/canales'
import {
  editarMiClip, cambiarMiPortada, dejarDeVenderMiClip, miClipTieneHistorial,
  eliminarMiClip, yaCaduco, AVISO_EN_REVISION, type MiClip,
} from '../lib/misclips'
import { Pulsable } from './Pulsable'

const etiqueta: React.CSSProperties = {
  font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 1.8, textTransform: 'uppercase', color: COLOR.textoSuave,
}
const ayuda: React.CSSProperties = { font: `400 12px/1.5 ${FUENTE.ui}`, color: COLOR.textoSuave }
const MODOS: { v: Visibilidad; t: string }[] = [
  { v: 'pago', t: 'Por clip' },
  { v: 'suscriptores', t: 'Suscriptores' },
  { v: 'gratis', t: 'Gratis' },
]

type Hist = 'cargando' | { tiene: boolean } | { error: string }

export default function GestionarClip({ clip, uid, ahora, alCambiar, alEliminado, alCerrar }: {
  clip: MiClip
  uid: string
  /** La hora de la ultima lectura de la lista (no se lee el reloj al pintar). */
  ahora: number
  /** Algo cambio en el servidor: la lista se vuelve a leer. */
  alCambiar: () => void
  alEliminado: () => void
  alCerrar: () => void
}) {
  const esAlbum = clip.formato === 'album'

  return (
    <div style={{
      marginTop: 12, padding: '14px 14px 16px', borderRadius: 12, display: 'grid', gap: 22,
      border: `1px solid ${LINEA.fuerte}`, background: COLOR.fondo,
    }}>
      <Datos clip={clip} esAlbum={esAlbum} alCambiar={alCambiar} />
      {!esAlbum && <Portada clip={clip} uid={uid} alCambiar={alCambiar} />}
      <Retiro clip={clip} ahora={ahora} alCambiar={alCambiar} />
      <Quitar clip={clip} ahora={ahora} alCambiar={alCambiar} alEliminado={alEliminado} />
      <Pulsable al={alCerrar} style={{
        justifySelf: 'start', padding: '10px 0', cursor: 'pointer', font: `400 13px/1.4 ${FUENTE.ui}`,
        color: COLOR.textoSuave, textDecoration: 'underline', textUnderlineOffset: 4,
      }}>Cerrar</Pulsable>
    </div>
  )
}

/* ---------------------------------------------------------------- */

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section style={{ display: 'grid', gap: 12 }}>
      <h3 style={{ ...etiqueta, margin: 0, color: COLOR.texto }}>{titulo}</h3>
      {children}
    </section>
  )
}

function Mensaje({ texto, tipo }: { texto: string; tipo: 'error' | 'bien' }) {
  if (!texto) return null
  const c = tipo === 'bien' ? COLOR.dinero : COLOR.error
  return (
    <div role={tipo === 'error' ? 'alert' : 'status'} style={{
      padding: '10px 12px', borderRadius: 10, border: `1px solid ${c}`, color: c,
      font: `400 13px/1.45 ${FUENTE.ui}`,
    }}>{texto}</div>
  )
}

function BotonPrincipal({ al, activo = true, children }: {
  al: () => void; activo?: boolean; children: React.ReactNode
}) {
  return (
    <Pulsable al={al} activo={activo} className="boton-principal"
      style={{ width: '100%', fontSize: 12, opacity: activo ? 1 : .5 }}>{children}</Pulsable>
  )
}

function BotonContorno({ al, activo = true, peligro, children }: {
  al: () => void; activo?: boolean; peligro?: boolean; children: React.ReactNode
}) {
  return (
    <Pulsable al={al} activo={activo} style={{
      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
      minHeight: 48, padding: '0 14px', borderRadius: 12, cursor: activo ? 'pointer' : 'default',
      opacity: activo ? 1 : .5,
      border: `1px solid ${peligro ? COLOR.error : LINEA.fuerte}`,
      color: peligro ? COLOR.error : COLOR.textoSuave,
      font: `700 12px/1.2 ${FUENTE.ui}`, letterSpacing: 1.2, textTransform: 'uppercase',
    }}>{children}</Pulsable>
  )
}

/* ------------------------- Datos, precio y renta ------------------------- */

function Datos({ clip, esAlbum, alCambiar }: {
  clip: MiClip; esAlbum: boolean; alCambiar: () => void
}) {
  const [titulo, setTitulo] = useState(clip.title)
  const [desc, setDesc] = useState(clip.description ?? '')
  const [modo, setModo] = useState<Visibilidad>(clip.visibility)
  const [precio, setPrecio] = useState<number>(
    clip.visibility === 'pago' && clip.price_coins > 0 ? clip.price_coins : PRECIO_INICIAL)
  const [renta, setRenta] = useState(clip.renta_horas != null && clip.renta_coins != null)
  const [rentaHoras, setRentaHoras] = useState<48 | 72>(clip.renta_horas === 72 ? 72 : 48)
  const [rentaCoins, setRentaCoins] = useState(clip.renta_coins ?? 80)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [bien, setBien] = useState('')
  const enCurso = useRef(false)

  // Los tres precios de la plataforma, mas el que el clip ya tiene si es otro
  // (puesto a mano antes): no se le obliga a cambiarlo, pero tampoco se ofrece
  // como opcion nueva a quien no lo tiene.
  const opciones: number[] = [...PRECIOS_VIDEO]
  if (clip.visibility === 'pago' && clip.price_coins > 0 && !opciones.includes(clip.price_coins)) {
    opciones.unshift(clip.price_coins)
  }

  const rentaMal = modo === 'pago' && renta && (rentaCoins <= 0 || rentaCoins >= precio)
  const tituloMal = titulo.trim().length < 1 || titulo.trim().length > 90
  const puedeGuardar = !guardando && !tituloMal && !rentaMal

  const guardar = async () => {
    if (enCurso.current || !puedeGuardar) return
    enCurso.current = true; setGuardando(true); setError(''); setBien('')
    const m = await editarMiClip(clip.id, {
      titulo: titulo.trim(), descripcion: desc,
      venta: esAlbum ? undefined : {
        visibilidad: modo,
        precio: modo === 'pago' ? precio : 0,
        renta: modo === 'pago' && renta ? { horas: rentaHoras, coins: rentaCoins } : null,
      },
    })
    enCurso.current = false; setGuardando(false)
    if (m.error) { setError(m.error); return }
    // Si el cambio tocaba el contenido y la cuenta aun no es de confianza, el clip
    // volvio a moderacion: se dice, en lugar de «ya se ve así» (no es cierto).
    setBien(m.enRevision ? AVISO_EN_REVISION : 'Guardado. Ya se ve así en tu perfil.')
    alCambiar()
  }

  return (
    <Seccion titulo={esAlbum ? 'Datos' : 'Datos y precio'}>
      <div style={{ display: 'grid', gap: 8 }}>
        <label htmlFor={`t-${clip.id}`} style={etiqueta}>Título</label>
        <input id={`t-${clip.id}`} value={titulo} maxLength={90} className="campo-sobrio"
          onChange={e => setTitulo(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box', padding: '14px', font: `400 16px/1.3 ${FUENTE.ui}` }} />
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        <label htmlFor={`d-${clip.id}`} style={etiqueta}>Descripción</label>
        <textarea id={`d-${clip.id}`} value={desc} maxLength={600} rows={4} className="campo-sobrio"
          onChange={e => setDesc(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box', padding: '14px', resize: 'vertical',
            font: `400 16px/1.45 ${FUENTE.ui}` }} />
      </div>

      {esAlbum ? (
        <div style={ayuda}>
          El precio de un álbum lo fija la plataforma ({usd(clip.price_coins)}) y no se renta.
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gap: 8 }}>
            <span style={etiqueta}>Cómo se vende</span>
            <div role="group" aria-label="Cómo se vende" style={{ display: 'flex', gap: 8 }}>
              {MODOS.map(m => (
                <Pulsable key={m.v} al={() => setModo(m.v)} activado={modo === m.v} style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                  minHeight: 48, padding: '0 6px', cursor: 'pointer', borderRadius: 999,
                  font: `700 11px/1.2 ${FUENTE.ui}`, letterSpacing: 1.1, textTransform: 'uppercase',
                  background: modo === m.v ? COLOR.dinero : 'transparent',
                  color: modo === m.v ? COLOR.fondo : COLOR.textoSuave,
                  border: `1px solid ${modo === m.v ? COLOR.dinero : LINEA.fuerte}`,
                }}>{m.t}</Pulsable>
              ))}
            </div>
          </div>

          {modo === 'pago' && (
            <>
              <div style={{ display: 'grid', gap: 8 }}>
                <span style={etiqueta}>Precio</span>
                <div role="radiogroup" aria-label="Precio de venta" style={{ display: 'flex', gap: 8 }}>
                  {opciones.map(v => (
                    <Pulsable key={v} al={() => setPrecio(v)} activado={precio === v} rotulo={usd(v)} style={{
                      flex: 1, minHeight: 52, display: 'grid', placeItems: 'center', cursor: 'pointer', borderRadius: 12,
                      font: `700 20px/1 ${FUENTE.mono}`,
                      background: precio === v ? COLOR.dinero : 'transparent',
                      color: precio === v ? COLOR.fondo : COLOR.dinero,
                      border: `1px solid ${precio === v ? COLOR.dinero : LINEA.fuerte}`,
                    }}>{usd(v)}</Pulsable>
                  ))}
                </div>
                <div style={ayuda}>
                  plataforma 20% · <span style={{ color: COLOR.texto }}>tú recibes {usdYPesos(Math.round(precio * 0.8))}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                <Pulsable al={() => setRenta(v => !v)} activado={renta} style={{
                  boxSizing: 'border-box', width: '100%', textAlign: 'left', display: 'flex',
                  alignItems: 'center', justifyContent: 'space-between', gap: 14, cursor: 'pointer', minHeight: 48,
                }}>
                  <div>
                    <div style={{ ...etiqueta, color: renta ? COLOR.dinero : COLOR.textoSuave }}>También en renta</div>
                    <div style={{ ...ayuda, marginTop: 7 }}>Acceso por tiempo, más barato que comprarlo</div>
                  </div>
                  <div aria-hidden style={{
                    width: 48, height: 28, borderRadius: 14, flex: '0 0 auto', boxSizing: 'border-box',
                    background: renta ? COLOR.dinero : COLOR.superficieAlta, position: 'relative',
                    border: renta ? 'none' : '1px solid rgba(255,255,255,.2)',
                  }}>
                    <div style={{
                      position: 'absolute', top: renta ? 4 : 3, left: renta ? 24 : 3, width: 20, height: 20,
                      borderRadius: '50%', background: renta ? COLOR.fondo : COLOR.textoSuave,
                    }} />
                  </div>
                </Pulsable>

                {renta && (
                  <>
                    <div role="group" aria-label="Duración de la renta" style={{ display: 'flex', gap: 8 }}>
                      {([48, 72] as const).map(h => (
                        <Pulsable key={h} al={() => setRentaHoras(h)} activado={rentaHoras === h} style={{
                          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
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
                        <Paso t="−" rotulo="Bajar el precio de renta" al={() => setRentaCoins(p => Math.max(1, p - 25))} />
                        <span style={{ font: `700 22px/1 ${FUENTE.mono}`, color: COLOR.dinero, minWidth: 76, textAlign: 'center' }}>
                          {usd(rentaCoins)}
                        </span>
                        <Paso t="+" rotulo="Subir el precio de renta" al={() => setRentaCoins(p => p + 25)} />
                      </div>
                    </div>
                    {rentaMal && (
                      <div style={{ ...ayuda, color: COLOR.acento }}>
                        La renta tiene que costar menos que comprarlo ({usd(precio)}).
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
          {modo === 'gratis' && (
            <div style={ayuda}>Gratis: cualquiera lo ve completo. No lleva precio ni renta.</div>
          )}
          {modo === 'suscriptores' && (
            <div style={ayuda}>Solo lo ven tus suscriptoras. No lleva precio ni renta.</div>
          )}

          <div style={ayuda}>
            Los cambios aplican a compras nuevas. Quien ya compró o rentó conserva lo que pagó.
          </div>
        </>
      )}

      <Mensaje texto={error} tipo="error" />
      <Mensaje texto={bien} tipo="bien" />
      <BotonPrincipal al={guardar} activo={puedeGuardar}>{guardando ? 'Guardando…' : 'Guardar cambios'}</BotonPrincipal>
    </Seccion>
  )
}

function Paso({ t, rotulo, al }: { t: string; rotulo: string; al: () => void }) {
  return (
    <Pulsable al={al} rotulo={rotulo} style={{
      width: 44, height: 44, display: 'grid', placeItems: 'center', borderRadius: 12,
      border: '1px solid rgba(255,255,255,.28)', color: COLOR.texto,
      font: `400 22px/1 ${FUENTE.ui}`, cursor: 'pointer',
    }}>{t}</Pulsable>
  )
}

/* ------------------------------- Portada ------------------------------- */

function Portada({ clip, uid, alCambiar }: { clip: MiClip; uid: string; alCambiar: () => void }) {
  const [cuadros, setCuadros] = useState<Cuadro[]>([])
  const [elegido, setElegido] = useState<number | null>(null)
  const [imagen, setImagen] = useState<File | null>(null)
  const [vistaImagen, setVistaImagen] = useState<string | null>(null)
  const [sacando, setSacando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [bien, setBien] = useState('')
  const refArchivo = useRef<HTMLInputElement>(null)
  const enCurso = useRef(false)
  // Cada vista es un object URL: se revocan al cambiar de juego y al salir.
  const vistas = useRef<string[]>([])
  useEffect(() => () => { vistas.current.forEach(u => URL.revokeObjectURL(u)) }, [])

  const soltarVistas = () => { vistas.current.forEach(u => URL.revokeObjectURL(u)); vistas.current = [] }

  const sacarCuadros = async () => {
    setSacando(true); setError(''); setBien(''); setImagen(null); setVistaImagen(null)
    soltarVistas(); setCuadros([]); setElegido(null)
    const acceso = await urlVideoFirmada(clip.id)
    if (!('url' in acceso) || !acceso.url) {
      setSacando(false)
      setError('No pudimos abrir el video para sacar cuadros. Puedes subir una imagen.')
      return
    }
    const cs = await cuadrosDeUrl(acceso.url)
    setSacando(false)
    if (cs.length === 0) {
      setError('Este navegador no pudo leer el video para sacar cuadros. Puedes subir una imagen.')
      return
    }
    vistas.current = cs.map(c => c.vista)
    setCuadros(cs)
  }

  const elegirImagen = (f: File) => {
    soltarVistas(); setCuadros([]); setElegido(null); setError(''); setBien('')
    const u = URL.createObjectURL(f)
    vistas.current = [u]
    setImagen(f); setVistaImagen(u)
  }

  const hayEleccion = (elegido != null && cuadros[elegido]) || imagen
  const usar = async () => {
    if (enCurso.current || !hayEleccion) return
    enCurso.current = true; setGuardando(true); setError(''); setBien('')
    try {
      let nitida: File | null = null, chica: File | null = null
      if (imagen) {
        const p = await prepararPortada(imagen)
        if (p) { nitida = p.nitida; chica = p.chica }
      } else if (elegido != null) {
        nitida = cuadros[elegido].nitida
        chica = await achicar(nitida)
      }
      if (!nitida || !chica) { setError('No pudimos preparar esa imagen. Prueba con otra (JPG, PNG o WebP).'); return }

      // Primero las dos copias (la privada va antes: ver `subirPortada`) y
      // solo si las dos quedaron, el clip apunta a la nueva. La anterior no
      // se borra.
      const s = await subirPortada(uid, nitida, chica)
      if (s.error || !s.path) { setError(`No se pudo subir la portada: ${s.error ?? 'sin respuesta'}`); return }
      const m = await cambiarMiPortada(clip.id, s.path)
      if (m.error) { setError(m.error); return }
      setBien(m.enRevision ? AVISO_EN_REVISION : 'Portada cambiada.')
      soltarVistas(); setCuadros([]); setElegido(null); setImagen(null); setVistaImagen(null)
      alCambiar()
    } finally {
      enCurso.current = false; setGuardando(false)
    }
  }

  const actual = portadaDe(clip.id, urlPortada(clip.cover_path))
  return (
    <Seccion titulo="Portada">
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div role="img" aria-label="Portada actual" style={{
          flex: '0 0 auto', width: 58, height: 78, borderRadius: 8,
          background: `center/cover url("${actual}")`, border: `1px solid ${LINEA.fuerte}`,
        }} />
        <div style={ayuda}>
          {clip.visibility === 'gratis'
            ? 'Este clip es gratis: la portada se ve completa.'
            : `Sin pagar se ve una miniatura de ${ANCHO_PUBLICO} px. La nítida se guarda en privado.`}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {clip.tiene_video !== false && (
          <BotonContorno al={sacarCuadros} activo={!sacando && !guardando}>
            {sacando ? 'Sacando cuadros…' : 'Elegir otro cuadro del video'}
          </BotonContorno>
        )}
        <BotonContorno al={() => refArchivo.current?.click()} activo={!sacando && !guardando}>
          Subir una imagen
        </BotonContorno>
      </div>
      <input ref={refArchivo} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}
        aria-label="Subir una imagen como portada"
        onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) elegirImagen(f) }} />

      {cuadros.length > 0 && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '2px 2px 4px' }}>
          {cuadros.map((c, i) => (
            <Pulsable key={c.vista} al={() => setElegido(i)} activado={elegido === i}
              rotulo={`Usar el cuadro del segundo ${c.segundo.toFixed(1)}`} style={{
                flex: '0 0 auto', width: 58, height: 78, padding: 0, cursor: 'pointer', borderRadius: 8,
                overflow: 'hidden', background: `center/cover url("${c.vista}")`,
                border: `2px solid ${elegido === i ? COLOR.dinero : 'transparent'}`,
              }}>
              <span style={{
                display: 'block', marginTop: 58, background: 'rgba(14,21,32,.78)',
                font: `700 10px/18px ${FUENTE.mono}`, color: COLOR.texto,
              }}>{c.segundo.toFixed(1)}s</span>
            </Pulsable>
          ))}
        </div>
      )}
      {vistaImagen && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div role="img" aria-label="Imagen elegida" style={{
            flex: '0 0 auto', width: 58, height: 78, borderRadius: 8,
            background: `center/cover url("${vistaImagen}")`, border: `2px solid ${COLOR.dinero}`,
          }} />
          <div style={ayuda}>Esta imagen será tu nueva portada.</div>
        </div>
      )}

      <Mensaje texto={error} tipo="error" />
      <Mensaje texto={bien} tipo="bien" />
      {hayEleccion && (
        <BotonPrincipal al={usar} activo={!guardando}>{guardando ? 'Guardando portada…' : 'Usar como portada'}</BotonPrincipal>
      )}
    </Seccion>
  )
}

/* ---------------------------- Fecha de retiro ---------------------------- */
// Es el comportamiento de siempre: la creadora decide hasta cuando vive lo que
// subio, y si el retiro alcanza tambien a quien ya lo compro.

function Retiro({ clip, ahora, alCambiar }: { clip: MiClip; ahora: number; alCambiar: () => void }) {
  const [abierto, setAbierto] = useState(false)
  const [fecha, setFecha] = useState(clip.caduca_at ? clip.caduca_at.slice(0, 10) : '')
  const [modo, setModo] = useState<ModoCaducidad>((clip.caduca_modo as ModoCaducidad) ?? 'deja_de_venderse')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const enCurso = useRef(false)

  const guardar = async () => {
    if (enCurso.current) return
    enCurso.current = true; setGuardando(true); setError('')
    const m = await fijarCaducidad(clip.id, fecha ? new Date(fecha + 'T23:59:59').toISOString() : null, modo)
    enCurso.current = false; setGuardando(false)
    if (m) { setError(m); return }
    setAbierto(false); alCambiar()
  }

  const yaPaso = yaCaduco(clip.caduca_at, ahora)
  const rotulo = clip.caduca_at
    ? (yaPaso
        ? `Dejó de venderse el ${new Date(clip.caduca_at).toLocaleDateString('es-MX')}`
        : `Se retira el ${new Date(clip.caduca_at).toLocaleDateString('es-MX')}`)
    : 'Ponerle fecha de retiro'

  return (
    <Seccion titulo="Fecha de retiro">
      {abierto ? (
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={etiqueta}>Retirar el</div>
          <input type="date" value={fecha} className="campo-sobrio" aria-label="Fecha de retiro"
            min={new Date(ahora + 86400000).toISOString().slice(0, 10)}
            onChange={ev => setFecha(ev.target.value)}
            style={{ width: '100%', boxSizing: 'border-box', colorScheme: 'dark', padding: '12px 13px', font: `400 16px/1 ${FUENTE.ui}` }} />

          <Pulsable al={() => setModo(m => m === 'retiro_total' ? 'deja_de_venderse' : 'retiro_total')}
            activado={modo === 'retiro_total'} style={{
              boxSizing: 'border-box', width: '100%', textAlign: 'left', padding: '13px 14px', cursor: 'pointer',
              borderRadius: 12, border: `1px solid ${modo === 'retiro_total' ? COLOR.error : LINEA.media}`,
            }}>
            <div style={{ font: `700 14px/1.3 ${FUENTE.ui}`, color: modo === 'retiro_total' ? COLOR.error : COLOR.texto }}>
              {modo === 'retiro_total' ? 'Quitárselo también a quien lo compró' : 'Dejar de venderlo'}
            </div>
            <div style={{ marginTop: 6, ...ayuda }}>
              {modo === 'retiro_total'
                ? 'Nadie podrá verlo, ni quien ya pagó por él. Tienen derecho a que se les devuelva su dinero.'
                : 'Desaparece del catálogo y nadie más puede comprarlo. Quien ya lo compró lo conserva: eso fue lo que le vendiste.'}
            </div>
          </Pulsable>

          <div style={{ display: 'flex', gap: 8 }}>
            <Pulsable al={guardar} activo={!guardando} className="boton-principal"
              style={{ flex: 1, fontSize: 12 }}>
              {guardando ? 'Guardando…' : fecha ? 'Guardar' : 'Quitar la fecha'}
            </Pulsable>
            <BotonContorno al={() => { setAbierto(false); setError('') }}>Cancelar</BotonContorno>
          </div>
          <Mensaje texto={error} tipo="error" />
        </div>
      ) : (
        <Pulsable al={() => { setAbierto(true); setError('') }} style={{
          justifySelf: 'start', padding: '8px 0', font: `400 13px/1.45 ${FUENTE.ui}`, cursor: 'pointer',
          color: clip.caduca_at ? COLOR.aviso : COLOR.textoSuave,
          textDecoration: 'underline', textUnderlineOffset: 4,
        }}>{rotulo}</Pulsable>
      )}
    </Seccion>
  )
}

/* -------------------------------- Quitar -------------------------------- */

function Quitar({ clip, ahora, alCambiar, alEliminado }: {
  clip: MiClip; ahora: number; alCambiar: () => void; alEliminado: () => void
}) {
  const [hist, setHist] = useState<Hist>('cargando')
  const [intento, setIntento] = useState(0)
  const [confirmando, setConfirmando] = useState<'eliminar' | 'dejar' | null>(null)
  const [trabajando, setTrabajando] = useState(false)
  const [error, setError] = useState('')
  const [bien, setBien] = useState('')
  const enCurso = useRef(false)

  useEffect(() => {
    let vivo = true
    miClipTieneHistorial(clip.id).then(r => {
      if (!vivo) return
      setHist('error' in r ? { error: r.error } : { tiene: r.tiene })
    })
    return () => { vivo = false }
  }, [clip.id, intento])

  const ejecutar = async (que: 'eliminar' | 'dejar') => {
    if (enCurso.current) return
    enCurso.current = true; setTrabajando(true); setError(''); setBien('')
    const m = que === 'eliminar' ? await eliminarMiClip(clip.id) : await dejarDeVenderMiClip(clip.id)
    enCurso.current = false; setTrabajando(false)
    if (m) { setError(m); return }
    setConfirmando(null)
    if (que === 'eliminar') { alEliminado(); return }
    setBien('Listo: ya no se vende. Quien lo compró lo conserva.')
    alCambiar()
  }

  const detenido = yaCaduco(clip.caduca_at, ahora)
  const retiroTotal = clip.caduca_at != null && clip.caduca_modo === 'retiro_total'

  return (
    <Seccion titulo="Quitar">
      {hist === 'cargando' && <div style={ayuda}>Revisando qué se puede hacer con este clip…</div>}

      {typeof hist === 'object' && 'error' in hist && (
        <>
          <Mensaje texto={`No pudimos comprobar si este clip se puede eliminar. ${hist.error}`} tipo="error" />
          <div style={{ display: 'flex' }}>
            <BotonContorno al={() => { setHist('cargando'); setIntento(n => n + 1) }}>Reintentar</BotonContorno>
          </div>
        </>
      )}

      {typeof hist === 'object' && 'tiene' in hist && !hist.tiene && (
        confirmando === 'eliminar' ? (
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={{ font: `700 14px/1.4 ${FUENTE.ui}`, color: COLOR.error }}>
              Se borra para siempre. No se puede deshacer.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <BotonContorno peligro al={() => ejecutar('eliminar')} activo={!trabajando}>
                {trabajando ? 'Eliminando…' : 'Sí, eliminar'}
              </BotonContorno>
              <BotonContorno al={() => { setConfirmando(null); setError('') }} activo={!trabajando}>Cancelar</BotonContorno>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={ayuda}>Este clip no tiene compras, rentas ni reportes, así que se puede eliminar.</div>
            <div style={{ display: 'flex' }}>
              <BotonContorno peligro al={() => { setConfirmando('eliminar'); setError(''); setBien('') }}>Eliminar</BotonContorno>
            </div>
          </div>
        )
      )}

      {typeof hist === 'object' && 'tiene' in hist && hist.tiene && (
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={ayuda}>
            Este clip ya tiene compras, rentas o reportes, así que no se puede eliminar: es el registro de lo que
            se vendió.
          </div>
          {retiroTotal ? (
            <div style={ayuda}>
              Ya tiene un retiro total con fecha. Para cambiarlo o quitarlo usa «Fecha de retiro».
            </div>
          ) : detenido ? (
            <div style={ayuda}>
              Ya dejó de venderse. Quien lo compró lo conserva. Para quitárselo también a quien lo compró, usa
              «Fecha de retiro» y elige «Quitárselo también a quien lo compró».
            </div>
          ) : !clip.published ? (
            <div style={ayuda}>Todavía no está publicado, así que no se está vendiendo.</div>
          ) : confirmando === 'dejar' ? (
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ font: `700 14px/1.4 ${FUENTE.ui}`, color: COLOR.texto }}>
                Desaparece del catálogo y nadie más puede comprarlo. Quien ya lo compró lo conserva.
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <BotonContorno peligro al={() => ejecutar('dejar')} activo={!trabajando}>
                  {trabajando ? 'Un momento…' : 'Sí, dejar de venderlo'}
                </BotonContorno>
                <BotonContorno al={() => { setConfirmando(null); setError('') }} activo={!trabajando}>Cancelar</BotonContorno>
              </div>
            </div>
          ) : (
            <>
              <div style={ayuda}>
                «Dejar de venderlo ya» lo saca del catálogo ahora mismo: nadie más puede comprarlo ni rentarlo.
                Quien ya lo compró lo conserva. Para quitárselo también a quien lo compró, usa «Fecha de retiro»
                y elige «Quitárselo también a quien lo compró».
              </div>
              <div style={{ display: 'flex' }}>
                <BotonContorno peligro al={() => { setConfirmando('dejar'); setError(''); setBien('') }}>Dejar de venderlo ya</BotonContorno>
              </div>
            </>
          )}
        </div>
      )}

      <Mensaje texto={error} tipo="error" />
      <Mensaje texto={bien} tipo="bien" />
    </Seccion>
  )
}
