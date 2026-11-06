/* La pantalla con una sola frase en medio: cargando, vacío, o algo que falló.
 *
 * Estaba escrita OCHO VECES, una en cada pantalla que la necesita —Estudio,
 * Wallet, Library, Upload, ClipDetail, CreatorProfile, Verificar y
 * AltaCreadora— y ya habían empezado a separarse: seis llevan un botón
 * opcional y dos no, unas centran en columna y otras en fila.
 *
 * Es además el estado que más se ve de todo el producto, porque precede a
 * cada pantalla que carga algo. O sea que la pantalla más repetida del sitio
 * era la única sin dueño.
 *
 * ---------- Por qué lleva el símbolo ----------
 *
 * Porque es el único momento en que no hay nada más que mirar. El resto del
 * producto tiene contenido, cifras, portadas; aquí hay una frase en cursiva
 * sobre negro, y antes de esto no había ni una señal de dónde estabas.
 *
 * Va APAGADO: cristal gris, sin halo. Un símbolo encendido sobre «no pudimos
 * cargar esto» celebraría un fallo, y encender todo lo que se puede encender
 * es cómo el brillo deja de significar algo. Se enciende cuando el mensaje es
 * bueno, y eso lo decide quien lo monta.
 */
import type { ReactNode } from 'react'
import Simbolo from './Simbolo'
import { COLOR, FUENTE } from '../lib/diseño'
import { Pulsable } from './Pulsable'

export default function Centro({ titulo, texto, accion, encendido = false, children }: {
  /** Tres palabras de titular, la tercera en verde. Lo traia la versión de
   *  Verificar —«Listo, / ya / quedó.»— y se conserva porque un titular
   *  grande es lo que distingue «terminaste» de «algo salió mal», que es
   *  justo lo que una frase en cursiva sola no distingue. */
  titulo?: [string, string, string]
  texto: string
  accion?: { texto: string; al: () => void | Promise<void> }
  /** Para el puñado de casos en que el mensaje es una buena noticia. */
  encendido?: boolean
  children?: ReactNode
}) {
  return (
    <div style={{
      minHeight: '100%', boxSizing: 'border-box', padding: '64px 26px',
      background: COLOR.fondo, color: COLOR.textoSuave,
      fontFamily: FUENTE.ui, fontSize: 19,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 20, textAlign: 'center',
    }}>
      <Simbolo lado={44} encendido={encendido} opacidad={encendido ? 1 : 0.5} />

      {titulo && (
        <div style={{
          font: `700 32px/1.15 ${FUENTE.ui}`, color: COLOR.texto, fontStyle: 'normal',
        }}>
          {titulo[0]}<br />{titulo[1]}<br />
          <span style={{ color: COLOR.dinero }}>{titulo[2]}</span>
        </div>
      )}

      {/* Ancho máximo: una frase de dos líneas centrada se lee; la misma
          frase a todo el ancho de una pantalla de computadora obliga a
          barrer la cabeza y deja de leerse. */}
      <div style={{ maxWidth: 330, lineHeight: 1.45 }}>{texto}</div>

      {accion && (
        <Pulsable al={accion.al} className="boton-principal" style={{ padding: '0 28px', fontStyle: 'normal' }}>
          {accion.texto}
        </Pulsable>
      )}

      {children}
    </div>
  )
}
