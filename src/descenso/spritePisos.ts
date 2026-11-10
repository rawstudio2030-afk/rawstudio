/* Iconos de los pisos de abajo, mas el filtro «wobble» del lapiz graso. Viaja con el chunk de los pisos.
 *
 * Iconos de contorno de «El descenso» (docs/diseno/descenso/index.html): SVG
 * originales de la maqueta, sin dependencias. Es una cadena estatica y de
 * confianza (no entra nada del usuario), por eso se inyecta tal cual dentro de
 * un <svg> oculto; los iconos se usan con <use href="#i-nombre">. */
export const SPRITE_PISOS = `<symbol id="i-candle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M9.2 12h5.6V21H9.2z"/>
    <path d="M9.2 14c1.3.8 4.3.8 5.6 0"/>
    <path d="M12 12c0-2.2 1.7-3.3 1.7-4.8S12 5 12 5s-1.7 1-1.7 2.2 1.7 2.6 1.7 4.8z" fill="currentColor" opacity=".9"/>
  </symbol>
<symbol id="i-chain" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="2" y="6.2" width="11" height="6.2" rx="3.1" transform="rotate(-32 7.5 9.3)"/>
    <rect x="11" y="11.6" width="11" height="6.2" rx="3.1" transform="rotate(-32 16.5 14.7)"/>
  </symbol>
<symbol id="i-crop" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="6" cy="6.8" r="2.6"/>
    <path d="M8.5 6.8H18c.7 0 1.3.6 1.3 1.3V16"/>
    <path d="M17.6 16h4v4.2h-5.4V17.5"/>
  </symbol>
<symbol id="i-door" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4.8 21V10.6C4.8 6.4 8 3.2 12 3.2S19.2 6.4 19.2 10.6V21"/>
    <path d="M7.2 21V10.8c0-2.7 2.15-4.9 4.8-4.9s4.8 2.2 4.8 4.9V21"/>
    <path d="M4.8 21h14.4"/>
    <circle cx="14.7" cy="13.8" r=".9" fill="currentColor" stroke="none"/>
  </symbol>
<symbol id="i-enlarger" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M6 28h20"/>
    <path d="M10.5 28V8.5"/>
    <rect x="13.2" y="5" width="11.5" height="7.2" rx="1"/>
    <path d="M16.5 12.2 14 18h10.4l-2.6-5.8"/>
    <path d="M15.4 18h7.4v2.2h-7.4z"/>
    <path d="M12.4 24.5h13.2"/>
  </symbol>
<symbol id="i-key" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="7.5" cy="12" r="4"/>
    <circle cx="7.5" cy="12" r="1.25"/>
    <path d="M11.5 12h9.5"/>
    <path d="M17.5 12v3.2M20.2 12v2.4"/>
  </symbol>
<symbol id="i-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="5" y="10.5" width="14" height="10" rx="1.2"/>
    <path d="M8 10.5V7.2a4 4 0 0 1 8 0v3.3"/>
    <circle cx="12" cy="15.4" r="1" fill="currentColor" stroke="none"/>
    <path d="M12 16.4v2"/>
  </symbol>
<symbol id="i-loupe" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="14" cy="14" r="8.2"/>
    <circle cx="14" cy="14" r="5"/>
    <path d="m20.2 20.2 7 7"/>
    <path d="M11.2 11.4c1.2-1.3 3.2-1.8 4.8-1.2"/>
  </symbol>
<symbol id="i-ring" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    <circle cx="12" cy="14.2" r="6"/>
    <circle cx="12" cy="5.4" r="2.1"/>
  </symbol>
<symbol id="i-shackle" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="1.8" y="11.2" width="8.6" height="7.2" rx="3.4"/>
    <rect x="13.6" y="11.2" width="8.6" height="7.2" rx="3.4"/>
    <path d="M10.4 14.8h3.2"/>
    <path d="M6.2 11.3V8.6A2.6 2.6 0 0 1 10.6 6.8"/>
    <path d="M17.8 11.3V8.6A2.6 2.6 0 0 0 13.4 6.8"/>
  </symbol>
<symbol id="i-speaker" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="4" y="3.5" width="16" height="17" rx="2"/>
    <circle cx="12" cy="14.2" r="4"/>
    <circle cx="12" cy="14.2" r="1.4" fill="currentColor" stroke="none"/>
    <circle cx="12" cy="7.2" r="1.1"/>
  </symbol>
<symbol id="i-spot" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M9 4h6l2 4H7z"/>
    <path d="M12 8v3"/>
    <path d="m8 21 4-10 4 10"/>
    <path d="M7 21h10"/>
  </symbol>
<symbol id="i-stairs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 20h5v-4h5v-4h5V8h1"/>
    <path d="M4 20V4"/>
  </symbol>
<symbol id="i-vinyl" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    <circle cx="12" cy="12" r="8.5"/>
    <circle cx="12" cy="12" r="2.2"/>
    <circle cx="12" cy="12" r=".7" fill="currentColor" stroke="none"/>
    <path d="M14.2 6.6a6.4 6.4 0 0 1 3.3 3.2M6.5 14.4a6.4 6.4 0 0 0 3 3.3"/>
  </symbol>
<symbol id="i-wave-eq" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
    <path d="M4 14v-4M8 18V6M12 16V8M16 19V5M20 14v-4"/>
  </symbol>
<filter id="wobble">
    <feTurbulence type="turbulence" baseFrequency="0.05" numOctaves="2" seed="4" result="t"/>
    <feDisplacementMap in="SourceGraphic" in2="t" scale="1.6"/>
  </filter>`
