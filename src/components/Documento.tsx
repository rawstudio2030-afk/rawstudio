/* El marco de las paginas de texto largo: legal, contacto, preguntas.
 *
 * Estaba dentro de Legal.tsx y servia a dos pantallas. Al aparecer el contacto
 * y las preguntas frecuentes serian cuatro, y cuatro copias de un encabezado
 * se separan: una queda con el titulo en otro tamaño, otra pierde el boton de
 * cerrar, y al final cada documento parece de un sitio distinto.
 *
 * ---------- Los corchetes se resaltan, no se esconden ----------
 *
 * `[RAZÓN SOCIAL]` y los suyos marcan lo que falta definir con abogado. Se
 * pintan en rosa a proposito: un marcador que pasa inadvertido acaba
 * publicado. El resaltado solo ocurre si `aviso` esta puesto, o sea en los
 * documentos legales; contacto y preguntas no tienen huecos que marcar.
 */
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import Wordmark from './Wordmark'
import { COLOR, FUENTE, RADIO } from '../lib/diseño'
import { Pulsable } from './Pulsable'

export type Aviso = { titulo: string; texto: string; lista?: string[] }

export function MarcoDocumento({ titulo, version, aviso, children }: {
  /** Dos lineas: la segunda se pinta en verde. Un titulo de una sola linea va
   *  con la segunda vacia. */
  titulo: [string, string]
  version?: string
  aviso?: Aviso
  children: ReactNode
}) {
  const nav = useNavigate()
  /* Modo consumo (DESIGN-BRIEF.md): son textos para LEER, a veces largos y con
   * consecuencias legales. Fondo plano, titular de interfaz, cuerpo en un gris
   * claro y cero decoracion. */
  return (
    <div style={{
      minHeight: '100%', boxSizing: 'border-box', padding: '20px 18px 40px',
      background: COLOR.fondo, color: COLOR.texto, fontFamily: FUENTE.ui,
      width: '100%', maxWidth: 720, margin: '0 auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <Wordmark ancho={110} glow={12} />
        <Pulsable al={() => nav(-1)} rotulo="Volver" style={{
          width: 44, height: 44, borderRadius: '50%', display: 'grid', placeItems: 'center',
          border: '1px solid rgba(255,255,255,.22)', color: COLOR.texto, cursor: 'pointer',
        }}><span aria-hidden style={{ font: `400 22px/1 ${FUENTE.ui}` }}>×</span></Pulsable>
      </div>

      <h1 style={{ margin: 0, font: `700 30px/1.15 ${FUENTE.ui}` }}>
        {titulo[0]}{titulo[1] && <><br /><span style={{ color: COLOR.dinero }}>{titulo[1]}</span></>}
      </h1>

      {version && (
        <div style={{ font: `400 12px/1.6 ${FUENTE.mono}`, color: COLOR.textoSuave, marginTop: 10 }}>
          Versión {version}
        </div>
      )}

      {aviso && (
        <div style={{
          marginTop: 22, padding: '16px 16px', borderRadius: RADIO.neon,
          border: '1.5px dashed rgba(255,43,209,.55)', background: 'rgba(255,43,209,.06)',
        }}>
          <div style={{ font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 2, textTransform: 'uppercase', color: '#FF5BDC' }}>
            {aviso.titulo}
          </div>
          <div style={{ font: `400 14px/1.6 ${FUENTE.ui}`, color: COLOR.texto, marginTop: 9 }}>
            {aviso.texto}
          </div>
          {aviso.lista && (
            <ul style={{ margin: '10px 0 0', paddingLeft: 18, font: `400 13px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
              {aviso.lista.map(p => <li key={p}>{p}</li>)}
            </ul>
          )}
        </div>
      )}

      {children}
    </div>
  )
}

/** Un apartado con su rotulo y sus parrafos. `resaltar` es opcional y solo lo
 *  pasan los documentos legales, que son los unicos con corchetes. */
export function Apartado({ titulo, cuerpo, resaltar }: {
  titulo: string
  cuerpo: string[]
  resaltar?: (t: string) => ReactNode
}) {
  return (
    <div style={{ marginTop: 30 }}>
      <h2 style={{
        margin: '0 0 12px', font: `700 12px/1.45 ${FUENTE.ui}`, letterSpacing: 1.6, textTransform: 'uppercase',
        color: COLOR.dinero,
      }}>{titulo}</h2>
      {cuerpo.map((p, i) => (
        // Un gris mas claro que `textoSuave` para el cuerpo: es lectura larga.
        <p key={i} style={{ margin: '0 0 12px', font: `400 16px/1.65 ${FUENTE.ui}`, color: '#C2BDC7' }}>
          {resaltar ? resaltar(p) : p}
        </p>
      ))}
    </div>
  )
}

/** El pie con una direccion a la que escribir. Existe para que ninguna de
 *  estas paginas termine en un callejon: siempre hay a donde preguntar. */
export function PieContacto({ texto, correo }: { texto: string; correo: string }) {
  return (
    <div style={{
      marginTop: 34, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,.12)',
      fontFamily: FUENTE.ui, fontSize: 16, color: COLOR.textoSuave,
    }}>
      {texto}{' '}
      <a href={`mailto:${correo}`} style={{ color: COLOR.dinero, textDecoration: 'underline', textUnderlineOffset: 3 }}>
        {correo}
      </a>
    </div>
  )
}
