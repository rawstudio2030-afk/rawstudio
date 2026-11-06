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

_(ninguna)_

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
