# El descenso — maqueta de dirección de arte

Dirección visual aprobada por Sergio el 10 de noviembre de 2026 (America/Mexico_City).
Sustituye *Miami Neon Night* (`DESIGN-BRIEF.md` actual) como brújula de marca.

Esta carpeta es **autocontenida**: abre `index.html` en el navegador (doble clic o un servidor estático desde esta carpeta). Las fotografías van **embebidas como data URI** (el HTML abre aunque no existan aún los JPG sueltos) y llevan `data-asset="img/…"` para poder extraerlas.

Para materializar los archivos que Claude copiará a `public/descenso/` y las capturas de referencia:

```bash
python3 extraer.py
```

Eso escribe `img/bar-hero.jpg`, `img/stairs.jpg`, `img/club.jpg`, `img/camara.jpg`, `img/puerta.jpg`, `img/grain.png`, `img/thumb-1.jpg`–`thumb-6.jpg`, y las capturas `nivel1.jpg`–`nivel4.jpg`, `movil.jpg`, `antes-despues.jpg`, `desktop-full.jpg`. `capturas.html` las muestra en una sola página.

`favicon.svg` y `sello-rs.svg` sí viven como archivos de texto al lado del HTML.

La implementación en el producto la hacen las rondas del puente `[id: 20261110-01]` a `[id: 20261110-04]`. No copies este HTML al frontend: es la referencia visual. El código vive en React (`Portal.tsx`, tokens en `src/lib/diseño.ts`, etc.).

`v1/` de la sesión de diseño **no** está aquí: era la tipografía anterior, descartada.

## Historia

El sitio es un edificio en el que se baja. Cada piso es un lugar y un momento:

| Piso | Código | Sección | Qué cuenta | Captura |
|------|--------|---------|------------|---------|
| Planta baja · Calle Collins | PB | `#nivel-1` | Llegas. Salón art déco de Collins Avenue, Miami Beach. Hero. | `nivel1.jpg` |
| El antro | −1 | `#nivel-2` | Te sueltas. Club subterráneo: cómo funciona (3 pasos). | `nivel2.jpg` |
| Cuarto oscuro | −2 | `#nivel-3` | Te revelas. Laboratorio fotográfico: catálogo como hoja de contactos. | `nivel3.jpg` |
| El calabozo | −3 | `#nivel-4` | Te entregas. 80 % + SPEI + CTA + 18+. | `nivel4.jpg` |

Entre pisos hay **umbrales** (escalera, paso al revelado, puerta de hierro) que no son pantallas propias del producto: son transiciones de la landing.

También: `desktop-full.jpg` (página completa), `movil.jpg` (390 px), `antes-despues.jpg` (tipografías anteriores vs. las aprobadas).

## Copy del hero — no se toca

Tal cual está hoy en `src/screens/Portal.tsx` (y en esta maqueta):

```
Graba.
Ponle precio.
Cobra.

El 80% de cada dólar es tuyo.
Sin exclusividad.
```

No cambiar «80%» ni «dólar». Los CTAs existentes se quedan: «Crear mi cuenta», «Ya tengo cuenta», «Ver cómo funciona», «Solo vengo a ver».

## Tipografías

Cargadas desde Google Fonts en `index.html` (en producción: `font-display: swap`, subset `latin` + `latin-ext`, y no cargar todas a la vez; ver ronda 01).

| Token CSS | Familia | Dónde |
|-----------|---------|--------|
| `--font-deco` | **Italiana** | Wordmark «RAW» |
| `--font-serif` / `--font-script` | **Bodoni Moda** (itálica en «studio» y en scripts) | Titular del hero, «studio», acentos Collins |
| `--font-ui` | **Josefin Sans** | UI de Collins (nav, botones, textos) |
| `--font-neon` | **Monoton** | Letrero «Collins Avenue» (solo esa pieza) |
| `--font-club` | **Unbounded** | Títulos del antro |
| `--font-club-num` | **Bebas Neue** | Números 01 / 02 / 03 y marcas de piso del antro |
| `--font-club-ui` | **Space Grotesk** | Botones y UI del antro |
| `--font-playfair` | **DM Serif Display** | Títulos del cuarto oscuro |
| `--font-label` | **Courier Prime** | Etiquetas de laboratorio, cabecera de la hoja |
| `--font-grease` | **Permanent Marker** | Precios «a lápiz graso» |
| `--font-barlow` | **Barlow** | Botones del cuarto oscuro |
| `--font-cinzel` | **Cinzel** | Placas del calabozo |
| `--font-garamond` / `--font-fell` | **EB Garamond** | Titulares y plomo del calabozo |
| `--font-blackletter` | **Grenze Gotisch** | Firma «Descenso» del pie (opcional; se puede omitir si pesa) |
| `--font-cond` | **Barlow Condensed** | Botones remachados y pie del calabozo |
| `--font-mono` | **IBM Plex Mono** | Display del ascensor, cifra 18+ |

