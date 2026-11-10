/* Pantalla 00 — Portada: «El descenso».
 *
 * La portada es un edificio en el que se baja (docs/diseno/descenso/): planta
 * baja en Collins Avenue y, debajo, el antro, el cuarto oscuro y el calabozo,
 * con umbrales entre piso y piso y un ascensor que dice en cual vas.
 *
 * PRIMER PAINT = SOLO EL HERO DE COLLINS (CHECKLIST §2.1): la barra, el
 * ascensor, la foto de fondo (el LCP), el wordmark, el titular, el subtitulo y
 * los botones. Los pisos de abajo —sus fotos, sus fuentes, sus textos— son un
 * chunk perezoso (`descenso/Pisos`) que se pide en el primer gesto de bajar
 * (scroll, rueda, toque, tecla) o al pulsar «Ver cómo funciona» o un piso del
 * ascensor. «Sobre nosotros» (contacto, preguntas, privacidad) sigue siendo un
 * bloque que solo se abre con un clic (§2.2).
 *
 * El copy del hero es canonico y no se toca: «Graba. / Ponle precio. / Cobra.» y
 * «El 80% de cada dólar es tuyo. / Sin exclusividad.».
 *
 * Los botones llevan a las rutas de siempre: «Crear mi cuenta» a /registro,
 * «Ya tengo cuenta» a /acceso (el formulario de entrar NO se mueve), «Solo
 * vengo a ver» a /age (la puerta de edad, como antes).
 */
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { preload } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Enlace, Pulsable } from '../components/Pulsable'
import Wordmark from '../components/Wordmark'
import { useSesion } from '../lib/sesion'
import { PISO } from '../lib/diseño'
import { SPRITE_HERO } from '../descenso/spriteHero'
import { PISOS_INFO, irA, useDescenso } from '../descenso/useDescenso'
import '../descenso/descenso.css'

/* Lo que NO es el hero: cada import() es un chunk aparte que el navegador pide
 * cuando React intenta pintar el componente. */
const Pisos = lazy(() => import('../descenso/Pisos'))
const SobreNosotros = lazy(() => import('../components/SobreNosotros'))

const I = ({ n }: { n: string }) => (
  <svg className="ico" aria-hidden="true"><use href={`#i-${n}`} /></svg>
)

/** Hueco que mantiene la pagina «larga» mientras los pisos llegan: asi hay
 *  scroll desde el primer momento y el gesto que los pide puede ocurrir. */
function Hueco() {
  return <div aria-hidden style={{ minHeight: '100vh', background: PISO.antro.vacio }} />
}

/** Avisa cuando lo que lo rodea ya se pinto (para bajar a «Sobre nosotros»). */
function AlMontar({ listo }: { listo: () => void }) {
  const ref = useRef(listo)
  useEffect(() => { ref.current() }, [])
  return null
}

