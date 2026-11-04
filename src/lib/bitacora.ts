/* Dejar constancia de un acceso.
 *
 * Esto lo ejecuta CUALQUIERA que entre, asi que no puede vivir en `./admin`:
 * `sesion.tsx` lo importaba de alli con ruta relativa —`from './admin'`— y
 * ese solo import anclaba los 68 K del panel al paquete principal. Se tardo
 * en ver porque la busqueda inicial fue por `lib/admin` y esa ruta no lo
 * dice.
 *
 * Lo que LEE la bitacora si esta en `./admin`, donde toca. Aqui solo esta lo
 * que escribe una linea al entrar.
 */
import { supabase } from './supabase'

/** Se llama al entrar. La IP NO la manda el navegador —no conoce la suya—
 *  sino que la lee el servidor de las cabeceras que pone Cloudflare. Aqui
 *  solo se avisa de que hubo un acceso y con que metodo. */
export async function registrarAcceso(metodo: string) {
  const { error } = await supabase.rpc('registrar_acceso', { metodo })
  if (error) console.warn('[admin] registrar acceso:', error.message)
}
