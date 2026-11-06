# Puente: respuestas (coordinador → Claude Code)

## Cómo usar
1. El coordinador lee entradas `estado: abierta` en [`bridge-query.md`](./bridge-query.md).
2. Responde aquí **arriba** (más reciente primero), citando el `id` de la consulta.
3. Claude Code aplica la decisión, marca la consulta como `respondida` y deja el SHA del commit en la consulta o en el diario.

## Plantilla

```markdown
### Respuesta a [id: YYYYMMDD-NN]
- **fecha:** YYYY-MM-DD HH:MM (America/Mexico_City)
- **estado:** ejemplo | vigente
- **responde a:** (cita breve de la pregunta)
- **decisión:** …
- **razonamiento:** …
- **checklist afectados:** (ítems + nuevo estado)
- **siguiente paso para Claude Code:** …
```

## Reglas permanentes (Claude Code)
1. **No preguntar a Sergio** por decisiones técnicas o de UI estándar. El coordinador decide; Sergio solo en negocio/contenido/legal.
2. **Negocio fijo:** comisión **20%** (creadora 80%), pagos **SPEI**, audiencia **18+**.
3. **Stack:** TypeScript strict, React 19 + `HashRouter`, Vite 8, tokens en `src/lib/diseño.ts`, estilos alineados a **Miami Neon Night** (`DESIGN-BRIEF.md`).
4. **Prioridad:** seguridad y textos legales **antes** de abrir al público.
5. **Anti-bucle por tarea:**
   - Máximo **10** rondas.
   - Solo iterar si mejora el puntaje de `CHECKLIST.md`.
   - Si **2** rondas seguidas no mejoran → parar y reportar en el puente.
   - Tope **1 hora** por tarea.
   - Ítem que pasa a `pass` queda **inmutable** salvo que un cambio posterior lo rompa (entonces se reabre con evidencia).
6. **Diario:** cada cambio aceptado/rechazado debe cruzar diff + commit + ítem de checklist (anotar en commits o en este archivo bajo «Diario»).

---

## Respuestas activas

_(ninguna consulta abierta aún)_

---

## Ejemplo (no es una respuesta operativa)

### Respuesta a [id: 20261106-00]
- **fecha:** 2026-11-06 08:05 (America/Mexico_City)
- **estado:** ejemplo
- **responde a:** ¿lazy-load de secciones bajo el hero en `/`?
- **decisión:** Sí. El HTML/bootstrap inicial y el JS crítico de la landing deben pintar solo el hero (wordmark, titular, subtítulo, CTA principal). «Cómo funciona», «Formas de ganar», cintillo, FAQ embebido y pie se cargan con `lazy` + Intersection Observer o al click explícito en las opciones del hero. Las rutas `/contacto`, `/preguntas`, `/privacidad`, `/terminos` ya son pantallas aparte: no deben reintroducirse en el bundle inicial de `/`.
- **razonamiento:** Criterio de checklist «eager loading». Hoy `Portal.tsx` monta todo el árbol de una vez; contradice mobile-first y peso de portada.
- **checklist afectados:** Eager loading → de `fail` a trabajo en curso; UI mobile-first (parcial hasta medir).
- **siguiente paso para Claude Code:** Proponer PR que separe el hero; no tocar copy de negocio ni legales en ese PR.

---

## Diario de decisiones (arranque)

| Fecha | Qué | Por qué |
|-------|-----|--------|
| 2026-11-06 | Se crean `bridge-query.md`, `bridge-response.md`, `CHECKLIST.md` | Arranque del protocolo de coordinación. **Sin cambios de producto/UI** en ese commit. |
