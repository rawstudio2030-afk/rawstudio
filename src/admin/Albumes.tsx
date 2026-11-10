/* Albumes de fotos: el interruptor del lanzamiento y su mantenimiento.
 *
 * ENCENDER abre los albumes a TODAS las creadoras con la identidad verificada: no hay
 * lista de habilitadas. Por eso pide confirmacion con lo que conviene haber hecho
 * antes. APAGAR no borra nada: los albumes que ya existen siguen igual, solo nadie
 * puede crear otro.
 *
 * Precio, minimo y maximo se guardan en los ajustes y se aplican a los albumes NUEVOS
 * (el precio de uno ya creado no se mueve).
 */
import { useCallback, useEffect, useState } from 'react'
import { cuantos } from '../lib/plural'
import { COLOR, LINEA, FUENTE } from '../lib/diseño'
import { usd, aCentavos } from '../lib/dinero'
import {
  ajustesAlbumes, fijarAlbumesActivos, fijarAjusteAlbum, resumenAlbumes,
  albumesAbandonados, limpiarAlbumesAbandonados,
  type AjustesAlbumes, type ResumenAlbumes, type AlbumAbandonado,
} from '../lib/admin'
import { Boton, Confirmar, Campo, Etiquetado } from './piezas'

export default function Albumes() {
  const [aj, setAj] = useState<AjustesAlbumes | null>(null)
  const [res, setRes] = useState<ResumenAlbumes | null>(null)
  const [aband, setAband] = useState<AlbumAbandonado[]>([])
  const [precio, setPrecio] = useState('')
  const [min, setMin] = useState('')
  const [max, setMax] = useState('')
  const [dialogo, setDialogo] = useState<'encender' | 'apagar' | null>(null)
  const [aviso, setAviso] = useState('')
  const [error, setError] = useState('')
  const [ocupado, setOcupado] = useState(false)

  const cargar = useCallback(async () => {
    const a = await ajustesAlbumes()
    setAj(a)
    if (a) { setPrecio((a.precio / 100).toFixed(2)); setMin(String(a.min)); setMax(String(a.max)) }
    setRes(await resumenAlbumes())
    setAband(await albumesAbandonados())
  }, [])
  useEffect(() => { cargar() }, [cargar])

  if (!aj) return null

  const nPrecio = aCentavos(precio)
  const nMin = Number(min), nMax = Number(max)
  const valido = nPrecio !== null && nPrecio >= 100 && Number.isInteger(nMin) && Number.isInteger(nMax)
    && nMin >= 1 && nMax >= nMin && nMax <= 100
  const cambio = valido && (nPrecio !== aj.precio || nMin !== aj.min || nMax !== aj.max)

  const guardar = async () => {
    if (!valido || nPrecio === null) return
    setOcupado(true); setError(''); setAviso('')
    for (const [clave, valor] of [
      ['album_precio_coins', nPrecio], ['album_min_fotos', nMin], ['album_max_fotos', nMax],
    ] as const) {
      const m = await fijarAjusteAlbum(clave, valor)
      if (m) { setError(m); setOcupado(false); return }
    }
    setAviso('Guardado. Se aplica a los álbumes nuevos.'); setOcupado(false); await cargar()
  }

  const cambiarInterruptor = async (valor: boolean) => {
    const m = await fijarAlbumesActivos(valor)
    if (m) { setError(m); return }
    setError(''); setAviso(valor ? 'Álbumes encendidos para todas las creadoras.' : 'Álbumes apagados.')
    setDialogo(null); await cargar()
  }

  const limpiar = async () => {
    setOcupado(true); setError(''); setAviso('')
    const r = await limpiarAlbumesAbandonados(aband)
    setAviso(`Limpiados ${r.limpios} de ${aband.length}.` + (r.fallos.length ? ` Fallaron: ${r.fallos.join(' · ')}` : ''))
    setOcupado(false); await cargar()
  }

  return (
    <div style={{ border: `1px solid ${aj.activos ? COLOR.dinero : LINEA.tenue}`, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 1.2, textTransform: 'uppercase',
            color: aj.activos ? COLOR.dinero : COLOR.texto }}>
            Álbumes de fotos · {aj.activos ? 'encendidos' : 'apagados'}
          </div>
          <div style={{ marginTop: 8, font: `400 12px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
            {aj.activos
              ? 'Toda creadora con la identidad verificada puede subir álbumes. Apagarlos no borra los que ya existen.'
              : 'Nadie puede crear un álbum todavía. Al encenderlos se abren a TODAS las creadoras verificadas.'}
          </div>
        </div>
        <Boton tono={aj.activos ? 'normal' : 'primario'} al={() => setDialogo(aj.activos ? 'apagar' : 'encender')}>
          {aj.activos ? 'Apagar' : 'Encender'}
        </Boton>
      </div>

      {res && (
        <div style={{ marginTop: 14, font: `400 12px/1.6 ${FUENTE.mono}`, color: COLOR.textoSuave }}>
          {cuantos(res.total, 'álbum', 'álbumes')} · {res.publicados} publicados · {res.en_revision} en revisión
          · {res.subiendo} subiéndose{res.abandonados > 0 && <span style={{ color: COLOR.aviso }}> · {res.abandonados} abandonados</span>}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 16 }}>
        <Etiquetado texto="Precio fijo (USD)" ancho={130} hijo={<Campo valor={precio} cambia={setPrecio} mono marcador="5.00" />} />
        <Etiquetado texto="Mínimo de fotos" ancho={120} hijo={<Campo valor={min} cambia={setMin} mono marcador="10" />} />
        <Etiquetado texto="Máximo de fotos" ancho={120} hijo={<Campo valor={max} cambia={setMax} mono marcador="40" />} />
        <Boton tono="primario" activo={cambio && !ocupado} al={guardar}>Guardar</Boton>
      </div>
      <div style={{ marginTop: 8, font: `400 11px/1.6 ${FUENTE.ui}`, color: valido ? COLOR.textoSuave : COLOR.error }}>
        {valido
          ? `Hoy: ${usd(aj.precio)} por álbum · de ${aj.min} a ${cuantos(aj.max, 'foto')}. El precio nuevo no mueve los álbumes ya creados.`
          : 'Precio de al menos $1.00, mínimo de 1 o más y máximo entre el mínimo y 100.'}
      </div>

      {aband.length > 0 && (
        <div style={{ marginTop: 16, padding: '12px 14px', border: `1px solid ${COLOR.aviso}` }}>
          <div style={{ font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 1.2, textTransform: 'uppercase', color: COLOR.aviso }}>
            {cuantos(aband.length, 'álbum abandonado', 'álbumes abandonados')}
          </div>
          <div style={{ margin: '8px 0 12px', font: `400 11px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
            Se empezaron a subir hace más de 3 días y nunca se completaron. Nadie los ve, pero ocupan espacio
            (fotos sueltas incluidas). Limpiarlos los borra y purga sus archivos al momento.
            {' '}{aband.map(a => `«${a.titulo}» de @${a.creadora_handle}`).join(' · ')}
          </div>
          <Boton tono="peligro" activo={!ocupado} al={limpiar}>Limpiar los {aband.length}</Boton>
        </div>
      )}

      {aviso && <div style={{ marginTop: 12, font: `400 12px/1.5 ${FUENTE.ui}`, color: COLOR.dinero }}>{aviso}</div>}
      {error && <div style={{ marginTop: 12, font: `400 12px/1.5 ${FUENTE.ui}`, color: COLOR.error }}>{error}</div>}

      {dialogo === 'encender' && (
        <Confirmar titulo="Encender los álbumes para todas" tono="primario" etiqueta="Encender"
          cuerpo={<>Desde este momento <b style={{ color: COLOR.texto }}>toda creadora con la identidad verificada</b> puede
            subir álbumes de {aj.min} a {cuantos(aj.max, 'foto')} a {usd(aj.precio)}. Cada álbum pasa por la misma revisión que un video.
            Antes de encender, conviene haber hecho una prueba real de punta a punta (subir, revisar, comprar y ver un álbum con
            tus propias cuentas) y haber revisado que los términos y el aviso de privacidad cubran las fotos.
            Se puede apagar en cualquier momento.</>}
          cancela={() => setDialogo(null)}
          al={() => cambiarInterruptor(true)} />
      )}
      {dialogo === 'apagar' && (
        <Confirmar titulo="Apagar los álbumes" tono="peligro" etiqueta="Apagar"
          cuerpo={<>Nadie podrá crear álbumes nuevos. Los que ya existen se siguen viendo, vendiendo y moderando igual;
            los que estén a medias de subir no se podrán completar mientras estén apagados.</>}
          cancela={() => setDialogo(null)}
          al={() => cambiarInterruptor(false)} />
      )}
    </div>
  )
}
