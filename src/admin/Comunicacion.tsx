/* Modulo 4: comunicacion.
 *
 * Dos canales que se parecen poco. El correo sale de la plataforma y depende
 * de Resend; el mensaje entra al buzon de chat que la persona ya usa. Para
 * avisarle algo a una creadora, el segundo llega mucho mejor: un correo de una
 * plataforma de contenido adulto tiene todas las papeletas de acabar en spam.
 */
import { useCallback, useEffect, useState } from 'react'
import { COLOR, LINEA, FUENTE } from '../lib/diseño'
import {
  SEGMENTOS, verSegmento, personalizar, plantillas, guardarPlantilla,
  borrarPlantilla, campanas, enviarCampana,
  type Canal, type PersonaSegmento, type Plantilla, type Campana,
} from '../lib/admin'
import {
  Boton, Campo, AreaTexto, Selector, Etiquetado, Confirmar, Insignia,
  Tabla, fechaHora, type Columna,
} from './piezas'

export default function Comunicacion() {
  const [canal, setCanal] = useState<Canal>('mensaje')
  const [segmento, setSegmento] = useState('creadoras_sin_chat')
  const [asunto, setAsunto] = useState('')
  const [cuerpo, setCuerpo] = useState('')
  const [gente, setGente] = useState<PersonaSegmento[]>([])
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [enviando, setEnviando] = useState('')
  const [confirmar, setConfirmar] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [nombrePlantilla, setNombrePlantilla] = useState('')
  const [lista, setLista] = useState<Plantilla[]>([])
  const [historial, setHistorial] = useState<Campana[]>([])
  const [pestana, setPestana] = useState<'redactar' | 'historial'>('redactar')

  const recargar = useCallback(async () => {
    setLista(await plantillas())
    setHistorial(await campanas())
  }, [])

  useEffect(() => { recargar() }, [recargar])

  useEffect(() => {
    let vivo = true
    verSegmento(segmento).then(r => { if (vivo) { setGente(r.gente); setError(r.error) } })
    return () => { vivo = false }
  }, [segmento])

  const muestra = gente[0]
  const listo = cuerpo.trim() && gente.length > 0 && (canal !== 'correo' || asunto.trim())

  const enviar = async () => {
    setConfirmar(false); setEnviando('Preparando…'); setError(''); setAviso('')
    const r = await enviarCampana(canal, segmento, asunto, cuerpo,
      (h, t) => setEnviando(`Enviando ${h} de ${t}…`))
    setEnviando('')
    if ('error' in r && r.error) { setError(r.error); await recargar(); return }
    const res = (r as { resultado: { enviados: number; fallidos: number } }).resultado
    setAviso(`Enviados ${res.enviados}${res.fallidos ? `, fallaron ${res.fallidos}` : ''}.`)
    setCuerpo(''); setAsunto('')
    await recargar()
  }

  const columnas: Columna<Campana>[] = [
    { clave: 'fecha', titulo: 'Cuándo', ancho: 165,
      pinta: c => <span style={{ font: `400 11px/1.3 ${FUENTE.mono}`, color: COLOR.textoSuave }}>
        {fechaHora(c.created_at)}</span> },
    { clave: 'canal', titulo: 'Canal', ancho: 100,
      pinta: c => <Insignia texto={c.canal} color={c.canal === 'correo' ? COLOR.admin : COLOR.acento} /> },
    { clave: 'segmento', titulo: 'A quién',
      pinta: c => SEGMENTOS.find(s => s.clave === c.segmento)?.titulo ?? c.segmento },
    { clave: 'que', titulo: 'Qué decía',
      pinta: c => <span style={{ color: COLOR.textoSuave }}>
        {(c.asunto ?? c.cuerpo).slice(0, 60)}{(c.asunto ?? c.cuerpo).length > 60 ? '…' : ''}</span> },
    { clave: 'r', titulo: 'Resultado', numerica: true, ancho: 130,
      pinta: c => (
        <span style={{ color: c.fallidos ? '#FFB020' : COLOR.dinero }}>
          {c.enviados}/{c.destinatarios}{c.fallidos ? ` · ${c.fallidos} fallo` : ''}
        </span>
      ) },
  ]

  return (
    <>
      <div style={{ display: 'flex', borderBottom: `1px solid ${LINEA.tenue}`, marginBottom: 18 }}>
        {(['redactar', 'historial'] as const).map(p => (
          <div key={p} onClick={() => setPestana(p)} style={{
            padding: '9px 15px', cursor: 'pointer',
            font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.2, textTransform: 'uppercase',
            color: pestana === p ? COLOR.admin : COLOR.textoTenue,
            borderBottom: `2px solid ${pestana === p ? COLOR.admin : 'transparent'}`,
          }}>{p === 'redactar' ? 'Redactar' : `Historial (${historial.length})`}</div>
        ))}
      </div>

      {pestana === 'historial' ? (
        <Tabla columnas={columnas} filas={historial} clave={c => c.id}
          vacia="Todavía no se ha mandado ninguna campaña" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 22 }}>
          {/* ---- Redacción ---- */}
          <div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <Etiquetado texto="Canal" hijo={
                <Selector valor={canal} cambia={setCanal} opciones={[
                  { v: 'mensaje' as const, t: 'Mensaje interno' },
                  { v: 'correo' as const, t: 'Correo electrónico' },
                ]} />
              } />
              <Etiquetado texto="A quién" hijo={
                <Selector valor={segmento} cambia={setSegmento}
                  opciones={SEGMENTOS.map(s => ({ v: s.clave, t: s.titulo }))} />
              } />
            </div>

            <div style={{ marginBottom: 16, padding: '10px 12px',
              border: `1px solid ${gente.length ? LINEA.tenue : '#FFB020'}`,
              font: `400 11px/1.55 ${FUENTE.ui}`, color: COLOR.textoTenue }}>
              {gente.length === 0
                ? <span style={{ color: '#FFB020' }}>Ese segmento no tiene a nadie ahora mismo.</span>
                : <><b style={{ color: COLOR.dinero }}>{gente.length} destinatario
                    {gente.length > 1 ? 's' : ''}</b>
                   {SEGMENTOS.find(s => s.clave === segmento)?.nota &&
                     <> — {SEGMENTOS.find(s => s.clave === segmento)!.nota}</>}</>}
            </div>

            {canal === 'correo' && (
              <div style={{ marginBottom: 14 }}>
                <Etiquetado texto="Asunto" hijo={
                  <Campo valor={asunto} cambia={setAsunto} marcador="Lo primero que se lee" />
                } />
              </div>
            )}

            <Etiquetado texto={canal === 'correo' ? 'Cuerpo del correo' : 'Mensaje'} hijo={
              <AreaTexto valor={cuerpo} cambia={setCuerpo} filas={10}
                marcador={canal === 'mensaje'
                  ? 'Hola {nombre_usuario}, ¿sabías que puedes cobrar por tus mensajes?'
                  : 'Escribe en texto plano; el formato lo pone la plantilla.'} />
            } />

            <div style={{ marginTop: 8, font: `400 11px/1.6 ${FUENTE.mono}`, color: COLOR.textoApagado }}>
              Variables: {'{nombre_usuario}'} · {'{handle}'} · {'{correo}'}
            </div>

            {error && (
              <div style={{ marginTop: 14, padding: '10px 13px', border: '1px solid #FF4444',
                color: '#FF4444', font: `400 12px/1.45 ${FUENTE.ui}` }}>{error}</div>
            )}
            {aviso && (
              <div style={{ marginTop: 14, padding: '10px 13px', border: `1px solid ${COLOR.dinero}`,
                color: COLOR.dinero, font: `400 12px/1.4 ${FUENTE.ui}` }}>{aviso}</div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 18, alignItems: 'center' }}>
              <Boton tono="primario" activo={!!listo && !enviando} al={() => setConfirmar(true)}>
                {enviando || `Enviar a ${gente.length}`}
              </Boton>
              <Boton activo={!!cuerpo.trim()} al={() => setGuardando(true)}>
                Guardar como plantilla
              </Boton>
            </div>
          </div>

          {/* ---- Vista previa y plantillas ---- */}
          <div>
            <div style={{ font: `700 9px/1 ${FUENTE.ui}`, letterSpacing: 1.3,
              textTransform: 'uppercase', color: COLOR.textoTenue, marginBottom: 8 }}>
              Vista previa
            </div>
            <div style={{ border: `1px solid ${LINEA.tenue}`, padding: 14, background: COLOR.fondo }}>
              {muestra ? (
                <>
                  <div style={{ font: `400 10px/1.4 ${FUENTE.mono}`, color: COLOR.textoApagado,
                    paddingBottom: 8, borderBottom: `1px solid ${LINEA.tenue}` }}>
                    Como lo vería @{muestra.handle}
                  </div>
                  {canal === 'correo' && asunto && (
                    <div style={{ marginTop: 10, font: `700 13px/1.4 ${FUENTE.ui}`, color: COLOR.texto }}>
                      {personalizar(asunto, muestra)}
                    </div>
                  )}
                  <div style={{ marginTop: 10, font: `400 13px/1.65 ${FUENTE.ui}`,
                    color: COLOR.textoSuave, whiteSpace: 'pre-wrap' }}>
                    {cuerpo ? personalizar(cuerpo, muestra)
                      : <span style={{ color: COLOR.textoApagado }}>Escribe algo y aparecerá aquí</span>}
                  </div>
                </>
              ) : (
                <div style={{ font: `400 12px/1.5 ${FUENTE.ui}`, color: COLOR.textoApagado }}>
                  Sin destinatarios, no hay a quién previsualizar.
                </div>
              )}
            </div>

            <div style={{ margin: '20px 0 8px', font: `700 9px/1 ${FUENTE.ui}`,
              letterSpacing: 1.3, textTransform: 'uppercase', color: COLOR.textoTenue }}>
              Plantillas
            </div>
            {lista.length === 0 ? (
              <div style={{ padding: '16px 0', font: `400 11px/1.5 ${FUENTE.ui}`,
                color: COLOR.textoApagado }}>Todavía no has guardado ninguna.</div>
            ) : lista.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 0', borderBottom: `1px solid ${LINEA.tenue}` }}>
                <div onClick={() => {
                  setCanal(p.canal); setAsunto(p.asunto ?? ''); setCuerpo(p.cuerpo)
                }} style={{ flex: 1, cursor: 'pointer' }}>
                  <div style={{ font: `400 12px/1.3 ${FUENTE.ui}`, color: COLOR.texto }}>{p.nombre}</div>
                  <div style={{ font: `400 10px/1.4 ${FUENTE.mono}`, color: COLOR.textoApagado }}>
                    {p.canal}
                  </div>
                </div>
                <Boton chico tono="peligro"
                  al={async () => { await borrarPlantilla(p.id); await recargar() }}>×</Boton>
              </div>
            ))}
          </div>
        </div>
      )}

      {confirmar && (
        <Confirmar titulo={`Enviar a ${gente.length} ${gente.length === 1 ? 'persona' : 'personas'}`}
          tono="primario" etiqueta="Enviar ahora"
          cuerpo={<>Va por <b style={{ color: COLOR.texto }}>
            {canal === 'correo' ? 'correo electrónico' : 'mensaje interno'}</b> a{' '}
            {SEGMENTOS.find(s => s.clave === segmento)?.titulo.toLowerCase()}. Esto no se
            puede deshacer: una vez enviado, está enviado.</>}
          cancela={() => setConfirmar(false)} al={enviar} />
      )}

      {guardando && (
        <Confirmar titulo="Guardar plantilla" tono="primario" etiqueta="Guardar"
          cuerpo="Para reutilizarla después sin volver a escribirla."
          extra={() => (
            <div style={{ marginTop: 14 }}>
              <Etiquetado texto="Nombre" hijo={
                <Campo valor={nombrePlantilla} cambia={setNombrePlantilla}
                  marcador="Aviso del chat de paga" autoFoco />
              } />
            </div>
          )}
          cancela={() => setGuardando(false)}
          al={async () => {
            if (!nombrePlantilla.trim()) return
            await guardarPlantilla(nombrePlantilla.trim(), canal,
              canal === 'correo' ? asunto : null, cuerpo)
            setNombrePlantilla(''); setGuardando(false); await recargar()
          }} />
      )}
    </>
  )
}
