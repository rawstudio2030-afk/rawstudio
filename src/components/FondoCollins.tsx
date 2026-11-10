/* El salón de Collins Avenue fijo detrás de una pantalla, con su velo.
 *
 * Es el piso de llegada de «El descenso» (docs/diseno/descenso/): la foto de
 * ambiente del hero (`/descenso/bar-hero`, sin personas) velada en navy, con un
 * tinte champagne arriba y seafoam al fondo. Lo usan las pantallas de la puerta
 * (edad, acceso, registro, clave nueva, modo) y las páginas de texto.
 *
 * Es `position: fixed` y no `absolute` a proposito: la pagina crece con su
 * contenido (un registro con cuatro casillas, una pagina de venta de seis mil
 * pixeles) y con `absolute` la foto se estiraria a toda esa altura. Fija,
 * siempre mide la pantalla.
 *
 * `denso` sube el velo para las paginas de mucho texto: sobre una foto, un
 * parrafo largo no se lee. La foto es decorativa (alt vacio) y se pide con
 * `loading="lazy"`: no es el LCP de estas pantallas, que son un formulario.
 */
export default function FondoCollins({ denso = false }: { denso?: boolean }) {
  return (
    <div aria-hidden className="pagina-collins-fondo">
      <picture>
        <source srcSet="/descenso/bar-hero.webp" type="image/webp" />
        <img src="/descenso/bar-hero.jpg" alt="" loading="lazy" decoding="async" width={1280} height={720} />
      </picture>
      <div className={denso ? 'pagina-collins-velo pagina-collins-velo-denso' : 'pagina-collins-velo'} />
    </div>
  )
}
