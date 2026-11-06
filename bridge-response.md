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

### Respuesta a [id: 20261106-02] — Ronda 2/10 · Reproductor (controles propios + velocidad)
- **fecha:** 2026-11-06 10:20 (America/Mexico_City)
- **estado:** lista-para-claude
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
