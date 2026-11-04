/* Reportar un clip o un perfil.
 *
 * Esto lo usa quien MIRA, no quien administra, asi que vive aparte de
 * `./admin`: lo contrario anclaba el panel entero al paquete principal solo
 * porque el dialogo de reportar necesitaba esta lista de motivos.
 *
 * La cola de moderacion que recibe estos reportes si esta en `./admin`, y asi
 * debe ser: son los dos lados de la misma funcion, y solo uno lo abre todo el
 * mundo.
 */
import { supabase } from './supabase'

export type MotivoReporte =
  | 'menor_de_edad' | 'no_consentido' | 'violencia'
  | 'contenido_ilegal' | 'derechos_autor' | 'spam' | 'otro'

export async function reportar(
  objetivo: { clip?: string; perfil?: string },
  motivo: MotivoReporte, comentario?: string,
) {
  const { data, error } = await supabase.rpc('reportar', {
    p_clip: objetivo.clip ?? null, p_perfil: objetivo.perfil ?? null,
    p_motivo: motivo, p_comentario: comentario ?? null,
  })
  if (error) return { error: error.message }
  return data as { ok: boolean; repetido: boolean }
}

export const MOTIVOS: { v: MotivoReporte; t: string; ayuda: string }[] = [
  { v: 'menor_de_edad',    t: 'Parece una persona menor de edad',
    ayuda: 'Lo revisamos de inmediato y con prioridad sobre todo lo demás.' },
  { v: 'no_consentido',    t: 'Se publicó sin consentimiento',
    ayuda: 'Alguien aparece aquí sin haber aceptado que se publicara.' },
  { v: 'violencia',        t: 'Violencia o daño real', ayuda: '' },
  { v: 'contenido_ilegal', t: 'Otro contenido ilegal', ayuda: '' },
  { v: 'derechos_autor',   t: 'Es mío y lo subieron sin permiso',
    ayuda: 'Si eres la persona titular, dínoslo en el comentario.' },
  { v: 'spam',             t: 'Spam o engaño', ayuda: '' },
  { v: 'otro',             t: 'Otra cosa', ayuda: 'Cuéntanos qué pasa.' },
]
