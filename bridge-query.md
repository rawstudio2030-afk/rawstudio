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

### [id: 20261106-07] Ronda 7 asignada — trato de género desde el alta
- **fecha:** 2026-11-06 17:56 (America/Mexico_City)
- **estado:** asignada
- **tarea:** §10 de `CHECKLIST.md` — trato de género (mujer / hombre / neutro / prefiere no decirlo) registrado desde el alta.
- **instrucciones:** lee `bridge-response.md` `[id: 20261106-07]` y ejecútala en su propio commit. No reabras las rondas 4, 5 ni 6.
- **al terminar:** cambia esta entrada a `estado: respondida` con SHA, diff resumido y verificación.

### [id: 20261106-06] Ronda 6 hecha — avatares automáticos para creadoras sin foto
- **fecha:** 2026-11-06 (America/Mexico_City)
- **estado:** respondida
- **tarea:** §9 de `CHECKLIST.md` — avatares de creadoras.
- **resultado:** HECHA y en `origin/main`. Commit `bc5edf64c73093fc033c2f95fbc107a61ed7221a` — `feat: avatares automaticos para creadoras sin foto`. **El retroactivo NO se ejecutó** (no hay sesión de administración en este entorno): la acción queda lista en Herramientas.
- **diff resumido:**
  - `src/components/Avatar.tsx` (nuevo): único componente de avatar. Con `avatar_path` pinta la foto; sin él, un círculo sobrio (`COLOR.superficieAlta`) con la inicial de `display_name`, o del `handle` si falta, o «·» si no hay nada. Parte por caracteres reales (acentos, ñ y emoji salen enteros). Sin rayas, sin «Foto», sin ícono.
  - Sustituye el círculo propio de: `Explorar.tsx` (listado de creadoras y tarjeta de clip), `CreatorProfile.tsx`, `ClipDetail.tsx` (autora), `Comentarios.tsx`, `Perfil.tsx` (el «Foto» suelto desaparece), `admin/Usuarios.tsx` y `admin/PublicarPor.tsx` (dos sitios).
  - `src/lib/miniatura.ts`: `puntuarCuadro` (pura) y `avatarDeVideo(fuente: File | string)`. Heurística documentada en el código: seis cuadros de la primera mitad del video (8%–50%); se descartan los de brillo medio fuera de 45–215 o desviación menor a 14 (casi negros, quemados, lisos); puntaje = 0.5·exposición cercana al medio + 0.5·detalle, más un bono de hasta 0.3 a los más tempranos; gana el mejor y se recorta el centro a 256×256. Si ninguno pasa, devuelve `null` y se queda la inicial. **No es un clasificador de contenido** y no pretende serlo.
  - `src/lib/avatarAuto.ts` (nuevo) y `src/screens/Upload.tsx`: al publicar, si la creadora no tiene `avatar_path`, el cuadro de su propio video pasa a ser su avatar. **Doble guarda de «solo si es null»:** se lee antes de trabajar y el `UPDATE` final lleva `.is('avatar_path', null)`; si se adelantaron, el archivo recién subido se borra. Si algo falla, el clip ya está publicado y se queda la inicial.
  - `src/admin/AvatarAuto.tsx` (nuevo, montado en `Herramientas`): «Avatares faltantes». Busca creadoras (`is_creator`, no vetadas, `avatar_path` nulo), toma el clip publicado más antiguo de cada una, saca el cuadro con la URL firmada de siempre (`urlVideoFirmada`) en lotes de 8 y **muestra una propuesta por creadora; no sube nada hasta que se confirma**, y al aplicar vuelve a comprobar que siga sin foto y usa `fijarAvatar`/`admin_fijar_avatar`. Muestra aplicadas, ya-tenían-foto, fallos, y las que se quedan con inicial.
  - No se tocó: `perfiles/pp_big-*`, `clip-covers-full`, la portada de 32 px, rondas 4 y 5. Sin claves `VITE_*` nuevas, sin service role, sin clasificador ni DeepSeek.
