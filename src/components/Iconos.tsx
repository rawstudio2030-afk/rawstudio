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
}

export type NombreIcono = keyof typeof TRAZOS

export default function Icono({ nombre, tam = 22 }: {
  nombre: string; tam?: number
}) {
  const d = TRAZOS[nombre]
  if (!d) return null
  return (
    <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5}
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden style={{ flex: '0 0 auto' }}>
      {d.split('M').filter(Boolean).map((p, i) => <path key={i} d={'M' + p} />)}
    </svg>
  )
}
