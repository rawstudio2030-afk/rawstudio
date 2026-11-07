/* Carga la configuracion de moneda y avisa a las pantallas cuando llega.
 *
 * `usdYPesos()` y `equivalentePesos()` (src/lib/dinero.ts) son funciones
 * normales que leen una variable del modulo: no saben cuando cambia. Este
 * proveedor la llena —primero con lo ultimo que se supo (localStorage), para que
 * la primera pantalla ya salga bien al volver, y luego con lo que dice el
 * servidor— y cambia su valor de contexto, de modo que las pantallas que llaman
 * `useMoneda()` se vuelven a pintar.
 *
 * Si algo falla se queda sin equivalente: es una ayuda, no un requisito.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import { configurarMoneda, type ConfigMoneda } from './dinero'

const CLAVE = 'rawstudio.moneda'
const VACIA: ConfigMoneda = { mostrarPesos: false, cambio: null }

function leerGuardada(): ConfigMoneda {
  try {
    const t = localStorage.getItem(CLAVE)
    if (!t) return VACIA
    const j = JSON.parse(t)
    return {
      mostrarPesos: j?.mostrarPesos === true,
      cambio: typeof j?.cambio === 'number' ? j.cambio : null,
    }
  } catch { return VACIA }
}

const inicial = leerGuardada()
configurarMoneda(inicial)

const Ctx = createContext<ConfigMoneda>(inicial)

export function ProveedorMoneda({ children }: { children: ReactNode }) {
  const [cfg, setCfg] = useState<ConfigMoneda>(inicial)

  useEffect(() => {
    let vivo = true
    supabase.rpc('config_moneda').then(({ data, error }) => {
      if (!vivo || error || !data) return
      const d = data as { mostrar_pesos?: boolean; tipo_cambio?: number | null }
      const nueva: ConfigMoneda = {
        mostrarPesos: d.mostrar_pesos === true,
        cambio: typeof d.tipo_cambio === 'number' ? d.tipo_cambio : null,
      }
      configurarMoneda(nueva)
      try { localStorage.setItem(CLAVE, JSON.stringify(nueva)) } catch { /* sin guardado */ }
      setCfg(prev => (prev.mostrarPesos === nueva.mostrarPesos && prev.cambio === nueva.cambio) ? prev : nueva)
    })
    return () => { vivo = false }
  }, [])

  return <Ctx.Provider value={cfg}>{children}</Ctx.Provider>
}

/** Llamarlo en las pantallas que muestran dinero: las vuelve a pintar cuando
 *  llega o cambia la configuracion. */
// eslint-disable-next-line react-refresh/only-export-components
export function useMoneda(): ConfigMoneda {
  return useContext(Ctx)
}
