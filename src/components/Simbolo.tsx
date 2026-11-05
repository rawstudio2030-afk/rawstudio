/* El símbolo: un círculo con un triángulo de play dentro.
 *
 * Existía desde el principio y no se veía en ninguna parte del producto. Era
 * solo el favicon —una pestaña de 16 px— y desde hoy también el icono de la
 * app. O sea que RAWstudio tenía DOS marcas sin relación entre sí: el wordmark
 * dibujado a mano, y este círculo que nadie había visto nunca dentro del
 * sitio.
 *
 * Omar decidió ascenderlo. Esto es la pieza única de la que salen todas sus
 * apariciones.
 *
 * ---------- Por qué esto SÍ va en SVG y el wordmark no ----------
 *
 * Son tres formas geométricas: un círculo, un triángulo y nada más. En SVG
 * pesa lo que ocupa leerlo, es nítido a cualquier tamaño y toma el color de
 * quien lo monta.
 *
 * El wordmark no puede: es un dibujo a tinta escaneado, con grano y bordes
 * irregulares. Vectorizarlo lo alisaría hasta volverlo otro logo, o
 * reproduciría cada irregularidad con miles de nodos y pesaría más que el
 * PNG. Son dos marcas de naturaleza distinta y se tratan distinto.
 *
 * ---------- Las coordenadas son las mismas que las de public/favicon.svg ----------
 *
 * Lienzo de 100: círculo en (50,50) con radio 26 y trazo 6; triángulo
 * 41,39 → 60,50 → 41,61. También las copia scripts/tarjetas-sociales.py para
 * dibujar los iconos del teléfono.
 *
 * Tres sitios con los mismos números es una repetición de verdad, y se acepta
 * a sabiendas: el favicon lo pide el navegador como archivo suelto antes de
 * que exista JavaScript, y los iconos del teléfono los genera Python porque
 * es el único rasterizador de esta máquina. Ninguno de los dos puede importar
 * este archivo. Lo que sí se puede es que los tres lo digan.
 *
 * ---------- Encendido y apagado ----------
 *
 * Un tubo de neón sin corriente no desaparece: es cristal gris. Por eso el
 * símbolo tiene dos estados y el apagado es el normal.
 *
 * Encendido va solo donde algo está vivo. Si todo brillara siempre, el brillo
 * dejaría de significar nada y la pantalla sería el anuncio parpadeante que
 * este sitio no quiere parecer.
 */
import { COLOR } from '../lib/diseño'

export default function Simbolo({
  lado = 40,
  encendido = false,
  color = COLOR.acento,
  relleno = COLOR.dinero,
  opacidad = 1,
}: {
  lado?: number
  /** Con corriente: el aro y el triángulo a todo color, y un halo del color
   *  del aro. Sin ella, cristal gris. */
  encendido?: boolean
  color?: string
  relleno?: string
  opacidad?: number
}) {
  const aro = encendido ? color : COLOR.textoApagado
  const centro = encendido ? relleno : COLOR.textoTenue

  return (
    <svg
      width={lado} height={lado} viewBox="0 0 100 100"
      aria-hidden="true" focusable="false"
      style={{
        display: 'block',
        opacity: opacidad,
        // El halo pertenece a la luz: es el mismo color del aro, no una
        // sombra negra. Apagado no lleva ninguno.
        filter: encendido ? `drop-shadow(0 0 ${lado * 0.22}px ${color})` : undefined,
      }}>
      <circle cx="50" cy="50" r="26" fill="none" stroke={aro} strokeWidth="6" />
      <path d="M41 39l19 11-19 11z" fill={centro} />
    </svg>
  )
}
