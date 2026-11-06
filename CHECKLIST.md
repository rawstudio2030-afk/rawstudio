# CHECKLIST de supervisión — RAWstudio

Fuente de verdad para el coordinador y Claude Code.  
**Repo:** https://github.com/rawstudio2030-afk/rawstudio · **Sitio:** https://rawstudio.biz  
**Rama leída:** `main` @ `cadc7a91c644f652940007d2b4091cc62dc6a631` (2026-11-06 ~03:49 UTC → 2026-11-05 noche America/Mexico_City)  
**Leyenda:** `pass` | `partial` | `fail` | `not_started`  
Ítems en `pass` son **inmutables** salvo regresión documentada.

---

## Resumen de puntaje (arranque 2026-11-06)

| Estado | Cantidad |
|--------|----------|
| pass | 8 |
| partial | 10 |
| fail | 5 |
| not_started | 4 |
| **Total ítems** | **27** |

---

## 1. Convenciones de UI

### 1.1 Logo / wordmark «RAW studio» arriba a la izquierda → home
- **Estado:** `partial`
- **Evidencia:** `src/components/Wordmark.tsx` — «RAW» magenta + «studio» lima; en riel (`Navegacion.tsx`) va arriba a la izquierda. En `/`, `/age`, `/intro` el logo es **inerte** (no navega, a propósito por la puerta de edad). Fuera de ahí navega a `/clip` (con sesión) o `/entrar` (sin sesión), **no** a `/`.
- **Para pasar:** Definir «home» de producto (¿portada `/` o catálogo `/clip`?) y alinear wordmark + expectativa de header en pantallas de consumo; en landing pública, wordmark clicable a `/` sin saltarse age gate hacia contenido.

### 1.2 Menú de cuenta a la derecha
- **Estado:** `partial`
- **Evidencia:** No hay menú de cuenta top-right en la portada. Con sesión: destino «Yo» (`/yo`) en barra inferior / riel (`src/lib/rutas.ts` BARRA); ajustes en `/perfil`. Visitante: «Entrar».
- **Para pasar:** En pantallas con header (p. ej. clip/explorar), cuenta/avatar a la derecha al estilo OF/YT; secundarias (ajustes, cerrar sesión) dentro del menú, no en la barra principal.

### 1.3 Acciones primarias visibles, secundarias escondidas
- **Estado:** `partial`
- **Evidencia:** Portada: CTAs «Crear mi cuenta» / «Ver cómo funciona» visibles (`Portal.tsx`). Clip: compra primaria, renta secundaria debajo (`ClipDetail.tsx`). Reportar al pie. Barra: Dinero/Estudio/Mensajes como destinos de primera clase (`rutas.ts` comentarios).
- **Para pasar:** Auditoría pantalla por pantalla; ocultar atajos duplicados y textos de desarrollo (`?dev=1` ok).

### 1.4 Orden de botones / nav tipo YouTube·TikTok·OnlyFans
- **Estado:** `partial`
- **Evidencia:** Barra: Explorar primero, «Yo» al final (`rutas.ts`). Riel desktop tipo TikTok. Clip: volver + wordmark, paywall debajo del player.
- **Para pasar:** Header de consumo con cuenta a la derecha; player con menú de overflow para velocidad/calidad cuando existan.

### 1.5 Mobile-first
- **Estado:** `partial`
- **Evidencia:** `DESIGN-BRIEF.md` exige mobile-first; viewport en `index.html`; barra inferior + riel ≥1024; áreas táctiles 44px en varios flujos recientes.
- **Para pasar:** Medir portada y player en 360px; confirmar que el peso inicial no carga secciones bajo el fold.

### 1.6 Miami Neon en modo marca vs sobrio en consumo
- **Estado:** `pass`
- **Evidencia:** Tokens `#08080A`, `#FF2BD1`, `#00E5FF`, `#C8FF3D` en `src/lib/diseño.ts` + `GLOW`/`DEGRADADO`/`MIAMI`. Portada/age/acceso = marca (`PaginaMiami`, `FondoMiami`). `ClipDetail.tsx` documenta modo consumo (fondo plano, neon solo en precio/CTA). Admin sobrio en cian (commit `c1b0b070`).
- **Para pasar:** (ya pasa) No regresionar tokens ni mezclar neon denso en wallet/player.

