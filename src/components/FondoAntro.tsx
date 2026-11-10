/* El antro (−1) fijo detras de una pantalla, con su velo.
 *
 * Es el piso de «cómo se entra a la casa» de «El descenso»: la foto del salon
 * subterraneo (`/descenso/club`, vacio y sin personas) muy velada en el void del
 * antro, con un resplandor violeta arriba y ambar abajo. Lo usan las paginas
 * de invitacion a publicar (`/creadoras`).
 *
 * Fija y no `absolute` por la misma razon que `FondoCollins`: la pagina crece
 * con su contenido. El velo es denso porque son paginas de mucho texto. La
 * foto es decorativa (alt vacio) y perezosa.
 */
export default function FondoAntro() {
  return (
    <div aria-hidden className="pagina-collins-fondo">
      <img src="/descenso/club.webp" alt="" loading="lazy" decoding="async" width={1280} height={720}
        style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'contrast(1.05) saturate(1.05)' }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: `
          radial-gradient(ellipse 70% 40% at 20% 0%, rgba(122,63,160,.22), transparent 55%),
          radial-gradient(ellipse 50% 40% at 90% 100%, rgba(212,146,58,.14), transparent 55%),
          linear-gradient(180deg, rgba(8,6,14,.9) 0%, rgba(8,6,14,.94) 100%)`,
      }} />
    </div>
  )
}
