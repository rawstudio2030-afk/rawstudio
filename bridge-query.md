# Puente: consultas (Claude Code → coordinador)

## Propósito
Claude Code escribe aquí bloqueos, dudas y decisiones que necesita del **coordinador** (no del usuario). El coordinador responde en [`bridge-response.md`](./bridge-response.md). No hay chat directo: el repo es la fuente de verdad.

## Cómo usar
1. Antes de preguntar: lee `CHECKLIST.md`, `DESIGN-BRIEF.md`, commits recientes y el código tocado.
2. Añade una entrada nueva **arriba** (más reciente primero), debajo de «Consultas activas».
3. Pon `estado: abierta`.
4. Espera la respuesta en `bridge-response.md` con el mismo `id`.
5. Cuando incorpores la decisión, cambia tu consulta a `estado: respondida` y anota el commit donde quedó aplicada.

## Campos de estado
- `abierta` — esperando al coordinador
- `respondida` — ya hay respuesta; Claude Code debe aplicarla
- `ejemplo` — plantilla ilustrativa, no es una consulta real
- `asignada` — el coordinador dejó trabajo listo; Claude Code debe leer `bridge-response.md` y ejecutar

## Plantilla

```markdown
### [id: YYYYMMDD-NN] título corto
- **fecha:** YYYY-MM-DD HH:MM (America/Mexico_City)
- **estado:** abierta
- **tarea:** (ítem de CHECKLIST.md o nombre de tarea)
- **pregunta:** …
- **contexto:** archivos / rutas / SHA de commits relevantes
- **urgencia:** baja | media | alta
- **ya se intentó:** …
```

## Reglas
- No preguntar a Sergio por decisiones técnicas o de UI estándar (orden de botones, tokens Miami Neon, lazy load, controles de reproductor habituales, copy de interfaz estándar).
- Solo escalar a Sergio (vía coordinador) si rompe criterio de negocio/contenido o requiere dato legal/fiscal.
- Una pregunta por entrada. Si hay varias, varias entradas.

---

## Consultas activas

### [id: 20261106-03] Ronda 3 hecha — marca en ventanas + comentarios y reseñas
- **fecha:** 2026-11-06 (America/Mexico_City)
- **estado:** respondida
- **tarea:** §3 ajuste de seguridad (`VENTANAS_SIN_MARCA = false`) y §4 de `CHECKLIST.md` (comentarios y reseñas en la ficha del clip).
- **resultado:** HECHA y en `origin/main` (`339195f..fb594f1`). **LA MIGRACIÓN TODAVÍA NO ESTÁ APLICADA EN LA BASE DE PRODUCCIÓN** (ver «Estado de despliegue»).
- **commits (SHA completos):**
  1. `1a1536f76b9f3724788a72247f9b2b1e3ba3b152` — `fix: reproductor — no abrir ventanas sin marca de agua`
  2. `fb594f1817891010d730b088f2536c1e87bcfc1a` — `feat: comentarios y reseñas en la ficha del clip`
- **diff resumido:**
  - `src/components/Reproductor.tsx`: `VENTANAS_SIN_MARCA = false` y el comentario de cabecera, que ya decía «las permite o las esconde», ahora dice que hoy están escondidas. Nada más.
  - `supabase/migrations/20261123000000_comentarios.sql` (nuevo): tablas `comentarios_clip` y `resenas_clip` (PK `(clip_id, autora_id)`), RLS activado y **cero políticas**, `revoke all` a `anon` y `authenticated`. Funciones `security definer` con `search_path = ''`: `comentarios_de`, `resumen_resenas` (lectura, `anon` y `authenticated`), `comentar`, `calificar`, `quitar_calificacion`, `borrar_comentario` (solo `authenticated`) y dos piezas internas sin permiso de ejecución, `ficha_visible` y `puede_opinar`, que reúne las comprobaciones.
  - `src/lib/comentarios.ts` (nuevo): envoltorios de las RPC, como `reportes.ts`.
  - `src/components/Comentarios.tsx` (nuevo): cabecera «★ 4.3 · 12 reseñas» solo con ≥1 reseña, estrellas de 44 px con `aria-label` y `aria-pressed`, caja con contador `n/500`, lista, «Cargar más», borrado con confirmación, insignia «Creadora». Texto como nodo de React (`pre-wrap`, `overflow-wrap: anywhere`), sin `dangerouslySetInnerHTML`.
  - `src/screens/ClipDetail.tsx`: monta `<Comentarios>` antes de «Reportar este clip». Compra, renta, reembolso, paywall, geobloqueo, portada borrosa y `Reportar` no se tocaron.
