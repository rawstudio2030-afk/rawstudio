/* La escena de la portada: una calle de Miami de noche.
 *
 * Es la direccion «Miami Neon Night» de DESIGN-BRIEF.md y de los mockups
 * aprobados: un hotel Art Deco a la izquierda, con tiras de neon rosa en cada
 * piso; palmeras enormes a la derecha; al fondo, el skyline de la otra orilla;
 * y debajo, el piso mojado devolviendo todo en reflejos verticales magenta y
 * cian.
 *
 * Todo es SVG dibujado aqui, nada es imagen: pesa unos pocos KB, escala sin
 * pixelarse y los colores salen de los mismos tokens que el resto del sitio.
 * No se anima: una escena que parpadea sola en la portada cansa en cinco
 * segundos, y quien pidio menos movimiento no tiene que pedirlo dos veces.
 *
 * DOS COMPOSICIONES, no una. Una escena pensada para un celular vertical
 * (400×900) recortada a una pantalla ancha pierde el hotel o las palmeras, y
 * al reves. Cada una se dibuja con las mismas piezas y su propio reparto; el
 * CSS muestra la que toca (`.miami-fondo-movil`, `.miami-fondo-ancho`).
 *
 * Los generadores usan semilla fija: la ciudad es la misma en cada visita.
 */
import type { ReactNode } from 'react'
import { COLOR, MIAMI } from '../lib/diseño'

