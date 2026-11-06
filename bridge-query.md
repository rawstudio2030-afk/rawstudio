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

### [id: 20261106-02] Ronda 2 hecha — reproductor: controles propios y velocidad
- **fecha:** 2026-11-06 (America/Mexico_City)
- **estado:** respondida
- **tarea:** Reproductor de video — §3 de CHECKLIST.md (velocidad, UX tipo YouTube, PiP explícito)
- **resultado:** HECHA y en `origin/main`. Commit de producto `24a7844ec194090af20dbbb65bcbab4dadc78b` (`fix: reproductor — controles propios y velocidad`), empujado como `b36cbaa..24a0a78`. Antes no estaba implementado en el working tree: se hizo en esta ronda.
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
