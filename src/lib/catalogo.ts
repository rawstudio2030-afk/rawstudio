/* Como se presenta un clip en una rejilla: el color de su marco, sus
 * insignias y su duracion.
 *
 * Lo comparten Explorar y el perfil de creadora. Vivia dentro de Explorar, y
 * el perfil iba a necesitar exactamente lo mismo: dos copias de «que color es
 * un clip de suscriptoras» acaban desacordandose.
 *
 * El color dice de un vistazo que es: magenta lo que se paga, cian lo de
 * suscriptoras, lima lo gratis.
 */
import type { Clip } from './clips'

export type Tono = 'm' | 'c' | 'l'

export const TONO: Record<Tono, { borde: string; rgb: string }> = {
  m: { borde: '#FF4FE0', rgb: '255,43,209' },
  c: { borde: '#19E6FF', rgb: '0,229,255' },
  l: { borde: '#C8FF3D', rgb: '200,255,61' },
}

export type Rotulo = { tono: Tono; texto: string; icono?: string }

/** Que insignia lleva un clip. Un clip de pago se puede comprar y, si la
 *  creadora lo permite, rentar: la insignia dice PAGO y, aparte, RENTA. */
export function insignias(
  c: Pick<Clip, 'visibility' | 'renta_coins' | 'renta_horas'>,
): Rotulo[] {
  if (c.visibility === 'gratis') return [{ tono: 'l', texto: 'Gratis' }]
  if (c.visibility === 'suscriptores') return [{ tono: 'c', texto: 'Suscriptores', icono: 'estrella' }]
  const r: Rotulo[] = [{ tono: 'm', texto: 'Pago', icono: 'candado' }]
  if (c.renta_coins != null && c.renta_horas != null) r.push({ tono: 'm', texto: `Renta ${c.renta_horas} h` })
  return r
}

/** 125 s -> «2:05». */
export function duracion(s: number | null | undefined) {
  if (!s || s <= 0) return null
  return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`
}
