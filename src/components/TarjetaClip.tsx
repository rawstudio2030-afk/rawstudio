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
import { Enlace } from './Pulsable'

export default function TarjetaClip({ portada, tira, children, a }: {
  portada: string
  tira: string | null
  children?: ReactNode
  /** A dónde lleva la tarjeta. Sin esto es una portada y ya, no se pulsa. */
  a?: string
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

  // `display: block` porque un <a> es en linea por defecto y la tarjeta
  // necesita ser una caja: de ahi cuelgan la proporcion 3/4 y los rotulos
  // posicionados de dentro.
  const pinta = {
    display: 'block', aspectRatio: '3/4', position: 'relative', overflow: 'hidden',
    cursor: a ? 'pointer' : undefined,
    // La tira son seis cuadros apilados: el fondo mide 600% de alto y se
    // desplaza de uno en uno. Sin transicion, porque un cuadro que se
    // funde con el siguiente se ve borroso, no en movimiento.
    backgroundImage: `url("${animando ? tira : portada}")`,
    backgroundSize: animando ? '100% 600%' : 'cover',
    backgroundPosition: animando
      ? `center ${(cuadro! / (CUADROS - 1)) * 100}%`
      : 'center',
  } as const

  // Sin destino no hay nada que pulsar, y un enlace sin destino seria un
  // elemento mas que recorrer con el teclado para no llegar a ningun lado.
  if (!a) return <div style={pinta}>{children}</div>

  return (
    <Enlace a={a} alEntrar={entra} alSalir={sale} style={pinta}>
      {children}
    </Enlace>
  )
}
