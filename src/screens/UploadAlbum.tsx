// Pantalla 30 — Subir un álbum de fotos
//
// De 10 a 40 fotos por un precio fijo (los números salen de los ajustes del
// panel). Cada foto se limpia en este mismo navegador antes de subirse: se le
// quita la ubicación y los datos del celular. El álbum pasa por la misma
// revisión que un video.
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSesion } from '../lib/sesion'
import {
  configAlbumes, limpiarFoto, subirAlbum, TIPOS_ACEPTADOS,
  type ConfigAlbumes, type FotoLista, type Avance,
} from '../lib/albumes'
import { COLOR, LINEA, FUENTE, RADIO } from '../lib/diseño'
import { usd, usdYPesos } from '../lib/dinero'
import { useMoneda } from '../lib/moneda'
import { cuantos } from '../lib/plural'
import { perfilParaPublicar } from '../lib/trato'
import { Pulsable, Enlace } from '../components/Pulsable'
import Centro from '../components/Centro'
import SelectorSubida from '../components/SelectorSubida'
import { FONDO_CALABOZO } from '../lib/calabozo'

const etiqueta: React.CSSProperties = {
  font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 2, textTransform: 'uppercase', color: COLOR.textoSuave,
}
const campo: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', font: `400 16px/1.3 ${FUENTE.ui}`, padding: '15px',
}

type Estado = 'listo' | 'procesando' | 'subiendo' | 'hecho' | 'error'