---

## 2. Eager loading (landing)

### 2.1 Carga inicial = solo hero (título, subtítulo, CTA principal)
- **Estado:** `fail`
- **Evidencia:** `src/screens/Portal.tsx` monta en el mismo árbol: hero + cintillo + `ComoFunciona` + `FormasDeGanar` (`SeccionesNeon.tsx`) + `Portada` (qué es, seguridad, valores, **FAQ embebido**, pie con Contacto/Preguntas/Privacidad/Términos). Importa `launch.mp4` en el bundle de la portada. `App.tsx`: casi todas las pantallas son import estático; solo `Admin` y `AltaCreadora` son `lazy()`.
- **HTML inicial:** `index.html` solo tiene `#root` + script Vite — correcto para SPA; el exceso está en el **JS/React** del primer paint de `/`.
- **Para pasar:** Code-split del hero; diferir secciones inferiores (lazy + IO o click en opciones del nav del hero). No incluir FAQ/legales embebidos en el chunk crítico. Comparar tamaño del chunk de `/` antes/después.

### 2.2 Contacto, privacidad, FAQ solo con click / petición explícita
- **Estado:** `partial`
- **Evidencia:** Rutas dedicadas `/contacto`, `/preguntas`, `/privacidad`, `/terminos` (`Ayuda.tsx`, `Legal.tsx`) — bien. Pero `Portada.tsx` **embebe** FAQ y enlaces legales en la misma scroll de la landing, cargados sin click.
- **Para pasar:** Quitar o lazy-mount el bloque FAQ/pie informativo de la landing; dejar solo enlaces que naveguen a las rutas.

---

## 3. Reproductor de video

Ubicación: `src/screens/ClipDetail.tsx` — `<video src={…} controls playsInline poster={…} />` nativo del navegador. No hay componente custom de player. URL firmada vía edge `ver-clip` + `MarcaDeAgua`.

| Control | Estado | Evidencia / nota |
|---------|--------|------------------|
| Play / pause | `pass` | Controles nativos |
| Seek / scrub | `pass` | Controles nativos |
| Volumen / mute | `pass` | Controles nativos |
| Pantalla completa | `pass` | Controles nativos (soporte del UA) |
| Minimizar / PiP | `partial` | Sin control propio; PiP solo si el UA lo expone en el menú nativo |
| Velocidad (0.5×–2×) | `fail` | No implementado |
| Calidad auto-ajustable | `not_started` | Un solo archivo firmado; sin ABR/HLS/DASH |
| Subtítulos / captions | `not_started` | Sin tracks |
| UX tipo YouTube (overlay, menú ⋮, remember volume) | `fail` | Solo chrome nativo; inconsistente entre móvil/desktop |

**Para pasar el bloque player:** Controles custom (o librería) con volumen, fullscreen, PiP, velocidad, y al menos calidad automática o selector si hay múltiples renditions; layout modo consumo.

---

## 4. Reseñas / comentarios en videos

- **Estado:** `not_started`
- **Evidencia:** No hay modelo/UI de comentarios o reseñas bajo el clip. `Reportar` existe (`ClipDetail.tsx`). «Mensajes» = encargos (`Chat.tsx` → `estudio/Encargos`), no comentarios públicos.
- **Para pasar:** Comentarios/reseñas en la ficha del clip (confianza → suscripción), con moderación y RLS; sin confundir con encargos privados.

---

## 5. Consultas pagadas vía Telegram

- **Estado:** `not_started`
- **Evidencia:** Sin referencias a Telegram/BotFather/Stars en `supabase/functions/*` (avisos email, `ver-clip`, campañas). Contacto actual = mailto en `Ayuda.tsx` / `content/ayuda.ts`.
- **Para pasar:** Flujo preparado (pago → abre chat privado → gestión por bot), integrado en la página; token BotFather **no** requerido aún — stubs, contratos de datos y UI de «consulta pagada».

---

## 6. Seguridad y legales (prioridad pre-lanzamiento)

