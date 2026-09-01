/* Pantalla 00 — Portada.
 *
 * Antes aqui vivia la intro: cuatro segundos de video y un pase automatico al
 * age gate. Servia para presentarse, no para explicar nada, y quien llegaba de
 * fuera se topaba con una puerta antes de saber a que puerta estaba tocando.
 *
 * Ahora es una portada de verdad —lo que hace el sitio, cuanto se queda una,
 * como se empieza— y la intro no se pierde: el video sigue ahi, recortado
 * dentro del iris del ojo. La espiral magenta que ya conocian es la pupila.
 *
 * El aire es el mismo del video: blanco y negro de alto contraste, un solo
 * color acido, trazo de linoleo y fondo de op art que se retuerce. Nada de
 * esto es imagen: son curvas que se redibujan once veces por segundo.
 */
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSesion } from '../lib/sesion'
import Wordmark from '../components/Wordmark'
import Portada from '../components/Portada'
import { FiltrosHervor, Borde } from '../components/Hervor'
import { FondoOpArt, Ojo, RecorteIris, OJO } from '../components/OpArt'
import { COLOR, LINEA, FUENTE } from '../lib/diseño'
import launchVideo from '../assets/launch.mp4'

/** Segundo del video donde ya se ve la espiral. */
const DESDE = 1.2

const CINTILLO = [
  '80% para ti', 'sin exclusividad', 'pagos por SPEI',
  'marca de agua con tu nombre', 'bloqueo por país', 'fecha de retiro',
]