- **A. Marca en ventanas — qué controles aparecen:**
  - **Con marca** (cualquiera que no sea la autora): sin botón de PiP; no se llama a `webkitEnterFullscreen`; el botón de pantalla completa sigue (pide `requestFullscreen` al contenedor, que lleva marca y barra). Controles visibles: play/pausa, silencio, velocidad y pantalla completa.
  - **Sin marca** (la autora viendo lo suyo): se ofrecen PiP y la nativa de iPhone si el navegador tiene la API.
  - Lo comprobé por lectura del código (`puedePip` y `puedeCompleta` con `VENTANAS_SIN_MARCA = false`) y con la compilación; no repetí la prueba en pantalla del reproductor en esta ronda. Pantalla completa y PiP reales siguen sin poder probarse en el entorno automatizado (lo rechaza hasta un botón mínimo).
- **B. Comentarios y reseñas — quién puede qué** (decidido en el servidor; la UI solo evita ofrecer lo que se rechazaría):

  | | leer comentarios y resumen | comentar | calificar | borrar |
  |---|---|---|---|---|
  | anónimo | sí, si la ficha se ve (clip publicado, no borrado, creadora no vetada) | no (la función ni se puede ejecutar) | no | no |
  | sesión sin acceso al video | sí | no: «Desbloquea el video para opinar» | no | solo lo suyo |
  | con acceso (compra, renta, suscripción o gratis vigente) | sí | sí | sí, una por clip; recalificar la actualiza | lo suyo |
  | autora del clip | sí, también sin publicar | sí (sale con insignia) | **no**: «No puedes calificar tu propio clip» | los de cualquiera en su clip |
  | administración | sí | sí | sí | cualquiera, y queda en la bitácora |
  | cuenta vetada o suspendida | sus comentarios y calificaciones no se muestran ni cuentan (vetada) | no | no | lo suyo |
  | sin mayoría de edad confirmada | sí | no: «Confirma que eres mayor de edad…» | no | lo suyo |

- **Cómo se verificó:**
  1. **Servidor, base de pruebas local con las 90 migraciones** (simula Supabase; la llamada por PostgREST real no se probó): 70 casos llamando a las funciones directamente con cada rol, no ocultando botones. Resultado en `/Users/soov/Documents/X/pruebas-seguridad-p0/c_resultado.txt`.
     - Leer: anónimo ve el clip publicado (2) y no el pendiente ni el borrado (0); la autora ve los de su clip pendiente; los de una cuenta vetada no salen; una cuenta anonimizada sale como «Cuenta eliminada» sin handle; el resultado de `comentarios_de` no incluye correo ni el id de la autora.
     - Comentar: anónimo → «permiso denegado a la función»; sin acceso → rechazado; con compra, gratis y autora → pasa; sin edad confirmada, vetada y suspendida → rechazado; clip borrado o sin publicar de otra → rechazado. Vacío, solo espacios, solo saltos y tabulaciones, y espacio duro con ancho cero → «Escribe algo antes de publicar»; 501 caracteres → rechazado; 500 → pasa; `<script>` se guarda literal; los espacios de los bordes se recortan y los saltos internos se conservan; el 6.º comentario en un minuto → «Vas demasiado rápido».
     - Calificar: 4 → 4.0/1; recalificar 2 → 2.0/1 (no se duplica); 4 y 3 → 3.5/2; la calificación de una cuenta vetada no cuenta; la autora, quien no tiene acceso y el anónimo son rechazados; 0 y 6, rechazados; `quitar_calificacion` vuelve a 0.
     - Borrar: la autora, la autora del clip y administración pueden; un tercero → «No puedes borrar este comentario»; borrar dos veces → «no existe»; anónimo → permiso denegado; el borrado de administración deja 1 fila en la bitácora y el de la propia autora, ninguna; `puede_borrar` es verdadero para la autora, la dueña y administración, y falso para un tercero y para un anónimo.
     - Paginación: 25 comentarios → página 1 trae 20, la 2.ª (con `antes`) trae 5 con 0 repetidos; `cuantos = 100` se acota a 50.
     - **RLS:** activado en las dos tablas, 0 políticas; insert, select, update y delete directos como `authenticated`, e insert como `anon`, dan «permiso denegado».
  2. **Dos fallos que la propia prueba encontró y que ya están corregidos:** `btrim` solo recorta espacios, así que un comentario de solo saltos de línea se publicaba; y `puede_borrar`/`es_mio` salían nulos para quien no tiene sesión.
  3. **Interfaz**, componente montado en un arnés temporal (ya borrado) con un sustituto en memoria de las funciones, escritorio y 390×844: lista de 20 + «Cargar más» (26 en total, 0 repetidos), publicar (se recorta, la caja se vacía y el comentario sale primero), calificar 4, recalificar 2 y quitar, borrar con confirmación (cancelar no borra), HTML y un `<script>` pintados como texto literal, palabra de 80 caracteres sin romper el ancho ni desbordar, insignia «Creadora», estrellas de 44 px, estado vacío («Todavía no hay comentarios», sin estrellas en la cabecera), anónimo («Entra para comentar», enlace a `#/entrar`), sesión sin acceso («Desbloquea el video para comentar») y la autora (formulario sin estrellas, botón borrar en todos).
  4. `npm run typecheck`: sin errores. `npm run lint`: sin errores ni avisos nuevos en los archivos tocados (el aviso de `ClipDetail.tsx` ya existía). `npm run build`: sin errores (paquete principal 657.72 kB, gzip 185.68). Las suites anteriores (dinero, ataques, D, E, G, H) dan lo mismo con la migración nueva en la cadena.
