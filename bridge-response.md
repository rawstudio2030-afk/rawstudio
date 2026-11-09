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

### Respuesta a [id: 20261108-04] — Avisos del administrador
- **fecha:** 2026-11-08 18:04 (America/Mexico_City)
- **estado:** lista-para-claude
- **responde a:** Sergio vio que las cuentas ya tienen avisos y pidió algo parecido en el administrador: enterarse de lo que llega (moderación, verificación, cuentas, depósitos/abonos, mensajes, etc.), no solo de cuántas cosas hay pendientes.
- **ronda:** 1 de 10 de esta tarea · **tope:** 1 hora
- **checklist afectados (NO marques pass tú):** convenciones del panel de administración si tocas esas pantallas. No rompas ítems `pass` ni el trabajo de `[id: 20261106-04]` a `[id: 20261106-07]` ni `[id: 20261107-01]` a `[id: 20261107-07]` ni `[id: 20261108-01]` a `[id: 20261108-03]`.

#### Orden respecto a rondas anteriores
Si `[id: 20261108-03]` sigue `asignada`, **termínala primero** (avisos visibles dentro del diálogo, diagnóstico de cierre y abonos claros) y márcala `respondida`. Después, y no antes, implementa esta ronda en su propio commit. No la mezcles con la 03 ni reabras las anteriores. El relleno de portadas discretas lo corre Omar desde Herramientas; no forma parte de esta ronda.

#### Diagnóstico (no lo reescribas: úsalo)
1. Las cuentas tienen un centro de avisos **sin tabla de notificaciones**. `mis_avisos()` (security definer, solo la propia cuenta) arma la lista al pedirla, leyendo consultas, encargos, compras, rentas, propinas, suscripciones, comentarios, verificaciones, retiros y clips. Un asunto resuelto desaparece solo. Lo único persistente es `avisos_estado(user_id, visto_at)`; `avisos_marcar_vistos()` actualiza esa fecha al abrir la lista. Forma de cada fila (`src/lib/avisos.ts`): `clave`, `tipo`, `titulo`, `detalle`, `ruta`, `at`, `urgente`, `nuevo`. `urgente` = algo que te toca hacer y se queda mientras esté pendiente. Lo demás cuenta como nuevo hasta que abres la lista.
2. La UI es `CampanaAvisos.tsx` (campana fija con cuenta = urgente + nuevo, refresco cada 60 s / foco / `avisos:cambio`) y `Avisos.tsx` en `/avisos`. Cada fila lleva a una `ruta` de la app. Se ve con sesión, para compradores y creadoras. **Dentro del panel se oculta** (`RUTAS_PANEL`). Un admin, en modo creadora o yendo a `/avisos`, ve lo *suyo* (una venta, un comentario de sus videos), no el trabajo de la plataforma.
3. El panel no tiene inbox ni campana. `pendientes.ts` + `Marco.tsx` muestran **conteos actuales**: moderación (`pendiente`), verificación (`pendiente_revision`), denuncias (`nuevo` + `en_revision`), retiros por aprobar / por pagar, purga, consultas esperando / vencidas, y `atencion` (incluye avatares por revisar). Dicen cuántas hay, no qué llegó, de quién ni desde cuándo. Si de 3 retiros pasas a 4, nada señala cuál es el nuevo. Esos números solo se piden con el panel abierto.
4. Hay correos (Resend) a un buzón admin para retiro nuevo, verificación nueva y purga semanal (`avisar-retiro`, `avisar-verificacion`, `avisar-purga`). No inventes más correo, push ni SMS. Telegram sigue solo para consultas.
5. `ajustesPendientes()` ya existe en `src/lib/admin.ts` (abonos que esperan segunda firma) y **no** entra hoy en `Pendientes` / badges. Las denuncias, los videos por moderar y las consultas que se vencen solo aparecen como número de menú, no como aviso con persona y fecha.

#### Qué hacer
1. **Misma idea, datos aparte.** Un RPC nuevo `admin_avisos()` (security definer, exige `es_admin()`) que arme la lista al pedirla, a partir de las mismas fuentes que ya usa el panel (los `admin_conteo_*` / consultas que alimentan `pendientes.ts`, más `ajustesPendientes` / la tabla de ajustes por aprobar, más lo necesario para nombrar a la persona y la fecha). No lo mezcles con `mis_avisos`: lo personal y lo de la plataforma se quedan separados. No crees una tabla que vaya acumulando eventos para siempre.
2. **Visto por cada admin.** Persiste un `visto_at` por cuenta administradora (p. ej. `avisos_estado_admin` o una columna equivalente claveada por `user_id`), más `admin_avisos_marcar_vistos()`. Que un admin abra la lista no se la marca como vista al otro.
3. **Misma forma de fila** (`clave`, `tipo`, `titulo`, `detalle`, `ruta`, `at`, `urgente`, `nuevo`) para poder reutilizar la lista. Los `tipo` del admin son los de esta cola (p. ej. moderación, verificación, denuncia, retiro, consulta, ajuste, purga); no reutilices a la fuerza los `TipoAviso` de las cuentas (`venta`, `compra`, etc.). Un módulo tipo `src/lib/avisosAdmin.ts` está bien.
4. **Campana dentro del marco del panel** (`Marco.tsx`), en el encabezado de escritorio, no la campana flotante de las cuentas. La de las cuentas sigue oculta en `RUTAS_PANEL`. La campana del admin abre una pantalla «Avisos» bajo Por atender (p. ej. `/admin/avisos`; añade el módulo en `modulos.ts` sin renombrar claves ajenas). Reutiliza el aspecto de `Avisos.tsx` si ayuda; no montes `CampanaAvisos` ni `misAvisos` dentro del panel.
5. **Tipos imprescindibles** (cada uno con quién y desde cuándo; `urgente` mientras siga pendiente):
   - Video nuevo por moderar.
   - Identidad nueva o una que se volvió a enviar.
   - Denuncia nueva (o que sigue en revisión y acaba de entrar).
   - Solicitud de retiro nueva, y una ya aprobada que aún hay que marcar como pagada.
   - Consulta por vencer (cerca del plazo de 2 días) o vencida sin respuesta.
   - Abono/ajuste propuesto que espera la segunda firma.
   - Archivos que ya pasaron la fecha de purga y esperan a que alguien pulse «Purgar».
6. **Enlace profundo:** cada fila abre el módulo que ya existe y, si ese módulo ya acepta un id o un parámetro, el caso concreto: `/admin/moderacion`, `/admin/verificacion`, `/admin/reportes`, `/admin/retiros` (por aprobar o por pagar / ajustes por aprobar), `/admin/consultas`, y la purga donde ya vive el botón (p. ej. Herramientas). No inventes un enrutado complejo si el módulo no sabe abrir un ítem: basta con llegar a la cola correcta.
7. **Campana vs. badges (importante, es distinto de las cuentas):**
   - Los badges y el Resumen se quedan como están: «cuántas hay pendientes» por módulo.
   - El número de la campana cuenta **solo lo `nuevo`** (lo que llegó o pasó a ese estado notable desde el último `visto_at` de ese admin). **No** sumes otra vez los pendientes (`urgente + nuevo` como `contarAvisos` de las cuentas): si no, la campana y el menú dirían el mismo 5.
   - En la lista sí se marcan los urgentes, y siguen visibles mientras no se resuelvan.
   - Abrir la lista marca vistos (lo nuevo deja de serlo; lo pendiente no desaparece hasta resolverse en su módulo).
   - Al resolverse en su módulo, al volver a armar la lista esa fila ya no sale.
8. Refresco razonable, al estilo de la campana de las cuentas (al montar, al volver a la pestaña, cada minuto, al marcar vistos). No dispares una consulta por ítem cada segundo. Si el RPC falla, no finjas «todo al día»: muestra que no se pudieron cargar.
9. Textos neutros, sin asumir género («identidad de {nombre}», «video de {nombre}»). `{nombre}` = `display_name` o, si no hay, el handle. No inventes copy legal ni de marketing.

#### Qué dejar para después (no lo hagas ahora)
Fallos de un cron o de un correo que no salió (haría falta un registro de ejecuciones que hoy no está; no lo inventes). Movimientos «raros» o muy grandes. Avisar de que una creadora respondió a un rechazo. Los avatares por revisar ya tienen badge en `atencion`; no hace falta meterlos en esta primera campana.

#### Qué no tocar
Textos legales, recargas o pasarela, correo/push/SMS nuevos (los `avisar-*` que ya existen se quedan), token o secretos, el precio de 20 pesos, el plazo de 2 días, `COBRO_CONSULTAS_ACTIVO` (sigue en `true`), DeepSeek, el hero del 80 % / dólar, dominio, reproductor, trato, avatares, álbumes, precios, portadas, el relleno de portadas discretas, la consola de Consultas (sigue solo lectura), el Resumen / badges / búsqueda global (no los rehagas; solo conviven con la campana), visitas o mapas de reproducción, hacer el panel adaptable a móvil, mezclar avisos personales con los de la plataforma, ni reabrir `[id: 20261108-03]`.

#### Criterios de aceptación
1. Dentro del panel hay una campana que abre `/admin/avisos` (o la ruta que elijas bajo Por atender). Fuera del panel, la campana de las cuentas sigue igual y sigue oculta dentro del panel.
2. Un admin ve avisos de la plataforma (video, identidad, denuncia, retiro, consulta, ajuste pendiente de firma, purga), cada uno con quién, desde cuándo y un enlace al módulo. Un no-admin no puede leer `admin_avisos`.
3. El número de esa campana es lo nuevo desde la última vez que ese admin abrió la lista, no el total de pendientes del menú. Abrir la lista marca vistos para esa cuenta admin y no para otra.
4. Un asunto resuelto en su módulo desaparece de la lista al refrescar. Un pendiente ya visto se queda en la lista (sin contar en la campana) hasta que se resuelve.
5. `mis_avisos` y `/avisos` de las cuentas no cambian de significado. Typecheck, build y lint limpios (solo advertencias que ya existían). Ningún secreto en el repo.

#### Cómo demostrar (obligatorio en bridge-query.md)
SHA, diff resumido, y:
- Una prueba del RPC (SQL local o datos de prueba, **sin inventar eventos en producción**): con sesión admin salen filas de al menos dos tipos de la lista imprescindible, con `ruta` hacia el módulo correcto; sin ser admin, se rechaza.
- Marcar vistos: las mismas filas pendientes dejan de ser `nuevo` y la cuenta de la campana baja; el total de badges no tiene por qué bajar.
- Resolver (o simular resuelto) un ítem y comprobar que desaparece de `admin_avisos`.
- Que `mis_avisos` de una cuenta de prueba sigue sin incluir colas de administración.
- No marques `CHECKLIST.md` como pass.

#### Siguiente paso para Claude Code
1. Si `[id: 20261108-03]` no está `respondida`, termínala primero.
2. `git pull` e implementa esta ronda en su propio commit (mensaje sugerido: `feat: avisos del administrador`).
3. Aplica en producción, con la aprobación de Omar, la migración del `visto_at` admin y del RPC. No hace falta un relleno manual.
4. Deja el resultado en `bridge-query.md` (SHA, diff, verificación) y marca `[id: 20261108-04]` como `respondida`.

### Respuesta a [id: 20261108-03] — Avisos visibles, diagnóstico de cierre y abonos claros
- **fecha:** 2026-11-08 17:42 (America/Mexico_City)
- **estado:** lista-para-claude
- **responde a:** Sergio pidió un administrador más intuitivo (verificación, aprobación de videos, cuentas, depósitos, abono directo, mensajes, estadísticas y controles que expliquen). El caso concreto: quiso eliminar una cuenta y no pudo, sin ninguna advertencia que dijera por qué.
- **ronda:** 1 de 10 de esta tarea · **tope:** 1 hora
- **checklist afectados (NO marques pass tú):** convenciones del panel de administración si tocas esas pantallas. No rompas ítems `pass` ni el trabajo de `[id: 20261106-04]` a `[id: 20261106-07]` ni `[id: 20261107-01]` a `[id: 20261107-07]` ni `[id: 20261108-01]` ni `[id: 20261108-02]`.

#### Orden respecto a rondas anteriores
`[id: 20261108-02]` ya está `respondida` y la migración de descripciones ya está aplicada en producción. **No la reabras** (ni las anteriores). El relleno de portadas discretas lo corre Omar desde Herramientas; no forma parte de esta ronda y no tienes que esperarlo. Implementa esta ronda en su propio commit.

