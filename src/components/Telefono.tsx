/* Teléfono con selector de país.
 *
 * Un <select> nativo y no un desplegable propio: en el celular abre la rueda
 * del sistema, que es la que la gente ya sabe usar, se maneja con el teclado
 * sin que nadie programe nada, y no hay que resolver el cerrarlo al tocar
 * fuera. Lo que se gana con uno a la medida es decoracion; lo que se pierde
 * es que funcione bien en el telefono, que es donde se usa esto.
 *
 * Las banderas son emoji calculados desde las dos letras del pais —no hay
 * imagenes ni fuente que cargar—. En Windows no hay emoji de banderas y el
 * navegador pinta las dos letras: «MX +52» en vez de «🇲🇽 +52». Se lee igual,
 * que es lo que importa.
 *
 * SIN LIBRERIA a proposito. libphonenumber son cientos de kilobytes para
 * validar numeros de doscientos paises; aqui hacen falta veintitantos y la
 * regla general de la UIT.
 */
import { useId } from 'react'
import { COLOR, LINEA, FUENTE } from '../lib/diseño'

export type Pais = {
  /** ISO 3166-1 alfa-2. De aqui sale la bandera. */
  c: string
  n: string
  /** Codigo de marcacion, sin el +. */
  d: string
  /** Cuantos digitos lleva el numero nacional, cuando es fijo y seguro.
   *  Si no se sabe, se deja y vale la regla general. */
  largo?: number
}

/* Lista corta y comprobada, no las doscientas.
 *
 * Escribir de memoria los codigos de todos los paises del mundo es inventar
 * datos con cara de ciertos: un codigo mal puesto manda el mensaje a la nada
 * y nadie se entera hasta que hace falta. Estan Mexico —primero, porque es de
 * donde viene casi todo el mundo aqui—, America Latina completa, y los sitios
 * desde donde ya hay gente. Para el resto esta «Otro», que deja escribir el
 * numero entero con su +. */
export const PAISES: Pais[] = [
  { c: 'MX', n: 'México', d: '52', largo: 10 },
  { c: 'US', n: 'Estados Unidos', d: '1', largo: 10 },
  { c: 'AR', n: 'Argentina', d: '54' },
  { c: 'BO', n: 'Bolivia', d: '591' },
  { c: 'BR', n: 'Brasil', d: '55' },
  { c: 'CA', n: 'Canadá', d: '1', largo: 10 },
  { c: 'CL', n: 'Chile', d: '56' },
  { c: 'CO', n: 'Colombia', d: '57' },
  { c: 'CR', n: 'Costa Rica', d: '506' },
  { c: 'CU', n: 'Cuba', d: '53' },
  { c: 'EC', n: 'Ecuador', d: '593' },
  { c: 'SV', n: 'El Salvador', d: '503' },
  { c: 'ES', n: 'España', d: '34' },
  { c: 'GT', n: 'Guatemala', d: '502' },
  { c: 'HN', n: 'Honduras', d: '504' },
  { c: 'NI', n: 'Nicaragua', d: '505' },
  { c: 'PA', n: 'Panamá', d: '507' },
  { c: 'PY', n: 'Paraguay', d: '595' },
  { c: 'PE', n: 'Perú', d: '51' },
  { c: 'PR', n: 'Puerto Rico', d: '1', largo: 10 },
  { c: 'DO', n: 'República Dominicana', d: '1', largo: 10 },
  { c: 'UY', n: 'Uruguay', d: '598' },
  { c: 'VE', n: 'Venezuela', d: '58' },
]

/** Bandera emoji a partir del codigo ISO: cada letra se cambia por su
 *  «indicador regional», y el par de indicadores es la bandera. */
export function bandera(iso: string): string {
  return iso.toUpperCase().replace(/./g, c =>
    String.fromCodePoint(127397 + c.charCodeAt(0)))
}

/** Parte un numero guardado en (pais, numero nacional).
 *
 *  Se prueban los codigos de MAS LARGO A MAS CORTO: si no, «+591…» de Bolivia
 *  se leeria como «+59» —que no existe— o peor, un codigo corto se comeria el
 *  principio de uno largo.
 *
 *  El +1 lo comparten Estados Unidos, Canada, Puerto Rico y Dominicana, asi
 *  que al volver a abrir el formulario se muestra el primero de esa lista. El
 *  numero guardado es el mismo; lo unico que no se puede recuperar es cual de
 *  los cuatro se eligio. */
export function partir(valor: string): { pais: string; nacional: string } {
  const v = (valor ?? '').replace(/[^\d+]/g, '')
  if (v.startsWith('+')) {
    const sinMas = v.slice(1)
    const ordenados = [...PAISES].sort((a, b) => b.d.length - a.d.length)
    const p = ordenados.find(x => sinMas.startsWith(x.d))
    if (p) return { pais: p.c, nacional: sinMas.slice(p.d.length) }
    return { pais: 'OTRO', nacional: sinMas }
  }
  // Sin + NO SE SABE de donde es, y no se adivina. Los telefonos guardados
  // antes del selector estan asi —solo digitos—, y suponerles Mexico
  // convertiria en mexicano un numero que no lo es; peor aun, ponerle «+» a
  // secas a «5512345678» lo volveria brasileño, porque 55 es Brasil.
  // Se devuelve el pais vacio y se le pide a la persona que lo elija.
  return { pais: v ? '' : 'MX', nacional: v }
}

