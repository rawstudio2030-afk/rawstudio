/* Si quien mira es administracion.
 *
 * Vive aparte de `./admin` y no dentro, aunque sea una sola funcion, porque
 * la barra de navegacion la necesita para decidir si dibuja la entrada al
 * panel — y eso lo ejecuta todo el mundo. Teniendola alli, el import anclaba
 * los 68 K del panel al paquete principal.
 */
import { supabase } from './supabase'

/** Lo decide la base, no el cliente. Esta consulta solo sirve para DIBUJAR o
 *  no el panel; la proteccion de verdad son las politicas RLS: aunque alguien
 *  forzara esto a true editando el JavaScript, la base seguiria rechazando
 *  cada escritura.
 *
 *  Devuelve false a secas cuando falla, y no un `Lectura` como el resto de
 *  las consultas: ante la duda, no eres administrador. Eso no es una lectura
 *  silenciosa, es fallar del lado seguro, y envolverlo invitaria a tratar el
 *  fallo como «pues dejalo pasar». */
export async function soyAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('es_admin')
  if (error) { console.warn('[papel] es_admin:', error.message); return false }
  return data === true
}
