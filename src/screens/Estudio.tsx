// Pantalla 15 — Estudio de creadora
//
// El estudio solo ofrecia "publicar un clip", aunque la plataforma promete
// varias formas de ganar. Aqui estan, cada una diciendo si ya se puede usar:
// mostrar lo que falta es mas util que esconderlo, porque una creadora que no
// encuentra un canal asume que no existe.
//
// ---------- Pero no todas son lo mismo ----------
//
// La lista trataba igual «subir un clip», que se hace mil veces, y «define tu
// nivel de suscripcion», que se hace una. Esa mezcla es lo que hacia que el
// estudio pareciera un panel de configuracion en vez de un sitio de trabajo:
// cada vez que entrabas a publicar, pasabas por encima de ajustes que ya
// habias dejado resueltos hacia meses.
//
// Ahora van en dos grupos —`hacer` y `ajustar`, ver src/lib/estudio.ts— y el
// segundo va despues y en voz mas baja. Y dentro de `ajustar`, la cuenta para
// cobrar solo aparece MIENTRAS NO EXISTA: lo que ya esta hecho se esconde, lo
// que falta y bloquea dinero se queda a la vista.
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSesion } from '../lib/sesion'
import { resumen, canales, type Canal, type ResumenEstudio } from '../lib/estudio'
import { usd } from '../lib/dinero'
import { COLOR, FUENTE, RADIO } from '../lib/diseño'
import Icono from '../components/Iconos'
import { Pulsable, Enlace } from '../components/Pulsable'
import Centro from '../components/Centro'
import { perfilParaPublicar } from '../lib/trato'
import VincularTelegram from '../components/VincularTelegram'


const COLOR_ESTADO: Record<Canal['estado'], string> = {
  listo: COLOR.dinero,
  sin_configurar: COLOR.admin,
  // textoSuave y no textoTenue: la leyenda «En construccion» se lee, y el
  // gris tenue (3.78:1) no llega a AA.
  en_obra: COLOR.textoSuave,
}
const LEYENDA: Record<Canal['estado'], string> = {
  listo: 'Activo',
  sin_configurar: 'Sin configurar',
  en_obra: 'En construcción',
}

