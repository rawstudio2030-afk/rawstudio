// Barra inferior y guardias de ruta.
//
// Sustituye al indice de pantallas, que era andamio de desarrollo: mostraba las
// 15 pantallas a cualquiera, incluidas las de entrada y la de administracion.
import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Enlace } from './Pulsable'
import { useSesion } from '../lib/sesion'
import { soyAdmin } from '../lib/papel'
import type { Destino } from '../lib/rutas'
import {
  BARRA, ESTUDIO, BIBLIOTECA_DE_CREADORA, RUTAS_ENTRADA, RUTAS_PANEL, REDIRIGE_SI_HAY_SESION, EXIGE_SESION,
  papelDe, visiblesPara, type Papel,
} from '../lib/rutas'
import { COLOR, LINEA, FUENTE, DEGRADADO } from '../lib/diseño'
import Icono from './Iconos'
import Wordmark from './Wordmark'
import { elegirModo } from '../lib/modo'
import { useAlbumes } from '../lib/useAlbumes'


/** El papel y el permiso de administrar se resuelven una vez y se comparten;
 *  consultar es_admin() en cada pantalla seria una ida a la base por render.
 *
 *  Van SEPARADOS. Antes `papelDe` devolvia 'admin' y con eso se perdia si la
 *  persona ademas era creadora, que es justo lo que hay que saber para armarle
 *  la barra. */
export function usePapel(): { papel: Papel; esAdmin: boolean; cargando: boolean } {
  const { sesion, perfil, cargando } = useSesion()
  const [admin, setAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    let vivo = true
    if (cargando) return
    if (!sesion) { setAdmin(false); return }
    soyAdmin().then(v => { if (vivo) setAdmin(v) })
    return () => { vivo = false }
  }, [sesion, cargando])

  return {
    papel: papelDe(!!sesion, perfil?.is_creator),
    esAdmin: admin === true,
    cargando: cargando || (!!sesion && admin === null),
  }
}

/** Manda a cada quien donde le toca. Sin esto, una visitante podia abrir
 *  /admin o /upload y toparse con una pantalla que no le corresponde, y quien
 *  ya entro seguia viendo la puerta de acceso. */
export function GuardiaRutas() {
  const { sesion, cargando } = useSesion()
  const nav = useNavigate()
  const aqui = useLocation().pathname

  useEffect(() => {
    if (cargando) return
    // Durante una recuperacion hay sesion pero la persona AUN no termina de
    // entrar: falta poner la contraseña. Expulsarla al contenido aqui es lo que
    // hacia parecer que el enlace del correo no servia.
    if (sessionStorage.getItem('rawstudio.recuperando') === '1') {
      if (aqui !== '/nueva-clave') nav('/nueva-clave', { replace: true })
      return
    }
    if (sesion && REDIRIGE_SI_HAY_SESION.includes(aqui)) {
      nav('/clip', { replace: true }); return
    }
    if (!sesion && EXIGE_SESION.includes(aqui)) {
      nav('/entrar', { replace: true })
    }
  }, [sesion, cargando, aqui, nav])

  return null
}

/** El destino activo se pinta en magenta, salvo la puerta al panel, que va en
 *  cian: es el color que el panel usa entero para decir «esto es
 *  privilegiado», y la puerta tiene que verse como lo que abre. */
const resalte = (d: { soloAdmin?: boolean }) => d.soloAdmin ? COLOR.admin : COLOR.acento

/** El rotulo se encoge segun cuantos destinos haya, porque todos van a
 *  `flex: 1` y el ancho de cada uno sale de dividir la pantalla.
 *
 *  MEDIDO, no estimado, con el tipo real a 360 px de ancho —el telefono chico
 *  que todavia se usa—:
 *
 *    5 destinos a 9px/1.2    «BIBLIOTECA» mide 69 px y hay 64
 *    5 destinos a 8.5px/0.8  todo cabe
 *    6 destinos a 8px/0.5    «BIBLIOTECA» mide 56 px y hay 54
 *    6 destinos a 7.5px/0.3  todo cabe
 *
 *  O sea que el caso de cinco ya estaba roto antes de que Dinero subiera a la
 *  barra: una compradora en un telefono de 360 px veia «BIBLIOTECA» partida o
 *  recortada. No se habia notado porque nadie midio. */
