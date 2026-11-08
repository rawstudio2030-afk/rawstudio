/* Descarga de CSV desde el panel.
 *
 * Todo ocurre en el navegador de quien administra: no hay una ruta ni un archivo
 * en el servidor que se pueda pedir sin sesion. El archivo sale con BOM UTF-8
 * (sin el, Excel muestra «Ã©» donde va una «é») y saltos de linea CRLF.
 *
 * FORMULAS. Excel y Sheets ejecutan como formula una celda de TEXTO que empieza
 * con = + - @ (o tabulador/retorno). Un handle o un titulo de clip los escribe
 * cualquier usuaria, asi que esas celdas se prefijan con un apostrofo y se leen
 * como texto. Los numeros (incluidos los negativos) no se tocan. */

export type Celda = string | number | null | undefined

const PARECE_NUMERO = /^-?\d+(\.\d+)?$/

export function celdaCSV(v: Celda): string {
  if (v === null || v === undefined) return ''
  let s = typeof v === 'number' ? String(v) : v
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s) && !PARECE_NUMERO.test(s)) s = `'${s}`
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** El texto del archivo, sin descargarlo (lo usan las pruebas). */
export function textoCSV(encabezados: string[], filas: Celda[][]): string {
  const lineas = [encabezados, ...filas].map(f => f.map(celdaCSV).join(','))
  return '﻿' + lineas.join('\r\n') + '\r\n'
}

export function descargarCSV(nombre: string, encabezados: string[], filas: Celda[][]) {
  const blob = new Blob([textoCSV(encabezados, filas)], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = nombre
  a.click()
  URL.revokeObjectURL(a.href)
}
