// Pantalla 14 — Panel de administracion.
//
// Que esta ruta exista y sea alcanzable no es una fuga: quien no sea admin
// puede abrirla, pero la base le niega cada lectura y cada escritura. La
// seguridad esta en las politicas RLS y en las funciones security definer,
// no en ocultar la pantalla. Lo de aqui abajo solo decide QUE DIBUJAR.
import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSesion } from '../lib/sesion'
import { soyAdmin } from '../lib/papel'
import { COLOR, FUENTE } from '../lib/diseño'
import { Marco, useModulo } from '../admin/Marco'
import Usuarios from '../admin/Usuarios'
import Moderacion from '../admin/Moderacion'
import Retiros from '../admin/Retiros'
import Comunicacion from '../admin/Comunicacion'
import Contenido from '../admin/Contenido'
import Verificacion from '../admin/Verificacion'
import Reportes from '../admin/Reportes'
import Finanzas from '../admin/Finanzas'
import Bitacora from '../admin/Bitacora'
import Herramientas from '../admin/Herramientas'
import Resumen from '../admin/Resumen'
import Consultas from '../admin/Consultas'
import AvisosAdmin from '../admin/AvisosAdmin'

export default function Admin() {
  const nav = useNavigate()
  const { sesion, cargando: cargandoSesion } = useSesion()
  const [admin, setAdmin] = useState<boolean | null>(null)
  const modulo = useModulo()
  // Si cambian los parametros (?q= / ?abrir=, de la busqueda general), el modulo se
  // monta de nuevo y toma el valor inicial de la URL.
  const { search } = useLocation()

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
    <Marco titulo={modulo.titulo}>
      {modulo.clave === 'resumen'      && <Resumen />}
      {modulo.clave === 'avisos'       && <AvisosAdmin />}
      {modulo.clave === 'usuarios'     && <Usuarios key={search} />}
      {modulo.clave === 'moderacion'   && <Moderacion />}
      {modulo.clave === 'contenido'    && <Contenido key={search} />}
      {modulo.clave === 'comunicacion' && <Comunicacion />}
      {modulo.clave === 'retiros'      && <Retiros />}
      {modulo.clave === 'reportes'     && <Reportes />}
      {modulo.clave === 'verificacion' && <Verificacion />}
      {modulo.clave === 'consultas'    && <Consultas key={search} />}
      {modulo.clave === 'finanzas'     && <Finanzas />}
      {modulo.clave === 'bitacora'     && <Bitacora />}
      {modulo.clave === 'herramientas' && <Herramientas />}
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
        <div style={{ font: `400 16px/1.45 ${FUENTE.ui}`, color: COLOR.textoSuave }}>{texto}</div>
        {pie && <div style={{ marginTop: 8, font: `400 12px/1.45 ${FUENTE.ui}`,
          color: COLOR.textoSuave }}>{pie}</div>}
      </div>
    </div>
  )
}