function rotuloPara(cuantos: number): { px: number; esp: number } {
  if (cuantos >= 6) return { px: 7.5, esp: 0.3 }
  if (cuantos === 5) return { px: 8.5, esp: 0.8 }
  return { px: 9, esp: 1.2 }
}

export function BarraInferior() {
  const aqui = useLocation().pathname
  const { papel, esAdmin } = usePapel()

  // Las pantallas de entrada son a pantalla completa: una barra ahi rompe su
  // intencion y ofrece destinos que todavia no aplican.
  //
  // Quien no ha entrado SI lleva barra, con tres destinos suyos: explorar,
  // publicar y entrar. Antes no llevaba ninguna, asi que al llegar al
  // catalogo sin cuenta se quedaba sin manera de ir a ningun lado.
  if (RUTAS_ENTRADA.includes(aqui)) return null
  // El panel trae barra lateral propia; la de abajo tapa filas de tabla.
  if (RUTAS_PANEL.some(r => aqui.startsWith(r))) return null

  return <VistaBarraInferior destinos={visiblesPara(BARRA, papel, esAdmin)} aqui={aqui} />
}

/** Lo que se ve de la barra. No decide QUE destinos hay —eso lo hace
 *  `BarraInferior` segun el papel—: los recibe, y por eso se puede dibujar con
 *  cinco o seis sin tener una sesion de cada tipo.
 *
 *  Direccion «Miami Neon Night» (DESIGN-BRIEF.md): el destino activo se
 *  enciende como un letrero —icono con resplandor, rotulo con halo y un filete
 *  de neon arriba— y el resto se apaga a un gris legible. */