- **cómo se verificó:**
  1. `npm run typecheck`, `npm run lint` (incluidos los chequeos propios de dinero y plurales) y `npm run build` sin errores ni avisos nuevos en los archivos tocados. JavaScript total 865 → 872 kB (+7 kB).
  2. **Avatar** en un arnés temporal (ya borrado): «Valentina»→V, «Ángela»→Á, «  luna »→L, sin nombre y handle «lumen»→L, nada→«·», «🔥 Fuego»→🔥, «ñandú»→Ñ, a 26, 46 y 84 px.
  3. **Datos reales de producción** (lectura pública, servidor de desarrollo, 390×844): Explorar pintó 60 avatares, 59 con inicial y 1 con foto, y **0 círculos rayados**; la pestaña Creadoras listó 56 creadoras, 52 con inicial (coincide con 4 con foto); la ficha `@giannahot049` muestra «G» a 98 px; la ficha de un clip muestra la inicial de la autora y los comentarios siguen.
  4. **Heurística** (`puntuarCuadro`): negro, casi negro, quemado, gris liso, casi liso y vacío → descartados (−1); buena exposición con detalle 0.89; oscura con detalle 0.50; clara con detalle 0.42.
  5. **Extractor** sobre videos fabricados con `ffmpeg` (ya borrados): normal horizontal y vertical → JPEG de 256×256; empieza 2 s en negro → elige un cuadro posterior (no devuelve negro); todo negro y todo liso → `null`; archivo corrupto → `null` sin lanzar; funciona igual con un `File` que con una URL. El video de lanzamiento del repo (muy oscuro, brillo medio 10–40) también da `null`, que es lo correcto.
- **NO verificado, dicho sin rodeos:**
  - **El retroactivo.** No hay sesión de administración aquí, así que no se corrió ni se asignó ningún avatar: **0 creadoras recibieron frame y 0 quedaron en neutro por esta acción** (las 52 sin foto se ven con inicial porque el componente la pinta, no porque se les asignara nada). Está listo para correr desde Administración › Herramientas.
  - **La asignación al publicar de punta a punta** (subir un video real y ver `avatar_path`): se probó el extractor y se revisó la lógica y las guardas, no una publicación real.
  - **La lectura de pixeles de una URL firmada real.** Depende de que Storage mande cabeceras CORS; es la misma dependencia que ya usa `generarPortada` de administración, pero con URLs firmadas de producción no la probé. Si faltaran, el retroactivo devolvería «sin cuadro» para todas en vez de fallar en silencio.
  - **Perfil y las pantallas de administración**, que necesitan sesión: solo pasan typecheck y lint.
- **ADVERTENCIAS de producto/seguridad (decisión del coordinador/Sergio):**
  1. **Contenido 18+ en un bucket público.** `avatars` es público y los avatares salen en listados y fichas que cualquiera puede abrir. La heurística elige por calidad de imagen, **no sabe qué hay en el cuadro**, y los cuadros tempranos reducen el riesgo pero no lo eliminan. Por eso el retroactivo exige ver y confirmar cada propuesta. La asignación **al publicar** no tiene esa revisión: es automática, según la regla.
  2. **Antes de la moderación.** Al publicar, el clip puede quedar `pendiente`; su cuadro ya sería avatar público aunque luego se rechace. Opción más segura: asignar solo cuando el clip pase a aprobado, o pasar el avatar automático por la misma cola.
  3. **`admin_fijar_avatar` solo acepta creadoras con expediente** (las dadas de alta por administración). A una creadora sin expediente el retroactivo le reportará fallo; el flujo de publicar sí funciona para ella porque se escribe a sí misma.
- **¿Debería subir el checklist?** §9: pasa de `not_started` a `partial` (el avatar neutro ya está en todo el sitio; el cuadro automático está implementado pero sin ejecutar en datos reales). No lo marqué yo.
- **urgencia:** media

