/* Portada de un clip con vista previa al pasar el mouse.
 *
 * NO reproduce el video. Los clips viven en un bucket privado y su URL firmada
 * solo se entrega a quien tiene acceso; previsualizar el video de verdad seria
 * regalar exactamente lo que se cobra. En su lugar recorre una tira de seis
 * fotogramas sacados del propio video, que insinuan el movimiento sin ser el
 * contenido.
 *
 * Solo pasa en escritorio: en un telefono no hay "pasar el mouse", y disparar
 * la animacion al tocar robaria el toque que abre el clip.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { CUADROS, MS_POR_CUADRO } from '../lib/miniatura'

export default function TarjetaClip({ portada, tira, children, alTocar }: {
  portada: string
  tira: string | null
  children?: ReactNode
  alTocar?: () => void
}) {
  const [cuadro, setCuadro] = useState<number | null>(null)
  const reloj = useRef<number | null>(null)

  useEffect(() => () => { if (reloj.current) clearInterval(reloj.current) }, [])

  const entra = () => {
    if (!tira || reloj.current) return
    // La imagen se pide al entrar y no al pintar la tarjeta: en una
    // cuadricula de veinte, cargar veinte tiras que quiza nadie mire seria
    // gastar el ancho de banda de la persona por adelantado.
    const img = new Image()
    img.src = tira
    setCuadro(0)
    reloj.current = window.setInterval(
      () => setCuadro(c => ((c ?? 0) + 1) % CUADROS), MS_POR_CUADRO)
  }

  const sale = () => {
    if (reloj.current) { clearInterval(reloj.current); reloj.current = null }
    setCuadro(null)
  }

  const animando = cuadro !== null && !!tira

  return (
    <div
      onClick={alTocar}
      onMouseEnter={entra}
      onMouseLeave={sale}
      style={{
        aspectRatio: '3/4', position: 'relative', overflow: 'hidden',
        cursor: alTocar ? 'pointer' : undefined,
        // La tira son seis cuadros apilados: el fondo mide 600% de alto y se
        // desplaza de uno en uno. Sin transicion, porque un cuadro que se
        // funde con el siguiente se ve borroso, no en movimiento.
        backgroundImage: `url("${animando ? tira : portada}")`,
        backgroundSize: animando ? '100% 600%' : 'cover',
        backgroundPosition: animando
          ? `center ${(cuadro! / (CUADROS - 1)) * 100}%`
          : 'center',
      }}>
      {children}
    </div>
  )
}
