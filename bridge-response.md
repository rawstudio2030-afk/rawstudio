# Puente: respuestas (coordinador → Claude Code)

## Cómo usar
1. El coordinador lee entradas `estado: abierta` / `asignada` en [`bridge-query.md`](./bridge-query.md).
2. Responde aquí **arriba** (más reciente primero), citando el `id`.
3. Claude Code aplica la decisión, marca la consulta como `respondida` y deja el SHA del commit.

## Plantilla

```markdown
### Respuesta a [id: YYYYMMDD-NN]
- **fecha:** YYYY-MM-DD HH:MM (America/Mexico_City)
- **estado:** ejemplo | vigente | lista-para-claude
- **responde a:** (cita breve)
- **decisión:** …
- **razonamiento:** …
- **checklist afectados:** …
- **siguiente paso para Claude Code:** …
```

## Reglas permanentes (Claude Code)
1. **No preguntar a Sergio** por decisiones técnicas o de UI estándar. El coordinador decide; Sergio solo en negocio/contenido/legal.
2. **Negocio fijo:** comisión **20%** (creadora 80%), pagos **SPEI**, audiencia **18+**. No cambiar ese copy.
3. **Stack:** TypeScript strict, React 19 + `HashRouter`, Vite 8, tokens en `src/lib/diseño.ts`. Dirección visual vigente: **El descenso** (`docs/diseno/descenso/`, rondas `[id: 20261110-01]` a `[id: 20261110-04]`). `DESIGN-BRIEF.md` se reescribe en la 10-04; hasta entonces manda la maqueta, no *Miami Neon Night*.
4. **Prioridad:** seguridad y textos legales **antes** de abrir al público.
5. **Anti-bucle por tarea:** máx **10** rondas; solo iterar si mejora checklist; parar si **2** rondas seguidas no mejoran; tope **1 hora** por tarea; ítems `pass` **inmutables** salvo regresión.
6. **Diario:** cruzar diff + commit + ítem de checklist.

---

## Respuestas activas

### Respuesta a [id: 20261111-01] — Guías de grabación por modelo de iPhone (bot y sitio)
- **fecha:** 2026-11-11 19:10 (America/Mexico_City)
- **estado:** lista-para-claude
- **responde a:** Sergio pidió por voz (11 nov 2026) guías de grabación para iPhone 13, iPhone 14 y una agrupada para iPhone 15, 16 y 17, con el mismo diseño que la del iPhone 12. Quiere que el bot de Telegram las mande desde un botón «Guías de grabación» y que también estén en el sitio.
- **ronda:** 1 de 10 de esta tarea · **tope:** 1 hora
- **checklist afectados (NO marques pass tú):** §11 «Materiales para creadoras», ítem 1. No rompas ítems `pass` (§2.1, §2.2, §6.3 incluidos).

#### Orden respecto a rondas anteriores
`[id: 20261110-05]` ya está `respondida` y publicada (`f8dd71e`, más `f281777` y `75b3f0b` encima). **No la reabras**, ni 10-01…10-04. No mezcles esta ronda con `[id: 20261108-05]` (rawstudio.mx): el commit local del CNAME y del correo .mx sigue sin publicarse hasta el corte de DNS. Commit propio.

#### Material (ya hecho por el coordinador; no lo regeneres)
En `public/guias/` (commit de assets del coordinador, aparte de este):

| Archivo | Modelo | Páginas |
|---|---|---|
| `guia-iphone12.pdf` | iPhone 12 | 10 |
| `guia-iphone13.pdf` | iPhone 13 y 13 mini | 10 |
| `guia-iphone14.pdf` | iPhone 14 y 14 Plus | 10 |
| `guia-iphone15-16-17.pdf` | iPhone 15, 15 Plus, 16, 16 Plus y 17 | 10 |
| `portada-iphone12.webp` … `portada-iphone15-16-17.webp` | miniatura de la portada, 480 px de ancho | — |

Si al empezar `public/guias/` no existe en tu rama, **detente** y anótalo en `bridge-query.md`. No generes ni edites los PDF: los mantiene el coordinador. Son estáticos: GitHub Pages los sirve tal cual en `/guias/…`, fuera del `HashRouter`.

#### Diagnóstico (no lo reescribas: úsalo)
1. `supabase/functions/telegram-bot/index.ts` solo atiende `u.message` con texto en chat privado. No hay teclado ni `callback_query`. `/start` sin código y cualquier otro comando contestan `AYUDA`. **Cualquier texto que no sea comando va a `bot_enrutar`**, y el mensaje de un cliente a una consulta cuesta 20 pesos.
2. `AYUDA` y los demás textos del bot todavía dicen `rawstudio.biz` en `origin/main`. La constante canónica (`ORIGEN_CANONICO` en `supabase/functions/_shared/sitio.ts` y `src/lib/sitio.ts`) es de 08-05, que **no** está publicada.
3. `/creadoras` (`src/screens/Creators.tsx`) ya tiene secciones con ancla (p. ej. `#consultas`). La subida está en `/upload` (`src/screens/Upload.tsx`) y en el Estudio (`/estudio…`).

#### Qué hacer

**1. Bot: «Guías de grabación»**
- Un teclado en línea (`reply_markup.inline_keyboard`) con un botón **«Guías de grabación»** (`callback_data: 'guias'`). Va en la respuesta de `/start` sin código (junto a `AYUDA`) y en la de cualquier comando desconocido. Añade también el comando **`/guias`**, que va directo al selector. Atiéndelo **antes** del `if (texto.startsWith('/'))` que hoy devuelve `AYUDA`.
- Al tocar «Guías de grabación» (o con `/guias`), el bot manda «¿Qué iPhone tienes?» con cuatro botones: `iPhone 12`, `iPhone 13`, `iPhone 14`, `iPhone 15 · 16 · 17` (`callback_data` p. ej. `guia:12`, `guia:13`, `guia:14`, `guia:15-17`; lista blanca, nada que venga del usuario arma la URL).
- Al elegir uno: `sendDocument` con `document` = URL pública del PDF y un `caption` corto, sin `parse_mode`, como el resto del bot. Por ejemplo: «Guía para grabar con tu iPhone 13: ajustes, encuadre, luz y sonido. También está en <sitio>/#/creadoras.» Para la agrupada: «… con tu iPhone 15, 16 o 17 …». Luego `answerCallbackQuery` (siempre, aunque falle el envío, para que el botón no se quede girando). Si `sendDocument` falla, manda el enlace del PDF por `sendMessage`.
- Atiende `u.callback_query` en `Deno.serve`, **solo en chat privado**. Un toque de botón **nunca** pasa por `bot_enrutar`, no cobra, no crea ni toca consultas, y no llama a DeepSeek. Las guías son para cualquiera que escriba al bot, aunque no tenga cuenta vinculada.
- En `AYUDA`, añade una línea: «¿Vas a grabar? Escribe /guias o toca el botón para recibir la guía de tu iPhone.»
- DeepSeek sigue **solo para validar** consultas. Nada de respuestas generadas por IA. `TELEGRAM_BOT_TOKEN` se queda como secreto de Supabase: nunca en el repo ni en el front, y no lo imprimas en logs (ya existe `sinToken`).
- Webhook: si el `setWebhook` de producción se hizo con `allowed_updates`, debe incluir `callback_query`. **No lo cambies tú.** Escribe en el resultado el comando exacto (sin el token) para que Omar lo corra al desplegar la función.

**2. Sitio: dónde se descargan**
- En `/creadoras` (no la renombres), una sección **«Guías de grabación»** con ancla `#guias`: una tarjeta por modelo con la miniatura `portada-*.webp` (`loading="lazy"`, `decoding="async"`, `alt` con el modelo), el nombre del modelo, a qué modelos aplica (tabla de arriba), «10 páginas · PDF» y un enlace **«Descargar PDF»** (`href` al PDF y atributo `download`, o `target="_blank" rel="noopener"`). Cuatro tarjetas en fila en escritorio y una o dos columnas a 390 px.
- En la pantalla de subida (`/upload`) y en el Estudio, un enlace discreto: «¿Cómo grabar? Guías por modelo de iPhone →» hacia `/creadoras#guias`. Con `HashRouter`, haz que el ancla funcione: si `#/creadoras#guias` no baja solo, hazlo con `scrollIntoView` al montar.
- Estilo con los tokens de `src/lib/diseño.ts` (piso que ya usa `/creadoras`). Sin Tailwind, sin dependencias nuevas. Tocables ≥ 44 px, contraste AA.
- Las rutas de los PDF y miniaturas se arman con `import.meta.env.BASE_URL` + `guias/…`, nunca con un dominio escrito a mano.

**3. Dominio: va a cambiar a rawstudio.mx**
La dirección pública pasa a **https://rawstudio.mx** con 08-05, que aún no se publica. No escribas `rawstudio.biz` ni `rawstudio.mx` en código nuevo:
- **Front:** rutas relativas con `BASE_URL` (punto 2).
- **Bot:** las URLs absolutas que necesita Telegram salen de **una sola** constante. Si `supabase/functions/_shared/sitio.ts` (`ORIGEN_CANONICO`) existe en tu rama, impórtala. Si no existe (en `origin/main` no existe), define arriba de `telegram-bot/index.ts` `const SITIO = 'https://rawstudio.biz'` con un comentario que diga que 08-05 la sustituye por `ORIGEN_CANONICO`. Arma con ella las URLs de los PDF (`${SITIO}/guias/guia-iphone13.pdf`) y el enlace a `/#/creadoras`. No adelantes 08-05: los demás textos `.biz` del bot se quedan como están.

#### No tocar
- Los PDF y las miniaturas de `public/guias/`. Si ves un error de contenido, anótalo en `bridge-query.md`.
- El copy del hero («Graba. Ponle precio. Cobra.» / «El 80% de cada dólar es tuyo. Sin exclusividad.»), la puerta de edad, la ruta `/creadoras`, y el login (no lo muevas a `/entrar`).
- El cobro de consultas, los 20 pesos, los 2 días, `COBRO_CONSULTAS_ACTIVO`, los prompts de DeepSeek, `bot_enrutar` y `bot_canjear_codigo`, las migraciones (no hace falta ninguna) y los secretos.
- 08-05 (CNAME, correo .mx), 10-01…10-05, panel admin (`ANCHO_MINIMO` 1280), analítica o conteo de descargas (no se registra quién descarga), textos legales, procesador de recargas.
- Three.js, Spline, Tailwind u otra dependencia nueva.

#### Criterios de aceptación
1. `tsc -b` / `npm run build` / lint pasan. `deno check supabase/functions/telegram-bot/index.ts` pasa, si lo tienes.
2. Bot: `/start` sin código y `/guias` muestran el botón o el selector. Tocar cada modelo manda **ese** PDF (los cuatro), con caption y sin `parse_mode`, y responde el `callback_query`. Un toque de botón no genera cargo, no crea consulta y no llama a DeepSeek. Un `callback_data` que no está en la lista blanca se ignora con un aviso corto.
3. Un cliente con consulta abierta que usa `/guias` no pierde el hilo: su siguiente mensaje de texto se enruta como antes.
4. Sitio: `/creadoras#guias` muestra las cuatro tarjetas con miniatura y descarga, y cada enlace baja el PDF correcto. Desde `/upload` y el Estudio se llega a la sección. Sin desborde a 390 px, tocables ≥ 44 px.
5. Ningún literal nuevo `rawstudio.biz` / `rawstudio.mx` en el front. En el bot, una sola constante (o `ORIGEN_CANONICO`).
6. Los PDF no entran al bundle de JS: se sirven desde `public/`. El peso del primer paint de la portada no cambia (§2.1 inmutable).

#### Entrega
- Commit sugerido: `feat: guías de grabación por modelo de iPhone (bot y /creadoras)`.
- Commit propio, encima del commit de assets `public/guias/`. No mezcles con 08-05 ni con el correo .mx.
- En `bridge-query.md`, marca [id: 20261111-01] como `respondida` con el SHA. Incluye una captura o la descripción del selector del bot y de la sección `#guias`, y el comando de `setWebhook` para Omar si hace falta.

#### Siguiente paso para Claude Code
Implementa y deja el resultado en `bridge-query.md`. No abras otra ronda de diseño encima. Los demás materiales para creadoras (§11 del checklist) **no** son de esta ronda: los prepara el coordinador.

### Respuesta a [id: 20261110-05] — Elevador entre pisos del descenso
- **fecha:** 2026-11-10 21:15 (America/Mexico_City)
- **decisión de Sergio:** «Me gusta, mándaselo a Claude Code» (21:15 America/Chicago del 10 nov 2026; ese día coincide con America/Mexico_City). Aprobó la maqueta viva del elevador: reja de latón de dos puertas, losa de concreto, selector de dial, título de llegada al abrir y antorchas del calabozo.
- **estado:** lista-para-claude
- **depende de:** [id: 20261110-02] (portada en cuatro pisos). **10-01…10-04 ya están en `origin/main`** (`1802f79`, `9544c00`, `c6ae7ad`, `4876730`; docs del puente `47e4629`). No las reimplementes ni las reabras. Esta ronda se construye **encima** de 10-02: sustituye los umbrales cortos y el ascensor simple por el hueco con scroll acoplado.
- **referencia visual:** `docs/diseno/descenso/elevador/index.html` (maqueta, assets embebidos) y `docs/diseno/descenso/elevador/capturas.html`. Desde esa carpeta corre `python3 extraer.py` para materializar `img/reja-bay.webp`, `reja-ext.webp`, `reja-marco.webp`, `antorcha.webp`, `fuego-loop.mp4`, `fuego-poster.webp`, `losa.webp`, `darkroom.webp` y las capturas. Licencias en `docs/diseno/descenso/elevador/README.md`. Copia los assets **nuevos** a `public/descenso/` (webp; el mp4 se queda mp4). Reutiliza `bar-hero`, `club`, `camara` y `grain` que ya están ahí desde 10-02.

#### Diagnóstico (no lo reescribas: úsalo)
1. La portada de 10-02 (`src/screens/Portal.tsx`, `src/descenso/Pisos.tsx`, `useDescenso.ts`) ya es el edificio de cuatro pisos, con §2.1/§2.2 en pie: el hero de Collins es el primer paint; los pisos de abajo van en un chunk perezoso. El copy del hero es canónico y no se toca.
2. Los umbrales actuales son tramos cortos con foto (`stairs` al antro, un velo al revelado, `puerta` al calabozo) y un texto. El «ascensor» de 10-02 es un indicador fijo a la derecha que hace `scrollIntoView({ behavior: 'smooth' })`, **oculto bajo 900 px**. No hay reja, no hay losa, no hay scroll acoplado.
3. Sergio vio un hueco al abrir la reja: un rato de foto de fondo sola, porque el título del piso entraba después. En la maqueta aprobada el letrero de llegada (placa de latón + titular del piso) vive **dentro del hueco** y aparece al abrirse las puertas; el contenido del piso entra justo detrás. No debe quedar ningún fotograma de fondo vacío.
4. El calabozo de 10-02 ya tiene el 80 % y las tablillas sobre `camara.webp`. Le faltan las antorchas reales y las siluetas negras de decoración.

#### Qué hacer

Reproduce la maqueta en React, no copies el HTML a `public/`. Toma los números de `docs/diseno/descenso/elevador/index.html`.

**1. Huecos de ascensor entre pisos**

Sustituye los tres umbrales cortos (`#umbral-antro`, `#umbral-oscuro`, `#umbral-calabozo`) por huecos de **280 vh** (190 vh bajo 900 px). Cada uno es un `position: relative` con un `.shaft` `position: sticky; top: 0; height: 100dvh`:

- Foto de salida (`.shaft-out`) y foto de llegada (`.shaft-in`): Collins `bar-hero` → antro `club`; antro `club` → cuarto oscuro `darkroom` (archivo nuevo; el piso −2 **sigue** sin foto de fondo propia, solo el velo safelight); cuarto oscuro `darkroom` → calabozo `camara`.
- Progreso: `p = clamp(0, 1, -rect.top / (alturaDelHueco - viewport))`.
- La reja interior de tijera cierra primero (`gateInner`: 0→1 en `p = 0…0.20`, abierta de nuevo en `0.74…0.92`). La puerta exterior de rellano la sigue con desfase (`gateOuter`: empieza en `p = 0.08`, cierra en `0.26`, abre en `0.66…0.84`).
- La escena de salida recede (`translateY` negativo + `scale(1 - recede * 0.18)` + un poco de blur/brillo) como si bajara la cabina; la de llegada aparece al revés. Lerp de las puertas: `k = 0.18` (sigue corriendo en `requestAnimationFrame` aunque no haya evento de scroll).
- `prefers-reduced-motion`: sin scrubbing ni recede; fotogramas estáticos, puertas abiertas (o un cruce fundido mínimo, sin animar la reja).

**2. Losa de concreto**

En cada hueco, una losa (`.losa`, textura `losa.webp`) cruza el encuadre a mitad de viaje, con el número plantillado y el nombre del piso de llegada (`−1` / El antro, `−2` / Cuarto oscuro, `−3` / El calabozo). Sigue el movimiento de la maqueta (`top` en vh entre `p ≈ 0.30` y `0.70`). No es una pantalla del producto: es parte de la transición.

**3. Reja de latón**

Dos planos, fijos al viewport mientras dura el hueco (`z-index` por encima del contenido, `pointer-events: none`):

- Interior: `reja-bay.webp` es un **tile repetible**. `background-size: calc(100% / 9)` del ancho de la hoja (`--bays: 9`) para que los vanos se compriman al abrir. Dos hojas (izq/der); la derecha va en espejo (`scaleX(-1)`).
- Exterior: `reja-ext.webp` es la puerta de rellano (panel calado), una hoja a cada lado que se traslada. Marco con `reja-marco.webp`.
- Tinte por piso: overlay (`mix-blend-mode: overlay`) enmascarado con el alpha del metal (no un filtro que pinte el hueco). Collins `#efd4a8`, antro `#cbb0d4`, oscuro `#e8a090`, calabozo `#f0b060`.
- Perspectiva suave como en la maqueta (`perspective` + un `translateZ` en la puerta exterior); sin Three.js, sin Spline, sin WebGL.

**4. Selector / dial a la derecha**

Sustituye el ascensor de 10-02 por el dial de la maqueta (aguja, display PB/−1/−2/−3, nombre del piso, botones). `aria-label` claro; el piso activo se anuncia (`aria-current`), no solo con color. Un clic hace un scroll suave de **~2.5 s** (easing in-out, como `rideTo` de la maqueta); con `prefers-reduced-motion`, ~0.8 s o `auto`.

**Cambio respecto a 10-02:** en móvil (<900 px) el dial **no se esconde**. Queda un dial compacto (sin botonera ni nombre), como `movil.jpg`. No debe tapar el titular del hero ni robar los CTAs (tocables ≥ 44 px, sin desborde).

**5. Título de llegada (el hueco del «segundo 5»)**

Dentro de cada hueco, no después: una placa de latón (`Piso −1 · El antro`, etc.) más el titular que el piso ya usa («Graba tu pieza.», «Marca lo que quieres ver.», «El tributo se parte en la piedra.»). Se funde y sube al partirse las puertas (`smoothstep` de `p ≈ 0.78` a `0.88` en la maqueta). El contenido del piso de llegada empieza arriba, de modo que **ningún fotograma** muestre solo la foto de fondo. Verifica cuadro a cuadro (o con los `?shot=` de la maqueta: `trans-1`…`trans-3`, `llegada-1`…`llegada-3`) en los tres huecos, escritorio y 390 px.

**6. Calabozo: antorchas y siluetas**

- Cuerpo `antorcha.webp` + `<video class="fuego-loop" muted loop playsinline preload="none" poster="…/fuego-poster.webp">` con `mix-blend-mode: screen` y máscara radial, anclado al trapo (no un rectángulo flotando encima). `preload="none"` hasta que `#nivel-4` entra en vista (`IntersectionObserver`); entonces `preload="auto"` y `play()`. Pausar al salir.
- Cuatro antorchas en escritorio; en móvil **no montes** `a3` ni `a4` (como la maqueta: `display: none` o, mejor, ni las insertes, para no bajar cuatro vídeos).
- Luz de la llama con un radial `screen`. La animación de parpadeo de la maqueta basta; no hace falta desfasarlas en esta ronda.
- Siluetas negras de bondage (cadenas, grilletes, aspa de San Andrés, cuerdas) como decoración: copia los SVG de la maqueta (`.sil`, `mix-blend-mode: multiply`), `aria-hidden`, sin personas, sin foto explícita.
- El humo en canvas de la maqueta es opcional y barato; si lo traes, apágalo con `prefers-reduced-motion` y no lo metas en el primer paint. Si duda, déjalo fuera y dilo.

**7. Rendimiento y motion (obligatorio, por §2.1)**

- Reja, losa, `darkroom`, antorchas y `fuego-loop.mp4` **no** viajan en el bundle inicial: van con el chunk perezoso de `Pisos.tsx` (se piden al primer gesto de bajar, como ahora). El dial sí puede seguir en el primer paint, que ya trae el ascensor.
- Presupuesto: reja + antorcha + marco + poster + bucle de fuego ≈ **380 KB**. `losa.webp` sale ~257 KB de la maqueta (el jpg de trabajo era 589 KB): si Lighthouse se resiente, bájala a ~120 KB. `darkroom.webp` ≈ 56 KB.
- `loading="lazy"` / `decoding="async"` en las fotos del hueco. El bucle de fuego no se precarga fuera de vista.
- `prefers-reduced-motion`: sin scrubbing, sin recede, sin fuego en vídeo (poster estático o apagado), sin humo, puertas abiertas. El salto entre pisos sigue siendo usable.

#### No tocar
- El copy verbatim del hero («Graba. Ponle precio. Cobra.» / «El 80% de cada dólar es tuyo. Sin exclusividad.»).
- Age gate, ruta `/creadoras`, login en `/acceso`, analítica, tracking. En la portada, antes de `/age`, solo aplica la regla de la puerta de edad: la hoja de contactos sigue siendo **muestra** (decisión de 10-02), sin clips reales.
- Wordmark Italiana + Bodoni. Paletas y tipografías por piso de 10-01/10-02. Sin lima, cian ni magenta.
- Three.js, Spline, React Three Fiber, Tailwind u otra dependencia nueva.
- Panel admin (layout, `ANCHO_MINIMO` 1280, sin tipografías de cartelería).
- Migraciones, Telegram, DeepSeek, secretos, textos legales nuevos, procesador de recargas.
- [id: 20261108-05], 09-03, 09-04, 09-05. El commit local de correo .mx no se publica.
- Rondas 10-01…10-04: no las reabras ni mezcles su diff en este commit. No reescribas `DESIGN-BRIEF.md` entero; si tocas el párrafo del ascensor, actualízalo (dial compacto en móvil, huecos con scroll acoplado).

#### Criterios de aceptación
1. `tsc -b` / `npm run build` / lint (dinero, plurales) pasan.
2. En escritorio y en 390 px el scroll entre pisos va acoplado a la reja y a la losa (o el fallback estático si hay `prefers-reduced-motion`).
3. Al abrirse una reja **no hay un fotograma de fondo vacío**: se ven la placa y el título, y el contenido entra justo detrás. Los tres huecos, escritorio y móvil.
4. `prefers-reduced-motion` funciona (sin scrubbing ni fuego animado; se puede bajar de piso).
5. Lighthouse Performance de la portada no empeora de forma grave respecto al de 10-02; **deja los números** (Performance, LCP, peso del primer paint vs. el chunk de los pisos) en el resultado. El primer paint sigue siendo solo el hero de Collins (§2.1 inmutable).
6. A 390 px: dial compacto visible, sin desborde, CTAs del hero ≥ 44 px. Contraste AA en placa, dial y titulares de llegada.
7. La hoja de contactos de la portada no muestra clips reales antes de la puerta de edad.

#### Entrega
- Commit sugerido: `feat: elevador entre pisos del descenso`.
- Commit propio, encima de 10-02 (HEAD de producto ya incluye 10-01…10-04). No mezcles con 08-05 ni con el correo .mx.
- Marca [id: 20261110-05] `respondida` con SHA, nota de peso/Lighthouse y confirmación de que no quedó un fotograma vacío al abrir.

#### Siguiente paso para Claude Code
Implementa, deja el resultado en `bridge-query.md`. No abras otra ronda de diseño encima.

### Respuesta a [id: 20261110-04] — Correos y brief El descenso
- **fecha:** 2026-11-10 12:20 (America/Mexico_City)
- **decisión de Sergio:** el rediseño incluye la papelería que sale de la casa (correos) y el documento que Claude (y el coordinador) van a seguir después.
- **estado:** lista-para-claude
- **depende de:** [id: 20261110-01] (tokens). Puede hacerse en paralelo conceptual a 10-03, pero **el commit va después** de 10-03 para no mezclar.

#### Diagnóstico (no lo reescribas: úsalo)
1. Hay **170** literales hex en correos:
   - `supabase/functions/avisar-retiro/index.ts` (45)
   - `supabase/templates/recuperar.html` (30)
   - `avisar-creadora` (18), `avisar-verificacion` (15), `avisar-compra` (15), `avisar-verificada` (13), `avisar-bienvenida` (11), `avisar-purga` (7), `enviar-campana` (6)
2. Esos HTML se ven en Gmail/Outlook: nada de flex moderno, fondos fotográficos pesados ni tipografías custom que Outlook vaya a ignorar. Se puede cambiar paleta (fondos oscuros navy/void, acentos champagne/oxblood, texto ivory/bone) y el wordmark a texto «RAW» + «studio» sin tubo neon.
3. `DESIGN-BRIEF.md` describe todavía *Miami Neon Night* (magenta, cian, lima, skyline, «GRABA. PONLE PRECIO. COBRA.» en Anton). Hay que reescribirlo para que nadie vuelva a implementar neon.
4. `public/favicon.svg` sigue siendo el círculo magenta con play lima, si 10-01 no lo cambió. Esta ronda es buen sitio para adoptar `docs/diseno/descenso/sello-rs.svg` / `favicon.svg` y, si tocas `og.png` / apple-touch, que sean marca discreta (sin contenido adulto, sin skyline magenta).

#### Qué hacer

**1. Plantillas de correo**
- Sustituye magenta/lima/cian por tokens del descenso (void `#0E1520` / navy `#141C28`, ivory `#F3EBE2`, champagne `#D4B483`, oxblood `#7A1F24` para énfasis, ámbar `#E0B15A` para dinero). Contraste AA en texto sobre el fondo del correo.
- Wordmark en texto o un PNG/SVG chico ya existente (`public/correo/logo.png` — si lo regeneras, que sea el wordmark nueva, no el neon). No incrustes los JPG de 300+ KB de la maqueta en cada mail.
- No cambies copy, asuntos, remitentes ni buzones: siguen `@rawstudio.biz`. No inventes textos legales ni de Telegram. No muevas el FROM a `.mx`. El commit local de correo .mx **sigue sin publicarse**.
- `enviar-campana` y recuperar contraseña entran en el mismo barrido.

**2. Reescribir `DESIGN-BRIEF.md`**
- Título: RAWstudio — Brief de diseño visual (**El descenso**).
- Apunta a `docs/diseno/descenso/README.md` como fuente de paletas, tipografías y efectos.
- Resume los cuatro pisos, el wordmark (Italiana + Bodoni italic, «studio» por piso), el mapa de pantallas de 10-03, el ascensor (oculto <900 px, `prefers-reduced-motion`), modo consumo (reproductor sobrio) vs modo marca (landing y puertas).
- Copy canónico del hero (verbatim).
- Reglas: mobile-first, no inventar features, tokens en `diseño.ts`, admin solo tokens / desktop 1280, no renombrar `/creadoras`, no mover el login a `/entrar`, no tracking, no legales inventados.
- Quita la paleta magenta/cian/lima y el orden de implementación viejo (o márcalo como histórico, una línea).

**3. Favicon / og (si no se hizo en 10-01)**
- Actualiza `public/favicon.svg` al sello RS o al monograma de la maqueta. Regenera apple-touch / icon-192 / icon-512 / `og.png` solo si puedes hacerlo en esta ronda sin meter fotos de ambiente pesadas en `og.png` (la preview de WhatsApp debe seguir siendo marca discreta, como ya documenta `index.html`).

**4. Regla permanente del puente**
- En este mismo commit, si el coordinador no lo dejó ya: la regla 3 de `bridge-response.md` debe decir **El descenso**, no *Miami Neon Night*. Si ya está actualizada, no la reescribas.

#### No tocar
- Cuerpos legales, textos de Telegram, procesador de recargas, secretos, `TELEGRAM_BOT_TOKEN`.
- Dominio canónico / CNAME / FROM (08-05 y el commit local de correo .mx).
- Lógica de las edge functions (cuándo se manda un correo, a quién, qué datos); solo presentación HTML/CSS inline.
- Landing y páginas (10-02/10-03). Migraciones.

