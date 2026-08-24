// Pantalla 14 — Administración
//
// Que esta ruta exista y sea alcanzable no es una fuga: quien no sea admin
// puede abrirla, pero la base le niega cada lectura y cada escritura. La
// seguridad esta en las politicas RLS, no en ocultar la pantalla.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSesion } from '../lib/sesion'
import { urlAvatar } from '../lib/perfiles'
import { ajustarSaldo } from '../lib/monedero'
import {
  soyAdmin, listarPerfiles, suspender, reactivar, cambiarVerificacion,
  bitacora, otorgarAdmin, revocarAdmin, marcarCreadora, sembrarDemo, borrarDemo,
  type PerfilAdmin, type Entrada,
} from '../lib/admin'

const UI = "'Space Grotesk', system-ui, sans-serif"
const MONO = "'Space Mono', monospace"
const SERIF = "'Instrument Serif', serif"

const etiqueta: React.CSSProperties = {
  font: `700 10px/1 ${UI}`, letterSpacing: 2.2, textTransform: 'uppercase', color: '#6E6A72',
}

export default function Admin() {
  const nav = useNavigate()
  const { sesion, cargando: cargandoSesion } = useSesion()
  const [admin, setAdmin] = useState<boolean | null>(null)
  const [pestaña, setPestaña] = useState<'gente' | 'bitacora'>('gente')
  const [busqueda, setBusqueda] = useState('')
  const [gente, setGente] = useState<PerfilAdmin[]>([])
  const [log, setLog] = useState<Entrada[]>([])
  const [abierto, setAbierto] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')
  const [monto, setMonto] = useState('')
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    if (cargandoSesion) return
    if (!sesion) { setAdmin(false); return }
    soyAdmin().then(setAdmin)
  }, [sesion, cargandoSesion])

  const recargar = async () => {
    setGente(await listarPerfiles(busqueda))
    if (pestaña === 'bitacora') setLog(await bitacora())
  }

  useEffect(() => { if (admin) recargar() }, [admin, pestaña])

  useEffect(() => {
    if (!admin) return
    const id = setTimeout(() => { listarPerfiles(busqueda).then(setGente) }, 280)
    return () => clearTimeout(id)
  }, [busqueda, admin])

  if (cargandoSesion || admin === null) return <Centro texto="Cargando…" />

  if (!admin) return (
    <Centro
      texto={sesion
        ? 'Esta sección es solo para administradores.'
        : 'Necesitas entrar para ver esta sección.'}
      accion={{ texto: sesion ? 'Volver' : 'Entrar', al: () => nav(sesion ? '/entrar' : '/acceso') }}
    />
  )

  const actuar = async (fn: () => Promise<string | null>) => {
    setOcupado(true); setError('')
    const err = await fn()
    if (err) setError(err)
    await recargar()
    setOcupado(false)
  }

  return (
    <div style={{
      minHeight: '100%', boxSizing: 'border-box', padding: '54px 20px 40px',
      background: '#08080A', color: '#F2F0F3', fontFamily: UI,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <span onClick={() => nav('/entrar')} style={{ font: `400 26px/1 ${UI}`, color: '#9C979F', cursor: 'pointer' }}>‹</span>
        <span style={{ ...etiqueta, color: '#00E5FF' }}>Administración</span>
        <span style={{ width: 14 }} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {(['gente', 'bitacora'] as const).map(p => (
          <span key={p} onClick={() => setPestaña(p)} style={{
            flex: 1, textAlign: 'center', padding: '11px 8px', cursor: 'pointer',
            font: `700 10px/1 ${UI}`, letterSpacing: 1.8, textTransform: 'uppercase',
            background: pestaña === p ? '#FF2BD1' : 'transparent',
            color: pestaña === p ? '#08080A' : '#9C979F',
            border: `1px solid ${pestaña === p ? '#FF2BD1' : 'rgba(255,255,255,.14)'}`,
          }}>{p === 'gente' ? 'Personas' : 'Bitácora'}</span>
        ))}
      </div>

      {error && <div style={{ font: `400 13px/1.5 ${UI}`, color: '#FF2BD1', marginBottom: 14 }}>{error}</div>}

      {pestaña === 'gente' && (
        <div onClick={() => nav('/alta-creadora')} style={{
          border: '1px solid rgba(200,255,61,.4)', background: 'rgba(200,255,61,.05)',
          padding: '15px 14px', marginBottom: 16, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div>
            <div style={{ ...etiqueta, color: '#C8FF3D' }}>Dar de alta una creadora</div>
            <div style={{ font: `400 12.5px/1.6 ${UI}`, color: '#6E6A72', marginTop: 7 }}>
              Para quien firmó papeles fuera de la app. Subes su expediente y publicas por ella.
            </div>
          </div>
          <span style={{ color: '#C8FF3D', font: `700 15px/1 ${UI}` }}>&#8594;</span>
        </div>
      )}

      {/* Contenido de demostración. Se separa del resto y se explica para qué
          sirve: dentro de unas semanas nadie recordaría por qué hay perfiles
          que no corresponden a nadie. */}
      {pestaña === 'gente' && (
        <div style={{
          border: '1px dashed rgba(255,255,255,.18)', padding: '15px 14px', marginBottom: 16,
        }}>
          <div style={{ ...etiqueta, color: '#9C979F' }}>Contenido de demostración</div>
          <div style={{ font: `400 12.5px/1.6 ${UI}`, color: '#6E6A72', marginTop: 8 }}>
            Perfiles ficticios para que la plataforma no se vea vacía al enseñarla.
            No corresponden a ninguna persona real. Bórralos antes de abrir al público.
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <Boton texto="Sembrar demo" color="#C8FF3D" ocupado={ocupado}
              al={() => actuar(async () => {
                const r = await sembrarDemo()
                return 'error' in r ? r.error : null
              })} />
            <Boton texto="Borrar toda la demo" color="#FF2BD1" ocupado={ocupado}
              al={() => actuar(async () => {
                const r = await borrarDemo()
                return 'error' in r ? r.error : null
              })} />
          </div>
        </div>
      )}

      {pestaña === 'gente' ? (
        <>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por correo, usuario o nombre"
            style={{
              width: '100%', boxSizing: 'border-box', background: '#111116',
              border: '1px solid rgba(255,255,255,.14)', color: '#F2F0F3',
              font: `400 15px/1 ${UI}`, padding: '14px', outline: 'none', marginBottom: 14,
            }} />

          <div style={{ ...etiqueta, marginBottom: 10 }}>{gente.length} perfiles</div>

          {gente.map(p => {
            const foto = urlAvatar(p.avatar_path)
            const susp = !!p.suspended_at
            const open = abierto === p.id
            return (
              <div key={p.id} style={{
                borderBottom: '1px solid rgba(255,255,255,.09)', padding: '14px 2px',
                background: susp ? 'rgba(255,43,209,.06)' : 'transparent',
              }}>
                <div onClick={() => { setAbierto(open ? null : p.id); setMotivo('') }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', flex: '0 0 auto',
                    border: `1px solid ${susp ? '#FF2BD1' : 'rgba(255,255,255,.18)'}`,
                    background: foto ? `center/cover url(${foto})` : 'repeating-linear-gradient(130deg,#191920 0 6px,#111116 6px 12px)',
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: `600 15px/1.3 ${UI}`, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.display_name}</span>
                      {p.verified && <span style={{ color: '#00E5FF', fontSize: 13 }}>&#10038;</span>}
                      {p.is_creator && <span style={{ ...etiqueta, color: '#C8FF3D', letterSpacing: 1.2 }}>creadora</span>}
                    </div>
                    <div style={{ font: `400 12px/1.4 ${MONO}`, color: '#6E6A72',
                                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.email}
                    </div>
                    <div style={{ font: `400 11px/1.5 ${MONO}`, color: '#5E5A63' }}>
                      @{p.handle}
                      {p.es_admin && <span style={{ color: '#00E5FF' }}> · admin</span>}
                      {p.es_demo && <span style={{ color: '#9C979F' }}> · demo</span>}
                      {susp && <span style={{ color: '#FF2BD1' }}> · suspendida</span>}
                    </div>
                  </div>
                  <span style={{ color: '#5E5A63', font: `400 16px/1 ${UI}` }}>{open ? '−' : '+'}</span>
                </div>

                {open && (
                  <div style={{ paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 9 }}>
                    <div style={{
                      display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '7px 12px',
                      font: `400 11px/1.5 ${MONO}`, color: '#6E6A72',
                      border: '1px solid rgba(255,255,255,.09)', padding: 12,
                    }}>
                      <Dato k="Alta" v={new Date(p.created_at).toLocaleDateString('es-MX')} />
                      <Dato k="Último acceso" v={p.ultimo_acceso
                        ? new Date(p.ultimo_acceso).toLocaleDateString('es-MX') : 'nunca'} />
                      <Dato k="Entra con" v={p.metodos} />
                      <Dato k="Edad" v={p.adult_confirmed_at ? 'confirmada' : 'sin confirmar'} />
                      <Dato k="Clips" v={`${p.clips_publicados} publicados · ${p.clips_total} en total`} />
                      <Dato k="Perfil" v={p.is_creator ? 'creadora' : 'compradora'} />
                      {p.suspended_reason && <Dato k="Motivo" v={p.suspended_reason} />}
                      <Dato k="id" v={`${p.id.slice(0, 8)}…`} />
                    </div>

                    {/* Ajuste de saldo. El motivo es obligatorio del lado del
                        servidor: un movimiento de dinero sin explicacion es
                        justo lo que el libro contable existe para evitar. */}
                    <div style={{ display: 'flex', gap: 7 }}>
                      <input value={monto} onChange={e => setMonto(e.target.value.replace(/[^0-9-]/g, ''))}
                        placeholder="± coins" inputMode="numeric"
                        style={{
                          width: 96, boxSizing: 'border-box', background: '#111116',
                          border: '1px solid rgba(255,255,255,.14)', color: '#F2F0F3',
                          font: `400 14px/1 ${MONO}`, padding: '12px', outline: 'none',
                        }} />
                      <Boton texto="Ajustar saldo" color="#C8FF3D" ocupado={ocupado}
                        al={() => actuar(async () => {
                          const n = parseInt(monto, 10)
                          if (!n) return 'Escribe una cantidad distinta de cero'
                          if (!motivo.trim()) return 'Escribe el motivo del ajuste'
                          const err = await ajustarSaldo(p.id, n, motivo.trim())
                          if (!err) setMonto('')
                          return err
                        })} />
                    </div>

                    <input value={motivo} onChange={e => setMotivo(e.target.value)}
                      placeholder="Motivo (obligatorio para ajustes y suspensiones)"
                      style={{
                        width: '100%', boxSizing: 'border-box', background: '#111116',
                        border: '1px solid rgba(255,255,255,.14)', color: '#F2F0F3',
                        font: `400 14px/1 ${UI}`, padding: '12px', outline: 'none',
                      }} />

                    {false && (
                      <input value={motivo} onChange={e => setMotivo(e.target.value)}
                        placeholder="Motivo de la suspensión"
                        style={{
                          width: '100%', boxSizing: 'border-box', background: '#111116',
                          border: '1px solid rgba(255,255,255,.14)', color: '#F2F0F3',
                          font: `400 14px/1 ${UI}`, padding: '12px', outline: 'none',
                        }} />
                    )}

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Boton texto={susp ? 'Reactivar' : 'Suspender'} color={susp ? '#C8FF3D' : '#FF2BD1'}
                        ocupado={ocupado}
                        al={() => actuar(() => susp ? reactivar(p.id) : suspender(p.id, motivo))} />
                      <Boton texto={p.verified ? 'Quitar verificación' : 'Verificar'} color="#00E5FF"
                        ocupado={ocupado}
                        al={() => actuar(() => cambiarVerificacion(p.id, !p.verified))} />
                      <Boton texto={p.is_creator ? 'Quitar creadora' : 'Hacer creadora'} color="#C8FF3D"
                        ocupado={ocupado}
                        al={() => actuar(() => marcarCreadora(p.id, !p.is_creator))} />
                      <Boton texto={p.es_admin ? 'Quitar admin' : 'Hacer admin'} color="#00E5FF"
                        ocupado={ocupado}
                        al={() => actuar(() => p.es_admin
                          ? revocarAdmin(p.id)
                          : otorgarAdmin(p.id, motivo || 'otorgado desde el panel'))} />
                      <Boton texto="Ver perfil" color="rgba(255,255,255,.3)" ocupado={false}
                        al={async () => { nav(`/creator/${p.handle}`); return null }} />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </>
      ) : (
        <>
          <div style={{ ...etiqueta, marginBottom: 12 }}>Últimas {log.length} acciones</div>
          {log.length === 0 && (
            <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 17, color: '#6E6A72' }}>
              Todavía no hay acciones registradas.
            </div>
          )}
          {log.map(e => (
            <div key={e.id} style={{ borderBottom: '1px solid rgba(255,255,255,.09)', padding: '13px 2px' }}>
              <div style={{ font: `600 14px/1.3 ${UI}`, color: '#F2F0F3' }}>{e.accion}</div>
              <div style={{ font: `400 11px/1.6 ${MONO}`, color: '#6E6A72', marginTop: 4 }}>
                {new Date(e.created_at).toLocaleString('es-MX')}
                {e.objetivo && ` · sobre ${e.objetivo.slice(0, 8)}…`}
                {e.detalle && Object.keys(e.detalle).length > 0 && ` · ${JSON.stringify(e.detalle)}`}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

function Dato({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div style={{ color: '#5E5A63', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>{k}</div>
      <div style={{ color: '#F2F0F3', marginTop: 2, wordBreak: 'break-word' }}>{v}</div>
    </div>
  )
}

function Boton({ texto, color, al, ocupado }: {
  texto: string; color: string; ocupado: boolean; al: () => Promise<void | string | null>
}) {
  return (
    <span onClick={() => { if (!ocupado) al() }} style={{
      border: `1px solid ${color}`, color, padding: '10px 13px',
      font: `700 10px/1 ${UI}`, letterSpacing: 1.4, textTransform: 'uppercase',
      cursor: ocupado ? 'default' : 'pointer', opacity: ocupado ? .5 : 1,
    }}>{texto}</span>
  )
}

function Centro({ texto, accion }: { texto: string; accion?: { texto: string; al: () => void } }) {
  return (
    <div style={{
      minHeight: '100%', boxSizing: 'border-box', padding: '64px 26px',
      background: '#08080A', color: '#9C979F', fontFamily: SERIF, fontStyle: 'italic',
      fontSize: 20, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 20, textAlign: 'center',
    }}>
      {texto}
      {accion && (
        <span onClick={accion.al} style={{
          background: '#FF2BD1', color: '#08080A', padding: '15px 26px',
          font: `700 12px/1 ${UI}`, letterSpacing: 2, textTransform: 'uppercase',
          fontStyle: 'normal', cursor: 'pointer',
        }}>{accion.texto}</span>
      )}
    </div>
  )
}