export default function Portal() {
  // El fondo de Collins es el LCP: se pide antes de que React pinte el <img>.
  preload('/descenso/bar-hero.webp', { as: 'image', fetchPriority: 'high', type: 'image/webp' })

  const raiz = useRef<HTMLDivElement>(null)
  const { piso, solida, pisosPedidos, bajar, pisosListos } = useDescenso(raiz)
  const [sobre, setSobre] = useState(false)
  const nav = useNavigate()
  const { sesion, perfil, cargando } = useSesion()

  // Quien ya entro y ya cruzo la puerta de edad no viene a leer la portada.
  useEffect(() => {
    if (cargando) return
    if (sesion && perfil?.adult_confirmed_at) nav('/clip', { replace: true })
  }, [cargando, sesion, perfil, nav])

  const info = PISOS_INFO.find(p => p.piso === piso) ?? PISOS_INFO[0]

  return (
    <div ref={raiz} className={`descenso piso-${piso}`}>
      <svg xmlns="http://www.w3.org/2000/svg" style={{ display: 'none' }} aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: SPRITE_HERO }} />

      <Pulsable className="skip" al={() => document.getElementById('nivel-1')?.focus()}>
        Saltar al contenido
      </Pulsable>

      {/* ambiente: tinte del piso, vineta y grano (fijos, sin eventos) */}
      <div id="tinte" aria-hidden="true" />
      <div id="vineta" aria-hidden="true" />
      <div id="grano" aria-hidden="true" />

      {/* ---------- barra ---------- */}
      <header className={`nav${solida ? ' solida' : ''}`} id="nav">
        <Wordmark ancho={138} piso={piso} />
        <nav className="nav-links" aria-label="Secciones">
          <Pulsable al={() => bajar('nivel-2')}>Cómo funciona</Pulsable>
          <Pulsable al={() => bajar('nivel-3')}>Piezas</Pulsable>
          <Pulsable al={() => bajar('nivel-4')}>Precios</Pulsable>
          <Enlace a="/acceso">Entrar</Enlace>
        </nav>
        <span className="sello-18" title="Solo para mayores de 18 años" role="img" aria-label="Solo para mayores de 18 años">
          <span className="rs-mini" aria-hidden="true">RS</span>
          <span className="edad" aria-hidden="true">18+</span>
        </span>
      </header>

      {/* ---------- ascensor (se oculta bajo 900 px) ---------- */}
      <aside className="ascensor" aria-label="Pisos del edificio">
        <div className="asc-cap" aria-hidden="true">Ascensor</div>
        <div className="asc-display" aria-hidden="true">{info.codigo}</div>
        <div className="asc-name" aria-hidden="true">{info.nombre}</div>
        <nav className="asc-track" aria-label="Ir a un piso">
          {PISOS_INFO.map(p => (
            <button key={p.id} type="button" className={`asc-floor${p.piso === piso ? ' activa' : ''}`}
              data-piso={p.piso} aria-current={p.piso === piso ? 'location' : undefined}
              aria-label={`Piso ${p.codigo}, ${p.nombre}${p.piso === piso ? ' (estás aquí)' : ''}`}
              onClick={() => bajar(p.id)}>
              <span className="dot" aria-hidden="true" />
              <span className="lab" aria-hidden="true"><b>{p.codigo}</b>{p.corto}</span>
            </button>
          ))}
        </nav>
        <div className="asc-hint" aria-hidden="true">Baja <i /></div>
      </aside>

      <main>
        {/* ---------- PB · Collins ---------- */}
        <section className="hero nivel piso-c" id="nivel-1" tabIndex={-1}
          data-piso="collins" data-code="PB" data-nombre="Calle Collins">
          <div className="hero-scene" aria-hidden="true">
            <picture>
              <source srcSet="/descenso/bar-hero.webp" type="image/webp" />
              <img className="hero-bg" id="hero-bg" src="/descenso/bar-hero.jpg" alt=""
                width={1280} height={720} fetchPriority="high" decoding="async" />
            </picture>
            <div className="hero-velo" />
          </div>
          <div className="hero-copy">
            <p className="piso-mark">
              <I n="coupe" />
              Planta baja · <span className="script">Collins Avenue</span>
            </p>
            <h1>Graba.<br />Ponle precio.<br />Cobra.</h1>
            <p className="hero-sub">El 80% de cada dólar es tuyo.<br />Sin exclusividad.</p>
            <div className="acciones">
              <Enlace a="/registro" className="btn btn-p">Crear mi cuenta</Enlace>
              <Enlace a="/acceso" className="btn btn-g">Ya tengo cuenta</Enlace>
              <Pulsable className="btn btn-a" al={() => bajar('nivel-2')}>
                <I n="fan" />Ver cómo funciona
              </Pulsable>
            </div>
            {/* Quien solo viene a mirar: el camino que no es «crear cuenta» ni
                «entrar» y no puede desaparecer. Va a la puerta de edad, como antes. */}
            <Enlace a="/age" className="solo-ver">Solo vengo a ver →</Enlace>
          </div>
          <Pulsable className="desciende" al={() => bajar('umbral-antro')}>
            Baja al antro <i />
          </Pulsable>
        </section>

        {/* ---------- los pisos de abajo: solo cuando se piden ---------- */}
        {pisosPedidos ? (
          <Suspense fallback={<Hueco />}>
            <Pisos alMontar={pisosListos} alAbrirSobre={() => setSobre(s => !s)} sobreAbierto={sobre} />
          </Suspense>
        ) : <Hueco />}
      </main>

      {/* «Sobre nosotros»: el bloque corto de antes (que es, de donde sale y los
          enlaces de ayuda). Solo con clic: no esta en el DOM hasta entonces. */}
      {sobre && (
        <div style={{ background: PISO.calabozo.vacio, padding: '0 26px 44px' }}>
          <div style={{ maxWidth: 620, margin: '0 auto' }}>
            <Suspense fallback={null}>
              <SobreNosotros />
              <AlMontar listo={() => irA('sobre-nosotros')} />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  )
}
