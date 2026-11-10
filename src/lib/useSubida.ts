/* Estado de UNA subida en curso, compartido por las cuatro pantallas que suben
 * video (la de la creadora, el alta, «Publicar por» y la subida masiva).
 *
 * Reune lo que todas necesitan y que, repartido, se olvida en alguna:
 *   - la etapa y el avance (bytes, fraccion y tiempo restante) para `BarraSubida`;
 *   - un `AbortController` para Cancelar;
 *   - el aviso del navegador si se intenta cerrar o recargar A MITAD (solo
 *     mientras hay una subida en curso).
 *
 * El avance de bytes llega muchas veces por segundo; se pasa a estado a lo mas
 * unas 4 veces por segundo para no repintar sin necesidad. */
import { useCallback, useEffect, useRef, useState } from 'react'
import { MedidorVelocidad } from './velocidad'
import type { EtapaAvance } from './admin'

export type EtapaSubida = 'preparando' | 'video' | 'portada' | 'guardando' | 'listo'

/** Lo que se le dice a quien sube, por etapa. El orden REAL es este: la portada se
 *  prepara ANTES de mandar el video, porque si el formato no se puede leer se
 *  sabe ya y no despues de transferir 2 GB. */
export const ETIQUETA_ETAPA: Record<EtapaSubida, string> = {
  preparando: 'Preparando portada',
  video: 'Subiendo video',
  portada: 'Subiendo portada',
  guardando: 'Guardando datos',
  listo: 'Listo',
}

export type EstadoSubida = {
  activa: boolean
  etapa: EtapaSubida | null
  /** Bytes del video que ya salieron / total. Solo en la etapa `video`. */
  cargado: number
  total: number
  /** 0..1, o null si la etapa no tiene avance medible (preparar, guardar). */
  fraccion: number | null
  restanteS: number | null
}

const INICIAL: EstadoSubida = {
  activa: false, etapa: null, cargado: 0, total: 0, fraccion: null, restanteS: null,
}

const CADA_MS = 250

export function useSubida() {
  const [estado, setEstado] = useState<EstadoSubida>(INICIAL)
  const control = useRef<AbortController | null>(null)
  const medidor = useRef(new MedidorVelocidad())
  const ultimo = useRef(0)
  const etapaActual = useRef<EtapaSubida | null>(null)

  // Mientras hay una subida en curso, cerrar o recargar pide confirmacion.
  const activa = estado.activa
  useEffect(() => {
    if (!activa) return
    const aviso = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', aviso)
    return () => window.removeEventListener('beforeunload', aviso)
  }, [activa])

  // Si la pantalla se desmonta a mitad, la subida se cancela (y borra lo parcial).
  useEffect(() => () => { control.current?.abort() }, [])

  /** Arranca una subida nueva. Devuelve la senal para pasarla al helper de video. */
  const empezar = useCallback((): AbortSignal => {
    control.current = new AbortController()
    medidor.current.reiniciar(); ultimo.current = 0; etapaActual.current = null
    setEstado({ ...INICIAL, activa: true })
    return control.current.signal
  }, [])

  const etapa = useCallback((e: EtapaSubida) => {
    etapaActual.current = e
    medidor.current.reiniciar()
    setEstado(s => ({ ...s, etapa: e, cargado: 0, total: 0, fraccion: null, restanteS: null }))
  }, [])

  /** Avance de bytes (etapa `video`). */
  const bytes = useCallback((cargado: number, total: number) => {
    const t = Date.now()
    etapaActual.current = 'video'
    medidor.current.agregar(cargado, t)
    // Se deja pasar siempre el ultimo (100%) aunque caiga dentro del intervalo.
    if (t - ultimo.current < CADA_MS && cargado < total) return
    ultimo.current = t
    setEstado(s => ({
      ...s, etapa: 'video', cargado, total,
      fraccion: total > 0 ? cargado / total : null,
      restanteS: medidor.current.restante(total),
    }))
  }, [])

  /** El `alAvanzar` de `publicarPara`, traducido a este estado. */
  const desdePublicar = useCallback(
    (et: EtapaAvance, _fraccion: number, b?: { loaded: number; total: number }) => {
      if (et === 'video') {
        if (etapaActual.current !== 'video') etapa('video')
        if (b) bytes(b.loaded, b.total)
        return
      }
      if (etapaActual.current !== et) etapa(et)
    }, [etapa, bytes])

  const cancelar = useCallback(() => { control.current?.abort() }, [])
  const terminar = useCallback(() => {
    control.current = null
    setEstado(INICIAL)
  }, [])
  const fueCancelada = useCallback(() => control.current?.signal.aborted === true, [])

  return { estado, empezar, etapa, bytes, desdePublicar, cancelar, terminar, fueCancelada }
}
