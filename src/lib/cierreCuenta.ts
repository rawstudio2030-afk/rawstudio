/* Que impide cerrar una cuenta, dicho en palabras.
 *
 * Convierte el diagnostico de solo lectura (`admin_diagnostico_cierre`) en una
 * lista de bloqueos legibles para cada una de las dos salidas:
 *  - ANONIMIZAR: la normal para una cuenta con historial. Conserva el historial.
 *  - ELIMINAR definitivamente: solo para una cuenta sin historial protegido.
 *
 * Es solo una ayuda para no pulsar a ciegas. El servidor vuelve a validar todo al
 * confirmar y es el que manda: si el diagnostico decia que se podia y el servidor
 * lo rechaza, ese rechazo tambien se muestra.
 *
 * Los enlaces solo aparecen cuando el destino SI puede resolver el bloqueo:
 * Verificacion resuelve una solicitud (y al resolverla se borran sus imagenes) y
 * Retiros resuelve un retiro. Para el resto no se inventa ningun atajo: en
 * particular no hay forma de borrar el libro, las compras, los retiros ni las
 * consultas «para poder eliminar».
 */
import { usd } from './dinero'
import { cuantos } from './plural'
import type { DiagnosticoCierre } from './admin'

export type Salida = 'anonimizar' | 'eliminar'

export type Bloqueo = {
  texto: string
  /** Pantalla del panel que SI resuelve este bloqueo. */
  enlace?: { ruta: string; etiqueta: string }
}

type Existente = Extract<DiagnosticoCierre, { existe: true }>

export function bloqueosDe(d: Existente, salida: Salida): Bloqueo[] {
  const b: Bloqueo[] = []
  const verbo = salida === 'anonimizar' ? 'anonimizar' : 'eliminar'

  if (d.es_propia) b.push({ texto: `Es tu propia cuenta: no puedes ${verbo}la.` })
  if (d.es_admin) {
    b.push({ texto: `Es administradora: primero hay que quitarle el privilegio (Cambiar rol), y luego se puede ${verbo}.` })
  }
  if (salida === 'anonimizar' && d.anonimizada) {
    b.push({ texto: 'Ya está anonimizada.' })
  }

  if (salida === 'anonimizar') {
    if (d.saldo !== 0) {
      b.push({ texto: `Tiene un saldo de ${usd(d.saldo)} y debe quedar en ${usd(0)}. Es dinero de la persona: resuélvelo (retiro o devolución) antes de anonimizar.` })
    }
    if (d.retiros_abiertos > 0) {
      b.push({
        texto: `Tiene ${cuantos(d.retiros_abiertos, 'retiro')} sin resolver (pendiente o aprobado).`,
        enlace: { ruta: '/admin/retiros', etiqueta: 'Ir a Retiros' },
      })
    }
  }

  if (d.verificaciones_con_imagenes > 0) {
    if (d.verificaciones_sin_resolver > 0) {
      b.push({
        texto: 'Tiene una verificación de identidad sin resolver y sus imágenes siguen guardadas. Al aprobarla o rechazarla, las imágenes se borran solas en segundos.',
        enlace: { ruta: '/admin/verificacion', etiqueta: 'Ir a Verificación' },
      })
    } else {
      b.push({ texto: 'Sus imágenes de verificación ya están resueltas y todavía no se borran: se borran solas en la siguiente pasada automática. Vuelve a revisar en un rato.' })
    }
  }

  if (salida === 'eliminar' && !d.es_demo) {
    if (d.historial.length > 0) {
      const lista = d.historial.map(h => `${h.clase} (${h.cuantos})`).join(', ')
      b.push({ texto: `Tiene historial que se conserva y no se puede borrar: ${lista}. Para cerrar esta cuenta usa Anonimizar.` })
    }
  }
  if (salida === 'eliminar' && d.clips_con_historial > 0) {
    b.push({ texto: `Tiene ${cuantos(d.clips_con_historial, 'clip')} con compras, rentas, reportes o reembolsos, que no se destruyen. Para cerrar esta cuenta usa Anonimizar.` })
  }
  return b
}
