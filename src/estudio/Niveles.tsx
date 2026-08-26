/* Niveles de suscripcion. */
import { useEffect, useState } from 'react'
import { COLOR, LINEA, FUENTE } from '../lib/diseño'
import { misNiveles, crearNivel, borrarNivel, type Nivel } from '../lib/canales'
import { Marco, Boton, Campo, Etiqueta, Aviso, Vacio } from './piezas'

export default function Niveles() {
  const [lista, setLista] = useState<Nivel[]>([])
  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState('')
  const [desc, setDesc] = useState('')
  const [error, setError] = useState('')
  const [creando, setCreando] = useState(false)
  const [cargando, setCargando] = useState(true)

  const cargar = () => misNiveles().then(l => { setLista(l); setCargando(false) })
  useEffect(() => { cargar() }, [])

  const n = parseInt(precio || '0', 10)

  return (
    <Marco titulo="Suscripción mensual">
      <div style={{ font: `400 14px/1.65 ${FUENTE.ui}`, color: COLOR.textoSuave, marginBottom: 22 }}>
        Quien se suscriba paga una vez y tiene 30 días de acceso a todo lo que marques
        como <b style={{ color: COLOR.texto }}>solo para suscriptoras</b>. Te queda el 80%.
      </div>

      <Aviso texto={error} />

      {cargando ? null : lista.length === 0 && !creando ? (
        <Vacio texto="Todavía no tienes ningún nivel. Sin uno, nadie puede suscribirse." />
      ) : (
        <div style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
          {lista.map(t => (
            <div key={t.id} style={{
              padding: '14px 15px', border: `1px solid ${LINEA.tenue}`,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ font: `400 16px/1.25 ${FUENTE.ui}` }}>{t.nombre}</div>
                {t.descripcion && (
                  <div style={{ marginTop: 5, font: `400 13px/1.5 ${FUENTE.ui}`,
                    color: COLOR.textoTenue }}>{t.descripcion}</div>
                )}
              </div>
              <div style={{ font: `400 18px/1 ${FUENTE.mono}`, color: COLOR.dinero }}>
                {t.precio_coins} ⨯
              </div>
              <span onClick={async () => {
                const m = await borrarNivel(t.id); if (m) setError(m); else cargar()
              }} style={{ font: `400 20px/1 ${FUENTE.ui}`, color: COLOR.textoApagado,
                cursor: 'pointer', padding: '0 4px' }}>×</span>
            </div>
          ))}
        </div>
      )}

      {creando ? (
        <div style={{ border: `1px solid ${LINEA.suave}`, padding: 16 }}>
          <Etiqueta texto="Nombre del nivel" />
          <Campo valor={nombre} cambia={setNombre} marcador="Básico" />
          <div style={{ height: 14 }} />
          <Etiqueta texto="Precio al mes, en coins" />
          <Campo tipo="number" valor={precio} cambia={setPrecio} marcador="300" />
          <div style={{ marginTop: 6, font: `400 12px/1.5 ${FUENTE.mono}`, color: COLOR.textoApagado }}>
            {n > 0 && <>Te quedan {n - Math.round(n * 0.2)} ⨯ de cada suscripción</>}
          </div>
          <div style={{ height: 14 }} />
          <Etiqueta texto="Qué incluye (opcional)" />
          <Campo valor={desc} cambia={setDesc} filas={3}
            marcador="Todo lo que suba, más responder tus mensajes" />
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <Boton tono="primario" activo={!!nombre.trim() && n > 0} al={async () => {
              const r = await crearNivel(nombre.trim(), n, desc.trim() || undefined, lista.length)
              if ('error' in r) { setError(r.error!); return }
              setNombre(''); setPrecio(''); setDesc(''); setCreando(false); setError('')
              cargar()
            }}>Crear nivel</Boton>
            <Boton al={() => setCreando(false)}>Cancelar</Boton>
          </div>
        </div>
      ) : (
        <Boton tono="primario" al={() => setCreando(true)}>
          {lista.length ? 'Otro nivel' : 'Crear mi primer nivel'}
        </Boton>
      )}
    </Marco>
  )
}
