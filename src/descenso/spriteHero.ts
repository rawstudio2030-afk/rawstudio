/* Iconos del piso de llegada (Collins): los unicos que el primer paint necesita.
 *
 * Iconos de contorno de «El descenso» (docs/diseno/descenso/index.html): SVG
 * originales de la maqueta, sin dependencias. Es una cadena estatica y de
 * confianza (no entra nada del usuario), por eso se inyecta tal cual dentro de
 * un <svg> oculto; los iconos se usan con <use href="#i-nombre">. */
export const SPRITE_HERO = `<symbol id="i-coupe" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M5 4.8h14L16.6 10A4.8 4.8 0 0 1 12 13.8 4.8 4.8 0 0 1 7.4 10L5 4.8z"/>
    <path d="M12 13.8V19"/>
    <path d="M8.5 20.6h7"/>
  </symbol>
<symbol id="i-fan" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 20V4"/>
    <path d="M12 20 5 9.5"/>
    <path d="M12 20 19 9.5"/>
    <path d="M12 20 7.4 6.4"/>
    <path d="M12 20 16.6 6.4"/>
    <circle cx="12" cy="20" r="1.2" fill="currentColor" stroke="none"/>
  </symbol>`