#### Criterios de aceptación
1. `rg '#FF2BD1|#C8FF3D|#00E5FF' supabase/functions supabase/templates` no devuelve esos acentos.
2. Un HTML de bienvenida y el de recuperar se ven legibles en una vista estrecha (360 px) y en una ancha: texto contraste AA, marca nueva, sin recortes salvajes.
3. `DESIGN-BRIEF.md` describe El descenso y apunta a la maqueta; ya no prescribe magenta/cian/lima como dirección vigente.
4. Favicon nuevo o nota explícita de por qué se dejó el viejo.
5. `tsc -b` / `npm run build` si tocaste frontend; las functions siguen tipadas como el repo las comprueba hoy.

#### Entrega
- Commit sugerido: `feat: correos y brief al descenso`.
- Commit propio, el último de la serie.
- Marca [id: 20261110-04] `respondida` con SHA y diff.

#### Siguiente paso para Claude Code
Implementa, deja el resultado en `bridge-query.md`. No abras una quinta ronda de diseño salvo que algo de estas cuatro no compile o rompa un flujo.

### Respuesta a [id: 20261110-03] — Páginas públicas al descenso y barrido de colores
- **fecha:** 2026-11-10 12:20 (America/Mexico_City)
- **decisión de Sergio:** el rediseño no se queda en la portada; el resto del sitio público tiene que pertenecer al mismo edificio.
- **estado:** lista-para-claude
- **depende de:** [id: 20261110-01] y [id: 20261110-02].

#### Diagnóstico (no lo reescribas: úsalo)
1. Tras 10-01/10-02, la portada ya habla el descenso, pero Explorar, fichas, perfiles, `/creadoras`, `/entrar`, age gate, etc. siguen con restos neon (clases `.miami-*`, `PaginaMiami`, `FondoFijo`, hex sueltos).
2. En `src` hay ~395 literales hex (52 en `src/index.css`) más rgba. Magenta `#FF2BD1`, lima `#C8FF3D` y cian `#00E5FF` aparecen fuera de `diseño.ts`. El barrido tiene que pasar esas pantallas a tokens.
3. `PaginaMiami` envuelve puerta / acceso / registro / nueva-clave con el skyline fijo y el wordmark neon.

#### Mapa de pisos (propuesta del coordinador: síguela; si una pantalla encaja mejor en otro piso, dilo en el resultado y justifica)

| Piso | Pantallas |
|------|-----------|
| **Collins (marca de llegada, elegante)** | `/` ya hecho en 10-02; AgeGate (`/age`, `/intro`); `/entrar` (puerta, **sin** mover el formulario de login aquí); `/acceso`, `/registro`, `/nueva-clave`, `/modo`; legales `/privacidad` `/terminos` `/contacto` `/preguntas` `/ayuda`. `PaginaMiami` → marco Collins (fondo `bar-hero` velado o void navy + tinte champagne/seafoam, wordmark con «studio» champagne). |
| **Antro (movimiento, cómo se entra a la casa)** | `/creadoras` (**no** renombrar la ruta); partes públicas de invitación a publicar; `/consultas` (la conversación / el club). Energía violeta-ámbar, Unbounded/Space Grotesk, sin convertirlo en un flyer de antro que grite. |
| **Cuarto oscuro (ver y elegir)** | Explorar (`/clip` y la grilla); `TarjetaClip`; `ClipDetail` (el reproductor sigue **sobrio**: el cromo de la ronda 2 no se re-decora; safelight solo en marcos, precios, candados, 18+); `CreatorProfile` (su «hoja de contactos» + cabecera más Collins si ayuda a leer el nombre); Biblioteca. La grilla se inspira en la hoja de contactos de la maqueta (sprockets/marco no son obligatorios en cada thumbnail si dañan densidad o rendimiento; al menos paleta, tipografía de precio y 18+). |
| **Calabozo (tributo y cuenta)** | Wallet, earnings, retirar, estudio/cobro, CTAs de «el 80 % es tuyo» fuera de la landing. Oxblood + ámbar + bone. No conviertas el Estudio entero en una mazmorra: las herramientas de la creadora (`/upload`, `/estudio/clips`, Gestión) usan tokens del calabozo (acento, fondos) con UI clara y densa. |
| **Admin (sin piso)** | Solo tokens nuevos (ya en 10-01). Desktop-only, `ANCHO_MINIMO` 1280. Cero fondos fotográficos, cero tipografías de cartelería (sin Monoton, sin Permanent Marker, sin Grenze Gotisch). |

#### Qué hacer
1. Aplica el mapa. Sustituye `PaginaMiami` / `FondoFijo` / restos de `FondoMiami` por equivalentes del piso Collins (o el que toque). Renombrar componentes (`PaginaCollins`, etc.) está bien si actualizas todos los imports.
2. Barrido de hex y de `.miami-*` en `src` (incluido `src/index.css`). Lo que quede hardcodeado debe ser excepción justificada (p. ej. un canvas) o token. El magenta/lima/cian de marca no deben sobrevivir en el sitio público.
3. Wordmark en cada pantalla: pasa el `piso` correcto.
4. Contraste AA en textos y botones nuevos. Revisa sobre todo precios, badges RENTA/18+ y estados de error.
5. Móvil 390 px en Explorar, ficha, perfil, `/creadoras`, `/acceso`. Tocables ≥ 44 px.
6. Sin regresiones de flujo: entrar, registrarse, explorar, abrir un clip, ver un perfil, ir a `/creadoras`, recuperar clave, age gate.

#### No tocar
- Ruta `/creadoras` (el path se queda). Formulario de login (se queda en `/acceso`, no en `/entrar`).
- Copy 80 % / dólar. Reproductor: controles y marca de agua de las rondas 2–3.
- Admin: layout, módulos, `ANCHO_MINIMO`. Correos (10-04). Migraciones, Telegram, DeepSeek, secretos, analítica, legales inventados.
- 08-05, 09-03, 09-04, 09-05. El commit local de correo .mx no se publica.

#### Criterios de aceptación
1. Una pasada visual (desktop + 390 px) de Explorar, ficha, perfil, `/creadoras`, `/acceso`, age gate, wallet: se reconocen como el mismo edificio, no como neon + parches.
2. `rg '#FF2BD1|#C8FF3D|#00E5FF' src` (y equivalentes en minúscula) no devuelve acentos de marca; lo que quede, listado y justificado en el resultado.
3. Clases `.miami-*` eliminadas o reducidas a cero usos. `PaginaMiami` / `FondoMiami` sin imports vivos.
4. Lighthouse a11y de Explorar y de una ficha ≥ el actual. Contraste AA.
5. Flujos de arriba sin regresión. `tsc -b` / `npm run build` / lint OK.

#### Entrega
- Commit sugerido: `feat: paginas publicas al descenso`.
- Commit propio, después de 10-02.
- Marca [id: 20261110-03] `respondida` con SHA, lista de pantallas tocadas y el mapa final si lo ajustaste.

#### Siguiente paso para Claude Code
Implementa, luego [id: 20261110-04]. Resultado en `bridge-query.md`.

### Respuesta a [id: 20261110-02] — Portada: el descenso en cuatro pisos
- **fecha:** 2026-11-10 12:20 (America/Mexico_City)
- **decisión de Sergio:** la landing es un descenso: planta baja Collins Avenue → el antro → el cuarto oscuro → el calabozo. Aprobó la maqueta con las tipografías actuales.
- **estado:** lista-para-claude
- **depende de:** [id: 20261110-01] (tokens, fuentes, wordmark). Impleméntala antes.
- **referencia visual:** `docs/diseno/descenso/index.html` (maqueta, fotos embebidas) y `docs/diseno/descenso/capturas.html`. Desde esa carpeta corre `python3 extraer.py` para materializar `img/bar-hero.jpg`, `stairs.jpg`, `club.jpg`, `camara.jpg`, `puerta.jpg`, `grain.png` y las capturas `nivel1.jpg`–`nivel4.jpg`, `desktop-full.jpg`, `movil.jpg`, `antes-despues.jpg`. Copia los fondos a `public/descenso/` como webp (jpg de reserva).

#### Diagnóstico (no lo reescribas: úsalo)
1. `src/screens/Portal.tsx` es el primer paint: wordmark, titular, subtítulo, «Crear mi cuenta» / «Ya tengo cuenta» / «Ver cómo funciona». Monta `FondoMiami` y clases `.miami-*`. `ComoFunciona`, `FormasDeGanar` y `SobreNosotros`/`Portada` van con `React.lazy` y se montan al clic (rondas 1 y 4, §2.1 y §2.2 **pass inmutables**).
2. `src/components/SeccionesNeon.tsx` es «Cómo funciona» + panel del 80 % al estilo neon. `FondoMiami.tsx` / `FondoFijo.tsx` pintan el skyline magenta.
3. El copy del hero en `Portal.tsx` (líneas del titular y «El 80% de cada dólar es tuyo. / Sin exclusividad.») es **canónico**. La maqueta ya lo trae igual.
4. §2.1 (primer paint = solo hero) y §2.2 (contacto/privacidad/FAQ solo con clic) son `pass` inmutables: el descenso no puede montar los cuatro fondos ni las tres secciones inferiores en el bundle inicial.

#### Qué hacer

**1. La landing es el edificio**
Reproduce la maqueta en React, no copies el HTML a `public/`. Cuatro pisos más umbrales entre ellos:

- **PB Collins (`#nivel-1`)** — hero a pantalla completa con `img/bar-hero.jpg` (cópiala a `public/descenso/` como webp + jpg de reserva, lado largo ≤ ~1600 px). Velo como en la maqueta. Wordmark + titular + subtítulo **verbatim** + los tres botones y «Solo vengo a ver». Badge/sello 18+. Marca de piso: «Planta baja · Collins Avenue» (letrero Monoton pastel, no magenta). Indicación «Baja al antro».
- **Umbral escalera** — `img/stairs.jpg`. Texto de maqueta («La noche empieza debajo.» / «El antro.»).
- **−1 El antro (`#nivel-2`)** — sustituye el «Cómo funciona» neon. Tres pasos (Graba tu pieza / Ponle precio y cuélgala / Cobra. El 80% queda tuyo.) con tipografía Unbounded + Bebas Neue, fondo `img/club.jpg`, haces violeta y ámbar. Precios de ejemplo 10 / 20 / 40 USD como en el producto; no inventes otros.
- **Umbral revelado** — paso al cuarto oscuro, luz roja, sin foto propia o con un velo.
- **−2 Cuarto oscuro (`#nivel-3`)** — catálogo de la portada como **hoja de contactos** (sprockets, frame, candado, 18+, lápiz graso, precio a Permanent Marker). Usa clips **reales** publicados (el mismo origen que hoy use la portada/ explora de muestra), no las miniaturas `thumb-*.jpg` (esas son dummy de la maqueta). Si hoy la portada no lista clips y manda a Explorar, mantén ese criterio: la hoja puede ser una muestra o un enlace visual a `/clip`; no inventes un ranking nuevo ni tracking.
- **Umbral puerta** — `img/puerta.jpg`. «El calabozo.»
- **−3 El calabozo (`#nivel-4`)** — `img/camara.jpg`, cifra 80 % TUYO, texto de tributo (puedes usar el de la maqueta siempre que no contradiga «el 80% de cada dólar» / SPEI / sin exclusividad / 18+), tablillas «Para quien crea» / «Para quien visita», CTA final «Crear mi cuenta» / «Ya tengo cuenta» a `/registro` y `/acceso`. Pie con enlaces existentes (cómo funciona, piezas/explorar, preguntas, legales). No inventes textos legales.

**2. Ascensor**
- Replicate `.ascensor`: fijo a la derecha, bronce, display PB/−1/−2/−3 y nombre del piso, botones para saltar.
- `aria-label` claro; el piso activo se anuncia (no solo color).
- **Oculto bajo 900 px** (no debe tapar el hero en móvil). En 390 px la página se recorre solo con scroll, como `movil.jpg`.
- Respeta `prefers-reduced-motion`: sin parallax, sin grano animado, `scroll-behavior: auto`.

**3. Sustituir, no acumular**
- `FondoMiami` y `SeccionesNeon` dejan de usarse en la portada. Si nadie más los importa, bórralos o déjalos sin uso y dilo; no mantengas dos landings.
- Las clases `.miami-*` que solo servían al hero se reemplazan por las del descenso (o se reescriben). No dejes botones magenta/cian.

**4. Rendimiento (obligatorio, por §2.1)**
- Primer paint = hero Collins: wordmark, titular, subtítulo, CTA principal. El fondo Collins puede ser el LCP (webp, `fetchpriority="high"`, tamaño contenido).
- Pisos −1…−3, umbrales, hoja de contactos y fuentes no críticas: `React.lazy` y/o carga al acercarse (IntersectionObserver) o al primer scroll. No metas `camara.jpg` ni Unbounded en el bundle inicial.
- `font-display: swap` (ya pedido en 10-01). Grano en CSS overlay, no un canvas pesado.
- Presupuesta LCP: no empeorar de forma notable el peso del primer paint respecto al hero actual (que ya no trae `launch.mp4`).

**5. Rutas de los CTAs (no inventes pantallas)**
- «Crear mi cuenta» → `/registro`
- «Ya tengo cuenta» → `/acceso` (el formulario de login **no** se mueve a `/entrar`)
- «Ver cómo funciona» → baja al antro (`#nivel-2`) o el equivalente interno
- «Solo vengo a ver» → `/clip` (Explorar) o el cuarto oscuro si montas muestra; coherente con lo que hace hoy

#### No tocar
- El copy verbatim del hero (80 % / dólar / sin exclusividad).
- Age gate, `/creadoras` (nombre), login en `/acceso`, analítica.
- Panel admin (salvo que un token lo rompa: eso es 10-01).
- Migraciones, Telegram, DeepSeek, secretos, legales, recargas.
- [id: 20261108-05], 09-03, 09-04, 09-05. El commit local de correo .mx no se publica.
- No reabrir el recorte de «Sobre nosotros» (ronda 4): no vuelvas a montar la `Portada` larga bajo el hero.

#### Criterios de aceptación
1. A 1440 px la landing se reconoce al lado de `nivel1.jpg`–`nivel4.jpg` y `desktop-full.jpg`: mismos pisos, wordmark, paletas y ascensor.
2. A 390 px se reconoce al lado de `movil.jpg`: sin ascensor, tipografías y CTAs usables (≥44 px), sin desbordes horizontales.
3. Hero: las cinco líneas del titular/sub **idénticas** a las de producción hoy.
4. Lighthouse accessibility ≥ el de la portada actual (mismo perfil de medición). Contraste AA; `prefers-reduced-motion` apaga parallax/grano/scroll suave.
5. Primer paint sin los fondos del antro/calabozo ni las fuentes de esos pisos. Medir y dejar el peso en el resultado.
6. Flujos: crear cuenta, ya tengo cuenta, ver cómo funciona, solo vengo a ver, 18+, enlaces del pie. Sin regresiones.
7. `tsc -b` / `npm run build` / lint (dinero, plurales) pasan.

#### Entrega
- Commit sugerido: `feat: portada en cuatro pisos (el descenso)`.
- Commit propio, después de 10-01. No mezcles con 10-03 ni 08-05.
- Marca [id: 20261110-02] `respondida` con SHA, capturas (desktop 4 pisos + móvil) y nota de peso/LCP.

#### Siguiente paso para Claude Code
1. Confirma que 10-01 está en el árbol.
2. Implementa esta ronda.
3. Sigue con [id: 20261110-03].
4. Deja el resultado en `bridge-query.md`.

### Respuesta a [id: 20261110-01] — Tokens, tipografías y wordmark del descenso
- **fecha:** 2026-11-10 12:20 (America/Mexico_City)
- **decisión de Sergio:** aprobó la maqueta «El descenso» (tipografías actuales, no las de `v1`) y pidió pasar indicaciones e imágenes al repo para que Claude implemente el rediseño.
- **estado:** lista-para-claude
- **referencia visual:** [`docs/diseno/descenso/`](./docs/diseno/descenso/README.md) — abre `index.html` y `capturas.html`. `python3 extraer.py` escribe las capturas y los fondos como archivos. Tokens, tipografías, hex y efectos están en el README.

#### Diagnóstico (no lo reescribas: úsalo)
1. Tokens actuales en `src/lib/diseño.ts`: `COLOR` (fondo `#08080A`, acento magenta `#FF2BD1`, dinero lima `#C8FF3D`, admin cian `#00E5FF`), `LINEA`, `VELO`, `TINTE`, `FUENTE` (Anton / Space Grotesk / Space Mono), `RADIO`, y los aditivos de *Miami Neon Night*: `GLOW`, `DEGRADADO`, `MIAMI`.
2. `index.html` carga Anton + Space Grotesk + Space Mono. `theme-color` es `#08080A`.
3. `Wordmark.tsx` pinta «RAW» en magenta y «studio» en lima, con tubo de neón (`WebkitTextStroke` + `drop-shadow`). Comportamiento de navegación (inerte en `/`, `/age`, `/intro`; si no, casa) **se conserva**.
4. Clases `.miami-*` en `src/index.css` (`.miami-titular`, `.miami-boton-magenta`, `.miami-velo`, etc.) y componentes `FondoMiami.tsx`, `PaginaMiami.tsx`, `FondoFijo.tsx`, `SeccionesNeon.tsx`. Esta ronda **no** rediseña la landing: solo deja los tokens y el wordmark listos para que 10-02 y 10-03 los usen.
5. Contraste actual: texto claro sobre magenta `#FF2BD1` ≈ **2.84** (falla WCAG AA). La nueva paleta sí pasa AA en los pares documentados en el README; el único justo es papel `#F4EEE4` sobre safelight lit `#D4212C` (4.49): usa `#B3121B` como fondo sólido de ese botón.
6. En `src` hay ~395 literales hex (52 en `src/index.css`) más rgba sueltos. Esta ronda no hace el barrido completo (eso es 10-03): aquí se rediseña la fuente de verdad (`diseño.ts` + fuentes + wordmark) y se evitan nuevas introducciones de magenta/lima/cian de marca.

#### Qué hacer

**1. Reescribir `src/lib/diseño.ts`**
- Conserva la forma del archivo (un solo sitio para tokens) pero **sustituye** la dirección Miami Neon:
  - `COLOR.fondo` → `#0E1520` (void Collins; el calabozo y el antro pueden exponerse como `COLOR.fondoAntro` / `COLOR.fondoOscuro` / `COLOR.fondoCalabozo` o un mapa `PISO`).
  - `COLOR.superficie` / `superficieAlta` → navy `#141C28` y un escalón por encima (no inventes una escala de 8 grises).
  - `COLOR.texto` → `#F3EBE2` (ivory). `textoSuave` / `textoTenue` / `textoApagado` a partir de `#C9BDB0` bajando luminosidad, siempre ≥ 4.5:1 sobre el fondo que usen.
  - `COLOR.acento` ya no es magenta. El acento «de casa» (botón primario por defecto, fuera de un piso concreto) es champagne `#C9A86A` / `#D4B483`, con texto oscuro `#141C28` cuando el acento es fondo.
  - `COLOR.dinero` deja de ser lima `#C8FF3D`. Usa ámbar `#E0B15A` (9.99:1 sobre `#0B0A09`) o el champagne; no reutilices el lima.
  - `COLOR.admin` deja el cian de neón `#00E5FF`. Usa brass `#C9A25A` o un hielo discreto que cumpla AA; no lo uses de adorno en el sitio público.
- Añade tokens de piso (`PISO.collins | antro | oscuro | calabozo`) con los hex del README. Incluye color de «studio» por piso (`#D4B483`, `#D4A0C8`, `#D4212C`, `#E0B15A`).
- `FUENTE`: mapea display/ui/mono **y** las familias por piso según el README (`display` ya no es Anton). No dejes Anton referenciado.
- `GLOW`, `DEGRADADO` y `MIAMI`: **elimínalos o sustitúyelos** por equivalentes del descenso (tintes de piso, letrero Collins pastel blush+seafoam, remaches, safelight). No dejes `GLOW.magenta` / `textoMagenta` / cielo violeta-magenta. Actualiza todos los importadores de esta ronda para que `tsc` pase; lo que pertenezca a la landing se toca lo mínimo (aliases temporales solo si 10-02 va justo después en el mismo día — preferible actualizar usos rotos a tokens nuevos).
- `LINEA`, `VELO`, `TINTE`, `RADIO`: reescribe sobre la paleta nueva. El sitio no es de esquina redondeada tipo app: Collins y el antro son vivos; el calabozo es casi vivo (`1px`). No inventes una escala de radios.
- Documenta en comentarios que la brújula es `docs/diseno/descenso/README.md`.

**2. Fuentes en `index.html`**
- Sustituye el `<link>` de Anton / Space Grotesk / Space Mono.
- Carga con `display=swap`, `preconnect` a Google Fonts (ya está) y subset `latin,latin-ext` (español: tildes, ñ).
- **No cargues las 16 familias en el primer paint.** Críticas para LCP del hero (Collins): Italiana, Bodoni Moda (incluye itálica), Josefin Sans. Space Grotesk puede quedarse si la usas de UI general.
- El resto (Unbounded, Bebas Neue, DM Serif Display, Courier Prime, Permanent Marker, Barlow / Barlow Condensed, Cinzel, EB Garamond, IBM Plex Mono, Monoton, Grenze Gotisch) se carga al entrar o al acercarse al piso que las usa, o con un segundo stylesheet diferido. Grenze Gotisch es opcional (solo la firma «Descenso» del pie).
- `theme-color` → `#0E1520`.

**3. Wordmark (`src/components/Wordmark.tsx`)**
- «RAW» en Italiana, letter-spacing ~0.22em, color ivory `#F3EBE2`.
- «studio» en Bodoni Moda italic. Color según piso (prop `piso?: 'collins' | 'antro' | 'oscuro' | 'calabozo'`, default `'collins'`).
- Sin tubo de neón, sin `WebkitTextStroke`, sin glow magenta/lima.
- Conserva: `inerte` en `/`, `/age`, `/intro`; destino `/clip` o `/entrar` según sesión; scroll-to-top si ya estás en casa; `ancho` como API pública (reescala la letra).
- Mira `docs/diseno/descenso/index.html` (`.marca .raw` / `.marca .studio`) y `antes-despues.jpg`.

**4. Favicon / sello (opcional en esta ronda, deseable)**
- Referencia: `docs/diseno/descenso/sello-rs.svg` (monograma RS de bronce) y `favicon.svg` de la maqueta. Si actualizas `public/favicon.svg` / apple-touch / `og.png`, que no meta contenido adulto ni el skyline magenta. Si lo dejas para 10-04, dilo en el resultado.

**5. Panel de administración**
- Solo debe **compilar y leerse** con los tokens nuevos (contraste AA). No rediseñes layout, no bajes de `ANCHO_MINIMO` 1280 (`src/admin/piezas.tsx`). Sin pisos ni fondos fotográficos en el panel.

#### No tocar
- Landing (`Portal.tsx`, `SeccionesNeon.tsx`, `FondoMiami.tsx`) más allá de lo imprescindible para que compile tras cambiar tokens/wordmark. El descenso de 4 pisos es [id: 20261110-02].
- Barrido de hex sueltos en pantallas internas: [id: 20261110-03]. Correos y `DESIGN-BRIEF.md`: [id: 20261110-04].
- Copy del hero («El 80% de cada dólar es tuyo.»), `/creadoras` (no renombrar), formulario de login (no moverlo a `/entrar`), analítica/visitas/heatmaps.
- Migraciones, RLS, precios, Telegram, DeepSeek, secretos, buzones `@rawstudio.biz`, marcador `@alta.rawstudio.biz`.
- No reabras [id: 20261109-03], [id: 20261109-04], [id: 20261109-05] (ya aplicadas). No mezcles con [id: 20261108-05] (CNAME / correo .mx). **El commit local que mueve el correo a .mx no se publica.**
- No inventes textos legales.

#### Criterios de aceptación
1. `diseño.ts` ya no exporta magenta `#FF2BD1`, lima `#C8FF3D`, cian `#00E5FF` como acentos de marca, ni `GLOW`/`DEGRADADO`/`MIAMI` al estilo neon. Los hex del README están nombrados.
2. Wordmark = Italiana + Bodoni italic; «studio» admite color por piso; se ve como en la maqueta (no como tubo neon). Captura del header en desktop y a 390 px.
3. `index.html` carga las fuentes críticas con `display=swap`; LCP no descarga Unbounded/Cinzel/etc. en el primer stylesheet.
4. Contraste AA en texto de tokens por defecto (incluido el acento usado como fondo: texto oscuro sobre champagne, no ivory sobre champagne si no llega a 4.5). Ningún texto normal sobre magenta.
5. El panel admin abre a ≥1280 px, compila y no perdió módulos.
6. `tsc -b`, `npm run build` y lint (dinero/plurales) pasan.
7. Navegación del wordmark y age gate intactos.

#### Entrega
- Commit sugerido: `feat: tokens y tipografias del descenso`.
- Un commit propio. No mezcles con 10-02 ni con 08-05.
- Marca [id: 20261110-01] `respondida` con SHA, diff y capturas del wordmark.

#### Siguiente paso para Claude Code
1. `git pull` (HEAD al asignar estas rondas: se anuncia en `bridge-query.md`).
2. Implementa **esta** ronda primero.
3. Luego [id: 20261110-02], [id: 20261110-03] y [id: 20261110-04], cada una en su commit, en ese orden.
4. Deja el resultado en `bridge-query.md`.

### Respuesta a [id: 20261109-05] — Videos de hasta 2 GB
- **fecha:** 2026-11-09 17:30 (America/Mexico_City)
- **decisión de Sergio:** el tamaño máximo de video pasa a **2 GB** (2048 MiB). Antes dijo 1 GB; luego pidió 2 GB.

#### Diagnóstico (no lo reescribas: úsalo)
1. Bucket `clips`: `file_size_limit = 2000 * 1024 * 1024` (2000 MiB) en `20260823000000_clips.sql:117`. **Ninguna migración posterior lo cambia.** 2000 MiB ≠ 2048 MiB: un archivo de exactamente 2 GiB lo rechazaría el bucket.
2. Copy: `Upload.tsx:295` y `PublicarPor.tsx:239` ya dicen «hasta 2 GB»; **no hay** `if (file.size > …)` en el cliente. `AltaCreadora` ni menciona tope.
3. Tope global del proyecto (Storage Settings en el dashboard) **no está en el repo**. Free ≤ 50 MB/archivo; Pro permite subir el global hasta 500 GB. El bucket no puede superar el global. Si el global sigue en 50 MB, **ningún cambio de código basta**.
4. Ajuste `limite_almacenamiento_mb` (default 1024) solo avisa del **cupo total** del plan en el panel (`20261003000000_uso_almacenamiento.sql`); no es el límite por archivo.
5. La transferencia de video grande la implementa [id: 20261109-04] con **TUS**. Esta ronda solo sube el techo y valida en cliente.

#### Qué hacer

**1. Migración** (solo con aprobación de Omar), p. ej. `supabase/migrations/20261222000000_clips_2gb.sql`:
```sql
update storage.buckets
   set file_size_limit = 2048 * 1024 * 1024
 where id = 'clips';
```
Idempotente. No toques otros buckets.

**2. Frontend — una sola constante** (p. ej. en `src/lib/clips.ts` o `src/lib/video.ts`):
- `export const MAX_VIDEO_BYTES = 2048 * 1024 * 1024` // 2 GiB
- Antes de subir, en **todos** estos sitios, rechaza si `archivo.size > MAX_VIDEO_BYTES` con mensaje amable, p. ej. `Este video pesa X GB; el máximo es 2 GB.` (formatea X con 1 decimal; si es < 1 GB, di MB):
  - `src/screens/Upload.tsx`
  - `src/admin/PublicarPor.tsx`
  - `src/screens/AltaCreadora.tsx`
  - `src/admin/SubidaMasiva.tsx` y/o dentro de `publicarPara` (`src/lib/admin.ts`) para no olvidar ningún camino
- Copy unificada **«hasta 2 GB»** (o «MP4, MOV o WebM · hasta 2 GB») también en AltaCreadora.
- No inventes un tope distinto en cada pantalla.

**3. Para Omar en el dashboard de Supabase** (tú no lo haces; déjalo escrito en el resultado):
- [ ] Confirmar plan **Pro** (o superior). En Free el global no puede pasar de 50 MB.
- [ ] Storage → Settings: **Global file size limit ≥ 2 GB** (2048 MiB o más).
- [ ] Revisar cupo total de almacenamiento del plan vs uso actual; si el aviso del panel usa `limite_almacenamiento_mb = 1024`, actualizarlo al cupo real (p. ej. 102400 en Pro de 100 GB) para que la alarma no mienta.
- [ ] Aplicar la migración de esta ronda (`supabase db push`) con su aprobación, **después** de subir el global (si el global < bucket, el update del bucket puede fallar o quedar inútil).

