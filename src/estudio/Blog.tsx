/* Blog de la creadora. */
import { useEffect, useState } from 'react'
import { COLOR, LINEA, FUENTE } from '../lib/diseño'
import { useSesion } from '../lib/sesion'
import { postsDe, guardarPost, borrarPost, type Post } from '../lib/canales'
import { Marco, Boton, Campo, Etiqueta, Aviso, Vacio } from './piezas'

export default function Blog() {
  const { sesion } = useSesion()
  const [lista, setLista] = useState<Post[]>([])
  const [editando, setEditando] = useState<Post | 'nuevo' | null>(null)
  const [titulo, setTitulo] = useState('')
  const [cuerpo, setCuerpo] = useState('')
  const [soloSubs, setSoloSubs] = useState(false)
  const [error, setError] = useState('')

  const cargar = () => { if (sesion) postsDe(sesion.user.id).then(setLista) }
  useEffect(() => { cargar() }, [sesion])

  const abrir = (p: Post | 'nuevo') => {
    setEditando(p)
    setTitulo(p === 'nuevo' ? '' : p.titulo)
    setCuerpo(p === 'nuevo' ? '' : p.cuerpo)
    setSoloSubs(p !== 'nuevo' && p.visibilidad === 'suscriptores')
    setError('')
  }

  if (editando) {
    return (
      <Marco titulo="Escribir" volverA="/estudio/blog">
        <Aviso texto={error} />
        <Etiqueta texto="Título" />
        <Campo valor={titulo} cambia={setTitulo} marcador="De qué va" />
        <div style={{ height: 16 }} />
        <Etiqueta texto="Texto" />
        <Campo valor={cuerpo} cambia={setCuerpo} filas={12} marcador="Escribe aquí" />

        <div onClick={() => setSoloSubs(!soloSubs)} style={{
          marginTop: 16, padding: '12px 14px', cursor: 'pointer',
          border: `1px solid ${soloSubs ? COLOR.acento : LINEA.tenue}`,
          background: soloSubs ? 'rgba(255,43,209,.06)' : 'transparent',
        }}>
          <div style={{ font: `400 14px/1.3 ${FUENTE.ui}`,
            color: soloSubs ? COLOR.texto : COLOR.textoSuave }}>
            {soloSubs ? 'Solo para suscriptoras' : 'Público'}
          </div>
          <div style={{ marginTop: 5, font: `400 12px/1.5 ${FUENTE.ui}`, color: COLOR.textoTenue }}>
            {soloSubs
              ? 'Quien no esté suscrita ve el título y las primeras líneas, nada más.'
              : 'Lo puede leer cualquiera. Toca para hacerlo de suscriptoras.'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
          <Boton tono="primario" activo={!!titulo.trim() && !!cuerpo.trim()} al={async () => {
            const r = await guardarPost(titulo.trim(), cuerpo.trim(),
              soloSubs ? 'suscriptores' : 'publico', true,
              editando === 'nuevo' ? undefined : editando.id)
            if ('error' in r) { setError(r.error!); return }
            setEditando(null); cargar()
          }}>Publicar</Boton>
          <Boton al={() => setEditando(null)}>Cancelar</Boton>
          {editando !== 'nuevo' && (
            <Boton tono="peligro" al={async () => {
              await borrarPost(editando.id); setEditando(null); cargar()
            }}>Borrar</Boton>
          )}
        </div>
      </Marco>
    )
  }

  return (
    <Marco titulo="Blog">
      <div style={{ font: `400 14px/1.65 ${FUENTE.ui}`, color: COLOR.textoSuave, marginBottom: 20 }}>
        Texto, no video. Sirve para contar cosas entre publicaciones y para dar algo
        a quien te paga la suscripción sin tener que grabar.
      </div>

      {lista.length === 0 ? (
        <Vacio texto="Todavía no has escrito nada." />
      ) : (
        <div style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
          {lista.map(p => (
            <div key={p.id} onClick={() => abrir(p)} style={{
              padding: '14px 15px', border: `1px solid ${LINEA.tenue}`, cursor: 'pointer',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ font: `400 16px/1.25 ${FUENTE.ui}` }}>{p.titulo}</span>
                {p.visibilidad === 'suscriptores' && (
                  <span style={{ font: `700 8px/1.6 ${FUENTE.ui}`, letterSpacing: 1,
                    textTransform: 'uppercase', color: COLOR.acento, whiteSpace: 'nowrap' }}>
                    Suscriptoras
                  </span>
                )}
              </div>
              <div style={{ marginTop: 6, font: `400 13px/1.5 ${FUENTE.ui}`,
                color: COLOR.textoTenue, overflow: 'hidden', textOverflow: 'ellipsis',
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {p.cuerpo}
              </div>
            </div>
          ))}
        </div>
      )}

      <Boton tono="primario" al={() => abrir('nuevo')}>Escribir algo</Boton>
    </Marco>
  )
}