#### Diagnóstico (no lo reescribas: úsalo)
1. **El error sí llega, pero queda tapado.** En `src/admin/Usuarios.tsx`, `Ficha()` ofrece Anonimizar y Eliminar definitivamente en la Zona de riesgo. `EliminarDialogo()` pide motivo y escribir el handle. `eliminarCuenta()` (`src/lib/admin.ts`) llama a `admin_eliminar_cuenta` y devuelve `error.message`. El callback `falla={msg => setError(msg)}` pinta ese texto en el **banner de la pantalla principal**, no dentro del diálogo. La ficha sigue abierta (overlay `zIndex` 80) y `Confirmar` sigue abierto (overlay `zIndex` 90, fondo oscuro). El administrador se queda mirando la confirmación y el motivo queda detrás. Eso reproduce el síntoma de Sergio («no pude y no me dijo por qué»). PostgreSQL y el wrapper sí tienen mensajes.
2. El mismo agujero: si escribe mal el handle, `EliminarDialogo` llama `falla('Escribe el usuario...')` y también lo pinta detrás. La etiqueta puede cambiar a «Escribe el usuario», pero `Confirmar` solo mira `ocupado` y el motivo: un handle incorrecto no bloquea de verdad el envío.
3. Anonimizar, suspender, banear y ajustar saldo pasan por `tras()` en `Usuarios()`: si hay error, `setError(msg)` y el diálogo/ficha se quedan abiertos. Mismo defecto de ubicación. `Confirmar()` en `src/admin/piezas.tsx` no tiene estado de error local ni `catch` visible para el usuario: solo `try/finally` para `ocupado`. Una excepción inesperada tampoco se presenta.
4. **`admin_eliminar_cuenta`** (`20261127000000_eliminar_cuenta.sql`) bloquea, entre otras cosas: no admin, motivo vacío, la propia cuenta, otra cuenta admin (hay que revocar el privilegio antes), cuenta inexistente, confirmación que no coincide con el handle, imágenes de verificación todavía sin borrar, e historial protegido / dependencias (los mensajes recomiendan Anonimizar). Intenta borrar `auth.users` en transacción y devuelve archivos para limpieza posterior en Storage. Registra en `admin_log`. `eliminarCuenta()` distingue cuenta borrada de fallos posteriores de limpieza: esos avisos también tienen que verse con claridad.
5. **`profiles_no_borrar_con_historial()`** (`20261120000000_no_borrar_el_historial.sql`) bloquea, salvo cuentas demo, cualquier historial en: `coin_ledger`, `purchases`, `rentals`, `subscriptions` (como suscriptor o creadora), `tips` en ambas direcciones, consentimientos, `payouts`, `solicitudes_retiro`, `payment_orders`, `reembolsos_retiro`, expedientes, `payout_accounts`, `custom_requests` en ambas direcciones y reportes como denunciante o perfil. `clips_no_borrar_con_historial()`: un clip con compras, rentas, reportes o reembolsos no se destruye (se marca borrado) y puede impedir la cascada. La identidad verificada, por sí sola, **no** es un bloqueo explícito de eliminar. El saldo no aparece como chequeo independiente de eliminar, pero los movimientos del ledger sí bloquean. **No sugieras borrar historial para que «pase».** Tener clips sin ese historial no equivale automáticamente al bloqueo SQL actual: comprueba el código vigente, no inventes reglas nuevas más permisivas.
6. **`admin_anonimizar_cuenta()`** (misma migración 20261127) bloquea: no admin, motivo vacío, la propia cuenta, otra admin, inexistente o ya anonimizada, **saldo distinto de cero (incluso negativo)**, retiros `pendiente`/`aprobada`, e imágenes de verificación sin borrar. Sustituye la identidad del perfil, elimina contactos/posts, marca clips como borrados, cancela suscripciones e invalida acceso e identidades/sesiones. Conserva la fila, el ledger, las compras, los retiros, el expediente y el resto del historial. La UI ya explica consecuencias dentro de la confirmación, pero **no ofrece un diagnóstico previo de esa cuenta**.
7. **Hueco de consultas.** `20261124000000_consultas_telegram.sql` define consultas y mensajes con cascadas. El trigger de historial de `20261120` **no incluye** esas tablas. Una cuenta cuyo único historial sean consultas (sin asientos contables) podría borrarse del todo y llevarse los hilos. Antes de considerar segura cualquier eliminación definitiva, hay que comprobarlo y proteger esas filas (mismos nombres reales de la migración: `consultas`, `consulta_mensajes` y las que correspondan). La regla es conservar también las consultas; no las borres para «limpiar» la cuenta.
8. **Abono directo ya existe:** ficha de Usuarios → Zona de riesgo → «Ajustar saldo». `SaldoDialogo()` pide un monto en USD con signo, muestra saldo antes/después y exige motivo. `ajustarSaldo()` → `admin_ajustar_saldo`. `20261121000000_topes_de_ajuste_admin.sql`: asiento append-only y `admin_log`; topes iniciales 200 USD por movimiento y 1 000 USD acumulados en 24 h (configurables); el excedente queda **propuesto**; otra admin firma; si solo hay una, puede firmar después de 24 h. Retiros muestra «Ajustes por aprobar». `src/lib/admin.ts` convierte una propuesta aceptada en `{error: AVISO_PROPUESTA}`; `Usuarios` lo trata como **fallo** y mantiene el modal: riesgo de repetir una propuesta que ya se creó. En `Retiros.tsx`, «Aprobar» se deshabilita con `puede_aprobar` sin decir junto al botón quién debe firmar o cuándo se habilita. Los movimientos de la ficha imprimen `m.delta` crudo, sin `usd()`: pueden parecer dólares cuando son centavos.
9. **El mismo feedback tapado** está en `Verificacion.tsx` y `Moderacion.tsx`: `tras(error)` vive en el padre y el overlay (ficha o revisor) lo tapa. En Moderación, «Sin verificar» es una insignia pero «Aprobar» sigue habilitado y deja que el servidor explique el bloqueo… explicación que hoy no se ve. En Verificación, `urlDocumento()` en error puede devolver `null` y la ficha decir «Sin archivo» cuando en realidad falló obtener la URL.
10. No hay una pantalla de «registrar depósito bancario» ni conciliación de un SPEI entrante. Un ajuste contable no es prueba de haber recibido dinero externo. **No inventes esa pantalla ni un procesador.** El resumen, el menú agrupado, los badges, la búsqueda global y la consola de Consultas (solo lectura) ya existen: no los rehagas.

#### 1. Confirmaciones con el resultado a la vista
1. El error o el aviso tiene que verse **dentro del recuadro o lateral que ejecutó la acción** (`role="alert"`), no solo en el banner de detrás. Un patrón compartido en `Confirmar` (`src/admin/piezas.tsx`) —una zona de error local— vale para no repetir el agujero.
2. Si la acción falla, no cierres el diálogo. Conserva el motivo, el handle escrito y el monto. Libera `ocupado`. Evita un segundo envío mientras corre el primero.
3. Captura rechazos inesperados (red, excepción): no dejes un spinner eterno ni fingas éxito.
4. Aplícalo a eliminar, anonimizar, suspender, banear y ajustar saldo. Reutiliza el mismo patrón en los overlays de Verificación y Moderación (aprobar / rechazar / retirar, y resolver identidad).
5. Un éxito se nota: mensaje claro, se refresca lo que cambió, y no se finge éxito si hubo error. Los avisos de limpieza posterior de Storage, si la cuenta ya se eliminó, también tienen que verse (no como si no se hubiera borrado, ni como silencio).
6. Un handle que no coincide se explica **dentro** de `EliminarDialogo` y no debería mandar al servidor (o, si llega, el error del servidor también se ve ahí).

#### 2. Diagnóstico de cierre de cuenta
1. En la ficha, **antes de confirmar** (al abrir la zona de riesgo o al abrir cada diálogo), muestra los bloqueos reales de **esa** cuenta, no un texto genérico: es tu propia cuenta; es otra admin (hay que revocarle el privilegio antes); ya está anonimizada; tiene historial protegido (nombra las clases que apliquen: movimientos, compras, rentas, suscripciones, propinas, retiros, reportes, encargos, consultas, etc.); saldo distinto de cero; retiro pendiente o aprobado; documentos de verificación todavía presentes.
2. El diagnóstico es de solo lectura (un RPC o la suma de datos que el admin ya puede ver). **No sustituye** las reglas transaccionales: el servidor vuelve a validar al confirmar. Si el diagnóstico decía que se podía y el servidor rechaza, ese rechazo también se ve dentro del diálogo.
3. **Anonimizar** es la salida normal para una cuenta con historial. **Eliminar definitivamente** queda claramente limitado a una cuenta sin historial protegido. No ofrezcas un atajo para borrar el ledger, las compras, los retiros ni las consultas «para poder eliminar».
4. Cierra el hueco de las consultas: una cuenta cuyo único rastro sean hilos o mensajes de consulta **no** se puede eliminar definitivamente (igual que si tuviera compras o movimientos). Comprueba las cascadas reales y añade la protección equivalente a `profiles_no_borrar_con_historial` (o el chequeo dentro de `admin_eliminar_cuenta`). Anonimizar sigue conservando esa fila y ese historial.
5. Enlaces al lugar que resuelve un bloqueo **solo si ese control existe de verdad**. Hoy los errores de eliminar/anonimizar pueden decir «bórralas desde Verificación»; la ficha de Verificación describe un borrado por pasada automática y no se vio una acción manual. Revisa el código vigente: si el servidor exige que esas imágenes ya no estén, la acción tiene que ser real y confirmable (lo que ya exijan `admin_eliminar_cuenta` / `admin_anonimizar_cuenta`). Si esa instrucción apunta a una pantalla que no puede hacerlo, no la dejes como enlace muerto. No inventes una política nueva de destrucción de expediente.
6. No renombres «Anonimizar» a «Eliminar cuenta». Deja las dos acciones, con el diagnóstico para que se entienda cuál aplica.

#### 3. Abonos (ajustar saldo) con resultado claro
1. Distingue tres desenlaces: **Aplicado**, **Propuesto para aprobación** y **Falló**. Una propuesta aceptada por el servidor **no** es un error: no uses `AVISO_PROPUESTA` como si `ajustarSaldo()` hubiera fallado, ni invites a pulsar otra vez (se duplicaría).
2. Si quedó propuesta, cierra o actualiza el formulario y enlaza a Retiros → Ajustes por aprobar.
3. En Retiros, si «Aprobar» está deshabilitado, explica junto al botón quién debe firmar o cuándo se habilita (otra admin, o la misma después de 24 h si solo hay una), según las reglas que ya existen. No cambies topes, motivo obligatorio ni la segunda firma.
4. En la ficha, formatea los movimientos con `usd()` (o el helper que ya usáis para dinero), no con el `delta` crudo en centavos.
5. La etiqueta puede pasar a algo como «Abonar o descontar saldo», con una línea breve de que es un ajuste contable interno, no el registro de un depósito bancario recibido. No inventes una pantalla de depósitos ni una pasarela.

#### Extra pequeño (mismo tema de avisos)
En Moderación, si el video no se puede aprobar porque la identidad sigue sin resolverse, muestra esa razón junto a «Aprobar» (el servidor sigue siendo la autoridad). En Verificación, no digas «Sin archivo» si lo que falló fue obtener la URL firmada: di que no se pudo cargar.

#### Qué no tocar
Textos legales, recargas o pasarela, una pantalla nueva de «registrar depósito», token o secretos, el precio de 20 pesos, el plazo de 2 días, `COBRO_CONSULTAS_ACTIVO` (sigue en `true`), DeepSeek, el hero del 80 % / dólar, dominio, reproductor, trato, avatares, álbumes, precios de 10 / 20 / 40, portadas, el relleno de portadas discretas, consola de Consultas (sigue solo lectura: no responder, no cobrar ni reembolsar desde ahí), el resumen / menú / badges / búsqueda global (no los rehagas), visitas o mapas de reproducción, hacer el panel adaptable a móvil (`ANCHO_MINIMO` se queda), borrar historial para facilitar un eliminado, ni «Anonimizar» más allá del diagnóstico y del aviso visible.

#### Criterios de aceptación
1. Cada rechazo del SQL o del cliente (handle incorrecto, propia cuenta, otra admin, historial, saldo, retiro, documentos, motivo vacío, red) se ve **dentro** del diálogo o lateral que se usó, en un escritorio típico (p. ej. 1440×900), sin tener que cerrar el recuadro para leerlo.
2. Una cuenta con compras, ledger o consultas no pierde ese historial al intentar eliminar. Eliminar definitivamente no pasa si hay historial protegido (consultas incluidas). Anonimizar con saldo distinto de cero, retiro pendiente/aprobado o documentos pendientes explica el bloqueo concreto.
3. Un fallo de red no deja el botón ocupado para siempre ni simula éxito.
4. Un abono aplicado, uno propuesto y uno fallido se distinguen. Una propuesta exitosa no se trata como error ni se duplica al «reintentar».
5. Antes de confirmar se ve de quién es la cuenta y, en un ajuste, el monto y el saldo resultante. Los movimientos de la ficha se leen como dinero, no como centavos crudos.
6. Typecheck, build y lint limpios (solo advertencias que ya existían). Ningún secreto en el repo.

#### Cómo demostrar (obligatorio en bridge-query.md)
SHA, diff resumido, y:
- Reproduce (en local o con datos de prueba, **sin mutar cuentas reales de producción** para el demo) al menos: handle incorrecto; intento de eliminar una cuenta con historial (el error se ve dentro del diálogo y el historial sigue ahí); intento de anonimizar con saldo o retiro bloqueante (el motivo concreto se ve dentro); un ajuste que queda propuesto (desenlace «Propuesto», no un banner de error, y no se crea dos veces si no se vuelve a enviar).
- Una prueba de que eliminar está bloqueado también cuando el único rastro son consultas (si ese era el hueco), sin borrar esos hilos.
- No marques `CHECKLIST.md` como pass.

#### Siguiente paso para Claude Code
1. `git pull` e implementa esta ronda en su propio commit (mensaje sugerido: `feat: avisos visibles y diagnostico al cerrar una cuenta`).
2. Si añadiste protección SQL para las consultas u otro chequeo de cierre, aplícalo en producción con la aprobación de Omar. No hace falta que Omar « Borre » nada a ciegas: el diagnóstico y los avisos viven en el panel.
3. Deja el resultado en `bridge-query.md` (SHA, diff, verificación) y marca `[id: 20261108-03]` como `respondida`.

### Respuesta a [id: 20261108-02] — Portada más discreta y descripción genérica
- **fecha:** 2026-11-08 14:22 (America/Mexico_City)
- **estado:** lista-para-claude
- **responde a:** Sergio vio las portadas ya nitidizadas a 240 px y le parecieron demasiado explícitas. Pidió un cuadro menos explícito (como el del avatar) y una descripción genérica del video. No pidió cambiar los títulos.
- **ronda:** 1 de 10 de esta tarea · **tope:** 1 hora
- **checklist afectados (NO marques pass tú):** convenciones del catálogo y de publicar si tocas esas pantallas. No rompas ítems `pass` ni el trabajo de `[id: 20261106-04]` a `[id: 20261106-07]` ni `[id: 20261107-01]` a `[id: 20261107-07]` ni `[id: 20261108-01]`.

#### Orden respecto a rondas anteriores
`[id: 20261108-01]` ya está `respondida` y aplicada en producción. **No la reabras** (ni las anteriores). El «Regenerar las portadas públicas» de la 07 (agrandar la misma imagen a 240 px) se queda como está: esta ronda es otra cosa, porque hay que sacar un **fotograma distinto del video**. Implementa esta ronda en su propio commit.

#### Diagnóstico (no lo reescribas: úsalo)
1. El lote, si no trae portada, usa `miniaturaDeVideo`: el cuadro del 10 %. Eso no busca un momento discreto; busca uno que no sea negro de arranque. Al pasar la pública de 32 px a 240 px se ve ese mismo fotograma, ahora nítido.
2. `avatarDeVideo` / `puntuarCuadro` son una heurística de **calidad de imagen** (exposición, detalle, premio a lo temprano) sobre la primera mitad. No saben qué hay en el cuadro. El código ya lo dice: en un sitio 18+ no garantizan un resultado inocuo. Por eso los avatares retroactivos se confirman uno a uno en Herramientas. Aquí vale la misma honestidad.
3. No se puede recortar la portada a cuadrado: dejaría de ser portada. No se puede partir de `clip-covers-full` para «suavizar»: es la misma imagen explícita, solo más grande. Hay que decodificar el video (URL firmada, como `AvatarAuto` con `urlVideoFirmada`).
4. No hay una marca de si la portada la eligió la creadora, la subió a mano o la puso el lote. Por eso el retroactivo no se aplica a ciegas: se propone y se confirma.
5. La descripción del lote casi siempre va vacía. Solo se lee en la ficha. No se manda el video a DeepSeek ni a ningún tercero para narrarlo (es contenido 18+ y se prestaría a inventar). Los títulos que salen del nombre del archivo no se tocan en esta ronda.