export default function UploadAlbum() {
  const nav = useNavigate()
  const { sesion, perfil, trato, cargando } = useSesion()
  useMoneda()
  const refFotos = useRef<HTMLInputElement>(null)

  const [config, setConfig] = useState<ConfigAlbumes | null>(null)
  const [fotos, setFotos] = useState<FotoLista[]>([])
  const [titulo, setTitulo] = useState('')
  const [desc, setDesc] = useState('')
  const [estado, setEstado] = useState<Estado>('listo')
  const [aviso, setAviso] = useState('')
  const [avance, setAvance] = useState<Avance | null>(null)
  const [resultado, setResultado] = useState<{ id: string; publicado: boolean } | null>(null)

  useEffect(() => {
    if (cargando || !sesion) return
    let vivo = true
    configAlbumes().then(c => { if (vivo) setConfig(c) })
    return () => { vivo = false }
  }, [cargando, sesion])

  // Las vistas previas son URLs de objeto: hay que soltarlas al salir.
  const vistasRef = useRef<string[]>([])
  useEffect(() => { vistasRef.current = fotos.map(f => f.vista) }, [fotos])
  useEffect(() => () => { vistasRef.current.forEach(URL.revokeObjectURL) }, [])

  if (cargando || (sesion && !config)) return <Centro texto="Cargando…" />
  if (!sesion) return <Centro texto="Necesitas entrar para publicar." accion={{ texto: 'Entrar', al: () => nav('/acceso') }} />
  if (!perfil?.is_creator) return (
    <Centro texto={`Activa tu ${perfilParaPublicar(trato)} para poder publicar.`}
      accion={{ texto: 'Ir a mi perfil', al: () => nav('/perfil') }} />
  )
  if (!config?.activos) return (
    <Centro texto="Los álbumes de fotos todavía no están disponibles."
      accion={{ texto: 'Subir un video', al: () => nav('/upload') }} />
  )

  const { min, max, precio } = config
  const verificada = !!perfil.identidad_verificada
  const enRango = fotos.length >= min && fotos.length <= max
  const ocupado = estado === 'procesando' || estado === 'subiendo'
  const listo = verificada && enRango && titulo.trim().length > 0 && !ocupado && estado !== 'hecho'
  const gana = Math.round(precio * 0.8)

  const agregar = async (lista: FileList | null) => {
    if (!lista || !lista.length) return
    setAviso(''); setEstado('procesando')
    const disponibles = max - fotos.length
    const elegidas = Array.from(lista).slice(0, Math.max(0, disponibles))
    const nuevas: FotoLista[] = []
    let ilegibles = 0
    for (let i = 0; i < elegidas.length; i++) {
      setAvance({ paso: 'Quitando la ubicación y los datos del celular…', hechas: i, total: elegidas.length })
      const f = await limpiarFoto(elegidas[i])
      if (f) nuevas.push(f); else ilegibles++
    }
    setFotos(prev => [...prev, ...nuevas])
    setAvance(null); setEstado('listo')
    const avisos: string[] = []
    if (lista.length > disponibles) avisos.push(`Un álbum admite hasta ${cuantos(max, 'foto')}: sobraron ${lista.length - disponibles}.`)
    if (ilegibles) avisos.push(`No se pudo leer ${cuantos(ilegibles, 'foto')} (solo JPG, PNG o WebP de hasta 30 MB).`)
    setAviso(avisos.join(' '))
    if (refFotos.current) refFotos.current.value = ''
  }

  const quitar = (i: number) => setFotos(prev => {
    URL.revokeObjectURL(prev[i].vista)
    return prev.filter((_, k) => k !== i)
  })
  const hacerPortada = (i: number) => setFotos(prev => [prev[i], ...prev.filter((_, k) => k !== i)])

  const publicar = async () => {
    if (!listo || !sesion) return
    setEstado('subiendo'); setAviso('')
    const r = await subirAlbum({
      uid: sesion.user.id, titulo: titulo.trim(), descripcion: desc.trim(),
      fotos, precio, alAvanzar: setAvance,
    })
    setAvance(null)
    if ('error' in r) { setEstado('error'); setAviso(r.error); return }
    setResultado(r); setEstado('hecho')
  }

  if (estado === 'hecho' && resultado) return (
    <Centro
      texto={resultado.publicado
        ? 'Tu álbum ya está publicado.'
        : 'Tu álbum se envió. Pasa por revisión y se publica en cuanto lo aprueben.'}
      accion={{ texto: 'Ir al estudio', al: () => nav('/estudio') }} />
  )

  return (
    <div style={{
      minHeight: '100%', boxSizing: 'border-box', padding: '20px 18px 40px',
      background: FONDO_CALABOZO, color: COLOR.texto, fontFamily: FUENTE.ui,
      display: 'flex', flexDirection: 'column', gap: 18,
      width: '100%', maxWidth: 680, margin: '0 auto',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pulsable al={() => nav(-1)} rotulo="Volver" style={{
          width: 44, height: 44, borderRadius: '50%', display: 'grid', placeItems: 'center',
          border: '1px solid rgba(255,255,255,.22)', color: COLOR.texto, cursor: 'pointer',
        }}><span aria-hidden style={{ font: `400 22px/1 ${FUENTE.ui}` }}>&#8249;</span></Pulsable>
        <h1 style={{ ...etiqueta, margin: 0, color: COLOR.dinero }}>Nuevo álbum</h1>
        <span aria-hidden style={{ width: 44 }} />
      </div>

      {!verificada && (
        <div style={{ padding: '15px 16px', borderRadius: RADIO.filo, border: `1px solid ${COLOR.admin}` }}>
          <div style={{ font: `400 14px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
            Para subir y publicar, primero tenemos que{' '}
            <b style={{ color: COLOR.texto }}>verificar tu identidad y tu edad</b>.
          </div>
          <Enlace a="/verificar" className="boton-principal" style={{ marginTop: 14 }}>
            Verificar mi identidad
          </Enlace>
        </div>
      )}

      <SelectorSubida actual="fotos" />

      <div style={{ font: `400 14px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
        Un álbum son de <b style={{ color: COLOR.texto }}>{min} a {cuantos(max, 'foto')}</b> por un precio fijo.
      </div>

      {/* fotos */}
      <div>
        <input ref={refFotos} type="file" multiple accept={TIPOS_ACEPTADOS.join(',')}
          onChange={e => agregar(e.target.files)} style={{ display: 'none' }} aria-label="Elegir fotos" />
        <Pulsable al={() => refFotos.current?.click()} activo={!ocupado && fotos.length < max} style={{
          boxSizing: 'border-box', width: '100%', padding: '22px 18px', textAlign: 'center',
          cursor: 'pointer', borderRadius: RADIO.filo,
          border: `1.5px dashed ${enRango ? 'rgba(224,177,90,.6)' : LINEA.marcada}`,
        }}>
          <div style={{ ...etiqueta, color: enRango ? COLOR.dinero : COLOR.textoSuave }}>
            {fotos.length === 0 ? 'Elegir fotos' : 'Agregar más fotos'}
          </div>
          <div style={{ font: `400 15px/1.4 ${FUENTE.ui}`, color: COLOR.textoSuave, marginTop: 8 }}>
            JPG, PNG o WebP · {fotos.length} de {min}–{max}
            {fotos.length > 0 && !enRango && fotos.length < min && ` · faltan ${min - fotos.length}`}
          </div>
        </Pulsable>
        <div style={{ ...{ font: `400 12px/1.5 ${FUENTE.ui}`, color: COLOR.textoSuave }, marginTop: 8 }}>
          A cada foto le quitamos la ubicación y los datos de tu celular antes de subirla.
        </div>
      </div>

      {avance && (
        <div role="status" style={{ font: `400 13px/1.5 ${FUENTE.mono}`, color: COLOR.dinero }}>
          {avance.paso} {avance.hechas > 0 || estado === 'procesando' ? `${avance.hechas} de ${avance.total}` : ''}
          {/* Barra global: las fotos son chicas (≤10 MB) y no usan TUS; avanza por foto. */}
          <div role="progressbar" aria-label={avance.paso} aria-valuemin={0} aria-valuemax={Math.max(1, avance.total)}
            aria-valuenow={Math.min(avance.hechas, Math.max(1, avance.total))}
            style={{ marginTop: 8, height: 8, borderRadius: 999, overflow: 'hidden', background: 'rgba(255,255,255,.1)' }}>
            <div style={{ height: '100%', background: COLOR.dinero, transition: 'width .25s linear',
              width: `${Math.round((Math.min(avance.hechas, avance.total) / Math.max(1, avance.total)) * 100)}%` }} />
          </div>
        </div>
      )}

      {fotos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 8 }}>
          {fotos.map((f, i) => (
            <div key={f.vista} style={{
              position: 'relative', aspectRatio: '1 / 1', borderRadius: 8, overflow: 'hidden',
              border: `1.5px solid ${i === 0 ? COLOR.dinero : LINEA.suave}`, background: COLOR.superficie,
            }}>
              <img src={f.vista} alt={`Foto ${i + 1}`} draggable={false}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              {i === 0 && (
                <span style={{ position: 'absolute', left: 4, bottom: 4, padding: '3px 6px', borderRadius: 4,
                  background: 'rgba(14,21,32,.8)', color: COLOR.dinero, font: `700 10px/1 ${FUENTE.ui}`,
                  letterSpacing: 1, textTransform: 'uppercase' }}>Portada</span>
              )}
              <Pulsable al={() => quitar(i)} activo={!ocupado} rotulo={`Quitar la foto ${i + 1}`} style={{
                position: 'absolute', top: 2, right: 2, width: 32, height: 32, borderRadius: '50%',
                display: 'grid', placeItems: 'center', background: 'rgba(14,21,32,.8)', color: COLOR.texto,
                cursor: 'pointer', font: `700 16px/1 ${FUENTE.ui}`,
              }}>×</Pulsable>
              {i > 0 && (
                <Pulsable al={() => hacerPortada(i)} activo={!ocupado} rotulo={`Hacer portada la foto ${i + 1}`} style={{
                  position: 'absolute', top: 2, left: 2, width: 32, height: 32, borderRadius: '50%',
                  display: 'grid', placeItems: 'center', background: 'rgba(14,21,32,.8)', color: COLOR.dinero,
                  cursor: 'pointer', font: `400 15px/1 ${FUENTE.ui}`,
                }}>★</Pulsable>
              )}
            </div>
          ))}
        </div>
      )}

      {aviso && (
        <div role="alert" style={{ font: `400 13px/1.5 ${FUENTE.ui}`, color: estado === 'error' ? COLOR.acento : COLOR.textoSuave }}>
          {aviso}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label htmlFor="album-titulo" style={etiqueta}>Título</label>
        <input id="album-titulo" value={titulo} onChange={e => setTitulo(e.target.value)} maxLength={90}
          className="campo-sobrio" placeholder="Cómo se llama este álbum" style={campo} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label htmlFor="album-desc" style={etiqueta}>Descripción</label>
        <textarea id="album-desc" value={desc} onChange={e => setDesc(e.target.value)} rows={3} maxLength={600}
          className="campo-sobrio" placeholder="Qué van a ver"
          style={{ ...campo, resize: 'vertical', fontFamily: FUENTE.ui }} />
      </div>

      <div style={{ padding: '14px 16px', borderRadius: RADIO.filo, border: `1px solid ${LINEA.suave}` }}>
        <div style={etiqueta}>Precio fijo</div>
        <div style={{ font: `700 28px/1 ${FUENTE.mono}`, color: COLOR.dinero, marginTop: 10 }}>{usd(precio)}</div>
        <div style={{ font: `400 12px/1.5 ${FUENTE.ui}`, color: COLOR.textoSuave, marginTop: 8 }}>
          plataforma 20% · <span style={{ color: COLOR.texto }}>tú recibes {usdYPesos(gana)}</span> por cada venta
        </div>
      </div>

      <Pulsable al={publicar} activo={listo} className="boton-principal" style={{ width: '100%', marginTop: 'auto' }}>
        {estado === 'subiendo' ? (avance?.paso ?? 'Subiendo…') : 'Publicar álbum'}
      </Pulsable>
    </div>
  )
}
