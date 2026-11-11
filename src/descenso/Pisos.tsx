/* Los pisos de ABAJO del descenso: los huecos de ascensor, el antro (−1), el cuarto
 * oscuro (−2) y el calabozo (−3) con el pie.
 *
 * Es un chunk perezoso (React.lazy en `Portal.tsx`): el primer paint es solo el
 * hero de Collins (CHECKLIST §2.1). Lo que trae este modulo —sus textos, su CSS,
 * sus iconos— no viaja hasta que la persona hace el primer gesto de bajar. Las
 * fotos llevan `loading="lazy"`: tampoco se descargan hasta acercarse.
 *
 * Referencia visual: `docs/diseno/descenso/` (index.html y capturas). Los textos
 * son los de la maqueta aprobada; salen de ahi tal cual, salvo las notas de
 * «maqueta», que no son del producto.
 *
 * La hoja de contactos es una MUESTRA, no el catalogo: no lista clips reales.
 * Antes de la puerta de edad (`/age`) la portada no muestra portadas de clips, y
 * las miniaturas son fotos de ambiente (generadas, sin personas) que la propia
 * hoja declara «de ejemplo». Todo lo que lleva a ver de verdad pasa por `/age`.
 */
import { useEffect, useRef, useState } from 'react'
import { Enlace, Pulsable } from '../components/Pulsable'
import Wordmark from '../components/Wordmark'
import { SPRITE_PISOS } from './spritePisos'
import './pisos.css'

const I = ({ n, clase = '' }: { n: string; clase?: string }) => (
  <svg className={`ico ${clase}`} aria-hidden="true"><use href={`#i-${n}`} /></svg>
)

/** Una foto de fondo: webp, perezosa. `id` es para el parallax. */
const Foto = ({ id, src, alt = '' }: { id?: string; src: string; alt?: string }) => (
  <img id={id} src={`/descenso/${src}.webp`} alt={alt} loading="lazy" decoding="async" />
)

const PASOS: { n: string; icono: string; titulo: string; texto: string; pista: string }[] = [
  { n: '01', icono: 'vinyl', titulo: 'Graba tu pieza.',
    texto: 'El set es tuyo: el archivo, el ritmo, la mira. Nadie te pide la exclusiva ni te arranca la obra de otras casas.',
    pista: 'Pista I · sin exclusiva' },
  { n: '02', icono: 'spot', titulo: 'Ponle precio y cuélgala.',
    texto: 'Venta o renta, el tiempo que tú marques. La pista se ve en el antro; el acceso queda cerrado hasta que alguien paga.',
    pista: 'Pista II · 10 · 20 · 40 USD' },
  { n: '03', icono: 'wave-eq', titulo: 'Cobra. El 80% queda tuyo.',
    texto: 'De cada dólar, ochenta centavos bajan hasta ti. El resto sostiene la casa. Sin exclusividad.',
    pista: 'Pista III · SPEI · sin cuota' },
]

/** Fotogramas de la muestra. `grasa` = rotacion y radios del circulo de lapiz graso. */
const FOTOGRAMAS: { foto: number; no: string; titulo: string; precio: string; grasa?: [number, number, number, number] }[] = [
  { foto: 1, no: '24A', titulo: 'Luz roja', precio: '$20', grasa: [46, 32, -4, 2.2] },
  { foto: 3, no: '25A', titulo: 'En la bandeja', precio: '$10', grasa: [45, 31, 3, 2.3] },
  { foto: 2, no: '26A', titulo: 'Estudio vacío', precio: '$40' },
  { foto: 4, no: '27A', titulo: 'Tras el velo', precio: '$20', grasa: [46, 32, -6, 2.1] },
  { foto: 5, no: '28A', titulo: 'La silla', precio: '$10' },
  { foto: 6, no: '29A', titulo: 'Contacto 29A', precio: '$40', grasa: [44, 31, 5, 2.3] },
]

