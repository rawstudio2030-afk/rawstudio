/* Borrar archivos del almacenamiento y SABER si se borraron.
 *
 * `storage.remove()` tiene una trampa: si la politica de borrado no le deja
 * quitar un archivo, NO da error. Solo devuelve una lista mas corta (o vacia).
 * Quien mire nada mas `error` cree que borro y no borro. Eso paso con las cuentas
 * registradas por si solas, cuyas politicas de borrado de administracion estaban
 * limitadas a cuentas con expediente.
 *
 * Aqui se compara lo pedido con lo borrado, y lo que no salio en la respuesta se
 * comprueba con una consulta: puede que ya no existiera (esta bien) o que SIGA
 * ahi (no esta bien). No depende de supabase: recibe el almacenamiento, para
 * poder probarse.
 */

export type Almacen = {
  from(bucket: string): {
    remove(rutas: string[]): Promise<{
      data: { name: string }[] | null; error: { message: string } | null
    }>
    list(carpeta: string, opciones: { search: string; limit: number }): Promise<{
      data: { name: string }[] | null; error: { message: string } | null
    }>
  }
}

/** Devuelve las rutas que SIGUEN en el almacenamiento tras intentar borrarlas.
 *  Vacio = todo se borro (o ya no existia). */
export async function borrarArchivos(
  almacen: Almacen, bucket: string, rutas: string[],
): Promise<string[]> {
  if (!rutas.length) return []
  const cubo = almacen.from(bucket)
  const { data, error } = await cubo.remove(rutas)
  if (error) return rutas
  const borradas = new Set((data ?? []).map(o => o.name))
  const sinConfirmar = rutas.filter(r => !borradas.has(r))
  if (!sinConfirmar.length) return []

  const siguen: string[] = []
  for (const r of sinConfirmar) {
    const i = r.lastIndexOf('/')
    const carpeta = i >= 0 ? r.slice(0, i) : ''
    const nombre = r.slice(i + 1)
    const { data: l, error: e } = await cubo.list(carpeta, { search: nombre, limit: 100 })
    // Si no se puede comprobar, se cuenta como que sigue: mas vale avisar de mas.
    if (e || (l ?? []).some(o => o.name === nombre)) siguen.push(r)
  }
  return siguen
}
