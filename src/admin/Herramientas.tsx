/* Herramientas sueltas del panel.
 *
 * No es un modulo de la especificacion: es donde viven las dos cosas que ya
 * existian en la pantalla de administracion anterior y siguen sirviendo. El
 * alta de creadoras se movera al Modulo 3 (Contenido) cuando exista; el
 * contenido de demostracion se borra completo antes de abrir al publico.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Almacenamiento from './Almacenamiento'
import { COLOR, LINEA, FUENTE } from '../lib/diseño'
import { sembrarDemo, borrarDemo } from '../lib/admin'
import { Boton, Confirmar } from './piezas'

export default function Herramientas() {
  const nav = useNavigate()
  const [dialogo, setDialogo] = useState<'sembrar' | 'borrar' | null>(null)
  const [aviso, setAviso] = useState('')

  return (
    <>
      {/* El espacio va arriba y a lo ancho: es lo primero que hay que mirar
          antes de subir nada, porque Supabase no avisa antes de llenarse. */}
      <div style={{ marginBottom: 28 }}>
        <Almacenamiento />
      </div>

      <div style={{ display: 'grid', gap: 14, maxWidth: 620 }}>
      <Tarjeta titulo="Alta de creadora"
        texto="Da de alta a una creadora, carga su expediente (identificación y consentimiento firmado) y publica sus primeros clips por ella. Sin expediente completo, la base rechaza la publicación."
        accion={<Boton tono="primario" al={() => nav('/alta-creadora')}>Abrir el alta</Boton>} />

      <Tarjeta titulo="Contenido de demostración"
        texto="Perfiles y clips falsos para que la aplicación no se vea vacía mientras se prueba. Todo queda marcado con es_demo, y hay que borrarlo antes de abrir al público."
        accion={<div style={{ display: 'flex', gap: 8 }}>
          <Boton al={() => setDialogo('sembrar')}>Sembrar</Boton>
          <Boton tono="peligro" al={() => setDialogo('borrar')}>Borrar todo</Boton>
        </div>} />

      {aviso && (
        <div style={{ padding: '10px 13px', border: `1px solid ${COLOR.dinero}`,
          color: COLOR.dinero, font: `400 12px/1.4 ${FUENTE.ui}` }}>{aviso}</div>
      )}

      {dialogo === 'sembrar' && (
        <Confirmar titulo="Sembrar contenido de demostración" tono="primario" etiqueta="Sembrar"
          cuerpo="Crea perfiles y clips falsos marcados como demo. No toca nada real."
          cancela={() => setDialogo(null)}
          al={async () => {
            const r = await sembrarDemo()
            setAviso(typeof r === 'string' ? r : 'Contenido de demostración creado.')
            setDialogo(null)
          }} />
      )}
      {dialogo === 'borrar' && (
        <Confirmar titulo="Borrar todo el contenido de demostración" etiqueta="Borrar"
          cuerpo="Elimina únicamente lo marcado como demo. El contenido real no se toca."
          cancela={() => setDialogo(null)}
          al={async () => {
            const r = await borrarDemo()
            setAviso(typeof r === 'string' ? r : 'Contenido de demostración borrado.')
            setDialogo(null)
          }} />
      )}
      </div>
    </>
  )
}

function Tarjeta({ titulo, texto, accion }: {
  titulo: string; texto: string; accion: React.ReactNode
}) {
  return (
    <div style={{ border: `1px solid ${LINEA.tenue}`, padding: '16px 18px' }}>
      <div style={{ font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 1.4,
        textTransform: 'uppercase', color: COLOR.texto }}>{titulo}</div>
      <div style={{ margin: '9px 0 14px', font: `400 12px/1.55 ${FUENTE.ui}`,
        color: COLOR.textoSuave }}>{texto}</div>
      {accion}
    </div>
  )
}