const COLGANTES: { foto: number; no: string; giro: string }[] = [
  { foto: 4, no: '24A', giro: '-3deg' },
  { foto: 1, no: '25A', giro: '2deg' },
  { foto: 2, no: '26A', giro: '-1deg' },
  { foto: 5, no: '27A', giro: '3deg' },
]

/** El plano de la reja de latón: fijo al viewport, por encima del contenido y sin
 *  eventos. Lo mueve `useDescenso` por variables CSS (`--cierre-in`, `--cierre-out`,
 *  `--velo`), no React: son decenas de actualizaciones por segundo.
 *
 *  Dos planos: la tijera interior (`reja-bay.webp`, un tile repetible que se
 *  comprime al abrir, la hoja derecha en espejo) y la puerta exterior de rellano
 *  (`reja-ext.webp`, una hoja a cada lado). Sin Three.js ni WebGL. */
function Reja() {
  return (
    <div id="reja" className="reja abierta" aria-hidden="true">
      <div className="reja-velo" />
      <div className="reja-cabin">
        <div className="reja-plano outer">
          <div className="puerta-ext izq"><div className="puerta-ext-face" /></div>
          <div className="puerta-ext der"><div className="puerta-ext-face" /></div>
        </div>
        <div className="reja-plano inner">
          <div className="reja-marco top" />
          <div className="reja-marco bot" />
          <div className="reja-tijera izq"><div className="reja-tile" /></div>
          <div className="reja-tijera der"><div className="reja-tile" /></div>
        </div>
      </div>
    </div>
  )
}

/** Un hueco de ascensor entre dos pisos (280 vh, 190 vh en móvil). La cabina
 *  (`.shaft`) queda fija mientras dura: foto de salida, losa de concreto con el
 *  número del piso, foto de llegada y —DENTRO del hueco, no después— la placa con
 *  el titular del piso, que aparece al partirse las puertas: ningún fotograma
 *  muestra solo la foto de fondo. Es transición, no una pantalla del producto
 *  (decorativo: `aria-hidden`; el titular real está en el piso que sigue). */
function Hueco({ id, etiqueta, de, a, salida, llegada, piso, numero, nombre, titular }: {
  id: string; etiqueta: string; de: string; a: string
  salida: string; llegada: string; piso: 'a' | 'o' | 'k'
  numero: string; nombre: string; titular: string
}) {
  return (
    <section className="umbral" id={id} aria-label={etiqueta} data-from={de} data-to={a}>
      <div className="shaft" aria-hidden="true">
        <img className="shaft-out" src={`/descenso/${salida}.webp`} alt="" loading="lazy" decoding="async" />
        <div className="losa">
          <div className="losa-cara" />
          <div className="losa-canto">
            <span className="losa-stencil">{numero}</span>
            <span className="losa-sub">{nombre}</span>
          </div>
        </div>
        <img className="shaft-in" src={`/descenso/${llegada}.webp`} alt="" loading="lazy" decoding="async" />
        <div className="umbral-velo" />
        <div className={`llegada piso-${piso}`}>
          <p className="placa">Piso {numero} · {nombre}</p>
          <p className="titular">{titular}</p>
        </div>
      </div>
    </section>
  )
}

/** Una antorcha del calabozo: el cuerpo (`antorcha.webp`, hierro y trapo, con alpha),
 *  la luz de la llama (radial en `screen`) y el bucle de fuego en video (200×296,
 *  `mix-blend-mode: screen` con máscara radial) anclado al trapo. `preload="none"`:
 *  `useDescenso` lo pide y lo reproduce solo cuando el calabozo entra en vista, y
 *  lo pausa al salir. Con `prefers-reduced-motion` queda el póster estático. */
const Antorcha = ({ clase }: { clase: string }) => (
  <div className={`antorcha ${clase}`}>
    <span className="antorcha-luz" />
    <video className="fuego-loop" muted loop playsInline preload="none" poster="/descenso/fuego-poster.webp">
      <source src="/descenso/fuego-loop.mp4" type="video/mp4" />
    </video>
    <img className="antorcha-img" src="/descenso/antorcha.webp" alt="" width={244} height={920} decoding="async" loading="lazy" />
  </div>
)

