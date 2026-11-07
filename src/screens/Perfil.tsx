// Pantalla 13 — Ajustes de cuenta
//
// Se llamaba «Mi perfil» y era la pestaña «Yo» de la barra. Pero no es un
// perfil: es un formulario de ajustes —nombre, foto, contacto, si publicas,
// paises bloqueados, cerrar sesion—. Omar lo dijo asi: cuando abres una cuenta
// en cualquier sitio, la posibilidad de cambiarte el nombre no te sigue por
// toda la aplicacion.
//
// Ahora la pestaña «Yo» es `/yo`, que muestra el perfil de verdad —foto,
// nombre, @handle, bio, tus clips—, y desde ahi un boton «Ajustes de cuenta»
// trae aqui. El nombre de esta pantalla dice lo que es.
// Edicion del propio perfil. Es la pieza que le da dueño a todo lo demas:
// sin un perfil real, ningun clip, compra ni mensaje tiene a quien colgarse.
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSesion } from '../lib/sesion'
import { subirAvatar, urlAvatar } from '../lib/perfiles'
import Avatar from '../components/Avatar'
import PaisesBloqueados from '../components/PaisesBloqueados'
import { usePapel } from '../components/Navegacion'
import { ATAJOS_PERFIL, visiblesPara } from '../lib/rutas'
import { miTelefono, guardarTelefono, limpiarTelefono } from '../lib/contacto'
import Telefono, { valorValido, pistaDe } from '../components/Telefono'
import { COLOR, FUENTE, RADIO } from '../lib/diseño'
import Icono from '../components/Iconos'
import ElegirTrato from '../components/ElegirTrato'
import { perfilParaPublicar } from '../lib/trato'
import { Pulsable, Enlace } from '../components/Pulsable'


/* Modo consumo: los rotulos y los textos de ayuda van en `textoSuave`. Eran
   `textoTenue` y `textoApagado` (3.78:1 y 2.97:1), que no llegan a AA, y esta es
   la pantalla donde se lee lo que pide cada dato. */
const etiqueta: React.CSSProperties = {
  font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 2, textTransform: 'uppercase', color: COLOR.textoSuave,
}
// El borde, el fondo y el foco salen de `.campo-sobrio` (index.css).
const campo: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  font: `400 16px/1.3 ${FUENTE.ui}`, padding: '15px',
}

