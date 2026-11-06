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

### Respuesta a [id: 20261106-01] — Ronda 1/10 · Recortar landing al hero
- **fecha:** 2026-11-06 08:22 (America/Mexico_City)
- **estado:** lista-para-claude
- **responde a:** Asignación del coordinador (Sergio pidió prioridad 1: landing solo hero / sin eager loading).
- **ronda:** 1 de 10 · **tope:** 1 hora · **tarea:** Recortar landing al hero
- **checklist afectados (aún NO marcar pass):** §2.1 sigue `fail` hasta que el código cambie y se verifique; §2.2 sigue `partial` hasta quitar FAQ/pie embebidos del primer paint.

#### Contexto y por qué
Hoy `src/screens/Portal.tsx` en el **mismo** render inicial monta:
1. Hero Miami (wordmark, titular, sub, CTAs, nav de opciones, enlaces, 18+).
2. Video `launch.mp4` vía `import launchVideo from '../assets/launch.mp4'` dentro del iris.
3. `<Cintillo />` inmediato.
4. `<ComoFunciona />` y `<FormasDeGanar />` desde `src/components/SeccionesNeon.tsx` (import estático).
5. `<Portada />` desde `src/components/Portada.tsx` (FAQ embebido, «Join us», pie Contacto/Preguntas/Privacidad/Términos).

Eso falla §2.1 (eager loading) y debilita §2.2. El pedido del usuario: primer paint = solo hero; el resto al click / petición explícita.

#### Decisión de UI/técnica (coordinador — no preguntar a Sergio)

**Hero (primer paint — montar sí):**
- Escena de marca ligera: `FondoMiami`, velo, `Wordmark`, `Insignia18`.
- Titular: «Graba. / Ponle precio. / Cobra.»
- Subtítulo: «El 80% de cada dólar es tuyo. / Sin exclusividad.»
- CTA primario: `Enlace` «Crear mi cuenta» → `/registro`.
- CTA secundario: «Ver cómo funciona» **puede quedarse en el hero** solo como control; **no** debe importar ni montar `ComoFunciona` hasta el click.
- Enlaces ligeros OK en hero: «Ya tengo cuenta» → `/acceso`, «Solo vengo a ver» → `/age`, opción «Creadores» → `/creadoras`.
- `FiltrosHervor` / `RecorteIris` solo si siguen siendo necesarios para el hero sin tirar de media pesada; si el video se va, simplifica el iris (p. ej. solo `Ojo` SVG o escena sin `<video>`).

**NO en el primer paint (ni import estático desde Portal):**
- `launch.mp4` / cualquier `<video src={launchVideo}>` alimentado por import de `src/assets/launch.mp4`.
- `Cintillo`.
- `ComoFunciona`, `FormasDeGanar` (`SeccionesNeon.tsx`).
- `Portada` (todo el bloque: qué es, seguridad, valores, FAQ, pie legal).
- Contenido textual de FAQ / contacto / privacidad / términos embebido.

**Post-click / petición explícita:**
1. Click «Ver cómo funciona» **o** opción «Cómo funciona» → `React.lazy` + `Suspense` monta `ComoFunciona` (chunk aparte) y hace scroll a su ancla. Hasta ese click: **cero** nodos de esa sección en el DOM.
2. Click «Precios» → igual con `FormasDeGanar`.
3. Click «Sobre nosotros» **o** un control «Más info» (si hace falta uno visible en hero; puede ser la propia opción) → lazy-mount de un bloque bajo demanda. **No** re-embeber FAQ ni textos largos de legales: al montar `Portada` (o un extracto), el FAQ debe ser enlaces a `/preguntas`; Contacto/Privacidad/Términos solo `Enlace` a `/contacto`, `/privacidad`, `/terminos` (rutas ya en `App.tsx`). Preferible: al lazy-cargar, **eliminar** el acordeón FAQ duplicado de `Portada.tsx` en favor de enlace a `/preguntas` (misma ronda si es poco invasivo).
4. Cintillo: solo después de la primera revelación bajo el fold (mismo flag que abre «cómo funciona»/más info), o no mostrarlo en esta ronda si complica — preferible diferirlo con el mismo gate de interacción.
5. `launch.mp4`: **no** en el bundle inicial de Portal. Opciones aceptables: (A) quitar el video del hero y dejar escena SVG; (B) `import()` dinámico / URL en `public/` y montar `<video>` solo tras idle **después** de interacción del usuario o tras revelar abajo. En ronda 1, **(A) es suficiente y preferida** si (B) arriesga volver a meter el asset en el grafo de Portal.

