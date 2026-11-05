// Pantallas 18 y 19 — Aviso de privacidad y Términos
//
// Publicadas dentro de la app y no como PDF suelto: tienen que estar
// disponibles en el momento en que alguien acepta, no en un archivo aparte que
// nadie abre.
//
// El marco —encabezado, titulo, aviso, apartados, pie— vive en
// components/Documento.tsx desde que lo comparten cuatro pantallas: estas dos,
// contacto y preguntas frecuentes.
import { PRIVACIDAD, TERMINOS, VERSION_LEGAL, PENDIENTES_ABOGADO } from '../content/legal'
import { MarcoDocumento, Apartado, PieContacto } from '../components/Documento'
import { COLOR } from '../lib/diseño'

const AVISO = {
  titulo: 'Borrador sin revisión legal',
  texto: 'Este texto aún no lo revisa un abogado. Lo resaltado en rosa son datos por definir. No debe operar con público hasta resolverlo.',
  lista: PENDIENTES_ABOGADO,
}

/** Los corchetes marcan lo que falta definir con abogado. Se resaltan en vez
 *  de esconderse: un marcador que pasa inadvertido acaba publicado. */
const resaltar = (t: string) =>
  t.split(/(\[[^\]]+\])/g).map((p, i) =>
    p.startsWith('[')
      ? <mark key={i} style={{ background: 'rgba(255,43,209,.22)', color: COLOR.acento, padding: '1px 4px' }}>{p}</mark>
      : <span key={i}>{p}</span>)

export function Privacidad() {
  return (
    <MarcoDocumento titulo={['Aviso de', 'privacidad']} version={VERSION_LEGAL} aviso={AVISO}>
      {PRIVACIDAD.map(s => <Apartado key={s.titulo} {...s} resaltar={resaltar} />)}
      <PieContacto texto="¿Dudas sobre tus datos? Escribe a" correo="privacidad@rawstudio.biz" />
    </MarcoDocumento>
  )
}

export function Terminos() {
  return (
    <MarcoDocumento titulo={['Términos', 'y condiciones']} version={VERSION_LEGAL} aviso={AVISO}>
      {TERMINOS.map(s => <Apartado key={s.titulo} {...s} resaltar={resaltar} />)}
      <PieContacto texto="¿Algo no te cuadra? Escribe a" correo="legal@rawstudio.biz" />
    </MarcoDocumento>
  )
}
