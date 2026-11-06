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
- `src/content/portada.ts` (`FORMAS_NEON`) y el componente que pinte esas tarjetas si hay que volver una de ellas `Enlace`.
- `src/screens/Creators.tsx` (bloque corto + enlace).

#### Criterios de aceptación (verificables)
1. `/#/consultas` se abre sin sesión y sin age gate, muestra las seis reglas (precio de 20 pesos, 20 palabras, pertinencia, brújula, 2 días, guía de tres puntos) y el checklist de privacidad mutua (el cliente no ve el teléfono ni la cuenta personal de la creadora, solo el nombre del bot; la creadora no ve el teléfono del cliente; modo de privacidad al crear el bot; usuario dedicado, no una cuenta personal). También muestra la capa de validación: DeepSeek (opción económica) solo valida apoyo; no genera respuestas; si el mensaje del cliente no cumple (menos de 20 palabras o no pertinente) no se envía y se explica por qué; si cumple, pasa a la creadora; si la respuesta de la creadora no cumple los lineamientos, se le avisa sin reescribirla. No muestra un enlace a un bot inventado. El usuario del bot sigue pendiente: el dueño lo va a crear.
2. En `/#/`, primer paint sin cambios respecto a lo ya verificado (no aparece la tarjeta nueva hasta abrir «Precios»).
3. Al abrir «Precios», hay una tarjeta «Consultas por Telegram» que lleva a `/consultas`.
4. En `/#/creadoras` se lee el recuadro corto y el enlace a `/consultas`. El resto de esa página no cambia de sentido.
5. `/#/chat` sigue siendo encargos, no Telegram.
6. `npm run typecheck` (o `tsc -b`), lint y `npm run build` sin errores.

#### Cómo demostrar (obligatorio en el reporte de `bridge-query.md`)
- SHA completo y mensaje del commit.
- Diff resumido por archivo.
- Recorrido: `/consultas`, «Precios» → la tarjeta, `/creadoras` → el recuadro; primer paint de `/` intacto; `/chat` intacto.
- Confirmar que no hay `t.me/` ni username inventado.
- Salida de typecheck, lint y build.
- Lo que no pudiste verificar, dicho sin rodeos.

#### Límites anti-bucle
Máx 10 rondas por tarea; solo iterar si mejora el checklist; parar tras 2 rondas seguidas sin mejora; tope 1 hora.

#### Siguiente paso para Claude Code
1. `git pull`.
2. Si `20261106-04` no está empujada, hazla primero (otro commit).
3. Implementa esta ronda, un commit de producto (`feat: pagina de consultas pagadas por Telegram`) y `git push origin main`.
4. Marca `bridge-query.md` `[id: 20261106-05]` como `respondida` con SHA, diff y verificación. **No** marques `CHECKLIST.md` como pass.

---

### Respuesta a [id: 20261106-04] — Ronda 4/10 · Recortar la Portada duplicada bajo el hero
- **fecha:** 2026-11-06 14:35 (America/Mexico_City)
- **estado:** lista-para-claude
- **responde a:** Asignación del coordinador. Sergio pidió el recorte («vamos con el recorte de la portada duplicada debajo del hero»).
- **ronda:** 4 de 10 · **tope:** 1 hora · **tarea:** quitar la segunda página que se pega bajo el hero y en `/entrar`
- **checklist afectados (NO marques pass tú):** §2.1 y §2.2 ya son `pass` **inmutables** — no los rompas (el primer paint sigue siendo solo el hero; contacto, privacidad y FAQ siguen saliendo solo con un click). §6.4 idioma puede mejorar al desaparecer «Join us» y «All rights reserved» del recorrido visible; el coordinador lo verifica. No toques §4, §3 ni §6.1.

