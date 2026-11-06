/* Iconos de linea, dibujados a mano.
 *
 * No se agrega una libreria: serian cientos de iconos para usar once, y
 * ninguna trae exactamente estos conceptos —marca de agua con nombre, fecha de
 * retiro, bloqueo por pais— asi que igual habria que dibujarlos.
 *
 * Todos comparten trazo de 1.5 en un lienzo de 24, sin relleno y en
 * currentColor, para que hereden el verde o el cian de su seccion y encajen
 * con los simbolos geometricos que ya usa la barra inferior.
 */

import { Hervido } from './Hervor'

const TRAZOS: Record<string, string> = {
  // ---- Formas de ganar ----
  /** Etiqueta de precio: se compra una vez y es tuya. */
  // El punto es un circulo de verdad y no un trazo de longitud cero: aquello
  // solo se ve si el navegador respeta el remate redondo, y no todos lo hacen.
  etiqueta: 'M13.5 2.5H21v7.5L10.5 20.5a2 2 0 0 1-2.8 0l-4.7-4.7a2 2 0 0 1 0-2.8ZM17.6 7a.9.9 0 1 1-1.8 0 .9.9 0 0 1 1.8 0Z',
  /** Reloj: la renta dura un rato. */
  reloj: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5.5l3.5 2',
  /** Ciclo: la suscripcion se renueva. */
  ciclo: 'M20 12a8 8 0 0 1-13.7 5.6M4 12a8 8 0 0 1 13.7-5.6M4 17.6V12h5.6M20 6.4V12h-5.6',
  /** Lapiz: contenido hecho a la medida. */
  lapiz: 'M4 20.5l1.2-4.2L16.6 4.9a2 2 0 0 1 2.8 0l1.7 1.7a2 2 0 0 1 0 2.8L9.7 20.8ZM15 6.5l3.5 3.5',
  /** Corazon: propina, no se pide nada a cambio. */
  corazon: 'M12 20.8C5.5 15 3 11.5 3 8.8A4.8 4.8 0 0 1 12 6.4a4.8 4.8 0 0 1 9 2.4c0 2.7-2.5 6.2-9 12Z',
  /** Renglones: texto. */
  texto: 'M4.5 3.5h15v17h-15zM8 8h8M8 12h8M8 16h5',

  // ---- Seguridad ----
  /** Ojo: quien mira deja su nombre encima. */
  ojo: 'M2 12s3.8-6.8 10-6.8S22 12 22 12s-3.8 6.8-10 6.8S2 12 2 12ZM12 14.6a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2Z',
  /** Globo tachado: no se ve en ciertos paises. */
  globo: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3c2.4 2.5 3.6 5.5 3.6 9s-1.2 6.5-3.6 9c-2.4-2.5-3.6-5.5-3.6-9S9.6 5.5 12 3ZM4 20 20 4',
  /** Reloj de arena: lo que subes puede caducar. */
  arena: 'M6.5 3h11M6.5 21h11M7.5 3c0 5 4.5 6 4.5 9s-4.5 4-4.5 9M16.5 3c0 5-4.5 6-4.5 9s4.5 4 4.5 9',
  /** Documento tachado: tu identificacion no se guarda. */
  documento: 'M14 3H7a1.5 1.5 0 0 0-1.5 1.5v15A1.5 1.5 0 0 0 7 21h10a1.5 1.5 0 0 0 1.5-1.5V7.5ZM14 3v4.5h4.5M4 20.5 20 4.5',
  /** Escudo con palomita: la edad se comprueba. */
  escudo: 'M12 2.5 20 6v6c0 5-3.6 8.2-8 9.5-4.4-1.3-8-4.5-8-9.5V6ZM8.8 11.8l2.4 2.4 4-4.5',

  // ---- Navegacion ----
  // Estos reemplazan a los glifos Unicode de la barra, el riel y el estudio
  // (▶ ▤ ◆ ✦ ✉ ● → ⚙ ↑ $ ↓). Un glifo se pinta distinto en cada sistema, dos
  // ya necesitaban un parche para no salir como emoji, y ninguno iba con los
  // once de arriba. Mismo trazo, mismo lienzo.
  /** Explorar. */
  play: 'M7 5v14l11.5-7Z',
  /** Biblioteca: dos lomos y uno recargado. */
  biblioteca: 'M4 4h4v16H4zM10 4h4v16h-4zM16 5l3.7-1 3.8 14.6-3.7 1Z',
  /** Estudio: la claqueta. */
  estudio: 'M3.5 9h17v11h-17zM3.5 9l2-4.5h14l1 4.5M8.5 4.5l2 4.5M13 4.5l2 4.5',
  /** Publicar: la chispa. */
  chispa: 'M12 3c.6 4.5 3.5 7.4 8 8-4.5.6-7.4 3.5-8 8-.6-4.5-3.5-7.4-8-8 4.5-.6 7.4-3.5 8-8Z',
  /** Mensajes. */
  sobre: 'M3 6.5h18v11H3zM3 7l9 6.5L21 7',
  /** Yo. */
  persona: 'M12 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM4.5 20.5c1-4 3.8-6 7.5-6s6.5 2 7.5 6',
  /** Entrar: la puerta y la flecha hacia dentro. */
  entrar: 'M13.5 3H20v18h-6.5M3.5 12h11M11 8.5l3.5 3.5-3.5 3.5',
  /** Panel: el engrane, como dial con ocho marcas. */
  engrane: 'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4ZM12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1',
  /** Subir un clip: la bandeja y la flecha. */
  subir: 'M4 15.5v3.5a1.5 1.5 0 0 0 1.5 1.5h13a1.5 1.5 0 0 0 1.5-1.5v-3.5M12 15V4M7.5 8.5 12 4l4.5 4.5',
  /** Dinero: el billete. */
  dinero: 'M3 7h18v10H3zM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  /** Cuenta para cobrar: el banco. */
  banco: 'M3 10l9-5.5L21 10M4.5 10v8M9.5 10v8M14.5 10v8M19.5 10v8M3 20h18',

  // ---- Portada: «Como funciona» y «Formas de ganar» ----
  /** Crear cuenta: una persona y el signo de mas. */
  personaMas: 'M10 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM3 20.5c.9-3.8 3.4-6 7-6s6.1 2.2 7 6M19 7.5v6M16 10.5h6',
  /** Subir un video: la nube y la flecha. */
  nubeSubir: 'M7 18.5a4.6 4.6 0 0 1-.7-9.15A6.2 6.2 0 0 1 18.2 9.6 4.5 4.5 0 0 1 17.5 18.5ZM12 16v-6M9.2 12.6 12 9.8l2.8 2.8',
  /** Suscripcion: la corona. */
  corona: 'M3.5 8.5l4.5 4 4-6.5 4 6.5 4.5-4-1.6 10.5H5.1ZM5.5 21h13',
  /** Ganancia: barras que suben. */
  grafica: 'M4 20.5h16M6.5 20.5v-5M11.5 20.5v-8.5M16.5 20.5V9M5 9l5-3.8 3.2 2.9L19 3.5M15.8 3.5H19v3.2',
}

export type NombreIcono = keyof typeof TRAZOS

/** `hierve` deforma el icono con ruido en vez de redibujarlo. Estos once
 *  iconos estan hechos de cadenas `d` con arcos, y en un arco hay numeros que
 *  no son coordenadas —los de las banderas—: moverlos no despeina el trazo,
 *  lo rompe. Con el filtro no hace falta rehacerlos.
 *
 *  Necesita <FiltrosHervor/> en algun lugar de la pagina; sin eso el
 *  `url(#hervor-n)` no encuentra nada y el icono se ve, pero quieto. */
export default function Icono({ nombre, tam = 22, hierve = false }: {
  nombre: string; tam?: number; hierve?: boolean
}) {
  const d = TRAZOS[nombre]
  if (!d) return null
  const trazos = d.split('M').filter(Boolean).map((p, i) => <path key={i} d={'M' + p} />)
  return (
    <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5}
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden style={{ flex: '0 0 auto', overflow: 'visible' }}>
      {hierve ? <Hervido>{trazos}</Hervido> : trazos}
    </svg>
  )
}