#### No tocar
- Límites de `albumes`, `avatars`, `clip-covers`, `clip-covers-full`, `verificacion`, `expedientes`.
- Funciones de reproducción (`ver-clip`), precios, moderación, RLS, dominio, correo.
- No reabras 09-03 ni 08-05. La barra/TUS es [id: 20261109-04] (implementa 04 antes o en commit previo).

#### Criterios de aceptación
1. Migración aplicada: `file_size_limit` de `clips` = 2048 MiB.
2. Archivo de **~1,9 GB** se acepta en cliente y, con 09-04, sube con progreso y **reanuda** tras cortar red (prueba conjunta o simulada).
3. Archivo de **~2,1 GB** se **rechaza en el cliente** antes de transferir, con el mensaje de máximo 2 GB.
4. Copy «hasta 2 GB» alineada en creadora y admin (incl. AltaCreadora).
5. En el resultado: checklist de Omar del dashboard marcado como pendiente o hecho.
6. `npm run build` / typecheck pasan.

#### Entrega
- Commit sugerido: `feat: videos de hasta 2 gb`.
- Migración solo con Omar. Frontend después (o junto si el global ya está).
- Marca [id: 20261109-05] `respondida` con SHA y verificación.

#### Siguiente paso para Claude Code
1. `git pull`. Preferible: terminar [id: 20261109-04] (TUS) y luego esta, cada una en su commit.
2. Coordina con Omar el global ≥ 2 GB y el `db push`.
3. Deja el resultado en `bridge-query.md`.

### Respuesta a [id: 20261109-04] — Barra de progreso al subir videos
- **fecha:** 2026-11-09 17:20 (America/Mexico_City)
- **decisión de Sergio:** mientras se sube un video debe verse una barra de progreso real; si no, parece que la página se trabó.
- **enmienda:** 2026-11-09 17:30 — videos van por TUS resumible (ver «Enmienda 17:30»); XHR solo para archivos chicos. Motivo: tope de producto a 2 GB ([id: 20261109-05]).

#### Diagnóstico (no lo reescribas: úsalo)
1. **Formulario de la creadora** (`src/screens/Upload.tsx`): llama `subirArchivo('clips', …)` → `supabase.storage.from(bucket).upload(...)` en `src/lib/clips.ts:241-250`. El cliente de Supabase **no** expone progreso de bytes. La UI solo cambia el texto del botón (`paso`: «Subiendo el video…», «Subiendo la portada…», «Publicando…») y deshabilita el envío con `estado === 'subiendo'`. No hay barra, no hay %, no hay MB, no hay Cancelar, no hay `beforeunload`.
2. **Admin ya resolvió el mismo problema** en `publicarPara` (`src/lib/admin.ts:196-247`): `createSignedUploadUrl` + `XMLHttpRequest` + `x.upload.onprogress`. Motivo documentado en el propio archivo: (a) el permiso se valida al pedir la URL, no al terminar; (b) XHR sí emite progreso. Lo usan `AltaCreadora.tsx`, `PublicarPor.tsx` y `SubidaMasiva.tsx`, pero solo como **texto** (`· 42%`), no como barra visual. En lote, una sola línea de avance y estados por fila (`espera`/`subiendo`/`listo`/`fallo`).
3. **Álbumes** (`src/lib/albumes.ts` + `UploadAlbum.tsx`): también pasan por `subirArchivo` (sin progreso de bytes). Hay `alAvanzar({ paso, hechas, total })` — texto «N de M», no barra.
4. **Portadas / avatar / verificación / cambiar portada en Gestionar:** `subirPortada` / `subirAvatar` / `verificacion` / `expedientes` usan `.upload()` directo. Archivos chicos (límites 2–10 MB); el dolor real es el **video**.
5. **Límites de bucket (migraciones, no el `config.toml` local):**
   - `clips`: **2000 MiB**, mime `video/mp4|quicktime|webm` (`20260823000000_clips.sql`).
   - `clip-covers` / `clip-covers-full`: 5 MiB.
   - `albumes`: 10 MiB por foto; entrada local ≤ 30 MB (`MAX_BYTES_ENTRADA`).
   - `avatars`: 2 MiB. `verificacion` / `expedientes`: ver sus migraciones.
   - `supabase/config.toml` `file_size_limit = "50MiB"` es solo el tope **global local** de la CLI; en producción mandan los límites por bucket.
6. **No hay `tus-js-client`** en `package.json`. `@supabase/supabase-js` ^2.112.3; `.upload()` no tiene callback de progreso. El endpoint resumible de Storage (`/storage/v1/upload/resumable`) existiría en el proyecto, pero **no se usa**.
7. Errores hoy: se pinta el mensaje y se queda el formulario; los archivos ya subidos en un fallo a mitad (video ok, portada o `crearClip` falla) **no se limpian** en el camino de la creadora (el admin sí llama `limpiar()` en `publicarPara`). Abandonar la pestaña a mitad no avisa.

#### Enmienda 17:30 (America/Mexico_City) — subida reanudable (TUS)
Sergio decidió videos de hasta **2 GB** ([id: 20261109-05]). Una sola petición XHR (o `storage.upload`) a ese tamaño es frágil: un corte de red, cambio de Wi‑Fi o un proxy/CDN que cierre la conexión obliga a **reiniciar desde cero** y parece que «la página se trabó» justo cuando más se necesita confianza. Supabase recomienda TUS para archivos > ~6 MB. Por eso esta ronda **deja de pedir XHR para video** y exige `tus-js-client` contra el endpoint resumible. El diagnóstico de arriba sigue válido; cambia solo el mecanismo de transferencia del **video**.

#### Enfoque elegido (justificación)
**Videos: TUS resumible (`tus-js-client` → `/storage/v1/upload/resumable`). Archivos chicos (portadas, fotos de álbum, avatar, verificación, expedientes): XHR con URL firmada o `.upload()` como hoy — no hace falta TUS.**

- Mismos buckets/rutas/`upsert`/RLS; metadata TUS: `bucketName`, `objectName`, `contentType` (y `cacheControl` si el repo ya lo usa en algún sitio).
- `chunkSize` **exactamente 6 MiB** (`6 * 1024 * 1024`) — requisito actual de Supabase; no lo cambies.
- Auth: `Authorization: Bearer ${session.access_token}` del usuario (creadora o admin). Preferir el hostname de storage documentado por Supabase (`https://<ref>.storage.supabase.co/storage/v1/upload/resumable`) si mejora el rendimiento; si no, el del proyecto que ya use el cliente.
- Reanudar tras corte de red o recarga: fingerprint de `tus-js-client` + `localStorage` (`removeFingerprintOnSuccess: true` al completar para poder volver a subir el mismo archivo otro día).
- Cancelar: aborta el upload TUS y **elimina el objeto parcial** en Storage (si quedó algo); deja el formulario usable.
- Reintentar: **reanuda** desde el fingerprint si sigue válido; si expiró la URL TUS (~24 h) o no hay huella, empieza de nuevo y dilo claro.
- Añade la dependencia `tus-js-client` (y tipos si hacen falta). No inventes un wrapper en edge functions.
- El XHR de `publicarPara` (`admin.ts`) **se sustituye para el video** por el helper TUS; no dejes dos caminos de video.

#### Qué hacer

**1. Helper de video** (p. ej. `src/lib/subidaVideo.ts` o `src/lib/subida.ts`):
- `subirVideoResumible({ bucket, ruta, archivo, contentType?, signal?, alProgreso })` con TUS como arriba.
- `alProgreso({ loaded, total, fraction })` desde `onProgress` de TUS.
- Errores en español (red, rechazo, cancelado, sesión caducada).
- Usarlo en: `Upload.tsx` (creadora), y en admin `publicarPara` → `PublicarPor`, `AltaCreadora`, `SubidaMasiva` (todos los videos al bucket `clips`).
- Portadas / fotos: pueden seguir con XHR firmado (extrae el de `admin.ts` a un helper chico) o `.upload()`; **no** migres portadas a TUS en esta ronda.
- Limpieza: si el video quedó subido y falla portada/`crearClip`, borra el objeto (como `limpiar` del admin). Hoy la creadora no lo hace.

**2. Componente de UI** (p. ej. `BarraSubida`) — igual que antes, con estos matices:
- Barra **real** de % (no spinner), Miami Neon; texto `42% · 85 MB de 200 MB`.
- Tiempo estimado restante tras ~2 s de historial de velocidad (si no hay dato, no inventes «∞»).
- Etapas: `Subiendo video` → `Preparando portada` → `Subiendo portada` → `Guardando datos` → `Listo`.
- **Cancelar** (abort TUS + quitar parcial); `beforeunload` solo en curso; Publicar deshabilitado; error + **Reintentar** (que **reanude** si puede).
- Accesible: `role="progressbar"`, `aria-valuemin/max/now`, `aria-label` con etapa.
- Móvil: 100% del ancho del formulario; Cancelar ≥44 px.

**3. Dónde montarla (prioridad)**
1. **Obligatorio:** `Upload.tsx`.
2. **Obligatorio:** `AltaCreadora`, `PublicarPor`, `SubidaMasiva` (barra por archivo + barra global del lote).
3. **Deseable:** `UploadAlbum.tsx` (barra global; fotos pueden seguir sin TUS).
4. **Fuera:** avatar, verificación, expedientes, regenerar portadas, GestionarClip portada.

**4. Estilo y copy**
- Miami Neon; `FUENTE.ui` / `FUENTE.mono` para el %.
- No inventes textos legales. El tope de 2 GB y `MAX_VIDEO_BYTES` son de [id: 20261109-05]; esta ronda no cambia el límite del bucket (puedes leer el tamaño solo para la barra).

#### No tocar
- Precios, moderación, `achicar` / portada discreta, límites de bucket (eso es 09-05), RLS.
- `comprar_clip`, ledger, dominio, correo, hero, legales.
- No reabras [id: 20261109-03] ni [id: 20261108-05].
- No dejes el video por XHR «por si acaso»: el camino de video es TUS.

#### Criterios de aceptación
1. Creadora: al publicar se ve barra con % y «MB de MB», etapa, sin doble clic.
2. Throttling (Fast 3G) con video ≥ 30 MB: el % avanza por chunks; no solo texto «Subiendo…».
3. Cortar la red a mitad y recuperar: **Reintentar reanuda** (no desde 0% si el fingerprint sigue).
4. Cancelar aborta, limpia el parcial y deja reintentar.
5. Recargar a mitad: `beforeunload` avisa; al volver, si hay fingerprint, Reintentar reanuda.
6. Admin (PublicarPor / lote): misma barra; lote = por archivo + global.
7. Portadas/fotos chicas no requieren TUS.
8. `npm run build` / typecheck pasan. Sin secretos nuevos. Sin migración de bucket (la de 2 GB es 09-05).

#### Entrega
- Commit sugerido: `feat: barra de progreso al subir videos`.
- Marca [id: 20261109-04] `respondida` con SHA, diff y prueba de reanudación.
- Puedes implementar 09-04 antes que 09-05; si 09-05 ya está aplicada, prueba también con archivos grandes.

#### Siguiente paso para Claude Code
1. `git pull` e implementa esta ronda en su propio commit (TUS, no XHR de video).
2. No mezcles con 09-03, 09-05 ni el dominio .mx (09-05 puede ir en el commit siguiente).
3. Deja el resultado en `bridge-query.md`.

### Respuesta a [id: 20261109-03] — Blindar borrado y moderar ediciones de clips
- **fecha:** 2026-11-09 17:15 (America/Mexico_City)
- **decisión de Sergio:** aprobó la ronda. Cierra las dos decisiones abiertas de [id: 20261109-02]: (a) el servidor no debe soft-borrar un clip con historial cuando lo borra la dueña; (b) editar título/descripción/portada de un clip ya aprobado pasa por la misma regla de confianza que el alta, o vuelve a moderación.

#### Diagnóstico (no lo reescribas: úsalo)
1. `clips_no_borrar_con_historial` (`20261120`, reescrito en `20261220`) convierte un `DELETE` con historial (compras, rentas, reportes, reembolsos_retiro vía `clip_tiene_historial`) en borrado lógico (`borrado_at`, purga +30 días) y cancela el DELETE. No distingue dueña vs administración.
2. `tiene_acceso` (`20260929`) exige `borrado_at is null` **también para quien compró**. Ese soft-delete le quita el acceso al instante y contradice «para siempre». La UI de Gestionar ya oculta «Eliminar» con historial, pero `clips_delete_propio` sigue permitiendo el `DELETE` directo desde el cliente.
3. El soft-delete **no** pone `published = false`. `explorar_ids` y `clipsPublicados` filtran por `published` y caducidad, **no** por `borrado_at`, así un clip soft-borrado puede seguir saliendo en el catálogo.
4. `editar_mi_clip` / `cambiar_mi_portada` (`20261220`) no tocan `estado` ni `published`. Un cambio de título, descripción o portada en un clip `aprobado` sale directo al catálogo. Precio/renta/visibilidad ya se acordó que afectan solo compras nuevas.
5. Regla de auto-aprobación al **insert** (`clips_publicar_alta` en `20260912000001_moderacion_reglas.sql`): si `moderacion_previa_forzada` → `pendiente`; si no, `aprobado` solo con `identidad_verificada` y ≥5 clips ya `aprobado` de esa creadora. El trigger corre en INSERT y UPDATE y siempre hace `published := (estado = 'aprobado')` (y limpia `published_at` si no está publicado).
6. `admin_avisos()` (`20261218`) arma la lista al pedirla desde colas reales (entre ellas clips `estado = 'pendiente'` → tipo `moderacion`). No hay tabla de eventos genérica; lo único persistente es `avisos_estado_admin.visto_at` por admin.

#### Qué hacer

**Migración nueva** `supabase/migrations/20261221000000_blindar_borrado_y_moderar_ediciones.sql` (si el nombre está tomado, el siguiente libre). Todo con el estilo del repo: `security definer` donde toque, `set search_path = ''`, grants/revokes explícitos. **Se aplica solo con la aprobación de Omar.**

**A) Blindar el borrado con historial**
1. Reescribe `clips_no_borrar_con_historial` (o añade lógica equivalente en el mismo disparador BEFORE DELETE):
   - Si `clip_tiene_historial(old.id)` **y** `not public.es_admin()` → `raise exception` en español claro, p. ej. `Este clip ya tiene compras: usa «Dejar de venderlo ya» o el retiro total.` (errcode coherente con el resto). **No** soft-borres. La fila queda intacta.
   - Si hay historial **y** `public.es_admin()` → soft-delete como hoy **y además** `published = false` (y lo que ya hacía: `borrado_at`, motivo, purga +30d, quitar destacado). El trigger `clips_publicar_alta` sincroniza `published` con `estado`; si solo tocas `published`/`borrado_at` sin bajar `estado`, asegúrate de que el soft-delete admin deje el clip fuera del catálogo (p. ej. `published = false` y, si hace falta para no pelearse con el trigger, `estado = 'retirado'` **solo** en este camino admin — documenta lo que elijas; no inventes un estado nuevo).
   - Sin historial → `return old` (DELETE duro), igual que hoy.
2. Catálogo: `explorar_ids` y la lectura de `clipsPublicados` (y cualquier otra lista pública del catálogo que toques en esta ronda) deben excluir `borrado_at is not null`. Preferible filtrar en SQL (`explorar_ids`) y, si `clipsPublicados` sigue en el cliente, añadir `.is('borrado_at', null)` o el equivalente que ya use el repo. Verifica que quien compró sigue con `tiene_acceso` en un clip **no** borrado (p. ej. solo «dejó de venderse»); no cambies la semántica de compras/rentas.
3. Frontend: en `eliminarMiClip` / `GestionarClip`, mapea el error nuevo a texto amigable dentro del panel (no detrás de un modal). La UI con historial sigue sin ofrecer «Eliminar».

**B) Moderar ediciones de título / descripción / portada**
1. Extrae la regla de confianza del insert a un helper reutilizable (p. ej. `creadora_autoaprueba(uid uuid) returns boolean`) con **la misma** lógica que `clips_publicar_alta` en INSERT: `not ajuste_bool('moderacion_previa_forzada')` y `identidad_verificada` y `count(estado = 'aprobado') >= 5`. Haz que el INSERT la llame (no dupliques la regla en dos sitios).
2. En `editar_mi_clip` y `cambiar_mi_portada`, **solo** cuando cambian de verdad título, descripción o portada (`is distinct from`) **y** el clip tiene `estado = 'aprobado'` al entrar:
   - Si `creadora_autoaprueba(auth.uid())`: el cambio queda en vivo (sigue `aprobado` / `published`); crea **un aviso de administración** por esa edición (clip, creadora, qué cambió). Como `admin_avisos` no tiene tabla de eventos, extiéndelo: una tabla chica (p. ej. `avisos_edicion_clip`) que `admin_avisos()` una con tipo propio (p. ej. `edicion`), `urgente = false`, ruta a `/admin/moderacion` o `/admin/contenido`, y `nuevo` según el `visto_at` de esa admin. No rehagas el panel ni la campana.
   - Si no autoaprueba: `estado = 'pendiente'` (el trigger pondrá `published = false`). Entra solo a la cola de moderación que ya alimenta `admin_avisos` (tipo `moderacion`). Si puedes, distingue en el título del aviso «Edición por moderar» vs «Video nuevo…» cuando el clip ya tuvo aprobación antes (`revisado_at is not null` o equivalente); no es bloqueante.
3. Precio, renta y visibilidad **siguen en vivo** sin tocar `estado` ni generar aviso de edición (aunque vayan en el mismo `editar_mi_clip`). Si en la misma llamada cambian precio **y** título: el título dispara la regla de contenido; el precio se aplica igual.
4. Edición sin cambios reales (no-op): no registres, no avises, no cambies estado (como hoy con `cambios: 0`).
5. La respuesta JSON de las RPC debe permitir que la UI diga, cuando quedó en revisión: `Tu cambio quedó en revisión; el clip vuelve a mostrarse cuando lo aprueben.` (campo claro, p. ej. `en_revision: true`, o un mensaje estable). En Gestionar, muéstralo dentro del panel.
6. Compradores: mientras el clip esté `pendiente` tras una edición, **deben conservar el acceso**. `tiene_acceso` hoy no exige `published` para quien compró (solo `borrado_at is null` y no retiro total). Verifícalo con una prueba SQL; si algo lo rompe, arréglalo sin tocar `comprar_clip` / `rentar_clip` / el ledger. Quien no compró no lo ve en el catálogo (`published = false`).
7. Sigue registrando `admin_log` (`editar_clip` / `cambiar_portada`) con antes/después.

**C) Recordatorio de [id: 20261108-05] (no lo implementes aquí)**
- El commit local que mueve el correo a `.mx` **no se publica**. Remitente y buzones se quedan en `@rawstudio.biz`; el marcador `@alta.rawstudio.biz` no se toca.
- El commit del `CNAME` a `rawstudio.mx` solo en el corte de DNS con Omar. Esta ronda **no** cambia dominio ni correo.

#### No tocar
- `comprar_clip`, `rentar_clip`, comisiones, ledger.
- Permisos de `update` sobre `clips` al cliente (siguen revocados).
- Layout del panel de administración, Resumen, badges (solo extender `admin_avisos` para el aviso de edición en vivo).
- Textos legales, recargas, token/secretos, DeepSeek, hero 80%/dólar, reproductor, trato, avatares, precios de catálogo, [id: 20261108-05], [id: 20261109-01], [id: 20261109-02] (no las reabras; esta ronda las cierra en las dos decisiones).
- No inventes textos de reembolso nuevos.

#### Criterios de aceptación
1. Dueña, `DELETE` directo sobre un clip **con** compra → error en español, fila intacta (`borrado_at` null), comprador con `tiene_acceso = true`.
2. Dueña, `DELETE` sobre clip **sin** historial → se borra.
3. Admin, `DELETE` sobre clip con historial → soft-delete + fuera del catálogo (`published = false` / no sale en `explorar_ids` ni en `clipsPublicados`).
4. Creadora **sin** autoaprobar: cambia título o portada de un `aprobado` → `estado = 'pendiente'`, `published = false`, mensaje de revisión en la UI; comprador sigue con acceso; aparece en cola/avisos de moderación.
5. Creadora **con** autoaprobar (verificada, ≥5 aprobados, bandera apagada): el mismo cambio queda en vivo y genera un aviso admin de edición; `admin_log` registra.
6. Solo precio/renta/visibilidad: en vivo, sin cambiar `estado`, sin aviso de edición.
7. No-op: sin log de cambio, sin aviso, sin estado nuevo.
8. `npm run build` / typecheck pasan.

#### Entrega
- Commit sugerido: `feat: blindar borrado y moderar ediciones de clips` (uno solo; no mezclar con 08-05).
- Migración con `supabase db push` **solo con la aprobación de Omar**; frontend después de aplicarla.
- Marca [id: 20261109-03] `respondida` con SHA, diff y verificación SQL de los criterios 1–7.

#### Siguiente paso para Claude Code
1. `git pull` e implementa esta ronda en su propio commit.
2. No empujes CNAME ni ningún cambio de correo a `.mx`.
3. Deja el resultado en `bridge-query.md`.

### Respuesta a [id: 20261109-02] — Gestionar mis clips desde el Estudio
- **fecha:** 2026-11-09 13:45 (America/Mexico_City)
- **decisión de Sergio:** las creadoras deben poder gestionar su material ya subido desde el Estudio (venta/renta, portada, eliminar, etc.), con una pantalla clara.

#### Diagnóstico
- `src/components/MisClips.tsx` (dentro de Estudio) lista hasta 30 clips con estado, motivo de rechazo y «Ponerle fecha de retiro» (`fijar_caducidad`). No hay portada, precio, renta, edición ni eliminar.
- `20261115000000_escrituras_de_clips_y_saldo.sql` revocó `update` sobre `clips` a `authenticated`: la creadora **no puede** editar por la API. Cualquier edición tiene que ir por funciones `security definer` que validen dueña y columnas. No devuelvas `update` por columnas al cliente.
- `borrarClip()` (`src/lib/clips.ts`) hace `delete`. El disparador `clips_no_borrar_con_historial` (20261120) convierte ese borrado en borrado lógico con `purgar_despues_de = now() + 30 días` cuando hay compras, rentas, reportes o reembolsos. Verifica qué pasa con el acceso de quien ya compró en ese caso (`tiene_acceso` / `clip_vigente` / la purga). La ficha y la FAQ prometen «para siempre», así que la creadora no debe poder quitarle el clip a quien pagó sin pasar por el flujo que ya existe de «Quitárselo también a quien lo compró» (retiro total con reembolso).
- La renta hoy es un **añadido** a la venta (`Upload.tsx`: «También en renta», 48 o 72 h, `renta_coins`). No existe «solo renta». «Cambiar de venta a renta» se resuelve como activar/quitar la renta y fijar sus horas y precio; no inventes un modo solo-renta ni cambies `comprar_clip` / `rentar_clip`.
- Precios de video: `src/lib/precios.ts` (`PRECIOS_VIDEO` 10/20/40, `PRECIO_INICIAL` 20). Álbumes tienen precio fijo de la plataforma (`configAlbumes().precio`).
- Portadas: rutas iguales en `clip-covers` (pública 240 px, `achicar()`) y `clip-covers-full` (privada ≤720). `Upload.tsx` ya sabe elegir cuadro (`portadaDiscretaDeVideo` / `elegirCuadro`) o subir imagen, y escribir las dos copias en el orden correcto (primero la privada). Reutiliza eso; no dupliques la lógica.
- Bitácora: `admin_log` (como `registra_subida_clip` y `fijar_caducidad`).

#### Qué hacer

**1. Migración nueva** (siguiente nombre libre después de las de 20261109-01; p. ej. `20261220000000_gestionar_mis_clips.sql`). Todas `security definer`, `set search_path = ''`, `grant execute ... to authenticated`, `revoke ... from public, anon`. En todas: el clip existe, `creator_id = auth.uid()`, `public.cuenta_activa(auth.uid())`, `borrado_at is null`; si no, error en español claro.
- `editar_mi_clip(p_clip uuid, p_titulo text, p_descripcion text, p_visibilidad text, p_precio int, p_renta_horas int, p_renta_coins int)`:
  - Título 1–90 y descripción ≤600 (las mismas reglas de la tabla); descripción vacía → `null`.
  - Visibilidad solo entre las que ofrece `Upload` para video (`pago`, `suscriptores`, `gratis`). `gratis` fuerza precio 0 y sin renta.
  - Precio: para `pago`, uno de 1000/2000/4000 **o** el precio que el clip ya tiene (para no obligar a cambiar un precio puesto a mano). No inventes rangos libres nuevos.
  - Renta: `p_renta_horas` en (48, 72) con `p_renta_coins > 0` y menor que el precio de venta, o las dos `null` para quitarla. Solo con `pago`.
  - Álbumes (`formato = 'album'`): solo título y descripción; precio, visibilidad y renta se rechazan con mensaje claro.
  - No toques `estado`, moderación, `published`, destacados ni caducidad.
  - Registra en `admin_log` (`accion = 'editar_clip'`, antes/después de los campos cambiados).
  - Cambiar precio o quitar renta **no** afecta compras ni rentas ya hechas: dilo en la interfaz.
- `cambiar_mi_portada(p_clip uuid, p_cover_path text)`: la ruta debe estar en la carpeta de la creadora (ya lo vigila `clips_archivos_en_su_carpeta`) y existir en `clip-covers` y `clip-covers-full` (comprueba en `storage.objects`). Actualiza `cover_path` y registra `cambiar_portada` en `admin_log`. Las portadas viejas no se borran en esta ronda.
- `dejar_de_vender_mi_clip(p_clip uuid)`: equivale a retirarlo del catálogo **ya** con `caduca_modo = 'deja_de_venderse'` (`caduca_at = now()`), sin quitarle acceso a quien compró. Si `fijar_caducidad` exige fecha futura, esta función es la vía para «ahora». Registra en `admin_log`. Comprueba con `clip_vigente` / `tiene_acceso` que quien compró conserva el acceso y que nadie más puede comprar ni rentar.
- `mi_clip_tiene_historial(p_clip uuid) returns boolean` (o un campo calculado en la lista) con el mismo criterio que `clips_no_borrar_con_historial`.

**2. `src/lib/`** (`clips.ts` o un archivo nuevo `misclips.ts`): envolturas tipadas de esas funciones con el patrón de errores existente; un fallo nunca se pinta como éxito.

**3. Pantalla: rehacer `MisClips.tsx`** como «Tus clips» gestionable (sigue dentro de Estudio):
- Lista de **todos** sus clips (con «Ver más» de 30 en 30), cada uno con portada pequeña, título, estado, tipo (video/álbum), precio y renta si tiene. Mantén el estado y el motivo de rechazo actuales.
- Al tocar un clip se abre un panel «Gestionar» con secciones:
  - **Datos:** título y descripción.
  - **Precio y renta:** los tres botones 10/20/40 (más el precio actual si es otro), gratis/pago/suscriptores, interruptor «También en renta» con 48/72 h y precio, igual que en `Upload`. Aviso: «Los cambios aplican a compras nuevas. Quien ya compró o rentó conserva lo que pagó».
  - **Portada:** vista de la actual; «Elegir otro cuadro del video» (reusar la extracción de `Upload`; para eso firma la URL del propio video como hace la administración con `urlVideoFirmada` o el equivalente para la dueña) y «Subir una imagen». Escribe las dos copias y luego llama `cambiar_mi_portada`.
  - **Fecha de retiro:** la de hoy, sin cambios de comportamiento.
  - **Quitar:**
    - Sin historial: «Eliminar» con confirmación («Se borra para siempre. No se puede deshacer»), usando `borrarClip`.
    - Con historial: no ofrezcas «Eliminar». Ofrece «Dejar de venderlo ya» (`dejar_de_vender_mi_clip`), explicando: «Desaparece del catálogo y nadie más puede comprarlo. Quien ya lo compró lo conserva». Para quitárselo también a quien compró, remite al flujo existente de retiro total (fecha de retiro + «Quitárselo también a quien lo compró»), sin texto nuevo sobre reembolsos más allá del que ya existe.
- Errores: visibles dentro del panel (no detrás de un modal; recuerda lo de 08-03). Tras guardar, confirmación corta y la lista se actualiza.
- Mismo estilo Miami Neon del Estudio; funciona en teléfono (el Estudio no es el panel de administración, ahí sí aplica responsive).

#### No tocar
- `comprar_clip`, `rentar_clip`, comisiones, ledger, moderación, destacados.
- No devuelvas permisos de `update` sobre `clips` al cliente.
- No inventes textos legales ni políticas de reembolso nuevas.
- Archivos de [id: 20261108-05] y [id: 20261109-01].

#### Criterios de aceptación
1. Una creadora edita título, descripción, precio y renta de un video suyo y se ve en su ficha pública; no puede hacerlo sobre un clip de otra (error claro).
2. Precio fuera de 10/20/40 (y distinto del actual) se rechaza; álbum rechaza precio/visibilidad/renta.
3. Cambiar la portada actualiza la pública (240) y la privada (≤720).
4. Clip sin historial: «Eliminar» lo borra. Clip con compras: no aparece «Eliminar»; «Dejar de venderlo ya» lo saca del catálogo y quien compró lo sigue viendo.
5. Cada cambio queda en `admin_log` (Bitácora).
6. `npm run build` pasa.