export default function Estudio() {
  const nav = useNavigate()
  const { sesion, perfil, trato, cargando } = useSesion()
  const [r, setR] = useState<ResumenEstudio | null>(null)

  useEffect(() => {
    if (cargando || !sesion) return
    let vivo = true
    resumen(sesion.user.id).then(x => { if (vivo) setR(x) })
    return () => { vivo = false }
  }, [sesion, cargando])

  if (cargando) return <Centro texto="Cargando…" />
  if (!perfil?.is_creator) return (
    <Centro
      texto={`Activa tu ${perfilParaPublicar(trato)} para abrir el estudio.`}
      accion={{ texto: 'Ir a mi perfil', al: () => nav('/perfil') }}
    />
  )
  if (!r) return <Centro texto="Cargando…" />

  const lista = canales(r)
  const hacer = lista.filter(c => c.grupo === 'hacer')
  const ajustar = lista.filter(c => c.grupo === 'ajustar')

  /* Modo consumo (DESIGN-BRIEF.md): el estudio es un sitio de trabajo, no una
   * vitrina. Fondo plano, titulares de interfaz y esquinas suaves; el color
   * queda para lo que importa —el dinero y el aviso de verificacion. */
  return (
    <div style={{
      minHeight: '100%', boxSizing: 'border-box', padding: '28px 18px 40px',
      background: COLOR.fondo, color: COLOR.texto, fontFamily: FUENTE.ui,
      width: '100%', maxWidth: 680, margin: '0 auto',
    }}>
      {/* Sin flecha de volver: el estudio es un destino de la barra, no una
          pantalla a la que se entra desde otra. La flecha apuntaba a /perfil,
          de cuando el estudio vivia dentro de «Yo» —y ahora /perfil son los
          ajustes de cuenta, asi que «volver» llevaba a un formulario que no
          tiene nada que ver. */}
      <h1 style={{ margin: '0 0 18px', font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 2, textTransform: 'uppercase', color: COLOR.dinero }}>
        Estudio
      </h1>

      {/* El numero salio del titular a proposito: decia «seis formas» y la
          lista ya no tiene seis, porque dos eran la misma cosa contada dos
          veces. Un numero en un titular es una promesa que hay que mantener
          sincronizada con un array, y se desincroniza siempre. */}
      <h2 style={{ margin: '0 0 8px', font: `700 28px/1.15 ${FUENTE.ui}` }}>
        Formas <span style={{ color: COLOR.dinero }}>de ganar</span>
      </h2>
      <div style={{ font: `400 16px/1.4 ${FUENTE.ui}`, color: COLOR.textoSuave, marginBottom: 22 }}>
        No tienes que usarlas todas. Empieza por una y ve sumando.
      </div>

      {/* Aviso de verificacion. Va ANTES que todo lo demas: sin esto, la
          creadora llena el formulario de subida y hasta el final se topa con un
          rechazo que no explica nada. Mejor decirselo al entrar. */}
      {!perfil.identidad_verificada && (
        <Enlace a="/verificar" style={{
          display: 'block', boxSizing: 'border-box', width: '100%', borderRadius: RADIO.neon,
          border: `1.5px solid ${COLOR.acento}`, background: 'rgba(255,43,209,.08)',
          padding: '18px 16px', marginBottom: 18, cursor: 'pointer',
        }}>
          <div style={{ font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 2, textTransform: 'uppercase', color: '#FF5BDC' }}>
            Falta verificar tu identidad
          </div>
          <div style={{ font: `400 14px/1.5 ${FUENTE.ui}`, color: COLOR.texto, marginTop: 9 }}>
            Para publicar y para cobrar necesitamos comprobar que eres mayor de edad. Es una sola vez.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 12 }}>
            <span style={{ font: `400 12px/1.45 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
              Toma dos minutos
            </span>
            <span aria-hidden style={{ font: `700 16px/1 ${FUENTE.ui}`, color: '#FF5BDC' }}>&#8594;</span>
          </div>
        </Enlace>
      )}

      {/* ganancias acumuladas */}
      <Enlace a="/wallet" className="tarjeta-sobria" style={{
        width: '100%', padding: '18px 16px', marginBottom: 22, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 2, textTransform: 'uppercase', color: COLOR.textoSuave }}>
            Has ganado
          </div>
          {/* usd() y no el entero en crudo: el libro guarda CENTAVOS. Asi
              como estaba, haber ganado 2.40 se leia como «240 dólares». */}
          <div style={{ marginTop: 9 }}>
            <span style={{ font: `700 34px/1 ${FUENTE.ui}`, color: COLOR.dinero }}>
              {usd(r.ganancias)}
            </span>
          </div>
        </div>
        <span aria-hidden style={{ color: COLOR.textoSuave, font: `400 22px/1 ${FUENTE.ui}` }}>›</span>
      </Enlace>

      <Lista canales={hacer} nav={nav} />

      {ajustar.length > 0 && (
        <>
          {/* El rotulo y el espacio son todo lo que separa «lo que haces» de
              «lo que configuraste una vez». No hace falta esconderlo detras de
              un toque: basta con que no compita. */}
          <h2 style={{
            font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 2,
            textTransform: 'uppercase', color: COLOR.textoSuave,
            margin: '30px 0 12px',
          }}>
            Ajustes de tu estudio
          </h2>
          <Lista canales={ajustar} nav={nav} />
        </>
      )}

      <VincularTelegram />
    </div>
  )
}

function Lista({ canales, nav }: { canales: Canal[]; nav: (r: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {canales.map(c => {
        const activo = c.estado !== 'en_obra'
        return (
          <Pulsable key={c.clave}
            al={() => { if (c.ruta) nav(c.ruta) }}
            activo={activo && !!c.ruta}
            className="tarjeta-sobria"
            style={{
              width: '100%', textAlign: 'left',
              display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 14px', minHeight: 64,
              cursor: activo ? 'pointer' : 'default',
              opacity: activo ? 1 : .7,
            }}>
            <span aria-hidden style={{
              flex: '0 0 auto', width: 42, height: 42, borderRadius: 10, display: 'grid', placeItems: 'center',
              color: COLOR_ESTADO[c.estado], background: COLOR.fondo,
              border: `1px solid ${c.estado === 'en_obra' ? 'rgba(255,255,255,.14)' : COLOR_ESTADO[c.estado] + '66'}`,
            }}>
              <Icono nombre={c.icono} tam={20} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ font: `700 16px/1.3 ${FUENTE.ui}` }}>{c.titulo}</span>
                <span style={{
                  font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.1, textTransform: 'uppercase',
                  color: c.estado === 'listo' ? COLOR.fondo : COLOR_ESTADO[c.estado],
                  background: c.estado === 'listo' ? COLOR.dinero : 'transparent',
                  border: c.estado === 'listo' ? 'none' : `1px solid ${COLOR_ESTADO[c.estado]}`,
                  borderRadius: 6, padding: '4px 7px',
                }}>{LEYENDA[c.estado]}</span>
              </div>
              <div style={{ font: `400 13px/1.45 ${FUENTE.ui}`, color: COLOR.textoSuave, marginTop: 5 }}>
                {c.descripcion}
              </div>
              {c.nota && (
                <div style={{ font: `400 12px/1.45 ${FUENTE.ui}`, color: COLOR.textoSuave, marginTop: 5 }}>
                  {c.nota}
                </div>
              )}
            </div>
            {activo && <span aria-hidden style={{ color: COLOR.textoSuave, marginTop: 8, font: `400 22px/1 ${FUENTE.ui}` }}>›</span>}
          </Pulsable>
        )
      })}
    </div>
  )
}
