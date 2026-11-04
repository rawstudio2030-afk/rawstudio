/* Lo que se pulsa: un botón o un enlace, nunca un div.
 *
 * Antes de este archivo el sitio tenía 157 `onClick` y tres `<button>`. Todo
 * lo demás era un `div` o un `span` con `cursor: pointer`. Con el ratón se ve
 * igual y funciona igual, así que el problema no salta a la vista: lo que pasa
 * es que un `div` no recibe foco ni responde a Enter, y no aparece en la lista
 * de controles que recorre un lector de pantalla.
 *
 * Medido en la portada antes del cambio: siete elementos enfocables en toda la
 * página, y los siete eran el acordeón de preguntas, que es `<details>` nativo.
 * Ninguno de los diecisiete controles de verdad. Quien navega con teclado podía
 * abrir el FAQ y nada más — no podía registrarse.
 *
 * El arreglo no es ponerle `tabIndex` y `onKeyDown` a cada div: eso es
 * reescribir a mano lo que el navegador ya hace, y hay que acordarse de Enter,
 * de Espacio, del estado deshabilitado y del papel que anunciar. Es usar el
 * elemento correcto:
 *
 *   `Pulsable`  hace algo aquí mismo  →  <button type="button">
 *   `Enlace`    lleva a otra pantalla →  <a href> (Link del router)
 *
 * La diferencia importa más allá del foco: un enlace se abre en pestaña nueva
 * con el clic de en medio, se copia con el botón derecho y el lector de
 * pantalla lo anuncia como destino y no como acción.
 *
 * ---------- Por qué siguen llevando `style` en línea ----------
 *
 * Porque el proyecto entero se estila así, y porque un atributo `style` gana a
 * un selector de clase: la clase `.pulsable` solo borra la apariencia que el
 * navegador le regala a un botón —su fondo gris, su borde, su tipografía—, y
 * cada llamada sigue mandando en cómo se ve. Así un `<button>` puede quedar
 * idéntico al `<span>` que reemplaza, que es justo lo que se quiere: este
 * cambio no rediseña nada.
 */
import type { CSSProperties, MouseEvent, ReactNode } from 'react'
import { Link } from 'react-router-dom'

function clases(extra?: string) {
  return extra ? `pulsable ${extra}` : 'pulsable'
}

/** Un botón de verdad, con la pinta que le des.
 *
 *  `rotulo` es para cuando el contenido no se puede leer en voz alta —un icono,
 *  una flecha, un número suelto—: se convierte en `aria-label`. Si el texto
 *  visible ya dice lo que hace, déjalo vacío.
 *
 *  `activado` es para las pastillas de filtro y demás interruptores: pinta
 *  `aria-pressed`, que es cómo un lector de pantalla dice «este está puesto».
 *  El color de fondo lo dice para quien ve; esto lo dice para quien no. */
export function Pulsable({
  al, children, style, rotulo, className, titulo,
  activo = true, activado, tipo = 'button', alEntrar, alSalir,
}: {
  al?: () => void
  children: ReactNode
  style?: CSSProperties
  rotulo?: string
  className?: string
  titulo?: string
  activo?: boolean
  activado?: boolean
  tipo?: 'button' | 'submit'
  alEntrar?: () => void
  alSalir?: () => void
}) {
  return (
    <button
      type={tipo}
      onClick={al}
      onMouseEnter={alEntrar}
      onMouseLeave={alSalir}
      disabled={!activo}
      aria-label={rotulo}
      aria-pressed={activado}
      title={titulo}
      className={clases(className)}
      style={style}
    >{children}</button>
  )
}

/** Un enlace de verdad, con la pinta que le des.
 *
 *  `al` es para el efecto que acompaña a la navegación —dejar apuntado el modo,
 *  cerrar un menú—, no para navegar: de eso se encarga `a`. */
export function Enlace({
  a, al, children, style, rotulo, className, titulo, alEntrar, alSalir,
}: {
  a: string
  /** Recibe el evento porque a veces hay que frenar la burbuja: un enlace
   *  dentro de una etiqueta de casilla la marcaría al pulsarlo. */
  al?: (e: MouseEvent) => void
  children: ReactNode
  style?: CSSProperties
  rotulo?: string
  className?: string
  titulo?: string
  alEntrar?: () => void
  alSalir?: () => void
}) {
  return (
    <Link
      to={a}
      onClick={al}
      onMouseEnter={alEntrar}
      onMouseLeave={alSalir}
      aria-label={rotulo}
      title={titulo}
      className={clases(className)}
      style={style}
    >{children}</Link>
  )
}
