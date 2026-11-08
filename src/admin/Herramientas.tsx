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
import {
  sembrarDemo, borrarDemo, censurarPortadasAntiguas, nitidizarPortadasPublicas,
  type ResultadoCensura, type ResultadoNitidez,
} from '../lib/admin'
import { ANCHO_PUBLICO } from '../lib/miniatura'
import { Boton, Confirmar } from './piezas'

export default function Herramientas() {
  const nav = useNavigate()
  const [dialogo, setDialogo] = useState<'sembrar' | 'borrar' | 'censurar' | 'nitidizar' | null>(null)
  const [censura, setCensura] = useState<{ hechas: number; total: number } | ResultadoCensura | null>(null)
  const [nitidez, setNitidez] = useState<{ hechas: number; total: number } | ResultadoNitidez | null>(null)
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

      <Tarjeta titulo="Portadas públicas más nítidas"
        texto={nitidez === null
          ? `La portada pública salía a 32 px y se veía rota en el catálogo; ahora sale a ${ANCHO_PUBLICO} px. Esto arregla las que ya existían: la vuelve a sacar de la copia nítida privada, en la misma ruta. Las que no tienen copia nítida se omiten (no se agranda la chica). Se puede repetir sin riesgo: lo que ya está al ancho que le toca se salta.`
          : 'hechas' in nitidez
            ? `Revisando ${nitidez.hechas} de ${nitidez.total}…`
            : `Revisadas ${nitidez.revisadas}: ${cuantos(nitidez.regeneradas, 'regenerada')}, ${nitidez.yaEstaban} ya ${nitidez.yaEstaban === 1 ? 'estaba' : 'estaban'} bien, ${cuantos(nitidez.omitidas, 'omitida')} (sin copia nítida)`
              + (nitidez.fallos.length ? ` · ${cuantos(nitidez.fallos.length, 'error', 'errores')}: ${nitidez.fallos.slice(0, 3).join(' · ')}` : '')}
        accion={<Boton tono="primario" al={() => setDialogo('nitidizar')}
          activo={!(nitidez && 'hechas' in nitidez)}>Regenerar las portadas públicas</Boton>} />

      <Tarjeta titulo="Encoger portadas públicas demasiado grandes"
        texto={censura === null
          ? `Si alguna portada pública mide más de ${ANCHO_PUBLICO} px, la encoge a ${ANCHO_PUBLICO} px y guarda antes esa copia en el bucket privado. Fue la herramienta del 3 de noviembre, cuando se encogieron 187 clips; hoy normalmente no encuentra nada. Se puede repetir sin riesgo.`
          : 'hechas' in censura
            ? `Revisando ${censura.hechas} de ${censura.total}…`
            : `Revisadas ${censura.revisadas}: ${cuantos(censura.encogidas, 'encogida')}, ${censura.yaEstaban} ya ${censura.yaEstaban === 1 ? 'estaba' : 'estaban'} a ${ANCHO_PUBLICO} px o menos`
              + (censura.fallos.length ? ` · ${censura.fallos.length} fallaron: ${censura.fallos.slice(0, 3).join(' · ')}` : '')}
        accion={<Boton al={() => setDialogo('censurar')}
          activo={!(censura && 'hechas' in censura)}>Encoger las portadas grandes</Boton>} />

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

      {dialogo === 'nitidizar' && (
        <Confirmar titulo="Regenerar las portadas públicas" tono="primario" etiqueta="Regenerar"
          cuerpo={<>Por cada clip con portada: se baja la copia <b style={{ color: COLOR.texto }}>nítida
            privada</b> y se reescribe la pública, misma ruta, a {ANCHO_PUBLICO} px como máximo
            (nunca más grande que la nítida). La nítida no sale del bucket privado. Sin copia
            nítida no se toca nada. Quien ya ve la portada puede tardar hasta una hora en
            ver el cambio por la memoria del navegador. Tarda unos minutos.</>}
          cancela={() => setDialogo(null)}
          al={async () => {
            setDialogo(null); setNitidez({ hechas: 0, total: 0 })
            const r = await nitidizarPortadasPublicas((h, t) => setNitidez({ hechas: h, total: t }))
            setNitidez(r)
          }} />
      )}
      {dialogo === 'censurar' && (
        <Confirmar titulo="Encoger las portadas grandes" tono="primario" etiqueta="Encoger"
          cuerpo={<>Por cada clip con la portada pública mayor que {ANCHO_PUBLICO} px: se guarda esa copia en
            el bucket privado <b style={{ color: COLOR.texto }}>primero</b>, y solo después se
            sobrescribe la pública con una de {ANCHO_PUBLICO} px. Quien compró sigue viendo la
            buena. Tarda un minuto.</>}
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
            // `sembrarDemo` devuelve `{ error }` o el resultado, no un texto: antes se
            // comprobaba `typeof r === 'string'` y un error decia «creado».
            setAviso('error' in r
              ? `No se pudo crear el contenido de demostración: ${r.error}`
              : `Contenido de demostración creado (${cuantos(r.perfiles, 'perfil', 'perfiles')} y ${cuantos(r.clips, 'clip')}).`)
            setDialogo(null)
          }} />
      )}
      {dialogo === 'borrar' && (
        <Confirmar titulo="Borrar todo el contenido de demostración" etiqueta="Borrar"
          cuerpo="Elimina únicamente lo marcado como demo. El contenido real no se toca."
          cancela={() => setDialogo(null)}
          al={async () => {
            const r = await borrarDemo()
            setAviso('error' in r
              ? `No se pudo borrar el contenido de demostración: ${r.error}`
              : `Contenido de demostración borrado (${cuantos(r.borrados, 'registro')}).`)
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
