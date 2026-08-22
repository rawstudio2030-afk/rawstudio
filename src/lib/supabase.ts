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

export type Perfil = {
  id: string
  handle: string
  display_name: string
  bio: string | null
  avatar_path: string | null
  is_creator: boolean
  verified: boolean
  adult_confirmed_at: string | null
  // Marcadas por un admin; el propio usuario no puede escribirlas.
  suspended_at: string | null
  suspended_reason: string | null
  // Escritas por el servicio de verificacion o por un admin al resolver.
  identidad_verificada: boolean
  identidad_verificada_at: string | null
  paises_bloqueados: string[]
  created_at: string
  updated_at: string
}