#### Entrega
- Commit sugerido: `feat: gestionar mis clips desde el estudio`.
- Migración con `supabase db push` **solo con la aprobación de Omar**; publica el frontend después de aplicarla.
- Marca la consulta `respondida` con el commit; anota cualquier diferencia que encuentres con este diagnóstico (en especial qué pasa hoy con el acceso de compradores en un borrado lógico).

### Respuesta a [id: 20261109-01] — Explorar en orden aleatorio y catálogo completo
- **fecha:** 2026-11-09 13:32 (America/Mexico_City)
- **decisión de Sergio:** cada vez que alguien entra a Explorar, el catálogo sale en otro orden, para que no parezca que no hay nada nuevo. Los destacados se quedan arriba, en el orden que les pone la administración.

#### Diagnóstico
- `src/screens/Explorar.tsx` (~línea 42) pide `clipsPublicados(60)`.
- `src/lib/clips.ts` `clipsPublicados()` ordena `destacado_orden asc nulls last`, luego `published_at desc`, `limit`. Resultado: siempre los mismos 60, en el mismo orden; ~130 clips nunca se ven en Explorar.
- Los filtros «gratis» / «pago» filtran en el navegador (`visibles`) sobre esos 60, así que tampoco llegan al resto.
- `clipsPublicados` también lo usa `ClipDetail.tsx:72` (`clipsPublicados(1)` cuando no hay id). **No lo cambies**; crea una lectura nueva para Explorar.

#### Qué hacer

**1. Migración nueva** `supabase/migrations/20261219000000_explorar_aleatorio.sql` (si ese nombre ya existe por otra ronda, usa el siguiente libre):
- Función `public.explorar_ids(p_semilla text, p_filtro text default 'todo', p_desde int default 0, p_cuantos int default 30) returns table (id uuid)`.
- `language sql stable`, **`security invoker`** (no definer: que apliquen la RLS `clips_select_publicados` —que ya saca a creadoras baneadas— y los permisos por columna de `20261104000000_clips_por_columna.sql`), `set search_path = public`.
- Filtro: `published` y la misma regla de caducidad que `clipsPublicados` (`caduca_at is null or caduca_at > now()`). `p_filtro`: `'gratis'` → `visibility = 'gratis'`; `'pago'` → `visibility = 'pago'`; cualquier otro valor → sin filtro. Es exactamente lo que hace hoy `visibles` en el navegador; no cambies su significado.
- Orden: `destacado_orden asc nulls last`, luego `md5(coalesce(p_semilla, '') || id::text)`, luego `id` (desempate). Así el orden es estable para una misma semilla (la paginación no repite ni salta clips) y distinto con otra semilla.
- Límites: `p_desde` menor que 0 cuenta como 0; `p_cuantos` acotado entre 1 y 60.
- `grant execute ... to anon, authenticated`. Comprueba que las columnas que toca (`id, published, caduca_at, destacado_orden, visibility`) tienen `grant select` para `anon` en las concesiones por columna; si alguna falta, dilo en la respuesta en vez de abrir permisos de más.
- Sin `order by random()`: la semilla es lo que da estabilidad entre páginas.

**2. `src/lib/clips.ts`**: función nueva `clipsExplorar(semilla, filtro, desde, cuantos = 30): Promise<Lectura<ClipConAutora[]>>`:
- Llama `explorar_ids`; con esos ids hace `.from('clips').select(CON_AUTORA).in('id', ids)` y **reordena en el orden de los ids** (el `in` no conserva orden).
- Lista vacía de ids → `leido([])` sin segunda consulta.
- Errores con el patrón existente `noSePudo(...)`: un fallo nunca se presenta como «no hay clips».

**3. Semilla** (en `src/lib/clips.ts` o un archivo chico propio):
- Se guarda en `sessionStorage` con clave `rawstudio.explorar_semilla` junto con la hora de último uso.
- Se crea nueva (`crypto.randomUUID()`) si no existe o si pasaron más de 30 minutos desde el último uso. Cada uso refresca la hora.
- Efecto buscado: al abrir el sitio o volver a Explorar después de un rato, otro orden; al abrir un clip y regresar con «atrás», **el mismo orden** (no reacomodar lo que la persona estaba viendo).
- Si `sessionStorage` falla (modo privado raro), usar una semilla en memoria; no romper la pantalla.

**4. `src/screens/Explorar.tsx`**:
- Reemplaza `clipsPublicados(60)` por `clipsExplorar(semilla, filtro, 0)`. Cambiar de pestaña (todo/gratis/pago) vuelve a pedir desde 0 con la **misma** semilla; el filtro ya viene hecho del servidor, así que `visibles` deja de filtrar (o se elimina).
- Botón «Ver más» al pie de la rejilla mientras la última página haya venido llena (30). Agrega sin duplicar (descarta ids repetidos por si acaso). Mientras carga: «Cargando…» en el botón, deshabilitado.
- Si falla «Ver más», **no borres** lo ya cargado: muestra el aviso en línea con «Reintentar» para esa página.
- Si falla la primera página, el mensaje actual («No pudimos cargar el catálogo. No es que esté vacío…») con «Reintentar».
- Textos vacíos: «Todavía nadie ha publicado nada.» solo con filtro `todo`, sin fallo y primera página vacía; con filtro, «No hay clips con ese filtro.» Igual que hoy.
- No hace falta scroll infinito ni restaurar cuántas páginas llevaba al volver; con la misma semilla basta. No cambies diseño de tarjetas, portadas, insignias ni la pestaña «creadoras».

#### No tocar
- `clipsPublicados` ni `ClipDetail.tsx`; precios; portadas; cómo la administración elige y ordena los destacados; archivos de [id: 20261108-05].
- No registres visitas ni clics para «personalizar»: no se acordó medir comportamiento.

#### Criterios de aceptación
1. Con dos semillas distintas, el orden de los no destacados cambia; con la misma semilla, es idéntico.
2. Recorriendo todas las páginas con una semilla y un filtro: sin repetidos, sin huecos, y el total coincide con `count(*)` de clips visibles para ese filtro.
3. Destacados siempre primero, en su `destacado_orden`.
4. Sin sesión (`anon`) funciona; clips caducados y de cuentas baneadas no salen.
5. Abrir un clip y volver con «atrás» conserva el orden.
6. `npm run build` (typecheck estricto) pasa.

#### Entrega
- Commit sugerido: `feat: explorar en orden aleatorio`.
- La migración se aplica con `supabase db push` **solo con la aprobación de Omar**, como en rondas anteriores; luego `git push origin main`. Sin la migración aplicada, el frontend nuevo fallaría: publica el frontend después de aplicar la migración, no antes.
- Marca la consulta `respondida` con el commit y si ya quedó aplicada.

### Respuesta a [id: 20261108-05] — Dirección pública rawstudio.mx
- **fecha:** 2026-11-08 18:58 (America/Mexico_City)
- **estado:** lista-para-claude
- **responde a:** Sergio preguntó cómo ver el correo del sitio y, ahora que ya tiene rawstudio.mx, si se podía pasar la dirección pública de .biz a .mx. El coordinador recomendó que sí, y Sergio pidió dejarlo escrito.
- **ronda:** 1 de 10 de esta tarea · **tope:** 1 hora
- **checklist afectados (NO marques pass tú):** no rompas ítems `pass` ni el trabajo de `[id: 20261106-04]` a `[id: 20261106-07]`, `[id: 20261107-01]` a `[id: 20261107-07]` ni `[id: 20261108-01]` a `[id: 20261108-04]`. Puedes actualizar la línea «Sitio:» de `CHECKLIST.md` para que apunte a https://rawstudio.mx; no marques nada como `pass`.

#### Orden respecto a rondas anteriores
`[id: 20261108-04]` ya está `respondida` y aplicada en producción (`f96da8d`). **No la reabras** (ni las anteriores). El relleno de portadas discretas lo corre Omar desde Herramientas; no forma parte de esta ronda. Implementa esta ronda en su propio commit.

#### Diagnóstico (no lo reescribas: úsalo)
1. El frontend se publica en GitHub Pages. `public/CNAME` hoy dice `rawstudio.biz`. rawstudio.mx y www.rawstudio.mx ya existen y **redirigen** a rawstudio.biz: es el mismo marketplace, no otro sitio.
2. Decisión de Sergio (8 nov 2026): la dirección pública canónica pasa a ser **https://rawstudio.mx** (el apex, igual que hoy es rawstudio.biz y no www.rawstudio.biz). rawstudio.biz debe quedar como **redirección permanente** hacia https://rawstudio.mx, misma ruta, para no romper enlaces, correos y favoritos. www.rawstudio.mx debe resolver al mismo sitio (lo habitual en GitHub Pages: el apex es el canónico y www redirige a él, o también se sirve).
3. Los correos transaccionales salen por Resend desde `RAWstudio <hola@rawstudio.biz>`. Los avisos al administrador (verificación, retiro, purga) van al correo de cada cuenta admin. Lo que escribe la gente a `hola@`, `legal@` y `privacidad@rawstudio.biz` cae en un solo buzón de Zoho (`admin@rawstudio.biz`); son alias, no tres bandejas. **En esta ronda no se cambian remitente ni buzones:** seguir con `@rawstudio.biz` evita que el correo rebote antes de verificar .mx en Resend y Zoho. Eso queda para después, no lo hagas ahora.
4. Hay un marcador interno `handle@alta.rawstudio.biz` para cuentas dadas de alta por administración (correo inventado). Aparece en migraciones (`20260907000000_alta_creadora.sql`, `20261101000000_contacto.sql`, `20261101000001_alta_sin_duplicado.sql`) y en comentarios de `src/lib/admin.ts` y `src/admin/Usuarios.tsx`. **No lo cambies:** es una señal de «correo inventado», no una dirección pública. Si lo mueves a `.mx`, dejas de detectar las cuentas que ya existen.
5. URLs de **sitio** escritas a mano como `https://rawstudio.biz` (estas sí se actualizan):
   - `index.html`: `og:url`, `og:image`, `twitter:image`.
   - `supabase/functions/avisar-verificacion/index.ts` (`PANEL`), `avisar-retiro/index.ts` (`PANEL`), `avisar-purga/index.ts` (`PANEL`), `avisar-verificada/index.ts` (`ESTUDIO`, `VERIFICAR`), `avisar-creadora/index.ts` (`RETIROS`), `avisar-bienvenida/index.ts` (`EXPLORAR`, `ESTUDIO`), `avisar-compra/index.ts` (`BIBLIOTECA`, `DINERO`).
   - `supabase/functions/enviar-campana/index.ts`: el `href` a `/#/perfil`. El `from` por defecto `RAWstudio <hola@rawstudio.biz>` **se queda**.
   - `supabase/functions/telegram-bot/index.ts`: textos que dicen «rawstudio.biz» o llevan `https://rawstudio.biz/#/…` (inicio, vinculación, reglas de `/consultas`, enlace de encargo).
   - `supabase/templates/recuperar.html`: logo y pie.
   - `supabase/functions/ver-clip/index.ts`: respaldo de `ORIGEN_PERMITIDO` hoy `https://rawstudio.biz`.
   - `servicios/verificacion/app/main.py` y su `README.md`: `ORIGENES_PERMITIDOS` por defecto.
   - Comentarios en `vite.config.ts` e `index.html` que hablan del dominio propio; `scripts/tarjetas-sociales.py` si menciona la URL pública; la línea «Sitio:» de `CHECKLIST.md`.
6. URLs que **no** se actualizan: `hola@rawstudio.biz`, `legal@rawstudio.biz`, `privacidad@rawstudio.biz`, el `from:` de Resend, las constantes `BUZON`, `src/content/ayuda.ts` (`BUZONES` y el FAQ), `src/screens/Ayuda.tsx` y `src/screens/Legal.tsx` (el pie de contacto), y los correos entre corchetes de `src/content/legal.ts`. Tampoco `supabase/config.toml` `site_url` (es el de desarrollo local).

#### Qué hacer
1. **Una sola origen canónica.** Crea `supabase/functions/_shared/sitio.ts` exportando `ORIGEN_CANONICO = 'https://rawstudio.mx'` y un helper que arme `https://rawstudio.mx/#/…` (o la ruta absoluta que haga falta, p. ej. `/og.png`). El frontend, si necesita el mismo valor, usa `src/lib/sitio.ts` con **el mismo** origen (son dos runtimes; no inventes un monorepo compartido). Las funciones de borde importan el `_shared`; no dejes literales `https://rawstudio.biz` como URL de sitio. `public/CNAME` e `index.html` no pueden importar TypeScript: escríbelos a mano, con el mismo origen.
2. `public/CNAME` pasa a contener exactamente `rawstudio.mx`.
3. Sustituye las URLs de sitio de la lista del diagnóstico (correos, Telegram, plantilla de recuperar, metas de vista previa, comentarios que describen el dominio público, línea «Sitio:» del checklist). En Telegram, si un texto dice «entra a rawstudio.biz» sin URL, dilo como rawstudio.mx.
4. **CORS.** El respaldo de `ver-clip` pasa a `https://rawstudio.mx`. Si puedes, refleja el `Origin` de la petición cuando esté en una lista permitida (`https://rawstudio.mx`, `https://www.rawstudio.mx`, y durante el corte también `https://rawstudio.biz` y `https://www.rawstudio.biz`, más `http://localhost:4173`); no inventes un secreto nuevo. En `servicios/verificacion`, el valor por defecto de `ORIGENES_PERMITIDOS` debe incluir los orígenes .mx (y conservar localhost). Si `ORIGEN_PERMITIDO` / `ORIGENES_PERMITIDOS` ya están puestos como secreto o variable en producción, **no inventes el valor**: anótalo para que Omar sume .mx.
5. Recorre el repo (`rg rawstudio\\.biz`) y clasifica lo que quede: solo deben sobrevivir buzones, el `from:` de Resend, el marcador `@alta.rawstudio.biz` y comentarios que expliquen esos buzones o ese marcador.

#### Corte que hace Omar (tú no lo hagas; déjalo escrito en el resultado)
Cambiar el CNAME sin alinear el DNS tumba el sitio: GitHub Pages dejaría de servir rawstudio.biz y esperaría rawstudio.mx, mientras .mx todavía redirige a .biz.
1. En Supabase → Authentication → URL configuration, **añade** `https://rawstudio.mx` y `https://www.rawstudio.mx` a Site URL / Redirect URLs (no borres .biz todavía). Más adelante el Site URL canónico será `https://rawstudio.mx`.
2. Apunta rawstudio.mx y www.rawstudio.mx a GitHub Pages **en lugar de** la redirección actual hacia .biz, siguiendo la documentación vigente de GitHub Pages (registros A/AAAA o ALIAS del apex, CNAME de www). No inventes IPs aquí.
3. En el repo: Settings → Pages → custom domain `rawstudio.mx`, Enforce HTTPS. El canónico es el apex.
4. Publicar el commit que cambia `public/CNAME` tiene que ir **junto** con ese cambio de DNS. Si se publica antes, el sitio puede quedar inalcanzable.
5. Cuando https://rawstudio.mx sirva la SPA con HTTPS, convierte rawstudio.biz en una redirección HTTP 301 hacia `https://rawstudio.mx` **con la misma ruta**. No uses una redirección enmarcada o «masked»: el sitio usa `HashRouter`, y el navegador solo conserva `#/ruta` en un 301 normal a la misma ruta.
6. Si existen secretos `ORIGEN_PERMITIDO` o `ORIGENES_PERMITIDOS` en producción, suma los orígenes .mx (y deja .biz hasta que la redirección esté puesta).
7. Las funciones de borde de la lista hay que volver a desplegarlas para que correos y Telegram ya enlacen a .mx. `supabase/templates/recuperar.html` está en el repo, pero en `config.toml` las plantillas de Auth están comentadas: si en producción se pegaron a mano en el panel de Authentication, Omar tiene que actualizarlas ahí; el archivo del repo no se aplica solo.
8. No toques Resend ni Zoho en esta ronda. Las sesiones y la puerta de 18 años viven por origen: quien entre por .mx volverá a confirmar edad y a iniciar sesión. No intentes compartir cookies entre .biz y .mx.

#### Qué no tocar
Textos legales (no reescribas `src/content/legal.ts` ni cambies sus correos), recargas o pasarela, remitente y buzones `@rawstudio.biz`, el marcador `@alta.rawstudio.biz`, correo/push/SMS nuevos, token o secretos, el precio de 20 pesos, el plazo de 2 días, `COBRO_CONSULTAS_ACTIVO` (sigue en `true`), DeepSeek, el hero del 80 % / dólar, reproductor, trato, avatares, álbumes, precios, portadas, el relleno de portadas discretas, la consola de Consultas, el panel de avisos del administrador, el aislamiento al cambiar de ficha, las contradicciones de copy público (México/EE. UU., pagos semanales vs. 48 horas, el scroll de «Precios»), `PublicarPor` / el 2.40 que queda, visitas o mapas de reproducción, hacer el panel adaptable a móvil, ni reabrir `[id: 20261108-04]` ni las anteriores.

#### Criterios de aceptación
1. `public/CNAME` contiene `rawstudio.mx`.
2. Las URLs de sitio que ve la gente (vistas previas, botones de los correos, textos del bot de Telegram, plantilla de recuperar) apuntan a `https://rawstudio.mx`. No quedan literales `https://rawstudio.biz` como navegación de sitio.
3. El remitente sigue siendo `RAWstudio <hola@rawstudio.biz>`. Los buzones públicos y el FAQ siguen en `@rawstudio.biz`. `@alta.rawstudio.biz` no se tocó.
4. `src/content/legal.ts` no cambió de redacción. Typecheck, build y lint limpios (solo advertencias que ya existían). Ningún secreto en el repo.
5. En el resultado dejas escrita la lista de corte de Omar (DNS, Pages, Supabase, redespliegue de funciones, plantillas de Auth si aplican) y **no afirmas** que la barra del navegador ya muestre .mx hasta que ese corte ocurra.

#### Cómo demostrar (obligatorio en bridge-query.md)
SHA, diff resumido, y:
- La salida de `rg rawstudio\\.biz` (fuera de los puentes) con cada resto clasificado: buzón / `from:` / marcador `@alta.` / comentario de esos casos.
- Que `public/CNAME` es `rawstudio.mx` y que las metas de `index.html` y un par de `PANEL`/`ESTUDIO` de los `avisar-*` usan `https://rawstudio.mx`.
- `tsc -b --force` y `npm run build` ok.
- No marques `CHECKLIST.md` como pass.

#### Siguiente paso para Claude Code
1. `git pull` e implementa esta ronda en su propio commit (mensaje sugerido: `feat: direccion publica rawstudio.mx`).
2. Coordina con Omar el momento de publicar el commit del CNAME junto con el cambio de DNS. Despliega las funciones de borde que cambiaste, con su aprobación. No hace falta migración de base.
3. Deja el resultado en `bridge-query.md` (SHA, diff, verificación, notas del corte) y marca `[id: 20261108-05]` como `respondida`.

### Respuesta a [id: 20261108-04] — Avisos del administrador
- **fecha:** 2026-11-08 18:04 (America/Mexico_City)
- **estado:** lista-para-claude
- **responde a:** Sergio vio que las cuentas ya tienen avisos y pidió algo parecido en el administrador: enterarse de lo que llega (moderación, verificación, cuentas, depósitos/abonos, mensajes, etc.), no solo de cuántas cosas hay pendientes.
- **ronda:** 1 de 10 de esta tarea · **tope:** 1 hora
- **checklist afectados (NO marques pass tú):** convenciones del panel de administración si tocas esas pantallas. No rompas ítems `pass` ni el trabajo de `[id: 20261106-04]` a `[id: 20261106-07]` ni `[id: 20261107-01]` a `[id: 20261107-07]` ni `[id: 20261108-01]` a `[id: 20261108-03]`.

#### Orden respecto a rondas anteriores
Si `[id: 20261108-03]` sigue `asignada`, **termínala primero** (avisos visibles dentro del diálogo, diagnóstico de cierre y abonos claros) y márcala `respondida`. Después, y no antes, implementa esta ronda en su propio commit. No la mezcles con la 03 ni reabras las anteriores. El relleno de portadas discretas lo corre Omar desde Herramientas; no forma parte de esta ronda.

#### Diagnóstico (no lo reescribas: úsalo)
1. Las cuentas tienen un centro de avisos **sin tabla de notificaciones**. `mis_avisos()` (security definer, solo la propia cuenta) arma la lista al pedirla, leyendo consultas, encargos, compras, rentas, propinas, suscripciones, comentarios, verificaciones, retiros y clips. Un asunto resuelto desaparece solo. Lo único persistente es `avisos_estado(user_id, visto_at)`; `avisos_marcar_vistos()` actualiza esa fecha al abrir la lista. Forma de cada fila (`src/lib/avisos.ts`): `clave`, `tipo`, `titulo`, `detalle`, `ruta`, `at`, `urgente`, `nuevo`. `urgente` = algo que te toca hacer y se queda mientras esté pendiente. Lo demás cuenta como nuevo hasta que abres la lista.
2. La UI es `CampanaAvisos.tsx` (campana fija con cuenta = urgente + nuevo, refresco cada 60 s / foco / `avisos:cambio`) y `Avisos.tsx` en `/avisos`. Cada fila lleva a una `ruta` de la app. Se ve con sesión, para compradores y creadoras. **Dentro del panel se oculta** (`RUTAS_PANEL`). Un admin, en modo creadora o yendo a `/avisos`, ve lo *suyo* (una venta, un comentario de sus videos), no el trabajo de la plataforma.
3. El panel no tiene inbox ni campana. `pendientes.ts` + `Marco.tsx` muestran **conteos actuales**: moderación (`pendiente`), verificación (`pendiente_revision`), denuncias (`nuevo` + `en_revision`), retiros por aprobar / por pagar, purga, consultas esperando / vencidas, y `atencion` (incluye avatares por revisar). Dicen cuántas hay, no qué llegó, de quién ni desde cuándo. Si de 3 retiros pasas a 4, nada señala cuál es el nuevo. Esos números solo se piden con el panel abierto.
4. Hay correos (Resend) a un buzón admin para retiro nuevo, verificación nueva y purga semanal (`avisar-retiro`, `avisar-verificacion`, `avisar-purga`). No inventes más correo, push ni SMS. Telegram sigue solo para consultas.
5. `ajustesPendientes()` ya existe en `src/lib/admin.ts` (abonos que esperan segunda firma) y **no** entra hoy en `Pendientes` / badges. Las denuncias, los videos por moderar y las consultas que se vencen solo aparecen como número de menú, no como aviso con persona y fecha.

#### Qué hacer
1. **Misma idea, datos aparte.** Un RPC nuevo `admin_avisos()` (security definer, exige `es_admin()`) que arme la lista al pedirla, a partir de las mismas fuentes que ya usa el panel (los `admin_conteo_*` / consultas que alimentan `pendientes.ts`, más `ajustesPendientes` / la tabla de ajustes por aprobar, más lo necesario para nombrar a la persona y la fecha). No lo mezcles con `mis_avisos`: lo personal y lo de la plataforma se quedan separados. No crees una tabla que vaya acumulando eventos para siempre.
2. **Visto por cada admin.** Persiste un `visto_at` por cuenta administradora (p. ej. `avisos_estado_admin` o una columna equivalente claveada por `user_id`), más `admin_avisos_marcar_vistos()`. Que un admin abra la lista no se la marca como vista al otro.
3. **Misma forma de fila** (`clave`, `tipo`, `titulo`, `detalle`, `ruta`, `at`, `urgente`, `nuevo`) para poder reutilizar la lista. Los `tipo` del admin son los de esta cola (p. ej. moderación, verificación, denuncia, retiro, consulta, ajuste, purga); no reutilices a la fuerza los `TipoAviso` de las cuentas (`venta`, `compra`, etc.). Un módulo tipo `src/lib/avisosAdmin.ts` está bien.
4. **Campana dentro del marco del panel** (`Marco.tsx`), en el encabezado de escritorio, no la campana flotante de las cuentas. La de las cuentas sigue oculta en `RUTAS_PANEL`. La campana del admin abre una pantalla «Avisos» bajo Por atender (p. ej. `/admin/avisos`; añade el módulo en `modulos.ts` sin renombrar claves ajenas). Reutiliza el aspecto de `Avisos.tsx` si ayuda; no montes `CampanaAvisos` ni `misAvisos` dentro del panel.
5. **Tipos imprescindibles** (cada uno con quién y desde cuándo; `urgente` mientras siga pendiente):
   - Video nuevo por moderar.
   - Identidad nueva o una que se volvió a enviar.
   - Denuncia nueva (o que sigue en revisión y acaba de entrar).
   - Solicitud de retiro nueva, y una ya aprobada que aún hay que marcar como pagada.
   - Consulta por vencer (cerca del plazo de 2 días) o vencida sin respuesta.
   - Abono/ajuste propuesto que espera la segunda firma.
   - Archivos que ya pasaron la fecha de purga y esperan a que alguien pulse «Purgar».
6. **Enlace profundo:** cada fila abre el módulo que ya existe y, si ese módulo ya acepta un id o un parámetro, el caso concreto: `/admin/moderacion`, `/admin/verificacion`, `/admin/reportes`, `/admin/retiros` (por aprobar o por pagar / ajustes por aprobar), `/admin/consultas`, y la purga donde ya vive el botón (p. ej. Herramientas). No inventes un enrutado complejo si el módulo no sabe abrir un ítem: basta con llegar a la cola correcta.
7. **Campana vs. badges (importante, es distinto de las cuentas):**
   - Los badges y el Resumen se quedan como están: «cuántas hay pendientes» por módulo.
   - El número de la campana cuenta **solo lo `nuevo`** (lo que llegó o pasó a ese estado notable desde el último `visto_at` de ese admin). **No** sumes otra vez los pendientes (`urgente + nuevo` como `contarAvisos` de las cuentas): si no, la campana y el menú dirían el mismo 5.
   - En la lista sí se marcan los urgentes, y siguen visibles mientras no se resuelvan.
   - Abrir la lista marca vistos (lo nuevo deja de serlo; lo pendiente no desaparece hasta resolverse en su módulo).
   - Al resolverse en su módulo, al volver a armar la lista esa fila ya no sale.
8. Refresco razonable, al estilo de la campana de las cuentas (al montar, al volver a la pestaña, cada minuto, al marcar vistos). No dispares una consulta por ítem cada segundo. Si el RPC falla, no finjas «todo al día»: muestra que no se pudieron cargar.
9. Textos neutros, sin asumir género («identidad de {nombre}», «video de {nombre}»). `{nombre}` = `display_name` o, si no hay, el handle. No inventes copy legal ni de marketing.

#### Qué dejar para después (no lo hagas ahora)
Fallos de un cron o de un correo que no salió (haría falta un registro de ejecuciones que hoy no está; no lo inventes). Movimientos «raros» o muy grandes. Avisar de que una creadora respondió a un rechazo. Los avatares por revisar ya tienen badge en `atencion`; no hace falta meterlos en esta primera campana.

#### Qué no tocar
Textos legales, recargas o pasarela, correo/push/SMS nuevos (los `avisar-*` que ya existen se quedan), token o secretos, el precio de 20 pesos, el plazo de 2 días, `COBRO_CONSULTAS_ACTIVO` (sigue en `true`), DeepSeek, el hero del 80 % / dólar, dominio, reproductor, trato, avatares, álbumes, precios, portadas, el relleno de portadas discretas, la consola de Consultas (sigue solo lectura), el Resumen / badges / búsqueda global (no los rehagas; solo conviven con la campana), visitas o mapas de reproducción, hacer el panel adaptable a móvil, mezclar avisos personales con los de la plataforma, ni reabrir `[id: 20261108-03]`.

#### Criterios de aceptación
1. Dentro del panel hay una campana que abre `/admin/avisos` (o la ruta que elijas bajo Por atender). Fuera del panel, la campana de las cuentas sigue igual y sigue oculta dentro del panel.
2. Un admin ve avisos de la plataforma (video, identidad, denuncia, retiro, consulta, ajuste pendiente de firma, purga), cada uno con quién, desde cuándo y un enlace al módulo. Un no-admin no puede leer `admin_avisos`.
3. El número de esa campana es lo nuevo desde la última vez que ese admin abrió la lista, no el total de pendientes del menú. Abrir la lista marca vistos para esa cuenta admin y no para otra.
4. Un asunto resuelto en su módulo desaparece de la lista al refrescar. Un pendiente ya visto se queda en la lista (sin contar en la campana) hasta que se resuelve.
5. `mis_avisos` y `/avisos` de las cuentas no cambian de significado. Typecheck, build y lint limpios (solo advertencias que ya existían). Ningún secreto en el repo.

