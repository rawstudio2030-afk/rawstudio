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

### [id: 20261106-02] Ronda 2 — reproductor: controles propios y velocidad
- **fecha:** 2026-11-06 10:20 (America/Mexico_City)
- **estado:** asignada
- **tarea:** Reproductor de video — §3 de CHECKLIST.md (velocidad, UX tipo YouTube, PiP explícito)
- **pregunta:** (asignación del coordinador, no una duda). Implementar `bridge-response.md` [id: 20261106-02].
- **contexto:** `src/screens/ClipDetail.tsx` usa `<video controls playsInline>` + URL de `urlVideoFirmada` (`ver-clip`) + `MarcaDeAgua`. Play/seek/volumen/fullscreen ya pasan (inmutables). Velocidad `fail`, UX tipo YouTube `fail`, PiP `partial`. Un solo archivo por clip: no inventar menú de calidad. Sin pistas VTT: no inventar captions. HEAD de referencia al asignar: `d958580`.
- **urgencia:** alta
- **ya se intentó:** diagnóstico del coordinador sobre el `<video controls>` nativo; sin cambio de producto en este commit de asignación.

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
