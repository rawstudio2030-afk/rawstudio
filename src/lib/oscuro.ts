/* El cuarto oscuro (−2) de «El descenso», para las pantallas de VER Y ELEGIR:
 * Explorar, la ficha de un clip, el perfil de una creadora y la biblioteca.
 *
 * Laboratorio fotografico: fondo casi negro con un resplandor de luz de
 * seguridad arriba, hoja de contactos de papel, precios a lapiz graso. La luz
 * roja (safelight) va SOLO en marcos, precios, candados, insignias y el boton
 * principal: el reproductor sigue sobrio (fondo plano y sin cromo decorativo).
 *
 * Los hex salen de `PISO.oscuro` (`diseño.ts`); aqui no hay colores nuevos.
 */
import type { CSSProperties } from 'react'
import { BOTON, PISO } from './diseño'

const O = PISO.oscuro

/** El fondo de la pantalla: un resplandor de luz roja arriba que se apaga
 *  antes de la rejilla, sobre el negro del laboratorio. */
export const FONDO_OSCURO =
  `radial-gradient(ellipse 90% 340px at 50% 0, rgba(179,18,27,.22), transparent 75%), ${O.vacio}`

/** El marco de un fotograma: el «rebate» oscuro de la tira, con un filete de papel. */
export const MARCO_FOTOGRAMA: CSSProperties = {
  border: '1px solid rgba(244,238,228,.16)', background: '#141010',
}

/** Boton principal del cuarto oscuro: papel sobre safelight apagado (6.0:1, AA).
 *  El «lit» (`#D4212C`) daria 4.49 y falla por 0.01. */
export const BOTON_OSCURO: CSSProperties = {
  border: '1px solid #6E0A10', color: BOTON.oscuro.texto, background: BOTON.oscuro.fondo,
  boxShadow: '0 8px 22px rgba(179,18,27,.3)',
  font: `600 13px/1 ${'Barlow, \'Space Grotesk\', system-ui, sans-serif'}`, letterSpacing: '.14em',
  textTransform: 'uppercase',
}

/** Boton secundario: contorno de papel, sin relleno. */
export const BOTON_OSCURO_SUAVE: CSSProperties = {
  border: '1px solid rgba(244,238,228,.3)', color: O.papel, background: 'rgba(8,4,5,.4)',
}