#### Cómo demostrar (obligatorio en bridge-query.md)
SHA, diff resumido, y:
- Una prueba del RPC (SQL local o datos de prueba, **sin inventar eventos en producción**): con sesión admin salen filas de al menos dos tipos de la lista imprescindible, con `ruta` hacia el módulo correcto; sin ser admin, se rechaza.
- Marcar vistos: las mismas filas pendientes dejan de ser `nuevo` y la cuenta de la campana baja; el total de badges no tiene por qué bajar.
- Resolver (o simular resuelto) un ítem y comprobar que desaparece de `admin_avisos`.
- Que `mis_avisos` de una cuenta de prueba sigue sin incluir colas de administración.
- No marques `CHECKLIST.md` como pass.

#### Siguiente paso para Claude Code
1. Si `[id: 20261108-03]` no está `respondida`, termínala primero.
2. `git pull` e implementa esta ronda en su propio commit (mensaje sugerido: `feat: avisos del administrador`).
3. Aplica en producción, con la aprobación de Omar, la migración del `visto_at` admin y del RPC. No hace falta un relleno manual.
4. Deja el resultado en `bridge-query.md` (SHA, diff, verificación) y marca `[id: 20261108-04]` como `respondida`.

### Respuesta a [id: 20261108-03] — Avisos visibles, diagnóstico de cierre y abonos claros
- **fecha:** 2026-11-08 17:42 (America/Mexico_City)
- **estado:** lista-para-claude
- **responde a:** Sergio pidió un administrador más intuitivo (verificación, aprobación de videos, cuentas, depósitos, abono directo, mensajes, estadísticas y controles que expliquen). El caso concreto: quiso eliminar una cuenta y no pudo, sin ninguna advertencia que dijera por qué.
- **ronda:** 1 de 10 de esta tarea · **tope:** 1 hora
- **checklist afectados (NO marques pass tú):** convenciones del panel de administración si tocas esas pantallas. No rompas ítems `pass` ni el trabajo de `[id: 20261106-04]` a `[id: 20261106-07]` ni `[id: 20261107-01]` a `[id: 20261107-07]` ni `[id: 20261108-01]` ni `[id: 20261108-02]`.

#### Orden respecto a rondas anteriores
`[id: 20261108-02]` ya está `respondida` y la migración de descripciones ya está aplicada en producción. **No la reabras** (ni las anteriores). El relleno de portadas discretas lo corre Omar desde Herramientas; no forma parte de esta ronda y no tienes que esperarlo. Implementa esta ronda en su propio commit.

#### Diagnóstico (no lo reescribas: úsalo)
1. **El error sí llega, pero queda tapado.** En `src/admin/Usuarios.tsx`, `Ficha()` ofrece Anonimizar y Eliminar definitivamente en la Zona de riesgo. `EliminarDialogo()` pide motivo y escribir el handle. `eliminarCuenta()` (`src/lib/admin.ts`) llama a `admin_eliminar_cuenta` y devuelve `error.message`. El callback `falla={msg => setError(msg)}` pinta ese texto en el **banner de la pantalla principal**, no dentro del diálogo. La ficha sigue abierta (overlay `zIndex` 80) y `Confirmar` sigue abierto (overlay `zIndex` 90, fondo oscuro). El administrador se queda mirando la confirmación y el motivo queda detrás. Eso reproduce el síntoma de Sergio («no pude y no me dijo por qué»). PostgreSQL y el wrapper sí tienen mensajes.
2. El mismo agujero: si escribe mal el handle, `EliminarDialogo` llama `falla('Escribe el usuario...')` y también lo pinta detrás. La etiqueta puede cambiar a «Escribe el usuario», pero `Confirmar` solo mira `ocupado` y el motivo: un handle incorrecto no bloquea de verdad el envío.
3. Anonimizar, suspender, banear y ajustar saldo pasan por `tras()` en `Usuarios()`: si hay error, `setError(msg)` y el diálogo/ficha se quedan abiertos. Mismo defecto de ubicación. `Confirmar()` en `src/admin/piezas.tsx` no tiene estado de error local ni `catch` visible para el usuario: solo `try/finally` para `ocupado`. Una excepción inesperada tampoco se presenta.
4. **`admin_eliminar_cuenta`** (`20261127000000_eliminar_cuenta.sql`) bloquea, entre otras cosas: no admin, motivo vacío, la propia cuenta, otra cuenta admin (hay que revocar el privilegio antes), cuenta inexistente, confirmación que no coincide con el handle, imágenes de verificación todavía sin borrar, e historial protegido / dependencias (los mensajes recomiendan Anonimizar). Intenta borrar `auth.users` en transacción y devuelve archivos para limpieza posterior en Storage. Registra en `admin_log`. `eliminarCuenta()` distingue cuenta borrada de fallos posteriores de limpieza: esos avisos también tienen que verse con claridad.
5. **`profiles_no_borrar_con_historial()`** (`20261120000000_no_borrar_el_historial.sql`) bloquea, salvo cuentas demo, cualquier historial en: `coin_ledger`, `purchases`, `rentals`, `subscriptions` (como suscriptor o creadora), `tips` en ambas direcciones, consentimientos, `payouts`, `solicitudes_retiro`, `payment_orders`, `reembolsos_retiro`, expedientes, `payout_accounts`, `custom_requests` en ambas direcciones y reportes como denunciante o perfil. `clips_no_borrar_con_historial()`: un clip con compras, rentas, reportes o reembolsos no se destruye (se marca borrado) y puede impedir la cascada. La identidad verificada, por sí sola, **no** es un bloqueo explícito de eliminar. El saldo no aparece como chequeo independiente de eliminar, pero los movimientos del ledger sí bloquean. **No sugieras borrar historial para que «pase».** Tener clips sin ese historial no equivale automáticamente al bloqueo SQL actual: comprueba el código vigente, no inventes reglas nuevas más permisivas.
6. **`admin_anonimizar_cuenta()`** (misma migración 20261127) bloquea: no admin, motivo vacío, la propia cuenta, otra admin, inexistente o ya anonimizada, **saldo distinto de cero (incluso negativo)**, retiros `pendiente`/`aprobada`, e imágenes de verificación sin borrar. Sustituye la identidad del perfil, elimina contactos/posts, marca clips como borrados, cancela suscripciones e invalida acceso e identidades/sesiones. Conserva la fila, el ledger, las compras, los retiros, el expediente y el resto del historial. La UI ya explica consecuencias dentro de la confirmación, pero **no ofrece un diagnóstico previo de esa cuenta**.
7. **Hueco de consultas.** `20261124000000_consultas_telegram.sql` define consultas y mensajes con cascadas. El trigger de historial de `20261120` **no incluye** esas tablas. Una cuenta cuyo único historial sean consultas (sin asientos contables) podría borrarse del todo y llevarse los hilos. Antes de considerar segura cualquier eliminación definitiva, hay que comprobarlo y proteger esas filas (mismos nombres reales de la migración: `consultas`, `consulta_mensajes` y las que correspondan). La regla es conservar también las consultas; no las borres para «limpiar» la cuenta.
8. **Abono directo ya existe:** ficha de Usuarios → Zona de riesgo → «Ajustar saldo». `SaldoDialogo()` pide un monto en USD con signo, muestra saldo antes/después y exige motivo. `ajustarSaldo()` → `admin_ajustar_saldo`. `20261121000000_topes_de_ajuste_admin.sql`: asiento append-only y `admin_log`; topes iniciales 200 USD por movimiento y 1 000 USD acumulados en 24 h (configurables); el excedente queda **propuesto**; otra admin firma; si solo hay una, puede firmar después de 24 h. Retiros muestra «Ajustes por aprobar». `src/lib/admin.ts` convierte una propuesta aceptada en `{error: AVISO_PROPUESTA}`; `Usuarios` lo trata como **fallo** y mantiene el modal: riesgo de repetir una propuesta que ya se creó. En `Retiros.tsx`, «Aprobar» se deshabilita con `puede_aprobar` sin decir junto al botón quién debe firmar o cuándo se habilita. Los movimientos de la ficha imprimen `m.delta` crudo, sin `usd()`: pueden parecer dólares cuando son centavos.
9. **El mismo feedback tapado** está en `Verificacion.tsx` y `Moderacion.tsx`: `tras(error)` vive en el padre y el overlay (ficha o revisor) lo tapa. En Moderación, «Sin verificar» es una insignia pero «Aprobar» sigue habilitado y deja que el servidor explique el bloqueo… explicación que hoy no se ve. En Verificación, `urlDocumento()` en error puede devolver `null` y la ficha decir «Sin archivo» cuando en realidad falló obtener la URL.
10. No hay una pantalla de «registrar depósito bancario» ni conciliación de un SPEI entrante. Un ajuste contable no es prueba de haber recibido dinero externo. **No inventes esa pantalla ni un procesador.** El resumen, el menú agrupado, los badges, la búsqueda global y la consola de Consultas (solo lectura) ya existen: no los rehagas.

#### 1. Confirmaciones con el resultado a la vista
1. El error o el aviso tiene que verse **dentro del recuadro o lateral que ejecutó la acción** (`role="alert"`), no solo en el banner de detrás. Un patrón compartido en `Confirmar` (`src/admin/piezas.tsx`) —una zona de error local— vale para no repetir el agujero.
2. Si la acción falla, no cierres el diálogo. Conserva el motivo, el handle escrito y el monto. Libera `ocupado`. Evita un segundo envío mientras corre el primero.
3. Captura rechazos inesperados (red, excepción): no dejes un spinner eterno ni fingas éxito.
4. Aplícalo a eliminar, anonimizar, suspender, banear y ajustar saldo. Reutiliza el mismo patrón en los overlays de Verificación y Moderación (aprobar / rechazar / retirar, y resolver identidad).
5. Un éxito se nota: mensaje claro, se refresca lo que cambió, y no se finge éxito si hubo error. Los avisos de limpieza posterior de Storage, si la cuenta ya se eliminó, también tienen que verse (no como si no se hubiera borrado, ni como silencio).
6. Un handle que no coincide se explica **dentro** de `EliminarDialogo` y no debería mandar al servidor (o, si llega, el error del servidor también se ve ahí).

#### 2. Diagnóstico de cierre de cuenta
1. En la ficha, **antes de confirmar** (al abrir la zona de riesgo o al abrir cada diálogo), muestra los bloqueos reales de **esa** cuenta, no un texto genérico: es tu propia cuenta; es otra admin (hay que revocarle el privilegio antes); ya está anonimizada; tiene historial protegido (nombra las clases que apliquen: movimientos, compras, rentas, suscripciones, propinas, retiros, reportes, encargos, consultas, etc.); saldo distinto de cero; retiro pendiente o aprobado; documentos de verificación todavía presentes.
2. El diagnóstico es de solo lectura (un RPC o la suma de datos que el admin ya puede ver). **No sustituye** las reglas transaccionales: el servidor vuelve a validar al confirmar. Si el diagnóstico decía que se podía y el servidor rechaza, ese rechazo también se ve dentro del diálogo.
3. **Anonimizar** es la salida normal para una cuenta con historial. **Eliminar definitivamente** queda claramente limitado a una cuenta sin historial protegido. No ofrezcas un atajo para borrar el ledger, las compras, los retiros ni las consultas «para poder eliminar».
4. Cierra el hueco de las consultas: una cuenta cuyo único rastro sean hilos o mensajes de consulta **no** se puede eliminar definitivamente (igual que si tuviera compras o movimientos). Comprueba las cascadas reales y añade la protección equivalente a `profiles_no_borrar_con_historial` (o el chequeo dentro de `admin_eliminar_cuenta`). Anonimizar sigue conservando esa fila y ese historial.
5. Enlaces al lugar que resuelve un bloqueo **solo si ese control existe de verdad**. Hoy los errores de eliminar/anonimizar pueden decir «bórralas desde Verificación»; la ficha de Verificación describe un borrado por pasada automática y no se vio una acción manual. Revisa el código vigente: si el servidor exige que esas imágenes ya no estén, la acción tiene que ser real y confirmable (lo que ya exijan `admin_eliminar_cuenta` / `admin_anonimizar_cuenta`). Si esa instrucción apunta a una pantalla que no puede hacerlo, no la dejes como enlace muerto. No inventes una política nueva de destrucción de expediente.
6. No renombres «Anonimizar» a «Eliminar cuenta». Deja las dos acciones, con el diagnóstico para que se entienda cuál aplica.

#### 3. Abonos (ajustar saldo) con resultado claro
1. Distingue tres desenlaces: **Aplicado**, **Propuesto para aprobación** y **Falló**. Una propuesta aceptada por el servidor **no** es un error: no uses `AVISO_PROPUESTA` como si `ajustarSaldo()` hubiera fallado, ni invites a pulsar otra vez (se duplicaría).
2. Si quedó propuesta, cierra o actualiza el formulario y enlaza a Retiros → Ajustes por aprobar.
3. En Retiros, si «Aprobar» está deshabilitado, explica junto al botón quién debe firmar o cuándo se habilita (otra admin, o la misma después de 24 h si solo hay una), según las reglas que ya existen. No cambies topes, motivo obligatorio ni la segunda firma.
4. En la ficha, formatea los movimientos con `usd()` (o el helper que ya usáis para dinero), no con el `delta` crudo en centavos.
5. La etiqueta puede pasar a algo como «Abonar o descontar saldo», con una línea breve de que es un ajuste contable interno, no el registro de un depósito bancario recibido. No inventes una pantalla de depósitos ni una pasarela.

#### Extra pequeño (mismo tema de avisos)
En Moderación, si el video no se puede aprobar porque la identidad sigue sin resolverse, muestra esa razón junto a «Aprobar» (el servidor sigue siendo la autoridad). En Verificación, no digas «Sin archivo» si lo que falló fue obtener la URL firmada: di que no se pudo cargar.

#### Qué no tocar
Textos legales, recargas o pasarela, una pantalla nueva de «registrar depósito», token o secretos, el precio de 20 pesos, el plazo de 2 días, `COBRO_CONSULTAS_ACTIVO` (sigue en `true`), DeepSeek, el hero del 80 % / dólar, dominio, reproductor, trato, avatares, álbumes, precios de 10 / 20 / 40, portadas, el relleno de portadas discretas, consola de Consultas (sigue solo lectura: no responder, no cobrar ni reembolsar desde ahí), el resumen / menú / badges / búsqueda global (no los rehagas), visitas o mapas de reproducción, hacer el panel adaptable a móvil (`ANCHO_MINIMO` se queda), borrar historial para facilitar un eliminado, ni «Anonimizar» más allá del diagnóstico y del aviso visible.

#### Criterios de aceptación
1. Cada rechazo del SQL o del cliente (handle incorrecto, propia cuenta, otra admin, historial, saldo, retiro, documentos, motivo vacío, red) se ve **dentro** del diálogo o lateral que se usó, en un escritorio típico (p. ej. 1440×900), sin tener que cerrar el recuadro para leerlo.
2. Una cuenta con compras, ledger o consultas no pierde ese historial al intentar eliminar. Eliminar definitivamente no pasa si hay historial protegido (consultas incluidas). Anonimizar con saldo distinto de cero, retiro pendiente/aprobado o documentos pendientes explica el bloqueo concreto.
3. Un fallo de red no deja el botón ocupado para siempre ni simula éxito.
4. Un abono aplicado, uno propuesto y uno fallido se distinguen. Una propuesta exitosa no se trata como error ni se duplica al «reintentar».
5. Antes de confirmar se ve de quién es la cuenta y, en un ajuste, el monto y el saldo resultante. Los movimientos de la ficha se leen como dinero, no como centavos crudos.
6. Typecheck, build y lint limpios (solo advertencias que ya existían). Ningún secreto en el repo.

#### Cómo demostrar (obligatorio en bridge-query.md)
SHA, diff resumido, y:
- Reproduce (en local o con datos de prueba, **sin mutar cuentas reales de producción** para el demo) al menos: handle incorrecto; intento de eliminar una cuenta con historial (el error se ve dentro del diálogo y el historial sigue ahí); intento de anonimizar con saldo o retiro bloqueante (el motivo concreto se ve dentro); un ajuste que queda propuesto (desenlace «Propuesto», no un banner de error, y no se crea dos veces si no se vuelve a enviar).
- Una prueba de que eliminar está bloqueado también cuando el único rastro son consultas (si ese era el hueco), sin borrar esos hilos.
- No marques `CHECKLIST.md` como pass.

#### Siguiente paso para Claude Code
1. `git pull` e implementa esta ronda en su propio commit (mensaje sugerido: `feat: avisos visibles y diagnostico al cerrar una cuenta`).
2. Si añadiste protección SQL para las consultas u otro chequeo de cierre, aplícalo en producción con la aprobación de Omar. No hace falta que Omar « Borre » nada a ciegas: el diagnóstico y los avisos viven en el panel.
3. Deja el resultado en `bridge-query.md` (SHA, diff, verificación) y marca `[id: 20261108-03]` como `respondida`.

### Respuesta a [id: 20261108-02] — Portada más discreta y descripción genérica
- **fecha:** 2026-11-08 14:22 (America/Mexico_City)
- **estado:** lista-para-claude
- **responde a:** Sergio vio las portadas ya nitidizadas a 240 px y le parecieron demasiado explícitas. Pidió un cuadro menos explícito (como el del avatar) y una descripción genérica del video. No pidió cambiar los títulos.
- **ronda:** 1 de 10 de esta tarea · **tope:** 1 hora
- **checklist afectados (NO marques pass tú):** convenciones del catálogo y de publicar si tocas esas pantallas. No rompas ítems `pass` ni el trabajo de `[id: 20261106-04]` a `[id: 20261106-07]` ni `[id: 20261107-01]` a `[id: 20261107-07]` ni `[id: 20261108-01]`.

#### Orden respecto a rondas anteriores
`[id: 20261108-01]` ya está `respondida` y aplicada en producción. **No la reabras** (ni las anteriores). El «Regenerar las portadas públicas» de la 07 (agrandar la misma imagen a 240 px) se queda como está: esta ronda es otra cosa, porque hay que sacar un **fotograma distinto del video**. Implementa esta ronda en su propio commit.

#### Diagnóstico (no lo reescribas: úsalo)
1. El lote, si no trae portada, usa `miniaturaDeVideo`: el cuadro del 10 %. Eso no busca un momento discreto; busca uno que no sea negro de arranque. Al pasar la pública de 32 px a 240 px se ve ese mismo fotograma, ahora nítido.
2. `avatarDeVideo` / `puntuarCuadro` son una heurística de **calidad de imagen** (exposición, detalle, premio a lo temprano) sobre la primera mitad. No saben qué hay en el cuadro. El código ya lo dice: en un sitio 18+ no garantizan un resultado inocuo. Por eso los avatares retroactivos se confirman uno a uno en Herramientas. Aquí vale la misma honestidad.
3. No se puede recortar la portada a cuadrado: dejaría de ser portada. No se puede partir de `clip-covers-full` para «suavizar»: es la misma imagen explícita, solo más grande. Hay que decodificar el video (URL firmada, como `AvatarAuto` con `urlVideoFirmada`).
4. No hay una marca de si la portada la eligió la creadora, la subió a mano o la puso el lote. Por eso el retroactivo no se aplica a ciegas: se propone y se confirma.
5. La descripción del lote casi siempre va vacía. Solo se lee en la ficha. No se manda el video a DeepSeek ni a ningún tercero para narrarlo (es contenido 18+ y se prestaría a inventar). Los títulos que salen del nombre del archivo no se tocan en esta ronda.

#### 1. Portada más discreta
1. En `src/lib/miniatura.ts`, añade una función (p. ej. `portadaDiscretaDeVideo`) que reutilice `puntuarCuadro` y la misma ventana que el avatar (seis cuadros, ~8 %–50 %, premio a los más tempranos). La diferencia: **cuadro completo**, sin recorte cuadrado, acotado a `ANCHO_MAXIMO` (720), listo para pasar por `achicar()` a `ANCHO_PUBLICO` (240) como cualquier portada. No inventes un clasificador de desnudos ni un servicio externo.
2. **Subidas nuevas del lote** (`publicarPara` cuando no viene `portada`): usa esa función. Si no encuentra ningún cuadro que pase el filtro, cae a `miniaturaDeVideo` (el del 10 %), para no publicar sin portada.
3. **Formulario de la creadora** (`Upload.tsx`): si ella sube una imagen o elige uno de los seis cuadros, **esa portada se queda**. Solo si se cae al cuadro automático usa la función nueva (con el mismo respaldo al 10 % si no hay candidato).
4. **Las que ya existen:** una herramienta nueva en Herramientas, al estilo de `src/admin/AvatarAuto.tsx`: recorre clips de video con archivo (no álbumes), pide el video con URL firmada, saca la propuesta y la muestra **junto a la portada actual**. No se escribe nada hasta que quien administra confirme (puede desmarcar). Aplica las marcadas: misma ruta en `clip-covers-full` (la nueva nítida, hasta 720) y en `clip-covers` (la pública a 240, con `achicar` y `upsert` solo en este relleno). Lotes chicos (como los 8 del avatar) para no colgar el navegador. Progreso, aplicadas, omitidas (sin video, sin cuadro aceptable, error) y sin inventar portada si el video no se puede decodificar.
5. Eso permite no pisar a ciegas una portada que alguien eligió: se ve el antes y el después y se puede dejar sin marcar. No pidas revisión cuadro a cuadro *dentro* del video (solo la propuesta final vs. la actual).
6. No actives la tira de seis cuadros en los de pago. No cambies `ANCHO_PUBLICO` ni `ANCHO_MAXIMO`. No empieces a registrar visitas.

#### 2. Descripción genérica
1. Si la descripción está vacía o es nula, pon una frase corta y neutra: `Video de {nombre}`, donde `{nombre}` es el `display_name` de la creadora o, si no hay, su `handle`. Sirve para cualquier trato de género (no uses «creadore» ni asumas género). Tope el de siempre (p. ej. 600 caracteres). No inventes de qué va el video, no uses adjetivos sexuales, no llames a ninguna API.
2. **No pises** una descripción que ya tenga texto (la del formulario, la del CSV o una escrita antes).
3. Aplica esto: (a) a los clips de video que ya existen y no tienen descripción (migración o actualización SQL equivalente, con aprobación de Omar para producción); (b) a las subidas nuevas del lote cuando el CSV no traiga `descripcion`; (c) al publicar desde `Upload.tsx` si el campo se deja vacío. Un álbum no se rellena con «Video de…»: esta ronda es de videos.
4. No toques `title`. El título que sale del nombre del archivo se queda como está.

#### Qué no tocar
Textos legales, recargas o pasarela, token o secretos, el precio de 20 pesos, el plazo de 2 días, `COBRO_CONSULTAS_ACTIVO` (sigue en `true`), DeepSeek (sigue solo para validar consultas; no lo uses para describir videos ni para puntuar cuadros), el hero del 80 % / dólar, dominio, reproductor, trato, avatares, álbumes (precio fijo, flujo y portada de fotos), precios de 10 / 20 / 40, el default 2000, consola de admin más allá de la herramienta nueva, «Anonimizar», el desempeño por clip, visitas o mapas de reproducción, títulos.

#### Criterios de aceptación
1. El lote sin portada propia usa la función nueva (primera mitad + `puntuarCuadro`, cuadro completo). El formulario respeta la portada elegida o subida.
2. Las portadas que ya existen no cambian hasta confirmar la propuesta en Herramientas. La propuesta se ve junto a la actual. Sin video o sin cuadro aceptable se omite, no se inventa.
3. Tras aplicar, la pública mide ~240 px y la nítida (hasta 720) es el **mismo fotograma nuevo**, no el viejo agrandado. `anon` sigue sin leer `clip-covers-full`.
4. Los videos sin descripción quedan en `Video de {nombre}`. Los que ya tenían texto no se mueven. Los álbumes no se rellenan con esa frase. Los títulos no cambian.
5. Typecheck, build y lint limpios (solo advertencias que ya existían). Ningún secreto en el repo. Ninguna llamada a una IA para esto.

#### Cómo demostrar (obligatorio en bridge-query.md)
SHA, diff resumido, y:
- **Portada.** Una prueba de la función nueva (archivo o URL simulada): elige un cuadro de la primera mitad, no recorta a cuadrado, y si todos fallan el filtro el lote/formulario cae al del 10 %. En Herramientas: propuesta vs. actual, nada se escribe sin confirmar; un clip sin video o sin cuadro aceptable se omite.
- **Descripción.** Conteo antes/después: cuántos videos vacíos se rellenaron; cuántos con texto previo y cuántos álbumes quedaron igual (0 cambiados). Un lote sin CSV de descripción guarda `Video de {nombre}`; uno con `descripcion` en el CSV la respeta.
- No marques `CHECKLIST.md` como pass.

#### Siguiente paso para Claude Code
1. `git pull` e implementa esta ronda en su propio commit (mensaje sugerido: `feat: portadas mas discretas y descripcion generica`).
2. Aplica en producción, con la aprobación de Omar, la actualización de descripciones vacías. El relleno de portadas lo corre Omar desde Herramientas (revisa y confirma las propuestas).
3. Deja el resultado en `bridge-query.md` (SHA, diff, verificación) y marca `[id: 20261108-02]` como `respondida`.

### Respuesta a [id: 20261108-01] — Subida en lote: precios de 10, 20 o 40 (no 2.40)
- **fecha:** 2026-11-08 07:08 (America/Mexico_City)
- **estado:** lista-para-claude
- **responde a:** Sergio confirmó la ronda corta: la subida en lote del panel también tiene que salir en 10, 20 o 40 dólares, para que no vuelva a llenar el catálogo de 2.40.
- **ronda:** 1 de 10 de esta tarea · **tope:** 1 hora
- **checklist afectados (NO marques pass tú):** convenciones de publicar / panel si tocas esa pantalla. No rompas ítems `pass` ni el trabajo de `[id: 20261106-04]` a `[id: 20261106-07]` ni `[id: 20261107-01]` a `[id: 20261107-07]`.

#### Orden respecto a rondas anteriores
`[id: 20261107-07]` ya está `respondida` y los precios de esa ronda ya están aplicados en producción. **No la reabras** (ni las anteriores). El relleno de portadas públicas lo corre Omar desde Herramientas; no forma parte de esta ronda y no tienes que esperarlo. Implementa esta ronda en su propio commit.

#### Diagnóstico (no lo reescribas: úsalo)
1. El valor inicial de 2.40 de la subida masiva está en `agruparVideos` (`src/lib/admin.ts`): `precio: 240` para cada video agrupado. No hay una función `leerLote`. `src/admin/SubidaMasiva.tsx` usa `agruparVideos`, enseña el precio con `usd(v.precio)` y no tiene selector: Omar no puede cambiarlo en pantalla.
2. El CSV opcional (`aplicarCatalogo`) sí puede traer `precio` en dólares, convertido a centavos (`Math.round(parseFloat(...) * 100)`). Eso es un precio puesto a mano: **no lo pises**. Si la fila no trae `precio`, se conserva el de `agruparVideos`.
3. `publicarPara` guarda `p_precio: datos.precio` tal cual. La visibilidad por defecto del lote es `pago`. El CSV puede poner `visibilidad` en `gratis`, `pago` o `suscriptores`.
4. El formulario de la creadora (`Upload.tsx`) ya ofrece 10 / 20 / 40 y arranca en 20. No lo toques salvo que extraigas las constantes compartidas para no duplicarlas.
5. Claude señaló además que `clips.price_coins` sigue con `default 240` en la base: cualquier inserción que omita el precio caería otra vez en 2.40.

#### Qué hacer
1. En `agruparVideos`, deja de asignar `240`. A cada video de pago así agrupado asígnale al azar uno de `1000`, `2000` o `4000` (10, 20 o 40 dólares, en centavos), **por video**, no un solo monto para todo el lote. Usa los mismos tres valores que `PRECIOS_VIDEO` en `Upload.tsx`. Si los extraes a un módulo compartido para que no se desfasen, bien; no inventes un cuarto precio ni vuelvas al paso de 50 centavos.
2. En `aplicarCatalogo`, un `precio` presente en el CSV sigue ganando (incluido un 2.40 o cualquier otro monto que alguien haya escrito a propósito). Si la fila no trae `precio`, queda el asignado en el paso 1.
3. Si la visibilidad queda en `gratis` (porque el CSV lo dijo), el `precio` tiene que ser `0`. No publiques un clip «gratis» con 10, 20 o 40 pegados.
4. No hace falta un selector en cada fila: el precio asignado ya se ve con `usd(v.precio)`. Opcional: una línea en el recuadro de ayuda de `SubidaMasiva.tsx` que diga, sin marketing ni legales, que si el catálogo no trae precio cada video sale a 10, 20 o 40 dólares al azar.
5. Si `clips.price_coins` todavía tiene `default 240`, cámbialo a `2000` (20 dólares, el mismo arranque del formulario) en una migración. Eso no reescribe filas existentes; solo evita que una inserción sin precio vuelva a 2.40. No toques el precio fijo de los álbumes.
6. Vuelve a correr, con aprobación de Omar, el mismo `UPDATE` idempotente de la ronda 07 por si entre esa migración y este arreglo se subió algún video de pago que haya quedado en 240:
   `UPDATE clips SET price_coins = (ARRAY[1000, 2000, 4000])[1 + floor(random() * 3)::int] WHERE visibility = 'pago' AND coalesce(formato, 'video') = 'video' AND price_coins = 240;`
   Sigue sin tocar álbumes, clips gratis, videos con otro precio, `renta_coins` ni `renta_horas`.

