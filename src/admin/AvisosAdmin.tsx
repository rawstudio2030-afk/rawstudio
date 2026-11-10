/* Avisos del panel: lo que llego, de quien y desde cuando.
 *
 * Complementa a los badges del menu (que dicen CUANTAS hay) con el que llego, quien lo
 * trajo y desde cuando espera, y lleva al modulo que lo resuelve. La lista la arma
 * el servidor al pedirla (`admin_avisos`): un asunto resuelto en su modulo deja de
 * salir al volver a pedirla; uno pendiente que ya viste se queda, sin contar en
 * la campana, hasta que se resuelve.
 *
 * Al abrirla se marca como vista PARA ESTA administradora (no para otra): lo nuevo
 * deja de contar en la campana. Si no se puede cargar, lo dice; nunca «todo al dia».
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { COLOR, FUENTE, LINEA } from '../lib/diseño'
import { cuantos } from '../lib/plural'
import {
  avisosAdmin, marcarAvisosAdminVistos, type AvisoAdmin, type TipoAvisoAdmin,
} from '../lib/avisosAdmin'
import { Boton, Aviso, desde } from './piezas'

const ROTULO: Record<TipoAvisoAdmin, string> = {
  moderacion: 'Moderación', verificacion: 'Identidad', denuncia: 'Denuncia', retiro: 'Retiro',
  consulta: 'Consulta', ajuste: 'Ajuste', purga: 'Purga', edicion: 'Edición',
}

export default function AvisosAdmin() {
  const [filas, setFilas] = useState<AvisoAdmin[] | null>(null)
  const [error, setError] = useState('')
  const turno = useRef(0)

  const cargar = useCallback(async () => {
    const mio = ++turno.current
    try {
      const r = await avisosAdmin()
      if (mio !== turno.current) return
      if ('error' in r) { setError(r.error); return }
      setError(''); setFilas(r.filas)
      // Se marca DESPUES de traer la lista: esta vista aun sabe que era nuevo.
      if (document.visibilityState !== 'hidden') await marcarAvisosAdminVistos()
    } catch {
      if (mio === turno.current) setError('Sin conexión con el servidor.')
    }
  }, [])

  useEffect(() => {
    const primero = window.setTimeout(cargar, 0)
    const reloj = window.setInterval(cargar, 60_000)
    window.addEventListener('focus', cargar)
    return () => {
      window.clearTimeout(primero); window.clearInterval(reloj)
      window.removeEventListener('focus', cargar)
    }
  }, [cargar])

  const urgentes = (filas ?? []).filter(a => a.urgente)
  const resto = (filas ?? []).filter(a => !a.urgente)

  return (
    <>
      <div style={{ marginBottom: 16, padding: '10px 13px', border: `1px solid ${LINEA.suave}`,
        font: `400 12px/1.5 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
        Lo que llegó a la plataforma y espera a alguien. La campana cuenta solo lo <b style={{ color: COLOR.texto }}>nuevo
        </b> desde la última vez que abriste esta lista; los pendientes que ya viste se quedan aquí hasta resolverse
        en su módulo (el menú dice cuántos hay en cada uno). Abrirla la marca como vista solo para ti.
      </div>

      {error && (
        <Aviso tipo="error">
          No se pudieron cargar los avisos ({error}). Esto <b>no significa que no haya nada</b>: revisa el menú o reintenta.
          {' '}<Boton chico al={cargar}>Reintentar</Boton>
        </Aviso>
      )}
      {!filas && !error && <Vacio texto="Cargando…" />}
      {filas && filas.length === 0 && !error && (
        <Vacio texto="No hay nada por atender ni avisos recientes." />
      )}

      {urgentes.length > 0 && <Grupo titulo={`Por atender · ${urgentes.length}`} color={COLOR.acento} filas={urgentes} />}
      {resto.length > 0 && <Grupo titulo={`Recientes · ${cuantos(resto.length, 'aviso')}`} color={COLOR.textoSuave} filas={resto} />}

      {filas && (
        <div style={{ marginTop: 6, font: `400 11px/1.5 ${FUENTE.mono}`, color: COLOR.textoSuave }}>
          Se actualiza solo cada minuto.
        </div>
      )}
    </>
  )
}

function Vacio({ texto }: { texto: string }) {
  return (
    <div style={{ padding: '56px 20px', textAlign: 'center', color: COLOR.textoSuave,
      font: `400 13px/1.45 ${FUENTE.ui}`, border: `1.5px dashed ${LINEA.marcada}`, borderRadius: 10 }}>{texto}</div>
  )
}

function Grupo({ titulo, color, filas }: { titulo: string; color: string; filas: AvisoAdmin[] }) {
  return (
    <section style={{ marginBottom: 22 }}>
      <h2 style={{ margin: '0 0 10px', font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 2,
        textTransform: 'uppercase', color }}>{titulo}</h2>
      <div style={{ display: 'grid', gap: 8 }}>
        {filas.map(a => (
          <Link key={a.clave} to={a.ruta} style={{
            display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 14px', textDecoration: 'none',
            background: COLOR.superficie, color: 'inherit', cursor: 'pointer',
            border: `1px solid ${a.nuevo ? COLOR.acento : LINEA.suave}`,
          }}>
            <span style={{ flex: '0 0 auto', minWidth: 82, font: `700 10px/1.6 ${FUENTE.ui}`, letterSpacing: 1.2,
              textTransform: 'uppercase', color: a.urgente ? COLOR.acento : COLOR.textoSuave }}>
              {ROTULO[a.tipo] ?? a.tipo}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <b style={{ display: 'block', font: `700 13px/1.4 ${FUENTE.ui}`, color: COLOR.texto, overflowWrap: 'anywhere' }}>
                {a.nuevo && (
                  <span role="img" aria-label="Nuevo" style={{ display: 'inline-block', width: 8, height: 8,
                    borderRadius: '50%', background: COLOR.acento, marginRight: 8 }} />
                )}
                {a.titulo}
              </b>
              <span style={{ display: 'block', marginTop: 3, font: `400 12px/1.5 ${FUENTE.ui}`,
                color: COLOR.textoSuave, overflowWrap: 'anywhere' }}>{a.detalle}</span>
            </span>
            <span style={{ flex: '0 0 auto', font: `400 11px/1.6 ${FUENTE.mono}`, color: COLOR.textoSuave, whiteSpace: 'nowrap' }}>
              {desde(a.at)}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