Wordmark: «RAW» en Italiana, letter-spacing ~0.22em, marfil. «studio» en Bodoni Moda italic. El color de «studio» cambia por piso:

- Collins: `#D4B483` (champagne)
- Antro: `#D4A0C8`
- Oscuro: `#D4212C` (safelight lit)
- Calabozo: `#E0B15A` (ámbar)

Sin tubo de neón, sin stroke hueco, sin glow magenta/lima.

## Paletas (tokens hex)

### Globales
- `--void` / cielo Collins: `#0E1520`
- `--ivory`: `#F3EBE2`
- `--muted`: `#C9BDB0`

### Collins (PB)
- cielo `--c-sky`: `#0E1520`
- navy `--c-navy`: `#141C28`
- champagne `--c-champagne`: `#D4B483`
- blush `--c-blush`: `#E8B4A8`
- seafoam `--c-seafoam`: `#7EBFB3`
- gold `--c-gold`: `#C9A86A`
- coral `--c-coral`: `#C47A6A`
- ivory `--c-ivory`: `#F3EBE2`

Botón primario Collins: texto `#141C28` sobre degradado `#E8D2A4 → #C9A86A` (contraste 7.58–11.57, AA).

### Antro (−1)
- void `--a-void`: `#08060E`
- violet `--a-violet`: `#7A3FA0`
- rose `--a-rose`: `#C45A8A`
- amber `--a-amber`: `#D4923A`
- ice `--a-ice`: `#D8D2E0`

Botón primario: blanco sobre `#9A58C4 → #7A3FA0` (4.60–6.89, AA justo en el más claro: preferir el violeta oscuro para texto normal).

### Cuarto oscuro (−2)
- void `--o-void`: `#080405`
- safelight `--o-safe`: `#B3121B`
- safelight lit `--o-safe-lit`: `#D4212C`
- paper `--o-paper`: `#F4EEE4`
- amber `--o-amber`: `#C9A04A`
- silver `--o-silver`: `#A39B96`
- muted `--o-muted`: `#C4B8B0`

Botón primario: `#F4EEE4` sobre `#D4212C → #B3121B`. El par papel / `#D4212C` da **4.49** (falla AA por 0.01 en texto normal). Usar `#B3121B` como fondo sólido del botón o bajar un punto el lit.

### Calabozo (−3)
- void `--k-void`: `#0B0A09`
- deep `--k-deep`: `#080605`
- oxblood `--k-oxblood`: `#7A1F24`
- ox lit `--k-ox-lit`: `#9A2A30`
- amber `--k-amber`: `#E0B15A`
- amber bright `--k-amber-b`: `#E8C989`
- bone `--k-bone`: `#F0E6D6`
- brass `--k-brass`: `#C9A25A`
- muted `--k-muted`: `#B5A898`
- iron `--k-iron`: `#3D3832`

Botón primario remachado: `#F0E6D6` sobre `#9A2A30 → #7A1F24` (6.18–8.29, AA).

### Contraste que hay que abandonar
El sitio actual pinta texto claro sobre magenta `#FF2BD1` (p. ej. `#F2F0F3` sobre `#FF2BD1` = **2.84**, falla AA). Esa pareja no vuelve.

## Efectos