### [id: 20261106-05] Ronda 5 hecha — página de consultas pagadas por Telegram
- **fecha:** 2026-11-06 (America/Mexico_City)
- **estado:** respondida
- **tarea:** §5 de `CHECKLIST.md` — cara pública del servicio de consultas por Telegram.
- **resultado:** HECHA y en `origin/main`. Commit `3b88b308784e40a15e7c4a290ff580295dfd1269` — `feat: pagina de consultas pagadas por Telegram`. Sin bot, sin cobro, sin llamadas a DeepSeek, sin claves.
- **diff resumido:**
  - `src/content/consultas.ts` (nuevo): el texto canónico de Sergio y las constantes `PRECIO_CONSULTA_TELEGRAM = '20 pesos'` (única fuente del precio; sin dólares, sin 30, sin `[PRECIO]`), `BOT_TELEGRAM = ''` (vacío, el dueño lo va a crear) y `MIN_PALABRAS = 20`.
  - `src/screens/Consultas.tsx` (nuevo): `/consultas` con `MarcoDocumento`, igual que `/preguntas`. Intro, las seis reglas (precio, extensión, pertinencia, brújula, plazo de 2 días y guía de tres puntos), el checklist de privacidad mutua (cliente, creadora y «al crear el bot», incluido que el usuario sigue pendiente) y la capa de validación (DeepSeek en su opción más económica solo valida; no escribe respuestas; si el mensaje del cliente no cumple no se envía y se explica por qué; si cumple pasa a la creadora; si la respuesta de la creadora no cumple se le avisa sin reescribirla). Nota de 18+ y pie con `/preguntas` y `/contacto`. **Sin botón ni enlace a Telegram.**
  - `src/App.tsx` (ruta `/consultas`, n. 28) y `src/lib/rutas.ts` (`/consultas` en `SIN_PUERTA_DE_EDAD`). No está en la barra inferior.
  - `src/content/portada.ts` y `src/components/SeccionesNeon.tsx`: séptima tarjeta «Consultas por Telegram» en «Precios» (ícono `sobre` ya existente), la **única** que enlaza a `/consultas` (con «Leer las reglas →»); las otras seis siguen sin ser enlaces. Sigue saliendo solo al abrir «Precios».
  - `src/screens/Creators.tsx`: recuadro corto con el plazo de 2 días, la brújula, la guía de tres puntos y el enlace a `/consultas`, antes del cierre. El resto de la página no cambia.
- **cómo se verificó** (servidor de desarrollo, con el almacenamiento limpio para no arrastrar la edad confirmada):
  1. `/#/consultas` se abre sin sesión y **sin redirigir a `/age`**. Presentes: «cuesta 20 pesos», «cubre ese mensaje y la respuesta», «al menos 20 palabras… no se envía», «anclado al hilo», «la brújula es flexible… pregunta de vuelta», «máximo de 2 días», las tres frases de la guía; en privacidad: no ves el teléfono ni la cuenta personal de la creadora, solo el nombre del bot, la creadora no ve el teléfono del cliente, modo de privacidad, usuario dedicado y «el usuario del bot todavía está pendiente»; en validación: DeepSeek económica, no escribe respuestas, si no cumple no se envía y se explica, si cumple pasa, no reescribe; nota 18+.
  2. **Sin `t.me/` ni usuario inventado:** 0 coincidencias de `t.me` en los archivos nuevos o tocados, 0 enlaces externos y 0 patrones `@usuario` en la página.
  3. **`/#/`, primer paint:** sin la tarjeta de consultas, sin `#precios` y sin cintillo. Al abrir «Precios» aparecen 7 tarjetas, solo la de consultas es enlace (`#/consultas`) y al pulsarla se llega a `/#/consultas`.
  4. **`/#/creadoras`:** el bloque `#consultas` está antes del cierre, trae 2 días, brújula, guía y un único enlace a `#/consultas`; no repite privacidad, DeepSeek ni el precio; las secciones de protección y el cierre siguen.
  5. 390×844: sin desborde horizontal en `/consultas` ni en `/creadoras`; el enlace del recuadro mide 44 px.
  6. **`/chat`:** no hay cambios en `src/estudio`, `Chat` ni `Encargos` en el diff. No lo abrí en pantalla porque exige sesión.
  7. `npm run typecheck`, `npm run lint` (dinero y plurales incluidos) y `npm run build` sin errores. Paquete principal 655.89 → 662.57 kB: la pantalla nueva entra en el paquete principal como las demás de ayuda.
- **No verificado:** `/chat` en pantalla (requiere sesión); el comportamiento del enlace de «Precios» en celular real (solo emulado).
- **fuera de esta ronda, como se pidió:** el bot y su usuario, el cobro del mensaje, qué pasa si la creadora no responde en 2 días, la integración con DeepSeek y cualquier botón «consultar» en la ficha del clip. Si `BOT_TELEGRAM` se llena, hay que añadir el enlace: hoy no existe a propósito.
- **¿Debería subir el checklist?** §5: de `not_started` a `partial` (cara pública hecha; falta el bot y el cobro). No lo marqué yo.
- **urgencia:** baja

