/* La escena de Miami fija detras de una pantalla, con su velo.
 *
 * Es `position: fixed` y no `absolute` a proposito: la pagina crece con su
 * contenido (un registro con cuatro casillas, una pagina de venta de seis mil
 * pixeles) y con `absolute` la escena se estiraria a toda esa altura y las
 * palmeras acabarian cortadas por los lados. Fija, siempre mide la pantalla.
 *
 * `denso` sube el velo para las paginas de mucho texto: sobre una escena con
 * ventanas encendidas, un parrafo largo no se lee.
 */
import FondoMiami from './FondoMiami'

export default function FondoFijo({ denso = false }: { denso?: boolean }) {
  return (
    <div aria-hidden className="pagina-miami-fondo">
      <FondoMiami />
      <div className={denso ? 'pagina-miami-velo pagina-miami-velo-denso' : 'pagina-miami-velo'} />
    </div>
  )
}
