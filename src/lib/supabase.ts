import { createClient } from '@supabase/supabase-js'

// Ambas son publicas por diseño: viajan dentro del bundle, que cualquiera puede
// leer. Lo que protege los datos es RLS en la base, no el secreto de estas
// llaves. La service_role NUNCA debe aparecer aqui ni en ninguna variable VITE_,
// porque salta todas las politicas.
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. ' +
    'En local van en .env.local; en el despliegue, como secretos del repo.'
  )
}

export const supabase = createClient(url, key, {
  auth: {
    // PKCE devuelve el codigo en la query (?code=), no en el fragmento. Importa
    // porque la app usa HashRouter y el fragmento ya esta ocupado por la ruta.
    flowType: 'pkce',
    detectSessionInUrl: true,
    persistSession: true,
    autoRefreshToken: true,
  },
})

/* Las columnas de `profiles` que el cliente puede leer, y nada mas.
 *
 * La tabla tiene veintiuna. Cinco no salen de aqui porque la base ya no las
 * deja leer con la llave publica —ver 20261101000002—: los dos hashes de
 * identidad y las tres notas de moderacion. El hash de la CURP era el peor:
 * una CURP se deriva de nombre y fecha de nacimiento, asi que el hash servia
 * para comprobar si una persona concreta tiene cuenta aqui.
 *
 * Las listas y los tipos van juntos a proposito. Si se separan, un dia
 * alguien agrega una columna al tipo, la pide, y la base responde con un
 * error de permisos que no dice nada util.
 */

/** Lo que ve cualquiera: el directorio de creadoras. */
export const COLUMNAS_PUBLICAS =
  'id,handle,display_name,bio,avatar_path,is_creator,verified,es_demo,identidad_verificada,created_at,baneado_at' as const

/** Lo de arriba mas el estado propio. Solo con sesion.
 *
 *  Escrita entera y no como PUBLICAS + el resto: supabase-js deduce el tipo
 *  del resultado leyendo la cadena, y solo puede si es un literal. Concatenada
 *  deja de serlo y el tipo se vuelve un error generico. */
export const COLUMNAS_PROPIAS =
  'id,handle,display_name,bio,avatar_path,is_creator,verified,es_demo,identidad_verificada,created_at,baneado_at,adult_confirmed_at,suspended_at,paises_bloqueados' as const

export type PerfilPublico = {
  id: string
  handle: string
  display_name: string
  bio: string | null
  avatar_path: string | null
  is_creator: boolean
  verified: boolean
  es_demo: boolean
  /** Escrita por el servicio de verificacion o por un admin al resolver. */
  identidad_verificada: boolean
  created_at: string
  baneado_at: string | null
}

export type Perfil = PerfilPublico & {
  adult_confirmed_at: string | null
  /** Marcada por un admin; el propio usuario no puede escribirla. El motivo
   *  y la fecha de fin se quedan del lado del panel. */
  suspended_at: string | null
  paises_bloqueados: string[]
}