#### 1. Portada más discreta
1. En `src/lib/miniatura.ts`, añade una función (p. ej. `portadaDiscretaDeVideo`) que reutilice `puntuarCuadro` y la misma ventana que el avatar (seis cuadros, ~8 %–50 %, premio a los más tempranos). La diferencia: **cuadro completo**, sin recorte cuadrado, acotado a `ANCHO_MAXIMO` (720), listo para pasar por `achicar()` a `ANCHO_PUBLICO` (240) como cualquier portada. No inventes un clasificador de desnudos ni un servicio externo.
2. **Subidas nuevas del lote** (`publicarPara` cuando no viene `portada`): usa esa función. Si no encuentra ningún cuadro que pase el filtro, cae a `miniaturaDeVideo` (el del 10 %), para no publicar sin portada.
3. **Formulario de la creadora** (`Upload.tsx`): si ella sube una imagen o elige uno de los seis cuadros, **esa portada se queda**. Solo si se cae al cuadro automático usa la función nueva (con el mismo respaldo al 10 % si no hay candidato).
4. **Las que ya existen:** una herramienta nueva en Herramientas, al estilo de `src/admin/AvatarAuto.tsx`: recorre clips de video con archivo (no álbumes), pide el video con URL firmada, saca la propuesta y la muestra **junto a la portada actual**. No se escribe nada hasta que quien administra confirme (puede desmarcar). Aplica las marcadas: misma ruta en `clip-covers-full` (la nueva nítida, hasta 720) y en `clip-covers` (la pública a 240, con `achicar` y `upsert` solo en este relleno). Lotes chicos (como los 8 del avatar) para no colgar el navegador. Progreso, aplicadas, omitidas (sin video, sin cuadro aceptable, error) y sin inventar portada si el video no se puede decodificar.
5. Eso permite no pisar a ciegas una portada que alguien eligió: se ve el antes y el después y se puede dejar sin marcar. No pidas revisión cuadro a cuadro *dentro* del video (solo la propuesta final vs. la actual).
6. No actives la tira de seis cuadros en los de pago. No cambies `ANCHO_PUBLICO` ni `ANCHO_MAXIMO`. No empieces a registrar visitas.

#### 2. Descripción genérica
1. Si la descripción está vacía o es nula, pon una frase corta y neutra: `Video de {nombre}`, donde `{nombre}` es el `display_name` de la creadora o, si no hay, su `handle`. Sirve para cualquier trato de género (no uses «creadore» ni asumas género). Tope el de siempre (p. ej. 600 caracteres). No inventes de qué va el video, no uses adjetivos sexuales, no llames a ninguna API.
2. **No pises** una descripción que ya tenga texto (la del formulario, la del CSV o una escrita antes).
3. Aplica esto: (a) a los clips de video que ya existen y no tienen descripción (migración o actualización SQL equivalente, con aprobación de Omar para producción); (b) a las subidas nuevas del lote cuando el CSV no traiga `descripcion`; (c) al publicar desde `Upload.tsx` si el campo se deja vacío. Un álbum no se rellena con «Video de…»: esta ronda es de videos.
4. No toques `title`. El título que sale del nombre del archivo se queda como está.

#### Qué no tocar
Textos legales, recargas o pasarela, token o secretos, el precio de 20 pesos, el plazo de 2 días, `COBRO_CONSULTAS_ACTIVO` (sigue en `true`), DeepSeek (sigue solo para validar consultas; no lo uses para describir videos ni para puntuar cuadros), el hero del 80 % / dólar, dominio, reproductor, trato, avatares, álbumes (precio fijo, flujo y portada de fotos), precios de 10 / 20 / 40, el default 2000, consola de admin más allá de la herramienta nueva, «Anonimizar», el desempeño por clip, visitas o mapas de reproducción, títulos.

#### Criterios de aceptación
1. El lote sin portada propia usa la función nueva (primera mitad + `puntuarCuadro`, cuadro completo). El formulario respeta la portada elegida o subida.
2. Las portadas que ya existen no cambian hasta confirmar la propuesta en Herramientas. La propuesta se ve junto a la actual. Sin video o sin cuadro aceptable se omite, no se inventa.
3. Tras aplicar, la pública mide ~240 px y la nítida (hasta 720) es el **mismo fotograma nuevo**, no el viejo agrandado. `anon` sigue sin leer `clip-covers-full`.
4. Los videos sin descripción quedan en `Video de {nombre}`. Los que ya tenían texto no se mueven. Los álbumes no se rellenan con esa frase. Los títulos no cambian.
5. Typecheck, build y lint limpios (solo advertencias que ya existían). Ningún secreto en el repo. Ninguna llamada a una IA para esto.

#### Cómo demostrar (obligatorio en bridge-query.md)
SHA, diff resumido, y:
- **Portada.** Una prueba de la función nueva (archivo o URL simulada): elige un cuadro de la primera mitad, no recorta a cuadrado, y si todos fallan el filtro el lote/formulario cae al del 10 %. En Herramientas: propuesta vs. actual, nada se escribe sin confirmar; un clip sin video o sin cuadro aceptable se omite.
- **Descripción.** Conteo antes/después: cuántos videos vacíos se rellenaron; cuántos con texto previo y cuántos álbumes quedaron igual (0 cambiados). Un lote sin CSV de descripción guarda `Video de {nombre}`; uno con `descripcion` en el CSV la respeta.
- No marques `CHECKLIST.md` como pass.

#### Siguiente paso para Claude Code
1. `git pull` e implementa esta ronda en su propio commit (mensaje sugerido: `feat: portadas mas discretas y descripcion generica`).
2. Aplica en producción, con la aprobación de Omar, la actualización de descripciones vacías. El relleno de portadas lo corre Omar desde Herramientas (revisa y confirma las propuestas).
3. Deja el resultado en `bridge-query.md` (SHA, diff, verificación) y marca `[id: 20261108-02]` como `respondida`.

### Respuesta a [id: 20261108-01] — Subida en lote: precios de 10, 20 o 40 (no 2.40)
- **fecha:** 2026-11-08 07:08 (America/Mexico_City)
- **estado:** lista-para-claude
- **responde a:** Sergio confirmó la ronda corta: la subida en lote del panel también tiene que salir en 10, 20 o 40 dólares, para que no vuelva a llenar el catálogo de 2.40.
- **ronda:** 1 de 10 de esta tarea · **tope:** 1 hora
- **checklist afectados (NO marques pass tú):** convenciones de publicar / panel si tocas esa pantalla. No rompas ítems `pass` ni el trabajo de `[id: 20261106-04]` a `[id: 20261106-07]` ni `[id: 20261107-01]` a `[id: 20261107-07]`.

#### Orden respecto a rondas anteriores
`[id: 20261107-07]` ya está `respondida` y los precios de esa ronda ya están aplicados en producción. **No la reabras** (ni las anteriores). El relleno de portadas públicas lo corre Omar desde Herramientas; no forma parte de esta ronda y no tienes que esperarlo. Implementa esta ronda en su propio commit.

#### Diagnóstico (no lo reescribas: úsalo)
1. El valor inicial de 2.40 de la subida masiva está en `agruparVideos` (`src/lib/admin.ts`): `precio: 240` para cada video agrupado. No hay una función `leerLote`. `src/admin/SubidaMasiva.tsx` usa `agruparVideos`, enseña el precio con `usd(v.precio)` y no tiene selector: Omar no puede cambiarlo en pantalla.
2. El CSV opcional (`aplicarCatalogo`) sí puede traer `precio` en dólares, convertido a centavos (`Math.round(parseFloat(...) * 100)`). Eso es un precio puesto a mano: **no lo pises**. Si la fila no trae `precio`, se conserva el de `agruparVideos`.
3. `publicarPara` guarda `p_precio: datos.precio` tal cual. La visibilidad por defecto del lote es `pago`. El CSV puede poner `visibilidad` en `gratis`, `pago` o `suscriptores`.
4. El formulario de la creadora (`Upload.tsx`) ya ofrece 10 / 20 / 40 y arranca en 20. No lo toques salvo que extraigas las constantes compartidas para no duplicarlas.
5. Claude señaló además que `clips.price_coins` sigue con `default 240` en la base: cualquier inserción que omita el precio caería otra vez en 2.40.

#### Qué hacer
1. En `agruparVideos`, deja de asignar `240`. A cada video de pago así agrupado asígnale al azar uno de `1000`, `2000` o `4000` (10, 20 o 40 dólares, en centavos), **por video**, no un solo monto para todo el lote. Usa los mismos tres valores que `PRECIOS_VIDEO` en `Upload.tsx`. Si los extraes a un módulo compartido para que no se desfasen, bien; no inventes un cuarto precio ni vuelvas al paso de 50 centavos.
2. En `aplicarCatalogo`, un `precio` presente en el CSV sigue ganando (incluido un 2.40 o cualquier otro monto que alguien haya escrito a propósito). Si la fila no trae `precio`, queda el asignado en el paso 1.
3. Si la visibilidad queda en `gratis` (porque el CSV lo dijo), el `precio` tiene que ser `0`. No publiques un clip «gratis» con 10, 20 o 40 pegados.
4. No hace falta un selector en cada fila: el precio asignado ya se ve con `usd(v.precio)`. Opcional: una línea en el recuadro de ayuda de `SubidaMasiva.tsx` que diga, sin marketing ni legales, que si el catálogo no trae precio cada video sale a 10, 20 o 40 dólares al azar.
5. Si `clips.price_coins` todavía tiene `default 240`, cámbialo a `2000` (20 dólares, el mismo arranque del formulario) en una migración. Eso no reescribe filas existentes; solo evita que una inserción sin precio vuelva a 2.40. No toques el precio fijo de los álbumes.
6. Vuelve a correr, con aprobación de Omar, el mismo `UPDATE` idempotente de la ronda 07 por si entre esa migración y este arreglo se subió algún video de pago que haya quedado en 240:
   `UPDATE clips SET price_coins = (ARRAY[1000, 2000, 4000])[1 + floor(random() * 3)::int] WHERE visibility = 'pago' AND coalesce(formato, 'video') = 'video' AND price_coins = 240;`
   Sigue sin tocar álbumes, clips gratis, videos con otro precio, `renta_coins` ni `renta_horas`.

#### Qué no tocar
Textos legales, recargas o pasarela, token o secretos, el precio de 20 pesos de las consultas, el plazo de 2 días, `COBRO_CONSULTAS_ACTIVO` (sigue en `true`), DeepSeek, el hero del 80% / dólar, dominio, reproductor, trato, avatares, álbumes (precio fijo y flujo), el formulario de publicar de la creadora más allá de extraer constantes si hace falta, el relleno de portadas, consola de admin más allá de la subida en lote, «Anonimizar», el desempeño por clip, visitas o mapas de reproducción.

#### Criterios de aceptación
1. `agruparVideos` no asigna `240`. Un lote de videos de pago sin CSV de precio queda en una mezcla de 1000 / 2000 / 4000 (no todos el mismo, no 240), y la lista de `SubidaMasiva` lo muestra con `usd()`.
2. Si el CSV trae `precio`, ese valor se respeta. Si trae `visibilidad = gratis` y no trae precio, el clip queda en 0, no en 10/20/40.
3. El formulario de la creadora sigue igual (10 / 20 / 40, arranca en 20). Los álbumes no se tocan.
4. Si cambiaste el `default` de `clips.price_coins`, queda en 2000 y las filas que ya existían no se reescribieron por ese cambio.
5. El `UPDATE` de los 240 que aún queden, si se corre, no mueve álbumes, gratis ni un precio distinto de 240. Correrlo otra vez no cambia filas.
6. Typecheck, build y lint limpios (solo advertencias que ya existían). Ningún secreto en el repo.

#### Cómo demostrar (obligatorio en bridge-query.md)
SHA, diff resumido, y:
- Una prueba de `agruparVideos` (o de la pantalla) con varios videos y sin CSV: ninguno sale a 240; salen 1000, 2000 o 4000, repartidos.
- Un caso con CSV que pone `precio` (por ejemplo 19.40) y ese valor se conserva; un caso `visibilidad = gratis` sin precio queda en 0.
- Conteo en producción, si corriste el `UPDATE`: cuántos videos de pago seguían en 240 y a qué quedaron; 0 álbumes / gratis / otros precios movidos.
- No marques `CHECKLIST.md` como pass.

#### Siguiente paso para Claude Code
1. `git pull` e implementa esta ronda en su propio commit (mensaje sugerido: `feat: precios de 10 20 o 40 tambien en la subida en lote`).
2. Aplica en producción, con la aprobación de Omar, la migración del `default` si la hiciste y el `UPDATE` de los 240 que aún queden.
3. Deja el resultado en `bridge-query.md` (SHA, diff, verificación) y marca `[id: 20261108-01]` como `respondida`.

### Respuesta a [id: 20261107-07] — Portadas públicas más nítidas y precios de 10, 20 o 40
- **fecha:** 2026-11-07 21:58 (America/Mexico_City)
- **estado:** lista-para-claude
- **responde a:** Sergio vio las portadas del teaser borrosas (le gustó lo nítido del avatar) y que casi todos los videos dicen 2.40. Pidió las dos cosas: copia pública más clara, y precio de venta al azar entre 10, 20 y 40 dólares.
- **ronda:** 1 de 10 de esta tarea · **tope:** 1 hora
- **checklist afectados (NO marques pass tú):** convenciones de UI de publicar y del catálogo si tocas esas pantallas. No rompas ítems `pass` ni el trabajo de las rondas 4–7 ni `20261107-01` a `20261107-06`.

