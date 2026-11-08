/* Lo que espera atencion en el panel: UN lote de consultas, compartido.
 *
 * El menu lateral (badges) y la portada Resumen (tarjetas) muestran los mismos
 * numeros. Se piden una vez al montar el marco y de nuevo al volver a la ventana
 * (con un minimo de 30 s entre pedidos), no una consulta por item cada segundo.
 *
 * TODO sale de los conteos de la base (`admin_conteo_*`, `admin_por_purgar`):
 * nunca se suma «lo que se ve en la pagina», que cambia con el filtro. */
import { createContext, useContext } from 'react'
import {
  conteoModeracion, conteoVerificaciones, conteoReportes, conteoRetiros, porPurgar,
} from '../lib/admin'

export type Pendientes = {
  /** Falso hasta que llega el primer lote: evita pintar «todo al dia» antes de saberlo. */
  listo: boolean
  moderacion: number
  verificacion: number
  denuncias: number
  retirosPorAprobar: number
  retirosPorPagar: number
  /** Archivos vencidos esperando a que alguien pulse «Purgar». */
  purga: number
}

export const SIN_DATOS: Pendientes = {
  listo: false, moderacion: 0, verificacion: 0, denuncias: 0,
  retirosPorAprobar: 0, retirosPorPagar: 0, purga: 0,
}

export async function cargarPendientes(): Promise<Pendientes> {
  const [mod, ver, rep, ret, purga] = await Promise.all([
    conteoModeracion(), conteoVerificaciones(), conteoReportes(), conteoRetiros(), porPurgar(),
  ])
  return {
    listo: true,
    moderacion: mod['pendiente'] ?? 0,
    verificacion: ver['pendiente_revision'] ?? 0,
    denuncias: (rep['nuevo'] ?? 0) + (rep['en_revision'] ?? 0),
    retirosPorAprobar: ret['pendiente'] ?? 0,
    retirosPorPagar: ret['aprobada'] ?? 0,
    purga: purga.length,
  }
}

export const PendientesCtx = createContext<{ p: Pendientes; refrescar: () => void }>({
  p: SIN_DATOS, refrescar: () => {},
})

export const usePendientes = () => useContext(PendientesCtx)

/** Total de cosas por atender, para decir «todo al dia» solo cuando es cierto. */
export const totalPendientes = (p: Pendientes) =>
  p.moderacion + p.verificacion + p.denuncias + p.retirosPorAprobar + p.retirosPorPagar + p.purga
