// Pantalla 13 — Mi perfil
// Edicion del propio perfil. Es la pieza que le da dueño a todo lo demas:
// sin un perfil real, ningun clip, compra ni mensaje tiene a quien colgarse.
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSesion } from '../lib/sesion'
import { subirAvatar, urlAvatar } from '../lib/perfiles'
import PaisesBloqueados from '../components/PaisesBloqueados'
import { usePapel } from '../components/Navegacion'
import { ATAJOS_PERFIL, visiblesPara } from '../lib/rutas'
import { miTelefono, guardarTelefono, limpiarTelefono } from '../lib/contacto'
import Telefono, { valorValido, pistaDe } from '../components/Telefono'
import { COLOR, FUENTE } from '../lib/diseño'


const etiqueta: React.CSSProperties = {
  font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 2.2, textTransform: 'uppercase', color: COLOR.textoTenue,
}
const campo: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', background: COLOR.superficie,
  border: '1px solid rgba(255,255,255,.14)', color: COLOR.texto,
  font: `400 16px/1.35 ${FUENTE.ui}`, padding: '15px', outline: 'none',
}

export default function Perfil() {
  const nav = useNavigate()
  const { sesion, perfil, cargando, refrescarPerfil, salir } = useSesion()
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
    miTelefono().then(t => { if (vivo) { setTelefono(t); setTelGuardado(t) } })
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
      padding: `54px 24px ${sucio || estado !== 'listo' ? 120 : 44}px`,
      background: COLOR.fondo, color: COLOR.texto, fontFamily: FUENTE.ui,
      display: 'flex', flexDirection: 'column',
      // Un formulario a mil pixeles de ancho no se llena: el ojo pierde la
      // relacion entre la etiqueta y su campo. En el telefono no se nota
      // porque no hay de otra; en pantalla ancha si.
      width: '100%', maxWidth: 680, margin: '0 auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 26 }}>
        <span onClick={() => nav(-1)} style={{ font: `400 26px/1 ${FUENTE.ui}`, color: COLOR.textoSuave, cursor: 'pointer' }}>‹</span>
        <span style={{ ...etiqueta, color: COLOR.dinero }}>Mi perfil</span>
        <span style={{ width: 14 }} />
      </div>

      {/* ---------- Lo que ve el público ---------- */}
      <Seccion primera titulo="Tu perfil público"
        nota="Es lo único que ve quien entra a tu página. Tu nombre legal no aparece en ninguna pantalla.">

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            onClick={() => archivo.current?.click()}
            style={{
              width: 82, height: 82, borderRadius: '50%', flex: '0 0 auto', cursor: 'pointer',
              border: `2px solid ${COLOR.acento}`, overflow: 'hidden',
              background: foto ? `center/cover url(${foto})` : `repeating-linear-gradient(130deg,${COLOR.superficieAlta} 0 8px,${COLOR.superficie} 8px 16px)`,
              display: 'grid', placeItems: 'center',
            }}>
            {!foto && <span style={{ ...etiqueta, color: COLOR.textoApagado }}>Foto</span>}
          </div>
          <div style={{ minWidth: 0 }}>
            <div onClick={() => archivo.current?.click()} style={{
              display: 'inline-block', border: '1px solid rgba(255,255,255,.16)', color: COLOR.textoSuave,
              padding: '10px 13px', font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.8,
              textTransform: 'uppercase', cursor: 'pointer',
            }}>
              {subiendo ? 'Subiendo…' : foto ? 'Cambiar foto' : 'Subir foto'}
            </div>
            <div style={{ font: `400 11px/1.5 ${FUENTE.mono}`, color: COLOR.textoApagado, marginTop: 8 }}>
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
          <input value={nombre} onChange={e => setNombre(e.target.value)}
            placeholder="Como quieres que te vean" maxLength={40} style={campo} />
        </Campo>

        <Campo etiquetaTexto="Usuario"
          pie={handleOk || !handle
            ? 'Entre 3 y 24 caracteres: letras, números y guion bajo.'
            : 'Necesita entre 3 y 24 caracteres.'}
          pieColor={handleOk || !handle ? undefined : COLOR.acento}>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)',
              font: `400 16px/1 ${FUENTE.ui}`, color: COLOR.textoTenue,
            }}>@</span>
            <input value={handle} maxLength={24}
              onChange={e => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="tu_usuario" style={{ ...campo, paddingLeft: 32 }} />
          </div>
        </Campo>

        <Campo etiquetaTexto="Sobre ti" pie={`${bio.length}/300`}>
          <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} maxLength={300}
            placeholder="Una o dos líneas sobre lo que haces."
            style={{ ...campo, resize: 'vertical', fontFamily: FUENTE.ui }} />
        </Campo>

        {/* Va en esta seccion y no abajo con los botones: es la vista previa de
            lo que se acaba de editar, no una accion de cuenta. */}
        {perfil && (
          <span onClick={() => nav(`/creator/${perfil.handle}`)} style={{
            alignSelf: 'flex-start', cursor: 'pointer',
            font: `400 12.5px/1 ${FUENTE.mono}`, color: COLOR.textoTenue,
            textDecoration: 'underline', textUnderlineOffset: 5,
          }}>Ver cómo se ve &#8594;</span>
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
          <div style={{ ...campo, color: COLOR.textoSuave, userSelect: 'text' }}>
            {sesion.user.email ?? '—'}
          </div>
        </Campo>

        <Campo etiquetaTexto="Teléfono"
          pie={telefono ? pistaDe(telefono)
            : 'Por si el correo rebota. Solo lo ve la administración.'}
          pieColor={telefono && !telOk ? COLOR.acento : undefined}>
          <Telefono valor={telefono} cambia={setTelefono} />
        </Campo>
      </Seccion>

      {/* ---------- Publicar ---------- */}
      <Seccion titulo="Publicar"
        nota="Lo que decide si puedes subir contenido y quién puede verlo.">

        <div
          onClick={() => setCreadora(c => !c)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14,
            padding: '16px 15px', cursor: 'pointer',
            border: `1px ${creadora ? 'solid' : 'dashed'} rgba(200,255,61,${creadora ? .5 : .3})`,
            background: creadora ? 'rgba(200,255,61,.07)' : 'transparent',
          }}>
          <div>
            <div style={{ font: `700 12px/1.3 ${FUENTE.ui}`, letterSpacing: 1.2, textTransform: 'uppercase', color: creadora ? COLOR.dinero : COLOR.textoSuave }}>
              Quiero publicar
            </div>
            <div style={{ font: `400 12px/1.5 ${FUENTE.mono}`, color: COLOR.textoApagado, marginTop: 5 }}>
              {creadora
                ? (perfil?.identidad_verificada
                    ? 'Tu perfil de creadora está activo'
                    : 'Falta verificar tu identidad para poder publicar')
                : 'Habilita tu perfil de creadora'}
            </div>
          </div>
          <div style={{
            width: 46, height: 26, borderRadius: 13, flex: '0 0 auto',
            background: creadora ? COLOR.dinero : COLOR.superficieAlta, position: 'relative',
            transition: 'background .18s',
          }}>
            <div style={{
              position: 'absolute', top: 3, left: creadora ? 23 : 3,
              width: 20, height: 20, borderRadius: '50%',
              background: creadora ? COLOR.fondo : COLOR.textoApagado, transition: 'left .18s',
            }} />
          </div>
        </div>

        {/* Marcar la casilla no basta para publicar, y callarselo dejaria a la
            persona esperando a que pase algo que no va a pasar sola. */}
        {creadora && !perfil?.identidad_verificada && (
          <div style={{
            padding: '13px 15px', border: `1px solid ${COLOR.admin}`,
            font: `400 13px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave,
          }}>
            Ya puedes entrar al estudio y subir, pero <b style={{ color: COLOR.texto }}>
            nada se publica</b> hasta que verifiquemos tu identidad y tu edad.
            <div onClick={() => nav('/verificar')} style={{
              marginTop: 11, textAlign: 'center', padding: '12px 0', cursor: 'pointer',
              background: COLOR.admin, color: COLOR.fondo,
              font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.8, textTransform: 'uppercase',
            }}>Verificar mi identidad</div>
          </div>
        )}

        {/* El bloqueo por pais solo tiene sentido para quien publica. */}
        {creadora && (
          <PaisesBloqueados valor={paises} onCambio={setPaises}
            nota="Se aplica a todo lo que publiques, salvo que un clip diga otra cosa." />
        )}
      </Seccion>

      {/* ---------- Atajos ---------- */}
      {atajos.length > 0 && (
        <Seccion titulo="Atajos">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {atajos.map(a => (
              <div key={a.path} onClick={() => nav(a.path)} style={{
                display: 'flex', alignItems: 'center', gap: 13, padding: '15px 13px',
                cursor: 'pointer', border: '1px solid rgba(255,255,255,.09)',
              }}>
                <span style={{ width: 26, textAlign: 'center', fontSize: 15, color: COLOR.dinero }}>
                  {a.icono}
                </span>
                <span style={{ flex: 1, font: `500 15px/1.3 ${FUENTE.ui}`, color: COLOR.texto }}>{a.titulo}</span>
                <span style={{ color: COLOR.textoApagado }}>›</span>
              </div>
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
        <span onClick={async () => { await salir(); nav('/entrar', { replace: true }) }} style={{
          alignSelf: 'flex-start', cursor: 'pointer',
          border: '1px solid rgba(255,43,209,.45)', color: COLOR.acento,
          padding: '13px 20px', font: `700 11px/1 ${FUENTE.ui}`,
          letterSpacing: 1.8, textTransform: 'uppercase',
        }}>Cerrar sesión</span>
      </Seccion>

      {/* ---------- Guardar ----------
          Pegada abajo y solo cuando hay algo que guardar.
          Antes el boton vivia hasta el final del todo, DESPUES de los atajos:
          para guardar un cambio de nombre habia que pasar por encima de cinco
          enlaces que te sacan de la pantalla, y salir sin guardar no avisaba
          nada. Asi tambien se ve desde cualquier punto que quedo algo pendiente. */}
      {(sucio || estado !== 'listo') && (
        <div className="barra-guardar">
          <div style={{ width: '100%', maxWidth: 680 - 48, margin: '0 auto' }}>
          {estado === 'error' && (
            <div style={{
              font: `400 12.5px/1.45 ${FUENTE.ui}`, color: COLOR.acento, marginBottom: 10,
            }}>{detalle}</div>
          )}
          <div onClick={guardar} style={{
            background: puedeGuardar ? COLOR.acento : COLOR.superficieAlta,
            color: puedeGuardar ? COLOR.fondo : COLOR.textoApagado,
            textAlign: 'center', padding: 17,
            font: `700 13px/1 ${FUENTE.ui}`, letterSpacing: 2.2, textTransform: 'uppercase',
            boxShadow: puedeGuardar ? '0 0 34px rgba(255,43,209,.42)' : 'none',
            cursor: puedeGuardar ? 'pointer' : 'default',
          }}>
            {estado === 'guardando' ? 'Guardando…'
              : estado === 'guardado' ? '✓ Guardado'
              : 'Guardar cambios'}
          </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** Una seccion con su rotulo. La pantalla tenia cinco asuntos distintos
 *  —lo publico, publicar, los atajos, la cuenta y el guardado— uno detras de
 *  otro, todos con el mismo peso y sin nada que dijera donde terminaba uno y
 *  empezaba el siguiente. */
function Seccion({ titulo, nota, primera, children }: {
  titulo: string; nota?: string; primera?: boolean; children: React.ReactNode
}) {
  return (
    <section style={{
      display: 'flex', flexDirection: 'column', gap: 18,
      marginTop: primera ? 0 : 28, paddingTop: primera ? 0 : 24,
      borderTop: primera ? 'none' : '1px solid rgba(255,255,255,.09)',
    }}>
      <div>
        <div style={etiqueta}>{titulo}</div>
        {nota && (
          <div style={{ marginTop: 8, font: `400 12px/1.55 ${FUENTE.mono}`, color: COLOR.textoApagado }}>
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
        <span style={{ font: `400 11px/1.5 ${FUENTE.mono}`, color: pieColor ?? COLOR.textoApagado }}>
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
      background: COLOR.fondo, color: COLOR.textoSuave, fontFamily: FUENTE.serif, fontStyle: 'italic',
      fontSize: 20, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 20, textAlign: 'center',
    }}>
      {texto}
      {accion && (
        <span onClick={accion.al} style={{
          background: COLOR.acento, color: COLOR.fondo, padding: '15px 26px',
          font: `700 12px/1 ${FUENTE.ui}`, letterSpacing: 2, textTransform: 'uppercase',
          fontStyle: 'normal', cursor: 'pointer',
        }}>{accion.texto}</span>
      )}
    </div>
  )
}
