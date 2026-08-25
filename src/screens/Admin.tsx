// Pantalla 14 — Panel de administracion.
//
// Que esta ruta exista y sea alcanzable no es una fuga: quien no sea admin
// puede abrirla, pero la base le niega cada lectura y cada escritura. La
// seguridad esta en las politicas RLS y en las funciones security definer,
// no en ocultar la pantalla. Lo de aqui abajo solo decide QUE DIBUJAR.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSesion } from '../lib/sesion'
import { soyAdmin } from '../lib/admin'
import { COLOR, FUENTE } from '../lib/diseño'
import { Marco, useModulo } from '../admin/Marco'
import Usuarios from '../admin/Usuarios'
import Moderacion from '../admin/Moderacion'
import Bitacora from '../admin/Bitacora'
import Herramientas from '../admin/Herramientas'

export default function Admin() {
  const nav = useNavigate()
  const { sesion, cargando: cargandoSesion } = useSesion()
  const [admin, setAdmin] = useState<boolean | null>(null)
  const modulo = useModulo()

  useEffect(() => {
    if (cargandoSesion) return
    if (!sesion) { nav('/entrar'); return }
    soyAdmin().then(setAdmin)
  }, [sesion, cargandoSesion, nav])

  if (cargandoSesion || admin === null) return <Aviso texto="Comprobando privilegios…" />
  if (!admin) return (
    <Aviso texto="Esta sección es solo para administración."
      pie="Si crees que es un error, pide que te otorguen el privilegio." />
  )

  return (
    <Marco titulo={modulo.titulo} resumen={modulo.clave === 'usuarios' ? undefined : undefined}>
      {modulo.clave === 'usuarios'     && <Usuarios />}
      {modulo.clave === 'moderacion'   && <Moderacion />}
      {modulo.clave === 'bitacora'     && <Bitacora />}
      {modulo.clave === 'herramientas' && <Herramientas />}
      {!['usuarios', 'moderacion', 'bitacora', 'herramientas'].includes(modulo.clave) && (
        <div style={{ padding: '70px 0', textAlign: 'center' }}>
          <div style={{ font: `400 15px/1.5 ${FUENTE.ui}`, color: COLOR.textoTenue }}>
            Este módulo todavía no está construido.
          </div>
        </div>
      )}
    </Marco>
  )
}

function Aviso({ texto, pie }: { texto: string; pie?: string }) {
  return (
    <div style={{
      minHeight: '100vh', background: COLOR.fondo, color: COLOR.texto,
      display: 'grid', placeItems: 'center', padding: 30, textAlign: 'center',
    }}>
      <div>
        <div style={{ font: `400 16px/1.5 ${FUENTE.ui}`, color: COLOR.textoSuave }}>{texto}</div>
        {pie && <div style={{ marginTop: 8, font: `400 12px/1.5 ${FUENTE.ui}`,
          color: COLOR.textoApagado }}>{pie}</div>}
      </div>
    </div>
  )
}
