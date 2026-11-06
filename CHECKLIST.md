# CHECKLIST de supervisión — RAWstudio

Fuente de verdad para el coordinador y Claude Code.  
**Repo:** https://github.com/rawstudio2030-afk/rawstudio · **Sitio:** https://rawstudio.biz  
**Rama / HEAD docs:** `main` (instrucciones ronda 1 publicadas 2026-11-06 ~08:22 America/Mexico_City)  
**Código de producto base del diagnóstico:** aún refleja el árbol eager de `Portal.tsx` (imports estáticos de `Portada`, `SeccionesNeon`, `launch.mp4`) hasta que Claude Code aplique la ronda 1.  
**Leyenda:** `pass` | `partial` | `fail` | `not_started`  
Ítems en `pass` son **inmutables** salvo regresión documentada.

---

## Rondas activas

| Tarea | Ronda | Estado | Inicio (America/Mexico_City) | Notas |
|-------|-------|--------|------------------------------|-------|
| Recortar landing al hero (eager loading §2.1–2.2) | **1 / 10** | Instrucciones publicadas; **código app aún sin cambio** | 2026-11-06 ~08:22 | Ver `bridge-response.md` id `20261106-01`. Tope 1 h. §2.1 sigue **`fail`** hasta verificación post-implementación. |

---

## Resumen de puntaje (sin cambio de score en ronda 1 docs)

| Estado | Cantidad |
|--------|----------|
| pass | 8 |
| partial | 10 |
| fail | 5 |
| not_started | 4 |
| **Total ítems** | **27** |

_(El score no sube con este commit: solo hay instrucciones; Claude Code aún no implementó.)_

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
- **Evidencia:** DESIGN-BRIEF + viewport; peso inicial de portada aún alto (ligado a §2.1).

### 1.6 Miami Neon en modo marca vs sobrio en consumo
- **Estado:** `pass` ✅ **inmutable**
- **Evidencia:** tokens en `diseño.ts`; portada marca / clip consumo.

---

## 2. Eager loading (landing) — **en ronda 1**

### 2.1 Carga inicial = solo hero (título, subtítulo, CTA principal)
- **Estado:** `fail` ← **NO pasa a pass en este commit**
- **Ronda:** 1/10 iniciada 2026-11-06 America/Mexico_City; instrucciones en `bridge-response.md` `[id: 20261106-01]`.
- **Evidencia actual (código aún eager):** `src/screens/Portal.tsx` importa y monta de entrada `Portada`, `ComoFunciona`/`FormasDeGanar` (`SeccionesNeon.tsx`), `Cintillo`, y `import launchVideo from '../assets/launch.mp4'`. `App.tsx` solo hace `lazy` de `Admin` y `AltaCreadora`.
- **Decisión de esta ronda (coordinador):** Hero = wordmark + titular + subtítulo + CTA «Crear mi cuenta» (+ CTA «Ver cómo funciona» sin montar destino). Diferir cintillo, SeccionesNeon, Portada y `launch.mp4` a click / lazy. Mantener Miami Neon / ES / 18% / SPEI copy.
- **Para pasar (después de que Claude Code implemente y el coordinador verifique):** DOM de `/` sin secciones diferidas antes de click; sin import estático de mp4/Portada/SeccionesNeon desde Portal; evidencia HTML inicial vs post-click en el puente.

### 2.2 Contacto, privacidad, FAQ solo con click / petición explícita
- **Estado:** `partial` ← **sin subir aún**
- **Evidencia:** Rutas `/contacto` `/preguntas` `/privacidad` `/terminos` OK; `Portada.tsx` aún embebe FAQ/pie en el scroll de la landing cuando Portal la monta.
- **Para pasar:** No montar ese bloque en primer paint; FAQ → enlace a `/preguntas`; pie solo enlaces a rutas.

---

## 3. Reproductor de video

Ubicación: `src/screens/ClipDetail.tsx` — `<video controls playsInline>`.

| Control | Estado |
|---------|--------|
| Play / pause | `pass` ✅ inmutable |
| Seek / scrub | `pass` ✅ inmutable |
| Volumen / mute | `pass` ✅ inmutable |
| Pantalla completa | `pass` ✅ inmutable |
| Minimizar / PiP | `partial` |
| Velocidad | `fail` |
| Calidad auto | `not_started` |
| Captions | `not_started` |
| UX tipo YouTube | `fail` |

**Fuera de ronda 1.**

---

## 4. Reseñas / comentarios en videos
- **Estado:** `not_started` — fuera de ronda 1.

---

## 5. Consultas pagadas vía Telegram
- **Estado:** `not_started` — fuera de ronda 1.

---

## 6. Seguridad y legales

### 6.1 Pendientes legales (abogado)
- **Estado:** `fail` (bloqueante lanzamiento) — requiere Sergio/abogado; no es esta ronda de UI.

### 6.2 Seguridad reciente / P0 escrituras y saldo
- **Estado:** `partial`

### 6.3 Age gate / 18+
- **Estado:** `pass` ✅ **inmutable** — no tocar en ronda 1.

### 6.4 Idioma
- **Estado:** `partial` — restos EN en `Portada.tsx`; al diferir/limpiar Portada se puede alinear a ES sin decisión de negocio.

---

## 7. Coordinación

### 7.1 Archivos puente — `pass` ✅ inmutable
### 7.2 Checklist documentada — `pass` ✅ inmutable
### 7.3 Límites anti-bucle documentados — `pass` ✅ inmutable
### 7.4 Diario de decisiones — `partial` (actualizado con ronda 1 en bridge-response)
### 7.5 CLAUDE.md — `fail` (aún no existe)

---

## 8. Stack (contexto)
React 19 · Vite 8 · HashRouter · Supabase · GitHub Pages · comisión 20% / SPEI / 18+.

---

## Decisiones

### Arranque
1. Docs puente + checklist creados sin cambio de producto.

### Ronda 1 (2026-11-06) — landing al hero
1. **Por qué:** §2.1 `fail` + pedido explícito del usuario de recortar eager loading.
2. **Qué es hero:** wordmark + titular + subtítulo + CTA primario «Crear mi cuenta»; secundario «Ver cómo funciona» sin importar/montar la sección hasta click.
3. **Qué se difiere:** `ComoFunciona`, `FormasDeGanar`, `Cintillo`, `Portada`/FAQ/pie, `launch.mp4`.
4. **Legales/FAQ:** no embeber; usar rutas ya existentes.
5. **Este commit de docs no implementa** el cambio de app; Claude Code debe seguir `bridge-response.md` `[id: 20261106-01]`.
6. Ítems ya `pass` permanecen inmutables.

### Qué debe decidir Sergio (solo negocio/contenido — no bloquea ronda 1)
- Datos legales definitivos / política retiro de compra permanente / jurisdicción / plazo verificación.
- Home del logo con sesión (portada vs catálogo).
- Alcance/precio consultas Telegram.
- Lanzar vs esperar abogado.

**Para la ronda 1 de landing: no hay decisión de negocio pendiente.**
