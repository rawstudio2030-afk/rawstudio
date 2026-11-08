// Lo que comparten el bot de Telegram y el reloj que vence consultas.
//
// Los avisos de un mensaje vencido salen por DOS caminos: la llamada perezosa
// dentro de `telegram-bot` (cada vez que alguien le escribe) y la funcion
// `vencer-consultas`, que corre por reloj. Si cada uno tuviera su copia del
// texto, un dia dirian cosas distintas. Aqui vive la unica.
//
// Nada aqui lee secretos: recibe el token solo para BORRARLO de un mensaje de
// error antes de registrarlo.

/** Una fila de `consultas_vencer()`. */
export type Vencido = {
  chat_cliente: number | null
  chat_creadora: number | null
  clip: string
  creadora: string
  // Solo existe desde la migracion del cobro; antes no viene y se trata como 0.
  devuelto_coins?: number | null
}

/** Los textos de un mensaje vencido. `null` = no hay a donde mandarlo. */
export function avisosDeVencido(v: Vencido): { cliente: string | null; creadora: string | null } {
  // Solo se dice que se devolvio saldo si de verdad se devolvio (mensaje cobrado).
  const devuelto = (v.devuelto_coins ?? 0) > 0
    ? ' Se te devolvio a tu saldo lo que pagaste por ese mensaje.'
    : ''
  return {
    cliente: v.chat_cliente
      ? `${v.creadora} no respondio en el plazo a tu mensaje sobre «${v.clip}». ` +
        `Ya no esta pendiente.${devuelto}`
      : null,
    creadora: v.chat_creadora
      ? `Se vencio el plazo para responder un mensaje sobre «${v.clip}».`
      : null,
  }
}

/** Un error de `fetch` a Telegram trae la URL, y la URL lleva el token del bot.
 *  Esto lo quita antes de que llegue a un registro. */
export function sinToken(e: unknown, token: string): string {
  const texto = e instanceof Error ? `${e.name}: ${e.message}` : String(e)
  return token ? texto.split(token).join('***') : texto
}
