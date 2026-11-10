/* El calabozo (−3) de «El descenso», para las pantallas de TRIBUTO Y CUENTA:
 * la billetera, las ganancias, retirar, el cobro y las herramientas de quien
 * publica (subir, gestionar, verificar, perfil).
 *
 * Oxblood + ambar + hueso sobre piedra negra. NO es una mazmorra entera: las
 * herramientas son UI clara y densa, y por eso aqui solo cambian el fondo y el
 * acento; el resto sigue siendo `COLOR` (marfil sobre navy en las superficies).
 *
 * Los hex salen de `PISO.calabozo` (`diseño.ts`); aqui no hay colores nuevos.
 */
import type { CSSProperties } from 'react'
import { BOTON, PISO } from './diseño'

const K = PISO.calabozo

/** El fondo: brasa baja arriba y piedra negra hacia abajo. */
export const FONDO_CALABOZO =
  `radial-gradient(ellipse at 50% 0%, rgba(80,20,10,.35), transparent 50%), linear-gradient(180deg, #100c0a, ${K.profundo})`

/** Boton principal del calabozo: hueso sobre oxblood (6.2 a 8.3:1, AA). */
export const BOTON_CALABOZO: CSSProperties = {
  border: '1px solid #4A1014', color: BOTON.calabozo.texto, background: BOTON.calabozo.fondo,
}
