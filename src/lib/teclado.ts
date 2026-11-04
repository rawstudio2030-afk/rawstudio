/* Escape cierra.
 *
 * Todos los diálogos del sitio se cierran pulsando el velo de atrás, que es un
 * gesto de ratón. Sin su equivalente de teclado, quien llega a un diálogo con
 * Tab entra y no sale: el foco se queda dentro de una capa que tapa la página
 * y no hay ninguna tecla que la quite.
 *
 * Estaba resuelto en un solo sitio —el diálogo de confirmación del panel— y
 * copiado en ninguno más, así que los otros cuatro no salían. Esto es ese
 * mismo efecto con nombre, para que el siguiente diálogo lo tenga por traerlo
 * en una línea y no por acordarse.
 */
import { useEffect, type KeyboardEvent as TeclaReact } from 'react'

/** Llama a `cierra` cuando se pulsa Escape, mientras `abierto` sea cierto.
 *
 *  Se engancha a `window` y no al nodo del diálogo porque el foco puede estar
 *  en cualquier parte —en un campo de dentro, o todavía fuera si el diálogo
 *  acaba de abrirse— y el evento tiene que llegar igual. */
export function useEscape(abierto: boolean, cierra: () => void) {
  useEffect(() => {
    if (!abierto) return
    const fuga = (e: KeyboardEvent) => { if (e.key === 'Escape') cierra() }
    window.addEventListener('keydown', fuga)
    return () => window.removeEventListener('keydown', fuga)
  }, [abierto, cierra])
}

/** El último recurso: hacer pulsable con teclado algo que NO puede ser un
 *  botón ni un enlace.
 *
 *  Existe por un solo caso real: el renglón de una tabla del panel. Un `<tr>`
 *  no admite envolverse en un `<button>` —rompe la tabla— y la fila entera es
 *  la que abre la ficha, no una celda. Para todo lo demás está `Pulsable`: si
 *  dudas, no es esto.
 *
 *  Reescribe a mano lo que el navegador ya trae: foco, Enter y Espacio (y
 *  Espacio hay que frenarlo, o desplaza la página). Por eso es el último
 *  recurso y no el patrón. */
export function tecladoComoBoton(al: () => void) {
  return {
    role: 'button',
    tabIndex: 0,
    onClick: al,
    onKeyDown: (e: TeclaReact<HTMLElement>) => {
      if (e.key !== 'Enter' && e.key !== ' ') return
      e.preventDefault()
      al()
    },
  } as const
}