#### Orden respecto a rondas anteriores
Si `[id: 20261107-06]` sigue `asignada`, **termínala primero** (desempeño por clip en el Estudio) y márcala `respondida`. Después, y no antes, implementa esta ronda en su propio commit (o dos, si prefieres separar portadas y precios). No reabras `[id: 20261106-04]`, `[id: 20261106-05]`, `[id: 20261106-06]`, `[id: 20261106-07]`, `[id: 20261107-01]`, `[id: 20261107-02]`, `[id: 20261107-03]`, `[id: 20261107-04]`, `[id: 20261107-05]` ni `[id: 20261107-06]` una vez cerrada. No toques legales, recargas o pasarela, el precio de 20 pesos, el plazo de 2 días, `COBRO_CONSULTAS_ACTIVO` (sigue en `true`), DeepSeek, el hero del 80% / dólar, dominio, reproductor (más allá de que el póster público se vea mejor al cambiar el tamaño), trato, avatares, álbumes (precio fijo y flujo), consola de admin salvo un disparador puntual para regenerar portadas, ni «Anonimizar».

#### Diagnóstico (no lo reescribas: úsalo)
1. **La portada se ve borrosa a propósito.** El 3 de noviembre de 2026 se partió en dos copias de la misma imagen y la misma ruta: la pública, en `clip-covers`, sale de `achicar()` con `ANCHO_PUBLICO = 32` y `CALIDAD_PUBLICA = 0.4` (`src/lib/miniatura.ts`). La tarjeta mide ~243 px, así que se estira unas 7 veces: queda la mancha de color y la silueta. La nítida (hasta `ANCHO_MAXIMO = 720`) va a `clip-covers-full`, privada. `urlPortada()` lee el bucket público; quien compra recibe la nítida por `ver-clip`. En `Upload.tsx` el texto lo dice: «Sin pagar se ve borrosa, a 32 px. La nítida se guarda en privado.» En `ClipDetail.tsx`, el póster del reproductor es `portadaNitida ?? portada`: sin acceso, la misma miniatura chica, todavía más estirada.
2. **No es lo mismo que el avatar.** El avatar público sale a 256 px (`LADO_AVATAR`) con `avatarDeVideo` (elige el cuadro más limpio de la primera mitad). Por eso se ve nítido. No copies aquí la heurística ni el recorte cuadrado: la portada ya la elige la creadora entre seis cuadros (`cuadrosDeVideo`) o sube la suya. El arreglo es el **tamaño y la calidad de la copia pública**, no otro cuadro.
3. **El 2.40 es el valor inicial del formulario**, no una decisión de cada creadora: `const [precio, setPrecio] = useState(240)` en `src/screens/Upload.tsx`, con botones que suman o restan 50 centavos. Un clip gratis lleva `0`. Un álbum usa el precio fijo de plataforma (`configAlbumes()`, fallback 500 en `src/lib/albumes.ts`): no lo toques. La renta por defecto es 80 centavos y empieza apagada; al subir el precio de venta, una renta de 80 sigue siendo más barata, no la cambies.
4. Quien ya desbloqueó un clip a 2.40 no se recobra ni se le quita el acceso (`purchases` es único por usuario y clip). Solo cambia lo que paga quien desbloquee a partir de ahora.

#### 1. Portadas públicas a 240 px
1. Sube `ANCHO_PUBLICO` de 32 a **240** y `CALIDAD_PUBLICA` de 0.4 a algo cercano a la nítida (p. ej. 0.82). Las subidas nuevas ya pasan por `achicar()`: saldrán a 240 px al público. No cambies `ANCHO_MAXIMO` ni subas la copia de 720 px al bucket público.
2. Actualiza el texto de publicar que hoy dice que sin pagar se ve borrosa a 32 px. Algo fiel como: sin pagar se ve una miniatura de 240 px; la nítida se guarda en privado. No inventes copy de marketing ni textos legales.
3. Regenera las portadas públicas **que ya existen** a partir de `clip-covers-full` (la nítida), misma ruta, y escríbelas en `clip-covers` (hace falta poder pisar esa ruta: el `upload` habitual usa `upsert: false`, no lo cambies para todas las subidas; el relleno sí tiene que poder reemplazar). Si un clip no tiene copia nítida, no intentes agrandar la pública de 32 px: déjala y cuéntala como omitida. Si no tiene `cover_path`, no inventes una.
4. Ese relleno es de una vez. Inspecciona las políticas de Storage: el navegador de un admin quizá no pueda escribir en el prefijo de otra cuenta. Si hace falta, una función de borde autenticada como admin, con la llave de servicio **solo dentro de Supabase** (nunca en el front, el repo, un comentario ni un commit). No inventes un secreto de cron nuevo. Si lo pones en Herramientas, que sea un disparador puntual con progreso (procesadas, omitidas, errores), idempotente: correrlo dos veces deja el mismo resultado a 240 px. No pidas revisión humana cuadro a cuadro: es la misma imagen, solo más grande.
5. No actives la tira de seis cuadros en los clips de pago (sigue siendo solo para los gratis). No empieces a registrar visitas ni mapas de reproducción.

#### 2. Precios de 10, 20 o 40 dólares
1. En los videos de pago que **siguen en 240** (`visibility = 'pago'`, `coalesce(formato, 'video') = 'video'`, `price_coins = 240`), asigna al azar uno de `1000`, `2000` o `4000` (10, 20 o 40 dólares, en centavos). Una migración SQL basta; algo equivalente a:
   `UPDATE clips SET price_coins = (ARRAY[1000, 2000, 4000])[1 + floor(random() * 3)::int] WHERE visibility = 'pago' AND coalesce(formato, 'video') = 'video' AND price_coins = 240;`
   Como el `WHERE` exige 240, correrla dos veces no vuelve a revolver los que ya salieron.
2. **No toques:** álbumes (`formato = 'album'`), clips gratis (`price_coins = 0` u otra visibilidad), ni un video cuyo precio no sea 240 (eso sí lo movió alguien a mano). No toques `renta_coins` ni `renta_horas`.
3. En el formulario de publicar un video (`Upload.tsx`): quita el valor inicial de 2.40 y los botones de 50 en 50 centavos. Deja tres botones claros — 10, 20 y 40 dólares — y abre en **20**. Ella puede cambiar entre esos tres; no hace falta un monto libre que devuelva el catálogo a 2.40. Sigue mostrando `usd()` y el equivalente en pesos si ya está. El 80% que ella se queda se calcula con el precio elegido, como ahora.
4. No inventes recargas, pasarela ni un cambio al cobro de consultas (20 pesos). No toques el precio fijo de los álbumes ni su pantalla.

#### Qué no tocar
Textos legales, recargas o pasarela, token o secretos, el precio de 20 pesos, el plazo de 2 días, `COBRO_CONSULTAS_ACTIVO` (sigue en `true`), DeepSeek, el hero del 80% / dólar, dominio, reproductor (salvo que el póster público mejore solo al cambiar el tamaño), trato, avatares, álbumes, consola de admin más allá del disparador puntual de portadas, «Anonimizar», el desempeño por clip de la 06.

#### Criterios de aceptación
1. En el catálogo y en la ficha, sin pagar, la portada se ve clara a ~240 px, no como una mancha de 32 px. La copia de ~720 px no está en el bucket público. Quien compra sigue viendo la nítida.
2. Las portadas que ya existían con copia nítida se regeneraron; las que no tenían nítida se omitieron sin inventar nada.
3. Los videos que estaban en 2.40 quedaron en 10, 20 o 40 dólares, repartidos (no todos el mismo). Los álbumes, los clips gratis y cualquier precio distinto de 2.40 no se movieron. Publicar un video de pago ofrece 10 / 20 / 40 y arranca en 20.
4. Typecheck, build y lint limpios (solo advertencias que ya existían). Ningún secreto en el repo.

#### Cómo demostrar (obligatorio en bridge-query.md)
SHA, diff resumido, y:
- **Portadas.** `ANCHO_PUBLICO === 240`. Una portada pública nueva (o regenerada) mide ~240 px de ancho, no 32 ni 720. Un clip de prueba sin copia nítida no se inventa. `anon` sigue sin leer `clip-covers-full`.
- **Precios.** Conteo antes/después: cuántos videos pasaron de 240 a 1000 / 2000 / 4000; cuántos álbumes, gratis u otros precios se quedaron igual (0 cambiados). El formulario muestra los tres botones y el valor inicial 20. Correr la migración otra vez no cambia filas.
- No marques `CHECKLIST.md` como pass.

#### Siguiente paso para Claude Code
1. Si `20261107-06` sigue pendiente, `git pull` e impleméntala primero; márcala `respondida`.
2. `git pull` de `origin/main`. Implementa esta ronda. Commit de producto, p. ej. `feat: portadas publicas mas nitidas y precios de 10 20 o 40`; `git push origin main`. Aplica la migración de precios en producción y corre el relleno de portadas con la aprobación de Omar, como en las rondas anteriores.
3. Marca `bridge-query.md` `[id: 20261107-07]` como `respondida` con SHA, diff y verificación. **No** marques `CHECKLIST.md` como pass.

### Respuesta a [id: 20261107-06] — Desempeño por clip en el Estudio (lo ganado)
- **fecha:** 2026-11-07 21:46 (America/Mexico_City)
- **estado:** lista-para-claude
- **responde a:** Sergio pidió armar en el Estudio el desempeño por clip, empezando por lo ganado. Las vistas y el mapa de reproducción no se graban hoy: no los inventes ni empieces a registrarlos en esta ronda.
- **ronda:** 1 de 10 de esta tarea · **tope:** 1 hora
- **checklist afectados (NO marques pass tú):** convenciones de UI del Estudio si tocas esa pantalla. No rompas ítems `pass` ni el trabajo de las rondas 4–7 ni `20261107-01` a `20261107-05`.

#### Orden respecto a rondas anteriores
No reabras `[id: 20261106-04]`, `[id: 20261106-05]`, `[id: 20261106-06]`, `[id: 20261106-07]`, `[id: 20261107-01]`, `[id: 20261107-02]`, `[id: 20261107-03]`, `[id: 20261107-04]` ni `[id: 20261107-05]` (esa ya está hecha, desplegada y aplicada). Esta ronda va en su propio commit. No toques legales, recargas, dominio, reproductor, trato, avatares, el cobro de consultas (precio, plazo, `COBRO_CONSULTAS_ACTIVO` se queda encendido) ni el panel de administración.

#### Diagnóstico (no lo reescribas: úsalo)
1. El Estudio (`src/screens/Estudio.tsx`) muestra un solo «Has ganado» que sale de `resumen()` en `src/lib/estudio.ts`: suma los `delta` positivos de `venta_clip`, `propina` y `venta_consulta`. No hay lista por publicación. `/earnings` solo redirige a `/wallet`.
2. `venta_clip` no significa «venta de un clip». El mismo motivo sirve para: desbloqueo (`ref_id` = clip), renta (`ref_id` = clip, nota `Renta: …`), suscripción (`ref_id` = el nivel), y encargo entregado (`ref_id` = el encargo). Si agrupas todo `venta_clip` por `ref_id` van a aparecer filas que no son clips (un nivel o un encargo). Solo une movimientos cuyo `ref_id` sea el `id` de un clip **suyo**.
3. `venta_consulta.ref_id` es el mensaje, no el clip. El hilo (`consultas.clip_id`) sí apunta al clip. `consulta_mensajes` está revocado para `anon` y `authenticated`: el navegador no puede hacer ese cruce. Hace falta una función de la base.
4. Las propinas de un clip guardan `ref_id` = ese clip (`dar_propina` con la referencia). Las del perfil suelen ir sin `ref_id`: no las atribuyas a un clip.
5. La plataforma **no registra visitas** ni progreso del reproductor. No inventes vistas, porcentaje visto ni mapa de momentos. No empieces a grabarlos.

#### Qué construir
Una sección en el **mismo** Estudio, debajo de la tarjeta «Has ganado» y encima de Telegram / la bandeja, titulada **«Lo que dejó cada publicación»**.

1. **Función de la base** (p. ej. `estudio_desempeno_clips()`), `security definer`, `search_path = ''`, solo para quien está autenticado:
   - Devuelve **únicamente** clips con `creator_id = auth.uid()`. Un admin que no sea la dueña no ve los de otra cuenta por esta función (su panel ya existe aparte).
   - Una fila por clip propio que exista todavía (video o álbum, `formato`). Incluye los no publicados, para que vea también los que aún no salen. No inventes filas huérfanas a partir de un `ref_id` que ya no tiene clip: ese dinero sigue en «Has ganado».
   - Columnas mínimas: `id`, `title`, `cover_path`, `formato`, `published`, `price_coins`, `desbloqueos` (conteo en `purchases` de ese clip), `rentas` (conteo en `rentals` de ese clip), `ganado_ventas` (suma de *sus* `venta_clip` con `ref_id` = el clip; entra desbloqueo y renta, no suscripciones ni encargos), `ganado_propinas` (suma de *sus* `propina` con `delta > 0` y `ref_id` = el clip), `ganado_consultas` (suma de *sus* `venta_consulta` cuyo `ref_id` es un `consulta_mensajes.id` del hilo de ese clip), `consultas_pagadas` (cuántas de esas ventas de consulta), `ganado_total` (las tres sumas). Todo en centavos, como el resto del libro.
   - No devuelvas compradores, `user_id` ajenos, `chat_id`, teléfonos, cuerpos de mensaje, tokens ni datos de Telegram.
   - `revoke` a `public`/`anon`; `grant execute` a `authenticated`. Comprueba que `anon` no pueda llamarla y que otra cuenta no vea clips ajenos.
   - Orden: `ganado_total` descendente, y a igualdad los más recientes primero.

2. **Front.** Un helper en `src/lib/estudio.ts` que llame esa función. En `Estudio.tsx`, la lista con el mismo aire sobrio del Estudio (fondo plano, tipografía de interfaz, `usd()` para los centavos; no el entero crudo). Cada fila: portada con el mismo recorte que ya usas en el catálogo o la ficha (`cover_path`; no inventes otro pipeline), título, si es video o álbum, si aún no está publicado, el total ganado, y debajo un desglose corto solo con lo que no sea cero (p. ej. «3 desbloqueos · 1 renta · 2 consultas» y propinas si las hay). Un toque abre `/clip/:id`.
   - Sin clips: «Cuando publiques un video o un álbum, aquí verás cuánto dejó cada uno.» No muestres una tabla vacía.
   - Con clips en cero: sí listarlos; sirve ver cuáles no han dejado nada.
   - Nota corta bajo la lista, porque «Has ganado» no va a cuadrar con la suma de esta lista: «Las suscripciones, los encargos y las propinas de tu perfil no aparecen aquí porque no van atadas a un clip. Sí cuentan en “Has ganado”.»
   - No cambies el cálculo de «Has ganado». No añadas esta lista al monedero ni al panel de administración.