export default function Portal() {
  const nav = useNavigate()
  const { sesion, perfil, cargando } = useSesion()

  // Quien ya entro y ya cruzo la puerta de edad no viene a leer la portada.
  useEffect(() => {
    if (cargando) return
    if (sesion && perfil?.adult_confirmed_at) nav('/clip', { replace: true })
  }, [cargando, sesion, perfil, nav])

  return (
    <div style={{
      minHeight: '100%', boxSizing: 'border-box',
      background: COLOR.fondo, color: COLOR.texto, fontFamily: FUENTE.ui,
      overflowX: 'hidden',
    }}>
      <FiltrosHervor />
      <RecorteIris />

      {/* ---------- portada ---------- */}
      <section className="portal-alto" style={{
        position: 'relative', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '46px 26px 34px', boxSizing: 'border-box', overflow: 'hidden',
      }}>
        <FondoOpArt opacidad={.26} />
        {/* Velo: sin esto el titular en Anton pelea contra los anillos y
            pierde. Mismo recurso que el age gate usa sobre la cortina. */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `radial-gradient(ellipse at 50% 40%, rgba(8,8,10,.18) 0%, rgba(8,8,10,.8) 55%, ${COLOR.fondo} 100%)`,
        }} />

        <div className="portal-marca"><Wordmark ancho={158} glow={18} /></div>

        {/* En celular esto es una columna; con ancho suficiente el ojo se pasa
            al lado y el texto queda a su izquierda. No es capricho: apilado,
            en una pantalla de portatil de 720 de alto, los botones quedaban
            fuera de vista y una portada cuyo boton no se ve no sirve de nada. */}
        <div className="portal-cuerpo">
          <div className="portal-ojo">
            {/* El video va dentro del iris y el dibujo encima: comparten centro
                por construccion, asi que nunca se descuadran. */}
            <div style={{
              position: 'relative', width: '100%',
              aspectRatio: `${OJO.ancho} / ${OJO.alto}`,
            }}>
              {/* El recorte va en el contenedor y el acercamiento en el video.
                  Al reves no funciona: clip-path se aplica ANTES de la
                  transformacion, asi que escalar el video escalaba tambien su
                  recorte y el iris crecia en vez de acercarse.
                  El video se agranda porque su ojo esta al centro y encogido; a
                  tamaño natural cabia el ojo entero dentro del iris y se veia
                  un ojo diminuto dentro de otro. */}
              <div className="ojo-recorte" style={{
                position: 'absolute', left: '50%', top: '50%',
                transform: 'translate(-50%,-50%)',
                width: `${OJO.iris * 2 / OJO.ancho * 100}%`, aspectRatio: '1',
                overflow: 'hidden',
              }}>
                <video
                  src={launchVideo} autoPlay muted playsInline
                  // El video dura 4 s y el primer segundo y cuarto es el ojo
                  // todavia cerrado: dentro del iris eso se ve como un hueco
                  // negro, no como un parpadeo. Se arranca y se repite desde
                  // que la espiral ya esta ahi.
                  //
                  // Sin `loop` a proposito: con loop el salto lo hace el
                  // navegador al cuadro cero y se alcanza a ver el negro. Con
                  // `ended` el salto lo damos nosotros al segundo que
                  // queremos.
                  //
                  // Si el navegador bloquea la reproduccion automatica, queda
                  // congelado en ese mismo segundo. La espiral no gira, pero
                  // el ojo tiene iris; con el cuadro cero se quedaria hueco.
                  onLoadedMetadata={e => { e.currentTarget.currentTime = DESDE }}
                  onEnded={e => {
                    e.currentTarget.currentTime = DESDE
                    void e.currentTarget.play().catch(() => {})
                  }}
                  style={{
                    width: '100%', height: '100%', objectFit: 'cover',
                    // Un poco de acercamiento nada mas. A 2.1 se entraba al
                    // centro de la espiral, que es casi todo negro, y el iris
                    // se veia vacio.
                    transform: 'scale(1.15)', display: 'block',
                  }} />
              </div>
              <Ojo />
            </div>
          </div>

          <div className="portal-texto">
            <h1 style={{
              margin: '18px 0 0', fontFamily: FUENTE.display, fontWeight: 400,
              // Interlineado 1: en español las mayusculas llevan acento y con
              // menos de 1 la linea de arriba se los come.
              fontSize: 'clamp(40px, min(12.5vw, 8.4vh), 76px)', lineHeight: 1,
              textTransform: 'uppercase', letterSpacing: '-.5px',
            }}>
              Graba.<br />Ponle precio.<br />
              <span style={{ color: COLOR.dinero }}>Cobra.</span>
            </h1>

            <p style={{
              margin: '16px 0 0', maxWidth: 430,
              fontFamily: FUENTE.serif, fontStyle: 'italic',
              fontSize: 'clamp(17px, 4.6vw, 21px)', lineHeight: 1.35,
              color: COLOR.textoSuave,
            }}>
              El 80% de cada dólar es tuyo. Sin exclusividad, sin cuota mensual y
              sin que nadie decida por ti qué subes.
            </p>

            <div style={{ width: '100%', maxWidth: 380, display: 'grid', gap: 10, marginTop: 22 }}>
              <span onClick={() => nav('/registro')} style={{
                textAlign: 'center', padding: 19, cursor: 'pointer',
                background: COLOR.acento, color: COLOR.fondo,
                font: `700 13px/1 ${FUENTE.ui}`, letterSpacing: 2.2, textTransform: 'uppercase',
                boxShadow: '0 0 34px rgba(255,43,209,.42)',
              }}>Crear mi cuenta</span>
              <span onClick={() => nav('/acceso')} style={{
                textAlign: 'center', padding: 18, cursor: 'pointer',
                border: `1px solid ${LINEA.fuerte}`, color: COLOR.textoSuave,
                font: `700 12px/1 ${FUENTE.ui}`, letterSpacing: 2, textTransform: 'uppercase',
              }}>Ya tengo cuenta</span>
            </div>

            {/* La intro mandaba sola al age gate. Sin ese pase automatico hace
                falta una salida explicita para quien solo viene a mirar. */}
            <span onClick={() => nav('/age')} style={{
              marginTop: 17, cursor: 'pointer',
              font: `400 12.5px/1 ${FUENTE.mono}`, color: COLOR.textoTenue,
              textDecoration: 'underline', textUnderlineOffset: 5,
            }}>Solo vengo a ver &#8594;</span>

            <div style={{
              marginTop: 22, font: `400 9.5px/1 ${FUENTE.mono}`,
              letterSpacing: 1.8, textTransform: 'uppercase', color: COLOR.textoApagado,
            }}>Solo mayores de 18</div>
          </div>
        </div>
      </section>

      <Cintillo />

      {/* ---------- el resto ---------- */}
      {/* En pantalla ancha el texto se iba a mas de mil pixeles de linea y no
          se podia leer: el ojo pierde el renglon al regresar. El resto de la
          app es de celular y ahi esto no se nota; la portada es la unica que
          ve gente de fuera, muchas veces desde una computadora. */}
      <div style={{ padding: '0 26px 44px', maxWidth: 620, margin: '0 auto' }}>
        <Portada />
      </div>
    </div>
  )
}

/* ---------- cintillo ---------- */

/** Franja que corre. El texto va DOS veces en el markup y se desplaza justo la
 *  mitad: al terminar, la segunda copia esta donde arrancó la primera y el
 *  salto no se ve. Con una sola copia se veria el hueco al reiniciar. */
function Cintillo() {
  const items = [...CINTILLO, ...CINTILLO]
  return (
    <div style={{ position: 'relative', background: COLOR.acento, color: COLOR.fondo }}>
      <Borde lado="arriba" color={COLOR.fondo} grosor={2.6} semilla={5} />
      <div className="cintillo" style={{ overflow: 'hidden', padding: '13px 0' }}>
        <div style={{
          display: 'flex', width: 'max-content',
          animation: 'cintillo 26s linear infinite',
        }}>
          {items.concat(items).map((t, i) => (
            <span key={i} style={{
              font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 2.4,
              textTransform: 'uppercase', whiteSpace: 'nowrap', padding: '0 15px',
              display: 'inline-flex', alignItems: 'center', gap: 15,
            }}>
              {t}<b style={{ fontSize: 13 }}>&#9670;</b>
            </span>
          ))}
        </div>
      </div>
      <Borde lado="abajo" color={COLOR.fondo} grosor={2.6} semilla={91} />
    </div>
  )
}
