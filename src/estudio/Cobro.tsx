/* Cuenta para cobrar.
 *
 * Es la pieza que faltaba para que el dinero pudiera salir. `solicitar_retiro`
 * lleva meses exigiendo una cuenta registrada en `payout_accounts` y no habia
 * ninguna pantalla para registrarla, asi que cualquier intento de retiro moria
 * en «Primero registra tu cuenta para recibir el pago».
 *
 * Se escribe directo contra la tabla, sin funcion: su politica de RLS es
 * `for all` sobre la propia fila, y no hay ninguna regla que valga la pena
 * mover al servidor que la base no haga ya con sus CHECK.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSesion } from '../lib/sesion'
import {
  miCuenta, guardarCuenta, clabeCuadra, NOMBRE_REGIMEN, type Regimen,
} from '../lib/retiro'
import { Marco, Boton, Campo, Etiqueta, Aviso } from './piezas'
import { COLOR, LINEA, FUENTE } from '../lib/diseño'
import { Pulsable } from '../components/Pulsable'

export default function Cobro() {
  const nav = useNavigate()
  const { sesion, cargando } = useSesion()

  const [titular, setTitular] = useState('')
  const [clabe, setClabe] = useState('')
  const [banco, setBanco] = useState('')
  const [rfc, setRfc] = useState('')
  const [regimen, setRegimen] = useState<Regimen>('sin_registro')
  const [cargada, setCargada] = useState(false)
  const [error, setError] = useState('')
  const [bien, setBien] = useState('')
  const [guardando, setGuardando] = useState(false)
  // Si no se pudo leer la cuenta NO se enseña el formulario vacio: pareceria
  // que no tiene ninguna registrada, y lo que escribiera encima pisaria la
  // que si esta guardada.
  const [fallo, setFallo] = useState<string | null>(null)
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    if (cargando || !sesion) return
    let vivo = true
    miCuenta().then(r => {
      if (!vivo) return
      setFallo(r.fallo)
      const c = r.datos
      if (c) {
        setTitular(c.titular); setClabe(c.clabe); setBanco(c.banco ?? '')
        setRfc(c.rfc ?? ''); setRegimen(c.regimen)
      }
      setCargada(true)
    })
    return () => { vivo = false }
  }, [sesion, cargando, intento])

  const digitos = clabe.replace(/\D/g, '')
  const clabeOk = digitos.length === 18
  const sospechosa = clabeOk && !clabeCuadra(digitos)
  const rfcOk = !rfc.trim() || /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/.test(rfc.trim().toUpperCase())
  const puede = titular.trim().length > 2 && clabeOk && rfcOk && !guardando

  const guardar = async () => {
    if (!puede || !sesion) return
    setGuardando(true); setError(''); setBien('')
    const m = await guardarCuenta(sesion.user.id, { titular, clabe, banco, rfc, regimen })
    setGuardando(false)
    if (m) { setError(m); return }
    setBien('Cuenta guardada.')
    setTimeout(() => setBien(''), 2600)
  }

  if (cargando || !cargada) return <Marco titulo="Cuenta para cobrar"><p style={nota}>Cargando…</p></Marco>

  if (fallo) return (
    <Marco titulo="Cuenta para cobrar" volverA="/wallet">
      <Aviso texto="No pudimos leer tu cuenta de cobro. No quiere decir que no tengas una: por eso no te enseñamos el formulario en blanco, para que no acabes escribiendo encima de la que ya está guardada." />
      <Boton al={() => { setCargada(false); setIntento(n => n + 1) }}>Reintentar</Boton>
    </Marco>
  )

  return (
    <Marco titulo="Cuenta para cobrar" volverA="/wallet">
      <p style={{ ...nota, marginTop: 0 }}>
        A esta cuenta se transfiere por SPEI lo que retires. Se usa solo para pagarte;
        la copia que queda de cada retiro es para poder decir a dónde se mandó el dinero.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 22 }}>
        <div>
          <Etiqueta texto="Titular de la cuenta" />
          <Campo valor={titular} cambia={setTitular} marcador="Como aparece en el banco" />
          <p style={nota}>
            Tiene que ser tu nombre legal, no el artístico: el banco rechaza la
            transferencia si no coinciden.
          </p>
        </div>

        <div>
          <Etiqueta texto="CLABE interbancaria" />
          <Campo valor={clabe} tipo="text"
            cambia={v => setClabe(v.replace(/\D/g, '').slice(0, 18))}
            marcador="18 dígitos" />
          <p style={{
            ...nota,
            color: clabe && !clabeOk ? COLOR.acento : sospechosa ? '#FFB020' : COLOR.textoApagado,
          }}>
            {clabe && !clabeOk ? `Van ${digitos.length} de 18 dígitos.`
              : sospechosa
                ? 'Esa CLABE no pasa su dígito verificador. Puede ser un número mal tecleado — revísala antes de guardar.'
                : 'Son 18 dígitos, sin espacios. No es el número de tu tarjeta.'}
          </p>
        </div>

        <div>
          <Etiqueta texto="Banco (opcional)" />
          <Campo valor={banco} cambia={setBanco} marcador="BBVA, Banorte, Nu…" />
        </div>

        <div>
          <Etiqueta texto="RFC (opcional)" />
          <Campo valor={rfc} cambia={v => setRfc(v.toUpperCase().slice(0, 13))}
            marcador="Si estás dada de alta ante el SAT" />
          <p style={{ ...nota, color: rfcOk ? COLOR.textoApagado : COLOR.acento }}>
            {rfcOk
              ? 'Sin RFC se te retiene como «sin registro», que es la tasa más alta.'
              : 'Ese RFC no tiene el formato que espera el SAT.'}
          </p>
        </div>

        <div>
          <Etiqueta texto="Régimen fiscal" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {(Object.keys(NOMBRE_REGIMEN) as Regimen[]).map(r => (
              <Pulsable key={r} al={() => setRegimen(r)} activado={regimen === r} style={{
                boxSizing: 'border-box', width: '100%', textAlign: 'left',
                padding: '13px 14px', cursor: 'pointer',
                border: `1px solid ${regimen === r ? COLOR.dinero : LINEA.tenue}`,
                background: regimen === r ? 'rgba(200,255,61,.07)' : 'transparent',
                color: regimen === r ? COLOR.texto : COLOR.textoSuave,
                font: `${regimen === r ? 600 : 400} 14px/1.35 ${FUENTE.ui}`,
              }}>{NOMBRE_REGIMEN[r]}</Pulsable>
            ))}
          </div>
          <p style={nota}>
            De esto depende cuánto se te retiene de ISR e IVA. Si no estás segura,
            pregúntale a tu contador antes de cobrar: corregirlo después es un trámite.
          </p>
        </div>
      </div>

      <Aviso texto={error} />
      <Aviso texto={bien} tono="bien" />

      <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
        <Boton al={guardar} activo={puede} tono="primario">
          {guardando ? 'Guardando…' : 'Guardar cuenta'}
        </Boton>
        <Boton al={() => nav('/estudio/retirar')}>Pedir un retiro</Boton>
      </div>
    </Marco>
  )
}

const nota: React.CSSProperties = {
  margin: '8px 0 0', font: `400 12px/1.6 ${FUENTE.mono}`, color: COLOR.textoApagado,
}
