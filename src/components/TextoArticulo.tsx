/* Muestra el texto de un articulo escrito en el panel.
 *
 * El formato es MINIMO y de lista blanca, a proposito: lo que se escribe nunca
 * se interpreta como HTML. Se construyen nodos de React, no cadenas HTML, asi que
 * no hay forma de inyectar etiquetas ni scripts aunque alguien pegue algo raro.
 *
 *   ## Titulo           -> encabezado
 *   - elemento          -> lista con vinetas (lineas consecutivas)
 *   1. elemento         -> lista numerada (lineas consecutivas)
 *   **texto**           -> negrita
 *   https://...         -> enlace (solo http y https)
 *   linea en blanco     -> separa parrafos; un salto simple queda como salto
 */
import type { CSSProperties, ReactNode } from 'react'
import { COLOR, FUENTE } from '../lib/diseño'

const PARRAFO: CSSProperties = { margin: '0 0 14px', font: `400 16px/1.65 ${FUENTE.ui}`, color: COLOR.textoSuave }

/** Negritas y enlaces dentro de una linea. */
function enLinea(texto: string, clave: string): ReactNode[] {
  const partes: ReactNode[] = []
  const re = /\*\*([^*\n]+)\*\*|(https?:\/\/[^\s<>"']+)/g
  let ultimo = 0, i = 0, m: RegExpExecArray | null
  while ((m = re.exec(texto)) !== null) {
    if (m.index > ultimo) partes.push(texto.slice(ultimo, m.index))
    if (m[1] !== undefined) {
      partes.push(<strong key={`${clave}b${i}`} style={{ color: COLOR.texto, fontWeight: 700 }}>{m[1]}</strong>)
    } else {
      // El punto o la coma de cierre de una frase no son parte del enlace.
      const crudo = m[2], url = crudo.replace(/[.,;:!?)]+$/, '')
      partes.push(
        <a key={`${clave}a${i}`} href={url} target="_blank" rel="noopener noreferrer"
          style={{ color: COLOR.acento, textDecoration: 'underline', textUnderlineOffset: 3, overflowWrap: 'anywhere' }}>{url}</a>,
      )
      if (url.length < crudo.length) partes.push(crudo.slice(url.length))
    }
    ultimo = m.index + m[0].length; i++
  }
  if (ultimo < texto.length) partes.push(texto.slice(ultimo))
  return partes
}

function conSaltos(texto: string, clave: string): ReactNode[] {
  return texto.split('\n').flatMap((linea, i) =>
    i === 0 ? enLinea(linea, `${clave}0`) : [<br key={`${clave}br${i}`} />, ...enLinea(linea, `${clave}${i}`)])
}

export default function TextoArticulo({ texto }: { texto: string }) {
  const bloques = texto.replace(/\r\n?/g, '\n').trim().split(/\n{2,}/)
  return (
    <div>
      {bloques.map((b, i) => {
        const lineas = b.split('\n')
        if (/^##\s+/.test(b) && lineas.length === 1) {
          return <h2 key={i} style={{ margin: '26px 0 10px', font: `700 20px/1.25 ${FUENTE.ui}`, color: COLOR.texto }}>{enLinea(b.replace(/^##\s+/, ''), `h${i}`)}</h2>
        }
        if (lineas.every(l => /^-\s+/.test(l))) {
          return (
            <ul key={i} style={{ ...PARRAFO, paddingLeft: 22 }}>
              {lineas.map((l, j) => <li key={j} style={{ marginBottom: 6 }}>{enLinea(l.replace(/^-\s+/, ''), `l${i}-${j}`)}</li>)}
            </ul>
          )
        }
        if (lineas.every(l => /^\d+[.)]\s+/.test(l))) {
          return (
            <ol key={i} style={{ ...PARRAFO, paddingLeft: 24 }}>
              {lineas.map((l, j) => <li key={j} style={{ marginBottom: 6 }}>{enLinea(l.replace(/^\d+[.)]\s+/, ''), `n${i}-${j}`)}</li>)}
            </ol>
          )
        }
        return <p key={i} style={PARRAFO}>{conSaltos(b, `p${i}`)}</p>
      })}
    </div>
  )
}
