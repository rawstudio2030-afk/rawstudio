/* Telefono de contacto.
 *
 * El correo NO esta aqui: vive en `auth.users` y es el mismo que usa Supabase
 * para recuperar la contraseña. Guardar una copia crearia dos respuestas a
 * «¿a donde le escribimos?» y el dia que se separen el correo de recuperacion
 * se iria a la equivocada. Para leerlo basta la sesion del cliente.
 *
 * El telefono si necesita tabla propia, y NO puede ser `profiles`: esa es de
 * lectura publica —es el directorio de creadoras— y ahi un telefono lo lee
 * cualquiera con la llave anonima.
 */
import { supabase } from './supabase'
import { leido, noSePudo, type Lectura } from './lectura'

/** Quita lo que la gente escribe por costumbre —espacios, guiones,
 *  parentesis— y deja digitos con un + opcional, que es lo que acepta la
 *  base. No normaliza a E.164 de verdad: para eso haria falta saber el pais,
 *  y todavia no se pregunta. */
export function limpiarTelefono(t: string): string {
  return t.replace(/[\s()-]/g, '')
}

export function telefonoCuadra(t: string): boolean {
  return /^\+?[0-9]{10,15}$/.test(limpiarTelefono(t))
}

/** Su telefono guardado. Devolver cadena vacia por fallo es peligroso aqui y
 *  no solo confuso: el formulario se pinta en blanco, y si lo guarda asi
 *  BORRA el telefono que si estaba. */
export async function miTelefono(): Promise<Lectura<string>> {
  const { data, error } = await supabase.from('contactos')
    .select('telefono').maybeSingle()
  if (error) return noSePudo('', error)
  return leido(data?.telefono ?? '')
}

export async function guardarTelefono(id: string, telefono: string): Promise<string | null> {
  const tel = limpiarTelefono(telefono)
  const { error } = await supabase.from('contactos').upsert({
    user_id: id,
    telefono: tel || null,
    updated_at: new Date().toISOString(),
  })
  if (!error) return null
  if (error.code === '23514') return 'Ese teléfono no cuadra: 10 dígitos, o con + y código de país.'
  return error.message
}
