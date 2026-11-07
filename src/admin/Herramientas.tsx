/* Herramientas sueltas del panel.
 *
 * No es un modulo de la especificacion: es donde viven las dos cosas que ya
 * existian en la pantalla de administracion anterior y siguen sirviendo. El
 * alta de creadoras se movera al Modulo 3 (Contenido) cuando exista; el
 * contenido de demostracion se borra completo antes de abrir al publico.
 */
import { cuantos } from '../lib/plural'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Almacenamiento from './Almacenamiento'
import AvatarAuto from './AvatarAuto'
import Albumes from './Albumes'
import { COLOR, LINEA, FUENTE } from '../lib/diseño'
import { sembrarDemo, borrarDemo, censurarPortadasAntiguas, type ResultadoCensura } from '../lib/admin'
import { Boton, Confirmar } from './piezas'

export default function Herramientas() {
  const nav = useNavigate()
  const [dialogo, setDialogo] = useState<'sembrar' | 'borrar' | 'censurar' | null>(null)
  const [censura, setCensura] = useState<{ hechas: number; total: number } | ResultadoCensura | null>(null)
  const [aviso, setAviso] = useState('')

  return (
    <>
      {/* El espacio va arriba y a lo ancho: es lo primero que hay que mirar
          antes de subir nada, porque Supabase no avisa antes de llenarse. */}
      <div style={{ marginBottom: 28 }}>
        <Almacenamiento />
      </div>

      <div style={{ display: 'grid', gap: 14, maxWidth: 620 }}>
      <Albumes />
      <Tarjeta titulo="Alta de creadora"
        texto="Da de alta a una creadora, carga su expediente (identificación y consentimiento firmado) y publica sus primeros clips por ella. Sin expediente completo, la base rechaza la publicación."
        accion={<Boton tono="primario" al={() => nav('/alta-creadora')}>Abrir el alta</Boton>} />

      <Tarjeta titulo="Censurar las portadas de antes"
        texto={censura === null
          ? 'Desde el 3 de noviembre cada portada sale a 32 px en público y nítida solo para quien compró. Pero 187 clips se publicaron antes y su portada pública mide 160 px: se ve todo. Esto las encoge igual que a las nuevas. Se puede repetir sin riesgo: lo que ya está a 32 px se salta.'
          : 'hechas' in censura
            ? `Revisando ${censura.hechas} de ${censura.total}…`
            : `Revisadas ${censura.revisadas}: ${cuantos(censura.encogidas, 'encogida')}, ${censura.yaEstaban} ya ${censura.yaEstaban === 1 ? 'estaba' : 'estaban'} a 32 px`
              + (censura.fallos.length ? ` · ${censura.fallos.length} fallaron: ${censura.fallos.slice(0, 3).join(' · ')}` : '')}
        accion={<Boton tono="primario" al={() => setDialogo('censurar')}
          activo={!(censura && 'hechas' in censura)}>Encoger las portadas viejas</Boton>} />

      <AvatarAuto />

      <Tarjeta titulo="Contenido de demostración"
        texto="Perfiles y clips falsos para que la aplicación no se vea vacía mientras se prueba. Todo queda marcado con es_demo, y hay que borrarlo antes de abrir al público."
        accion={<div style={{ display: 'flex', gap: 8 }}>
          <Boton al={() => setDialogo('sembrar')}>Sembrar</Boton>
          <Boton tono="peligro" al={() => setDialogo('borrar')}>Borrar todo</Boton>
        </div>} />

      {aviso && (
        <div style={{ padding: '10px 13px', border: `1px solid ${COLOR.dinero}`,
          color: COLOR.dinero, font: `400 12px/1.45 ${FUENTE.ui}` }}>{aviso}</div>
      )}

      {dialogo === 'censurar' && (
        <Confirmar titulo="Encoger las portadas viejas" tono="primario" etiqueta="Encoger"
          cuerpo={<>Por cada clip con la portada grande: se guarda esa copia en el bucket
            privado <b style={{ color: COLOR.texto }}>primero</b>, y solo después se
            sobrescribe la pública con una de 32 px. Quien compró sigue viendo la
            buena; el resto deja de ver nada. Tarda un minuto.</>}
          cancela={() => setDialogo(null)}
          al={async () => {
            setDialogo(null); setCensura({ hechas: 0, total: 0 })
            const r = await censurarPortadasAntiguas((h, t) => setCensura({ hechas: h, total: t }))
            setCensura(r)
          }} />
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
      <div style={{ font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 1.2,
        textTransform: 'uppercase', color: COLOR.texto }}>{titulo}</div>
      <div style={{ margin: '9px 0 14px', font: `400 12px/1.6 ${FUENTE.ui}`,
        color: COLOR.textoSuave }}>{texto}</div>
      {accion}
    </div>
  )
}
