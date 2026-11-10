/* Los pisos de ABAJO del descenso: la escalera, el antro (−1), el cuarto oscuro
 * (−2) y el calabozo (−3) con el pie.
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
import { useEffect, useRef } from 'react'
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
  // Avisa UNA vez que ya esta en el DOM (si algo pidio bajar, ahora ya hay a donde).
  const montar = useRef(alMontar)
  useEffect(() => { montar.current() }, [])

  return (
    <>
      <svg xmlns="http://www.w3.org/2000/svg" style={{ display: 'none' }} aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: SPRITE_PISOS }} />

      {/* ---------- umbral: la escalera ---------- */}
      <section className="umbral" id="umbral-antro" aria-label="Escalera hacia el antro">
        <Foto id="stairs-bg" src="stairs"
          alt="Escalera art déco de terrazo y bronce que desciende hacia una luz violeta. Sin personas." />
        <div className="umbral-velo" />
        <div className="umbral-copy">
          <p className="piso-mark piso-c" style={{ display: 'inline-flex' }}>
            <I n="stairs" />Un piso más abajo
          </p>
          <p className="dir">La noche empieza debajo.</p>
          <h2>El antro.</h2>
          <p>La escalera de sol naciente baja desde el salón de Collins Avenue. Abajo esperan el bajo, el humo y la primera pista.</p>
        </div>
      </section>

      {/* ---------- −1 · el antro ---------- */}
      <section className="nivel piso-a" id="nivel-2" data-piso="antro" data-code="−1" data-nombre="El antro"
        aria-label="Cómo funciona">
        <div className="club">
          <div className="club-col">
            <div className="club-visual">
              <Foto id="club-bg" src="club"
                alt="Salón subterráneo vacío, con haces de luz violeta y ámbar entre humo. Sin personas." />
              <div className="club-velo" />
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

      {/* ---------- umbral: el revelado ---------- */}
      <section className="umbral" id="umbral-oscuro" aria-label="Paso al cuarto de revelado">
        <div className="umbral-velo" />
        <div className="umbral-copy">
          <p className="piso-mark piso-o" style={{ display: 'inline-flex' }}>
            <I n="enlarger" />Servicio · solo personal
          </p>
          <h2>Cuarto de revelado.</h2>
          <p style={{ fontFamily: 'var(--font-playfair)', fontStyle: 'italic', color: 'var(--o-muted)' }}>
            Detrás del antro se apaga el color. Queda la luz roja y la hoja de contactos.
          </p>
        </div>
      </section>

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

      {/* ---------- −2 · cuarto oscuro ---------- */}
      <section className="nivel piso-o" id="nivel-3" data-piso="oscuro" data-code="−2" data-nombre="Cuarto oscuro"
        aria-label="Piezas">
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

      {/* ---------- umbral: la puerta ---------- */}
      <section className="umbral" id="umbral-calabozo" aria-label="Puerta al calabozo">
        <Foto id="door-bg" src="puerta"
          alt="Puerta de hierro remachado entre piedra tallada, iluminada por antorchas. Sin personas." />
        <div className="umbral-velo" />
        <div className="umbral-copy">
          <p className="piso-mark piso-k" style={{ display: 'inline-flex' }}>
            <I n="door" />Lo más hondo
          </p>
          <h2>El calabozo.</h2>
          <p style={{ fontFamily: 'var(--font-fell)', fontStyle: 'italic', color: 'var(--k-muted)' }}>
            Más abajo que el revelado, la piedra y el sello. Aquí se parte el tributo.
          </p>
        </div>
      </section>

      {/* ---------- −3 · el calabozo ---------- */}
      <section className="nivel piso-k" id="nivel-4" data-piso="calabozo" data-code="−3" data-nombre="El calabozo"
        aria-label="Precios">
        <div className="camara-bg" aria-hidden="true">
          <Foto id="cam-bg" src="camara" />
          <div className="camara-velo" />
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
