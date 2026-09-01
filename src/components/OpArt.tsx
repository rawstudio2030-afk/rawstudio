/* Op art y el ojo.
 *
 * El fondo son anillos concentricos deformados: la herencia de Bridget Riley
 * que la grafica acid y el neo-rave llevan usando decadas. Lo que marea no es
 * el color, es que los anillos NO son circulos —el radio se ondula con el
 * angulo—, asi que el ojo intenta seguir un patron que nunca cierra.
 *
 * El ojo de esta portada es el mismo de la intro, redibujado: parpados de
 * trazo grueso, rayado roto tipo linoleo, y el video de la intro recortado
 * dentro del iris para que la espiral magenta siga siendo la pupila.
 */
import { useMemo } from 'react'
import { Trazo } from './Hervor'
import { curvaEntre, circulo, curva, type Punto } from '../lib/hervor'
import { COLOR } from '../lib/diseño'

/* ---------- fondo ---------- */

/** Un anillo cuyo radio se ondula: `k` es cuantos bultos le salen y `fase`
 *  desde donde empiezan. Al ir corriendo la fase anillo por anillo, los
 *  bultos se desalinean y aparece la torsion. */
function anillo(r: number, k: number, fase: number, n = 56): Punto[] {
  return Array.from({ length: n }, (_, i) => {
    const a = i / n * Math.PI * 2
    const rr = r * (1 + .105 * Math.sin(k * a + fase))
    return [50 + Math.cos(a) * rr, 50 + Math.sin(a) * rr] as Punto
  })
}

/** Fondo hipnotico. Va DETRAS de texto, asi que se pinta apagado: a plena
 *  intensidad el titular deja de leerse, y un fondo que compite con el
 *  mensaje es un fondo que sobra.
 *
 *  No hierve. Se probo y son catorce contornos de 56 puntos redibujandose
 *  once veces por segundo detras de todo lo demas; el temblor casi no se nota
 *  a esa opacidad y el telefono lo paga completo. El movimiento aqui es un
 *  giro y un latido, que los resuelve la tarjeta grafica. */
export function FondoOpArt({ opacidad = .17, color = COLOR.acento, giro = 90 }: {
  opacidad?: number; color?: string; giro?: number
}) {
  const anillos = useMemo(() => {
    const salida: { d: string; c: string }[] = []
    // De afuera hacia adentro: cada anillo tapa al anterior y queda la diana.
    for (let i = 0; i < 15; i++) {
      const r = 78 - i * 5.1
      salida.push({
        d: curva(anillo(r, 3, i * .55), true),
        c: i % 2 ? COLOR.fondo : color,
      })
    }
    return salida
  }, [color])

  return (
    <svg aria-hidden viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice"
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        opacity: opacidad, pointerEvents: 'none',
      }}>
      <g className="opart-giro" style={{
        transformBox: 'fill-box', transformOrigin: 'center',
        animation: `girarLento ${giro}s linear infinite`,
      }}>
        <g className="opart-latido" style={{
          transformBox: 'fill-box', transformOrigin: 'center',
          animation: 'latir 9s ease-in-out infinite',
        }}>
          {anillos.map((a, i) => <path key={i} d={a.d} fill={a.c} />)}
        </g>
      </g>
    </svg>
  )
}

/* ---------- el ojo ---------- */

/* Lienzo del ojo. Todo lo de abajo esta en estas coordenadas. */
export const OJO = { ancho: 200, alto: 132, cx: 100, cy: 66, iris: 30 }

const ESQ_IZQ: Punto = [8, OJO.cy]
const ESQ_DER: Punto = [192, OJO.cy]

/** Silueta cerrada del ojo: parpado de arriba y, de regreso, el de abajo. */
function silueta(comba: number): Punto[] {
  const arriba = curvaEntre(ESQ_IZQ, ESQ_DER, -comba, 14)
  const abajo = curvaEntre(ESQ_DER, ESQ_IZQ, -comba * .74, 14)
  return [...arriba, ...abajo.slice(1, -1)]
}

/** Tres recortes circulares para el iris, en unidades de la caja del elemento
 *  (0 a 1), que es lo que entiende clip-path sobre una etiqueta de HTML.
 *  Se pintan una sola vez; los hace hervir la clase .ojo-recorte. */
export function RecorteIris() {
  const formas = useMemo(
    () => [0, 1, 2].map(i => {
      // El tembleque se calcula sobre el ANGULO, no sobre la coordenada. Con
      // veintidos puntos alrededor del circulo, una onda por coordenada cambia
      // de signo entre punto y punto y sale una estrella, no un circulo
      // dibujado a pulso. Por angulo, la onda recorre el contorno.
      const n = 22
      const pts = Array.from({ length: n }, (_, j) => {
        const a = j / n * Math.PI * 2
        const r = .47 + .016 * Math.sin(3 * a + i * 2.1)
                      + .009 * Math.sin(7 * a - i * 1.7)
        return [.5 + Math.cos(a) * r, .5 + Math.sin(a) * r] as Punto
      })
      return curva(pts, true)
    }), [])
  return (
    <svg aria-hidden width="0" height="0" style={{ position: 'absolute', width: 0, height: 0 }}>
      <defs>
        {formas.map((d, i) => (
          <clipPath key={i} id={`ojo-${i}`} clipPathUnits="objectBoundingBox">
            <path d={d} />
          </clipPath>
        ))}
      </defs>
    </svg>
  )
}

/** El ojo dibujado. Se pinta ENCIMA del video del iris, por eso no lleva
 *  fondo y deja pasar los clics. */
export function Ojo({ color = '#FFFFFF' }: { color?: string }) {
  // Rayado: parpados repetidos cada vez mas afuera, con el trazo cada vez mas
  // roto y mas tenue. Es como se sombrea en grabado —no hay grises, hay mas o
  // menos linea— y es lo que hace el video de la intro.
  const rayado = [
    { c: 52, g: '17 8',  o: .85, w: 3.2 },
    { c: 62, g: '11 11', o: .6,  w: 2.6 },
    { c: 72, g: '7 13',  o: .4,  w: 2.2 },
    { c: 82, g: '4 16',  o: .26, w: 1.8 },
  ]
  return (
    <svg viewBox={`0 0 ${OJO.ancho} ${OJO.alto}`} aria-hidden
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        pointerEvents: 'none', overflow: 'visible',
      }}>
      {rayado.map((r, i) => (
        <g key={i}>
          <Trazo pts={curvaEntre(ESQ_IZQ, ESQ_DER, -r.c, 16)} amplitud={2.4}
            grosor={r.w} guion={r.g} color={color} opacidad={r.o} semilla={11 + i * 7} />
          <Trazo pts={curvaEntre(ESQ_IZQ, ESQ_DER, r.c * .78, 16)} amplitud={2.4}
            grosor={r.w} guion={r.g} color={color} opacidad={r.o} semilla={61 + i * 7} />
        </g>
      ))}
      {/* El contorno, entero y grueso: es lo unico que no se rompe. */}
      <Trazo pts={silueta(44)} cerrado amplitud={2.2} grosor={4.2} color={color} semilla={3} />
      {/* Aro del iris, por dentro del contorno. */}
      <Trazo pts={circulo(OJO.cx, OJO.cy, OJO.iris, 26)} cerrado amplitud={1.8}
        grosor={3} color={color} semilla={29} />
    </svg>
  )
}