#### Qué no tocar
Textos legales, recargas o pasarela, token o secretos, el precio de 20 pesos de las consultas, el plazo de 2 días, `COBRO_CONSULTAS_ACTIVO` (sigue en `true`), DeepSeek, el hero del 80% / dólar, dominio, reproductor, trato, avatares, álbumes (precio fijo y flujo), el formulario de publicar de la creadora más allá de extraer constantes si hace falta, el relleno de portadas, consola de admin más allá de la subida en lote, «Anonimizar», el desempeño por clip, visitas o mapas de reproducción.

#### Criterios de aceptación
1. `agruparVideos` no asigna `240`. Un lote de videos de pago sin CSV de precio queda en una mezcla de 1000 / 2000 / 4000 (no todos el mismo, no 240), y la lista de `SubidaMasiva` lo muestra con `usd()`.
2. Si el CSV trae `precio`, ese valor se respeta. Si trae `visibilidad = gratis` y no trae precio, el clip queda en 0, no en 10/20/40.
3. El formulario de la creadora sigue igual (10 / 20 / 40, arranca en 20). Los álbumes no se tocan.
4. Si cambiaste el `default` de `clips.price_coins`, queda en 2000 y las filas que ya existían no se reescribieron por ese cambio.
5. El `UPDATE` de los 240 que aún queden, si se corre, no mueve álbumes, gratis ni un precio distinto de 240. Correrlo otra vez no cambia filas.
6. Typecheck, build y lint limpios (solo advertencias que ya existían). Ningún secreto en el repo.

#### Cómo demostrar (obligatorio en bridge-query.md)
SHA, diff resumido, y:
- Una prueba de `agruparVideos` (o de la pantalla) con varios videos y sin CSV: ninguno sale a 240; salen 1000, 2000 o 4000, repartidos.
- Un caso con CSV que pone `precio` (por ejemplo 19.40) y ese valor se conserva; un caso `visibilidad = gratis` sin precio queda en 0.
- Conteo en producción, si corriste el `UPDATE`: cuántos videos de pago seguían en 240 y a qué quedaron; 0 álbumes / gratis / otros precios movidos.
- No marques `CHECKLIST.md` como pass.

#### Siguiente paso para Claude Code
1. `git pull` e implementa esta ronda en su propio commit (mensaje sugerido: `feat: precios de 10 20 o 40 tambien en la subida en lote`).
2. Aplica en producción, con la aprobación de Omar, la migración del `default` si la hiciste y el `UPDATE` de los 240 que aún queden.
3. Deja el resultado en `bridge-query.md` (SHA, diff, verificación) y marca `[id: 20261108-01]` como `respondida`.

### Respuesta a [id: 20261107-07] — Portadas públicas más nítidas y precios de 10, 20 o 40
- **fecha:** 2026-11-07 21:58 (America/Mexico_City)
- **estado:** lista-para-claude
- **responde a:** Sergio vio las portadas del teaser borrosas (le gustó lo nítido del avatar) y que casi todos los videos dicen 2.40. Pidió las dos cosas: copia pública más clara, y precio de venta al azar entre 10, 20 y 40 dólares.
- **ronda:** 1 de 10 de esta tarea · **tope:** 1 hora
- **checklist afectados (NO marques pass tú):** convenciones de UI de publicar y del catálogo si tocas esas pantallas. No rompas ítems `pass` ni el trabajo de las rondas 4–7 ni `20261107-01` a `20261107-06`.

#### Orden respecto a rondas anteriores
Si `[id: 20261107-06]` sigue `asignada`, **termínala primero** (desempeño por clip en el Estudio) y márcala `respondida`. Después, y no antes, implementa esta ronda en su propio commit (o dos, si prefieres separar portadas y precios). No reabras `[id: 20261106-04]`, `[id: 20261106-05]`, `[id: 20261106-06]`, `[id: 20261106-07]`, `[id: 20261107-01]`, `[id: 20261107-02]`, `[id: 20261107-03]`, `[id: 20261107-04]`, `[id: 20261107-05]` ni `[id: 20261107-06]` una vez cerrada. No toques legales, recargas o pasarela, el precio de 20 pesos, el plazo de 2 días, `COBRO_CONSULTAS_ACTIVO` (sigue en `true`), DeepSeek, el hero del 80% / dólar, dominio, reproductor (más allá de que el póster público se vea mejor al cambiar el tamaño), trato, avatares, álbumes (precio fijo y flujo), consola de admin salvo un disparador puntual para regenerar portadas, ni «Anonimizar».

#### Diagnóstico (no lo reescribas: úsalo)
1. **La portada se ve borrosa a propósito.** El 3 de noviembre de 2026 se partió en dos copias de la misma imagen y la misma ruta: la pública, en `clip-covers`, sale de `achicar()` con `ANCHO_PUBLICO = 32` y `CALIDAD_PUBLICA = 0.4` (`src/lib/miniatura.ts`). La tarjeta mide ~243 px, así que se estira unas 7 veces: queda la mancha de color y la silueta. La nítida (hasta `ANCHO_MAXIMO = 720`) va a `clip-covers-full`, privada. `urlPortada()` lee el bucket público; quien compra recibe la nítida por `ver-clip`. En `Upload.tsx` el texto lo dice: «Sin pagar se ve borrosa, a 32 px. La nítida se guarda en privado.» En `ClipDetail.tsx`, el póster del reproductor es `portadaNitida ?? portada`: sin acceso, la misma miniatura chica, todavía más estirada.
2. **No es lo mismo que el avatar.** El avatar público sale a 256 px (`LADO_AVATAR`) con `avatarDeVideo` (elige el cuadro más limpio de la primera mitad). Por eso se ve nítido. No copies aquí la heurística ni el recorte cuadrado: la portada ya la elige la creadora entre seis cuadros (`cuadrosDeVideo`) o sube la suya. El arreglo es el **tamaño y la calidad de la copia pública**, no otro cuadro.
3. **El 2.40 es el valor inicial del formulario**, no una decisión de cada creadora: `const [precio, setPrecio] = useState(240)` en `src/screens/Upload.tsx`, con botones que suman o restan 50 centavos. Un clip gratis lleva `0`. Un álbum usa el precio fijo de plataforma (`configAlbumes()`, fallback 500 en `src/lib/albumes.ts`): no lo toques. La renta por defecto es 80 centavos y empieza apagada; al subir el precio de venta, una renta de 80 sigue siendo más barata, no la cambies.
4. Quien ya desbloqueó un clip a 2.40 no se recobra ni se le quita el acceso (`purchases` es único por usuario y clip). Solo cambia lo que paga quien desbloquee a partir de ahora.

#### 1. Portadas públicas a 240 px
1. Sube `ANCHO_PUBLICO` de 32 a **240** y `CALIDAD_PUBLICA` de 0.4 a algo cercano a la nítida (p. ej. 0.82). Las subidas nuevas ya pasan por `achicar()`: saldrán a 240 px al público. No cambies `ANCHO_MAXIMO` ni subas la copia de 720 px al bucket público.
2. Actualiza el texto de publicar que hoy dice que sin pagar se ve borrosa a 32 px. Algo fiel como: sin pagar se ve una miniatura de 240 px; la nítida se guarda en privado. No inventes copy de marketing ni textos legales.
3. Regenera las portadas públicas **que ya existen** a partir de `clip-covers-full` (la nítida), misma ruta, y escríbelas en `clip-covers` (hace falta poder pisar esa ruta: el `upload` habitual usa `upsert: false`, no lo cambies para todas las subidas; el relleno sí tiene que poder reemplazar). Si un clip no tiene copia nítida, no intentes agrandar la pública de 32 px: déjala y cuéntala como omitida. Si no tiene `cover_path`, no inventes una.
4. Ese relleno es de una vez. Inspecciona las políticas de Storage: el navegador de un admin quizá no pueda escribir en el prefijo de otra cuenta. Si hace falta, una función de borde autenticada como admin, con la llave de servicio **solo dentro de Supabase** (nunca en el front, el repo, un comentario ni un commit). No inventes un secreto de cron nuevo. Si lo pones en Herramientas, que sea un disparador puntual con progreso (procesadas, omitidas, errores), idempotente: correrlo dos veces deja el mismo resultado a 240 px. No pidas revisión humana cuadro a cuadro: es la misma imagen, solo más grande.
5. No actives la tira de seis cuadros en los clips de pago (sigue siendo solo para los gratis). No empieces a registrar visitas ni mapas de reproducción.

#### 2. Precios de 10, 20 o 40 dólares
1. En los videos de pago que **siguen en 240** (`visibility = 'pago'`, `coalesce(formato, 'video') = 'video'`, `price_coins = 240`), asigna al azar uno de `1000`, `2000` o `4000` (10, 20 o 40 dólares, en centavos). Una migración SQL basta; algo equivalente a:
   `UPDATE clips SET price_coins = (ARRAY[1000, 2000, 4000])[1 + floor(random() * 3)::int] WHERE visibility = 'pago' AND coalesce(formato, 'video') = 'video' AND price_coins = 240;`
   Como el `WHERE` exige 240, correrla dos veces no vuelve a revolver los que ya salieron.
2. **No toques:** álbumes (`formato = 'album'`), clips gratis (`price_coins = 0` u otra visibilidad), ni un video cuyo precio no sea 240 (eso sí lo movió alguien a mano). No toques `renta_coins` ni `renta_horas`.
3. En el formulario de publicar un video (`Upload.tsx`): quita el valor inicial de 2.40 y los botones de 50 en 50 centavos. Deja tres botones claros — 10, 20 y 40 dólares — y abre en **20**. Ella puede cambiar entre esos tres; no hace falta un monto libre que devuelva el catálogo a 2.40. Sigue mostrando `usd()` y el equivalente en pesos si ya está. El 80% que ella se queda se calcula con el precio elegido, como ahora.
4. No inventes recargas, pasarela ni un cambio al cobro de consultas (20 pesos). No toques el precio fijo de los álbumes ni su pantalla.

#### Qué no tocar
Textos legales, recargas o pasarela, token o secretos, el precio de 20 pesos, el plazo de 2 días, `COBRO_CONSULTAS_ACTIVO` (sigue en `true`), DeepSeek, el hero del 80% / dólar, dominio, reproductor (salvo que el póster público mejore solo al cambiar el tamaño), trato, avatares, álbumes, consola de admin más allá del disparador puntual de portadas, «Anonimizar», el desempeño por clip de la 06.

#### Criterios de aceptación
1. En el catálogo y en la ficha, sin pagar, la portada se ve clara a ~240 px, no como una mancha de 32 px. La copia de ~720 px no está en el bucket público. Quien compra sigue viendo la nítida.
2. Las portadas que ya existían con copia nítida se regeneraron; las que no tenían nítida se omitieron sin inventar nada.
3. Los videos que estaban en 2.40 quedaron en 10, 20 o 40 dólares, repartidos (no todos el mismo). Los álbumes, los clips gratis y cualquier precio distinto de 2.40 no se movieron. Publicar un video de pago ofrece 10 / 20 / 40 y arranca en 20.
4. Typecheck, build y lint limpios (solo advertencias que ya existían). Ningún secreto en el repo.

#### Cómo demostrar (obligatorio en bridge-query.md)
SHA, diff resumido, y:
- **Portadas.** `ANCHO_PUBLICO === 240`. Una portada pública nueva (o regenerada) mide ~240 px de ancho, no 32 ni 720. Un clip de prueba sin copia nítida no se inventa. `anon` sigue sin leer `clip-covers-full`.
- **Precios.** Conteo antes/después: cuántos videos pasaron de 240 a 1000 / 2000 / 4000; cuántos álbumes, gratis u otros precios se quedaron igual (0 cambiados). El formulario muestra los tres botones y el valor inicial 20. Correr la migración otra vez no cambia filas.
- No marques `CHECKLIST.md` como pass.

#### Siguiente paso para Claude Code
1. Si `20261107-06` sigue pendiente, `git pull` e impleméntala primero; márcala `respondida`.
2. `git pull` de `origin/main`. Implementa esta ronda. Commit de producto, p. ej. `feat: portadas publicas mas nitidas y precios de 10 20 o 40`; `git push origin main`. Aplica la migración de precios en producción y corre el relleno de portadas con la aprobación de Omar, como en las rondas anteriores.
3. Marca `bridge-query.md` `[id: 20261107-07]` como `respondida` con SHA, diff y verificación. **No** marques `CHECKLIST.md` como pass.

### Respuesta a [id: 20261107-06] — Desempeño por clip en el Estudio (lo ganado)
- **fecha:** 2026-11-07 21:46 (America/Mexico_City)
- **estado:** lista-para-claude
- **responde a:** Sergio pidió armar en el Estudio el desempeño por clip, empezando por lo ganado. Las vistas y el mapa de reproducción no se graban hoy: no los inventes ni empieces a registrarlos en esta ronda.
- **ronda:** 1 de 10 de esta tarea · **tope:** 1 hora
- **checklist afectados (NO marques pass tú):** convenciones de UI del Estudio si tocas esa pantalla. No rompas ítems `pass` ni el trabajo de las rondas 4–7 ni `20261107-01` a `20261107-05`.

#### Orden respecto a rondas anteriores
No reabras `[id: 20261106-04]`, `[id: 20261106-05]`, `[id: 20261106-06]`, `[id: 20261106-07]`, `[id: 20261107-01]`, `[id: 20261107-02]`, `[id: 20261107-03]`, `[id: 20261107-04]` ni `[id: 20261107-05]` (esa ya está hecha, desplegada y aplicada). Esta ronda va en su propio commit. No toques legales, recargas, dominio, reproductor, trato, avatares, el cobro de consultas (precio, plazo, `COBRO_CONSULTAS_ACTIVO` se queda encendido) ni el panel de administración.

#### Diagnóstico (no lo reescribas: úsalo)
1. El Estudio (`src/screens/Estudio.tsx`) muestra un solo «Has ganado» que sale de `resumen()` en `src/lib/estudio.ts`: suma los `delta` positivos de `venta_clip`, `propina` y `venta_consulta`. No hay lista por publicación. `/earnings` solo redirige a `/wallet`.
2. `venta_clip` no significa «venta de un clip». El mismo motivo sirve para: desbloqueo (`ref_id` = clip), renta (`ref_id` = clip, nota `Renta: …`), suscripción (`ref_id` = el nivel), y encargo entregado (`ref_id` = el encargo). Si agrupas todo `venta_clip` por `ref_id` van a aparecer filas que no son clips (un nivel o un encargo). Solo une movimientos cuyo `ref_id` sea el `id` de un clip **suyo**.
3. `venta_consulta.ref_id` es el mensaje, no el clip. El hilo (`consultas.clip_id`) sí apunta al clip. `consulta_mensajes` está revocado para `anon` y `authenticated`: el navegador no puede hacer ese cruce. Hace falta una función de la base.
4. Las propinas de un clip guardan `ref_id` = ese clip (`dar_propina` con la referencia). Las del perfil suelen ir sin `ref_id`: no las atribuyas a un clip.
5. La plataforma **no registra visitas** ni progreso del reproductor. No inventes vistas, porcentaje visto ni mapa de momentos. No empieces a grabarlos.

#### Qué construir
Una sección en el **mismo** Estudio, debajo de la tarjeta «Has ganado» y encima de Telegram / la bandeja, titulada **«Lo que dejó cada publicación»**.

1. **Función de la base** (p. ej. `estudio_desempeno_clips()`), `security definer`, `search_path = ''`, solo para quien está autenticado:
   - Devuelve **únicamente** clips con `creator_id = auth.uid()`. Un admin que no sea la dueña no ve los de otra cuenta por esta función (su panel ya existe aparte).
   - Una fila por clip propio que exista todavía (video o álbum, `formato`). Incluye los no publicados, para que vea también los que aún no salen. No inventes filas huérfanas a partir de un `ref_id` que ya no tiene clip: ese dinero sigue en «Has ganado».
   - Columnas mínimas: `id`, `title`, `cover_path`, `formato`, `published`, `price_coins`, `desbloqueos` (conteo en `purchases` de ese clip), `rentas` (conteo en `rentals` de ese clip), `ganado_ventas` (suma de *sus* `venta_clip` con `ref_id` = el clip; entra desbloqueo y renta, no suscripciones ni encargos), `ganado_propinas` (suma de *sus* `propina` con `delta > 0` y `ref_id` = el clip), `ganado_consultas` (suma de *sus* `venta_consulta` cuyo `ref_id` es un `consulta_mensajes.id` del hilo de ese clip), `consultas_pagadas` (cuántas de esas ventas de consulta), `ganado_total` (las tres sumas). Todo en centavos, como el resto del libro.
   - No devuelvas compradores, `user_id` ajenos, `chat_id`, teléfonos, cuerpos de mensaje, tokens ni datos de Telegram.
   - `revoke` a `public`/`anon`; `grant execute` a `authenticated`. Comprueba que `anon` no pueda llamarla y que otra cuenta no vea clips ajenos.
   - Orden: `ganado_total` descendente, y a igualdad los más recientes primero.

2. **Front.** Un helper en `src/lib/estudio.ts` que llame esa función. En `Estudio.tsx`, la lista con el mismo aire sobrio del Estudio (fondo plano, tipografía de interfaz, `usd()` para los centavos; no el entero crudo). Cada fila: portada con el mismo recorte que ya usas en el catálogo o la ficha (`cover_path`; no inventes otro pipeline), título, si es video o álbum, si aún no está publicado, el total ganado, y debajo un desglose corto solo con lo que no sea cero (p. ej. «3 desbloqueos · 1 renta · 2 consultas» y propinas si las hay). Un toque abre `/clip/:id`.
   - Sin clips: «Cuando publiques un video o un álbum, aquí verás cuánto dejó cada uno.» No muestres una tabla vacía.
   - Con clips en cero: sí listarlos; sirve ver cuáles no han dejado nada.
   - Nota corta bajo la lista, porque «Has ganado» no va a cuadrar con la suma de esta lista: «Las suscripciones, los encargos y las propinas de tu perfil no aparecen aquí porque no van atadas a un clip. Sí cuentan en “Has ganado”.»
   - No cambies el cálculo de «Has ganado». No añadas esta lista al monedero ni al panel de administración.

#### Qué no tocar
Textos legales, recargas o pasarela, token o secretos, el precio de 20 pesos, el plazo de 2 días, `COBRO_CONSULTAS_ACTIVO` (sigue en `true`), DeepSeek, el hero del 80% / dólar, dominio, reproductor (ni un contador de progreso), trato, avatares, álbumes más allá de listarlos si ya son un clip con `formato`, consola de admin, «Anonimizar».

#### Criterios de aceptación
1. En el Estudio se ve, por cada video o álbum propio, cuánto se ganó (lo que llegó a la cuenta, ya sin la comisión) y cuántos desbloqueos, rentas y consultas pagadas respondidas le corresponden.
2. Una suscripción o un encargo no aparecen como si fueran un clip. Una propina del perfil no se cuelga de un clip. Una consulta pagada y respondida sí se suma al clip del hilo.
3. No hay cifras de visitas ni de reproducción. Typecheck, build y lint limpios (solo advertencias que ya existían). Nadie ve los clips ni las cifras de otra cuenta por este camino.

#### Cómo demostrar (obligatorio en bridge-query.md)
SHA, diff resumido, y verificación en SQL: una cuenta con dos clips (venta/renta/propina/consulta en el A, solo desbloqueo en el B), más una suscripción, un encargo y una propina de perfil; el A y el B cuadran y lo demás no se cuela en la lista; otra cuenta recibe 0 filas ajenas; `anon` no tiene permiso. En el front: la sección se ve, `usd()` se usa, el vacío se entiende, la nota de «Has ganado» está. No marques `CHECKLIST.md` como pass.

#### Siguiente paso para Claude Code
1. `git pull` de `origin/main`.
2. Implementa esta ronda. Commit de producto, p. ej. `feat: desempeno por clip en el Estudio`; `git push origin main`. Aplica la migración en producción con la aprobación de Omar, como en las rondas anteriores.
3. Marca `bridge-query.md` `[id: 20261107-06]` como `respondida` con SHA, diff y verificación. **No** marques `CHECKLIST.md` como pass.

### Respuesta a [id: 20261107-05] — Vencimiento de consultas por reloj e ingresos de consultas en el panel
- **fecha:** 2026-11-07 21:18 (America/Mexico_City)
- **estado:** lista-para-claude
- **responde a:** Al cerrar la 04, Claude avisó de dos huecos: la devolución es perezosa (solo cuando alguien le habla al bot) y el panel no ve `venta_consulta`. Sergio pidió seguir con más cosas; esto cierra el cobro que acabamos de encender, sin inventar recargas ni legales.
- **ronda:** 1 de 10 de esta tarea · **tope:** 1 hora
- **checklist afectados (NO marques pass tú):** no inventes textos legales. No rompas ítems `pass` ni el trabajo de las rondas 4–7 ni `20261107-01` a `20261107-04`.

#### Orden respecto a rondas anteriores
No reabras `[id: 20261106-04]`, `[id: 20261106-05]`, `[id: 20261106-06]`, `[id: 20261106-07]`, `[id: 20261107-01]`, `[id: 20261107-02]`, `[id: 20261107-03]` ni `[id: 20261107-04]`. Esta ronda va en su propio commit (o los que hagan falta: función + workflow, y la de finanzas si va aparte). No toques legales, recargas, dominio, reproductor, trato, avatares ni el cobro en sí (precio, plazo, `COBRO_CONSULTAS_ACTIVO` se queda encendido).

#### Diagnóstico (no lo reescribas: úsalo)
1. **Vencimiento perezoso.** `avisarVencidos` en `supabase/functions/telegram-bot/index.ts` llama `consultas_vencer` y avisa por Telegram, pero solo al recibir un POST válido del webhook (un mensaje privado). Si nadie le habla al bot, un mensaje puede llevar más de 2 días vencido sin devolver el saldo ni avisar, aunque la web ya lo muestre vencido. La devolución es idempotente (solo filas que pasan de `enviado` a `vencido`).
2. **Ya hay un reloj.** `.github/workflows/tareas.yml` corre cada 2 horas, en el minuto 7, con `workflow_dispatch` para probar. Cada paso manda `POST` con la cabecera `x-cron-secret` y el secreto `CRON_SECRET` (Actions y Supabase Edge Functions -> Secrets). Ese secreto **ya existe**; las funciones `avisar-retiro`, `avisar-creadora`, `avisar-verificacion` y `borrar-verificacion` lo leen con `Deno.env.get('CRON_SECRET')` y comparan en tiempo constante. El camino principal de esos avisos es pg_net; el workflow es red de seguridad. Aquí el reloj **sí es el camino principal**, porque no hay un disparador por tiempo sobre `vence_at`.
3. **El panel se quedó corto.** `admin_finanzas`, el ranking y «total ganado» de Usuarios enumeran a mano `venta_clip` y `propina`. No suman `venta_consulta`, así que la comisión y el reparto de las consultas no aparecen en Finanzas. El Estudio sí suma `venta_consulta` en «Has ganado» (`src/lib/estudio.ts`). El brief de la 04 pedía no tocar el panel; ahora sí.

#### 1. Vencer por reloj
1. Añade un paso al **mismo** trabajo de `tareas.yml` (no un workflow nuevo), con `if: always()` como los otros, que llame a una función de vencimiento. El minuto 7 / cada 2 horas no se cambia. Si no hay nada vencido, responde `ok: true` para que el `grep` del workflow no se ponga rojo (igual que «nada nuevo» en los avisos).
2. Reutiliza el patrón de `avisar-retiro`: cabecera `x-cron-secret`, secreto `CRON_SECRET`. **No inventes otro secreto. No lo escribas en el repo, el front, un comentario ni un commit.** En Supabase los secretos del proyecto ya los ven todas las funciones; no pidas uno nuevo salvo que compruebes que `CRON_SECRET` no está (entonces indica a Omar que copie el que ya usa Actions, sin pegarlo en el puente).
3. Prefiere una función nueva (p. ej. `vencer-consultas`) en vez de mezclar el cron con el webhook de Telegram: ese webhook autentica con `x-telegram-bot-api-secret-token` y no hay que cruzar los dos caminos. La función nueva hace lo mismo que `avisarVencidos`: llama `consultas_vencer` y, si hubo devolución o vencimiento, avisa por Telegram con los mismos textos que ya usa el bot (al cliente le dice que se le devolvió el saldo solo si `devuelto_coins > 0`). Para hablarle a Telegram usa `TELEGRAM_BOT_TOKEN`, que ya es secreto del proyecto; no lo registres, no lo imprimas.
4. Deja también la llamada perezosa dentro de `telegram-bot` (red de seguridad). Como `consultas_vencer` solo actúa una vez por fila, no hay doble cobro ni doble aviso.
5. No uses la llave de servicio fuera de Supabase. El workflow no debe llevar `SERVICE_ROLE`.
6. Despliega la función nueva y el workflow. Prueba con «Run workflow» si puedes, o deja dicho cómo verificarlo.

#### 2. Ingresos de consultas en el panel
1. Donde Finanzas, el ranking o «total ganado» de Usuarios listen a mano `venta_clip` y `propina`, incluye también `venta_consulta`. La comisión de esas ventas debe entrar en las cifras de comisión / reparto con la misma lógica que las de un clip (el abono a la creadora ya es el 80%; la comisión es el resto, como en el resto de Finanzas).
2. No cuentes el cargo `consulta` del cliente como ingreso de la plataforma ni como «ganado» de nadie. El `reembolso` sigue siendo movimiento de cuenta, no venta.
3. No inventes pantallas, menús ni exportaciones nuevas. Si el CSV de Finanzas sale de las mismas cifras, quedará bien al corregir la fuente. No toques Retiros ni datos de CLABE / RFC.

#### Qué no tocar
Textos legales, recargas o pasarela, token o secretos (nunca en el repo), el precio de 20 pesos, el plazo de 2 días, `COBRO_CONSULTAS_ACTIVO` (sigue en `true`), DeepSeek, el hero del 80% / dólar, dominio, reproductor, trato, avatares, álbumes, la consola de consultas más allá de lo que ya muestra.

#### Criterios de aceptación
1. Un mensaje pagado vencido se marca, se reembolsa y se avisa aunque nadie le haya escrito al bot desde entonces; basta el paso programado (o «Run workflow»).
2. Correr el vencimiento dos veces no devuelve dos veces ni avisa dos veces.
3. Finanzas y «total ganado» / ranking incluyen lo de `venta_consulta` y su comisión; no incluyen el gasto `consulta` del cliente como ingreso.
4. Ningún secreto nuevo aparece en el repo. Typecheck, build y lint limpios (solo advertencias que ya existían).

#### Cómo demostrar (obligatorio en bridge-query.md)
SHA, diff resumido, y verificación: el paso nuevo en `tareas.yml`; cómo autentica la función (sin pegar el secreto); que `consultas_vencer` + avisos corren desde ese camino; que una segunda pasada no duplica; que Finanzas / ranking / total ganado ya suman `venta_consulta`. No marques `CHECKLIST.md` como pass.

#### Siguiente paso para Claude Code
1. `git pull` de `origin/main`.
2. Implementa esta ronda. Commit de producto, p. ej. `feat: vencer consultas por reloj y sumarlas en finanzas`; `git push origin main`. Despliega la función nueva. El workflow usa el `CRON_SECRET` que ya está en Actions.
3. Marca `bridge-query.md` `[id: 20261107-05]` como `respondida` con SHA, diff y verificación. **No** marques `CHECKLIST.md` como pass.

### Respuesta a [id: 20261107-04] — Cobro de consultas y devolución del saldo si no hay respuesta en 2 días
- **fecha:** 2026-11-07 20:57 (America/Mexico_City)
- **estado:** lista-para-claude
- **responde a:** Sergio decidió: si la creadora no responde un mensaje pagado en 2 días, se le devuelve el saldo al cliente. Con eso se puede encender el cobro que ya estaba reservado.
- **ronda:** 1 de 10 de esta tarea · **tope:** 1 hora
- **checklist afectados (NO marques pass tú):** no inventes textos legales. No rompas ítems `pass` ni el trabajo de las rondas 4, 5, 6, 7, `20261107-01`, `20261107-02` ni `20261107-03`.