#### Qué no tocar
Textos legales, recargas o pasarela, token o secretos, el precio de 20 pesos, el plazo de 2 días, `COBRO_CONSULTAS_ACTIVO` (sigue en `true`), DeepSeek, el hero del 80% / dólar, dominio, reproductor (ni un contador de progreso), trato, avatares, álbumes más allá de listarlos si ya son un clip con `formato`, consola de admin, «Anonimizar».

#### Criterios de aceptación
1. En el Estudio se ve, por cada video o álbum propio, cuánto se ganó (lo que llegó a la cuenta, ya sin la comisión) y cuántos desbloqueos, rentas y consultas pagadas respondidas le corresponden.
2. Una suscripción o un encargo no aparecen como si fueran un clip. Una propina del perfil no se cuelga de un clip. Una consulta pagada y respondida sí se suma al clip del hilo.
3. No hay cifras de visitas ni de reproducción. Typecheck, build y lint limpios (solo advertencias que ya existían). Nadie ve los clips ni las cifras de otra cuenta por este camino.

#### Cómo demostrar (obligatorio en bridge-query.md)
SHA, diff resumido, y verificación en SQL: una cuenta con dos clips (venta/renta/propina/consulta en el A, solo desbloqueo en el B), más una suscripción, un encargo y una propina de perfil; el A y el B cuadran y lo demás no se cuela en la lista; otra cuenta recibe 0 filas ajenas; `anon` no tiene permiso. En el front: la sección se ve, `usd()` se usa, el vacío se entiende, la nota de «Has ganado» está. No marques `CHECKLIST.md` como pass.

#### Siguiente paso para Claude Code
1. `git pull` de `origin/main`.
2. Implementa esta ronda. Commit de producto, p. ej. `feat: desempeno por clip en el Estudio`; `git push origin main`. Aplica la migración en producción con la aprobación de Omar, como en las rondas anteriores.
3. Marca `bridge-query.md` `[id: 20261107-06]` como `respondida` con SHA, diff y verificación. **No** marques `CHECKLIST.md` como pass.

### Respuesta a [id: 20261107-05] — Vencimiento de consultas por reloj e ingresos de consultas en el panel
- **fecha:** 2026-11-07 21:18 (America/Mexico_City)
- **estado:** lista-para-claude
- **responde a:** Al cerrar la 04, Claude avisó de dos huecos: la devolución es perezosa (solo cuando alguien le habla al bot) y el panel no ve `venta_consulta`. Sergio pidió seguir con más cosas; esto cierra el cobro que acabamos de encender, sin inventar recargas ni legales.
- **ronda:** 1 de 10 de esta tarea · **tope:** 1 hora
- **checklist afectados (NO marques pass tú):** no inventes textos legales. No rompas ítems `pass` ni el trabajo de las rondas 4–7 ni `20261107-01` a `20261107-04`.

#### Orden respecto a rondas anteriores
No reabras `[id: 20261106-04]`, `[id: 20261106-05]`, `[id: 20261106-06]`, `[id: 20261106-07]`, `[id: 20261107-01]`, `[id: 20261107-02]`, `[id: 20261107-03]` ni `[id: 20261107-04]`. Esta ronda va en su propio commit (o los que hagan falta: función + workflow, y la de finanzas si va aparte). No toques legales, recargas, dominio, reproductor, trato, avatares ni el cobro en sí (precio, plazo, `COBRO_CONSULTAS_ACTIVO` se queda encendido).

#### Diagnóstico (no lo reescribas: úsalo)
1. **Vencimiento perezoso.** `avisarVencidos` en `supabase/functions/telegram-bot/index.ts` llama `consultas_vencer` y avisa por Telegram, pero solo al recibir un POST válido del webhook (un mensaje privado). Si nadie le habla al bot, un mensaje puede llevar más de 2 días vencido sin devolver el saldo ni avisar, aunque la web ya lo muestre vencido. La devolución es idempotente (solo filas que pasan de `enviado` a `vencido`).
2. **Ya hay un reloj.** `.github/workflows/tareas.yml` corre cada 2 horas, en el minuto 7, con `workflow_dispatch` para probar. Cada paso manda `POST` con la cabecera `x-cron-secret` y el secreto `CRON_SECRET` (Actions y Supabase Edge Functions -> Secrets). Ese secreto **ya existe**; las funciones `avisar-retiro`, `avisar-creadora`, `avisar-verificacion` y `borrar-verificacion` lo leen con `Deno.env.get('CRON_SECRET')` y comparan en tiempo constante. El camino principal de esos avisos es pg_net; el workflow es red de seguridad. Aquí el reloj **sí es el camino principal**, porque no hay un disparador por tiempo sobre `vence_at`.
3. **El panel se quedó corto.** `admin_finanzas`, el ranking y «total ganado» de Usuarios enumeran a mano `venta_clip` y `propina`. No suman `venta_consulta`, así que la comisión y el reparto de las consultas no aparecen en Finanzas. El Estudio sí suma `venta_consulta` en «Has ganado» (`src/lib/estudio.ts`). El brief de la 04 pedía no tocar el panel; ahora sí.

#### 1. Vencer por reloj
1. Añade un paso al **mismo** trabajo de `tareas.yml` (no un workflow nuevo), con `if: always()` como los otros, que llame a una función de vencimiento. El minuto 7 / cada 2 horas no se cambia. Si no hay nada vencido, responde `ok: true` para que el `grep` del workflow no se ponga rojo (igual que «nada nuevo» en los avisos).
2. Reutiliza el patrón de `avisar-retiro`: cabecera `x-cron-secret`, secreto `CRON_SECRET`. **No inventes otro secreto. No lo escribas en el repo, el front, un comentario ni un commit.** En Supabase los secretos del proyecto ya los ven todas las funciones; no pidas uno nuevo salvo que compruebes que `CRON_SECRET` no está (entonces indica a Omar que copie el que ya usa Actions, sin pegarlo en el puente).
3. Prefiere una función nueva (p. ej. `vencer-consultas`) en vez de mezclar el cron con el webhook de Telegram: ese webhook autentica con `x-telegram-bot-api-secret-token` y no hay que cruzar los dos caminos. La función nueva hace lo mismo que `avisarVencidos`: llama `consultas_vencer` y, si hubo devolución o vencimiento, avisa por Telegram con los mismos textos que ya usa el bot (al cliente le dice que se le devolvió el saldo solo si `devuelto_coins > 0`). Para hablarle a Telegram usa `TELEGRAM_BOT_TOKEN`, que ya es secreto del proyecto; no lo registres, no lo imprimas.
4. Deja también la llamada perezosa dentro de `telegram-bot` (red de seguridad). Como `consultas_vencer` solo actúa una vez por fila, no hay doble cobro ni doble aviso.
5. No uses la llave de servicio fuera de Supabase. El workflow no debe llevar `SERVICE_ROLE`.
6. Despliega la función nueva y el workflow. Prueba con «Run workflow» si puedes, o deja dicho cómo verificarlo.

#### 2. Ingresos de consultas en el panel
1. Donde Finanzas, el ranking o «total ganado» de Usuarios listen a mano `venta_clip` y `propina`, incluye también `venta_consulta`. La comisión de esas ventas debe entrar en las cifras de comisión / reparto con la misma lógica que las de un clip (el abono a la creadora ya es el 80%; la comisión es el resto, como en el resto de Finanzas).
2. No cuentes el cargo `consulta` del cliente como ingreso de la plataforma ni como «ganado» de nadie. El `reembolso` sigue siendo movimiento de cuenta, no venta.
3. No inventes pantallas, menús ni exportaciones nuevas. Si el CSV de Finanzas sale de las mismas cifras, quedará bien al corregir la fuente. No toques Retiros ni datos de CLABE / RFC.

#### Qué no tocar
Textos legales, recargas o pasarela, token o secretos (nunca en el repo), el precio de 20 pesos, el plazo de 2 días, `COBRO_CONSULTAS_ACTIVO` (sigue en `true`), DeepSeek, el hero del 80% / dólar, dominio, reproductor, trato, avatares, álbumes, la consola de consultas más allá de lo que ya muestra.

#### Criterios de aceptación
1. Un mensaje pagado vencido se marca, se reembolsa y se avisa aunque nadie le haya escrito al bot desde entonces; basta el paso programado (o «Run workflow»).
2. Correr el vencimiento dos veces no devuelve dos veces ni avisa dos veces.
3. Finanzas y «total ganado» / ranking incluyen lo de `venta_consulta` y su comisión; no incluyen el gasto `consulta` del cliente como ingreso.
4. Ningún secreto nuevo aparece en el repo. Typecheck, build y lint limpios (solo advertencias que ya existían).

#### Cómo demostrar (obligatorio en bridge-query.md)
SHA, diff resumido, y verificación: el paso nuevo en `tareas.yml`; cómo autentica la función (sin pegar el secreto); que `consultas_vencer` + avisos corren desde ese camino; que una segunda pasada no duplica; que Finanzas / ranking / total ganado ya suman `venta_consulta`. No marques `CHECKLIST.md` como pass.

#### Siguiente paso para Claude Code
1. `git pull` de `origin/main`.
2. Implementa esta ronda. Commit de producto, p. ej. `feat: vencer consultas por reloj y sumarlas en finanzas`; `git push origin main`. Despliega la función nueva. El workflow usa el `CRON_SECRET` que ya está en Actions.
3. Marca `bridge-query.md` `[id: 20261107-05]` como `respondida` con SHA, diff y verificación. **No** marques `CHECKLIST.md` como pass.

### Respuesta a [id: 20261107-04] — Cobro de consultas y devolución del saldo si no hay respuesta en 2 días
- **fecha:** 2026-11-07 20:57 (America/Mexico_City)
- **estado:** lista-para-claude
- **responde a:** Sergio decidió: si la creadora no responde un mensaje pagado en 2 días, se le devuelve el saldo al cliente. Con eso se puede encender el cobro que ya estaba reservado.
- **ronda:** 1 de 10 de esta tarea · **tope:** 1 hora
- **checklist afectados (NO marques pass tú):** no inventes textos legales. No rompas ítems `pass` ni el trabajo de las rondas 4, 5, 6, 7, `20261107-01`, `20261107-02` ni `20261107-03`.

#### Orden respecto a rondas anteriores
No reabras `[id: 20261106-04]`, `[id: 20261106-05]`, `[id: 20261106-06]`, `[id: 20261106-07]`, `[id: 20261107-01]` ni `[id: 20261107-02]`. Si `[id: 20261107-03]` sigue pendiente, termínala primero y no la mezcles con esta: esta ronda va después, en su propio commit. No toques legales, dominio, reproductor, trato ni el panel de administración (salvo, si hace falta, el nombre visible de un motivo nuevo en el monedero).

#### Decisión de Sergio (no la reinterpretar)
Si la creadora no responde un mensaje pagado de consulta por Telegram en 2 días, se le devuelve el saldo al cliente. El plazo de 2 días no cambia. El precio sigue siendo `PRECIO_CONSULTA_TELEGRAM` (20 pesos por mensaje del cliente).

#### Diagnóstico (no lo reescribas: úsalo)
1. La migración `20261124000000_consultas_telegram.sql` dejó el circuito listo y escribió dónde enganchar: «Cuando se decida, se engancha en `bot_registrar_cliente` (cobro) y en `consultas_vencer` (reembolso).» Hoy `cobro_coins` queda en cero y `consultas_config.cobro_activo` en falso. El comentario de `bot_registrar_cliente` dice «AQUI va el cobro»; el de `consultas_vencer` dice «Cuando exista el cobro, aqui se reembolsa.»
2. `coin_ledger` no tenía un motivo para este gasto (el ledger solo deja gastar con ciertos motivos). Sí existe el motivo `reembolso`. `src/lib/monedero.ts` enumera: `recarga`, `compra_clip`, `venta_clip`, `propina`, `ajuste_admin`, `reembolso`, `retiro`. No reutilices `compra_clip` ni `venta_clip` para una consulta: no es un desbloqueo de clip.
3. El tipo de cambio ya no está pendiente: `ajustes.tipo_cambio_usd_mxn` vale 1850, es decir 18.50 MXN por USD. Todo se guarda en centavos de dólar (las columnas se siguen llamando `*_coins`; ver `src/lib/dinero.ts`). 1 coin = 1 centavo de dólar. Convierte 20.00 MXN a centavos de dólar con ese tipo de cambio y el mismo redondeo al centavo más cercano que ya usa el resto del dinero. No inventes otra tasa.
4. `bot_anular_mensaje` borra el mensaje del cliente si Telegram no pudo entregarlo (`tg_msg_id is null`). Si cobraste al registrarlo, esa anulación tiene que deshacer el cobro. Si no, cobra solo cuando el mensaje ya quedó entregado, pero entonces `consultas_vencer` y el registro tienen que saber el monto.
5. `avisarVencidos` en `supabase/functions/telegram-bot/index.ts` hoy le dice al cliente que ella no respondió y que ya no está pendiente. No menciona devolución de saldo. `COBRO_CONSULTAS_ACTIVO` en `src/content/consultas.ts` sigue en `false` (el comentario viejo habla de la equivalencia coins↔pesos; eso ya no bloquea).
6. Recargar saldo desde la web todavía no se puede: no hay procesador de pagos compatible con este giro. No inventes recargas, pasarela ni SPEI de entrada.

#### 1. Cobrar al enviar, retener, devolver o repartir
1. Añade los motivos que falten en el ledger (y su nombre visible en `NOMBRE_MOTIVO`) para el gasto del cliente y, si hace falta, para lo que reciba la creadora al responder. El reembolso puede usar el motivo `reembolso` que ya existe. Cada movimiento lleva `ref_id` al mensaje (o a la consulta) para poder auditarlo.
2. Guarda en `consulta_mensajes.cobro_coins` el monto exacto que se le cobró al cliente en esa operación (centavos de dólar). El reembolso devuelve **ese** monto, no una conversión nueva si el tipo de cambio cambió después.
3. Cobra cuando el mensaje del cliente queda registrado y se va a entregar. Si no tiene saldo suficiente, **no** se registra ni se envía: avísale con una frase corta (no tiene saldo suficiente para este mensaje). No le prometas que puede recargar: esa pantalla todavía no recarga.
4. Entre el envío y la respuesta o el vencimiento, **retén** el cobro: no se lo acredites a la creadora ni tomes la comisión todavía. Si ya hay un patrón de retención (encargos: el dinero queda retenido hasta entregar), reúsalo; no inventes otra caja.
5. Si ella responde a tiempo: aplica el reparto de siempre, comisión **20%** / creadora **80%**, con la misma función de reparto que ya usan las ventas (no inventes otro redondeo). El cliente no recibe nada de vuelta: pagó por ese mensaje y esa respuesta.
6. Si vence sin respuesta (`consultas_vencer`): marca el mensaje `vencido` como hoy y **devuelve el 100%** de `cobro_coins` al saldo del cliente, una sola vez (solo filas que pasan de `enviado` a `vencido` con `cobro_coins > 0`). No le desconte nada a la creadora: nunca se lo acreditaste.
7. Si `bot_anular_mensaje` borra un mensaje ya cobrado, deshaz el cobro (el cliente no debe perder saldo por un mensaje que no se entregó).
8. Mensajes viejos con `cobro_coins = 0` no generan reembolso ni cargo retroactivo.
9. Enciende `consultas_config.cobro_activo` y `COBRO_CONSULTAS_ACTIVO` (ponlos de acuerdo). Con eso, el botón de consultar de una ficha ya puede mostrar el precio, como ya preveía `consultas.ts`. No inventes otra pasarela: se cobra del saldo de la cuenta, que es lo que Sergio confirmó.