- **Estado de despliegue — importante:** el código ya está publicado, pero **`supabase db push` no se ha corrido**: no estaba en lo que se pidió y es producción. Hasta aplicarlo, en la ficha la lista saldrá como «Todavía no hay comentarios» y, para quien tenga acceso, publicar o calificar dará un error del servidor. No rompe nada más. La migración solo añade tablas y funciones nuevas, sin tocar las existentes.
- **No verificado, dicho sin rodeos:** la ficha real con una URL firmada (solo se probó el componente aislado); las llamadas por PostgREST contra la base real; el comportamiento con muchos comentarios (la media se calcula al vuelo con un índice por clip, sin tabla de agregados); y la prueba en pantalla del reproductor con la marca en esta ronda.
- **Decisiones que tomé y conviene saber:** (a) la lectura va también para el rol anónimo, porque el catálogo ya es legible para `anon` y la puerta de edad es de pantalla; si se quiere que el texto de los comentarios no sea público para quien no ha confirmado la edad en servidor, hay que pedir sesión en `comentarios_de`; (b) los comentarios de una cuenta anonimizada se conservan como «Cuenta eliminada» (no hizo falta tocar `admin_anonimizar_cuenta`); (c) los comentarios se borran en cascada si se borra el clip o una cuenta de demostración, nunca los de una cuenta real, que el guardián de cuentas no deja borrar; (d) no hay edición de comentarios, hilos, reportes de comentarios, moderación ni notificaciones, como se pidió.
- **¿Debería subir el checklist?** §4 Reseñas/comentarios: pasa de `not_started` a `partial` hasta que la migración esté aplicada y se pruebe en la ficha real; entonces `pass`. §3 PiP: `pass` con la nota de que con marca se esconde. No los marqué yo.
- **urgencia:** media

### [id: 20261106-02] Ronda 2 hecha — reproductor: controles propios y velocidad
- **fecha:** 2026-11-06 (America/Mexico_City)
- **estado:** respondida
- **tarea:** Reproductor de video — §3 de CHECKLIST.md (velocidad, UX tipo YouTube, PiP explícito)
- **resultado:** HECHA y en `origin/main`. Commit de producto `24a0a7844ec194090af20dbbb65bcbab4dadc78b` (`fix: reproductor — controles propios y velocidad`), empujado como `b36cbaa..24a0a78`. Antes no estaba implementado en el working tree: se hizo en esta ronda.
- **diff resumido:**
  - `src/components/Reproductor.tsx` (nuevo): `<video>` sin `controls`, con `playsInline`; barra propia con play/pausa, tiempo, progreso (`input range` con `aria-valuetext`), duración, volumen y silencio, menú de velocidad, PiP solo si `document.pictureInPictureEnabled` y pantalla completa. Todo es `Pulsable` de 44 px con `aria-label` en español. Botón central grande. Controles ocultos a los 2.5 s reproduciendo; reaparecen con puntero, toque, foco o tecla. Clic alterna play/pausa; doble toque izquierda/derecha −10/+10 s (el clic simple espera 280 ms para no pelear con el doble). Teclado con el reproductor enfocado: espacio o `k`, `j`/`l` ±10 s, flechas ±5 s, `m`, `f`.
  - Velocidad `0.5 · 0.75 · 1 · 1.25 · 1.5 · 2` sobre `playbackRate`, guardada en `localStorage` (`rawstudio.velocidad`) y reaplicada al cargar y al cambiar de `src`.
  - `src/screens/ClipDetail.tsx`: el `<video controls>` y la `MarcaDeAgua` sueltos se sustituyen por `<Reproductor src poster marca />`. `ClipDetail` sigue decidiendo si hay marca (`!mio && perfilPropio`). La marca vive dentro del reproductor, por debajo de la barra, y la pantalla completa se pide al contenedor para que no se pierda. Compra, renta, reembolso, reportar, candado y portada borrosa no se tocaron.
  - `src/index.css`: estilos del `input range` (pista y pulgar) que no caben en línea.
  - Sin tocar: `MarcaDeAgua.tsx`, `urlVideoFirmada`/`ver-clip`, Portal, age gate, Admin, Supabase.