#### Orden respecto a rondas anteriores
No reabras `[id: 20261106-04]`, `[id: 20261106-05]`, `[id: 20261106-06]`, `[id: 20261106-07]`, `[id: 20261107-01]` ni `[id: 20261107-02]`. Si `[id: 20261107-03]` sigue pendiente, termínala primero y no la mezcles con esta: esta ronda va después, en su propio commit. No toques legales, dominio, reproductor, trato ni el panel de administración (salvo, si hace falta, el nombre visible de un motivo nuevo en el monedero).

#### Decisión de Sergio (no la reinterpretar)
Si la creadora no responde un mensaje pagado de consulta por Telegram en 2 días, se le devuelve el saldo al cliente. El plazo de 2 días no cambia. El precio sigue siendo `PRECIO_CONSULTA_TELEGRAM` (20 pesos por mensaje del cliente).

#### Diagnóstico (no lo reescribas: úsalo)
1. La migración `20261124000000_consultas_telegram.sql` dejó el circuito listo y escribió dónde enganchar: «Cuando se decida, se engancha en `bot_registrar_cliente` (cobro) y en `consultas_vencer` (reembolso).» Hoy `cobro_coins` queda en cero y `consultas_config.cobro_activo` en falso. El comentario de `bot_registrar_cliente` dice «AQUI va el cobro»; el de `consultas_vencer` dice «Cuando exista el cobro, aqui se reembolsa.»
2. `coin_ledger` no tenía un motivo para este gasto (el ledger solo deja gastar con ciertos motivos). Sí existe el motivo `reembolso`. `src/lib/monedero.ts` enumera: `recarga`, `compra_clip`, `venta_clip`, `propina`, `ajuste_admin`, `reembolso`, `retiro`. No reutilices `compra_clip` ni `venta_clip` para una consulta: no es un desbloqueo de clip.
3. El tipo de cambio ya no está pendiente: `ajustes.tipo_cambio_usd_mxn` vale 1850, es decir 18.50 MXN por USD. Todo se guarda en centavos de dólar (las columnas se siguen llamando `*_coins`; ver `src/lib/dinero.ts`). 1 coin = 1 centavo de dólar. Convierte 20.00 MXN a centavos de dólar con ese tipo de cambio y el mismo redondeo al centavo más cercano que ya usa el resto del dinero. No inventes otra tasa.
4. `bot_anular_mensaje` borra el mensaje del cliente si Telegram no pudo entregarlo (`tg_msg_id is null`). Si cobraste al registrarlo, esa anulación tiene que deshacer el cobro. Si no, cobra solo cuando el mensaje ya quedó entregado, pero entonces `consultas_vencer` y el registro tienen que saber el monto.
5. `avisarVencidos` en `supabase/functions/telegram-bot/index.ts` hoy le dice al cliente que ella no respondió y que ya no está pendiente. No menciona devolución de saldo. `COBRO_CONSULTAS_ACTIVO` en `src/content/consultas.ts` sigue en `false` (el comentario viejo habla de la equivalencia coins↔pesos; eso ya no bloquea).
6. Recargar saldo desde la web todavía no se puede: no hay procesador de pagos compatible con este giro. No inventes recargas, pasarela ni SPEI de entrada.

#### 1. Cobrar al enviar, retener, devolver o repartir
1. Añade los motivos que falten en el ledger (y su nombre visible en `NOMBRE_MOTIVO`) para el gasto del cliente y, si hace falta, para lo que reciba la creadora al responder. El reembolso puede usar el motivo `reembolso` que ya existe. Cada movimiento lleva `ref_id` al mensaje (o a la consulta) para poder auditarlo.
2. Guarda en `consulta_mensajes.cobro_coins` el monto exacto que se le cobró al cliente en esa operación (centavos de dólar). El reembolso devuelve **ese** monto, no una conversión nueva si el tipo de cambio cambió después.
3. Cobra cuando el mensaje del cliente queda registrado y se va a entregar. Si no tiene saldo suficiente, **no** se registra ni se envía: avísale con una frase corta (no tiene saldo suficiente para este mensaje). No le prometas que puede recargar: esa pantalla todavía no recarga.
4. Entre el envío y la respuesta o el vencimiento, **retén** el cobro: no se lo acredites a la creadora ni tomes la comisión todavía. Si ya hay un patrón de retención (encargos: el dinero queda retenido hasta entregar), reúsalo; no inventes otra caja.
5. Si ella responde a tiempo: aplica el reparto de siempre, comisión **20%** / creadora **80%**, con la misma función de reparto que ya usan las ventas (no inventes otro redondeo). El cliente no recibe nada de vuelta: pagó por ese mensaje y esa respuesta.
6. Si vence sin respuesta (`consultas_vencer`): marca el mensaje `vencido` como hoy y **devuelve el 100%** de `cobro_coins` al saldo del cliente, una sola vez (solo filas que pasan de `enviado` a `vencido` con `cobro_coins > 0`). No le desconte nada a la creadora: nunca se lo acreditaste.
7. Si `bot_anular_mensaje` borra un mensaje ya cobrado, deshaz el cobro (el cliente no debe perder saldo por un mensaje que no se entregó).
8. Mensajes viejos con `cobro_coins = 0` no generan reembolso ni cargo retroactivo.
9. Enciende `consultas_config.cobro_activo` y `COBRO_CONSULTAS_ACTIVO` (ponlos de acuerdo). Con eso, el botón de consultar de una ficha ya puede mostrar el precio, como ya preveía `consultas.ts`. No inventes otra pasarela: se cobra del saldo de la cuenta, que es lo que Sergio confirmó.

#### 2. Decírselo al cliente (sin inventar legales)
1. En `/consultas`, en la regla 5 (Plazo) o pegado a ella, añade la decisión de Sergio con sus palabras: si la creadora no responde en esos 2 días, se le devuelve el saldo al cliente. No escribas un apartado nuevo de «política de reembolsos», no toques `/privacidad` ni `/terminos`, no inventes plazos distintos ni excepciones.
2. En `avisarVencidos`, si de verdad se devolvió saldo, díselo al cliente en la misma notificación (una frase: se le devolvió el saldo). Si el mensaje vencido no tenía cobro (`cobro_coins = 0`), deja el aviso como está. A la creadora sigue bastando saber que se venció el plazo.
3. Si hace falta, una mención breve del mismo hecho en la tarjeta de Precios o el recuadro de `/creadoras` está bien, usando la misma idea, no un texto legal distinto.

#### Qué no tocar
Textos legales (`PENDIENTES_ABOGADO`, `/privacidad`, `/terminos`), token o secretos de Telegram (nunca en el repo, el front ni un commit), DeepSeek (sigue solo validando), el plazo de 2 días, el precio de 20 pesos, recargas o un procesador de pagos nuevo, el hero del 80% / dólar, dominio (`public/CNAME`), reproductor, trato, panel (más allá del nombre de un motivo), avatares, álbumes.

#### Criterios de aceptación
1. Un mensaje del cliente con cobro activo y saldo suficiente descuenta del saldo el equivalente de 20 pesos (tipo de cambio vigente, redondeo de siempre) y guarda ese monto en `cobro_coins`.
2. Si no hay saldo suficiente, el mensaje no se envía y no se descuenta nada.
3. Si ella no responde en 2 días, `consultas_vencer` le devuelve al cliente exactamente `cobro_coins`, una sola vez, y el bot se lo dice.
4. Si ella responde a tiempo, no hay devolución; ella recibe el 80% y la plataforma el 20%, con el reparto de siempre.
5. Si Telegram no entrega el mensaje y se anula, el cliente no pierde el saldo.
6. En `/consultas` se lee que, si no hay respuesta en 2 días, se devuelve el saldo al cliente. No se tocaron páginas legales.
7. Typecheck, build y lint limpios (solo advertencias que ya existían).

#### Cómo demostrar (obligatorio en bridge-query.md)
SHA, diff resumido, y verificación: la conversión 20 MXN → centavos; que el cobro, la retención, el reembolso y el reparto al responder hacen lo de arriba (prueba SQL o caso equivalente); que anular no deja el cargo; que `/consultas` menciona la devolución; que no se inventó recarga ni se tocó un secreto. No marques `CHECKLIST.md` como pass.

#### Siguiente paso para Claude Code
1. `git pull` de `origin/main`.
2. Si `20261107-03` no está `respondida`, termínala primero.
3. Implementa esta ronda. Commit de producto, p. ej. `feat: cobro de consultas y devolucion del saldo si no hay respuesta`; `git push origin main`. Aplica la migración en producción cuando Omar lo autorice, igual que las anteriores.
4. Marca `bridge-query.md` `[id: 20261107-04]` como `respondida` con SHA, diff y verificación. **No** marques `CHECKLIST.md` como pass.

### Respuesta a [id: 20261107-03] — Precio de las consultas en portada y avatar solo tras revisión
- **fecha:** 2026-11-07 20:50 (America/Mexico_City)
- **estado:** lista-para-claude
- **responde a:** Sergio pidió atacar lo que falta ahora mismo. De lo inmediato, esto sí se puede hacer sin inventar textos legales ni reglas de reembolso: que se vea el precio de 20 pesos donde ya se anuncian las consultas, y que un cuadro del video no se vuelva foto de perfil pública antes de una revisión.
- **ronda:** 1 de 10 de esta tarea · **tope:** 1 hora
- **checklist afectados (NO marques pass tú):** convenciones de UI si tocas la portada. No rompas ítems `pass` ni el trabajo de las rondas 4, 5, 6, 7, `20261107-01` ni `20261107-02`.

#### Orden respecto a rondas anteriores
No reabras `[id: 20261106-04]`, `[id: 20261106-05]`, `[id: 20261106-06]`, `[id: 20261106-07]`, `[id: 20261107-01]` ni `[id: 20261107-02]`. Esta ronda va en su propio commit. No mezcles legales, cobro de consultas, reproductor, dominio ni panel de administración.

#### Diagnóstico (no lo reescribas: úsalo)
1. **Precio de consultas.** Sergio fijó 20 pesos por mensaje del cliente. Vive en `PRECIO_CONSULTA_TELEGRAM` (`src/content/consultas.ts`) y ya se lee en `/consultas`. En «Precios y formas de ganar» la tarjeta dice solo: «Pagas por cada mensaje y la creadora responde en un máximo de 2 días.» (`FORMAS_NEON` en `src/content/portada.ts`). En `/creadoras` el recuadro habla de «mensaje pagado» y del tope de 2 días, y el comentario del archivo dice que el precio vive en `/consultas` (`src/screens/Creators.tsx`). Quien solo mira la portada o la oferta no ve cuánto cuesta.
2. **«El 80% de cada dólar»** (hero de `Portal.tsx`, gancho de `/entrar`) NO se cambia: las ventas de clips son la economía en dólares de la app; el SPEI se dispersa en pesos. Mezclar eso con los 20 pesos de una consulta sería mentir. No lo reescribas a «pesos».
3. **`/entrar` no está roto.** Es la puerta a propósito (`Entrar.tsx`): no pide datos. Los campos de correo, contraseña y «Entrar con liga» están en `/acceso` y `/registro` (`Acceso.tsx`). No muevas el formulario a `/entrar`.
4. **Avatar al subir.** Si la creadora no tiene `avatar_path`, `Upload.tsx` llama `asignarAvatarSiFalta` (`src/lib/avatarAuto.ts`) justo después de `crearClip` (que inserta con `published: true`). El cuadro más limpio del video se sube al bucket público `avatars` y se escribe en el perfil **antes** de que administración modere el clip. La heurística no sabe si el cuadro es explícito. El relleno viejo de Herramientas (`AvatarAuto.tsx`) sí exige confirmación humana; el atajo al subir se la salta. No se tocan fotos que la persona ya subió a propósito (`avatar_path` no nulo).

#### 1. Mostrar los 20 pesos
1. En la tarjeta «Consultas por Telegram» de `FORMAS_NEON`, incluye el precio usando `PRECIO_CONSULTA_TELEGRAM` (impórtalo; no lo copies como texto suelto). Una frase natural, por ejemplo que cada mensaje del cliente cuesta 20 pesos y ella responde en un máximo de 2 días. Conserva el enlace a `/consultas`.
2. En el recuadro de consultas de `/creadoras`, menciona el mismo precio con la misma constante (p. ej. junto a «mensaje pagado» o al tope de 2 días). No reescribas las reglas ni inventes reembolsos.
3. `COBRO_CONSULTAS_ACTIVO` sigue en `false`. No lo enciendas. No pongas el precio en el botón de consultar de una ficha si ese botón, por esa bandera, todavía no debe prometer cobro (`consultas.ts` lo dice). No inventes copy de pago, cargo ni devolución.

#### 2. No publicar el avatar automático antes de revisarlo
1. Quita de `Upload.tsx` la llamada a `asignarAvatarSiFalta` (y el paso «Preparando tu foto de perfil…» que solo existía por eso). Al terminar de subir, si no tenía foto, se queda la inicial. El clip se crea igual.
2. No asignes el avatar en automático al aprobar el clip en Moderación: sería el mismo riesgo, solo más tarde. La revisión sigue en Herramientas → avatares faltantes (`AvatarAuto.tsx`), que ya no publica nada hasta confirmar.
3. No borres avatares que ya estén puestos. No corras el relleno masivo. No subas un cuadro «en espera» a un bucket público. Si `asignarAvatarSiFalta` queda sin usos, puedes dejarlo o retirarlo; no lo llames desde otro sitio.
4. Los álbumes no llaman esta función hoy: no la agregues ahí.

#### Qué no tocar
Textos legales, comisión 20% / SPEI / 18+, el hero del 80% ni «dólar», el formulario de `/acceso` y `/registro`, token o secretos de Telegram, el cobro de consultas, el dominio (`public/CNAME` y rawstudio.mx), reproductor, trato, panel de administración, redes sociales.

#### Criterios de aceptación
1. En Precios (tarjeta de consultas) y en el recuadro de `/creadoras` se lee que cada mensaje cuesta 20 pesos, salido de `PRECIO_CONSULTA_TELEGRAM`.
2. Subir un video ya no escribe `avatar_path` ni sube un jpg al bucket `avatars`.
3. `COBRO_CONSULTAS_ACTIVO` sigue en `false`. El 80% / dólar no cambió.
4. Typecheck, build y lint limpios (solo advertencias que ya existían).

#### Cómo demostrar (obligatorio en bridge-query.md)
SHA, diff resumido, y verificación: texto de la tarjeta y del recuadro; que `Upload.tsx` ya no llama `asignarAvatarSiFalta`; que no hay un nuevo llamado automático al aprobar; que no se encendió el cobro. No marques `CHECKLIST.md` como pass.

#### Siguiente paso para Claude Code
1. `git pull` de `origin/main`.
2. Implementa esta ronda. Commit de producto, p. ej. `fix: precio de consultas visible y avatar automatico solo tras revision`; `git push origin main`.
3. Marca `bridge-query.md` `[id: 20261107-03]` como `respondida` con SHA, diff y verificación. **No** marques `CHECKLIST.md` como pass.

### Respuesta a [id: 20261107-02] — Ronda 2/10 · Panel de administración: búsqueda, urgencia, bitácora reciente, avatares y exportar
- **fecha:** 2026-11-07 20:26 (America/Mexico_City)
- **estado:** lista-para-claude
- **responde a:** Sergio confirmó la lista priorizada: lo que más le sirve ahora, sin inventar visitas ni rehacer el panel, es búsqueda general, actividad reciente de la bitácora en el Resumen, urgencia (no solo el número), traer a la portada los avatares que esperan revisión, y exportar finanzas y retiros.
- **ronda:** 2 de 10 de esta tarea · **tope:** 1 hora · si el tope se queda corto, deja dos commits de ESTA misma ronda (primero búsqueda + Resumen: urgencia, bitácora y avatares; después exportar). No dejes a medias ni pases la mitad a otra ronda.
- **checklist afectados (NO marques pass tú):** convenciones de UI si tocas el marco del panel. No rompas ítems `pass` ni el trabajo de las rondas 4, 5, 6, 7 ni `[id: 20261107-01]`.

#### Orden respecto a rondas anteriores
No reabras `[id: 20261106-04]`, `[id: 20261106-05]`, `[id: 20261106-06]`, `[id: 20261106-07]` ni `[id: 20261107-01]` (esa ya está hecha y respondida). Esta ronda va en su propio commit (o en los dos de arriba). No mezcles este trabajo con álbumes, avatares automáticos (más allá de mostrar el conteo y el enlace), trato, landing, reproductor, legales, cobro de consultas ni analítica de vistas para creadoras.

#### Diagnóstico (no lo reescribas: úsalo)
La ronda 20261107-01 ya dejó portada Resumen (`src/admin/Resumen.tsx`), menú agrupado, badges compartidos (`pendientes.ts`), consola `/admin/consultas` y las cuatro correcciones. El Resumen muestra conteos de colas, dinero de 30 días y almacenamiento; no muestra qué pasó hace poco, ni qué lleva mucho tiempo esperando, ni los avatares sin foto. La búsqueda existe dentro de Usuarios y de Consultas, pero no hay una búsqueda general desde cualquier pantalla. Finanzas y Retiros se consultan en pantalla; no se pueden bajar como archivo. El panel sigue siendo de escritorio (`ANCHO_MINIMO = 1280`): no lo hagas responsivo. Reutiliza `piezas.tsx`, `pendientes.ts` y las RPC que ya existen; no rehagas tablas ni confirmaciones.

**No inventes métricas.** Sigue sin haber registro de visitas: no pongas vistas, conversión, embudo ni «usuarios nuevos hoy». El desempeño de clips para creadoras (ventas por video, mapas de momentos vistos) NO entra en esta ronda: es una función del Estudio, aparte.

Sobre dinero: ya existe `ajustes.tipo_cambio_usd_mxn` (1850 = 18.50 MXN por dólar; 1 coin = 1 centavo de dólar). Distingue siempre el reparto interno en dólares de lo realmente dispersado en pesos. No presentes devengado como transferencia hecha.

#### 1. Búsqueda general
1. Desde cualquier pantalla del panel, poder ir directo a una cuenta, un clip o una consulta. Un campo siempre visible en el marco o una paleta al estilo profesional (`Ctrl+K` / `Cmd+K`, y también un control clicable: no dependas solo del atajo).
2. Resultados agrupados: Personas, Contenido, Consultas. Un clic lleva al destino (ficha de usuario, clip en Contenido o Moderación según encaje, hilo en `/admin/consultas`). Si la ruta actual no acepta un identificador, añade un parámetro de consulta o reutiliza la búsqueda de esa pantalla: no inventes un cuarto tipo de entidad.
3. Busca por handle, nombre visible, correo (en personas, como ya hace Usuarios), título o id de clip, y handle o título de clip en consultas. Debounce, vacío claro («Nada coincide con …») y estado de carga.
4. **Privacidad:** las RPC nuevas son `security definer` y solo `es_admin()`. No devuelvas `chat_id`, teléfono, token ni secretos. De consultas, el mismo criterio que la consola: handle público o «Cuenta eliminada».
5. Un solo lote por búsqueda, no una query por grupo cada tecla.

#### 2. Actividad reciente en el Resumen
1. Debajo de «Por atender» (o justo después de las tarjetas de atención, antes o después de Dinero: que no empuje las colas fuera de la primera mirada), muestra las últimas acciones de la bitácora que YA se registran: quién, qué, cuándo (8 a 10 renglones).
2. Reutiliza la fuente de `Bitacora.tsx` / su RPC. No inventes nombres de acciones ni completes huecos.
3. Un enlace «Ver bitácora →» a `/admin/bitacora`. Si no hay filas: «Todavía no hay acciones registradas.»

#### 3. Urgencia, no solo el número
1. En las tarjetas del Resumen (y, si encaja sin ruido, en el texto accesible del badge) añade contexto de tiempo con timestamps reales:
   - clips pendientes de moderación que llevan más de 24 horas;
   - consultas esperando respuesta que se acercan al tope de 2 días (menos de 12 horas para vencer) y las que ya vencieron (eso último ya se muestra: consérvalo).
2. Si hace falta una RPC nueva (p. ej. ampliar el lote de `pendientes.ts`), que calcule desde fechas guardadas. No adivines edades. No cambies la regla de negocio de los 2 días.
3. Frases claras, al estilo del Resumen actual: «3 pendientes · el más antiguo lleva 2 días» o «1 se vence en menos de 12 horas». Si todo es reciente, no inventes alarma: basta el número que ya está.
4. Identidades, denuncias y retiros: si ya tienes fecha de llegada en la misma consulta, puedes mostrar la misma idea («el más antiguo lleva…»); si no, no inventes un campo ni dispares otra query solo para eso.

#### 4. Avatares que esperan revisión, en la portada
1. Nueva tarjeta en «Por atender» que lleve a Herramientas (donde vive `AvatarAuto.tsx`): creadoras (`is_creator`, no vetadas) con `avatar_path` nulo y al menos un clip publicado con video. Ese es el lote que hoy se busca al pulsar «Buscar creadoras sin foto».
2. Cuenta real vía el lote de pendientes o una RPC `es_admin` (no recorroas perfiles desde el Resumen ni generes cuadros aquí).
3. **No publiques avatares, no corras el relleno automático, no apliques propuestas.** El avatar es público y la heurística no sabe qué hay en el cuadro: la revisión sigue siendo manual en Herramientas.
4. Vacío claro: «Ninguna creadora sin foto con video publicado» (o la frase equivalente). No cuentes como pendientes a quienes no tienen video (esas se quedan con la inicial, sin propuesta).

#### 5. Exportar finanzas y retiros
1. En Finanzas: un control para descargar un CSV del rango Desde/Hasta que ya está elegido, con las mismas cifras que ves en pantalla (bruto, comisión, reparto a creadoras, operaciones; y, si ya está en esa vista, lo dispersado). UTF-8. Encabezados en español. Distingue dólares internos de pesos dispersados en el nombre de las columnas; no mezcles unidades.
2. En Retiros: un control para descargar un CSV de las solicitudes (las de la pestaña visible, o un archivo con las mismas columnas que la tabla y una columna de estado). No recalcules montos.
3. No inventes columnas (visitas, conversión, etc.). La descarga ocurre en el navegador de quien administra; no expongas el archivo a `anon`.

#### Qué no tocar
Textos legales (`/privacidad`, `/terminos`, `PENDIENTES_ABOGADO`), comisión 20% / SPEI / 18+, token o secretos de Telegram, el cobro de consultas (`COBRO_CONSULTAS_ACTIVO` sigue en `false`), reproductor, landing, trato de género, no hagas el panel responsivo, no implementes el placeholder de Redes Sociales, no montes un monitor técnico de errores o deploys, no implementes analítica de vistas ni mapas de momentos para creadoras, no cambies el dominio ni `public/CNAME`.

#### Criterios de aceptación
1. Desde cualquier módulo del panel se puede buscar y abrir una cuenta, un clip o una consulta, sin `chat_id` ni token en las respuestas.
2. El Resumen muestra las últimas acciones reales de la bitácora (o el vacío claro).
3. Las tarjetas de clips y consultas dicen si algo lleva tiempo o se vence pronto, usando fechas reales.
4. El Resumen tiene una tarjeta de avatares por revisar que lleva a Herramientas y no aplica ningún avatar.
5. Finanzas y Retiros permiten bajar un CSV fiel a lo que ya se consulta, sin cifras inventadas.
6. Typecheck, build y lint limpios (solo advertencias que ya existían).

#### Cómo demostrar (obligatorio en bridge-query.md)
SHA, diff resumido, y verificación: búsqueda (coincidencia de persona, de clip y de consulta; vacío; que un no-admin o `anon` no vea resultados si hay RPC nueva), Resumen con bitácora reciente y tarjeta de avatares, frases de urgencia con un dato de prueba cuya fecha lo justifique (o explicación si en local no hay ninguno antiguo), descarga de CSV de Finanzas (rango distinto de 30 días) y de Retiros, y confirmación de que ninguna RPC nueva expone `chat_id`, teléfono o token. No marques `CHECKLIST.md` como pass.

#### Siguiente paso para Claude Code
1. `git pull` de `origin/main`.
2. Implementa esta ronda. Commit(s) de producto, p. ej. `feat: busqueda y urgencia en el panel de administracion` y `feat: exportar finanzas y retiros del panel`; `git push origin main`.
3. Marca `bridge-query.md` `[id: 20261107-02]` como `respondida` con SHA, diff y verificación. **No** marques `CHECKLIST.md` como pass.

### Respuesta a [id: 20261107-01] — Ronda 1/10 · Panel de administración: resumen, menú y consola de consultas
- **fecha:** 2026-11-07 18:56 (America/Mexico_City)
- **estado:** lista-para-claude
- **responde a:** Sergio pidió que el panel de administración se sienta como una consola profesional: más amigable, con estadísticas/dashboard y fácil de ver lo de usuarios, moderación, contenido, comunicación, finanzas y bitácoras. Eligió el paquete completo: portada Resumen, menú ordenado, correcciones puntuales y una consola administrativa de consultas por Telegram.
- **ronda:** 1 de 10 de esta tarea · **tope:** 1 hora · si el tope se queda corto, deja dos commits de ESTA misma ronda (primero resumen + menú + correcciones; después la consola de consultas). No dejes la consola a medias ni la pases a otra ronda.
- **checklist afectados (NO marques pass tú):** convenciones de UI si tocas el marco del panel. No rompas ítems `pass` ni el trabajo de las rondas 4, 5, 6 y 7.

#### Orden respecto a rondas anteriores
No reabras `[id: 20261106-04]`, `[id: 20261106-05]`, `[id: 20261106-06]` ni `[id: 20261106-07]`. Esta ronda va en su propio commit (o en los dos de arriba). No mezcles este trabajo con álbumes, avatares, trato, landing, reproductor ni legales.

#### Diagnóstico (no lo reescribas: úsalo)
El panel YA tiene las pantallas: Usuarios, Moderación, Contenido, Comunicación, Finanzas, Bitácora, Reportes (son denuncias, no analítica), Retiros, Verificación y Herramientas. Lo que falta es orientación, no CRUD. `/admin` aterriza en Usuarios. `src/admin/Marco.tsx` lista diez destinos al mismo nivel (`MODULOS`), numerados 01–09, sin agrupación. El único badge global es el de archivos vencidos por purgar, en Contenido. Finanzas ya tiene indicadores (`admin_finanzas`, `admin_dinero_real`, `admin_finanzas_serie`, `admin_ranking_creadoras`) pero están enterrados en esa sección. Moderación, Verificación y Reportes ya tienen conteos locales (`admin_conteo_moderacion`, `admin_conteo_verificaciones`, `admin_conteo_reportes`) que no se ven desde el menú ni desde una portada. Reutiliza `src/admin/piezas.tsx`; no rehagas tablas, paginadores ni confirmaciones.

#### 1. Portada «Resumen»
1. Nuevo módulo `resumen` (título «Resumen»). `/admin` y `/admin/resumen` abren esta portada. Una URL de módulo desconocida también cae aquí (hoy `useModulo()` cae en Usuarios y parece una sección válida).
2. Arriba, lo que necesita atención, cada tarjeta con el número y un enlace al módulo:
   - clips pendientes de moderación (`admin_conteo_moderacion`)
   - identidades pendientes (`admin_conteo_verificaciones`)
   - denuncias abiertas / por resolver (`admin_conteo_reportes`)
   - retiros pendientes (si no hay RPC de conteo, crea `admin_conteo_retiros` al estilo de las otras; NO sumes solo la página visible de una lista)
   - archivos vencidos por purgar (`admin_por_purgar`)
   - consultas por Telegram esperando respuesta o vencidas (la RPC nueva de la consola, más abajo)
3. Debajo, indicadores que YA existen: de Finanzas (bruto movido, comisión, pagado a creadoras, operaciones; y/o dinero real) y de almacenamiento (`admin_uso_almacenamiento`). Un clic lleva a Finanzas o Herramientas.
4. **NO inventes métricas.** No pongas visitas, conversión, embudo ni «usuarios nuevos hoy» salvo que exista una RPC agregada de verdad. `Finanzas.tsx` declara que no se registran vistas.
5. Vacíos útiles: si no hay pendientes, dilo claro («Nada esperando revisión»), no dejes tarjetas en cero sin contexto.

#### 2. Menú agrupado y avisos
1. Agrupa la lateral, sin hacerla responsiva (el comentario de `Marco.tsx` se queda: es herramienta de escritorio, `ANCHO_MINIMO = 1280`).
   - **Por atender:** Resumen, Moderación, Verificación, Denuncias, Consultas
   - **Personas:** Usuarios
   - **Contenido:** Contenido
   - **Dinero:** Finanzas, Retiros
   - **Comunicación:** Comunicación
   - **Sistema:** Bitácora, Herramientas
2. Renombra la etiqueta «Reportes» a **«Denuncias»**. Conserva la clave/ruta `/admin/reportes` para no romper enlaces.
3. Badges en el menú (como el de purgar) para Moderación, Verificación, Denuncias, Retiros y Consultas, con el conteo que corresponde. No dispares una query por ítem cada segundo; un lote al montar el marco (y al volver a la ventana) basta.
4. No hace falta seguir numerando 01–09 si los grupos ya ordenan.