#### 2. Decírselo al cliente (sin inventar legales)
1. En `/consultas`, en la regla 5 (Plazo) o pegado a ella, añade la decisión de Sergio con sus palabras: si la creadora no responde en esos 2 días, se le devuelve el saldo al cliente. No escribas un apartado nuevo de «política de reembolsos», no toques `/privacidad` ni `/terminos`, no inventes plazos distintos ni excepciones.
2. En `avisarVencidos`, si de verdad se devolvió saldo, díselo al cliente en la misma notificación (una frase: se le devolvió el saldo). Si el mensaje vencido no tenía cobro (`cobro_coins = 0`), deja el aviso como está. A la creadora sigue bastando saber que se venció el plazo.
3. Si hace falta, una mención breve del mismo hecho en la tarjeta de Precios o el recuadro de `/creadoras` está bien, usando la misma idea, no un texto legal distinto.

#### Qué no tocar
Textos legales (`PENDIENTES_ABOGADO`, `/privacidad`, `/terminos`), token o secretos de Telegram (nunca en el repo, el front ni un commit), DeepSeek (sigue solo validando), el plazo de 2 días, el precio de 20 pesos, recargas o un procesador de pagos nuevo, el hero del 80% / dólar, dominio (`public/CNAME`), reproductor, trato, panel (más allá del nombre de un motivo), avatares, álbumes.

#### Criterios de aceptación
1. Un mensaje del cliente con cobro activo y saldo suficiente descuenta del saldo el equivalente de 20 pesos (tipo de cambio vigente, redondeo de siempre) y guarda ese monto en `cobro_coins`.
2. Si no hay saldo suficiente, el mensaje no se envía y no se descuenta nada.
3. Si ella no responde en 2 días, `consultas_vencer` le devuelve al cliente exactamente `cobro_coins`, una sola vez, y el bot se lo dice.
4. Si ella responde a tiempo, no hay devolución; ella recibe el 80% y la plataforma el 20%, con el reparto de siempre.
5. Si Telegram no entrega el mensaje y se anula, el cliente no pierde el saldo.
6. En `/consultas` se lee que, si no hay respuesta en 2 días, se devuelve el saldo al cliente. No se tocaron páginas legales.
7. Typecheck, build y lint limpios (solo advertencias que ya existían).

#### Cómo demostrar (obligatorio en bridge-query.md)
SHA, diff resumido, y verificación: la conversión 20 MXN → centavos; que el cobro, la retención, el reembolso y el reparto al responder hacen lo de arriba (prueba SQL o caso equivalente); que anular no deja el cargo; que `/consultas` menciona la devolución; que no se inventó recarga ni se tocó un secreto. No marques `CHECKLIST.md` como pass.

#### Siguiente paso para Claude Code
1. `git pull` de `origin/main`.
2. Si `20261107-03` no está `respondida`, termínala primero.
3. Implementa esta ronda. Commit de producto, p. ej. `feat: cobro de consultas y devolucion del saldo si no hay respuesta`; `git push origin main`. Aplica la migración en producción cuando Omar lo autorice, igual que las anteriores.
4. Marca `bridge-query.md` `[id: 20261107-04]` como `respondida` con SHA, diff y verificación. **No** marques `CHECKLIST.md` como pass.

### Respuesta a [id: 20261107-03] — Precio de las consultas en portada y avatar solo tras revisión
- **fecha:** 2026-11-07 20:50 (America/Mexico_City)
- **estado:** lista-para-claude
- **responde a:** Sergio pidió atacar lo que falta ahora mismo. De lo inmediato, esto sí se puede hacer sin inventar textos legales ni reglas de reembolso: que se vea el precio de 20 pesos donde ya se anuncian las consultas, y que un cuadro del video no se vuelva foto de perfil pública antes de una revisión.
- **ronda:** 1 de 10 de esta tarea · **tope:** 1 hora
- **checklist afectados (NO marques pass tú):** convenciones de UI si tocas la portada. No rompas ítems `pass` ni el trabajo de las rondas 4, 5, 6, 7, `20261107-01` ni `20261107-02`.

#### Orden respecto a rondas anteriores
No reabras `[id: 20261106-04]`, `[id: 20261106-05]`, `[id: 20261106-06]`, `[id: 20261106-07]`, `[id: 20261107-01]` ni `[id: 20261107-02]`. Esta ronda va en su propio commit. No mezcles legales, cobro de consultas, reproductor, dominio ni panel de administración.

#### Diagnóstico (no lo reescribas: úsalo)
1. **Precio de consultas.** Sergio fijó 20 pesos por mensaje del cliente. Vive en `PRECIO_CONSULTA_TELEGRAM` (`src/content/consultas.ts`) y ya se lee en `/consultas`. En «Precios y formas de ganar» la tarjeta dice solo: «Pagas por cada mensaje y la creadora responde en un máximo de 2 días.» (`FORMAS_NEON` en `src/content/portada.ts`). En `/creadoras` el recuadro habla de «mensaje pagado» y del tope de 2 días, y el comentario del archivo dice que el precio vive en `/consultas` (`src/screens/Creators.tsx`). Quien solo mira la portada o la oferta no ve cuánto cuesta.
2. **«El 80% de cada dólar»** (hero de `Portal.tsx`, gancho de `/entrar`) NO se cambia: las ventas de clips son la economía en dólares de la app; el SPEI se dispersa en pesos. Mezclar eso con los 20 pesos de una consulta sería mentir. No lo reescribas a «pesos».
3. **`/entrar` no está roto.** Es la puerta a propósito (`Entrar.tsx`): no pide datos. Los campos de correo, contraseña y «Entrar con liga» están en `/acceso` y `/registro` (`Acceso.tsx`). No muevas el formulario a `/entrar`.
4. **Avatar al subir.** Si la creadora no tiene `avatar_path`, `Upload.tsx` llama `asignarAvatarSiFalta` (`src/lib/avatarAuto.ts`) justo después de `crearClip` (que inserta con `published: true`). El cuadro más limpio del video se sube al bucket público `avatars` y se escribe en el perfil **antes** de que administración modere el clip. La heurística no sabe si el cuadro es explícito. El relleno viejo de Herramientas (`AvatarAuto.tsx`) sí exige confirmación humana; el atajo al subir se la salta. No se tocan fotos que la persona ya subió a propósito (`avatar_path` no nulo).

#### 1. Mostrar los 20 pesos
1. En la tarjeta «Consultas por Telegram» de `FORMAS_NEON`, incluye el precio usando `PRECIO_CONSULTA_TELEGRAM` (impórtalo; no lo copies como texto suelto). Una frase natural, por ejemplo que cada mensaje del cliente cuesta 20 pesos y ella responde en un máximo de 2 días. Conserva el enlace a `/consultas`.
2. En el recuadro de consultas de `/creadoras`, menciona el mismo precio con la misma constante (p. ej. junto a «mensaje pagado» o al tope de 2 días). No reescribas las reglas ni inventes reembolsos.
3. `COBRO_CONSULTAS_ACTIVO` sigue en `false`. No lo enciendas. No pongas el precio en el botón de consultar de una ficha si ese botón, por esa bandera, todavía no debe prometer cobro (`consultas.ts` lo dice). No inventes copy de pago, cargo ni devolución.

#### 2. No publicar el avatar automático antes de revisarlo
1. Quita de `Upload.tsx` la llamada a `asignarAvatarSiFalta` (y el paso «Preparando tu foto de perfil…» que solo existía por eso). Al terminar de subir, si no tenía foto, se queda la inicial. El clip se crea igual.
2. No asignes el avatar en automático al aprobar el clip en Moderación: sería el mismo riesgo, solo más tarde. La revisión sigue en Herramientas → avatares faltantes (`AvatarAuto.tsx`), que ya no publica nada hasta confirmar.
3. No borres avatares que ya estén puestos. No corras el relleno masivo. No subas un cuadro «en espera» a un bucket público. Si `asignarAvatarSiFalta` queda sin usos, puedes dejarlo o retirarlo; no lo llames desde otro sitio.
4. Los álbumes no llaman esta función hoy: no la agregues ahí.

#### Qué no tocar
Textos legales, comisión 20% / SPEI / 18+, el hero del 80% ni «dólar», el formulario de `/acceso` y `/registro`, token o secretos de Telegram, el cobro de consultas, el dominio (`public/CNAME` y rawstudio.mx), reproductor, trato, panel de administración, redes sociales.

#### Criterios de aceptación
1. En Precios (tarjeta de consultas) y en el recuadro de `/creadoras` se lee que cada mensaje cuesta 20 pesos, salido de `PRECIO_CONSULTA_TELEGRAM`.
2. Subir un video ya no escribe `avatar_path` ni sube un jpg al bucket `avatars`.
3. `COBRO_CONSULTAS_ACTIVO` sigue en `false`. El 80% / dólar no cambió.
4. Typecheck, build y lint limpios (solo advertencias que ya existían).

#### Cómo demostrar (obligatorio en bridge-query.md)
SHA, diff resumido, y verificación: texto de la tarjeta y del recuadro; que `Upload.tsx` ya no llama `asignarAvatarSiFalta`; que no hay un nuevo llamado automático al aprobar; que no se encendió el cobro. No marques `CHECKLIST.md` como pass.

#### Siguiente paso para Claude Code
1. `git pull` de `origin/main`.
2. Implementa esta ronda. Commit de producto, p. ej. `fix: precio de consultas visible y avatar automatico solo tras revision`; `git push origin main`.
3. Marca `bridge-query.md` `[id: 20261107-03]` como `respondida` con SHA, diff y verificación. **No** marques `CHECKLIST.md` como pass.

### Respuesta a [id: 20261107-02] — Ronda 2/10 · Panel de administración: búsqueda, urgencia, bitácora reciente, avatares y exportar
- **fecha:** 2026-11-07 20:26 (America/Mexico_City)
- **estado:** lista-para-claude
- **responde a:** Sergio confirmó la lista priorizada: lo que más le sirve ahora, sin inventar visitas ni rehacer el panel, es búsqueda general, actividad reciente de la bitácora en el Resumen, urgencia (no solo el número), traer a la portada los avatares que esperan revisión, y exportar finanzas y retiros.
- **ronda:** 2 de 10 de esta tarea · **tope:** 1 hora · si el tope se queda corto, deja dos commits de ESTA misma ronda (primero búsqueda + Resumen: urgencia, bitácora y avatares; después exportar). No dejes a medias ni pases la mitad a otra ronda.
- **checklist afectados (NO marques pass tú):** convenciones de UI si tocas el marco del panel. No rompas ítems `pass` ni el trabajo de las rondas 4, 5, 6, 7 ni `[id: 20261107-01]`.

#### Orden respecto a rondas anteriores
No reabras `[id: 20261106-04]`, `[id: 20261106-05]`, `[id: 20261106-06]`, `[id: 20261106-07]` ni `[id: 20261107-01]` (esa ya está hecha y respondida). Esta ronda va en su propio commit (o en los dos de arriba). No mezcles este trabajo con álbumes, avatares automáticos (más allá de mostrar el conteo y el enlace), trato, landing, reproductor, legales, cobro de consultas ni analítica de vistas para creadoras.

#### Diagnóstico (no lo reescribas: úsalo)
La ronda 20261107-01 ya dejó portada Resumen (`src/admin/Resumen.tsx`), menú agrupado, badges compartidos (`pendientes.ts`), consola `/admin/consultas` y las cuatro correcciones. El Resumen muestra conteos de colas, dinero de 30 días y almacenamiento; no muestra qué pasó hace poco, ni qué lleva mucho tiempo esperando, ni los avatares sin foto. La búsqueda existe dentro de Usuarios y de Consultas, pero no hay una búsqueda general desde cualquier pantalla. Finanzas y Retiros se consultan en pantalla; no se pueden bajar como archivo. El panel sigue siendo de escritorio (`ANCHO_MINIMO = 1280`): no lo hagas responsivo. Reutiliza `piezas.tsx`, `pendientes.ts` y las RPC que ya existen; no rehagas tablas ni confirmaciones.

**No inventes métricas.** Sigue sin haber registro de visitas: no pongas vistas, conversión, embudo ni «usuarios nuevos hoy». El desempeño de clips para creadoras (ventas por video, mapas de momentos vistos) NO entra en esta ronda: es una función del Estudio, aparte.

Sobre dinero: ya existe `ajustes.tipo_cambio_usd_mxn` (1850 = 18.50 MXN por dólar; 1 coin = 1 centavo de dólar). Distingue siempre el reparto interno en dólares de lo realmente dispersado en pesos. No presentes devengado como transferencia hecha.

#### 1. Búsqueda general
1. Desde cualquier pantalla del panel, poder ir directo a una cuenta, un clip o una consulta. Un campo siempre visible en el marco o una paleta al estilo profesional (`Ctrl+K` / `Cmd+K`, y también un control clicable: no dependas solo del atajo).
2. Resultados agrupados: Personas, Contenido, Consultas. Un clic lleva al destino (ficha de usuario, clip en Contenido o Moderación según encaje, hilo en `/admin/consultas`). Si la ruta actual no acepta un identificador, añade un parámetro de consulta o reutiliza la búsqueda de esa pantalla: no inventes un cuarto tipo de entidad.
3. Busca por handle, nombre visible, correo (en personas, como ya hace Usuarios), título o id de clip, y handle o título de clip en consultas. Debounce, vacío claro («Nada coincide con …») y estado de carga.
4. **Privacidad:** las RPC nuevas son `security definer` y solo `es_admin()`. No devuelvas `chat_id`, teléfono, token ni secretos. De consultas, el mismo criterio que la consola: handle público o «Cuenta eliminada».
5. Un solo lote por búsqueda, no una query por grupo cada tecla.