export function juntar(pais: string, nacional: string): string {
  const n = nacional.replace(/\D/g, '')
  if (!n || !pais) return ''
  if (pais === 'OTRO') return '+' + n
  const p = PAISES.find(x => x.c === pais)
  return p ? '+' + p.d + n : ''
}

/** La regla general es la de la UIT: un numero completo tiene entre 8 y 15
 *  digitos contando el codigo de pais. Encima, para los paises donde el largo
 *  nacional es fijo y seguro, se exige ese largo: en Mexico son diez desde
 *  2019, y pedir diez atrapa el digito de menos que a mano no se ve. */
export function telefonoValido(pais: string, nacional: string): boolean {
  const n = nacional.replace(/\D/g, '')
  if (!n) return false
  const p = PAISES.find(x => x.c === pais)
  if (p?.largo && n.length !== p.largo) return false
  // Entre 10 y 15 digitos en total. La UIT permite desde 8, pero la columna
  // de la base exige 10 y de nada sirve aceptar aqui lo que alla se rechaza.
  const completo = juntar(pais, nacional).slice(1)
  return completo.length >= 10 && completo.length <= 15
}

export function pista(pais: string, nacional: string): string {
  const p = PAISES.find(x => x.c === pais)
  const n = nacional.replace(/\D/g, '')
  if (!pais) return 'Falta elegir el país.'
  if (!n) return pais === 'OTRO'
    ? 'Escribe el número con su código de país, sin el +.'
    : 'Sin el código de país: eso lo pone el selector.'
  if (p?.largo && n.length !== p.largo) {
    return `En ${p.n} son ${p.largo} dígitos; llevas ${n.length}.`
  }
  if (!telefonoValido(pais, nacional)) return 'Ese número no tiene largo de teléfono.'
  return juntar(pais, nacional)
}

/** Las dos de arriba, para quien solo tiene el numero completo guardado. */
export function valorValido(valor: string): boolean {
  const { pais, nacional } = partir(valor)
  return telefonoValido(pais, nacional)
}

export function pistaDe(valor: string): string {
  const { pais, nacional } = partir(valor)
  return pista(pais, nacional)
}

export default function Telefono({ valor, cambia, autoFoco }: {
  /** Numero completo, como se guarda: «+525512345678». */
  valor: string
  cambia: (v: string) => void
  autoFoco?: boolean
}) {
  const id = useId()
  const { pais, nacional } = partir(valor)

  const caja: React.CSSProperties = {
    background: 'transparent', color: COLOR.texto,
    border: `1px solid ${LINEA.suave}`, borderRadius: 0,
    padding: '12px 13px', font: `400 16px/1.45 ${FUENTE.ui}`, outline: 'none',
    boxSizing: 'border-box', height: 46,
  }

  const p = PAISES.find(x => x.c === pais)
  const corto = p ? `${bandera(p.c)} +${p.d}` : pais === 'OTRO' ? 'Otro' : 'País'

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {/* El <select> va encima, invisible, y debajo se pinta lo que se ve.
          Un select nativo enseña el texto COMPLETO de la opcion cuando esta
          cerrado, y «🇲🇽 +52 México» no cabe en el ancho que le toca: salia
          cortado a «🇲🇽 +52 Méx». Asi la lista abierta conserva los nombres
          —que es como se encuentra un pais— y cerrado se ve solo la bandera
          con su codigo, que es lo unico que hace falta ahi. */}
      <div className="pais-caja" style={{
        ...caja, position: 'relative', flex: '0 0 auto', width: 104,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
      }}>
        <span style={{ whiteSpace: 'nowrap' }}>{corto}</span>
        <span aria-hidden style={{ color: COLOR.textoTenue, fontSize: 10 }}>&#9662;</span>
        <select
          aria-label="País del teléfono" id={id} value={pais}
          onChange={e => cambia(juntar(e.target.value, nacional))}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            opacity: 0, cursor: 'pointer', appearance: 'none', border: 'none',
          }}>
          {/* Solo sale cuando de verdad no se sabe: un numero guardado antes
              del selector, sin codigo de pais. */}
          {!pais && <option value="">Elige país</option>}
          {PAISES.map(x => (
            <option key={x.c + x.d} value={x.c}>{bandera(x.c)} +{x.d}  {x.n}</option>
          ))}
          <option value="OTRO">Otro país</option>
        </select>
      </div>
      <input
        type="tel" inputMode="numeric" autoFocus={autoFoco}
        value={nacional}
        onChange={e => cambia(juntar(pais || 'MX', e.target.value.replace(/\D/g, '').slice(0, 15)))}
        placeholder={pais === 'MX' ? '5512345678' : 'Número'}
        style={{ ...caja, flex: 1, minWidth: 0 }} />
    </div>
  )
}