export default function Perfil() {
  const nav = useNavigate()
  const { sesion, perfil, trato, cambiarTrato, cargando, refrescarPerfil, salir } = useSesion()
  const [guardandoTrato, setGuardandoTrato] = useState(false)
  const [errorTrato, setErrorTrato] = useState('')
  const archivo = useRef<HTMLInputElement>(null)
  const { papel } = usePapel()

  const [handle, setHandle] = useState('')
  const [nombre, setNombre] = useState('')
  const [bio, setBio] = useState('')
  const [creadora, setCreadora] = useState(false)
  const [paises, setPaises] = useState<string[]>([])
  const [estado, setEstado] = useState<'listo' | 'guardando' | 'guardado' | 'error'>('listo')
  const [detalle, setDetalle] = useState('')
  const [subiendo, setSubiendo] = useState(false)
  // El telefono vive en otra tabla, asi que se carga y se guarda aparte del
  // resto del perfil, pero cuenta igual para la barra de guardar.
  const [telefono, setTelefono] = useState('')
  const [telGuardado, setTelGuardado] = useState('')

  useEffect(() => {
    if (!perfil) return
    setHandle(perfil.handle)
    setNombre(perfil.display_name)
    setBio(perfil.bio ?? '')
    setCreadora(perfil.is_creator)
    setPaises(perfil.paises_bloqueados ?? [])
  }, [perfil])

  useEffect(() => {
    if (!sesion) return
    let vivo = true
    // Si la lectura falla NO se pinta cadena vacia: el campo quedaria en
    // blanco y, al guardar, borraria el telefono que si estaba guardado.
    miTelefono().then(r => {
      if (!vivo || r.fallo) return
      setTelefono(r.datos); setTelGuardado(r.datos)
    })
    return () => { vivo = false }
  }, [sesion])

  if (cargando) return <Aviso texto="Cargando…" />
  if (!sesion) return (
    <Aviso
      texto="Necesitas entrar para ver tu perfil."
      accion={{ texto: 'Entrar', al: () => nav('/acceso') }}
    />
  )

  // Hay cambios sin guardar? De esto depende que aparezca la barra de guardar.
  // Los paises se comparan ordenados: el componente los devuelve en el orden en
  // que se tocaron, y sin ordenar, abrir y cerrar la lista marcaba la pantalla
  // como sucia sin que nadie hubiera cambiado nada.
  const mismos = (a: string[], b: string[]) =>
    a.length === b.length && [...a].sort().every((v, i) => v === [...b].sort()[i])
  const sucio = !!perfil && (
    handle !== perfil.handle ||
    nombre !== perfil.display_name ||
    bio !== (perfil.bio ?? '') ||
    creadora !== perfil.is_creator ||
    !mismos(paises, perfil.paises_bloqueados ?? [])
  ) || limpiarTelefono(telefono) !== telGuardado

  const handleOk = /^[a-z0-9_]{3,24}$/.test(handle)
  const nombreOk = nombre.trim().length >= 1 && nombre.trim().length <= 40
  const bioOk = bio.length <= 300
  const telOk = !telefono.trim() || valorValido(telefono)
  const puedeGuardar = handleOk && nombreOk && bioOk && telOk && estado !== 'guardando'

  const guardar = async () => {
    if (!puedeGuardar || !sesion) return
    setEstado('guardando')
    const { error } = await supabase.from('profiles').update({
      handle: handle.trim().toLowerCase(),
      display_name: nombre.trim(),
      bio: bio.trim() || null,
      is_creator: creadora,
      paises_bloqueados: paises,
    }).eq('id', sesion.user.id)

    if (error) {
      setEstado('error')
      // 23505 es violacion de unicidad; el unico campo unico aqui es el handle.
      setDetalle(error.code === '23505'
        ? 'Ese nombre de usuario ya está tomado. Prueba otro.'
        : error.message)
      return
    }
    if (limpiarTelefono(telefono) !== telGuardado) {
      const m = await guardarTelefono(sesion.user.id, telefono)
      if (m) { setEstado('error'); setDetalle(m); return }
      setTelGuardado(limpiarTelefono(telefono))
    }

    await refrescarPerfil()
    setEstado('guardado')
    setTimeout(() => setEstado('listo'), 2200)
  }

  const subirFoto = async (f: File) => {
    if (!sesion) return
    setSubiendo(true)
    // La ruta empieza con el id porque las politicas de storage se apoyan en
    // eso, y lleva un identificador nuevo en cada subida para que la URL
    // publica cambie: con la ruta fija, la foto vieja se quedaba cacheada.
    const r = await subirAvatar(sesion.user.id, f, perfil?.avatar_path)
    if ('error' in r) {
      setEstado('error'); setDetalle(r.error!); setSubiendo(false); return
    }
    await supabase.from('profiles').update({ avatar_path: r.ruta }).eq('id', sesion.user.id)
    await refrescarPerfil()
    setSubiendo(false)
  }

  const foto = perfil?.avatar_path ? urlAvatar(perfil.avatar_path) : null
  const atajos = visiblesPara(ATAJOS_PERFIL, papel)

  return (
    <div style={{
      minHeight: '100%', boxSizing: 'border-box',
      padding: `20px 18px ${sucio || estado !== 'listo' ? 130 : 44}px`,
      background: COLOR.fondo, color: COLOR.texto, fontFamily: FUENTE.ui,
      display: 'flex', flexDirection: 'column',
      // Un formulario a mil pixeles de ancho no se llena: el ojo pierde la
      // relacion entre la etiqueta y su campo. En el telefono no se nota
      // porque no hay de otra; en pantalla ancha si.
      width: '100%', maxWidth: 680, margin: '0 auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <Pulsable al={() => nav(-1)} rotulo="Volver" style={{
          width: 44, height: 44, borderRadius: '50%', display: 'grid', placeItems: 'center',
          border: '1px solid rgba(255,255,255,.22)', color: COLOR.texto, cursor: 'pointer',
        }}><span aria-hidden style={{ font: `400 22px/1 ${FUENTE.ui}` }}>&#8249;</span></Pulsable>
        <h1 style={{ ...etiqueta, margin: 0, color: COLOR.dinero }}>Ajustes de cuenta</h1>
        <span aria-hidden style={{ width: 44 }} />
      </div>

      {/* ---------- Lo que ve el público ---------- */}
      <Seccion primera titulo="Tu perfil público"
        nota="Es lo único que ve quien entra a tu página. Tu nombre legal no aparece en ninguna pantalla.">

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Pulsable
            al={() => archivo.current?.click()}
            rotulo={foto ? 'Cambiar foto de perfil' : 'Subir foto de perfil'}
            style={{ flex: '0 0 auto', cursor: 'pointer', borderRadius: '50%', display: 'grid' }}>
            <Avatar ruta={perfil?.avatar_path} nombre={nombre} handle={perfil?.handle} tam={84}
              style={{ border: `2px solid ${COLOR.acento}` }} />
          </Pulsable>
          <div style={{ minWidth: 0 }}>
            <Pulsable al={() => archivo.current?.click()} style={{
              display: 'inline-flex', alignItems: 'center', minHeight: 44, padding: '0 16px', borderRadius: 12,
              border: '1px solid rgba(255,255,255,.28)', color: COLOR.texto,
              font: `700 12px/1 ${FUENTE.ui}`, letterSpacing: 1.4,
              textTransform: 'uppercase', cursor: 'pointer',
            }}>
              {subiendo ? 'Subiendo…' : foto ? 'Cambiar foto' : 'Subir foto'}
            </Pulsable>
            <div style={{ font: `400 12px/1.45 ${FUENTE.ui}`, color: COLOR.textoSuave, marginTop: 8 }}>
              JPG, PNG o WebP · máximo 2 MB
            </div>
          </div>
          <input
            ref={archivo} type="file" accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) subirFoto(f) }}
          />
        </div>

        <Campo etiquetaTexto="Nombre artístico"
          pie="Como quieres que te vean. Se puede cambiar cuando quieras.">
          <input value={nombre} onChange={e => setNombre(e.target.value)} className="campo-sobrio"
            placeholder="Como quieres que te vean" maxLength={40} style={campo} />
        </Campo>

        <Campo etiquetaTexto="Usuario"
          pie={handleOk || !handle
            ? 'Entre 3 y 24 caracteres: letras, números y guion bajo.'
            : 'Necesita entre 3 y 24 caracteres.'}
          pieColor={handleOk || !handle ? undefined : '#FF7BE6'}>
          <div style={{ position: 'relative' }}>
            <span aria-hidden style={{
              position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)',
              font: `400 16px/1 ${FUENTE.ui}`, color: COLOR.textoSuave,
            }}>@</span>
            <input value={handle} maxLength={24} className="campo-sobrio"
              aria-invalid={!!handle && !handleOk}
              onChange={e => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="tu_usuario" style={{ ...campo, paddingLeft: 32 }} />
          </div>
        </Campo>

        <Campo etiquetaTexto="Sobre ti" pie={`${bio.length}/300`}>
          <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} maxLength={300}
            className="campo-sobrio"
            placeholder="Una o dos líneas sobre lo que haces."
            style={{ ...campo, resize: 'vertical', fontFamily: FUENTE.ui }} />
        </Campo>

        {/* Va en esta seccion y no abajo con los botones: es la vista previa de
            lo que se acaba de editar, no una accion de cuenta. */}
        {perfil && (
          <Enlace a={`/creator/${perfil.handle}`} style={{
            alignSelf: 'flex-start', cursor: 'pointer', padding: '13px 0',
            font: `400 13px/1 ${FUENTE.mono}`, color: COLOR.textoSuave,
            textDecoration: 'underline', textUnderlineOffset: 5,
          }}>Ver cómo se ve &#8594;</Enlace>
        )}
      </Seccion>

      {/* ---------- Contacto ---------- */}
      <Seccion titulo="Contacto"
        nota="No se muestra en ningún lado. Es para poder escribirte y para que puedas recuperar tu contraseña.">

        <Campo etiquetaTexto="Correo"
          pie="Es a donde llega «olvidé mi contraseña». Para cambiarlo, escríbenos.">
          {/* De solo lectura a proposito: el correo es la llave de la cuenta.
              Cambiarlo tiene que pasar por una confirmacion al correo viejo,
              y eso todavia no existe; dejar el campo editable prometeria algo
              que no se cumple. */}
          <div className="campo-sobrio" style={{ ...campo, color: COLOR.textoSuave, userSelect: 'text', overflowWrap: 'anywhere' }}>
            {sesion.user.email ?? '—'}
          </div>
        </Campo>

        <Campo etiquetaTexto="Teléfono"
          pie={telefono ? pistaDe(telefono)
            : 'Por si el correo rebota. Solo lo ve la administración.'}
          pieColor={telefono && !telOk ? '#FF7BE6' : undefined}>
          <Telefono valor={telefono} cambia={setTelefono} />
        </Campo>
      </Seccion>

      {/* ---------- Trato ---------- */}
      <Seccion titulo="Cómo te tratamos"
        nota={trato === null
          ? undefined
          : 'Solo sirve para escribirte con las palabras que prefieres. Nadie más lo ve en tu perfil.'}>
        {trato === null && (
          <div style={{
            padding: '15px 16px', borderRadius: RADIO.neon, border: `1px solid ${COLOR.admin}`,
            font: `400 14px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave,
          }}>
            Elige una opción; mientras tanto te hablamos sin asumir nada. No se publica
            en tu perfil.
          </div>
        )}
        <ElegirTrato valor={trato} bloqueado={guardandoTrato}
          alElegir={async t => {
            setErrorTrato(''); setGuardandoTrato(true)
            const m = await cambiarTrato(t)
            setGuardandoTrato(false)
            if (m) setErrorTrato(m)
          }} />
        {errorTrato && (
          <div role="alert" style={{ font: `400 13px/1.4 ${FUENTE.ui}`, color: '#FF7BE6' }}>{errorTrato}</div>
        )}
      </Seccion>

      {/* ---------- Publicar ---------- */}
      <Seccion titulo="Publicar"
        nota="Lo que decide si puedes subir contenido y quién puede verlo.">

        <Pulsable
          al={() => setCreadora(c => !c)}
          activado={creadora}
          style={{
            boxSizing: 'border-box', width: '100%', textAlign: 'left',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14,
            padding: '16px 16px', cursor: 'pointer', borderRadius: RADIO.neon,
            border: `1px ${creadora ? 'solid' : 'dashed'} rgba(200,255,61,${creadora ? .55 : .35})`,
            background: creadora ? 'rgba(200,255,61,.07)' : 'transparent',
          }}>
          <div>
            <div style={{ font: `700 13px/1.3 ${FUENTE.ui}`, letterSpacing: 1.2, textTransform: 'uppercase', color: creadora ? COLOR.dinero : COLOR.texto }}>
              Quiero publicar
            </div>
            <div style={{ font: `400 13px/1.45 ${FUENTE.ui}`, color: COLOR.textoSuave, marginTop: 5 }}>
              {creadora
                ? (perfil?.identidad_verificada
                    ? `Tu ${perfilParaPublicar(trato)} está activo`
                    : 'Falta verificar tu identidad para poder publicar')
                : `Habilita tu ${perfilParaPublicar(trato)}`}
            </div>
          </div>
          <div aria-hidden style={{
            width: 48, height: 28, borderRadius: 14, flex: '0 0 auto',
            background: creadora ? COLOR.dinero : COLOR.superficieAlta, position: 'relative',
            border: creadora ? 'none' : '1px solid rgba(255,255,255,.2)', boxSizing: 'border-box',
            transition: 'background .18s',
          }}>
            <div style={{
              position: 'absolute', top: creadora ? 4 : 3, left: creadora ? 24 : 3,
              width: 20, height: 20, borderRadius: '50%',
              background: creadora ? COLOR.fondo : COLOR.textoSuave, transition: 'left .18s',
            }} />
          </div>
        </Pulsable>

        {/* Marcar la casilla no basta para publicar, y callarselo dejaria a la
            persona esperando a que pase algo que no va a pasar sola. */}
        {creadora && !perfil?.identidad_verificada && (
          <div style={{
            padding: '15px 16px', borderRadius: RADIO.neon, border: `1px solid ${COLOR.admin}`,
            font: `400 14px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave,
          }}>
            Puedes entrar al estudio, pero <b style={{ color: COLOR.texto }}>
            no podrás subir ni publicar</b> hasta que verifiquemos tu identidad y tu edad.
            <Enlace a="/verificar" className="boton-principal" style={{ marginTop: 14 }}>
              Verificar mi identidad
            </Enlace>
          </div>
        )}

        {/* El bloqueo por pais solo tiene sentido para quien publica. */}
        {creadora && (
          <PaisesBloqueados valor={paises} onCambio={setPaises}
            nota="Se aplica a todo lo que publiques, salvo que un clip diga otra cosa." />
        )}
      </Seccion>

      {/* ---------- Atajos ----------
          Queda uno, y solo para quien todavia no publica. La lista llego a
          tener cuatro entradas y tres eran copias de la barra de abajo —subir,
          biblioteca, dinero—, asi que «Yo» funcionaba como pasillo en vez de
          como pantalla. Dinero subio a la barra, que era lo unico que de
          verdad no tenia otro camino para una compradora.

          «Quiero publicar» no es un atajo a una pantalla que ya tiene: es la
          puerta a un papel que aun no tiene. Por eso se queda. */}
      {atajos.length > 0 && (
        <Seccion titulo="Y además">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {atajos.map(a => (
              <Enlace key={a.path} a={a.path} style={{
                display: 'flex', alignItems: 'center', gap: 13, padding: '15px 14px', minHeight: 54,
                cursor: 'pointer', borderRadius: RADIO.neon, border: '1px solid rgba(255,255,255,.14)',
              }}>
                <span style={{ width: 26, display: 'grid', placeItems: 'center', color: COLOR.dinero }}>
                  <Icono nombre={a.icono} tam={18} />
                </span>
                <span style={{ flex: 1, font: `500 16px/1.3 ${FUENTE.ui}`, color: COLOR.texto }}>{a.titulo}</span>
                <span aria-hidden style={{ color: COLOR.textoSuave }}>›</span>
              </Enlace>
            ))}
          </div>
        </Seccion>
      )}

      {/* ---------- Cuenta ---------- */}
      <Seccion titulo="Cuenta">
        {/* Cerrar sesion era un boton del mismo tamaño que «guardar cambios» y
            pegado a el. En un telefono eso es una equivocacion de dedo que se
            lleva por delante lo que estabas escribiendo. Aqui va al final, en
            su propia seccion y sin peso de boton principal. */}
        <Pulsable al={async () => { await salir(); nav('/entrar', { replace: true }) }} style={{
          alignSelf: 'flex-start', cursor: 'pointer', minHeight: 48, display: 'inline-flex', alignItems: 'center',
          borderRadius: 12, border: '1px solid rgba(255,43,209,.55)', color: '#FF5BDC',
          padding: '0 22px', font: `700 12px/1 ${FUENTE.ui}`,
          letterSpacing: 1.6, textTransform: 'uppercase',
        }}>Cerrar sesión</Pulsable>
      </Seccion>

      {/* ---------- Guardar ----------
          Pegada abajo y solo cuando hay algo que guardar.
          Antes el boton vivia hasta el final del todo, DESPUES de los atajos:
          para guardar un cambio de nombre habia que pasar por encima de cinco
          enlaces que te sacan de la pantalla, y salir sin guardar no avisaba
          nada. Asi tambien se ve desde cualquier punto que quedo algo pendiente. */}
      {(sucio || estado !== 'listo') && (
        <div className="barra-guardar">
          <div style={{ width: '100%', maxWidth: 680 - 36, margin: '0 auto' }}>
          {estado === 'error' && (
            <div role="alert" style={{
              font: `400 13px/1.45 ${FUENTE.ui}`, color: '#FF7BE6', marginBottom: 10,
            }}>{detalle}</div>
          )}
          <Pulsable al={guardar} activo={puedeGuardar} className="boton-principal"
            style={{ width: '100%' }}>
            {estado === 'guardando' ? 'Guardando…'
              : estado === 'guardado' ? '✓ Guardado'
              : 'Guardar cambios'}
          </Pulsable>
          </div>
        </div>
      )}
    </div>
  )
}

