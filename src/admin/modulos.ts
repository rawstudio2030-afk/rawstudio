/* Los modulos del panel y como se agrupan en el menu. */

export type Modulo = {
  clave: string; titulo: string
  /** Los modulos aun no construidos se muestran apagados y no se pueden
   *  abrir. Ocultarlos daria la impresion de que el panel esta terminado;
   *  dejarlos entrar a una pantalla vacia seria peor. */
  listo: boolean
}

/* El menu va AGRUPADO por lo que se viene a hacer, no en una lista plana de diez
 * destinos. «Por atender» reune lo que tiene cola (el Resumen y las pantallas con
 * pendientes); el resto se ordena por tema. Ya no se numeran: los grupos ordenan.
 *
 * `reportes` se llama «Denuncias» en pantalla; la clave y la ruta
 * (`/admin/reportes`) NO cambian, para no romper enlaces guardados. */
export const GRUPOS: { titulo: string; modulos: Modulo[] }[] = [
  { titulo: 'Por atender', modulos: [
    { clave: 'resumen',      titulo: 'Resumen',      listo: true },
    { clave: 'avisos',       titulo: 'Avisos',       listo: true },
    { clave: 'moderacion',   titulo: 'Moderación',   listo: true },
    { clave: 'verificacion', titulo: 'Verificación', listo: true },
    { clave: 'reportes',     titulo: 'Denuncias',    listo: true },
    { clave: 'consultas',    titulo: 'Consultas',    listo: true },
  ] },
  { titulo: 'Personas', modulos: [
    { clave: 'usuarios',     titulo: 'Usuarios',     listo: true },
  ] },
  { titulo: 'Contenido', modulos: [
    { clave: 'contenido',    titulo: 'Contenido',    listo: true },
  ] },
  { titulo: 'Dinero', modulos: [
    { clave: 'finanzas',     titulo: 'Finanzas',     listo: true },
    { clave: 'retiros',      titulo: 'Retiros',      listo: true },
  ] },
  { titulo: 'Comunicación', modulos: [
    { clave: 'comunicacion', titulo: 'Comunicación', listo: true },
  ] },
  { titulo: 'Sistema', modulos: [
    { clave: 'bitacora',     titulo: 'Bitácora',     listo: true },
    { clave: 'herramientas', titulo: 'Herramientas', listo: true },
  ] },
]

export const MODULOS: Modulo[] = GRUPOS.flatMap(g => g.modulos)