function semilla(n: number) {
  return () => {
    n |= 0; n = (n + 0x6D2B79F5) | 0
    let t = Math.imul(n ^ (n >>> 15), 1 | n)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Palma = { x: number; base: number; h: number; inclina: number; k: number }

type Forma = {
  id: string
  W: number; H: number
  /** Linea del horizonte: arriba la ciudad, abajo el piso mojado. */
  HOR: number
  hotel: { x: number; w: number; top: number }
  lejos: { x0: number; x1: number; alto: number }
  palmas: Palma[]
  /** Donde caen los reflejos magenta y cian, en x. */
  reflejos: { m: [number, number]; c: [number, number] }
  semilla: number
}

const MOVIL: Forma = {
  id: 'm', W: 400, H: 900, HOR: 600,
  hotel: { x: -44, w: 178, top: 230 },
  lejos: { x0: 150, x1: 400, alto: 100 },
  palmas: [
    { x: 36, base: 760, h: 440, inclina: 36, k: 1.3 },
    { x: 394, base: 860, h: 780, inclina: -74, k: 2.5 },
    { x: 336, base: 690, h: 330, inclina: -34, k: 1.3 },
  ],
  reflejos: { m: [-40, 190], c: [200, 400] },
  semilla: 11,
}

const ANCHO: Forma = {
  id: 'a', W: 1600, H: 900, HOR: 610,
  hotel: { x: -70, w: 470, top: 170 },
  lejos: { x0: 560, x1: 1600, alto: 150 },
  palmas: [
    { x: 90, base: 780, h: 500, inclina: 44, k: 1.8 },
    { x: 1545, base: 860, h: 740, inclina: -130, k: 3.2 },
    { x: 1250, base: 700, h: 360, inclina: -64, k: 1.7 },
    { x: 1400, base: 720, h: 390, inclina: -50, k: 1.5 },
  ],
  reflejos: { m: [-70, 420], c: [700, 1600] },
  semilla: 23,
}

/** Una palmera en silueta: tronco curvo y frondas como hojas caidas. */
function PalmaSvg({ x, base, h, inclina, k }: Palma) {
  const cx = x + inclina, cy = base - h
  const L = 78 * k
  const hoja = `M0 0 C ${L * .3} ${-L * .3}, ${L * .72} ${-L * .22}, ${L} ${L * .2} C ${L * .72} ${-L * .02}, ${L * .3} ${-L * .05}, 0 0Z`
  const angulos = [-70, -42, -14, 14, 40]
  return (
    <g fill={MIAMI.palmera} stroke={MIAMI.palmera}>
      <path d={`M${x} ${base} Q${x + inclina * .3} ${base - h * .55} ${cx} ${cy}`}
        fill="none" strokeWidth={7 * k} strokeLinecap="round" />
      {angulos.map(a => (
        <g key={a}>
          <path d={hoja} transform={`translate(${cx} ${cy}) rotate(${a})`} stroke="none" />
          <path d={hoja} transform={`translate(${cx} ${cy}) scale(-1 1) rotate(${a})`} stroke="none" />
        </g>
      ))}
      <path d={hoja} transform={`translate(${cx} ${cy}) rotate(-96) scale(.72)`} stroke="none" />
    </g>
  )
}

/** El skyline de la otra orilla: torres finas con las luces encendidas y, de
 *  vez en cuando, una de cristal que cambia de turquesa a magenta. */
function Lejos({ f }: { f: Forma }) {
  const rnd = semilla(f.semilla)
  const piezas: ReactNode[] = []
  const { x0, x1, alto } = f.lejos
  let x = x0, i = 0
  while (x < x1) {
    const w = 6 + rnd() * 11
    const h = alto * (.22 + Math.pow(rnd(), 1.6) * .78)
    const cristal = rnd() > .82
    piezas.push(
      <g key={i}>
        <rect x={x} y={f.HOR - h} width={w} height={h}
          fill={cristal ? 'url(#fm-cristal-' + f.id + ')' : '#0B0717'} opacity={cristal ? .85 : 1} />
        {cristal && <rect x={x} y={f.HOR - h} width={w} height={1.6} fill={COLOR.acento} opacity=".9" />}
        {Array.from({ length: Math.floor(h / 7) }, (_, r) =>
          rnd() > .66 ? (
            <rect key={r} x={x + 1.5 + rnd() * (w - 4)} y={f.HOR - h + 4 + r * 7}
              width={1.7} height={2.4}
              fill={[COLOR.admin, COLOR.acento, '#FFFFFF', COLOR.admin][Math.floor(rnd() * 4)]}
              opacity={.5 + rnd() * .45} />
          ) : null)}
      </g>,
    )
    x += w + 1 + rnd() * 3; i++
  }
  return <>{piezas}</>
}

/** El hotel Art Deco: pisos que retroceden, una tira de neon rosa en cada
 *  cornisa y su resplandor lavando la pared de abajo. */
function Hotel({ f }: { f: Forma }) {
  const rnd = semilla(f.semilla + 5)
  const { x, w, top } = f.hotel
  const pisos = 6
  const alto = (f.HOR - top) / pisos
  const pieles: ReactNode[] = []
  for (let i = 0; i < pisos; i++) {
    const y = top + i * alto
    const ultimo = i === pisos - 1
    // Cada piso entra un poco por la derecha: es lo que hace «escalonado» al
    // edificio y le da el perfil Art Deco.
    const ancho = w - (pisos - 1 - i) * (w * .035)
    pieles.push(
      <g key={i}>
        <rect x={x} y={y} width={ancho} height={alto} fill={`url(#fm-pared-${f.id})`} />
        <rect x={x} y={y} width={ancho} height={alto * .8} fill={`url(#fm-lavado-${f.id})`} />
        {Array.from({ length: Math.floor(ancho / 16) }, (_, c) =>
          [0, 1].map(r => rnd() > .45 ? (
            <rect key={`${c}-${r}`} x={x + 8 + c * 16} y={y + 10 + r * (alto * .32)}
              width={8} height={alto * .2}
              fill={rnd() > .55 ? '#FFB48A' : '#FF8AD8'} opacity={.16 + rnd() * .3} />
          ) : null))}
        <rect x={x} y={y} width={ancho} height={3.4}
          fill={ultimo ? COLOR.admin : COLOR.acento} filter={`url(#fm-brillo-${f.id})`} />
      </g>,
    )
  }
  const aleron = x + w - (pisos - 1) * 0 // el piso de arriba conserva el ancho total
  return (
    <g>
      {pieles}
      {/* Marquesina de la entrada: un filete cian y la luz calida del lobby. */}
      <rect x={x} y={f.HOR - alto * .55} width={w * .8} height={alto * .55} fill="#FFB48A" opacity=".16" />
      <rect x={x} y={f.HOR - alto * .55} width={w * .8} height={2.6}
        fill={COLOR.admin} filter={`url(#fm-brillo-${f.id})`} />
      {/* Remate vertical, como el letrero de un hotel de Ocean Drive. */}
      <rect x={aleron - 22} y={top - alto * .9} width={5} height={alto * .9}
        fill={COLOR.acento} filter={`url(#fm-brillo-${f.id})`} />
    </g>
  )
}

function Escena({ f }: { f: Forma }) {
  const rnd = semilla(f.semilla + 9)
  const { W, H, HOR, id } = f
  const rayas: ReactNode[] = []
  const tramo = (rango: [number, number], n: number, color: 'm' | 'c', k: number) => {
    for (let i = 0; i < n; i++) {
      const w = 2.5 + rnd() * 8
      rayas.push(
        <rect key={`${color}${k}${i}`}
          x={rango[0] + rnd() * (rango[1] - rango[0])} y={HOR + 3} width={w}
          height={70 + rnd() * (H - HOR) * .75}
          fill={`url(#fm-raya-${color}-${id})`} opacity={.3 + rnd() * .5} />,
      )
    }
  }
  tramo(f.reflejos.m, W > 800 ? 34 : 18, 'm', 0)
  tramo(f.reflejos.c, W > 800 ? 40 : 20, 'c', 1)

  const destellos = Array.from({ length: 16 }, (_, i) => (
    <ellipse key={i}
      cx={rnd() * W} cy={HOR + 24 + rnd() * (H - HOR) * .8}
      rx={30 + rnd() * 120} ry={1.5 + rnd() * 4}
      fill={[COLOR.admin, COLOR.acento, '#FFFFFF'][Math.floor(rnd() * 3)]} opacity={.1 + rnd() * .16} />
  ))
  const bokeh = Array.from({ length: 14 }, (_, i) => (
    <circle key={i} cx={f.lejos.x0 - 60 + rnd() * (W - f.lejos.x0 + 60)} cy={HOR - 40 + rnd() * 70}
      r={2 + rnd() * 5} fill={rnd() > .5 ? COLOR.admin : COLOR.acento} opacity={.35 + rnd() * .4} />
  ))

  return (
    <svg aria-hidden focusable="false" className={f.id === 'm' ? 'miami-fondo-movil' : 'miami-fondo-ancho'}
      viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <defs>
        <filter id={`fm-brillo-${id}`} x="-20%" y="-300%" width="140%" height="700%">
          <feGaussianBlur stdDeviation="3.4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id={`fm-borroso-${id}`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
        <filter id={`fm-suave-${id}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <linearGradient id={`fm-cielo-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#07060F" />
          <stop offset=".38" stopColor="#150B2C" />
          <stop offset=".72" stopColor="#2E0F45" />
          <stop offset="1" stopColor="#5A1763" />
        </linearGradient>
        <radialGradient id={`fm-haze-m-${id}`}>
          <stop offset="0" stopColor={COLOR.acento} stopOpacity=".5" />
          <stop offset="1" stopColor={COLOR.acento} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`fm-haze-c-${id}`}>
          <stop offset="0" stopColor={COLOR.admin} stopOpacity=".4" />
          <stop offset="1" stopColor={COLOR.admin} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`fm-pared-${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#4A1650" />
          <stop offset="1" stopColor="#170A22" />
        </linearGradient>
        <linearGradient id={`fm-lavado-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={COLOR.acento} stopOpacity=".5" />
          <stop offset="1" stopColor={COLOR.acento} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`fm-cristal-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={COLOR.acento} stopOpacity=".7" />
          <stop offset="1" stopColor="#1A8FA0" stopOpacity=".5" />
        </linearGradient>
        <linearGradient id={`fm-suelo-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1B0C30" />
          <stop offset=".5" stopColor="#0B0716" />
          <stop offset="1" stopColor="#06050B" />
        </linearGradient>
        <linearGradient id={`fm-desvanece-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id={`fm-mascara-${id}`} maskUnits="userSpaceOnUse" x="0" y={HOR} width={W} height={H - HOR}>
          <rect x="0" y={HOR} width={W} height={H - HOR} fill={`url(#fm-desvanece-${id})`} />
        </mask>
        <linearGradient id={`fm-raya-m-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={COLOR.acento} stopOpacity=".95" />
          <stop offset="1" stopColor={COLOR.acento} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`fm-raya-c-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={COLOR.admin} stopOpacity=".95" />
          <stop offset="1" stopColor={COLOR.admin} stopOpacity="0" />
        </linearGradient>
        <g id={`fm-lejos-${id}`}><Lejos f={f} /></g>
      </defs>

      {/* Cielo: casi negro arriba y, hacia el horizonte, la bruma violeta de la
          ciudad. Sin esto las palmeras (que son negras) se pierden. */}
      <rect x="0" y="0" width={W} height={HOR + 1} fill={`url(#fm-cielo-${id})`} />

      {/* Luz de ciudad en el horizonte: magenta a la izquierda, cian a la derecha. */}
      <ellipse cx={W * .12} cy={HOR} rx={W * .5} ry={H * .09} fill={`url(#fm-haze-m-${id})`} />
      <ellipse cx={W * .82} cy={HOR} rx={W * .42} ry={H * .07} fill={`url(#fm-haze-c-${id})`} />

      {/* El piso mojado. */}
      <rect x="0" y={HOR} width={W} height={H - HOR + 2} fill={`url(#fm-suelo-${id})`} />
      <g mask={`url(#fm-mascara-${id})`} opacity=".75">
        <use href={`#fm-lejos-${id}`} transform={`translate(0 ${HOR * 2}) scale(1 -1)`} filter={`url(#fm-borroso-${id})`} />
      </g>
      <g filter={`url(#fm-borroso-${id})`}>{rayas}</g>
      <g>{destellos}</g>

      {/* La otra orilla, y su luz. */}
      <use href={`#fm-lejos-${id}`} />
      <g filter={`url(#fm-suave-${id})`}>{bokeh}</g>
      <rect x="0" y={HOR - .6} width={W} height="1.4" fill={COLOR.admin} opacity=".35" filter={`url(#fm-brillo-${id})`} />

      <Hotel f={f} />

      {/* Palmeras, delante de todo. */}
      {f.palmas.map((p, i) => <PalmaSvg key={i} {...p} />)}
    </svg>
  )
}

export default function FondoMiami() {
  return (
    <>
      <Escena f={MOVIL} />
      <Escena f={ANCHO} />
    </>
  )
}