const Pinza = () => (
  <svg className="pinza" viewBox="0 0 30 46" aria-hidden="true">
    <path d="M11 2.5h8l-1.1 16.2h-5.8z" fill="#c4a57a" stroke="#6b5340" strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M12.2 18.5 8 43.5" fill="none" stroke="#c4a57a" strokeWidth="3.1" strokeLinecap="round" />
    <path d="M17.8 18.5 22 43.5" fill="none" stroke="#c4a57a" strokeWidth="3.1" strokeLinecap="round" />
  </svg>
)

const Sprockets = ({ abajo = false }: { abajo?: boolean }) => (
  <div className={abajo ? 'sprockets bot' : 'sprockets'} aria-hidden="true">
    {Array.from({ length: 8 }, (_, i) => <i key={i} />)}
  </div>
)

export default function Pisos({
  alMontar, alAbrirSobre, sobreAbierto,
}: {
  /** Avisa que ya estan en el DOM (para bajar si algo lo pidio). */
  alMontar: () => void
  /** «Sobre nosotros» del pie: el bloque corto que se abre bajo el pie. */
  alAbrirSobre: () => void
  sobreAbierto: boolean
}) {
  // En móvil no se insertan las antorchas 3 y 4 (cada una baja su propio video).
  const [movil] = useState(() => window.matchMedia('(max-width: 900px)').matches)

  // Avisa UNA vez que ya esta en el DOM (si algo pidio bajar, ahora ya hay a donde).
  const montar = useRef(alMontar)
  useEffect(() => { montar.current() }, [])

  return (
    <>
      <svg xmlns="http://www.w3.org/2000/svg" style={{ display: 'none' }} aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: SPRITE_PISOS }} />

      {/* La reja del ascensor: una sola, fija, compartida por los tres huecos. */}
      <Reja />

      {/* ---------- hueco: Collins → el antro ---------- */}
      <Hueco id="umbral-antro" etiqueta="Ascensor hacia el antro" de="collins" a="antro"
        salida="bar-hero" llegada="club" piso="a" numero="−1" nombre="El antro" titular="Graba tu pieza." />

      {/* ---------- −1 · el antro ---------- */}
      <section className="nivel piso-a" id="nivel-2" data-piso="antro" data-code="−1" data-nombre="El antro"
        aria-label="Cómo funciona">
        <div className="club">
          <div className="club-col">
            <div className="club-visual">
              <Foto id="club-bg" src="club"
                alt="Salón subterráneo vacío, con haces de luz violeta y ámbar entre humo. Sin personas." />
              <div className="club-velo" />
              <span className="niebla n1" aria-hidden="true" />
              <span className="niebla n2" aria-hidden="true" />
              <span className="beam b1" />
              <span className="beam b2" />
              <div className="club-cartela">
                <p className="piso-mark"><I n="speaker" />Piso −1 · El antro</p>
              </div>
            </div>
          </div>
          <div className="pasos">
            {PASOS.map(p => (
              <article className="paso" key={p.n}>
                <div className="paso-kicker">
                  <I n={p.icono} clase="ico-xl" />
                  <span className="paso-num">{p.n}</span>
                </div>
                <h2>{p.titulo}</h2>
                <p>{p.texto}</p>
                <p className="pista">{p.pista}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- hueco: el antro → el cuarto oscuro ---------- */}
      <Hueco id="umbral-oscuro" etiqueta="Ascensor al cuarto de revelado" de="antro" a="oscuro"
        salida="club" llegada="darkroom" piso="o" numero="−2" nombre="Cuarto oscuro" titular="Marca lo que quieres ver." />

      {/* ---------- −2 · cuarto oscuro ---------- */}
      <section className="nivel piso-o" id="nivel-3" data-piso="oscuro" data-code="−2" data-nombre="Cuarto oscuro"
        aria-label="Piezas">
        <div className="tendedero" aria-hidden="true">
          <div className="cuerda" />
          <div className="colgantes">
            {COLGANTES.map(c => (
              <figure className="colgante" key={c.no}>
                <Pinza />
                <div className="print-paper" style={{ ['--r' as string]: c.giro }}>
                  <div className="ventana"><Foto src={`thumb-${c.foto}`} /></div>
                  <figcaption>RAW 400 · {c.no}</figcaption>
                </div>
              </figure>
            ))}
          </div>
        </div>

        <div className="wrap">
          <div className="cab-ext">
            <div>
              <p className="piso-mark" style={{ justifyContent: 'flex-start' }}>
                <I n="loupe" />La hoja de contactos · piso −2
              </p>
              <h2>Marca lo que quieres ver.</h2>
            </div>
            <Enlace a="/age" className="ver-todo">Ver todo →</Enlace>
          </div>
          <div className="hoja">
            <div className="hoja-cabeza">
              <span>RAW 400</span>
              <span className="titulo-hoja">HOJA DE CONTACTOS</span>
              <span>24A — 29A</span>
            </div>
            <ul className="fotogramas" style={{ listStyle: 'none' }}>
              {FOTOGRAMAS.map(f => (
                <li className="foto" key={f.no}>
                  <div className="rebate">
                    <Sprockets />
                    <div className="ventana">
                      <Foto src={`thumb-${f.foto}`} />
                      <span className="sello-mini">18+</span>
                      <span className="candado" aria-hidden="true"><I n="lock" /></span>
                    </div>
                    <Sprockets abajo />
                    <span className="frame-no">{f.no}</span>
                    {f.grasa && (
                      <svg className="grasa" viewBox="0 0 100 72" aria-hidden="true">
                        <ellipse cx="50" cy="36" rx={f.grasa[0]} ry={f.grasa[1]} fill="none" stroke="#C41E28"
                          strokeWidth={f.grasa[3]} transform={`rotate(${f.grasa[2]} 50 36)`} opacity=".86" filter="url(#wobble)" />
                      </svg>
                    )}
                  </div>
                  <div className="foto-meta">
                    <div><h3>{f.titulo}</h3><p className="quien">Ejemplo · 18+</p></div>
                    {/* dinero-ok: precio de EJEMPLO escrito a lapiz graso (10, 20 o 40), no un monto del producto */}
                    <span className="precio">{f.precio}</span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="hoja-pie">
              <span>Seleccionado con lápiz graso · 18+</span>
              <span>Títulos y precios de ejemplo — 10, 20 o 40 USD. Miniaturas atmosféricas, sin desnudos.</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- hueco: el cuarto oscuro → el calabozo ---------- */}
      <Hueco id="umbral-calabozo" etiqueta="Ascensor al calabozo" de="oscuro" a="calabozo"
        salida="darkroom" llegada="camara" piso="k" numero="−3" nombre="El calabozo" titular="El tributo se parte en la piedra." />

      {/* ---------- −3 · el calabozo ---------- */}
      <section className="nivel piso-k" id="nivel-4" data-piso="calabozo" data-code="−3" data-nombre="El calabozo"
        aria-label="Precios">
        <div className="camara-bg" aria-hidden="true">
          <img id="cam-bg" src="/descenso/camara.webp" alt="" loading="lazy" decoding="async" />
          <div className="camara-velo" />
        </div>
        {/* Siluetas negras de decoración (cadenas, grilletes, aspa de San Andrés,
            cuerdas): SVG de la maqueta, `multiply`, sin personas. Tres capas con
            parallax distinto. */}
        <div className="cala-siluetas" aria-hidden="true">
          <div className="cala-capa c1">
            <svg className="sil sil-aspa-lg" viewBox="0 0 140 180"><use href="#sil-aspa" /></svg>
            <svg className="sil sil-cage" viewBox="0 0 80 150"><use href="#sil-cage" /></svg>
          </div>
          <div className="cala-capa c2">
            <svg className="sil sil-chain-a" viewBox="0 0 24 220"><use href="#sil-chain" /></svg>
            <svg className="sil sil-chain-b" viewBox="0 0 24 220"><use href="#sil-chain" /></svg>
            <svg className="sil sil-rope" viewBox="0 0 80 80"><use href="#sil-rope" /></svg>
            <svg className="sil sil-hook-a" viewBox="0 0 36 90"><use href="#sil-hook" /></svg>
            <svg className="sil sil-hook-b" viewBox="0 0 36 90"><use href="#sil-hook" /></svg>
          </div>
          <div className="cala-capa c3">
            <svg className="sil sil-manacles-a" viewBox="0 0 180 50"><use href="#sil-manacles" /></svg>
            <svg className="sil sil-manacles-b" viewBox="0 0 180 50"><use href="#sil-manacles" /></svg>
            <svg className="sil sil-hook-c" viewBox="0 0 36 90"><use href="#sil-hook" /></svg>
          </div>
        </div>
        <div className="cala-luz" aria-hidden="true" />
        {/* Las antorchas: cuatro en escritorio; en móvil NO se montan la 3 ni la 4
            (cuatro videos serían demasiado). */}
        <div className="cala-antorchas" aria-hidden="true">
          <Antorcha clase="a1" /><Antorcha clase="a2" />
          {!movil && <><Antorcha clase="a3" /><Antorcha clase="a4" /></>}
        </div>
        <div className="wrap">
          <p className="piso-mark"><I n="candle" />Piso −3 · El calabozo</p>
          <div className="ochenta">
            <div className="ochenta-num">80%<small>TUYO</small></div>
            <div>
              <h2>El tributo se parte en la piedra.</h2>
              <p className="lead">De cada dólar, ochenta centavos bajan hasta la creadora. El resto sostiene la casa. Sin exclusividad.</p>
            </div>
          </div>
          <div className="tablillas">
            <article className="tablilla">
              <I n="crop" clase="ico-lg" />
              <h3>Para quien crea</h3>
              <ul>
                <li><I n="key" />Publicas cuando quieres, con tu propio cerrojo.</li>
                <li><I n="lock" />Precio, alquiler y visibilidad, en tus manos.</li>
                <li><I n="ring" />Pago por transferencia SPEI, sin atarte a la casa.</li>
              </ul>
            </article>
            <article className="tablilla">
              <I n="candle" clase="ico-lg" />
              <h3>Para quien visita</h3>
              <ul>
                <li><I n="door" />Entras mayor de edad, con la puerta entreabierta.</li>
                <li><I n="chain" />Pagas la pieza, no una jaula de suscripción forzada.</li>
                <li><I n="shackle" />La celda se abre solo para ti, el tiempo acordado.</li>
              </ul>
            </article>
          </div>
          <div className="hondo" id="cta">
            <p className="piso-mark">La puerta sigue entreabierta</p>
            <h2>Baja hasta el último anillo.</h2>
            <p>Abre tu celda, o solo mira.</p>
            <div className="acciones">
              <Enlace a="/registro" className="btn btn-p">Crear mi cuenta</Enlace>
              <Enlace a="/acceso" className="btn btn-g">Ya tengo cuenta</Enlace>
            </div>
          </div>
        </div>

        <footer className="pie">
          <Wordmark ancho={108} piso="calabozo" />
          <nav aria-label="Pie">
            {[['Piezas', '/age'], ['Creadoras', '/creadoras'], ['Preguntas', '/preguntas'],
              ['Contacto', '/contacto'], ['Privacidad', '/privacidad'], ['Términos', '/terminos']].map(([t, r]) => (
              <Enlace key={t} a={r}>{t}</Enlace>
            ))}
            <Pulsable al={alAbrirSobre} activado={sobreAbierto}>Sobre nosotros</Pulsable>
          </nav>
          <span className="legal"><span className="sigilo">Descenso</span> · 18+ · Solo mayores de edad</span>
        </footer>
      </section>
    </>
  )
}
