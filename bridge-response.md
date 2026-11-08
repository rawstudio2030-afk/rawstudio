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