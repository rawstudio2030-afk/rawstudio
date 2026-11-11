# Elevador del descenso — maqueta (iteración aprobada)

Aprobada por Sergio el 10 de noviembre de 2026 a las 21:15 (America/Chicago; ese día coincide con America/Mexico_City). Se implementa en la ronda del puente `[id: 20261110-05]`, **encima** de la portada en cuatro pisos (`[id: 20261110-02]`, ya en `origin/main`).

Esta carpeta es **autocontenida**: abre `index.html` en el navegador (doble clic o un servidor estático). Las fotografías, la reja, la antorcha, la losa y el bucle de fuego van **embebidos como data URI** y llevan `data-asset="img/…"` (o el comentario `/* asset:… */` en el CSS) para poder extraerlos:

```bash
python3 extraer.py
```

`capturas.html` muestra las tomas de referencia (transiciones, losa, calabozo en vivo, antorcha, móvil y selector).

No copies este HTML al frontend: es la referencia visual. El código vive en React (`Portal.tsx`, `src/descenso/Pisos.tsx`, `useDescenso.ts`, tokens en `src/lib/diseño.ts`).

La maqueta original de los cuatro pisos (sin este elevador) sigue en `docs/diseno/descenso/`.

## Qué hay de nuevo

Entre cada piso el umbral es un **hueco de ascensor de 280 vh** (190 vh en móvil), con scroll acoplado (`p = -rect.top / (alturaDelHueco - viewport)` y lerp `k = 0.18`):

1. Cierra primero la reja interior de tijera (latón, vanos que se comprimen).
2. La puerta exterior de rellano la sigue, con un desfase.
3. La escena recede (baja y se escala) como si bajara la cabina.
4. Una **losa de concreto** cruza el encuadre, con el número del piso plantillado.
5. Al abrirse las puertas aparecen de inmediato la **placa de latón** y el título del piso (no queda un fotograma de fondo vacío). El contenido del piso entra justo detrás.

El selector de la derecha es un dial de latón. Un clic hace un scroll suave de **2.5 s**. En móvil (<900 px) el dial se queda compacto (sin botonera ni nombre); ya no se esconde por completo, a diferencia de la ronda 10-02.

En el calabozo: antorchas fotorrealistas (`antorcha.webp` + `fuego-loop.mp4` con `mix-blend-mode: screen` y máscara radial; `preload="none"` hasta que el piso está a la vista) y siluetas negras de bondage (cadenas, grilletes, aspa de San Andrés, cuerdas) como decoración, sin personas.

`prefers-reduced-motion`: sin scrubbing ni fuego animado; fotogramas abiertos estáticos. En móvil no se montan las antorchas `a3` y `a4`.

## Presupuesto de assets nuevos (producción)

Copiar a `public/descenso/` como webp (el mp4 se queda mp4). No van en el primer paint: viajan con el chunk perezoso de los pisos (§2.1).

| Archivo | Peso aprox. | Uso |
|---------|-------------|-----|
| `reja-bay.webp` | 40 KB | Vano repetible de la tijera interior. `background-size: calc(100% / 9)` del ancho de la hoja, para que los vanos se compriman al abrir. |
| `reja-ext.webp` | 202 KB | Hoja de la puerta exterior de rellano, panel de latón calado. |
| `reja-marco.webp` | 2 KB | Franja del marco, recortada de la puerta exterior. |
| `antorcha.webp` | 41 KB | Cuerpo (hierro, madera, trapo) sin llama, con alpha. |
| `fuego-loop.mp4` | 96 KB | Bucle de ~14 s, 200×296. Ver licencia abajo. |
| `fuego-poster.webp` | 1 KB | Poster del `<video>`. |
| `losa.webp` | ~257 KB (el jpg de trabajo era 589 KB) | Textura de la losa. Si Lighthouse se resiente, bajarla a ~120 KB. |
| `darkroom.webp` | 56 KB | Foto de ambiente **solo en el hueco** (llegar / salir del cuarto oscuro). El piso −2 sigue sin foto de fondo, con el velo safelight. |

Reja + antorcha + marco + poster + bucle de fuego ≈ **380 KB**. La losa y `darkroom` van aparte. Los fondos de Collins, el antro y el calabozo (`bar-hero`, `club`, `camara`) y el grano ya están en `public/descenso/` desde 10-02: reutilízalos. `fuego-sprite.png` **no se usa** (quedó de una iteración previa) y no está en esta carpeta.

El tinte por piso de la reja es un overlay (`mix-blend-mode: overlay`) enmascarado con el alpha del metal: Collins `#efd4a8`, antro `#cbb0d4`, oscuro `#e8a090`, calabozo `#f0b060`.

## Licencias

`img/reja-bay.webp`, `img/reja-ext.webp`, `img/reja-marco.webp`, `img/antorcha.webp` y `img/losa.webp` se **generaron para esta maqueta**. Fondo verde recortado a alpha en las rejas y la antorcha. Sin marca de agua.

`img/darkroom.webp` y las fotos de ambiente que esta maqueta reutiliza (`bar-hero`, `club`, `camara`, thumbs, grano) se generaron con IA para la dirección de arte de RAWstudio (9–10 noviembre 2026). No retratan personas reales identificables y no contienen desnudos ni sexo explícito.

`img/fuego-loop.mp4` y `img/fuego-poster.webp`: recorte vertical de *Burning Torch at the Dark* (Pexels vídeo [4765799](https://www.pexels.com/video/burning-torch-at-the-dark-4765799/)), autor «K», [licencia Pexels](https://www.pexels.com/license/) (uso libre, atribución apreciada). Se estabilizó el plano al pábilo, se recortó solo la llama (sin el recipiente de metal), se comprimieron los negros a 0,0,0 y se desvanecieron los bordes. Se compone sobre la antorcha con `mix-blend-mode: screen` y una máscara CSS radial.

Una foto de stock de Alamy se usó **solo como guía visual** para la reja. No se redistribuye (no está en este repositorio ni en `reja-comparacion.png`).

Las capturas de `capturas.html` son screenshots de este propio `index.html`. Las tipografías son de Google Fonts (SIL OFL). Las siluetas del calabozo son SVG originales de la maqueta.

## Qué no está aquí (a propósito)

- La foto de referencia de Alamy y cualquier composición que la incluya.
- `fuego-sprite.png` (Martin Jelinek / Mikodrak, OpenGameArt, CC0): iteración anterior, ya no se carga.
- Contenido explícito, caras o cuerpos desnudos.
- Formulario de login, panel admin, analítica, textos legales nuevos.
