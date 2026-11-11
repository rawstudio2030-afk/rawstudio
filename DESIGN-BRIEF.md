# RAWstudio — Brief de diseño visual (El descenso)

Dirección aprobada por Sergio el 10 de noviembre de 2026. Mobile-first.

**Fuente de verdad visual:** [`docs/diseno/descenso/README.md`](./docs/diseno/descenso/README.md) —
paletas (hex), tipografías, efectos e imágenes — y la maqueta que lo acompaña
(`index.html` y `capturas.html` en esa carpeta; `python3 extraer.py` escribe los JPG
sueltos). Los valores viven en **`src/lib/diseño.ts`** (un solo sitio); aquí no se
repiten.

> Esta dirección **sustituye** a *Miami Neon Night* (magenta `#FF2BD1`, cian
> `#00E5FF`, lima `#C8FF3D`, skyline, tubo de neón). Ya no es la dirección vigente y
> **no debe volver a implementarse**.

## La idea

El sitio es un edificio en el que se baja. Cada piso es un lugar y un momento:

| Piso | Código | Qué cuenta | Paleta (`PISO.*` en `diseño.ts`) |
|------|--------|------------|----------------------------------|
| **Planta baja · Collins Avenue** | PB | Llegas. Salón art déco de Miami Beach, atardecer. | `collins`: void `#0E1520`, navy, champagne, blush, seafoam |
| **El antro** | −1 | Te sueltas. Club subterráneo: cómo funciona. | `antro`: violeta, rosa, ámbar, hielo |
| **Cuarto oscuro** | −2 | Te revelas. Laboratorio fotográfico: ver y elegir. | `oscuro`: safelight rojo, papel, ámbar, plata |
| **El calabozo** | −3 | Te entregas. Tributo: 80 % + SPEI + cuenta. | `calabozo`: oxblood, ámbar, hueso, latón |

Entre pisos hay **umbrales** (escalera, paso al revelado, puerta de hierro): son
transiciones de la portada, no pantallas del producto.

## Wordmark

**«RAW»** en Italiana (espaciado ~0.22 em, marfil `#F3EBE2`) + **«studio»** en Bodoni
Moda cursiva. El color de «studio» cambia con el piso: champagne en Collins, rosa
pálido en el antro, safelight en el cuarto oscuro, ámbar en el calabozo
(`<Wordmark piso="…" />`). Sin tubo de neón, sin contorno hueco, sin resplandor.
Se conserva su comportamiento: inerte en `/`, `/age` e `/intro`; en el resto lleva a
casa; `ancho` es la API pública.

Imágenes de marca fuera de la app (`og.png`, iconos, `correo/logo.png`): salen de
`scripts/tarjetas-sociales.py` y son **marca y nada más** (sin contenido, sin fotos
de ambiente: la preview de WhatsApp la pinta un programa ajeno, sin que nadie la
pida).

## Modos

- **Modo marca** — lo que ve quien aún no tiene cuenta, y las puertas de entrada:
  portada de cuatro pisos, edad, acceso, registro, clave nueva, modo, páginas de
  texto y `/creadoras`. Fondos fotográficos de ambiente (sin personas), tipografías de
  cartelería del piso, tintes.
- **Modo consumo** — donde se viene a ver y a gestionar dinero: el **reproductor
  sigue sobrio** (fondo plano, sin cromo decorativo, cero animación). El safelight
  va solo en marcos, precios, candados, insignias 18+ y el botón principal. Billetera,
  ganancias y herramientas de quien publica: UI clara y densa con fondo y acento del
  calabozo.
- **Admin** — sin piso. Solo tokens; desktop-only (`ANCHO_MINIMO` 1280). Cero fondos
  fotográficos y cero tipografías de cartelería (sin Monoton, Permanent Marker ni
  Grenze Gotisch).

## Mapa de pantallas

| Piso | Pantallas |
|------|-----------|
| **Collins** | `/` (portada, planta baja) · edad (`/age`, `/intro`) · `/entrar` · `/acceso` · `/registro` · `/nueva-clave` · `/modo` · legales (`/privacidad`, `/terminos`, `/contacto`, `/preguntas`, `/ayuda`). Marcos: `PaginaCollins` / `FondoCollins`. |
| **Antro** | `/creadoras` (no se renombra) · `/consultas`. Violeta y ámbar, Unbounded sobre Space Grotesk. |
| **Cuarto oscuro** | Explorar · tarjeta de clip · ficha del clip · perfil de creadora · biblioteca. Estilos en `src/lib/oscuro.ts`. |
| **Calabozo** | Billetera · ganancias · retirar · estudio y cobro · subir, gestionar, verificar, perfil. Estilos en `src/lib/calabozo.ts`. |
| **Admin** | Sin piso. |