#### 2. Actividad reciente en el Resumen
1. Debajo de «Por atender» (o justo después de las tarjetas de atención, antes o después de Dinero: que no empuje las colas fuera de la primera mirada), muestra las últimas acciones de la bitácora que YA se registran: quién, qué, cuándo (8 a 10 renglones).
2. Reutiliza la fuente de `Bitacora.tsx` / su RPC. No inventes nombres de acciones ni completes huecos.
3. Un enlace «Ver bitácora →» a `/admin/bitacora`. Si no hay filas: «Todavía no hay acciones registradas.»

#### 3. Urgencia, no solo el número
1. En las tarjetas del Resumen (y, si encaja sin ruido, en el texto accesible del badge) añade contexto de tiempo con timestamps reales:
   - clips pendientes de moderación que llevan más de 24 horas;
   - consultas esperando respuesta que se acercan al tope de 2 días (menos de 12 horas para vencer) y las que ya vencieron (eso último ya se muestra: consérvalo).
2. Si hace falta una RPC nueva (p. ej. ampliar el lote de `pendientes.ts`), que calcule desde fechas guardadas. No adivines edades. No cambies la regla de negocio de los 2 días.
3. Frases claras, al estilo del Resumen actual: «3 pendientes · el más antiguo lleva 2 días» o «1 se vence en menos de 12 horas». Si todo es reciente, no inventes alarma: basta el número que ya está.
4. Identidades, denuncias y retiros: si ya tienes fecha de llegada en la misma consulta, puedes mostrar la misma idea («el más antiguo lleva…»); si no, no inventes un campo ni dispares otra query solo para eso.

#### 4. Avatares que esperan revisión, en la portada
1. Nueva tarjeta en «Por atender» que lleve a Herramientas (donde vive `AvatarAuto.tsx`): creadoras (`is_creator`, no vetadas) con `avatar_path` nulo y al menos un clip publicado con video. Ese es el lote que hoy se busca al pulsar «Buscar creadoras sin foto».
2. Cuenta real vía el lote de pendientes o una RPC `es_admin` (no recorroas perfiles desde el Resumen ni generes cuadros aquí).
3. **No publiques avatares, no corras el relleno automático, no apliques propuestas.** El avatar es público y la heurística no sabe qué hay en el cuadro: la revisión sigue siendo manual en Herramientas.
4. Vacío claro: «Ninguna creadora sin foto con video publicado» (o la frase equivalente). No cuentes como pendientes a quienes no tienen video (esas se quedan con la inicial, sin propuesta).

#### 5. Exportar finanzas y retiros
1. En Finanzas: un control para descargar un CSV del rango Desde/Hasta que ya está elegido, con las mismas cifras que ves en pantalla (bruto, comisión, reparto a creadoras, operaciones; y, si ya está en esa vista, lo dispersado). UTF-8. Encabezados en español. Distingue dólares internos de pesos dispersados en el nombre de las columnas; no mezcles unidades.
2. En Retiros: un control para descargar un CSV de las solicitudes (las de la pestaña visible, o un archivo con las mismas columnas que la tabla y una columna de estado). No recalcules montos.
3. No inventes columnas (visitas, conversión, etc.). La descarga ocurre en el navegador de quien administra; no expongas el archivo a `anon`.

#### Qué no tocar
Textos legales (`/privacidad`, `/terminos`, `PENDIENTES_ABOGADO`), comisión 20% / SPEI / 18+, token o secretos de Telegram, el cobro de consultas (`COBRO_CONSULTAS_ACTIVO` sigue en `false`), reproductor, landing, trato de género, no hagas el panel responsivo, no implementes el placeholder de Redes Sociales, no montes un monitor técnico de errores o deploys, no implementes analítica de vistas ni mapas de momentos para creadoras, no cambies el dominio ni `public/CNAME`.

#### Criterios de aceptación
1. Desde cualquier módulo del panel se puede buscar y abrir una cuenta, un clip o una consulta, sin `chat_id` ni token en las respuestas.
2. El Resumen muestra las últimas acciones reales de la bitácora (o el vacío claro).
3. Las tarjetas de clips y consultas dicen si algo lleva tiempo o se vence pronto, usando fechas reales.
4. El Resumen tiene una tarjeta de avatares por revisar que lleva a Herramientas y no aplica ningún avatar.
5. Finanzas y Retiros permiten bajar un CSV fiel a lo que ya se consulta, sin cifras inventadas.
6. Typecheck, build y lint limpios (solo advertencias que ya existían).

#### Cómo demostrar (obligatorio en bridge-query.md)
SHA, diff resumido, y verificación: búsqueda (coincidencia de persona, de clip y de consulta; vacío; que un no-admin o `anon` no vea resultados si hay RPC nueva), Resumen con bitácora reciente y tarjeta de avatares, frases de urgencia con un dato de prueba cuya fecha lo justifique (o explicación si en local no hay ninguno antiguo), descarga de CSV de Finanzas (rango distinto de 30 días) y de Retiros, y confirmación de que ninguna RPC nueva expone `chat_id`, teléfono o token. No marques `CHECKLIST.md` como pass.

#### Siguiente paso para Claude Code
1. `git pull` de `origin/main`.
2. Implementa esta ronda. Commit(s) de producto, p. ej. `feat: busqueda y urgencia en el panel de administracion` y `feat: exportar finanzas y retiros del panel`; `git push origin main`.
3. Marca `bridge-query.md` `[id: 20261107-02]` como `respondida` con SHA, diff y verificación. **No** marques `CHECKLIST.md` como pass.

### Respuesta a [id: 20261107-01] — Ronda 1/10 · Panel de administración: resumen, menú y consola de consultas
- **fecha:** 2026-11-07 18:56 (America/Mexico_City)
- **estado:** lista-para-claude
- **responde a:** Sergio pidió que el panel de administración se sienta como una consola profesional: más amigable, con estadísticas/dashboard y fácil de ver lo de usuarios, moderación, contenido, comunicación, finanzas y bitácoras. Eligió el paquete completo: portada Resumen, menú ordenado, correcciones puntuales y una consola administrativa de consultas por Telegram.
- **ronda:** 1 de 10 de esta tarea · **tope:** 1 hora · si el tope se queda corto, deja dos commits de ESTA misma ronda (primero resumen + menú + correcciones; después la consola de consultas). No dejes la consola a medias ni la pases a otra ronda.
- **checklist afectados (NO marques pass tú):** convenciones de UI si tocas el marco del panel. No rompas ítems `pass` ni el trabajo de las rondas 4, 5, 6 y 7.

#### Orden respecto a rondas anteriores
No reabras `[id: 20261106-04]`, `[id: 20261106-05]`, `[id: 20261106-06]` ni `[id: 20261106-07]`. Esta ronda va en su propio commit (o en los dos de arriba). No mezcles este trabajo con álbumes, avatares, trato, landing, reproductor ni legales.

#### Diagnóstico (no lo reescribas: úsalo)
El panel YA tiene las pantallas: Usuarios, Moderación, Contenido, Comunicación, Finanzas, Bitácora, Reportes (son denuncias, no analítica), Retiros, Verificación y Herramientas. Lo que falta es orientación, no CRUD. `/admin` aterriza en Usuarios. `src/admin/Marco.tsx` lista diez destinos al mismo nivel (`MODULOS`), numerados 01–09, sin agrupación. El único badge global es el de archivos vencidos por purgar, en Contenido. Finanzas ya tiene indicadores (`admin_finanzas`, `admin_dinero_real`, `admin_finanzas_serie`, `admin_ranking_creadoras`) pero están enterrados en esa sección. Moderación, Verificación y Reportes ya tienen conteos locales (`admin_conteo_moderacion`, `admin_conteo_verificaciones`, `admin_conteo_reportes`) que no se ven desde el menú ni desde una portada. Reutiliza `src/admin/piezas.tsx`; no rehagas tablas, paginadores ni confirmaciones.

#### 1. Portada «Resumen»
1. Nuevo módulo `resumen` (título «Resumen»). `/admin` y `/admin/resumen` abren esta portada. Una URL de módulo desconocida también cae aquí (hoy `useModulo()` cae en Usuarios y parece una sección válida).
2. Arriba, lo que necesita atención, cada tarjeta con el número y un enlace al módulo:
   - clips pendientes de moderación (`admin_conteo_moderacion`)
   - identidades pendientes (`admin_conteo_verificaciones`)
   - denuncias abiertas / por resolver (`admin_conteo_reportes`)
   - retiros pendientes (si no hay RPC de conteo, crea `admin_conteo_retiros` al estilo de las otras; NO sumes solo la página visible de una lista)
   - archivos vencidos por purgar (`admin_por_purgar`)
   - consultas por Telegram esperando respuesta o vencidas (la RPC nueva de la consola, más abajo)
3. Debajo, indicadores que YA existen: de Finanzas (bruto movido, comisión, pagado a creadoras, operaciones; y/o dinero real) y de almacenamiento (`admin_uso_almacenamiento`). Un clic lleva a Finanzas o Herramientas.
4. **NO inventes métricas.** No pongas visitas, conversión, embudo ni «usuarios nuevos hoy» salvo que exista una RPC agregada de verdad. `Finanzas.tsx` declara que no se registran vistas.
5. Vacíos útiles: si no hay pendientes, dilo claro («Nada esperando revisión»), no dejes tarjetas en cero sin contexto.

#### 2. Menú agrupado y avisos
1. Agrupa la lateral, sin hacerla responsiva (el comentario de `Marco.tsx` se queda: es herramienta de escritorio, `ANCHO_MINIMO = 1280`).
   - **Por atender:** Resumen, Moderación, Verificación, Denuncias, Consultas
   - **Personas:** Usuarios
   - **Contenido:** Contenido
   - **Dinero:** Finanzas, Retiros
   - **Comunicación:** Comunicación
   - **Sistema:** Bitácora, Herramientas
2. Renombra la etiqueta «Reportes» a **«Denuncias»**. Conserva la clave/ruta `/admin/reportes` para no romper enlaces.
3. Badges en el menú (como el de purgar) para Moderación, Verificación, Denuncias, Retiros y Consultas, con el conteo que corresponde. No dispares una query por ítem cada segundo; un lote al montar el marco (y al volver a la ventana) basta.
4. No hace falta seguir numerando 01–09 si los grupos ya ordenan.

#### 3. Correcciones
1. **Herramientas / demo:** `sembrarDemo()` y `borrarDemo()` en `src/lib/admin.ts` devuelven `{ error: ... }`, pero `Herramientas.tsx` solo comprueba `typeof r === 'string'`. Un error puede mostrar «Contenido de demostración creado.» o «… borrado.» Corrige el chequeo y muestra el error.
2. **Finanzas / gráfica:** el filtro Desde/Hasta afecta el resumen y el ranking, pero la gráfica llama siempre `serieFinanzas(30)`. Haz que la serie siga el rango elegido (si la RPC solo acepta un número de días, pásale el rango real o amplíala). No inventes puntos.
3. **Lenguaje del dinero:** no mezcles dólares, pesos y coins como si fueran lo mismo, y no inventes el tipo de cambio coins↔pesos (sigue sin definirse). Distingue en las etiquetas el reparto interno («Pagado a creadoras» de la economía de la app) de lo realmente dispersado («Dispersado a creadoras»). No presentas devengado como transferencia bancaria hecha.
4. **Zona de riesgo en Usuarios:** separa visualmente «Anonimizar», «Eliminar definitivamente» y «Ajustar saldo» de las acciones de todos los días (suspender, banear, reactivar). Siguen existiendo las confirmaciones; no las quites.

#### 4. Consola administrativa de consultas por Telegram
1. Nuevo módulo `consultas`, título «Consultas», ruta `/admin/consultas`. No la confundas con la página pública `/consultas` ni con `BandejaConsultas` del Estudio (esa es de la creadora, solo sus hilos).
2. Lista todas las conversaciones: creadora (handle público), la otra parte como su handle público de la app (o «Cuenta eliminada»), clip, último mensaje, cuántos van sin responder, cuándo vence el plazo, cuántos ya vencieron. Filtros: todas / esperando respuesta / vencidas. Búsqueda y paginación al estilo del resto del panel.
3. Al abrir un hilo: los mensajes en orden, quién escribió (cliente / creadora), fecha, estado (enviado / vencido / lo que ya exista). Si algún aviso de validación (DeepSeek o reglas) ya está guardado, muéstralo; no inventes uno.
4. **Solo lectura.** El admin no responde, no cobra, no reembolsa ni cambia el estado del mensaje desde aquí. Las respuestas se siguen escribiendo en Telegram.
5. **Privacidad:** las RPC nuevas son `security definer` y solo las ejecuta un admin (`es_admin`). NO devuelvas `chat_id`, teléfono, token del bot ni secretos. De cada parte solo el handle público (el mismo criterio que `mis_consultas()` / `consulta_mensajes_de()` en `20261128000000_bandeja_consultas.sql`).
6. Reutiliza el modelo mental y, si sirve, la forma de `mis_consultas` / `consulta_mensajes_de`, ampliados a todo el sitio para admin. Añade `admin_conteo_consultas` (o el nombre que encaje) para el badge y la tarjeta del Resumen.
7. El cobro sigue apagado (`COBRO_CONSULTAS_ACTIVO = false`). No lo enciendas. No inventes copy de pago, reembolso ni tipo de cambio.

#### Qué no tocar
Textos legales (`/privacidad`, `/terminos`, `PENDIENTES_ABOGADO`), comisión 20% / SPEI / 18+, token o secretos de Telegram, el cobro de consultas, reproductor, landing, trato de género, avatares (salvo que un enlace del Resumen lleve a Herramientas), no hagas el panel responsivo, no implementes el placeholder de Redes Sociales, no montes un monitor técnico de errores o deploys.

#### Criterios de aceptación
1. Entrar a `/admin` muestra Resumen con pendientes reales (o vacíos claros) y los indicadores financieros/de almacenamiento que ya existen.
2. El menú está agrupado; «Denuncias» es el nombre visible de Reportes; hay badges en las colas que importan.
3. Las cuatro correcciones de la §3 se cumplen.
4. `/admin/consultas` lista hilos de todo el sitio, permite abrir uno y leer mensajes, sin `chat_id` ni token en el navegador, y sin acciones de escritura/cobro.
5. Typecheck, build y lint limpios (solo advertencias que ya existían).

