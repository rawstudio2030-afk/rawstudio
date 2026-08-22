// Marca de agua con el nombre de quien mira.
//
// Es lo que promete la pagina de creadoras: "aparece, en movimiento, el nombre
// del suscriptor que lo esta viendo. Si graba, se graba a si mismo
// delatandose."
//
// QUE PROTEGE Y QUE NO — importa entenderlo antes de confiar en esto:
//
// SI protege contra la fuga mas comun: alguien graba la pantalla y comparte el
// video. La marca viaja dentro de la grabacion y señala la cuenta.
//
// NO protege contra alguien decidido: se puede ocultar con las herramientas del
// navegador antes de grabar, o recortar el video. Una marca infalsificable
// tendria que quemarse en el video del lado del servidor, uno distinto por
// espectador, lo que exige transcodificar por persona.
//
// Se mueve a proposito: una marca fija se recorta de un tajo.
import { useEffect, useState } from 'react'

type Props = { texto: string }

// Cuatro posiciones, rotando. Suficiente para que recortar implique perder
// partes del video en los cuatro bordes.
const POSICIONES = [
  { top: '12%', left: '8%' },
  { top: '34%', right: '8%' },
  { bottom: '28%', left: '10%' },
  { bottom: '12%', right: '12%' },
]

export default function MarcaDeAgua({ texto }: Props) {
  const [i, setI] = useState(0)

  useEffect(() => {
    // Cada 7 s: lo bastante seguido para aparecer en cualquier fragmento
    // compartido, lo bastante espaciado para no estorbar.
    const t = setInterval(() => setI(n => (n + 1) % POSICIONES.length), 7000)
    return () => clearInterval(t)
  }, [])

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        ...POSICIONES[i],
        // Sin eventos: no debe estorbar los controles del video.
        pointerEvents: 'none',
        zIndex: 3,
        font: "700 11px/1 'Space Mono', monospace",
        letterSpacing: 1.2,
        color: 'rgba(255,255,255,.42)',
        // Sombra en ambos sentidos para que se lea sobre claro y sobre oscuro.
        textShadow: '0 1px 3px rgba(0,0,0,.9), 0 -1px 3px rgba(0,0,0,.6)',
        transition: 'top .8s ease, left .8s ease, right .8s ease, bottom .8s ease',
        userSelect: 'none',
        mixBlendMode: 'difference',
      }}>
      {texto}
    </div>
  )
}