- **cómo se verificó** (servidor de desarrollo con un arnés temporal ya borrado, que montaba el componente con un mp4 de muestra; escritorio 1280×800 y celular 390×844):
  1. `<video>` sin `controls` (`hasAttribute('controls')` = false) y con `playsInline`; marca presente para quien mira y ausente con `?autora=1`.
  2. Velocidad: menú con 0.5, 0.75, Normal, 1.25, 1.5 y 2×. Tras elegir 1.5, 2 y 0.5, `video.playbackRate` valió 1.5, 2 y 0.5. Tras recargar la página, `playbackRate` y `defaultPlaybackRate` valían 2 y el botón decía «2×».
  3. Teclado con foco en el reproductor: `l` y `j` movieron la posición (acotada a 0 y a la duración de 4 s), `ArrowRight` y `ArrowLeft` también, `m` alternó `muted`, `k` y espacio alternaron play/pausa.
  4. Seek con la barra: valor 2 → `currentTime` 2, `aria-valuetext` «0:02 de 0:04».
  5. Clic simple al centro alterna play/pausa tras el umbral; doble toque a la derecha y a la izquierda saltaron +10 y −10 s (acotados por el video corto).
  6. Controles: a los 2.5 s reproduciendo la barra deja de captar clics y el cursor se oculta (la opacidad completó su transición hacia los 4 s en este navegador); reaparece con el puntero; en pausa siempre visible.
  7. Marca vs barra: `z-index` 3 vs 5, `pointer-events: none` en la marca, y `elementFromPoint` sobre el botón de pantalla completa devuelve el botón.
  8. Celular: sin desborde horizontal, todos los controles de 44 px de alto, volumen deslizable oculto en pantalla estrecha (queda el botón de silencio).
  9. `npm run typecheck` y `npm run lint` sin avisos nuevos (el único aviso de `ClipDetail.tsx` ya existía); `npm run build` sin errores.
- **NO verificado, por límite del entorno:**
  - **Pantalla completa y PiP reales.** Tanto el navegador integrado como el Chrome controlado por la extensión rechazan `requestFullscreen` con «not granted» incluso para un botón mínimo de prueba, así que no pude ver el modo pantalla completa. Sí se verificó que el botón existe, que llama a `requestFullscreen` sobre el contenedor (que lleva marca y controles) y que PiP aparece solo cuando `document.pictureInPictureEnabled` es verdadero. Conviene que Sergio o el coordinador lo prueben a mano en un navegador normal.
  - **Un clip real con URL firmada.** La ficha necesita sesión y un clip desbloqueado; se probó el componente con un mp4 local, no la pantalla completa de `ClipDetail`. La URL sigue saliendo de `urlVideoFirmada` sin cambios.
- **ADVERTENCIA de seguridad (decisión que debe tomar el coordinador):** dos vías que la ronda pide sacan el video del contenedor y lo dejan SIN marca de agua, y la marca es lo que promete la página de creadoras: (a) Picture-in-Picture, que dibuja solo el video en una ventana aparte; (b) en iPhone, la pantalla completa nativa (`webkitEnterFullscreen`). Una grabación de pantalla de cualquiera de las dos no llevaría el nombre de quien mira. Se implementaron como se pidió, pero con un interruptor: la constante `VENTANAS_SIN_MARCA` de `Reproductor.tsx`. En `false`, con marca se esconden PiP y la pantalla completa de iPhone. Recomiendo `false` mientras la marca sea la protección anunciada.
- **fuera de esta ronda, como se pidió:** calidad automática (un solo archivo por clip; sin menú de calidad) y captions (sin pistas VTT). Siguen `not_started`.
- **¿Debería subir el checklist?** Velocidad: sí, a `pass`. UX tipo YouTube: `pass` o `partial` hasta que se pruebe la pantalla completa a mano. PiP explícito: `pass` si se acepta el botón (hay que probarlo a mano). No los marqué yo.
- **urgencia:** baja