#### 3. Correcciones
1. **Herramientas / demo:** `sembrarDemo()` y `borrarDemo()` en `src/lib/admin.ts` devuelven `{ error: ... }`, pero `Herramientas.tsx` solo comprueba `typeof r === 'string'`. Un error puede mostrar «Contenido de demostración creado.» o «… borrado.» Corrige el chequeo y muestra el error.
2. **Finanzas / gráfica:** el filtro Desde/Hasta afecta el resumen y el ranking, pero la gráfica llama siempre `serieFinanzas(30)`. Haz que la serie siga el rango elegido (si la RPC solo acepta un número de días, pásale el rango real o amplíala). No inventes puntos.
3. **Lenguaje del dinero:** no mezcles dólares, pesos y coins como si fueran lo mismo, y no inventes el tipo de cambio coins↔pesos (sigue sin definirse). Distingue en las etiquetas el reparto interno («Pagado a creadoras» de la economía de la app) de lo realmente dispersado («Dispersado a creadoras»). No presentas devengado como transferencia bancaria hecha.
4. **Zona de riesgo en Usuarios:** separa visualmente «Anonimizar», «Eliminar definitivamente» y «Ajustar saldo» de las acciones de todos los días (suspender, banear, reactivar). Siguen existiendo las confirmaciones; no las quites.

#### 4. Consola administrativa de consultas por Telegram
1. Nuevo módulo `consultas`, título «Consultas», ruta `/admin/consultas`. No la confundas con la página pública `/consultas` ni con `BandejaConsultas` del Estudio (esa es de la creadora, solo sus hilos).
2. Lista todas las conversaciones: creadora (handle público), la otra parte como su handle público de la app (o «Cuenta eliminada»), clip, último mensaje, cuántos van sin responder, cuándo vence el plazo, cuántos ya vencieron. Filtros: todas / esperando respuesta / vencidas. Búsqueda y paginación al estilo del resto del panel.
3. Al abrir un hilo: los mensajes en orden, quién escribió (cliente / creadora), fecha, estado (enviado / vencido / lo que ya exista). Si algún aviso de validación (DeepSeek o reglas) ya está guardado, muéstralo; no inventes uno.
4. **Solo lectura.** El admin no responde, no cobra, no reembolsa ni cambia el estado del mensaje desde aquí. Las respuestas se siguen escribiendo en Telegram.
5. **Privacidad:** las RPC nuevas son `security definer` y solo las ejecuta un admin (`es_admin`). NO devuelvas `chat_id`, teléfono, token del bot ni secretos. De cada parte solo el handle público (el mismo criterio que `mis_consultas()` / `consulta_mensajes_de()` en `20261128000000_bandeja_consultas.sql`).
6. Reutiliza el modelo mental y, si sirve, la forma de `mis_consultas` / `consulta_mensajes_de`, ampliados a todo el sitio para admin. Añade `admin_conteo_consultas` (o el nombre que encaje) para el badge y la tarjeta del Resumen.
7. El cobro sigue apagado (`COBRO_CONSULTAS_ACTIVO = false`). No lo enciendas. No inventes copy de pago, reembolso ni tipo de cambio.

#### Qué no tocar
Textos legales (`/privacidad`, `/terminos`, `PENDIENTES_ABOGADO`), comisión 20% / SPEI / 18+, token o secretos de Telegram, el cobro de consultas, reproductor, landing, trato de género, avatares (salvo que un enlace del Resumen lleve a Herramientas), no hagas el panel responsivo, no implementes el placeholder de Redes Sociales, no montes un monitor técnico de errores o deploys.

#### Criterios de aceptación
1. Entrar a `/admin` muestra Resumen con pendientes reales (o vacíos claros) y los indicadores financieros/de almacenamiento que ya existen.
2. El menú está agrupado; «Denuncias» es el nombre visible de Reportes; hay badges en las colas que importan.
3. Las cuatro correcciones de la §3 se cumplen.
4. `/admin/consultas` lista hilos de todo el sitio, permite abrir uno y leer mensajes, sin `chat_id` ni token en el navegador, y sin acciones de escritura/cobro.
5. Typecheck, build y lint limpios (solo advertencias que ya existían).

#### Cómo demostrar (obligatorio en bridge-query.md)
SHA, diff resumido, y verificación: recorrido de `/admin` (Resumen), del menú con grupos y badges, de Denuncias (misma ruta `/admin/reportes`), de un error de demo si puedes provocarlo en local, de la gráfica con un rango distinto de 30 días, de la zona de riesgo en una ficha de usuario, y de la consola de consultas (lista + detalle; si no hay hilos, el vacío). Confirma que ninguna RPC nueva expone `chat_id`.

#### Siguiente paso para Claude Code
1. `git pull` de `origin/main`.
2. Implementa esta ronda. Commit(s) de producto, p. ej. `feat: resumen y menu del panel de administracion` y `feat: consola admin de consultas por Telegram`; `git push origin main`.
3. Marca `bridge-query.md` `[id: 20261107-01]` como `respondida` con SHA, diff y verificación. **No** marques `CHECKLIST.md` como pass.

---

### Respuesta a [id: 20261106-07] — Ronda 7/10 · Trato de género desde el alta
- **fecha:** 2026-11-06 17:56 (America/Mexico_City)
- **estado:** lista-para-claude
- **responde a:** Sergio vio que el sitio habla de «creadora» en general aunque la persona puede ser creador, y pidió registrar desde el principio el trato: hombre, mujer, neutro o prefiere no decirlo.
- **ronda:** 7 de 10 · **tope:** 1 hora · **tarea:** §10 de `CHECKLIST.md` (trato de género)
- **checklist afectados (NO marques pass tú):** §10 `not_started` → el coordinador lo verifica. No rompas ítems `pass` ni el trabajo de las rondas 4, 5 y 6.

#### Orden respecto a rondas anteriores
Si `[id: 20261106-04]`, `[id: 20261106-05]` o `[id: 20261106-06]` todavía aparecen como pendientes (no deberían: ya fueron hechas), no las reabras. Esta ronda va en su propio commit. No mezcles este recorte con otros en un solo commit.

#### Reglas de producto (Sergio — no las «mejores»)
1. El trato se registra desde el principio (al crear la cuenta), no se adivina después.
2. Las opciones son exactamente cuatro: mujer, hombre, neutro, prefiere no decirlo.

#### Decisión de UI/técnica (coordinador — no preguntar a Sergio)
1. Columna nueva en `public.profiles`, p. ej. `trato text`, con check `mujer | hombre | neutro | no_decir`. Nullable para cuentas que ya existen.
2. En el registro (`Acceso` modo registro) las cuatro opciones son obligatorias; ninguna viene preseleccionada. Sin elegir una, no se crea la cuenta.
3. Se puede cambiar después en Perfil / Ajustes.
4. El valor NO se muestra en el perfil público (nadie más ve «hombre» o «mujer» como dato de la ficha). Solo sirve para generar el trato en la copia. En el panel admin sí puede verse en la ficha de la cuenta.
5. Helper único (p. ej. `src/lib/trato.ts`) que, dado el `trato` de esa persona, devuelve las palabras para dirigirse a ella:
   - mujer → creadora, usuaria
   - hombre → creador, usuario
   - neutro y no_decir → el mismo trato, sin asumir género: «tú», «tu perfil», «quien publica», «esta cuenta». No uses «creadore» ni «elle».
6. Cuentas existentes con `trato` null: trátalas como neutro hasta que elijan. En Perfil, un aviso corto una vez: «¿Cómo prefieres que te tratemos?» con las cuatro opciones. No bloquees el resto de la app.
7. Sustituye el trato personal hardcodeado («Eres creadora», insignia «Creadora» cuando se refiere a ESA persona, el admin que dice «esta usuaria» de alguien concreto) usando el helper. No hagas un buscar-y-reemplazar ciego de la palabra «creadora» en todo el repo.
8. NO renombres la ruta ni la página pública `/creadoras`: es el nombre de la oferta para quien quiere publicar. Sergio no pidió cambiar esa sección.
9. NO reescribas `/privacidad` ni `/terminos`. No inventes texto legal sobre recoger este dato.
10. No toques el copy fijo de comisión 20%, SPEI ni 18+.
11. En esta ronda NO agregues un botón nuevo de borrado duro ni cambies el de Anonimizar (eso es otra conversación).
12. Migración + permisos: cada quien actualiza su propio `trato`; admin puede leerlo.

#### Qué no tocar
Textos legales, bot/cobro de Telegram, reproductor, esquema RPC de comentarios (sí puedes cambiar el texto de una insignia si usa el helper), avatares, landing/hero, rondas 4–6 de producto.

#### Criterios de aceptación
1. El alta nueva no termina sin elegir una de las cuatro opciones.
2. En Perfil se puede cambiar.
3. Quien eligió hombre ve «creador» (no «creadora») en el trato que se le dirige.
4. Neutro y «prefiere no decirlo» no reciben «creadora» por defecto.
5. Cuentas viejas sin valor ven trato neutro y el aviso para elegir, sin quedar bloqueadas.
6. `/creadoras` sigue siendo esa ruta y esa página de oferta.
7. El `trato` no se publica como dato visible en la ficha pública.

#### Cómo demostrar (obligatorio en bridge-query.md)
SHA, diff resumido, verificación: captura o recorrido del registro con las cuatro opciones; del helper; de una cuenta hombre vs mujer vs neutro en un texto de trato personal; de que `/creadoras` no se renombró.

#### Siguiente paso para Claude Code
1. `git pull` de `origin/main`.
2. Implementa esta ronda, un commit de producto (`feat: trato de genero desde el alta`) y `git push origin main`.
3. Marca `bridge-query.md` `[id: 20261106-07]` como `respondida` con SHA, diff y verificación. **No** marques `CHECKLIST.md` como pass.

---

### Respuesta a [id: 20261106-06] — Ronda 6/10 · Avatares automáticos para creadoras sin foto
- **fecha:** 2026-11-06 15:15 (America/Mexico_City)
- **estado:** lista-para-claude
- **responde a:** Asignación del coordinador. Sergio pidió por voz generar avatares automáticos: un frame no explícito del video de la creadora si no tiene foto; si no tiene ningún video, un avatar neutro (silueta o inicial), no un ícono genérico tipo balón.
- **ronda:** 6 de 10 · **tope:** 1 hora · **tarea:** §9 de `CHECKLIST.md` (avatares de creadoras)
- **checklist afectados (NO marques pass tú):** §9 `not_started` → el coordinador lo verifica. No rompas los `pass` de §2 ni §3 ni el trabajo de las rondas 4 y 5.

#### Orden respecto a las rondas 4 y 5
Si `[id: 20261106-04]` o `[id: 20261106-05]` todavía no están hechas y empujadas, **termínalas primero** (04, luego 05) y después sigue con esta. No mezcles esta ronda con las otras en un solo commit.

#### Qué hay hoy (revisado por el coordinador el 2026-11-06 ~15:09 America/Mexico_City)
- Foto de perfil: `public.profiles.avatar_path` + bucket público `avatars` (jpeg/png/webp, 2 MB, ruta `{uid}/{uuid}.ext`). URL: `urlAvatar()` en `src/lib/perfiles.ts`. Escritura: `subirAvatar()` en `src/screens/Perfil.tsx`; admin `fijarAvatar()` / RPC `admin_fijar_avatar`.
- Fallback actual: **no** hay ícono tipo balón. Sin foto se ve un círculo con rayas (`repeating-linear-gradient`) o un círculo sólido `COLOR.superficieAlta` (Explorar, Comentarios). En Perfil el círculo vacío dice «Foto».
- Videos: `public.clips` (`creator_id`, `storage_path` privado, `cover_path` público, `tiene_video`). Extracción de cuadros **ya existe** en el cliente: `src/lib/miniatura.ts` (`miniaturaDeVideo`, `cuadrosDeVideo` con 6 opciones). Se usa al publicar. No hay FFmpeg en edge functions.
- La portada pública (`cover_path`) mide ~32 px: **no sirve como avatar**. `clip-covers-full` es el teaser nítido y suele ser explícito: **no lo uses como atajo**.
- No uses los JPG de `perfiles/pp_big-*` (no están enlazados al frontend).

#### Conteos (snapshot público, 2026-11-06 ~15:09 America/Mexico_City)
- Creadoras (`is_creator`, no baneadas): **56**
- Con `avatar_path` (no tocar): **4** — `@aria_cum`, `@nora_hot`, `@rawstudio2030`, `@yesenia96`
- Sin avatar y con ≥1 clip publicado (`tiene_video` + `cover_path`): **51** — candidatas a frame
- Sin avatar y sin clips: **1** — `@lumen` — avatar neutro
- Clips publicados legibles: **187** (todos con video y cover)
Los números pueden haber cambiado; el código debe operar sobre el estado real (`avatar_path` null o no; clips publicados o no), no sobre esta lista fija.

#### Reglas de producto (Sergio — no las «mejores»)
Avatares automáticos para creadoras
1. Si la creadora ya tiene foto de perfil, no se toca.
2. Si no tiene foto y sí tiene al menos un video publicado, se toma un frame no explícito — el más limpio y apropiado — de sus propios videos y se asigna como avatar por defecto.
3. Si no tiene foto ni ningún video, se muestra un avatar neutro generado (silueta o inicial), no un ícono genérico tipo balón.
El contenido de los videos es 18+. El frame no puede ser un recorte explícito a propósito.

#### Decisión de UI/técnica (coordinador — no preguntar a Sergio)
**1. No pisar fotos existentes.** Solo escribe `avatar_path` cuando es null. La creadora (o un admin) puede sustituirlo después con el flujo que ya existe.

**2. De dónde sale el frame.** Del video propio (bucket privado `clips`), con URL firmada (el mismo privilegio que ya usa la publicación/admin / `ver-clip`). Reutiliza `cuadrosDeVideo` de `src/lib/miniatura.ts`. No uses `cover_path` público. No uses `clip-covers-full` como avatar. No inventes un clasificador NSFW ni una API nueva (DeepSeek no entra en esta ronda).

**3. Qué significa «el más limpio y apropiado».** Heurística, no una garantía:
- Extrae varios cuadros (las 6 opciones que ya hay, o un conjunto parecido).
- Prefiere los más tempranos del video.
- Quédate con exposiciones razonables (ni casi negro ni quemado) y descarta cuadros de color casi uniforme (posibles primeros planos vacíos).
- Elige el de mejor puntaje entre los que queden.
Documenta la heurística en el código. Un admin debe poder ver y cambiar el avatar después.

**4. Cuándo se genera.**
- Al publicar un video: si esa creadora no tiene `avatar_path`, genera y asigna el frame (el cliente ya sabe extraer cuadros en `Upload.tsx`).
- Retroactivo: una acción de admin «Generar avatares faltantes» que recorra creadoras con `avatar_path` null y ≥1 clip publicado, extraiga, suba al bucket `avatars` y fije la ruta (vía `fijarAvatar` / `admin_fijar_avatar`). Solo si sigue null. Si puedes ejecutarla con sesión admin contra el proyecto, hazlo y reporta cuántas se asignaron; si no hay sesión admin, deja la acción lista y no finjas el backfill.

**5. Avatar neutro.** Componente unificado (p. ej. `src/components/Avatar.tsx`) para listados, ficha de creadora, ficha de clip, comentarios, perfil y admin. Si hay `avatar_path`, muestra la foto. Si no, un círculo con la inicial de `display_name` (si falta, la de `handle`) sobre tokens de `diseño.ts` (`COLOR.superficieAlta` u otro fondo sobrio de marca). Alternativa aceptable: silueta simple. No rayas, no el texto «Foto» como único fallback en sitios públicos, no un ícono tipo balón ni un pictograma genérico de deporte. Para `@lumen` (y cualquier creadora sin video) basta este fallback; no hace falta subir un archivo.

**6. Dónde se ve.** Sustituye los círculos rayados o planos de `Explorar.tsx`, `CreatorProfile.tsx`, `ClipDetail.tsx`, `Comentarios.tsx`, `Perfil.tsx` y pantallas admin que muestren avatar (`Usuarios`, `PublicarPor`, etc.).

#### Archivos concretos a tocar (esperados)
- `src/components/Avatar.tsx` (nuevo) y los sitios que pintan la foto
- `src/lib/miniatura.ts` (puntaje del cuadro, si hace falta)
- `src/screens/Upload.tsx` (asignar al publicar si no hay foto)
- Acción o pantalla admin para el backfill
- No toques `perfiles/pp_big-*`

#### Qué no tocar
Rondas 4 y 5 (no mezclar commits), landing/hero, reproductor, comentarios, consultas Telegram/DeepSeek, textos legales, `CLAUDE.md`, calidad auto, captions. No añadas claves `VITE_*` nuevas. No uses service role en el frontend.

#### Criterios de aceptación (verificables)
1. Quien ya tiene `avatar_path` sigue igual.
2. Quien no tiene foto y sí tiene video puede recibir un frame en el bucket `avatars` y en `avatar_path`, solo si estaba null: al publicar y/o con la acción de admin.
3. El frame sale del video (heurística documentada), no de la portada de 32 px ni de `clip-covers-full` ni de `perfiles/pp_big-*`.
4. Quien no tiene foto ni video (p. ej. `@lumen`) ve un círculo con inicial o silueta, no rayas ni un ícono tipo balón.
5. Un solo componente de avatar se usa en los sitios públicos listados.
6. Sin clasificador NSFW nuevo, sin DeepSeek, sin claves nuevas en el frontend.

#### Cómo demostrar (obligatorio en el reporte de `bridge-query.md`)
- SHA, diff resumido, verificación.
- Antes/después o captura: una creadora sin foto muestra inicial o silueta; el código tiene la guarda `avatar_path` null.
- Si corriste el backfill: cuántas creadoras recibieron frame y cuántas quedaron en neutro.
- Recorrido: listado de creadoras, una ficha, un clip, comentarios.

#### Límites anti-bucle
Máx 10 rondas en esta tarea; parar si 2 seguidas no mejoran; tope 1 hora.

#### Siguiente paso para Claude Code
1. `git pull` de `origin/main`.
2. Si 04 o 05 siguen pendientes, termínalas primero (una por commit).
3. Implementa esta ronda, un commit de producto (`feat: avatares automaticos para creadoras sin foto`) y `git push origin main`.
4. Marca `bridge-query.md` `[id: 20261106-06]` como `respondida` con SHA, diff y verificación. **No** marques `CHECKLIST.md` como pass.

### Respuesta a [id: 20261106-05] — Ronda 5/10 · Página de consultas pagadas por Telegram
- **fecha:** 2026-11-06 15:00 (America/Mexico_City)
- **estado:** lista-para-claude
- **responde a:** Asignación del coordinador. Sergio dictó por voz las reglas del servicio y pidió empezar la sección o página en el sitio, dejando en el puente lo que ya se puede implementar.
- **ronda:** 5 de 10 · **tope:** 1 hora · **tarea:** §5 de `CHECKLIST.md` (consultas pagadas vía Telegram) — solo la cara pública del servicio, no el bot ni el cobro
- **checklist afectados (NO marques pass tú):** §5 `not_started` → el coordinador lo verifica. No rompas los `pass` de §2 ni §3 ni el recorte de la ronda 4.

#### Actualización — 2026-11-06 14:59 (America/Mexico_City)
Sergio fijó el precio en **20 pesos** por mensaje del cliente (corrigió una cifra de 30 que no debe usarse). Sustituye cualquier `[PRECIO]` o «30 pesos» por **20 pesos**. El resto de las reglas no cambia.

#### Actualización — 2026-11-06 15:00 (America/Mexico_City)
Sergio pidió sumar un **checklist de privacidad mutua** al paquete (se pega junto con las reglas y se pinta en `/consultas`). El usuario del bot **sigue pendiente**: el dueño lo va a crear. No inventes un `@usuario`.

#### Actualización — 2026-11-06 15:03 (America/Mexico_City)
Sergio definió la **capa de validación** con la API de DeepSeek (opción económica): solo apoya la validación, no genera el contenido de las respuestas. El texto canónico va más abajo y se pinta en `/consultas`. En esta ronda **no** implementes llamadas a DeepSeek, no guardes una clave de API y no armes el bot: el usuario sigue pendiente y el dueño lo va a crear.

#### Orden respecto a la ronda 4
Si `[id: 20261106-04]` todavía no está hecha y empujada, **termínala primero** y luego sigue con esta. No mezcles los dos recortes en un solo commit. Si 04 ya está en `origin/main`, `git pull` y arranca esta.

#### Qué hay hoy (revisado por el coordinador en `9b06983`)
- En el repo **no existe** integración ni mención de Telegram (ni bot, ni enlace `t.me`, ni flujo de consultas pagadas).
- `/chat` es la bandeja de **encargos** (contenido a la medida, `src/estudio/Encargos.tsx`). **No** la conviertas en el chat de Telegram ni le pegues este servicio.
- La landing cuenta formas de ganar en `FORMAS_NEON` (`src/content/portada.ts`) montadas por `FormasDeGanar` en «Precios»: venta, renta, suscripción, contenido a la medida, propinas, blog. Ahí no está Telegram.
- `/creadoras` (`src/screens/Creators.tsx`) es la página de venta para quien publica: protección, beneficios, CTA de cuenta. No habla de consultas.
- El patrón para una página pública de lectura es `/preguntas` y `/contacto` (`src/screens/Ayuda.tsx` + `MarcoDocumento`): se leen sin sesión.

#### Datos de negocio que SÍ están definidos (no los inventes ni los «mejores»)
Sergio fijó estas reglas. El texto canónico, listo para pintar, es este:

Reglas del servicio de consultas pagadas por Telegram

RAWstudio ofrece consultas pagadas por Telegram entre quien pregunta y la creadora. Cada mensaje que envía el cliente es un mensaje de pago.

1. Precio
Cada mensaje del cliente cuesta 20 pesos. Ese pago cubre ese mensaje y la respuesta de la creadora.

2. Extensión
El mensaje del cliente debe tener al menos 20 palabras. Si tiene menos, no se envía.

3. Pertinencia
El mensaje debe tener que ver con lo que se pregunta. Tiene que ir anclado al hilo de la conversación y al clip o a la creadora de interés. No se aceptan mensajes sueltos, fuera de contexto o que no se relacionan con esa consulta.

4. Cómo responde la creadora
No hay un guion rígido. La brújula es flexible: cada contestación debe avanzar algo. Eso puede ser una pregunta de vuelta, un dato nuevo o una oferta concreta.

5. Plazo
La creadora tiene un máximo de 2 días para responder un mensaje pagado.

6. Guía corta para la creadora
Saluda.
Responde lo que preguntaron.
Ofrece el siguiente paso.

Checklist de privacidad mutua

Este servicio se arma para que ninguna de las dos partes vea el teléfono ni la cuenta personal de la otra. El puente es el bot, no un chat directo.

Para quien consulta
Nunca ves el número telefónico de la creadora.
Nunca ves su cuenta personal de Telegram.
Solo ves el nombre del bot (por ejemplo, Raw Studio).

Para la creadora
Nunca ves el número telefónico de quien te escribe.
Los mensajes llegan al bot. Tú respondes desde tu cuenta, sin exponer tu número, tu cuenta personal ni otros datos de contacto.

Al crear el bot
El usuario del bot todavía está pendiente: el dueño lo va a crear.
Activa el modo de privacidad del bot al crearlo, para que no pueda leer otros chats del grupo.
Usa un nombre de usuario dedicado, no vinculado a una cuenta personal con foto o historial visible.

Capa de validación (IA de apoyo)

La inteligencia artificial no escribe las respuestas. Solo ayuda a validar que se cumplan las reglas. El contenido real de cada respuesta lo escribe la creadora.

Se usa la API de DeepSeek, en su opción más económica.

Cómo funciona el bot:

1. Recibe el mensaje pagado del cliente.

2. Con DeepSeek valida dos cosas: que tenga al menos 20 palabras y que sea pertinente al hilo de la conversación y al clip o a la creadora de interés.

3. Si no cumple, avisa al cliente que el mensaje no se envía y le explica por qué.

4. Si cumple, se lo pasa a la creadora.

5. Cuando la creadora responde, si su mensaje no cumple los lineamientos —por ejemplo, si es demasiado corto o no avanza nada (ni una pregunta de vuelta, ni un dato nuevo, ni una oferta concreta)— el bot se lo avisa. No reescribe ni genera esa respuesta por ella.

- El precio es fijo: **20 pesos** por mensaje del cliente. Déjalo en una constante única (p. ej. `PRECIO_CONSULTA_TELEGRAM = '20 pesos'` en `src/content/consultas.ts`). No lo cambies a otra cifra, no uses 30 ni el marcador `[PRECIO]`, y no lo pases a dólares.
- El usuario del bot de Telegram **sigue pendiente**: el dueño lo va a crear. Mientras tanto, constante vacía al estilo de `REDES` (p. ej. `BOT_TELEGRAM = ''`). Si está vacía, **no** pintes un enlace `t.me/…`, **no** inventes un `@usuario`, **no** digas «escríbenos al bot» con un destino inventado y **no** abras Telegram.

#### Qué no está definido (fuera de esta ronda — no lo inventes)
Cobro del mensaje (pasarela, SPEI, retención), qué pasa si la creadora no responde en 2 días (reembolso u otra consecuencia), el bot real, llamadas a la API de DeepSeek, claves de API, webhooks, botón «consultar» en la ficha del clip que abra un chat, ni un username inventado. La capa de validación sí se describe en la página; no se implementa el circuito en esta ronda.

#### Decisión de UI (coordinador — no preguntar a Sergio)

**1. Página nueva `/consultas`**
- Pantalla pública al estilo de `/preguntas`: `MarcoDocumento` (o el mismo aire), título en español (p. ej. «Consultas por Telegram»).
- Pinta las reglas de arriba, enteras, en español, sin reescribir el sentido. El precio «20 pesos» sale de la constante. Debajo, pinta el **checklist de privacidad mutua** completo y la **capa de validación (IA de apoyo)** completa, también sin reescribir el sentido. Deja claro que DeepSeek solo valida y que la creadora escribe cada respuesta.
- Deja claro que cada mensaje del cliente se paga y que esa cuota cubre la respuesta; que hacen falta ≥20 palabras; que el texto va anclado al hilo y al clip o creadora; la brújula flexible; el tope de 2 días; y la guía de tres puntos para la creadora.
- Si `BOT_TELEGRAM` está vacío, no hay botón de «abrir Telegram». Un enlace a `/preguntas` o `/contacto` al pie está bien, como en las otras páginas de ayuda.
- Súmala a `SCREENS` en `src/App.tsx`. Agrégala a `SIN_PUERTA_DE_EDAD` en `src/lib/rutas.ts` (se puede leer como `/preguntas` y `/creadoras`, sin sesión). No la pongas en la barra inferior.
- Nota visible de 18+ (una línea; el sitio ya es para mayores). No reescribas avisos legales de `/privacidad` ni `/terminos`.

**2. Tarjeta en «Precios» de la landing**
- Añade un séptimo ítem a `FORMAS_NEON` (o el arreglo que pinte `FormasDeGanar`): título «Consultas por Telegram»; descripción breve y fiel (pagas por cada mensaje; la creadora responde en un máximo de 2 días). Icono existente (p. ej. `sobre` si ya está en `Iconos`; si no, `texto`). No inventes un icono nuevo.
- Esa tarjeta (solo esa) enlaza a `/consultas` con `Enlace`. No conviertas las otras seis en enlaces si hoy no lo son.
- No montes esta tarjeta en el primer paint: sigue saliendo solo al abrir «Precios», como ahora. §2.1 es inmutable.

**3. Recuadro corto en `/creadoras`**
- Un bloque nuevo, no otra página pegada: el plazo de 2 días, la brújula (pregunta de vuelta, dato nuevo u oferta concreta) y la guía de tres puntos (saluda, responde lo que preguntaron, ofrece el siguiente paso). Un enlace a `/consultas` para leer las reglas completas.
- No dupliques aquí todo el documento ni cambies el resto de la página de creadoras.

**4. No tocar**
- `/chat` ni Encargos, reproductor, comentarios, age gate, textos de `/privacidad` y `/terminos`, el recorte de la ronda 4 (hero, Cintillo, Portada), copy 20%/SPEI/18+ que ya está, Telegram real, pagos, Admin, Supabase.

#### Archivos concretos a tocar (esperados)
- `src/content/consultas.ts` (nuevo): constante de precio `20 pesos`, bot vacío, textos de las reglas, del checklist de privacidad mutua y de la capa de validación (DeepSeek solo valida, no escribe).
- `src/screens/Consultas.tsx` (nuevo) o export en `Ayuda.tsx` si encaja mejor; regístralo en `App.tsx`.
- `src/lib/rutas.ts` (`SIN_PUERTA_DE_EDAD`).
- `src/content/portada.ts` [+35847 bytes at .content[1].resource.text]