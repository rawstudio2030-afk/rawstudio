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
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Enlace } from '../components/Pulsable'
import { useSesion } from '../lib/sesion'
import Wordmark from '../components/Wordmark'
import Portada from '../components/Portada'
import { FiltrosHervor, Borde } from '../components/Hervor'
import { Ojo, RecorteIris, OJO } from '../components/OpArt'
import FondoMiami from '../components/FondoMiami'
import Insignia18 from '../components/Insignia18'
import { ComoFunciona, FormasDeGanar } from '../components/SeccionesNeon'
import { Pulsable } from '../components/Pulsable'
import { COLOR, FUENTE } from '../lib/diseño'
import launchVideo from '../assets/launch.mp4'

/** Segundo del video donde ya se ve la espiral. */
const DESDE = 1.8

const CINTILLO = [
  '80% para ti', 'sin exclusividad', 'pagos por SPEI',
  'marca de agua con tu nombre', 'bloqueo por país', 'fecha de retiro',
]

/** Las opciones de debajo de los botones. «Creadores» ya tiene su pagina; las
 *  demas son secciones de esta misma portada, que se alcanzan con scroll.
 *  No son enlaces `#...` porque el sitio usa HashRouter: un enlace asi cambia
 *  la ruta en vez de bajar a la seccion. */
const OPCIONES: { t: string; id?: string; a?: string }[] = [
  { t: 'Cómo funciona', id: 'como-funciona' },
  { t: 'Precios', id: 'precios' },
  { t: 'Creadores', a: '/creadoras' },
  { t: 'Sobre nosotros', id: 'sobre-nosotros' },
]

function irA(id: string) {
  const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  document.getElementById(id)?.scrollIntoView({ behavior: quieto ? 'auto' : 'smooth', block: 'start' })
}

/** ¿Pantalla ancha? Solo para el tamaño del wordmark: el resto del cambio
 *  entre celular y escritorio lo hace el CSS. */
function useAncha() {
  const q = '(min-width: 720px)'
  const [ancha, setAncha] = useState(() => window.matchMedia(q).matches)
  useEffect(() => {
    const m = window.matchMedia(q)
    const al = () => setAncha(m.matches)
    m.addEventListener('change', al)
    return () => m.removeEventListener('change', al)
  }, [])
  return ancha
}

export default function Portal() {
  const ancha = useAncha()
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

      {/* ---------- portada ----------
          Direccion «Miami Neon Night» (DESIGN-BRIEF.md y mockups aprobados):
          una calle de Miami de noche detras de un letrero de neon. El ojo de
          siempre se queda, pero sutil y por detras de las palmeras: ya no es
          el protagonista. */}
      <section className="portal-alto portal-miami">
        <div className="miami-escena" aria-hidden>
          <div className="miami-luna">
            <div className="portal-ojo-caja">
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
          </div>
          <FondoMiami />
        </div>

        {/* Sin este velo el titular pelea con las luces de la ciudad. */}
        <div aria-hidden className="miami-velo" />

        <div className="miami-cuerpo">
          <Wordmark ancho={ancha ? 360 : 250} glow={ancha ? 26 : 20} tubo />

          <h1 className="miami-titular">
            Graba.<br />Ponle precio.<br />Cobra.
          </h1>

          <p className="miami-sub">
            El 80% de cada dólar es tuyo.<br />Sin exclusividad.
          </p>

          <div className="miami-botones">
            <Enlace a="/registro" className="miami-boton miami-boton-magenta">Crear mi cuenta</Enlace>
            <Pulsable al={() => irA('como-funciona')} className="miami-boton miami-boton-cian">
              <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
                <path d="M7 5v14l11.5-7Z" />
              </svg>
              Ver cómo funciona
            </Pulsable>
          </div>

          {/* Las opciones, a la vista y en una sola fila, con los dos colores
              del neon alternados. En celular no hay barra con enlaces, y lo
              que no se ve en la primera pantalla no se encuentra. */}
          <nav className="miami-opciones" aria-label="Secciones">
            {OPCIONES.map(o => o.a
              ? <Enlace key={o.t} a={o.a} className="miami-opcion">{o.t}</Enlace>
              : <Pulsable key={o.t} al={() => irA(o.id!)} className="miami-opcion">{o.t}</Pulsable>)}
          </nav>

          {/* Quien ya tiene cuenta, y quien solo viene a mirar: son los dos
              caminos que no son «crear cuenta» y no pueden desaparecer. */}
          <div className="miami-enlaces">
            <Enlace a="/acceso">Ya tengo cuenta</Enlace>
            <Enlace a="/age">Solo vengo a ver &#8594;</Enlace>
          </div>
        </div>

        <div className="miami-18"><Insignia18 /></div>
      </section>

      <Cintillo />

      {/* Lo que el hero promete —«ver como funciona», «precios»— esta aqui
          mismo debajo, en el mismo estilo. */}
      <ComoFunciona />
      <FormasDeGanar />

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
              font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 2.2,
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