## Portada (landing)

Cuatro pisos y, entre ellos, **huecos de ascensor** (280 vh; 190 vh bajo 900 px) con
scroll acoplado: el progreso del hueco manda una **reja de latón** (la tijera interior
cierra primero y la puerta exterior de rellano la sigue con desfase), una **losa de
concreto** con el número del piso que cruza el encuadre, y, al partirse las puertas,
la **placa y el titular del piso** (dentro del hueco: ningún fotograma queda con solo
la foto de fondo). Fuente de los números: `docs/diseno/descenso/elevador/`.

A la derecha, el **dial** de latón (aguja, display PB / −1 / −2 / −3, nombre y botonera;
`aria-current` en el piso activo). Un clic hace un viaje de ~2.5 s. **Bajo 900 px no se
esconde**: queda un dial compacto (sin botonera ni nombre) que no tapa el titular ni
los botones. Con `prefers-reduced-motion`: sin scrubbing ni recede, fotogramas
estáticos, la reja solo vela la pantalla; el viaje dura ~0.8 s.

El calabozo lleva **antorchas** (cuerpo `antorcha.webp` + bucle de fuego en video, que
solo se pide y reproduce cuando el piso está a la vista; cuatro en escritorio, dos en
móvil) y siluetas negras de decoración. Crédito del fuego: *Burning Torch at the Dark*,
Pexels 4765799, autor «K», licencia Pexels.

**Carga (CHECKLIST §2.1 y §2.2, `pass` inmutables):** el primer paint es **solo el
hero de Collins**. Los pisos de abajo son un chunk perezoso (`descenso/Pisos`) que se
pide en el primer gesto de bajar o al pulsar «Ver cómo funciona» o un piso del
ascensor; sus fotos van en webp con `loading="lazy"` y sus fuentes en una segunda
hoja diferida. «Sobre nosotros» (contacto, preguntas, privacidad) solo con clic.

La hoja de contactos del cuarto oscuro es una **muestra** (fotos de ambiente
generadas, sin personas, con precios de ejemplo 10 / 20 / 40 USD): no lista clips
reales. Todo lo que lleva a ver de verdad pasa por la puerta de edad (`/age`).

## Copy canónico del hero (no se toca)

```
Graba.
Ponle precio.
Cobra.

El 80% de cada dólar es tuyo.
Sin exclusividad.
```

Botones: «Crear mi cuenta» → `/registro` · «Ya tengo cuenta» → `/acceso` · «Ver cómo
funciona» → baja al antro · «Solo vengo a ver» → `/age`.

## Reglas

- **Mobile-first.** Tocables ≥ 44 px. Contraste AA en texto de tokens, botones, precios,
  insignias RENTA/18+ y estados de error. Un acento claro (champagne, ámbar) como
  fondo lleva texto oscuro; marfil sobre champagne no llega a AA.
- **Tokens en `src/lib/diseño.ts`.** No se escriben hex sueltos en pantallas: se usa
  `COLOR`, `PISO`, `BOTON`, `LUZ`, `TRAMA` (y las variables CSS de `index.css`, que
  reflejan `COLOR`). Excepciones justificadas: negro del reproductor, relleno blanco
  de un canvas.
- **No inventar features.** Solo presentación. Funcionalidad, rutas y Supabase intactos.
- **No renombrar `/creadoras`. No mover el formulario de login a `/entrar`** (vive en
  `/acceso`).
- **Correos y papelería:** fondos navy/void, acentos champagne y ámbar, texto marfil;
  wordmark en texto; HTML de tablas con estilos en línea (Gmail y Outlook ignoran
  flex y tipografías propias); sin fotos pesadas.
- **Sin tracking** (analítica, heatmaps, recuento de visitas). **Sin textos legales
  inventados.**
- **Panel admin:** solo tokens.

*Histórico:* la dirección anterior (Miami Neon Night) y su orden de implementación
quedan en el historial de git; no son vigentes.