#### Estado de la ronda 3 (hecha)
Producto verificado por el coordinador: marca en ventanas [`1a1536f`](https://github.com/rawstudio2030-afk/rawstudio/commit/1a1536f76b9f3724788a72247f9b2b1e3ba3b152) y comentarios/reseñas [`fb594f1`](https://github.com/rawstudio2030-afk/rawstudio/commit/fb594f1817891010d730b088f2536c1e87bcfc1a), migración aplicada (`65eefbf`). En una ficha real anónima (2026-11-06 ~13:00 hora de México) se vieron «Comentarios», «Entra para comentar» y «Todavía no hay comentarios.» Escritura y calificación con cuenta que ya desbloqueó el clip aún no se probaron: §4 queda `partial`. No reabras esa tarea.

#### Qué hay hoy (revisado por el coordinador en `65eefbf`)
El hero ya cuenta la historia («Graba. Ponle precio. Cobra.» / «El 80% de cada dólar es tuyo.» / «Crear mi cuenta» / «Ya tengo cuenta»). Al bajar se pega casi otra página completa, y eso se siente redundante.

- `src/screens/Portal.tsx`: «Sobre nosotros» monta el `Portada` completo (lazy) dentro de `#sobre-nosotros`. Cualquier sección abierta (`alguna`) también monta `Cintillo` (otra franja de «80% para ti»). «Cómo funciona» (`ComoFunciona`) y «Precios» (`FormasDeGanar`) sí aportan y **se quedan**.
- `src/components/Portada.tsx` trae, en este orden: «¿Qué es RAWstudio?» + `QUE_ES` + titular «Tu contenido. Tu precio. Tu decisión.»; banda del 80%; `Botones` («Crear mi cuenta» / «Ya tengo una cuenta»); Seguridad + `VALORES` (títulos en inglés); bloque «Join us» + «Un sitio nuevo, desde acá.» y dos párrafos sobre creadoras latinas; enlace a `/preguntas`; pie con otro par de `Botones`, redes y «© 2026 RAWstudio · All rights reserved».
- `src/screens/Entrar.tsx`: debajo de la puerta (título, bajada, gancho «¿Vas a publicar tú?», «Crear mi cuenta», «Ya tengo cuenta») vuelve a montar el mismo `<Portada />` lazy. Es la misma segunda página, otra vez.
- `src/content/portada.ts`: `QUE_ES` ya tiene las dos frases que hacen falta («qué es» y «nació en México…»). No inventes copy de marketing nuevo.

#### Decisión de UI (coordinador — no preguntar a Sergio)

**1. Landing (`Portal.tsx`) — «Sobre nosotros» pasa a un bloque corto**
- Deja de montar el `Portada` completo.
- Al tocar «Sobre nosotros» monta un bloque corto con `id="sobre-nosotros"` (el ancla del scroll se queda) que incluya solo:
  1. El rótulo «¿Qué es RAWstudio?» y los dos párrafos de `QUE_ES` (reúsalos; no reescribas).
  2. Los dos párrafos que hoy viven bajo «Join us» en `Portada.tsx` (creadoras latinas, amateurs e independientes; «somos pocas todavía…»). Sin el rótulo inglés «Join us». Puedes conservar el titular en español «Un sitio nuevo, desde acá.»
  3. El enlace existente a `/preguntas` («Ver las preguntas frecuentes →»).
  4. Un pie corto con los cuatro enlaces que ya están en español: Contacto, Preguntas frecuentes, Privacidad, Términos. Crédito `© 2026 RAWstudio` (sin «All rights reserved»).
- **No incluyas:** la banda del 80%, `Botones` («Crear mi cuenta» / «Ya tengo una cuenta»), la grilla de Seguridad, `VALORES`, el segundo par de botones del pie, redes.
- No hace falta el titular «Tu contenido. Tu precio. Tu decisión.»: el hero ya dice eso.
- El bloque sigue siendo `React.lazy` + `Suspense` y solo se pide al click, igual que hoy. Puedes extraer un componente nuevo chico (p. ej. `src/components/SobreNosotros.tsx`) o recortar lo que monta Portal; no conviertas `Portada.tsx` en este bloque *y* lo sigas importando desde Entrar.
- Tipografía, tokens de `diseño.ts`, `Enlace`/`Pulsable`, modo marca. Todo en español. No inventes una ruta `/sobre`.

**2. `Entrar.tsx` — solo la puerta**
- Quita el `lazy` de `Portada` y el `<div>` que lo monta al final.
- Déjalo como está: título «Elige cómo entras.», bajada, gancho de publicar hacia `/creadoras`, «Crear mi cuenta», «Ya tengo cuenta».
- Añade un solo enlace de texto a `/preguntas` (p. ej. «Preguntas frecuentes →»), con `Enlace`. No pegues otra página abajo ni crees una ruta nueva.

**3. Cintillo — no se monta en la landing**
- En `Portal.tsx`, deja de montar `<Cintillo />` cuando `alguna` es verdadero (el hero ya dice el 80% y «sin exclusividad»). Si `alguna` queda sin uso, límpiala.
- No borres `src/components/Cintillo.tsx` en esta ronda (aunque nadie lo importe, anótalo en el reporte).

**4. No tocar**
- El hero (copy, botones, opciones, iris, primer paint).
- «Cómo funciona» y «Precios» (contenido y comportamiento, salvo que al abrirlos ya no salga el Cintillo).
- Reproductor, comentarios/reseñas, fichas, age gate, Wordmark, páginas `/privacidad` `/terminos` `/contacto` `/preguntas` (el contenido legal no se reescribe), Telegram, Admin, Supabase, copy 20%/SPEI/18+ del hero y del gancho de Entrar, `CLAUDE.md`.
- Si `Portada.tsx` queda sin importadores, no lo borres en esta ronda; anótalo.

#### Archivos concretos a tocar (esperados)
- `src/screens/Portal.tsx` (dejar de montar `Portada` y `Cintillo`; montar el bloque corto lazy).
- `src/screens/Entrar.tsx` (quitar `Portada`; añadir enlace a `/preguntas`).
- Un componente nuevo chico para el bloque corto, si lo extraes.
- `src/components/Portada.tsx` y `src/components/Cintillo.tsx` no se borran.
- `src/content/portada.ts` solo si reexportas `QUE_ES` sin cambiar el texto.

#### Criterios de aceptación (verificables)
1. Primer paint de `/#/` igual que en la ronda 1: en `#root` no están «¿Qué es RAWstudio?», «Join us», «Precios y formas de ganar» / «Formas de ganar», «80% para ti» del Cintillo, `#como-funciona`, `#precios`, `#sobre-nosotros`, «Privacidad», «Términos», «Contacto». Sí están el wordmark, el titular, el 80% del hero, «Crear mi cuenta», «Ver cómo funciona», las opciones, «Ya tengo cuenta», «Solo vengo a ver» y 18+. Sin petición de `Portada`, `Cintillo` ni `SeccionesNeon`.
2. «Ver cómo funciona» / «Cómo funciona» abre `#como-funciona` y **no** monta Cintillo ni el bloque de Sobre nosotros.
3. «Precios» abre `#precios` y **no** monta Cintillo.
4. «Sobre nosotros» abre `#sobre-nosotros` con `QUE_ES`, el origen (párrafos de creadoras latinas, sin «Join us»), el enlace a `/preguntas` y el pie de cuatro enlaces. **No** aparecen la banda «De cada dólar que te pagan, ochenta centavos son tuyos», ni «Crear mi cuenta» / «Ya tengo una cuenta» debajo del hero, ni Seguridad, ni los títulos en inglés de `VALORES`, ni «Join us», ni «All rights reserved».
5. `/#/entrar` ya no pinta `Portada`: no salen «¿Qué es RAWstudio?», la banda del 80%, «Join us» ni `VALORES`. Siguen el título, la bajada, el gancho de publicar y los dos botones. Hay un enlace a `/preguntas`.
6. `npm run typecheck` (o `tsc -b`), lint y `npm run build` sin errores. El paquete principal no debe crecer; si baja un poco al no arrastrar `Portada` desde Entrar, mejor.

#### Cómo demostrar (obligatorio en el reporte de `bridge-query.md`)
- SHA completo y mensaje del commit.
- Diff resumido por archivo.
- Primer paint y cada click (escritorio y 390×844), como en la ronda 1: qué hay y qué no hay en el DOM.
- `/#/entrar` antes/después: que ya no se pide ni se pinta `Portada`.
- Salida de typecheck, lint y build (tamaño del paquete).
- Lo que no pudiste verificar, dicho sin rodeos.

#### Límites anti-bucle
Máx 10 rondas por tarea; solo iterar si mejora el checklist; parar tras 2 rondas seguidas sin mejora; tope 1 hora. Si algo no cabe, súbelo hecho a medias pero honesto y anótalo.

#### Siguiente paso para Claude Code
1. `git pull` (el último cambio remoto solo toca los archivos del puente).
2. Implementa, un commit de producto (`fix: landing — recortar portada duplicada bajo el hero`) y `git push origin main`.
3. Marca `bridge-query.md` `[id: 20261106-04]` como `respondida` con SHA, diff resumido y verificación. **No** marques `CHECKLIST.md` como pass: eso lo hace el coordinador.

---

### Respuesta a [id: 20261106-03] — Ronda 3/10 · Marca en ventanas + comentarios y reseñas
- **fecha:** 2026-11-06 11:10 (America/Mexico_City)
- **estado:** hecha — producto `1a1536f` + `fb594f1`, verificada por el coordinador 2026-11-06 ~13:00 (lectura anónima en ficha real)
- **responde a:** Asignación del coordinador. Sergio aprobó cerrar la fuga de marca y seguir con comentarios («vamos con eso»).
- **ronda:** 3 de 10 · **tope:** 1 hora · **tarea:** §3 (ajuste de seguridad) + §4 de `CHECKLIST.md`
- **checklist afectados (NO marques pass tú):** §4 Reseñas/comentarios `not_started` → el coordinador lo verifica en código. §3 PiP queda `pass` con la nota de que con marca se esconde. Los `pass` de §2 y §3 son inmutables: no los rompas.

#### Estado de la ronda 2 (hecha)
Producto [`24a0a78`](https://github.com/rawstudio2030-afk/rawstudio/commit/24a0a7844ec194090af20dbbb65bcbab4dadc78b) verificado en código por el coordinador: sin `controls` nativo, cromo propio con `Pulsable` de 44 px, velocidad 0.5–2× en `localStorage` (`rawstudio.velocidad`), ocultar a 2.5 s, teclado, doble toque ±10 s, marca dentro del reproductor, URL firmada intacta. Velocidad y UX tipo YouTube pasan a `pass`. Pendiente de prueba manual: pantalla completa y PiP reales (tu entorno rechazó `requestFullscreen`).

#### Qué hay hoy (revisado por el coordinador en `1b9f73c`)
- **No existe nada de comentarios ni reseñas.** Ninguna migración tiene tabla, RPC ni tipos de comentarios, reseñas, ratings o reviews. Lo único con «comentario» es la columna `comentario` de los reportes (`reportar`, `src/lib/reportes.ts`, `src/admin/Reportes.tsx`): no es esto y no se toca. `DESIGN-BRIEF.md` no habla de comentarios. Es MVP desde cero.
- `src/components/Reproductor.tsx` línea 37: `const VENTANAS_SIN_MARCA = true`. Líneas 91–92: `puedePip = caps.pip && (VENTANAS_SIN_MARCA || !conMarca)` y `puedeCompleta = caps.elemento || (caps.nativo && (VENTANAS_SIN_MARCA || !conMarca))`.
- `src/screens/ClipDetail.tsx`: `useSesion()` da `sesion` y `perfilPropio`; `mio = sesion?.user.id === clip.creator_id`; `marca = !mio && perfilPropio ? '@handle' : null`; `desbloqueado = !!video` (URL firmada de `ver-clip`); `bloqueo?.motivo === 'geobloqueo'`; `<Reportar clip={id} etiqueta="Reportar este clip" />` cerca del final (≈ línea 378).
- Patrones del repo que debes seguir:
  - Acceso: `public.tiene_acceso(clip uuid, uid uuid default auth.uid())` (`security definer`, última versión en `20260929000000_caducidad.sql`): dueña, gratis vigente, compra, renta, suscripción; excluye `borrado_at` y retiro total. **Úsala para decidir quién escribe.** No dupliques la lógica.
  - Admin: `public.es_admin(uid default auth.uid())` (`20260822000000_admin.sql`).
  - Escrituras por RPC `security definer set search_path = ''`, con `revoke all … from public, anon; grant execute … to authenticated` (ver `admin_fijar_preview`, `reportar`). Errores en español con `raise exception`.
  - Borrado blando con `borrado_at` (como `clips`). Mayoría de edad y suspensión/veto se exigen en servidor desde `6435c27` y `20261118000000_veto_y_suspension.sql`: reutiliza esas comprobaciones al publicar.
  - Atribución pública: `profiles.handle`, `display_name`, `avatar_path`, `verified` (como `CON_AUTORA` en `src/lib/clips.ts`). Nunca email ni id visible.
  - Cliente: un módulo en `src/lib/` por dominio (como `reportes.ts`), UI con `Pulsable`, tokens de `src/lib/diseño.ts`, modo consumo en la ficha.

#### Entregable 1 — Marca en ventanas (primero, commit chico)
1. En `src/components/Reproductor.tsx`: `const VENTANAS_SIN_MARCA = false`. Nada más en ese archivo salvo ajustar el comentario de la línea 20 si queda desactualizado.
2. Resultado: con `marca` no hay botón PiP y no se llama `webkitEnterFullscreen`; la pantalla completa de elemento (`requestFullscreen` sobre el contenedor, con marca y barra) sigue si el navegador la da. Sin marca (la dueña viendo lo suyo) PiP y la nativa de iPhone se ofrecen si hay API.
3. No toques `MarcaDeAgua.tsx` ni la regla de a quién se le pone marca.
4. Commit sugerido: `fix: reproductor — no abrir ventanas sin marca de agua`.

#### Entregable 2 — Comentarios y reseñas en la ficha del clip
**Modelo (migración nueva, p. ej. `supabase/migrations/20261123000000_comentarios.sql`)**
- Tabla `public.comentarios_clip`: `id uuid pk default gen_random_uuid()`, `clip_id uuid not null references public.clips(id)`, `autora_id uuid not null references public.profiles(id)` (o `auth.users`, como hagan las demás), `texto text not null check (char_length(texto) between 1 and 500)`, `created_at timestamptz not null default now()`, `borrado_at timestamptz`, `borrado_por uuid`. Índice `(clip_id, created_at desc) where borrado_at is null`.
- Tabla `public.resenas_clip`: `clip_id`, `autora_id`, `calificacion smallint not null check (calificacion between 1 and 5)`, `created_at`, `updated_at`; **`primary key (clip_id, autora_id)`** (una por persona y clip, se actualiza).
- RLS activado en las dos. **Sin** políticas de insert/update/delete para `authenticated`/`anon`: todo lo que escribe va por RPC. Select directo no hace falta si la lectura va por RPC; si das select, que no exponga `autora_id` de más de lo necesario.
- RPCs (`security definer`, `set search_path = ''`, `revoke … from public, anon`, `grant … to authenticated`; la de lectura también a `anon` si la ficha se ve sin sesión):
  - `comentarios_de(clip uuid, antes timestamptz default null, cuantos int default 20)` → filas no borradas de ese clip, más recientes primero, paginadas por `created_at < antes`; devuelve `id, texto, created_at, handle, display_name, avatar_path, verified, es_creadora (autora = creator_id), es_mio (autora = auth.uid()), puede_borrar (mío o dueña o es_admin())`. Solo si el clip existe, no está borrado y es visible para quien pregunta (el mismo criterio que la ficha). Tope duro de `cuantos` (máx 50).
  - `resumen_resenas(clip uuid)` → `promedio numeric(2,1)`, `cantidad int`, `mi_calificacion smallint|null`.
  - `comentar(clip uuid, texto text)` → exige `auth.uid()`, `tiene_acceso(clip)`, mayoría de edad y cuenta no suspendida/vetada (reutiliza lo existente); `btrim`, no vacío, ≤500; rate-limit simple: máx 5 comentarios por cuenta por minuto (o 30 por hora) contando en la tabla → `raise exception 'Vas demasiado rápido; intenta en un momento'`.
  - `calificar(clip uuid, calificacion smallint)` → mismas comprobaciones; `insert … on conflict (clip_id, autora_id) do update`. La dueña **no** califica su propio clip (sí puede comentar). Opcional `quitar_calificacion(clip)`.
  - `borrar_comentario(id uuid)` → soft delete (`borrado_at = now()`, `borrado_por = auth.uid()`) solo si es la autora, la dueña del clip o `es_admin()`; si no, error.
- Si `admin_anonimizar_cuenta` (de `1b9f73c`) debe tocar algo, que sea mínimo: los comentarios de una cuenta anonimizada se muestran sin handle real (p. ej. «cuenta eliminada»). Si no es trivial, anótalo en el reporte y no lo hagas.

**Cliente**
- `src/lib/comentarios.ts`: `comentariosDe`, `resumenResenas`, `comentar`, `calificar`, `borrarComentario`, envolviendo las RPC como `reportes.ts`.
- Componente nuevo (p. ej. `src/components/Comentarios.tsx`) montado en `ClipDetail.tsx` debajo de la descripción/compra y **antes** de «Reportar este clip». No toques paywall, geobloqueo, portada borrosa, compra/renta/reembolso, `Reportar` ni `Reproductor`.
- Cabecera: si `cantidad > 0`, «★ 4.3 · 12 reseñas» (plural con `src/lib/plural.ts`). Si 0, no muestres estrellas ni promedio.
- Si puede escribir (`sesion && desbloqueado`): selector de 1–5 estrellas (5 `Pulsable` con `aria-label` «Calificar con N estrellas», `aria-pressed`) —oculto para la dueña— y caja de texto con contador `n/500`, botón «Publicar». Al publicar, el comentario aparece arriba sin recargar.
- Si no puede: sin sesión → «Entra para comentar» (lleva a `/entrar`); con sesión pero bloqueado → «Desbloquea el video para comentar». Sobrio, sin copy de precios ni comisión.
- Lista: más recientes primero; handle `@handle` + insignia «Creadora» si `es_creadora`; fecha relativa; botón «Borrar» solo si `puede_borrar` (con confirmación). Vacío: «Todavía no hay comentarios». «Cargar más» con `Pulsable` cuando la página vino llena.
- Texto como nodo de texto de React (nunca `dangerouslySetInnerHTML`), `white-space: pre-wrap`, `overflow-wrap: anywhere`.
- Modo consumo: fondo sobrio, tokens de `diseño.ts`; neon solo en lo que se actúa. Áreas táctiles ~44 px. Todo en español.
- Commit sugerido: `feat: comentarios y reseñas en la ficha del clip`.

#### Archivos concretos a tocar (esperados)
- `src/components/Reproductor.tsx` (solo la constante y su comentario).
- `supabase/migrations/2026112300000x_comentarios.sql` (nuevo).
- `src/lib/comentarios.ts` (nuevo), `src/components/Comentarios.tsx` (nuevo), `src/screens/ClipDetail.tsx` (montarlo).
- `src/index.css` solo si hace falta algo que no cabe en línea.
- Tipos generados de Supabase si el repo los mantiene.

#### Qué no tocar
Portal/landing, age gate, consultas Telegram, textos legales, `CLAUDE.md`, `ver-clip`/URLs firmadas, `MarcaDeAgua.tsx`, calidad/captions del reproductor, copy 20%/SPEI/18+, Admin (salvo que el borrado de admin salga gratis por `es_admin()` en la RPC, sin pantalla nueva). No construyas cola de moderación, notificaciones (email/Telegram), hilos/respuestas ni reportes de comentarios.

#### Criterios de aceptación (verificables)
**A. Marca en ventanas**
1. `Reproductor.tsx`: `VENTANAS_SIN_MARCA = false`.
2. Con `marca` truthy: no se renderiza el botón PiP y no hay llamada a `webkitEnterFullscreen`.
3. `requestFullscreen` del contenedor sigue disponible si el navegador lo permite (botón de pantalla completa visible en escritorio con marca).
4. Sin marca: PiP y webkit fullscreen se ofrecen si la API existe.

**B. Comentarios / reseñas**
1. Los comentarios se ven en la ficha para quien puede abrirla, aun sin desbloquear.
2. Con sesión y clip desbloqueado (compra, renta, suscripción, gratis o dueña) se publica; sin sesión o sin acceso la RPC rechaza (probado llamando la RPC directo, no solo ocultando el botón).
3. Texto vacío o de solo espacios se rechaza; >500 se rechaza; HTML se muestra literal.
4. Una sola calificación por persona y clip; calificar de nuevo la actualiza. Promedio y cantidad visibles solo si hay ≥1. La dueña no califica lo suyo.
5. Borrar: la autora y la dueña pueden; un tercero no (error de la RPC); admin sí. El borrado es blando y desaparece de la lista.
6. Más recientes primero; «Cargar más» trae la siguiente página sin repetir.
7. Insignia «Creadora» cuando comenta la dueña. Nunca aparece email ni id.
8. RLS activado; ninguna política permite insert/update/delete directo a `anon`/`authenticated`.
9. `npm run typecheck` (o `tsc -b`), lint y `npm run build` sin errores.

#### Cómo demostrar (obligatorio en el reporte de `bridge-query.md`)
- SHA(s) completos y mensaje de cada commit.
- Diff resumido por archivo.
- Para A: qué controles aparecen con y sin marca (escritorio y celular emulado).
- Para B: tabla de quién puede `select`/`comentar`/`calificar`/`borrar` y la evidencia (llamadas a RPC con cada rol: anónimo, sesión sin acceso, con acceso, dueña, admin si puedes), más capturas o descripción del estado vacío, la lista y «Cargar más».
- Salida de typecheck, lint y build.
- Lo que no pudiste verificar, dicho sin rodeos.

#### Límites anti-bucle
Máx 10 rondas por tarea; solo iterar si mejora el checklist; parar tras 2 rondas seguidas sin mejora; tope 1 hora. Si algo no cabe, súbelo hecho a medias pero honesto y anótalo.

#### Siguiente paso para Claude Code
1. `git pull` (el último cambio remoto solo toca los archivos del puente).
2. Entregable 1 → commit → entregable 2 → commit → `git push origin main`.
3. Marca `bridge-query.md` `[id: 20261106-03]` como `respondida` con SHA(s), diff resumido y verificación. **No** marques `CHECKLIST.md` como pass: eso lo hace el coordinador.

---

### Respuesta a [id: 20261106-02] — Ronda 2/10 · Reproductor (controles propios + velocidad)
- **fecha:** 2026-11-06 10:20 (America/Mexico_City)
- **estado:** hecha — producto `24a0a78`, verificada por el coordinador 2026-11-06 ~11:08
- **responde a:** Asignación del coordinador (Sergio pidió «viene lo del reproductor» tras cerrar la landing).
- **ronda:** 2 de 10 · **tope:** 1 hora · **tarea:** Reproductor de clip
- **checklist afectados (aún NO marcar pass tú):** Velocidad `fail` → debe pasar a `pass` tras verificación; UX tipo YouTube `fail` → `pass` o `partial` si queda pulido; Minimizar/PiP `partial` → `pass` si hay botón explícito cuando la API existe. Play/pause, seek, volumen y pantalla completa ya son `pass` **inmutables**: no los rompas. Calidad auto y captions **no** se marcan en esta ronda.

#### Urgente — 2026-11-06 10:32 (America/Mexico_City)
El coordinador revisó `origin/main` a las 10:29 hora de México: el HEAD sigue en `bde08ad` (solo las instrucciones). No existe `src/components/Reproductor.tsx` en el remoto y `ClipDetail.tsx` no tiene commit nuevo. Sergio confirma que el trabajo local ya debería estar listo.

**Haz commit de producto y `git push origin main` ahora.** No esperes otra ronda de docs.
- Mensaje sugerido: `fix: reproductor — controles propios y velocidad`
- Si el reproductor ya está implementado en el working tree, súbelo (un commit, o los que hagan falta si ya particionaste) y empuja.
- Si aún no está implementado, implementa [id: 20261106-02] y acto seguido commit + push.
- Después marca `bridge-query.md` [id: 20261106-02] como `respondida` con el SHA y la evidencia pedida.
- El coordinador no puede ver commits que no hayan llegado a GitHub.


#### Contexto y por qué
En `src/screens/ClipDetail.tsx` el clip desbloqueado se reproduce así:

```tsx
<video src={video!} controls playsInline poster={poster ?? undefined}
  style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#000' }} />
{marca && <MarcaDeAgua texto={marca} />}
```

`video` sale de `urlVideoFirmada` (edge `ver-clip`: URL firmada del archivo privado). La marca de agua es el handle de quien mira, en `src/components/MarcaDeAgua.tsx` (se mueve cada 7 s, `pointer-events: none`, `z-index: 3`).

Lo que ya funciona (vía cromo nativo del navegador) y **debe seguir funcionando**: play/pause, seek, volumen/mute, pantalla completa. Lo que falta: no hay control de `playbackRate` (velocidad `fail`); no hay cromo propio (UX tipo YouTube `fail`); PiP solo si el navegador lo ofrece en el menú nativo (`partial`); no hay varias resoluciones del mismo clip (calidad auto `not_started`); no hay pistas VTT (captions `not_started`).

#### Decisión de UI/técnica (coordinador — no preguntar a Sergio)

**Hacer en esta ronda**

1. Extrae un componente `src/components/Reproductor.tsx` (nombre cercano está bien) y úsalo desde `ClipDetail` cuando el clip está desbloqueado. Props mínimas: `src`, `poster`, `marca` (string | null). `ClipDetail` sigue decidiendo si hay marca (`!mio && handle`).
2. Quita el atributo nativo `controls` para no tener dos barras. Conserva `playsInline`, el `poster` nítido y `object-fit: cover` en el mismo contenedor (aspect-ratio 4/3, `maxHeight: 62vh`, radio neon).
3. Cromo propio, modo consumo (fondo plano, tipografía de interfaz, tokens de `diseño.ts`; el neon solo en lo que se actúa — p. ej. la barra de progreso o el control enfocado). Controles con `Pulsable`, nunca un `div` con `onClick`. Etiquetas y `aria-label` en español. Alto táctil mínimo ~44 px.
4. Barra inferior: play/pause, tiempo actual, seek (`input type="range"` o equivalente accesible), duración, volumen + mute, menú de velocidad, pantalla completa, y PiP **solo si** `document.pictureInPictureEnabled` (o la API que use el navegador). Centro: botón grande de play/pause al estar pausado o al mostrar controles.
5. Los controles se ocultan tras ~2.5 s de inactividad mientras reproduce; reaparecen con pointer/touch/focus/teclado. Clic en el vídeo (fuera de la barra) alterna play/pause.
6. **Velocidad:** menú con al menos `0.5`, `0.75`, `1`, `1.25`, `1.5`, `2`. Aplica `video.playbackRate`. Persiste en `localStorage` (p. ej. `rawstudio.velocidad`) y se reaplica al cambiar de clip o de `src`. Por defecto `1`.
7. **Teclado** cuando el reproductor tiene foco: `Espacio` o `k` play/pause; `j` / `l` −10 s / +10 s; flechas izquierda/derecha −5 s / +5 s; `m` mute; `f` pantalla completa. En iOS, si `requestFullscreen` no basta, usa `webkitEnterFullscreen` sobre el elemento `<video>`.
8. Doble toque a la izquierda / derecha del vídeo: −10 s / +10 s (gesto tipo móvil). No pelees con el clic simple de play/pause (umbral de doble toque estándar).
9. **Marca de agua:** se queda. `pointer-events: none`. La barra de controles debe tener `z-index` mayor que la marca para no volverse intocable cuando la marca pasa por abajo. No cambies el texto ni la lógica de a quién se le pone.
10. **Seguridad:** sigue usando la URL firmada de `urlVideoFirmada`. No subas el archivo a un bucket público, no añadas botón de descarga, no facilites «guardar vídeo». El paywall / geobloqueo / portada borrosa de `ClipDetail` no se toca.

**No hacer en esta ronda (y no fingir que está hecho)**

- **Calidad automática.** Hoy hay un solo archivo por clip (una URL firmada). Un selector de 720p/1080p o un ABR sin transcodificar sería mentira. No añadas menú de calidad. En el reporte del puente deja constancia: queda fuera hasta que existan varias pistas o HLS. El ítem sigue `not_started`.
- **Captions / subtítulos.** No hay pistas VTT. Fuera de ronda. Sigue `not_started`.
- Chromecast, AirPlay extra, mini-reproductor flotante propio (además de PiP nativo), comentarios, Telegram, landing, age gate, Admin, Supabase, copy de comisión/SPEI/18+.

#### Archivos concretos a tocar (esperados)
- `src/components/Reproductor.tsx` — nuevo.
- `src/screens/ClipDetail.tsx` — sustituir el `<video controls>` desbloqueado por `<Reproductor … />`. No reescribir compra, renta, reembolso, reportar ni ficha de autora.
- CSS mínimo si hace falta (`index.css` o clases del reproductor). Tokens desde `diseño.ts`.
- `src/components/MarcaDeAgua.tsx` — solo si el `z-index` o el solapamiento con la barra lo exige; no cambies el comportamiento de rotación.
- **No** tocar `Portal.tsx`, `AgeGate`, edge functions, migraciones, `ver-clip` (salvo un bug que impida reproducir, y entonces documéntalo).

#### Criterios de aceptación (verificables)
1. Clip desbloqueado: el `<video>` **no** lleva `controls` nativo. Se ven controles propios.
2. Play/pause, seek, volumen/mute y pantalla completa siguen funcionando (escritorio y móvil).
3. Se puede poner la velocidad en al menos 0.5, 1, 1.5 y 2; `video.playbackRate` cambia de verdad; al abrir otro clip se recuerda la última velocidad.
4. Si el navegador soporta PiP, hay un control explícito que lo activa; si no, el control no se muestra (no un botón muerto).
5. La marca de agua sigue apareciendo para quien mira y no es la autora; los controles se pueden pulsar aunque la marca cruce la barra.
6. Sigue habiendo URL firmada (la petición a `ver-clip` / `urlVideoFirmada` no desaparece). Sin acceso, el candado/portada borrosa no cambia.
7. Atajos de teclado del punto 7 funcionan con el reproductor enfocado.
8. En móvil el vídeo no se dispara a pantalla completa solo por darle play (`playsInline`); los controles se pueden usar con el dedo.
9. `npm run typecheck` y `npm run lint` pasan (sin introducir avisos nuevos en estos archivos).
10. Español en toda la UI del reproductor. Modo consumo, no portada Miami de marca.

#### Cómo demostrar (obligatorio en el reporte de `bridge-query.md`)
- Abrir un clip desbloqueado (el de la autora o uno ya comprado) en escritorio (~1280×800) y en vista estrecha (~390×844).
- Confirmar en el DOM que el `<video>` no tiene `controls`.
- Cambiar velocidad a 1.5 y 2 y leer `document.querySelector('video').playbackRate`.
- Recargar y confirmar que la velocidad se conserva.
- Probar seek, mute, fullscreen y, si aplica, PiP.
- Confirmar que la marca de agua sigue visible para una cuenta que no es la autora (o explicar cómo lo verificaste).
- Pegar SHA + lista breve de lo comprobado. **No** marques tú el checklist como `pass`.

#### Qué no tocar
Landing (`Portal.tsx` y chunks de la ronda 1), age gate, reseñas/comentarios, Telegram, textos legales de contenido, Admin, copy 80%/SPEI/18+, pipeline de transcodificación.

#### Siguiente paso para Claude Code
1. Implementar en **un commit de producto** (mensaje claro, p. ej. `fix: reproductor — controles propios y velocidad`).
2. Verificar criterios 1–10.
3. Actualizar `bridge-query.md` [id: 20261106-02] → `respondida` con SHA + evidencia.
4. **No** marques tú solo el checklist como `pass`; el coordinador lo hará al verificar el código.
5. Si bloqueas >15 min en un detalle de UI (posición de la barra, iconos, gesto de doble toque), elige lo más cercano a YouTube móvil y documenta; no preguntes a Sergio.

- **razonamiento:** Pedido explícito del usuario. Velocidad y cromo propio son UI estándar y no requieren negocio nuevo. Calidad automática SÍ exigiría transcodificar varias pistas: inventar el menú empeoraría el checklist al fingir una función, así que se deja fuera a propósito.
- **siguiente paso para Claude Code:** Ejecutar esta respuesta ahora.

---

### Respuesta a [id: 20261106-01] — Ronda 1/10 · Recortar landing al hero
- **fecha:** 2026-11-06 08:22 (America/Mexico_City)
- **estado:** aplicada
- **verificación del coordinador:** 2026-11-06 ~10:06 America/Mexico_City. Commit de producto [`4e15d81`](https://github.com/rawstudio2030-afk/rawstudio/commit/4e15d81c7155d446fa52d941678fb5cfe3a6e018); puente cerrado en [`d958580`](https://github.com/rawstudio2030-afk/rawstudio/commit/d9585800b4f0b313b34bbe9f02279bae8187148a). §2.1 y §2.2 pasan a `pass`. No reabrir ni reimplementar.
- **responde a:** Asignación del coordinador (Sergio pidió prioridad 1: landing solo hero / sin eager loading).
- **ronda:** 1 de 10 · **tarea:** Recortar landing al hero · **resultado:** HECHA.

El cuerpo original de la asignación 20261106-01 queda como historial: primer paint = hero; diferir Cintillo / ComoFunciona / FormasDeGanar / Portada / `launch.mp4`; FAQ → `/preguntas`. Claude Code lo implementó con `React.lazy`, gradiente en el iris (opción A) y `Entrar.tsx` también diferiendo `Portada`.

---

## Ejemplo (no es una respuesta operativa)

### Respuesta a [id: 20261106-00]
- **fecha:** 2026-11-06 08:05 (America/Mexico_City)
- **estado:** ejemplo
- **responde a:** ¿lazy-load de secciones bajo el hero en `/`?
- **decisión:** Sí. Primer paint = hero; resto lazy/click. Rutas legales ya existen.
- **razonamiento:** Criterio checklist eager loading.
- **checklist afectados:** §2.1 trabajo en curso (código aún no cambiado en el ejemplo).
- **siguiente paso para Claude Code:** Separar hero; no tocar copy de negocio.

---

## Diario de decisiones

| Fecha | Qué | Por qué |
|-------|-----|--------|
| 2026-11-06 | Se crean bridge + CHECKLIST | Arranque coordinación. Sin cambio de producto. |
| 2026-11-06 ~08:22 | Ronda 1: instrucciones recortar landing al hero | Usuario pidió prioridad 1; §2.1 fail. Hero = wordmark+titular+sub+CTA crear cuenta; diferir SeccionesNeon/Portada/cintillo/mp4 al click. FAQ/legales solo por rutas. |
| 2026-11-06 ~10:06 | Ronda 1 verificada (4e15d81) | Código cumple: lazy por sección, sin mp4, FAQ a `/preguntas`. §2.1 y §2.2 a `pass`. |
| 2026-11-06 ~10:20 | Ronda 2: reproductor con cromo propio y velocidad | Pedido del usuario. Calidad auto y captions fuera: un solo archivo y sin VTT. |
| 2026-11-06 ~11:08 | Ronda 2 verificada en código (`24a0a78`) | Velocidad y UX tipo YouTube a `pass`; PiP a `pass` con nota. Pantalla completa/PiP reales sin prueba manual. |
| 2026-11-06 ~11:10 | `VENTANAS_SIN_MARCA = false` | PiP y `webkitEnterFullscreen` sacan el video sin marca de agua. Con marca se esconden; `requestFullscreen` del contenedor se queda. |
| 2026-11-06 ~11:10 | Ronda 3: comentarios y reseñas (`20261106-03`) | §4 `not_started`; no existe modelo. Leer: quien abre la ficha. Escribir: sesión + `tiene_acceso`. Planos, recientes primero, paginados, ≤500, soft delete autora/dueña/admin, calificación 1–5 una por persona. Sin moderación ni notificaciones. |
