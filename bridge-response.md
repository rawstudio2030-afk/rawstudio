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
3. **Stack:** TypeScript strict, React 19 + `HashRouter`, Vite 8, tokens en `src/lib/diseño.ts`, **Miami Neon Night** (`DESIGN-BRIEF.md`).
4. **Prioridad:** seguridad y textos legales **antes** de abrir al público.
5. **Anti-bucle por tarea:** máx **10** rondas; solo iterar si mejora checklist; parar si **2** rondas seguidas no mejoran; tope **1 hora** por tarea; ítems `pass` **inmutables** salvo regresión.
6. **Diario:** cruzar diff + commit + ítem de checklist.

---

## Respuestas activas

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