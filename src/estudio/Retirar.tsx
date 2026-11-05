/* Pedir un retiro.
 *
 * La funcion de la base existe desde septiembre; lo que faltaba era por donde
 * llamarla. Las tres reglas —identidad verificada, minimo, y disponible— NO se
 * repiten aqui como validacion propia: se preguntan con `retiro_info()`, que
 * usa exactamente la misma resta que `solicitar_retiro`. Copiarlas en el
 * cliente seria tener dos fuentes de la verdad y el dia que se separen la
 * pantalla ofreceria una cantidad que el servidor rechaza.
 *
 * Lo de aqui es para que la persona SEPA antes de escribir; quien decide
 * sigue siendo la base.
 */
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSesion } from '../lib/sesion'
import {
  infoRetiro, pedirRetiro, misSolicitudes, NOMBRE_ESTADO,
  type InfoRetiro, type Solicitud,
} from '../lib/retiro'
import { usd, aCentavos } from '../lib/dinero'
import { Marco, Boton, Campo, Etiqueta, Aviso, Vacio } from './piezas'
import { COLOR, LINEA, FUENTE } from '../lib/diseño'
import { Pulsable, Enlace } from '../components/Pulsable'

export default function Retirar() {
  const nav = useNavigate()
  const { sesion, cargando } = useSesion()
  const [info, setInfo] = useState<InfoRetiro | null>(null)
  const [lista, setLista] = useState<Solicitud[]>([])
  const [cantidad, setCantidad] = useState('')
  const [error, setError] = useState('')
  const [bien, setBien] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [listo, setListo] = useState(false)
  // Una lista vacia de solicitudes le dice que no ha pedido ningun retiro, y
  // podria pedir otro encima del que ya iba en camino.
  const [fallo, setFallo] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    const [i, l] = await Promise.all([infoRetiro(), misSolicitudes()])
    setInfo(i.datos); setLista(l.datos); setFallo(i.fallo ?? l.fallo); setListo(true)
  }, [])

  useEffect(() => { if (!cargando && sesion) cargar() }, [cargando, sesion, cargar])

  if (cargando || !listo) return <Marco titulo="Retirar"><p style={nota}>Cargando…</p></Marco>
  if (fallo) return (
    <Marco titulo="Retirar">
      <Aviso texto="No pudimos leer tu información de cobro ni tus retiros pedidos. Tu dinero y tus solicitudes siguen donde estaban — lo que falló fue la consulta." />
      <Boton al={() => { setListo(false); cargar() }}>Reintentar</Boton>
    </Marco>
  )
  if (!info) return <Marco titulo="Retirar"><Aviso texto="Todavía no tienes información de cobro." /></Marco>

  const centavos = aCentavos(cantidad)
  const pasaMinimo = centavos !== null && centavos >= info.minimo
  const cabe = centavos !== null && centavos <= info.disponible
  const puede = info.puede_cobrar && info.tiene_cuenta && pasaMinimo && cabe && !enviando

  const enviar = async () => {
    if (!puede || centavos === null) return
    setEnviando(true); setError(''); setBien('')
    const m = await pedirRetiro(centavos)
    setEnviando(false)
    if (m) { setError(m); return }
    // El plazo va en el mensaje y no solo en los terminos: el momento en que
    // alguien quiere saber cuanto tarda un pago es justo despues de pedirlo.
    setCantidad(''); setBien('Solicitud enviada. Te avisamos por correo en cuanto se resuelva, y el pago sale en un máximo de 48 horas hábiles desde que se aprueba.')
    await cargar()
  }

  return (
    <Marco titulo="Retirar" volverA="/wallet">
      {/* ---------- Lo que hay ---------- */}
      <div style={{ border: `1px solid ${LINEA.suave}`, padding: '20px 18px' }}>
        <Etiqueta texto="Disponible para retirar" />
        <div style={{ fontFamily: FUENTE.display, fontSize: 46, lineHeight: 1, color: COLOR.dinero }}>
          {usd(info.disponible)}
        </div>
        <p style={nota}>
          Es tu saldo menos lo que ya pediste y sigue sin resolverse. El mínimo
          por solicitud son {usd(info.minimo)}.
        </p>
      </div>

      {/* ---------- Lo que falta antes de poder pedir ---------- */}
      {!info.puede_cobrar && (
        <Puerta
          texto="Antes de cobrar tenemos que comprobar tu identidad y tu edad. Es una sola vez."
          boton="Verificar mi identidad" al={() => nav('/verificar')} color={COLOR.admin} />
      )}
      {info.puede_cobrar && !info.tiene_cuenta && (
        <Puerta
          texto="Falta la cuenta donde quieres recibir el dinero. Se transfiere por SPEI."
          boton="Registrar mi cuenta" al={() => nav('/estudio/cobro')} color={COLOR.acento} />
      )}

      {/* ---------- Pedir ---------- */}
      {info.puede_cobrar && info.tiene_cuenta && (
        <div style={{ marginTop: 22 }}>
          <Etiqueta texto="Cuánto quieres retirar, en dólares" />
          <Campo valor={cantidad} cambia={setCantidad} marcador="0.00" />
          <p style={{
            ...nota,
            color: cantidad && !pasaMinimo ? COLOR.acento
              : cantidad && !cabe ? COLOR.acento : COLOR.textoApagado,
          }}>
            {cantidad && centavos === null ? 'Escribe una cantidad, por ejemplo 12.50.'
              : cantidad && !pasaMinimo ? `El mínimo son ${usd(info.minimo)}.`
              : cantidad && !cabe ? `Solo tienes ${usd(info.disponible)} disponibles.`
              : 'Se te transfiere en pesos al tipo de cambio del día, con las retenciones ya calculadas.'}
          </p>

          {/* Las retenciones son la causa numero uno de «me llegó menos de lo
              que pedí», y esa frase de arriba las menciona sin explicarlas.
              El enlace lleva a donde si estan explicadas, con las cifras. */}
          <p style={{ ...nota, marginTop: 6 }}>
            <Enlace a="/preguntas" style={{
              color: COLOR.textoTenue, cursor: 'pointer',
              textDecoration: 'underline', textUnderlineOffset: 3,
            }}>¿Cuánto tarda y cuánto se retiene?</Enlace>
          </p>

          <Aviso texto={error} />
          <Aviso texto={bien} tono="bien" />

          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            <Boton al={enviar} activo={puede} tono="primario">
              {enviando ? 'Enviando…' : 'Pedir el retiro'}
            </Boton>
            <Boton al={() => nav('/estudio/cobro')}>Cambiar mi cuenta</Boton>
          </div>
        </div>
      )}

      {/* ---------- Historial ---------- */}
      <div style={{ marginTop: 32 }}>
        <Etiqueta texto="Tus solicitudes" />
        {lista.length === 0 ? (
          <Vacio texto="Todavía no has pedido ningún retiro." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {lista.map(s => (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '14px 2px', borderBottom: `1px solid ${LINEA.tenue}`,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: `500 16px/1.3 ${FUENTE.ui}` }}>{usd(s.coins)}</div>
                  <div style={{ font: `400 10px/1.45 ${FUENTE.mono}`, color: COLOR.textoTenue, marginTop: 3 }}>
                    {new Date(s.created_at).toLocaleDateString('es-MX')}
                  </div>
                  {s.motivo_rechazo && (
                    <div style={{ font: `400 12px/1.45 ${FUENTE.ui}`, color: COLOR.acento, marginTop: 5 }}>
                      {s.motivo_rechazo}
                    </div>
                  )}
                </div>
                <span style={{
                  font: `700 9px/1 ${FUENTE.ui}`, letterSpacing: 1.2, textTransform: 'uppercase',
                  padding: '6px 8px', whiteSpace: 'nowrap',
                  color: s.estado === 'pagada' ? COLOR.fondo
                    : s.estado === 'rechazada' ? '#FF4444' : COLOR.textoSuave,
                  background: s.estado === 'pagada' ? COLOR.dinero : 'transparent',
                  border: s.estado === 'pagada' ? 'none'
                    : `1px solid ${s.estado === 'rechazada' ? '#FF4444' : LINEA.media}`,
                }}>{NOMBRE_ESTADO[s.estado]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Marco>
  )
}

function Puerta({ texto, boton, al, color }: {
  texto: string; boton: string; al: () => void; color: string
}) {
  return (
    <div style={{ marginTop: 18, padding: '16px 16px', border: `1px solid ${color}` }}>
      <div style={{ font: `400 13px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave }}>{texto}</div>
      <Pulsable al={al} style={{
        boxSizing: 'border-box', width: '100%',
        marginTop: 13, textAlign: 'center', padding: '12px 0', cursor: 'pointer',
        background: color, color: COLOR.fondo,
        font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.6, textTransform: 'uppercase',
      }}>{boton}</Pulsable>
    </div>
  )
}

const nota: React.CSSProperties = {
  margin: '8px 0 0', font: `400 12px/1.6 ${FUENTE.mono}`, color: COLOR.textoApagado,
}