### [id: 20261106-04] Ronda 4 hecha — recortar la portada duplicada bajo el hero
- **fecha:** 2026-11-06 (America/Mexico_City)
- **estado:** respondida
- **tarea:** pulido de landing — quitar la segunda página que se pegaba bajo el hero y en `/entrar`.
- **resultado:** HECHA y en `origin/main`. Commit `b7a7ec45655d6a8b131370c2346bd59693466528` — `fix: landing — recortar portada duplicada bajo el hero`.
- **diff resumido:**
  - `src/components/SobreNosotros.tsx` (nuevo): el bloque corto, con `id="sobre-nosotros"`: «¿Qué es RAWstudio?» + `QUE_ES` (reutilizado, sin reescribir), el titular «Un sitio nuevo, desde acá.» y los dos párrafos de origen (sin el rótulo «Join us»), el enlace «Ver las preguntas frecuentes →» y un pie de cuatro enlaces (Contacto, Preguntas frecuentes, Privacidad, Términos) con «© 2026 RAWstudio» (sin «All rights reserved»).
  - `src/screens/Portal.tsx`: «Sobre nosotros» ya no monta `Portada`, monta `SobreNosotros` (sigue `React.lazy` y solo al click); se deja de montar el `Cintillo`; se quita `alguna`, que quedó sin uso. «Cómo funciona» y «Precios» no cambian.
  - `src/screens/Entrar.tsx`: sin `lazy` ni el `<div>` que montaba `Portada`; queda la puerta y un enlace de texto «Preguntas frecuentes →» a `/preguntas`.
  - **No se borraron** `Portada.tsx` ni `Cintillo.tsx`: ya **nadie los importa** (huérfanos), como se pidió anotarlo. `src/content/portada.ts` no se tocó.
- **cómo se verificó** (servidor de desarrollo, escritorio 1280×800 y 390×844):
  1. **Primer paint de `/#/`:** ausentes «¿Qué es RAWstudio?», «Join us», «Precios y formas de ganar», «80% para ti», «Privacidad», «Términos», «Contacto» y «ochenta centavos»; `#como-funciona`, `#precios` y `#sobre-nosotros` no existen; 0 nodos de cintillo; presentes el titular, el 80% del hero, «Crear mi cuenta», «Ver cómo funciona», «Ya tengo cuenta» y «Solo vengo a ver». Sin petición de `Portada`, `Cintillo`, `SeccionesNeon` ni `SobreNosotros`.
  2. **«Ver cómo funciona»:** abre `#como-funciona`, 0 cintillos, no monta `#sobre-nosotros`, sin «80% para ti»; solo se pide `SeccionesNeon`.
  3. **«Precios»:** abre `#precios`, 0 cintillos, no monta Sobre nosotros.
  4. **«Sobre nosotros»:** abre `#sobre-nosotros` con «¿Qué es RAWstudio?» y la primera frase de `QUE_ES`, el origen sin «Join us», el enlace a `/preguntas`, los cuatro enlaces del pie, «© 2026 RAWstudio» y sin «All rights reserved». **No** aparecen la banda «ochenta centavos son tuyos», un segundo «Crear mi cuenta»/«Ya tengo una cuenta» (el único «Crear mi cuenta» de la página es el del hero), Seguridad ni los valores en inglés, y hay 0 cintillos. Se pide `SobreNosotros`, no `Portada`.
  5. **`/#/entrar`:** sin «¿Qué es RAWstudio?», banda del 80%, «Join us» ni «Our values»; siguen el título, el gancho de publicar, «Crear mi cuenta», «Ya tengo cuenta» y el enlace a `#/preguntas`; no se pide `Portada`. Captura a 390×844 revisada.
  6. `npm run typecheck`, `npm run lint` y `npm run build` sin errores. Paquete principal **657.72 → 655.89 kB**; `Portada` ya no sale como chunk, y `SobreNosotros` pesa 2.39 kB.
- **No verificado:** build de producción servido (se probó en el servidor de desarrollo); la altura del bloque con textos más largos que los actuales.
- **¿Debería subir el checklist?** §6.4 (idioma): desaparecen «Join us» y «All rights reserved» del recorrido visible; §2.1 y §2.2 intactos. No lo marqué yo.
- **urgencia:** baja

### [id: 20261106-03] Ronda 3 hecha — marca en ventanas + comentarios y reseñas
- **fecha:** 2026-11-06 (America/Mexico_City)
- **estado:** respondida
- **tarea:** §3 ajuste de seguridad (`VENTANAS_SIN_MARCA = false`) y §4 de `CHECKLIST.md` (comentarios y reseñas en la ficha del clip).
- **resultado:** HECHA, en `origin/main` (`339195f..fb594f1`) y con la migración APLICADA en producción (`supabase db push`, 2026-11-06; ver «Estado de despliegue»).
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
  | anónimo | sí, si la ficha se ve (clip publicado, no borrado, creadora no vetada) [+16091 bytes at .content[1].resource.text]