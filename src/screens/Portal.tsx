/* Pantalla 00 — Portada.
 *
 * Antes aqui vivia la intro: cuatro segundos de video y un pase automatico al
 * age gate. Servia para presentarse, no para explicar nada, y quien llegaba de
 * fuera se topaba con una puerta antes de saber a que puerta estaba tocando.
 *
 * Ahora es una portada de verdad —lo que hace el sitio, cuanto se queda una,
 * como se empieza— y la intro no se pierde: el ojo sigue ahi, con la espiral
 * magenta de siempre como pupila.
 *
 * PRIMER PAINT = SOLO EL HERO: wordmark, titular, subtitulo, «Crear mi cuenta»
 * y los enlaces. «Como funciona», «Precios» y «Sobre nosotros» (un bloque corto
 * con los enlaces de ayuda) son modulos que se piden con React.lazy cuando quien
 * visita pulsa la opcion; hasta entonces no estan en el DOM ni se descargan. El
 * cintillo magenta ya no sale aqui: el hero dice el 80% y la exclusividad. El video
 * de la intro ya no se carga aqui. Las preguntas frecuentes y los textos
 * legales viven en sus rutas (/preguntas, /contacto, /privacidad, /terminos).
 *
 * El aire es el mismo del video: blanco y negro de alto contraste, un solo
 * color acido, trazo de linoleo y fondo de op art que se retuerce. Nada de
 * esto es imagen: son curvas que se redibujan once veces por segundo.
 */
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Enlace } from '../components/Pulsable'
import { useSesion } from '../lib/sesion'
import Wordmark from '../components/Wordmark'
import { FiltrosHervor } from '../components/Hervor'
import { Ojo, RecorteIris, OJO } from '../components/OpArt'
import FondoMiami from '../components/FondoMiami'
import Insignia18 from '../components/Insignia18'
import { Pulsable } from '../components/Pulsable'
import { COLOR, FUENTE } from '../lib/diseño'

/* Lo que NO es el hero. Cada import() es un chunk aparte que el navegador pide
 * cuando React intenta pintar el componente, o sea al primer click. */
const ComoFunciona = lazy(() =>
  import('../components/SeccionesNeon').then(m => ({ default: m.ComoFunciona })))
const FormasDeGanar = lazy(() =>
  import('../components/SeccionesNeon').then(m => ({ default: m.FormasDeGanar })))
const SobreNosotros = lazy(() => import('../components/SobreNosotros'))

type Seccion = 'como' | 'precios' | 'sobre'

/** Las opciones de debajo de los botones. «Creadores» ya tiene su pagina; las
 *  demas abren, bajo el hero, la seccion que nombran. No son enlaces `#...`
 *  porque el sitio usa HashRouter: un enlace asi cambia la ruta en vez de
 *  bajar a la seccion. */
