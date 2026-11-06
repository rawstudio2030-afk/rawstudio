/* El avatar de una persona: su foto o, si no tiene, su inicial.
 *
 * Es la unica pieza que pinta un avatar en el sitio (listados, ficha de clip y
 * de creadora, comentarios, ajustes de cuenta y panel). Antes cada pantalla
 * repetia su propio circulo: unas con rayas, otras con un gris liso, y en
 * Ajustes un «Foto» suelto. Ahora, sin foto, siempre es un circulo sobrio con
 * la inicial del nombre artistico (o la del handle si falta). Nada de iconos
 * genericos ni pictogramas: es una persona, no un marcador de posicion.
 *
 * Es decorativo (`aria-hidden`): el nombre ya va escrito al lado en todos los
 * sitios donde se usa. */
import type { CSSProperties } from 'react'
import { urlAvatar } from '../lib/perfiles'
import { COLOR, FUENTE } from '../lib/diseño'

/** La primera letra visible, en mayuscula. Se parte por caracteres reales y no
 *  por unidades UTF-16, para que un emoji o una letra con acento no salgan
 *  cortados a la mitad. */
function inicialDe(nombre?: string | null, handle?: string | null): string {
  const base = (nombre ?? '').trim() || (handle ?? '').trim().replace(/^@/, '')
  const primera = Array.from(base)[0]
  return primera ? primera.toUpperCase() : '·'
}

export default function Avatar({ ruta, nombre, handle, tam, style }: {
  /** `avatar_path` del perfil. */
  ruta: string | null | undefined
  nombre?: string | null
  handle?: string | null
  tam: number
  /** Borde, anillo o margen propios de cada pantalla. */
  style?: CSSProperties
}) {
  const foto = urlAvatar(ruta ?? null)
  return (
    <div aria-hidden style={{
      width: tam, height: tam, borderRadius: '50%', flex: '0 0 auto', boxSizing: 'border-box',
      display: 'grid', placeItems: 'center', overflow: 'hidden', userSelect: 'none',
      background: foto ? `center/cover url(${foto})` : COLOR.superficieAlta,
      color: COLOR.textoSuave, font: `700 ${Math.max(10, Math.round(tam * 0.42))}px/1 ${FUENTE.ui}`,
      ...style,
    }}>{foto ? '' : inicialDe(nombre, handle)}</div>
  )
}