/** Una seccion con su rotulo, en una tarjeta. La pantalla tenia cinco asuntos
 *  distintos —lo publico, publicar, los atajos, la cuenta y el guardado— uno
 *  detras de otro, todos con el mismo peso y sin nada que dijera donde
 *  terminaba uno y empezaba el siguiente. */
function Seccion({ titulo, nota, primera, children }: {
  titulo: string; nota?: string; primera?: boolean; children: React.ReactNode
}) {
  return (
    <section style={{
      display: 'flex', flexDirection: 'column', gap: 18, boxSizing: 'border-box',
      marginTop: primera ? 0 : 14, padding: '20px 18px', borderRadius: RADIO.neon,
      border: '1px solid rgba(255,255,255,.12)', background: COLOR.superficie,
    }}>
      <div>
        <h2 style={{ ...etiqueta, margin: 0 }}>{titulo}</h2>
        {nota && (
          <div style={{ marginTop: 8, font: `400 13px/1.55 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
            {nota}
          </div>
        )}
      </div>
      {children}
    </section>
  )
}

function Campo({ etiquetaTexto, pie, pieColor, children }: {
  etiquetaTexto: string; pie?: string; pieColor?: string; children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={etiqueta}>{etiquetaTexto}</span>
      {children}
      {pie && (
        <span style={{ font: `400 12px/1.45 ${FUENTE.ui}`, color: pieColor ?? COLOR.textoSuave }}>
          {pie}
        </span>
      )}
    </div>
  )
}

function Aviso({ texto, accion }: { texto: string; accion?: { texto: string; al: () => void } }) {
  return (
    <div style={{
      minHeight: '100%', boxSizing: 'border-box', padding: '64px 26px',
      background: COLOR.fondo, color: COLOR.textoSuave, fontFamily: FUENTE.ui,
      fontSize: 19, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 20, textAlign: 'center',
    }}>
      {texto}
      {accion && (
        <Pulsable al={accion.al} className="boton-principal" style={{ padding: '0 28px' }}>{accion.texto}</Pulsable>
      )}
    </div>
  )
}