const OPCIONES: { t: string; s?: Seccion; id?: string; a?: string }[] = [
  { t: 'Cómo funciona', s: 'como', id: 'como-funciona' },
  { t: 'Precios', s: 'precios', id: 'precios' },
  { t: 'Creadores', a: '/creadoras' },
  { t: 'Sobre nosotros', s: 'sobre', id: 'sobre-nosotros' },
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

/** Avisa cuando lo que lo rodea ya se pinto. Va dentro del mismo Suspense que
 *  la seccion perezosa: solo se monta cuando el chunk llego, que es cuando el
 *  ancla existe y se puede bajar a ella. */
function AlMontar({ listo }: { listo: () => void }) {
  // Una sola vez, al montarse: si dependiera de `listo` (una funcion nueva en
  // cada render de Portal) volveria a bajar cada vez que se abre otra seccion.
  const ref = useRef(listo)
  useEffect(() => { ref.current() }, [])
  return null
}

export default function Portal() {
  const ancha = useAncha()
  const [abiertas, setAbiertas] = useState<Record<Seccion, boolean>>({
    como: false, precios: false, sobre: false,
  })

  /** Pide una seccion. Si ya esta montada, solo baja; si no, la monta y baja
   *  cuando llega su chunk (`AlMontar`). */
  const pedir = (s: Seccion, id: string) => {
    if (abiertas[s]) irA(id)
    else setAbiertas(a => ({ ...a, [s]: true }))
  }
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
              {/* La pupila va dentro del iris y el dibujo encima: comparten
                  centro por construccion, asi que nunca se descuadran. */}
              <div style={{
                position: 'relative', width: '100%',
                aspectRatio: `${OJO.ancho} / ${OJO.alto}`,
              }}>
                <div className="ojo-recorte" style={{
                  position: 'absolute', left: '50%', top: '50%',
                  transform: 'translate(-50%,-50%)',
                  width: `${OJO.iris * 2 / OJO.ancho * 100}%`, aspectRatio: '1',
                  overflow: 'hidden',
                }}>
                  {/* La espiral magenta de la intro, sin video: un gradiente
                      no pesa nada y el iris no se queda hueco. */}
                  <div style={{
                    width: '100%', height: '100%', display: 'block',
                    background: 'radial-gradient(circle at 50% 50%, #FF4FE0 0 13%, #B3189A 14% 30%, #1A0314 31% 62%, #FF2BD1 63% 68%, #0B0008 69%)',
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
          <Wordmark ancho={ancha ? 360 : 250} />

          <h1 className="miami-titular">
            Graba.<br />Ponle precio.<br />Cobra.
          </h1>

          <p className="miami-sub">
            El 80% de cada dólar es tuyo.<br />Sin exclusividad.
          </p>

          <div className="miami-botones">
            <Enlace a="/registro" className="miami-boton miami-boton-magenta">Crear mi cuenta</Enlace>
            {/* Quien regresa viene a entrar, no a leer: era un enlace chico
                subrayado al final de la pantalla y no se veia. Ahora es un boton
                del mismo tamaño que el de crear cuenta, justo debajo. */}
            <Enlace a="/acceso" className="miami-boton miami-boton-suave miami-boton-entrar">Ya tengo cuenta</Enlace>
            <Pulsable al={() => pedir('como', 'como-funciona')} className="miami-boton miami-boton-cian miami-boton-ancho">
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
              : <Pulsable key={o.t} al={() => pedir(o.s!, o.id!)} className="miami-opcion">{o.t}</Pulsable>)}
          </nav>

          {/* Quien solo viene a mirar: el camino que no es «crear cuenta» ni
              «entrar» y no puede desaparecer. */}
          <div className="miami-enlaces">
            <Enlace a="/age">Solo vengo a ver &#8594;</Enlace>
          </div>
        </div>

        <div className="miami-18"><Insignia18 /></div>
      </section>

      {/* ---------- bajo el hero: solo si se pide ----------
          Nada de esto existe en el DOM hasta el primer click, y cada bloque es
          su propio chunk. `AlMontar` baja a la seccion cuando por fin esta. */}
      {abiertas.como && (
        <Suspense fallback={null}>
          <ComoFunciona />
          <AlMontar listo={() => irA('como-funciona')} />
        </Suspense>
      )}

      {abiertas.precios && (
        <Suspense fallback={null}>
          <FormasDeGanar />
          <AlMontar listo={() => irA('precios')} />
        </Suspense>
      )}

      {/* «Sobre nosotros»: un bloque corto (que es, de donde sale y los enlaces
          de ayuda), no la portada entera. En pantalla ancha el texto se iba a
          mas de mil pixeles de linea y no se podia leer: el ojo pierde el
          renglon al regresar. */}
      {abiertas.sobre && (
        <div style={{ padding: '0 26px 44px', maxWidth: 620, margin: '0 auto' }}>
          <Suspense fallback={null}>
            <SobreNosotros />
            <AlMontar listo={() => irA('sobre-nosotros')} />
          </Suspense>
        </div>
      )}
    </div>
  )
}