- **Tinte de piso** (`#tinte`): velo fijo que cambia al bajar (seafoam/blush en Collins, violeta/ámbar en el antro, rojo safelight en el revelado, fuego bajo en el calabozo).
- **Viñeta** (`#viñeta`): oscurece las esquinas.
- **Grano** (`#grano`, `img/grain.png`): overlay al 7 %, animado en dos pasos. Se apaga con `prefers-reduced-motion` y en modo captura (`html.shot`).
- **Parallax suave** en fondos de piso y umbrales; se apaga con `prefers-reduced-motion`.
- **Ascensor** (`.ascensor`): indicador fijo a la derecha, bronce, marca PB / −1 / −2 / −3. Sirve para saltar de piso (`<a href="#nivel-N">`). **Se esconde bajo 900 px** (`.ascensor { display: none }`). `pointer-events: none` en el marco; los botones de piso sí reciben clics. Accesible: `aria-label="Pisos del edificio"`, display y nombre visibles.
- **Hoja de contactos**: fotogramas con sprockets, número de frame, candado, sello 18+, círculo de lápiz graso (filtro SVG `wobble`) y precio en Permanent Marker.
- **Botones del calabozo**: cuatro remaches en las esquinas (radiales) sobre el relleno de oxblood o hierro.
- **Letrero Collins Avenue**: Monoton con `text-shadow` blush + seafoam (neón pastel, no magenta).

## Imágenes

| Archivo | Uso | Notas |
|---------|-----|--------|
| `img/bar-hero.jpg` | Fondo Collins (1280×720) | Salón vacío, terrazo, barra, palmeras y mar al atardecer. Sin personas. |
| `img/stairs.jpg` | Umbral al antro (864×1152) | Escalera art déco, luz violeta abajo. Sin personas. |
| `img/club.jpg` | El antro (1280×720) | Salón subterráneo vacío, haces violeta y ámbar. Sin personas. |
| `img/camara.jpg` | El calabozo (1280×720) | Bóveda de piedra, diván, cadenas, velas. Sin personas ni acto sexual: solo atmósfera. |
| `img/puerta.jpg` | Umbral al calabozo (1280×720) | Puerta de hierro remachado. Sin personas. |
| `img/grain.png` | Overlay de grano (128×128, tile) | |
| `img/thumb-1.jpg` … `thumb-6.jpg` | Miniaturas de la hoja de contactos | Solo ambiente (telas, bandeja, estudios vacíos, contact sheet). **No son portadas reales** ni se publican como clips. |
| `favicon.svg` | Favicon de la maqueta | Monograma «RS» champagne sobre navy. |
| `sello-rs.svg` | Sello RS de bronce | Viene de la exploración del calabozo; el producto puede adoptarlo como favicon/sello 18+ (ronda 01). |

En producción, Claude debe copiar los fondos a `public/descenso/`, pasarlos a **webp** (y jpg de reserva si hace falta), recortar tamaños razonables (el hero no necesita más de ~1600 px de lado largo) y cargarlos con `loading="lazy"` salvo el de Collins (LCP). No hace falta duplicarlos fuera de esta carpeta hasta esa ronda.

## Origen y licencia

Todas las fotografías de ambiente se **generaron con IA** (Grok, sesión de dirección de arte de RAWstudio, 9–10 noviembre 2026) para esta maqueta. No son fotos de stock con licencia de terceros, no retratan personas reales identificables y no contienen desnudos ni sexo explícito. El grano es un tile generado para la maqueta. Las capturas (`nivel1.jpg` … `desktop-full.jpg`, `movil.jpg`, `antes-despues.jpg`) son screenshots de este propio `index.html`.

Los iconos son SVG originales de la maqueta (copa, ventilador, escalera, vinilo, etc.). Las tipografías son de Google Fonts (SIL OFL).

## Qué no está en la maqueta (a propósito)

- Contenido explícito, caras o cuerpos desnudos.
- Formulario de login (el login **no** se mueve a `/entrar`).
- Panel de administración (se queda desktop-only, `ANCHO_MINIMO` 1280; solo cambia de tokens).
- Analítica, heatmaps ni recuento de visitas.
- Textos legales nuevos, copy de Telegram ni pasarela de recargas.

## Elevador entre pisos (ronda 20261110-05)

La maqueta del hueco de ascensor, la reja de latón, la losa, el selector, las antorchas y las capturas de la transición está en [`elevador/`](./elevador/). Ábrela por su cuenta (`elevador/index.html`); no sustituye a este `index.html` (referencia de los cuatro pisos y las paletas). La implementación en el producto la hace la ronda `[id: 20261110-05]`, encima de 10-02.