export function VistaBarraInferior({ destinos, aqui }: { destinos: Destino[]; aqui: string }) {
  const rotulo = rotuloPara(destinos.length)

  return (
    /* `display: flex` va en la hoja de estilos y NO aqui: un estilo en linea
       le gana a la regla del @media, y la barra seguia pintandose debajo del
       riel en pantalla ancha. */
    <nav className="barra-abajo" style={{
      position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 900,
      background: 'rgba(8,8,10,.94)',
      backdropFilter: 'blur(14px)',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {/* El filo de arriba: un hilo de degradado de magenta a cian, la misma
          linea que firma la portada. */}
      <div aria-hidden style={{
        position: 'absolute', left: 0, right: 0, top: 0, height: 1,
        background: DEGRADADO.hilo, opacity: .55,
        boxShadow: '0 0 10px rgba(255,43,209,.45)',
      }} />
      {destinos.map(d => {
        const activo = aqui === d.path || aqui.startsWith(d.path + '/')
        const color = resalte(d)
        return (
          <Enlace key={d.path} a={d.path} al={() => {
            // Tocar la barra tambien deja apuntado el sombrero. Sin esto, quien
            // entro al panel y volvio por aqui seguiria aterrizando en el panel
            // la proxima vez, sin haberlo vuelto a pedir.
            elegirModo(d.soloAdmin ? 'panel' : 'app')
          }} style={{
            position: 'relative',
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 6, padding: '12px 4px 12px', cursor: 'pointer',
            // El apagado era textoTenue (3.78:1, no llega a AA): un rotulo de
            // navegacion no es decoracion.
            color: activo ? color : d.soloAdmin ? COLOR.admin : COLOR.textoSuave,
            background: activo ? `linear-gradient(180deg, ${color}26, transparent 75%)` : 'transparent',
          }}>
            {activo && (
              <span aria-hidden style={{
                position: 'absolute', top: 0, left: '22%', right: '22%', height: 2, borderRadius: 2,
                background: color, boxShadow: `0 0 8px ${color}, 0 0 18px ${color}99`,
              }} />
            )}
            <span style={{
              display: 'flex', lineHeight: 1,
              filter: activo ? `drop-shadow(0 0 5px ${color}cc)` : 'none',
            }}><Icono nombre={d.icono} tam={22} /></span>
            <span style={{
              font: `700 ${rotulo.px}px/1 ${FUENTE.ui}`, letterSpacing: rotulo.esp,
              textTransform: 'uppercase',
              textShadow: activo ? `0 0 10px ${color}88` : 'none',
              // Sin esto un rotulo que no quepa parte en dos lineas y cambia
              // la ALTURA de la barra entera, que es peor que recortarse.
              whiteSpace: 'nowrap',
            }}>{d.titulo}</span>
          </Enlace>
        )
      })}
    </nav>
  )
}

/** Espacio para que el contenido no quede debajo de la barra.
 *
 *  flex 0 0 auto NO es decorativo: index.css tiene "#root > * { flex: 1 }"
 *  para que las pantallas ocupen el alto completo, y esa regla le pone
 *  flex-basis 0% a este div. Con el contenido desbordando no hay espacio
 *  libre que repartir, asi que el alto se ignoraba y el hueco MEDIA CERO.
 *  El espaciador existia, se dibujaba, y no separaba nada: la barra tapaba
 *  los ultimos 64px de todas las pantallas. */
export function HuecoBarra() {
  const aqui = useLocation().pathname
  if (RUTAS_ENTRADA.includes(aqui)) return null
  if (RUTAS_PANEL.some(r => aqui.startsWith(r))) return null
  return (
    <div className="hueco-barra" style={{
      flex: '0 0 auto',
      height: 'calc(64px + env(safe-area-inset-bottom))',
    }} />
  )
}


/* ---------- Riel de la izquierda ---------- */

/** La misma navegacion, en columna, para pantalla ancha.
 *
 *  La barra de abajo es un patron de telefono: en una pantalla de computadora
 *  queda repartida a lo ancho de 1280 pixeles con tres iconos perdidos, y la
 *  columna que sobra a la izquierda se desperdicia. Es lo que hace TikTok —y
 *  casi todo lo demas— al pasar de la aplicacion a la web.
 *
 *  Quien decide cual se ve es la hoja de estilos, no este componente: los dos
 *  se pintan siempre y el corte de 1024 apaga el que no toca. Hacerlo con
 *  JavaScript obligaria a escuchar el tamaño de la ventana y a repintar al
 *  arrastrar el borde.
 *
 *  El riel reserva su propio espacio: al montarse le pone una clase al body y
 *  al desmontarse se la quita. Asi nadie mas tiene que acordarse de dejarle
 *  hueco, y en las pantallas donde no sale —la entrada, el panel— no lo pide.
 */
export function BarraLateral() {
  const aqui = useLocation().pathname
  const { papel, esAdmin } = usePapel()
  const albumes = useAlbumes()

  const fuera = RUTAS_ENTRADA.includes(aqui) || RUTAS_PANEL.some(r => aqui.startsWith(r))

  useEffect(() => {
    if (fuera) return
    document.body.classList.add('con-riel')
    return () => document.body.classList.remove('con-riel')
  }, [fuera])

  if (fuera) return null

  const principales = visiblesPara(BARRA, papel, esAdmin)
    .filter(d => d.path !== '/estudio' && d.path !== '/admin')
  // Quien publica tambien compra: en el riel hay sitio para su Biblioteca.
  if (papel === 'creadora') principales.splice(1, 0, BIBLIOTECA_DE_CREADORA)
  const estudio = visiblesPara(ESTUDIO, papel, esAdmin)
  // Con los albumes encendidos, «Subir fotos» va justo debajo de «Subir un clip».
  if (albumes?.activos && papel === 'creadora') {
    const i = estudio.findIndex(d => d.path === '/upload')
    estudio.splice(i + 1, 0, { path: '/upload/album', titulo: 'Subir fotos', icono: 'subir', papeles: ['creadora'] })
  }
  const panel = visiblesPara(BARRA, papel, esAdmin).find(d => d.path === '/admin')
  const entradaEstudio = visiblesPara(BARRA, papel, esAdmin).find(d => d.path === '/estudio')

  return (
    <nav className="barra-lado" style={{
      position: 'fixed', left: 0, top: 0, bottom: 0, width: ANCHO_RIEL, zIndex: 900,
      boxSizing: 'border-box',
      // El mismo cielo de la portada, muy bajo: el riel es modo sobrio, asi
      // que solo se le insinua.
      background: `linear-gradient(180deg, rgba(123,60,255,.1) 0%, transparent 38%), ${COLOR.superficie}`,
      borderRight: `1px solid ${LINEA.tenue}`,
      flexDirection: 'column', overflowY: 'auto',
    }}>
      {/* El logo de verdad, no la palabra en Anton. En la portada y en el
          acceso sale la marca con su resplandor, y aqui salia «RAWSTUDIO»
          escrito: dos marcas para el mismo sitio. Wordmark ya es un boton que
          lleva a casa, asi que no va dentro de un Enlace. */}
      <div style={{ padding: '18px 18px 14px' }}>
        <Wordmark ancho={118} glow={7} />
      </div>

      <div style={{ padding: '4px 0 10px' }}>
        {principales.map(d => <Renglon key={d.path} d={d} aqui={aqui} />)}
      </div>

      {estudio.length > 0 && (
        <div style={{ borderTop: `1px solid ${LINEA.tenue}`, marginTop: 4, paddingTop: 8 }}>
          {/* «Estudio» era un rotulo de 9 px casi apagado: se leia como un
              titulo, no como algo que se pulsa, y en el telefono SI es un
              boton con icono. Ahora es un renglon igual que los demas. Lleva al
              estudio completo, donde siguen las descripciones y el estado de
              cada canal, que en el riel no caben. */}
          {entradaEstudio && (
            <Renglon d={entradaEstudio} aqui={aqui} tono={COLOR.dinero} exacto />
          )}
          <div style={{ paddingBottom: 10, paddingLeft: 16 }}>
            {estudio.map(d => <Renglon key={d.path} d={d} aqui={aqui} tono={COLOR.dinero} />)}
          </div>
        </div>
      )}

      <div style={{ flex: 1 }} />

      {panel && (
        <div style={{ borderTop: `1px solid ${LINEA.tenue}`, padding: '8px 0 14px' }}>
          <Renglon d={panel} aqui={aqui} tono={COLOR.admin} />
        </div>
      )}
    </nav>
  )
}

const ANCHO_RIEL = 228

function Renglon({ d, aqui, tono = COLOR.acento, exacto }: {
  d: Destino; aqui: string; tono?: string
  /** Solo se enciende en la ruta misma, no en las de abajo (el Estudio y sus hijos). */
  exacto?: boolean
}) {
  const activo = exacto ? aqui === d.path : aqui === d.path || aqui.startsWith(d.path + '/')
  return (
    <Enlace a={d.path} al={() => elegirModo(d.soloAdmin ? 'panel' : 'app')} style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '11px 18px',
      cursor: 'pointer',
      background: activo ? `linear-gradient(90deg, ${tono}26, transparent 85%)` : 'transparent',
      borderLeft: `2px solid ${activo ? tono : 'transparent'}`,
      boxShadow: activo ? `-1px 0 12px -3px ${tono}` : 'none',
      color: activo ? COLOR.texto : COLOR.textoSuave,
    }}>
      <span style={{ width: 18, display: 'grid', placeItems: 'center',
        color: activo ? tono : COLOR.textoTenue,
        filter: activo ? `drop-shadow(0 0 4px ${tono}cc)` : 'none' }}><Icono nombre={d.icono} tam={17} /></span>
      <span style={{ font: `${activo ? 700 : 500} 13px/1 ${FUENTE.ui}` }}>{d.titulo}</span>
    </Enlace>
  )
}
