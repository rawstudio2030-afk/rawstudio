/* Pantalla 08 — Mensajes.
 *
 * Era una pantalla vacia de 37 lineas que decia «los mensajes con propinas
 * llegan cuando construyamos esa parte». Y al mismo tiempo los ENCARGOS —que
 * son literalmente una conversacion: alguien pide algo, se negocia el precio,
 * se acepta, se entrega— vivian enterrados en una entrada de menu del estudio,
 * al lado de «define tu nivel de suscripcion», que es poner un precio una vez.
 *
 * O sea que habia una conversacion real escondida en un menu de configuracion
 * y un destino de primera clase sin nada dentro. Esto los junta: Mensajes es
 * ahora los encargos, y el chat libre se suma aqui cuando exista.
 *
 * La implementacion sigue en src/estudio/Encargos.tsx y no se movio de
 * archivo a proposito: mover 240 lineas de sitio en el mismo commit que cambia
 * la navegacion haria ilegible el diff de las dos cosas. Lo que cambio es
 * quien la monta y como se titula.
 *
 * `/estudio/encargos` sigue existiendo y redirige aqui, igual que `/earnings`
 * redirige a `/wallet`: esa ruta estuvo meses en los menus y puede seguir viva
 * en un enlace o en el historial de alguien.
 */
export { default } from '../estudio/Encargos'
