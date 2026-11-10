# CHECKLIST de supervisión — RAWstudio

Fuente de verdad para el coordinador y Claude Code.  
**Repo:** https://github.com/rawstudio2030-afk/rawstudio · **Sitio:** https://rawstudio.biz  
**Rama / HEAD al abrir ronda 4:** `main` @ `65eefbf` (asignación ronda 4 ~14:35 America/Mexico_City, 2026-11-06)  
**Código de producto de la landing:** [`4e15d81`](https://github.com/rawstudio2030-afk/rawstudio/commit/4e15d81c7155d446fa52d941678fb5cfe3a6e018) verificado. **Reproductor:** [`24a0a78`](https://github.com/rawstudio2030-afk/rawstudio/commit/24a0a7844ec194090af20dbbb65bcbab4dadc78b) verificado. **Comentarios:** [`fb594f1`](https://github.com/rawstudio2030-afk/rawstudio/commit/fb594f1817891010d730b088f2536c1e87bcfc1a) + migración aplicada (`65eefbf`).  
**Leyenda:** `pass` | `partial` | `fail` | `not_started`  
Ítems en `pass` son **inmutables** salvo regresión documentada.

---

## Rondas activas

| Tarea | Ronda | Estado | Inicio (America/Mexico_City) | Notas |
|-------|-------|--------|------------------------------|-------|
| Recortar landing al hero (eager loading §2.1–2.2) | **1 / 10** | **Hecha y verificada** (`4e15d81`) | 2026-11-06 ~08:22 | §2.1 y §2.2 → `pass`. |
| Reproductor: cromo propio + velocidad (+ PiP explícito) | **2 / 10** | **Hecha y verificada** (`24a0a78`) | 2026-11-06 ~10:20 | Velocidad y UX tipo YouTube → `pass`; PiP → `pass` con nota. Calidad auto y captions fuera. |
| Marca en ventanas (`VENTANAS_SIN_MARCA=false`) + comentarios y reseñas (§4) | **3 / 10** | **Hecha** (código + lectura anónima en ficha real) | 2026-11-06 ~11:10 | §4 → `partial` hasta probar escribir/calificar con clip desbloqueado. |
| Recortar Portada duplicada bajo el hero y en `/entrar` | **4 / 10** | **Hecha** (`b7a7ec4`, reporte en `653c989`) — pendiente de verificación del coordinador | 2026-11-06 ~14:35 | Ver `bridge-response.md` id `20261106-04`. Tope 1 h. |
| Consultas pagadas por Telegram (página pública) | **5 / 10** | **Hecha** (`3b88b30`, reporte en `653c989`) — pendiente de verificación del coordinador | 2026-11-06 ~15:00 | Ver `bridge-response.md` id `20261106-05`. Después de la 4 si esta sigue pendiente. Tope 1 h. |
| Avatares automáticos (frame o inicial/silueta) | **6 / 10** | **Hecha** (`bc5edf6`, reporte en `653c989`) — pendiente de verificación del coordinador | 2026-11-06 ~15:15 | Ver `bridge-response.md` id `20261106-06`. Después de la 4 y la 5. Tope 1 h. |
| Trato de género desde el alta | **7 / 10** | **Asignada** — esperando código | 2026-11-06 ~17:56 | Ver `bridge-response.md` id `20261106-07`. Tope 1 h. |

---

## Resumen de puntaje

| Estado | Cantidad |
|--------|----------|
| pass | 13 |
| partial | 9 |
| fail | 2 |
| not_started | 5 |
| **Total ítems** | **29** |

_(Ronda 1 y 2 verificadas. Ronda 3: §4 `not_started`→`partial`. Fails que quedan: §6.1 legales y §7.5 CLAUDE.md. Not started que quedan: calidad auto, captions, Telegram, avatares, trato de género (§10, ronda 7). §5 y §9 siguen `not_started` hasta que el coordinador verifique las rondas 5 y 6.)_

---

## 1. Convenciones de UI

### 1.1 Logo / wordmark «RAW studio» arriba a la izquierda → home
- **Estado:** `partial` *(inmutable respecto a pass: no es pass)*
- **Evidencia:** `src/components/Wordmark.tsx` — en `/`/`/age`/`/intro` inerte; fuera → `/clip` o `/entrar`.
- **Para pasar:** Definir home de producto con Sergio si hace falta; alinear header.

### 1.2 Menú de cuenta a la derecha
- **Estado:** `partial`
- **Evidencia:** Barra «Yo»/«Entrar»; sin menú top-right en portada.

### 1.3 Acciones primarias visibles, secundarias escondidas
- **Estado:** `partial`
- **Evidencia:** CTAs portada; compra primaria en clip.

### 1.4 Orden de botones / nav tipo YouTube·TikTok·OnlyFans
- **Estado:** `partial`
- **Evidencia:** Barra Explorar primero, «Yo» al final (`rutas.ts`).

### 1.5 Mobile-first
- **Estado:** `partial`
- **Evidencia:** DESIGN-BRIEF + viewport; el peso inicial de la portada bajó en ronda 1 (paquete principal 705.67 → 640.20 kB; sin `launch.mp4` en el bundle). Sigue partial por el resto del recorrido móvil.

### 1.6 Miami Neon en modo marca vs sobrio en consumo
- **Estado:** `pass` ✅ **inmutable**
- **Evidencia:** tokens en `diseño.ts`; portada marca / clip consumo.

---

## 2. Eager loading (landing) — **ronda 1 hecha**

### 2.1 Carga inicial = solo hero (título, subtítulo, CTA principal)
- **Estado:** `pass` ✅ **inmutable**
- **Ronda:** 1/10 verificada 2026-11-06 ~10:06 America/Mexico_City.
- **Evidencia:** [`4e15d81`](https://github.com/rawstudio2030-afk/rawstudio/commit/4e15d81c7155d446fa52d941678fb5cfe3a6e018) — `Portal.tsx` ya no importa en estático `launch.mp4`, `Portada` ni `SeccionesNeon`. `Cintillo`, `ComoFunciona`, `FormasDeGanar` y `Portada` van con `React.lazy` y se montan al click. El iris usa un gradiente, no `<video>`. Reporte de primer paint en `bridge-query.md` [id: 20261106-01].

### 2.2 Contacto, privacidad, FAQ solo con click / petición explícita
- **Estado:** `pass` ✅ **inmutable**
- **Evidencia:** Rutas `/contacto` `/preguntas` `/privacidad` `/terminos` OK. `Portada.tsx` sustituyó el acordeón FAQ por un enlace a `/preguntas`; el pie solo enlaza esas rutas. `Portada` no se monta en el primer paint (sale con «Sobre nosotros»). `Entrar.tsx` también carga `Portada` con `lazy`.

---

## 3. Reproductor de video — **ronda 2 hecha**

Ubicación: `src/components/Reproductor.tsx` usado desde `src/screens/ClipDetail.tsx` (`<Reproductor src poster marca />`) + URL firmada (`urlVideoFirmada` / `ver-clip`) + marca dentro del reproductor. Evidencia: [`24a0a78`](https://github.com/rawstudio2030-afk/rawstudio/commit/24a0a7844ec194090af20dbbb65bcbab4dadc78b).

| Control | Estado |
|---------|--------|
| Play / pause | `pass` ✅ inmutable |
| Seek / scrub | `pass` ✅ inmutable |
| Volumen / mute | `pass` ✅ inmutable |
| Pantalla completa | `pass` ✅ inmutable |
| Minimizar / PiP | `pass` ✅ inmutable — botón explícito solo si `document.pictureInPictureEnabled`. Desde ronda 3, **con marca se esconde** (decisión de seguridad; ver `20261106-03`). |
| Velocidad | `pass` ✅ inmutable — 0.5–2× sobre `playbackRate`, persistida en `localStorage` `rawstudio.velocidad` (`24a0a78`). |
| Calidad auto | `not_started` — fuera: un solo archivo por clip; no fingir selector |
| Captions | `not_started` — fuera: no hay pistas VTT |
| UX tipo YouTube | `pass` ✅ inmutable — cromo propio, ocultar a 2.5 s, teclado, doble toque ±10 s (`24a0a78`). Pantalla completa y PiP reales no se probaron a mano. |

---

## 4. Reseñas / comentarios en videos
- **Estado:** `partial`
- **Evidencia:** Producto [`fb594f1`](https://github.com/rawstudio2030-afk/rawstudio/commit/fb594f1817891010d730b088f2536c1e87bcfc1a) + migración aplicada (docs [`65eefbf`](https://github.com/rawstudio2030-afk/rawstudio/commit/65eefbf290d1e37600de9b19f9d4ff68150b27e2)). Verificado en vivo 2026-11-06 ~13:00 America/Mexico_City en ficha anónima: cabecera «Comentarios», «Entra para comentar», «Todavía no hay comentarios.» Sin promedio ni estrellas (correcto sin sesión). Escritura y calificación con una cuenta que ya desbloqueó el clip: aún no verificadas.

---

## 5. Consultas pagadas vía Telegram
- **Estado:** `not_started` — **en ronda 5** (`20261106-05`). Hoy no hay página, tarjeta ni bot. Esta ronda cubre solo la cara pública (reglas + checklist de privacidad mutua + capa de validación con DeepSeek + `/consultas` + tarjeta en Precios + recuadro en `/creadoras`). Precio fijo: 20 pesos por mensaje. El usuario del bot sigue pendiente: el dueño lo va a crear. No hay cobro ni chat real en esta ronda.

---

## 6. Seguridad y legales

### 6.1 Pendientes legales (abogado)
- **Estado:** `fail` (bloqueante lanzamiento) — requiere Sergio/abogado; no es esta ronda de UI.

### 6.2 Seguridad reciente / P0 escrituras y saldo
- **Estado:** `partial`

### 6.3 Age gate / 18+
- **Estado:** `pass` ✅ **inmutable** — no tocar en ronda 2.

### 6.4 Idioma
- **Estado:** `partial` — restos EN (p. ej. «Join us» al abrir «Sobre nosotros» en `Portada.tsx`).

---

## 7. Coordinación

### 7.1 Archivos puente — `pass` ✅ inmutable
### 7.2 Checklist documentada — `pass` ✅ inmutable
### 7.3 Límites anti-bucle documentados — `pass` ✅ inmutable
### 7.4 Diario de decisiones — `partial` (actualizado con ronda 3 verificada en parte y rondas 4, 5 y 6 abiertas)
### 7.5 CLAUDE.md — `fail` (aún no existe)

---

## 8. Stack (contexto)
React 19 · Vite 8 · HashRouter · Supabase · GitHub Pages · comisión 20% / SPEI / 18+.

---


## 9. Avatares de creadoras
- **Estado:** `not_started` — **en ronda 6** (`20261106-06`). Hoy 4 creadoras tienen `avatar_path`; 51 sin foto tienen video publicado (candidatas a un frame); 1 (`@lumen`) no tiene video y vería un avatar neutro (inicial o silueta). El fallback actual es un círculo rayado o de color sólido, no un balón. Esta ronda cubre el componente unificado, la heurística sobre `cuadrosDeVideo`, la asignación solo si `avatar_path` es null (al publicar y/o con acción admin) y el fallback de inicial o silueta. No se pisan fotos existentes ni se usa la portada de 32 px.

## 10. Trato de género
- **Estado:** `not_started` — **en ronda 7** (`20261106-07`). Registrar mujer / hombre / neutro / no_decir desde el alta (obligatorio, sin preselección); helper único de trato (`src/lib/trato.ts`); cuentas existentes en neutro hasta que elijan (aviso en Perfil, sin bloquear); no publicar el valor en la ficha pública; no renombrar `/creadoras`.

## Decisiones

### El descenso (2026-11-10) — dirección aprobada, pendiente de implementar
1. Sergio eligió la landing como un edificio de cuatro pisos: planta baja Collins Avenue → el antro → el cuarto oscuro → el calabozo (tipografías de la maqueta actual, no `v1`).
2. Maqueta y capturas: `docs/diseno/descenso/` (`45c6018`, `13be7e6`). Rondas `[id: 20261110-01]` a `[id: 20261110-04]` en el puente.
3. El ítem §1.6 (Miami Neon, `pass`) no se marca como regresión hasta que estas rondas aterrizen; entonces se reescribe como El descenso (marca vs consumo). No se toca ningún otro `pass` inmutable (§2.1 y §2.2 incluidos: el descenso lazy-carga los pisos de abajo).
4. Admin: solo tokens nuevos, desktop-only (`ANCHO_MINIMO` 1280). Sin migraciones, sin renombrar `/creadoras`, sin mover el login a `/entrar`, sin analítica.

### Arranque
1. Docs puente + checklist creados sin cambio de producto.

### Ronda 1 (2026-11-06) — landing al hero — HECHA
1. Primer paint = wordmark + titular + subtítulo + CTA «Crear mi cuenta»; secundario sin montar destino.
2. Diferidos: `ComoFunciona`, `FormasDeGanar`, `Cintillo`, `Portada`/FAQ/pie, `launch.mp4` (opción A: gradiente en el iris).
3. Verificado en `4e15d81` + reporte del puente. §2.1 y §2.2 son `pass` inmutables.

### Ronda 2 (2026-11-06) — reproductor
1. **Por qué:** pedido explícito del usuario + velocidad `fail` + UX tipo YouTube `fail`.
2. **Qué:** cromo propio (sin `controls` nativo), velocidad con `playbackRate` persistida, PiP explícito si hay API, teclado y ±10 s. Conservar URL firmada y marca de agua.
3. **Qué no:** calidad automática (un solo archivo; haría falta transcodificar), captions (no hay VTT), landing, age gate, comentarios, Telegram, copy 80%/SPEI/18+.
4. Este commit de docs no implementa el reproductor; Claude Code debe seguir `bridge-response.md` `[id: 20261106-02]`.
5. Ítems ya `pass` permanecen inmutables.

### Ronda 2 — verificada (2026-11-06 ~11:08)
1. Código de `24a0a78` cumple: velocidad, UX tipo YouTube y PiP a `pass`.
2. Decisión de seguridad: `VENTANAS_SIN_MARCA=false`. PiP y `webkitEnterFullscreen` sacan el video sin marca; con marca se esconden. `requestFullscreen` del contenedor se queda.

### Ronda 3 (2026-11-06 ~11:10) — marca en ventanas + comentarios y reseñas
1. Leer: quien abre la ficha. Escribir: sesión + `tiene_acceso`. Planos, recientes primero, paginados, ≤500, sin HTML, handle público, insignia «Creadora».
2. Borrado blando por autora, dueña o admin. Calificación 1–5 opcional, una por persona y clip, promedio y cantidad si hay ≥1.
3. RLS + RPC `security definer`. Sin moderación, notificaciones ni hilos.

### Ronda 3 — verificada en parte (2026-11-06 ~13:00)
1. Código de `1a1536f` y `fb594f1` en `origin/main`; migración de comentarios aplicada.
2. Lectura anónima en ficha real: vacía + «Entra para comentar». §4 → `partial`. Escritura/calificación pendientes de prueba con clip desbloqueado.

### Ronda 4 (2026-11-06 ~14:35) — recortar Portada duplicada
1. **Por qué:** Sergio vio el hero y, debajo, casi otra página completa. Es `Portada` montada en «Sobre nosotros» y otra vez en `/entrar`, más `Cintillo` en cada sección.
2. **Qué:** «Sobre nosotros» pasa a un bloque corto (qué es + origen + enlace a preguntas + pie de cuatro enlaces). `/entrar` se queda en la puerta más un enlace a preguntas. No montar `Cintillo` en la landing.
3. **Qué no:** hero, «Cómo funcionar», «Precios», reproductor, comentarios, Telegram, textos legales, borrar `Portada.tsx` ni `Cintillo.tsx`.
4. Este commit de docs no implementa el recorte; Claude Code debe seguir `bridge-response.md` `[id: 20261106-04]`.
5. Ítems ya `pass` permanecen inmutables (§2.1 y §2.2 incluidos).

### Qué debe decidir Sergio (solo negocio/contenido — no bloquea ronda 4)
- Datos legales definitivos / política retiro de compra permanente / jurisdicción / plazo verificación.
- Home del logo con sesión (portada vs catálogo).
- Alcance/precio consultas Telegram.
- Lanzar vs esperar abogado.
- Más adelante: si se invierte en transcodificar varias calidades (HLS / renditions) para poder hacer calidad automática de verdad.

**Para la ronda 4: no hay decisión de negocio pendiente.**

### Ronda 5 (2026-11-06 ~15:00) — consultas por Telegram (cara pública)
1. **Por qué:** Sergio dictó las reglas por voz y pidió empezar la sección o página.
2. **Qué:** página `/consultas` con las reglas canónicas, el checklist de privacidad mutua y la capa de validación (DeepSeek solo valida, no escribe respuestas); tarjeta en «Precios» que enlaza ahí; recuadro corto en `/creadoras` con la guía de tres puntos y el plazo de 2 días.
3. **Qué no:** bot real, llamadas a DeepSeek, claves de API, username inventado, cobro del mensaje, reembolso si no contestan, botón de Telegram en la ficha, tocar `/chat` (encargos), legales, reproductor, comentarios, el recorte de la ronda 4.
4. Precio: **20 pesos** por mensaje (Sergio corrigió 30 → 20). Checklist de privacidad mutua incluido. El usuario del bot sigue pendiente: el dueño lo va a crear (constante vacía hasta entonces).
5. Este commit de docs no implementa la página; Claude Code debe seguir `bridge-response.md` `[id: 20261106-05]`.
6. Ítems ya `pass` permanecen inmutables.


### Ronda 6 (2026-11-06 ~15:15) — avatares automáticos para creadoras sin foto
1. **Por qué:** Sergio pidió por voz generar fotos de perfil automáticas: frame no explícito del propio video si no hay foto; si no hay video, silueta o inicial (no un ícono tipo balón).
2. **Qué:** componente `Avatar` unificado; extraer cuadros con `src/lib/miniatura.ts` y una heurística (cuadros tempranos, exposición razonable, no casi uniformes); subir al bucket `avatars` y escribir `avatar_path` solo si es null, al publicar y con una acción admin de backfill; fallback de inicial (o silueta) para quien no tenga video.
3. **Qué no:** pisar las 4 fotos que ya existen, usar `cover_path` de ~32 px ni `clip-covers-full` ni `perfiles/pp_big-*`, inventar un clasificador NSFW o una API nueva, mezclar el commit con las rondas 4 o 5, tocar Telegram/DeepSeek, legales, reproductor o comentarios.
4. Snapshot ~15:09: 56 creadoras, 4 con foto, 51 candidatas a frame, 1 neutro (`@lumen`).
5. Este commit de docs no implementa los avatares; Claude Code debe seguir `bridge-response.md` `[id: 20261106-06]`.
6. Ítems ya `pass` permanecen inmutables.

### Qué sigue decidiendo Sergio (no bloquea el texto ni la página informativa)
- El usuario del bot de Telegram (el dueño lo va a crear).
- Cómo se cobra el mensaje y qué pasa si la creadora no responde en 2 días.

### Ronda 7 (2026-11-06 ~17:56) — trato de género desde el alta
1. **Por qué:** Sergio vio que el sitio dice «creadora» en general aunque la persona puede ser creador, y pidió registrar el trato desde el principio.
2. **Qué:** columna `trato` en `profiles` (`mujer | hombre | neutro | no_decir`, nullable para existentes); elección obligatoria en el registro, sin preselección; editable en Perfil; helper único de trato (mujer → creadora/usuaria; hombre → creador/usuario; neutro y no_decir → sin asumir género, sin «creadore» ni «elle»); cuentas sin valor tratadas como neutro con aviso en Perfil; sustituir solo el trato personal hardcodeado.
3. **Qué no:** mostrar el valor en la ficha pública (admin sí lo ve), renombrar `/creadoras`, tocar `/privacidad`/`/terminos` o inventar texto legal, copy 20%/SPEI/18+, botón de borrado duro o cambio de Anonimizar, Telegram, reproductor, avatares, landing.
4. Este commit de docs no implementa el trato; Claude Code debe seguir `bridge-response.md` `[id: 20261106-07]`. Rondas 4, 5 y 6 no se reabren.
5. Ítems ya `pass` permanecen inmutables.
