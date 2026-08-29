/* Cuanto espacio queda.
 *
 * Existe porque Supabase NO avisa antes de llegar al limite: la subida
 * simplemente falla cuando ya no cabe. Con archivos de 20 MB eso significa
 * enterarse despues de haber esperado la transferencia entera, y sin saber por
 * que. Un medidor a la vista evita esa sorpresa.
 */
import { useCallback, useEffect, useState } from 'react'
import { COLOR, LINEA, FUENTE } from '../lib/diseño'
import {
  usoAlmacenamiento, usoPorCreadora, fijarLimiteAlmacenamiento, tamano,
  type UsoBucket,
} from '../lib/admin'
import { Boton, Campo, Etiquetado } from './piezas'

const NOMBRE: Record<string, string> = {
  clips: 'Videos', 'clip-covers': 'Portadas y vistas previas',
  avatars: 'Fotos de perfil', verificacion: 'Verificación de identidad',
  expedientes: 'Expedientes',
}

export default function Almacenamiento() {
  const [filas, setFilas] = useState<UsoBucket[]>([])
  const [porCreadora, setPorCreadora] = useState<
    { id: string; handle: string; nombre: string; clips: number; bytes: number }[]>([])
  const [error, setError] = useState('')
  const [editando, setEditando] = useState(false)
  const [limite, setLimite] = useState('')

  const cargar = useCallback(async () => {
    const r = await usoAlmacenamiento()
    setFilas(r.filas); setError(r.error)
    setPorCreadora(await usoPorCreadora())
  }, [])
  useEffect(() => { cargar() }, [cargar])

  const total = filas[0]?.total_bytes ?? 0
  const base = filas[0]?.base_bytes ?? 0
  const limiteMb = filas[0]?.limite_mb ?? 1024
  const limiteBytes = limiteMb * 1048576
  const pct = limiteBytes ? Math.min(100, (total / limiteBytes) * 100) : 0
  const pasado = total > limiteBytes
  const cerca = pct >= 80

  const color = pasado ? '#FF4444' : cerca ? '#FFB020' : COLOR.dinero

  // Cuanto cabe todavia, en videos del tamaño medio de los que ya hay.
  const medio = filas.find(f => f.bucket === 'clips')
  const tamMedio = medio && medio.archivos ? medio.bytes / medio.archivos : 0
  const caben = tamMedio > 0 ? Math.max(0, Math.floor((limiteBytes - total) / tamMedio)) : null

  return (
    <>
      <div style={{ marginBottom: 16, padding: '12px 14px', border: `1px solid ${LINEA.tenue}`,
        font: `400 11px/1.6 ${FUENTE.ui}`, color: COLOR.textoTenue }}>
        Supabase <b style={{ color: COLOR.texto }}>no avisa antes</b> de llegar al límite: la
        subida falla cuando ya no cabe, después de haber transferido el archivo entero. Este
        medidor está para que no te tome por sorpresa.
      </div>

      {error && (
        <div style={{ marginBottom: 14, padding: '10px 13px', border: '1px solid #FF4444',
          color: '#FF4444', font: `400 12px/1.4 ${FUENTE.ui}` }}>{error}</div>
      )}

      {/* ---- El medidor ---- */}
      <div style={{ border: `1px solid ${pasado || cerca ? color : LINEA.tenue}`,
        padding: '16px 18px', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ font: `400 30px/1 ${FUENTE.mono}`, color }}>{tamano(total)}</span>
          <span style={{ font: `400 14px/1 ${FUENTE.mono}`, color: COLOR.textoTenue }}>
            de {tamano(limiteBytes)}
          </span>
          <div style={{ flex: 1 }} />
          {editando ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <Etiquetado texto="MB de tu plan" hijo={
                <Campo tipo="number" valor={limite} cambia={setLimite} mono autoFoco />
              } />
              <Boton tono="primario" activo={parseInt(limite || '0', 10) > 0} al={async () => {
                const m = await fijarLimiteAlmacenamiento(parseInt(limite, 10))
                if (m) setError(m); else { setEditando(false); await cargar() }
              }}>Guardar</Boton>
              <Boton al={() => setEditando(false)}>Cancelar</Boton>
            </div>
          ) : (
            <Boton al={() => { setLimite(String(limiteMb)); setEditando(true) }}>
              Cambiar el límite
            </Boton>
          )}
        </div>

        <div style={{ marginTop: 14, height: 10, background: COLOR.superficieAlta }}>
          <div style={{ width: `${pct}%`, height: '100%', background: color,
            transition: 'width .3s' }} />
        </div>

        <div style={{ marginTop: 10, font: `400 12px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
          {pasado ? (
            <><b style={{ color: '#FF4444' }}>Ya pasaste el límite que configuraste.</b> Si es
            el real de tu plan, las subidas nuevas están fallando. Sube de plan o libera
            espacio purgando lo borrado.</>
          ) : cerca ? (
            <><b style={{ color: '#FFB020' }}>Te queda poco: {tamano(limiteBytes - total)}.</b>
            {caben !== null && <> Caben unos {caben} videos más del tamaño medio de los tuyos.</>}</>
          ) : (
            <>Te quedan {tamano(limiteBytes - total)}.
            {caben !== null && <> Unos {caben} videos más del tamaño medio de los tuyos.</>}</>
          )}
        </div>

        <div style={{ marginTop: 8, font: `400 11px/1.5 ${FUENTE.mono}`, color: COLOR.textoApagado }}>
          El límite no se adivina: depende de tu plan. Gratuito 1024 MB · Pro 102400 MB.
          Cambiarlo aquí no cambia tu plan, solo cuándo te avisa.
        </div>
      </div>

      {/* ---- Por bucket ---- */}
      <div style={{ border: `1px solid ${LINEA.tenue}`, marginBottom: 20 }}>
        {filas.map((f, i) => (
          <div key={f.bucket} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '11px 15px',
            borderBottom: i < filas.length - 1 ? `1px solid ${LINEA.tenue}` : 'none',
          }}>
            <span style={{ flex: 1, font: `400 13px/1 ${FUENTE.ui}` }}>
              {NOMBRE[f.bucket] ?? f.bucket}
            </span>
            <span style={{ font: `400 11px/1 ${FUENTE.mono}`, color: COLOR.textoApagado }}>
              {f.archivos} archivos
            </span>
            <span style={{ width: 90, textAlign: 'right',
              font: `400 14px/1 ${FUENTE.mono}`,
              color: f.bucket === 'clips' ? COLOR.dinero : COLOR.textoSuave }}>
              {tamano(f.bytes)}
            </span>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 12, padding: '11px 15px',
          borderTop: `1px solid ${LINEA.suave}` }}>
          <span style={{ flex: 1, font: `400 12px/1 ${FUENTE.ui}`, color: COLOR.textoTenue }}>
            Base de datos (aparte del almacenamiento)
          </span>
          <span style={{ font: `400 13px/1 ${FUENTE.mono}`, color: COLOR.textoTenue }}>
            {tamano(base)}
          </span>
        </div>
      </div>

      {/* ---- Quien ocupa mas ---- */}
      {porCreadora.length > 0 && (
        <>
          <div style={{ margin: '0 0 10px', font: `700 10px/1 ${FUENTE.ui}`,
            letterSpacing: 1.4, textTransform: 'uppercase', color: COLOR.textoTenue }}>
            Quién ocupa más
          </div>
          <div style={{ border: `1px solid ${LINEA.tenue}` }}>
            {porCreadora.map((c, i) => (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '9px 15px',
                borderBottom: i < porCreadora.length - 1 ? `1px solid ${LINEA.tenue}` : 'none',
              }}>
                <span style={{ width: 26, font: `400 11px/1 ${FUENTE.mono}`,
                  color: COLOR.textoApagado }}>{i + 1}</span>
                <span style={{ flex: 1, font: `400 13px/1 ${FUENTE.ui}` }}>
                  {c.nombre} <span style={{ color: COLOR.textoTenue,
                    font: `400 11px/1 ${FUENTE.mono}` }}>@{c.handle}</span>
                </span>
                <span style={{ font: `400 11px/1 ${FUENTE.mono}`, color: COLOR.textoApagado }}>
                  {c.clips} clips
                </span>
                <span style={{ width: 80, textAlign: 'right',
                  font: `400 13px/1 ${FUENTE.mono}`, color: COLOR.textoSuave }}>
                  {tamano(c.bytes)}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}