### [id: 20261106-01] Ronda 1 hecha — recortar landing al hero
- **fecha:** 2026-11-06 (America/Mexico_City)
- **estado:** respondida
- **tarea:** Eager loading — §2.1 y §2.2 de CHECKLIST.md · «Recortar landing al hero»
- **resultado:** HECHA. Commit de producto `4e15d81c7155d446fa52d941678fb5cfe3a6e018` (`fix: landing — primer paint solo hero, diferir secciones`). El coordinador verificó el diff el 2026-11-06 ~10:06 America/Mexico_City y marca §2.1 y §2.2 como `pass` (este commit de docs de la ronda 2).
- **diff resumido:**
  - `src/screens/Portal.tsx`: sin imports estáticos de `launch.mp4`, `Portada`, `SeccionesNeon` ni cintillo. Opción A: el video del iris se sustituye por un gradiente (la pupila magenta). `Cintillo`, `ComoFunciona`, `FormasDeGanar` y `Portada` son `React.lazy` + `Suspense`, montados por «Ver cómo funciona» / «Cómo funciona», «Precios» y «Sobre nosotros»; el cintillo sale con la primera petición. `AlMontar` baja al ancla cuando llega el chunk.
  - `src/components/Cintillo.tsx` (nuevo): extraído de Portal para poder cargarlo aparte.
  - `src/components/Portada.tsx`: el FAQ embebido (acordeón) pasa a un enlace a `/preguntas`; el pie solo enlaza a `/contacto`, `/preguntas`, `/privacidad`, `/terminos`.
  - `src/screens/Entrar.tsx`: carga `Portada` con `lazy`. Sin esto seguía importada en estático y quedaba en el paquete principal, así que el diferido de la landing no cambiaba nada.
- **cómo se verificó (dev server, `/#/`, 1280×800 y 390×844):**
  - **Primer paint, sin click.** Ausentes en `#root`: «Precios y formas de ganar», «Formas de ganar», «Preguntas frecuentes», «Join us», «80% para ti» (cintillo), «Privacidad», «Términos», «Contacto», «¿Qué es RAWstudio?». Sin `<video>`, 0 nodos `.cintillo`, sin `#como-funciona`, `#precios` ni `#sobre-nosotros`. Presentes: wordmark RAW studio, «Graba. Ponle precio. Cobra.», «El 80% de cada dólar es tuyo», «Crear mi cuenta», «Ver cómo funciona» y las opciones, «Ya tengo cuenta», «Solo vengo a ver», 18+. Módulos pedidos al cargar: ninguno de `SeccionesNeon`, `Portada`, `Cintillo` ni `launch.mp4`.
  - **Click en «Ver cómo funciona».** Aparece `#como-funciona` y el cintillo («80% para ti»); se piden entonces `Cintillo` y `SeccionesNeon`. Baja a la sección.
  - **«Precios».** Aparece `#precios` tras `#como-funciona` (el módulo ya estaba cargado, no hay petición nueva).
  - **«Sobre nosotros».** Se pide `Portada`; 0 `<details>`; «Join us» presente solo desde aquí; enlaces a `#/preguntas`, `#/contacto`, `#/privacidad`, `#/terminos`.
  - **Rutas.** `/preguntas`, `/contacto`, `/privacidad`, `/terminos`, `/creadoras`, `/registro`, `/acceso`, `/age`, `/entrar`, `/launch` cargan su contenido. Sin errores en consola.
  - **Build.** `npm run typecheck` y `npm run lint` sin errores (las advertencias de lint son previas y de otros archivos). Paquete principal 705.67 → 640.20 kB (gzip 201.52 → 180.67); el mp4 de 1.2 MB ya no sale en `dist/assets`; chunks nuevos `Cintillo` (0.98 kB), `SeccionesNeon` (6.28 kB) y `Portada` (6.69 kB).
- **urgencia:** baja
- **ya se intentó:** opción A (quitar el video del hero); (B) no hizo falta.

---

## Ejemplo (no es una consulta real)

### [id: 20261106-00] formato de consulta al puente
- **fecha:** 2026-11-06 08:00 (America/Mexico_City)
- **estado:** ejemplo
- **tarea:** Eager loading — landing solo hero
- **pregunta:** ¿Confirmamos que «Cómo funciona», «Formas de ganar» y el bloque `Portada` (FAQ embebido) deben salir del render inicial de `/` y cargarse solo al scroll/click?
- **contexto:** `src/screens/Portal.tsx` importa de forma eager `SeccionesNeon`, `Portada`, `launch.mp4`, `FondoMiami`. Solo `Admin` y `AltaCreadora` usan `lazy()` en `App.tsx`.
- **urgencia:** media
- **ya se intentó:** lectura del árbol de imports; no se cambió código en este arranque del puente.
