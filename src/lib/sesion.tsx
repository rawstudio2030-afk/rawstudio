import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { edadConfirmada, olvidarEdad } from './edad'
import { olvidarModo } from './modo'
import { supabase, COLUMNAS_PROPIAS, type Perfil } from './supabase'
import { registrarAcceso } from './bitacora'
import { esTrato, type Trato } from './trato'

type Estado = {
  sesion: Session | null
  perfil: Perfil | null
  /** Como prefiere que se le trate. Privado; `null` = sin elegir (se trata como neutro). */
  trato: Trato | null
  cargando: boolean
  cambiarTrato: (t: Trato) => Promise<string>
  refrescarPerfil: () => Promise<void>
  salir: () => Promise<void>
}

const Ctx = createContext<Estado | null>(null)

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Session | null>(null)
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [trato, setTrato] = useState<Trato | null>(null)
  const [cargando, setCargando] = useState(true)

  // El age gate ocurre antes de que exista sesion, asi que la confirmacion se
  // deja apuntada en localStorage y se escribe aqui, al volver del enlace
  // magico, que es cuando ya hay una fila de perfil que actualizar.
  const volcarEdadPendiente = async (id: string) => {
    const pendiente = edadConfirmada()
    if (!pendiente) return
    const { error } = await supabase
      .from('profiles').update({ adult_confirmed_at: pendiente }).eq('id', id)
    if (!error) olvidarEdad()
  }

  const traerPerfil = async (id: string | undefined) => {
    if (!id) { setPerfil(null); setTrato(null); return }
    await volcarEdadPendiente(id)
    const { data, error } = await supabase
      .from('profiles').select(COLUMNAS_PROPIAS).eq('id', id).single()
    if (error) {
      console.warn('[sesion] no se pudo leer el perfil:', error.message)
      setPerfil(null)
      return
    }
    setPerfil(data as Perfil)
    // No es una columna legible: se pide por funcion. Si falla, se queda sin elegir.
    const { data: t } = await supabase.rpc('mi_trato')
    setTrato(esTrato(t) ? t : null)
  }

  useEffect(() => {
    let vivo = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!vivo) return
      setSesion(data.session)
      await traerPerfil(data.session?.user.id)
      if (vivo) setCargando(false)
    })

    // Cubre el regreso del enlace magico, el refresco de token y el cierre de
    // sesion desde otra pestaña.
    const { data: sub } = supabase.auth.onAuthStateChange(async (evt, s) => {
      // Supabase avisa la recuperacion con su propio evento. Se marca aqui
      // porque la sesion que crea es indistinguible de una normal, y sin la
      // marca la app la trataria como "ya entro" y lo mandaria al contenido
      // sin darle nunca la oportunidad de cambiar la contraseña.
      if (evt === 'PASSWORD_RECOVERY') {
        sessionStorage.setItem('rawstudio.recuperando', '1')
        window.location.hash = '#/nueva-clave'
      }
      if (!vivo) return
      setSesion(s)
      await traerPerfil(s?.user.id)
      // El acceso queda en la bitacora con la IP que ve el servidor. Solo en
      // SIGNED_IN: TOKEN_REFRESHED se dispara solo cada hora y anotarlo seria
      // ruido que ademas escondería los accesos de verdad.
      if (evt === 'SIGNED_IN' && s?.user) {
        registrarAcceso(s.user.app_metadata?.provider ?? 'correo')
      }
      if (vivo) setCargando(false)
    })

    return () => { vivo = false; sub.subscription.unsubscribe() }
  }, [])

  const valor: Estado = {
    sesion, perfil, trato, cargando,
    cambiarTrato: async (t: Trato) => {
      const { error } = await supabase.rpc('guardar_trato', { p_trato: t })
      if (error) return error.message
      setTrato(t)
      return ''
    },
    refrescarPerfil: () => traerPerfil(sesion?.user.id),
    // Se olvida el sombrero elegido: si no, la siguiente persona que entre
    // en este navegador se salta el porton con la eleccion de la anterior.
    salir: async () => { olvidarModo(); await supabase.auth.signOut() },
  }

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

export function useSesion() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useSesion debe usarse dentro de <ProveedorSesion>')
  return v
}