### 6.1 Pendientes legales (abogado)
- **Estado:** `fail` (bloqueante de lanzamiento público)
- **Evidencia:** `src/content/legal.ts` — `PENDIENTES_ABOGADO`: razón social/domicilio/correos; política si se retira compra permanente; régimen fiscal/retenciones; jurisdicción ciudad/estado; plazo conservación verificación. UI marca borrador (`Legal.tsx` aviso rosa). Placeholders `[…]` en privacidad/términos.
- **Para pasar:** Revisión legal + sustituir marcadores; quitar aviso de borrador.

### 6.2 Seguridad reciente / P0 de escrituras y saldo
- **Estado:** `partial`
- **Evidencia:** Commits `bd6baf1b` (clips UPDATE/INSERT + triggers paths + saldo no negativo) y `cadc7a91` (disponible vs saldo bruto en gastos). No hay archivo «P0 abiertos» en el repo; README raíz está **desactualizado** (aún dice prototipo sin backend).
- **Para pasar:** Inventario explícito de hallazgos de seguridad restantes (storage, RLS, edge JWT, XSS); actualizar README; no lanzar con legales en borrador.

### 6.3 Age gate / 18+
- **Estado:** `pass` (autodeclaración; no es KYC)
- **Evidencia:** `AgeGate.tsx` con `Pulsable`/`Enlace` (botones reales, no divs). `GuardiaEdad` en `App.tsx`. Meta `rating=adult` en `index.html`. Verificación de identidad aparte en `/verificar`.
- **Nota:** Comentarios en AgeGate documentan que es autodeclaración, no prueba legal de edad.

### 6.4 Idioma
- **Estado:** `partial`
- **Evidencia:** `html lang="es"`, copy mayormente ES. Restos EN en pie de `Portada.tsx` («Join us», «All rights reserved»).
- **Para pasar:** Homogeneizar a español visible.

---

## 7. Coordinación

### 7.1 Archivos puente
- **Estado:** `pass`
- **Evidencia:** Este repo ahora incluye `bridge-query.md` y `bridge-response.md`.

### 7.2 Checklist documentada
- **Estado:** `pass`
- **Evidencia:** Este archivo.

### 7.3 Límites anti-bucle documentados
- **Estado:** `pass`
- **Evidencia:** `bridge-response.md` § Reglas permanentes.

### 7.4 Diario de decisiones / resumen diario
- **Estado:** `partial`
- **Evidencia:** Sección Diario en `bridge-response.md` iniciada. Falta rutina diaria de avances.
- **Para pasar:** Entrada diaria (avances, pendientes, decisiones) en el puente o archivo `DIARIO.md`.

### 7.5 CLAUDE.md / contexto para agentes
- **Estado:** `fail`
- **Evidencia:** No existe `CLAUDE.md` ni `AGENTS.md` en la raíz. Solo `.claude/launch.json`.
- **Para pasar:** Añadir `CLAUDE.md` apuntando a DESIGN-BRIEF, checklist, puente y stack.

---

## 8. Stack y despliegue (contexto, no scoring fuerte)

- React `^19.2.8`, Vite `^8.2.0`, `react-router-dom` HashRouter (`main.tsx`, `package.json`).
- Backend Supabase (migrations + edge functions). Frontend GitHub Pages.
- Comisión 20% / SPEI / 18+ reflejados en legales y copy de portada.

---

## Decisiones de este arranque

1. Se añadieron **solo** `bridge-query.md`, `bridge-response.md` y `CHECKLIST.md`.
2. **No** se cambió producto, UI ni backend en el commit de arranque.
3. El estado de cada ítem sale de lectura de código/docs en `main` @ `cadc7a91…`, no de captura de pantalla aislada.
4. Prioridad siguiente recomendada (sin pedir a Sergio lo estándar): (a) legales con Sergio/abogado, (b) eager load del hero, (c) player custom mínimo, (d) stubs Telegram + comentarios.

### Qué debe decidir Sergio (solo negocio/contenido)
- Razón social, domicilio fiscal, correos legales definitivos, ciudad/estado de jurisdicción.
- Política si una creadora retira un clip ya comprado «para siempre».
- Plazo de conservación de verificación de edad.
- Si «home» del logo con sesión debe ser portada de marketing o el catálogo.
- Alcance y precio de las **consultas pagadas** por Telegram (producto).
- Prioridad de lanzamiento vs esperar revisión de abogado (recomendación del coordinador: **esperar**).
