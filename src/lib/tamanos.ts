/* Tamaños y tiempos en palabras de persona, para la barra de subida y los avisos
 * de tope. Base 1024 (MiB/GiB) mostrada como «MB»/«GB», igual que el resto de la
 * interfaz («MP4… hasta 2 GB»). */

const MB = 1024 * 1024
const GB = 1024 * MB

/** 85 MB, 1.4 GB. Menos de 1 GB se da en MB; de 1 GB en adelante, con 1 decimal. */
export function tamanoLegible(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB'
  if (bytes >= GB) return `${(bytes / GB).toFixed(1)} GB`
  if (bytes >= 10 * MB) return `${Math.round(bytes / MB)} MB`
  return `${(bytes / MB).toFixed(1)} MB`
}

/** 45 s, 3 min, 1 h 5 min. */
export function duracionLegible(segundos: number): string {
  const s = Math.max(1, Math.round(segundos))
  if (s < 60) return `${s} s`
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const resto = m % 60
  return resto === 0 ? `${h} h` : `${h} h ${resto} min`
}
