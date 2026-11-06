# CHECKLIST de supervisión — RAWstudio

Fuente de verdad para el coordinador y Claude Code.  
**Repo:** https://github.com/rawstudio2030-afk/rawstudio · **Sitio:** https://rawstudio.biz  
**Rama / HEAD docs al abrir ronda 2:** `main` (asignación ronda 2 ~10:20 America/Mexico_City, 2026-11-06)  
**Código de producto de la landing:** [`4e15d81`](https://github.com/rawstudio2030-afk/rawstudio/commit/4e15d81c7155d446fa52d941678fb5cfe3a6e018) verificado.  
**Leyenda:** `pass` | `partial` | `fail` | `not_started`  
Ítems en `pass` son **inmutables** salvo regresión documentada.

---

## Rondas activas

| Tarea | Ronda | Estado | Inicio (America/Mexico_City) | Notas |
|-------|-------|--------|------------------------------|-------|
| Recortar landing al hero (eager loading §2.1–2.2) | **1 / 10** | **Hecha y verificada** (`4e15d81`) | 2026-11-06 ~08:22 | §2.1 y §2.2 → `pass`. |
| Reproductor: cromo propio + velocidad (+ PiP explícito) | **2 / 10** | Instrucciones publicadas; **código del reproductor aún nativo** | 2026-11-06 ~10:20 | Ver `bridge-response.md` id `20261106-02`. Tope 1 h. Calidad auto y captions fuera de esta ronda. |

---

## Resumen de puntaje

| Estado | Cantidad |
|--------|----------|
| pass | 10 |
| partial | 9 |
| fail | 4 |
| not_started | 4 |
| **Total ítems** | **27** |

_(Tras verificar la ronda 1: §2.1 `fail`→`pass`, §2.2 `partial`→`pass`. El reproductor todavía no cambia el score.)_

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

## 3. Reproductor de video — **en ronda 2**

Ubicación: `src/screens/ClipDetail.tsx` — `<video controls playsInline>` + URL firmada (`urlVideoFirmada` / `ver-clip`) + `MarcaDeAgua`.

| Control | Estado |
|---------|--------|
| Play / pause | `pass` ✅ inmutable |
| Seek / scrub | `pass` ✅ inmutable |
| Volumen / mute | `pass` ✅ inmutable |
| Pantalla completa | `pass` ✅ inmutable |
| Minimizar / PiP | `partial` ← ronda 2: botón explícito si la API existe |
| Velocidad | `fail` ← **objetivo de ronda 2** |
| Calidad auto | `not_started` — fuera: un solo archivo por clip; no fingir selector |
| Captions | `not_started` — fuera: no hay pistas VTT |
| UX tipo YouTube | `fail` ← **objetivo de ronda 2** (cromo propio, ocultar al reproducir, teclado, ±10 s) |

---

## 4. Reseñas / comentarios en videos
- **Estado:** `not_started` — fuera de ronda 2.

---

## 5. Consultas pagadas vía Telegram
- **Estado:** `not_started` — fuera de ronda 2.

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
### 7.4 Diario de decisiones — `partial` (actualizado con ronda 1 verificada y ronda 2 abierta)
### 7.5 CLAUDE.md — `fail` (aún no existe)

---

## 8. Stack (contexto)
React 19 · Vite 8 · HashRouter · Supabase · GitHub Pages · comisión 20% / SPEI / 18+.

---

## Decisiones

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

### Qué debe decidir Sergio (solo negocio/contenido — no bloquea ronda 2)
- Datos legales definitivos / política retiro de compra permanente / jurisdicción / plazo verificación.
- Home del logo con sesión (portada vs catálogo).
- Alcance/precio consultas Telegram.
- Lanzar vs esperar abogado.
- Más adelante: si se invierte en transcodificar varias calidades (HLS / renditions) para poder hacer calidad automática de verdad.

**Para la ronda 2 del reproductor: no hay decisión de negocio pendiente.**
