/* Lo que el elevador le pide al sonido. Es solo el CONTRATO (tipos): `useDescenso`
 * vive en el primer paint y no puede importar el motor de audio, que se baja
 * aparte cuando alguien activa el sonido. Un motor apagado es simplemente
 * `null`: no suena nada y no cuesta nada. */
export interface SonidoApi {
  /** La reja se mueve: `velocidad` es cuanto cambió el cierre en el último cuadro. */
  reja(velocidad: number): void
  /** La reja termina de cerrar (`cierra`) o de abrir (`abre`): el golpe del seguro. */
  choque(tipo: 'cierra' | 'abre'): void
  /** La cabina baja: 0 quieta … 1 a mitad de viaje. */
  cabina(nivel: number): void
  /** Llegada al piso: la campanilla. */
  ding(): void
  /** Un botón del dial. */
  tecla(): void
  /** Crepitar de las antorchas del calabozo, mientras esta a la vista. */
  chisporroteo(on: boolean): void
}

/** El motor activo, si lo hay. Lo pone `useSonido` al activar y lo quita al apagar. */
export const motor: { actual: SonidoApi | null } = { actual: null }
