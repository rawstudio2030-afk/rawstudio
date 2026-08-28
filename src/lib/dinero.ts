/* Dinero.
 *
 * TODO SE GUARDA EN CENTAVOS, como entero. Nunca en decimales: 0.1 + 0.2 no da
 * 0.3 en coma flotante, y en dinero esa diferencia es un centavo que aparece o
 * desaparece de la cuenta de alguien.
 *
 * Las columnas de la base todavia se llaman *_coins. El nombre quedo de cuando
 * la economia interna eran fichas; el valor es el mismo entero y ahora
 * significa centavos de dolar. Renombrarlas es su propia migracion, aparte,
 * porque son diez columnas en mas de cuarenta funciones de dinero y mezclar
 * ese cambio con este dejaria sin saber cual de los dos rompio que.
 */

/** Centavos de dolar a texto. 240 -> "$2.40" */
export function usd(centavos: number | null | undefined): string {
  const n = Number(centavos ?? 0)
  return (n / 100).toLocaleString('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })
}

/** Sin el signo, para cuando ya se dijo la moneda. 240 -> "2.40" */
export function usdPlano(centavos: number | null | undefined): string {
  return (Number(centavos ?? 0) / 100).toFixed(2)
}

/** Centavos de peso a texto. Para dispersiones y retenciones del SAT. */
export function mxn(centavos: number | null | undefined): string {
  return (Number(centavos ?? 0) / 100).toLocaleString('es-MX', {
    style: 'currency', currency: 'MXN',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })
}

/** Lo que escribe una persona ("2.40", "2,40", "$2.40") a centavos enteros.
 *
 *  Se redondea al centavo mas cercano en vez de truncar: truncar siempre a la
 *  baja convierte un error de un centavo en un sesgo sistematico a favor de la
 *  plataforma, y eso con el tiempo se nota. */
export function aCentavos(texto: string): number | null {
  const limpio = texto.replace(/[$\s]/g, '').replace(',', '.')
  if (!limpio || !/^\d*\.?\d*$/.test(limpio)) return null
  const n = parseFloat(limpio)
  if (!isFinite(n) || n < 0) return null
  return Math.round(n * 100)
}