**App.tsx:** no hace falta lazy-routear todas las pantallas en esta ronda. El objetivo es el **árbol de Portal** + chunks que Portal dispara. No rompas rutas existentes (`/`, `/registro`, `/acceso`, `/age`, `/creadoras`, `/preguntas`, `/contacto`, `/privacidad`, `/terminos`, etc.).

**Fuera de alcance esta ronda:** age gate, reproductor, comentarios/reseñas, Telegram, copy de comisión/SPEI/18+, rediseño Miami Neon, cambios legales de fondo.

#### Archivos concretos a tocar (esperados)
- `src/screens/Portal.tsx` — principal: quitar imports estáticos pesados; estado `revelado` / flags por sección; lazy + Suspense; hero sin video import.
- Posible extracto: `src/components/PortalDebajo.tsx` (o similar) con cintillo + secciones lazy, importado solo con `lazy(() => import(...))` desde Portal.
- `src/components/Portada.tsx` — solo si al diferirlo aún embebe FAQ: sustituir FAQ embebido por enlace a `/preguntas`; pie solo enlaces a rutas.
- `src/components/SeccionesNeon.tsx` — probablemente sin cambios de API; solo dejar de importarlo en estático desde Portal.
- CSS (`index.css` / clases `portal-*` / `miami-*`) solo si hace falta para que el hero siga a viewport sin hueco de secciones vacías.
- **No** tocar `ClipDetail`, `AgeGate`, edge functions, migraciones.

#### Criterios de aceptación (verificables)
1. **DOM primer paint en `/`:** en el HTML renderizado bajo `#root` **antes de cualquier click**, no deben existir textos/nodos de: «Cómo funciona» (titular de sección), «Formas de ganar», preguntas del FAQ de `Portada`, «Join us», ni el cintillo magenta con «80% para ti». Sí deben existir: wordmark/RAW studio, titular Graba/Ponle precio/Cobra, subtítulo 80%, botón/enlace «Crear mi cuenta».
2. **Grafo de módulos:** `Portal.tsx` (o el módulo del hero) **no** debe tener `import … from '../assets/launch.mp4'` ni `import Portada from …` ni `import { ComoFunciona, FormasDeGanar } from …` en estático. Esos van en `import()` / `React.lazy`.
3. **Post-click:** al pulsar «Ver cómo funciona», aparece la sección y se puede hacer scroll; el network/chunk correspondiente se pide entonces (DevTools → JS).
4. **Rutas:** `/preguntas`, `/contacto`, `/privacidad`, `/terminos`, `/creadoras`, `/registro`, `/acceso`, `/age` siguen funcionando.
5. **Visual:** Miami Neon, mobile-first, español, insignia 18+, mismos textos de negocio (80%/SPEI no se reescriben).
6. `npm run typecheck` / `npm run lint` pasan.

#### Cómo demostrar HTML inicial vs post-click (obligatorio en el reporte)
- Arrancar `npm run dev` (o preview del build).
- Abrir `/#/` (HashRouter).
- **Sin click:** inspeccionar `#root` (o `document.body.innerText`) y confirmar ausencia de cadenas de secciones diferidas; opcional: snapshot del DOM.
- **Con click** en «Ver cómo funciona»: confirmar que esas cadenas aparecen y que hay request de chunk nuevo si aplica.
- En el bridge-query al cerrar: pegar evidencia breve (lista de strings ausentes/presentes + SHA).

#### Qué no tocar
Age gate, ClipDetail/player, Chat/encargos, Telegram, legales de contenido (salvo enlaces), Admin, Supabase, copy de comisión.

#### Siguiente paso para Claude Code
1. Implementar en un commit de producto (mensaje claro, p. ej. `fix: landing — primer paint solo hero, diferir secciones`).
2. Verificar criterios 1–6.
3. Actualizar `bridge-query.md` [id: 20261106-01] → `respondida` con SHA + evidencia de primer paint.
4. **No** marques tú solo el checklist como `pass`; el coordinador lo hará en la siguiente pasada al verificar el código.
5. Si bloqueas >15 min en una decisión de UI estándar, elige la opción A de arriba y documenta; no preguntes a Sergio.

- **razonamiento:** Pedido explícito del usuario + §2.1/`fail`. Separar hero del resto es decisión de UI/técnica estándar; no requiere negocio nuevo.
- **siguiente paso para Claude Code:** Ejecutar esta respuesta ahora.

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
| 2026-11-06 ~08:22 | Ronda 1: instrucciones recortar landing al hero | Usuario pidió prioridad 1; §2.1 fail. Hero = wordmark+titular+sub+CTA crear cuenta; diferir SeccionesNeon/Portada/cintillo/mp4 al click. FAQ/legales solo por rutas. **Sin código de app en este commit de docs.** |
