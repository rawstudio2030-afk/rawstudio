/* Como se presenta un clip en una rejilla: el color de su marco, sus
 * insignias y su duracion.
 *
 * Lo comparten Explorar y el perfil de creadora. Vivia dentro de Explorar, y
 * el perfil iba a necesitar exactamente lo mismo: dos copias de «que color es
 * un clip de suscriptoras» acaban desacordandose.
 *
 * El color dice de un vistazo que es: safelight lo que se paga, plata lo de
 * suscriptoras, ambar lo gratis.
 */
import type { Clip } from './clips'
import { PISO } from './diseño'

export type Tono = 'm' | 'c' | 'l'

/** `borde` es el color del marco y del trazo; `rgb` su version translucida;
 *  `relleno` y `texto` el par de una insignia SOLIDA (AA). Pago en safelight,
 *  suscriptoras en plata y lo gratis en ambar: los colores del cuarto oscuro. */
export const TONO: Record<Tono, { borde: string; rgb: string; relleno: string; texto: string }> = {
  m: { borde: PISO.oscuro.safelightLit, rgb: '212,33,44', relleno: PISO.oscuro.safelight, texto: PISO.oscuro.papel },
  c: { borde: PISO.oscuro.plata, rgb: '163,155,150', relleno: PISO.oscuro.plata, texto: PISO.oscuro.vacio },
  l: { borde: PISO.oscuro.ambar, rgb: '201,160,74', relleno: PISO.oscuro.ambar, texto: PISO.oscuro.vacio },
}

export type Rotulo = { tono: Tono; texto: string; icono?: string }

/** Que insignia lleva un clip. Un clip de pago se puede comprar y, si la
 *  creadora lo permite, rentar: la insignia dice PAGO y, aparte, RENTA. */
export function insignias(
  c: Pick<Clip, 'visibility' | 'renta_coins' | 'renta_horas'> & Partial<Pick<Clip, 'formato'>>,
): Rotulo[] {
  if (c.visibility === 'gratis') return [{ tono: 'l', texto: 'Gratis' }]
  if (c.visibility === 'suscriptores') return [{ tono: 'c', texto: 'Suscriptores', icono: 'estrella' }]
  const r: Rotulo[] = [{ tono: 'm', texto: 'Pago', icono: 'candado' }]
  if (c.renta_coins != null && c.renta_horas != null) r.push({ tono: 'm', texto: `Renta ${c.renta_horas} h` })
  if (c.formato === 'album') r.push({ tono: 'c', texto: 'Álbum' })
  return r
}

/** 125 s -> «2:05». */
export function duracion(s: number | null | undefined) {
  if (!s || s <= 0) return null
  return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`
}