#### Cómo demostrar (obligatorio en bridge-query.md)
SHA, diff resumido, y verificación: recorrido de `/admin` (Resumen), del menú con grupos y badges, de Denuncias (misma ruta `/admin/reportes`), de un error de demo si puedes provocarlo en local, de la gráfica con un rango distinto de 30 días, de la zona de riesgo en una ficha de usuario, y de la consola de consultas (lista + detalle; si no hay hilos, el vacío). Confirma que ninguna RPC nueva expone `chat_id`.

#### Siguiente paso para Claude Code
1. `git pull` de `origin/main`.
2. Implementa esta ronda. Commit(s) de producto, p. ej. `feat: resumen y menu del panel de administracion` y `feat: consola admin de consultas por Telegram`; `git push origin main`.
3. Marca `bridge-query.md` `[id: 20261107-01]` como `respondida` con SHA, diff y verificación. **No** marques `CHECKLIST.md` como pass.

---

### Respuesta a [id: 20261106-07] — Ronda 7/10 · Trato de género desde el alta
- **fecha:** 2026-11-06 17:56 (America/Mexico_City)
- **estado:** lista-para-claude
- **responde a:** Sergio vio que el sitio habla de «creadora» en general aunque la persona puede ser creador, y pidió registrar desde el principio el trato: hombre, mujer, neutro o prefiere no decirlo.
- **ronda:** 7 de 10 · **tope:** 1 hora · **tarea:** §10 de `CHECKLIST.md` (trato de género)
- **checklist afectados (NO marques pass tú):** §10 `not_started` → el coordinador lo verifica. No rompas ítems `pass` ni el trabajo de las rondas 4, 5 y 6.

#### Orden respecto a rondas anteriores
Si `[id: 20261106-04]`, `[id: 20261106-05]` o `[id: 20261106-06]` todavía aparecen como pendientes (no deberían: ya fueron hechas), no las reabras. Esta ronda va en su propio commit. No mezcles este recorte con otros en un solo commit.

#### Reglas de producto (Sergio — no las «mejores»)
1. El trato se registra desde el principio (al crear la cuenta), no se adivina después.
2. Las opciones son exactamente cuatro: mujer, hombre, neutro, prefiere no decirlo.

#### Decisión de UI/técnica (coordinador — no preguntar a Sergio)
1. Columna nueva en `public.profiles`, p. ej. `trato text`, con check `mujer | hombre | neutro | no_decir`. Nullable para cuentas que ya existen.
2. En el registro (`Acceso` modo registro) las cuatro opciones son obligatorias; ninguna viene preseleccionada. Sin elegir una, no se crea la cuenta.
3. Se puede cambiar después en Perfil / Ajustes.
4. El valor NO se muestra en el perfil público (nadie más ve «hombre» o «mujer» como dato de la ficha). Solo sirve para generar el trato en la copia. En el panel admin sí puede verse en la ficha de la cuenta.
5. Helper único (p. ej. `src/lib/trato.ts`) que, dado el `trato` de esa persona, devuelve las palabras para dirigirse a ella:
   - mujer → creadora, usuaria
   - hombre → creador, usuario
   - neutro y no_decir → el mismo trato, sin asumir género: «tú», «tu perfil», «quien publica», «esta cuenta». No uses «creadore» ni «elle».
6. Cuentas existentes con `trato` null: trátalas como neutro hasta que elijan. En Perfil, un aviso corto una vez: «¿Cómo prefieres que te tratemos?» con las cuatro opciones. No bloquees el resto de la app.
7. Sustituye el trato personal hardcodeado («Eres creadora», insignia «Creadora» cuando se refiere a ESA persona, el admin que dice «esta usuaria» de alguien concreto) usando el helper. No hagas un buscar-y-reemplazar ciego de la palabra «creadora» en todo el repo.
8. NO renombres la ruta ni la página pública `/creadoras`: es el nombre de la oferta para quien quiere publicar. Sergio no pidió cambiar esa sección.
9. NO reescribas `/privacidad` ni `/terminos`. No inventes texto legal sobre recoger este dato.
10. No toques el copy fijo de comisión 20%, SPEI ni 18+.
11. En esta ronda NO agregues un botón nuevo de borrado duro ni cambies el de Anonimizar (eso es otra conversación).
12. Migración + permisos: cada quien actualiza su propio `trato`; admin puede leerlo.

#### Qué no tocar
Textos legales, bot/cobro de Telegram, reproductor, esquema RPC de comentarios (sí puedes cambiar el texto de una insignia si usa el helper), avatares, landing/hero, rondas 4–6 de producto.

#### Criterios de aceptación
1. El alta nueva no termina sin elegir una de las cuatro opciones.
2. En Perfil se puede cambiar.
3. Quien eligió hombre ve «creador» (no «creadora») en el trato que se le dirige.
4. Neutro y «prefiere no decirlo» no reciben «creadora» por defecto.
5. Cuentas viejas sin valor ven trato neutro y el aviso para elegir, sin quedar bloqueadas.
6. `/creadoras` sigue siendo esa ruta y esa página de oferta.
7. El `trato` no se publica como dato visible en la ficha pública.

#### Cómo demostrar (obligatorio en bridge-query.md)
SHA, diff resumido, verificación: captura o recorrido del registro con las cuatro opciones; del helper; de una cuenta hombre vs mujer vs neutro en un texto de trato personal; de que `/creadoras` no se renombró.

#### Siguiente paso para Claude Code
1. `git pull` de `origin/main`.
2. Implementa esta ronda, un commit de producto (`feat: trato de genero desde el alta`) y `git push origin main`.
3. Marca `bridge-query.md` `[id: 20261106-07]` como `respondida` con SHA, diff y verificación. **No** marques `CHECKLIST.md` como pass.

---

### Respuesta a [id: 20261106-06] — Ronda 6/10 · Avatares automáticos para creadoras sin foto
- **fecha:** 2026-11-06 15:15 (America/Mexico_City)
- **estado:** lista-para-claude
- **responde a:** Asignación del coordinador. Sergio pidió por voz generar avatares automáticos: un frame no explícito del video de la creadora si no tiene foto; si no tiene ningún video, un avatar neutro (silueta o inicial), no un ícono genérico tipo balón.
- **ronda:** 6 de 10 · **tope:** 1 hora · **tarea:** §9 de `CHECKLIST.md` (avatares de creadoras)
- **checklist afectados (NO marques pass tú):** §9 `not_started` → el coordinador lo verifica. No rompas los `pass` de §2 ni §3 ni el trabajo de las rondas 4 y 5.

#### Orden respecto a las rondas 4 y 5
Si `[id: 20261106-04]` o `[id: 20261106-05]` todavía no están hechas y empujadas, **termínalas primero** (04, luego 05) y después sigue con esta. No mezcles esta ronda con las otras en un solo commit.

#### Qué hay hoy (revisado por el coordinador el 2026-11-06 ~15:09 America/Mexico_City)
- Foto de perfil: `public.profiles.avatar_path` + bucket público `avatars` (jpeg/png/webp, 2 MB, ruta `{uid}/{uuid}.ext`). URL: `urlAvatar()` en `src/lib/perfiles.ts`. Escritura: `subirAvatar()` en `src/screens/Perfil.tsx`; admin `fijarAvatar()` / RPC `admin_fijar_avatar`.
- Fallback actual: **no** hay ícono tipo balón. Sin foto se ve un círculo con rayas (`repeating-linear-gradient`) o un círculo sólido `COLOR.superficieAlta` (Explorar, Comentarios). En Perfil el círculo vacío dice «Foto».
- Videos: `public.clips` (`creator_id`, `storage_path` privado, `cover_path` público, `tiene_video`). Extracción de cuadros **ya existe** en el cliente: `src/lib/miniatura.ts` (`miniaturaDeVideo`, `cuadrosDeVideo` con 6 opciones). Se usa al publicar. No hay FFmpeg en edge functions.
- La portada pública (`cover_path`) mide ~32 px: **no sirve como avatar**. `clip-covers-full` es el teaser nítido y suele ser explícito: **no lo uses como atajo**.
- No uses los JPG de `perfiles/pp_big-*` (no están enlazados al frontend).

#### Conteos (snapshot público, 2026-11-06 ~15:09 America/Mexico_City)
- Creadoras (`is_creator`, no baneadas): **56**
- Con `avatar_path` (no tocar): **4** — `@aria_cum`, `@nora_hot`, `@rawstudio2030`, `@yesenia96`
- Sin avatar y con ≥1 clip publicado (`tiene_video` + `cover_path`): **51** — candidatas a frame
- Sin avatar y sin clips: **1** — `@lumen` — avatar neutro
- Clips publicados legibles: **187** (todos con video y cover)
Los números pueden haber cambiado; el código debe operar sobre el estado real (`avatar_path` null o no; clips publicados o no), no sobre esta lista fija.

#### Reglas de producto (Sergio — no las «mejores»)
Avatares automáticos para creadoras
1. Si la creadora ya tiene foto de perfil, no se toca.
2. Si no tiene foto y sí tiene al menos un video publicado, se toma un frame no explícito — el más limpio y apropiado — de sus propios videos y se asigna como avatar por defecto.
3. Si no tiene foto ni ningún video, se muestra un avatar neutro generado (silueta o inicial), no un ícono genérico tipo balón.
El contenido de los videos es 18+. El frame no puede ser un recorte explícito a propósito.

#### Decisión de UI/técnica (coordinador — no preguntar a Sergio)
**1. No pisar fotos existentes.** Solo escribe `avatar_path` cuando es null. La creadora (o un admin) puede sustituirlo después con el flujo que ya existe.

**2. De dónde sale el frame.** Del video propio (bucket privado `clips`), con URL firmada (el mismo privilegio que ya usa la publicación/admin / `ver-clip`). Reutiliza `cuadrosDeVideo` de `src/lib/miniatura.ts`. No uses `cover_path` público. No uses `clip-covers-full` como avatar. No inventes un clasificador NSFW ni una API nueva (DeepSeek no entra en esta ronda).

**3. Qué significa «el más limpio y apropiado».** Heurística, no una garantía:
- Extrae varios cuadros (las 6 opciones que ya hay, o un conjunto parecido).
- Prefiere los más tempranos del video.
- Quédate con exposiciones razonables (ni casi negro ni quemado) y descarta cuadros de color casi uniforme (posibles primeros planos vacíos).
- Elige el de mejor puntaje entre los que queden.
Documenta la heurística en el código. Un admin debe poder ver y cambiar el avatar después.

**4. Cuándo se genera.**
- Al publicar un video: si esa creadora no tiene `avatar_path`, genera y asigna el frame (el cliente ya sabe extraer cuadros en `Upload.tsx`).
- Retroactivo: una acción de admin «Generar avatares faltantes» que recorra creadoras con `avatar_path` null y ≥1 clip publicado, extraiga, suba al bucket `avatars` y fije la ruta (vía `fijarAvatar` / `admin_fijar_avatar`). Solo si sigue null. Si puedes ejecutarla con sesión admin contra el proyecto, hazlo y reporta cuántas se asignaron; si no hay sesión admin, deja la acción lista y no finjas el backfill.

**5. Avatar neutro.** Componente unificado (p. ej. `src/components/Avatar.tsx`) para listados, ficha de creadora, ficha de clip, comentarios, perfil y admin. Si hay `avatar_path`, muestra la foto. Si no, un círculo con la inicial de `display_name` (si falta, la de `handle`) sobre tokens de `diseño.ts` (`COLOR.superficieAlta` u otro fondo sobrio de marca). Alternativa aceptable: silueta simple. No rayas, no el texto «Foto» como único fallback en sitios públicos, no un ícono tipo balón ni un pictograma genérico de deporte. Para `@lumen` (y cualquier creadora sin video) basta este fallback; no hace falta subir un archivo.

**6. Dónde se ve.** Sustituye los círculos rayados o planos de `Explorar.tsx`, `CreatorProfile.tsx`, `ClipDetail.tsx`, `Comentarios.tsx`, `Perfil.tsx` y pantallas admin que muestren avatar (`Usuarios`, `PublicarPor`, etc.).

#### Archivos concretos a tocar (esperados)
- `src/components/Avatar.tsx` (nuevo) y los sitios que pintan la foto
- `src/lib/miniatura.ts` (puntaje del cuadro, si hace falta)
- `src/screens/Upload.tsx` (asignar al publicar si no hay foto)
- Acción o pantalla admin para el backfill
- No toques `perfiles/pp_big-*`

#### Qué no tocar
Rondas 4 y 5 (no mezclar commits), landing/hero, reproductor, comentarios, consultas Telegram/DeepSeek, textos legales, `CLAUDE.md`, calidad auto, captions. No añadas claves `VITE_*` nuevas. No uses service role en el frontend.

#### Criterios de aceptación (verificables)
1. Quien ya tiene `avatar_path` sigue igual.
2. Quien no tiene foto y sí tiene video puede recibir un frame en el bucket `avatars` y en `avatar_path`, solo si estaba null: al publicar y/o con la acción de admin.
3. El frame sale del video (heurística documentada), no de la portada de 32 px ni de `clip-covers-full` ni de `perfiles/pp_big-*`.
4. Quien no tiene foto ni video (p. ej. `@lumen`) ve un círculo con inicial o silueta, no rayas ni un ícono tipo balón.
5. Un solo componente de avatar se usa en los sitios públicos listados.
6. Sin clasificador NSFW nuevo, sin DeepSeek, sin claves nuevas en el frontend.

#### Cómo demostrar (obligatorio en el reporte de `bridge-query.md`)
- SHA, diff resumido, verificación.
- Antes/después o captura: una creadora sin foto muestra inicial o silueta; el código tiene la guarda `avatar_path` null.
- Si corriste el backfill: cuántas creadoras recibieron frame y cuántas quedaron en neutro.
- Recorrido: listado de creadoras, una ficha, un clip, comentarios.

#### Límites anti-bucle
Máx 10 rondas en esta tarea; parar si 2 seguidas no mejoran; tope 1 hora.

#### Siguiente paso para Claude Code
1. `git pull` de `origin/main`.
2. Si 04 o 05 siguen pendientes, termínalas primero (una por commit).
3. Implementa esta ronda, un commit de producto (`feat: avatares automaticos para creadoras sin foto`) y `git push origin main`.
4. Marca `bridge-query.md` `[id: 20261106-06]` como `respondida` con SHA, diff y verificación. **No** marques `CHECKLIST.md` como pass.

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
- `src/content/portada.ts` [+35847 bytes at .content[1].resource.text]