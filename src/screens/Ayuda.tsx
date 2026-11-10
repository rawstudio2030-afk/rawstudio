/* Pantallas 26 y 27 — Contacto y preguntas frecuentes.
 *
 * Faltaban las dos, y la falta no era cosmetica: los documentos legales citan
 * tres direcciones de correo y no habia ninguna pagina donde leerlas sin
 * atravesar un documento de cuarenta parrafos. Alguien con un problema de
 * dinero no va a buscarlo ahi.
 *
 * Las dos se pueden leer SIN SESION y sin cruzar la puerta de edad: una
 * pagina de contacto detras de un portal de mayoria de edad no sirve para lo
 * que existe una pagina de contacto, que es que te escriba quien tiene un
 * problema contigo —incluida una persona que no tiene cuenta y cuya imagen
 * aparece sin su permiso—.
 */
import { useState } from 'react'
import { BUZONES, PREGUNTAS } from '../content/ayuda'
import { MarcoDocumento, PieContacto } from '../components/Documento'
import { COLOR, LINEA, FUENTE, RADIO } from '../lib/diseño'
import { Pulsable, Enlace } from '../components/Pulsable'

/* ==================== Contacto ==================== */

export function Contacto() {
  return (
    <MarcoDocumento titulo={['Hablar con', 'una persona']}>
      <p style={{ margin: '18px 0 0', font: `400 16px/1.6 ${FUENTE.ui}`, color: '#C2BDC7' }}>
        Detrás de estas direcciones hay una bandeja que lee una persona. Si
        escribes, te contestamos.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}>
        {BUZONES.map(b => (
          <a key={b.correo} href={`mailto:${b.correo}`} className="tarjeta-sobria" style={{
            display: 'block', textDecoration: 'none', padding: '18px 17px', cursor: 'pointer',
          }}>
            <div style={{
              font: `700 11px/1 ${FUENTE.ui}`, letterSpacing: 2,
              textTransform: 'uppercase', color: COLOR.textoSuave,
            }}>{b.para}</div>
            <div style={{
              font: `700 18px/1.3 ${FUENTE.mono}`, color: COLOR.dinero, marginTop: 9,
              wordBreak: 'break-all',
            }}>{b.correo}</div>
            <div style={{ font: `400 14px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave, marginTop: 9 }}>
              {b.detalle}
            </div>
          </a>
        ))}
      </div>

      {/* Lo unico que esta pagina promete con un numero. El resto de los
          plazos de esta plataforma viven en los terminos, y este tambien:
          repetirlo aqui es para que no haga falta abrirlos. */}
      <div style={{ marginTop: 22, padding: '16px 16px', borderRadius: RADIO.filo, border: `1.5px dashed ${LINEA.marcada}` }}>
        <div style={{ font: `400 14px/1.6 ${FUENTE.ui}`, color: COLOR.textoSuave }}>
          <b style={{ color: COLOR.texto }}>Un plazo con número:</b> un retiro
          aprobado se paga en un máximo de <b style={{ color: COLOR.dinero }}>48
          horas hábiles</b>. Si se pasa de ahí, escríbenos y es nuestro
          problema, no tuyo.
        </div>
      </div>

      <div style={{ marginTop: 26, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <Enlace a="/preguntas" style={enlacePie}>Preguntas frecuentes</Enlace>
        <Enlace a="/terminos" style={enlacePie}>Términos y condiciones</Enlace>
        <Enlace a="/privacidad" style={enlacePie}>Aviso de privacidad</Enlace>
      </div>
    </MarcoDocumento>
  )
}

const enlacePie = {
  minHeight: 44, display: 'inline-flex', alignItems: 'center',
  font: `400 14px/1 ${FUENTE.ui}`, color: COLOR.textoSuave, cursor: 'pointer',
  textDecoration: 'underline', textUnderlineOffset: 4,
} as const

/* ==================== Preguntas ==================== */

export function Preguntas() {
  /* Cerradas al entrar, y abiertas de una en una.
   *
   * Treinta parrafos desplegados son un muro que nadie lee; y un acordeon que
   * permite abrirlas todas acaba siendo ese muro con pasos extra. Se guarda
   * cual esta abierta, no un conjunto. */
  const [abierta, setAbierta] = useState<string | null>(null)

  return (
    <MarcoDocumento titulo={['Preguntas', 'frecuentes']}>
      <p style={{ margin: '18px 0 0', font: `400 16px/1.6 ${FUENTE.ui}`, color: '#C2BDC7' }}>
        Las que ya nos han hecho, con los números de verdad. Si falta la tuya,
        escríbenos.
      </p>

      {PREGUNTAS.map(g => (
        <div key={g.titulo} style={{ marginTop: 30 }}>
          <h2 style={{
            margin: '0 0 12px', font: `700 12px/1.45 ${FUENTE.ui}`, letterSpacing: 1.6,
            textTransform: 'uppercase', color: COLOR.dinero,
          }}>{g.titulo}</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {g.preguntas.map(q => {
              const esta = abierta === q.p
              return (
                <div key={q.p} className="tarjeta-sobria" style={{ overflow: 'hidden' }}>
                  <Pulsable
                    al={() => setAbierta(esta ? null : q.p)}
                    activado={esta}
                    style={{
                      boxSizing: 'border-box', width: '100%', textAlign: 'left',
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      padding: '16px 15px', cursor: 'pointer',
                      background: esta ? 'rgba(255,255,255,.04)' : 'transparent',
                    }}>
                    <span style={{
                      flex: 1, font: `500 16px/1.4 ${FUENTE.ui}`,
                      color: COLOR.texto,
                    }}>{q.p}</span>
                    {/* Un signo y no una flecha que gira: sin animacion no hay
                        nada que se quede a medias si el navegador no la
                        soporta, y el estado se lee igual. */}
                    <span style={{
                      font: `400 20px/1 ${FUENTE.mono}`, color: esta ? COLOR.dinero : COLOR.textoSuave,
                      marginTop: -1,
                    }}>{esta ? '−' : '+'}</span>
                  </Pulsable>

                  {esta && (
                    <div style={{ padding: '2px 15px 16px' }}>
                      {q.r.map((p, i) => (
                        <p key={i} style={{
                          margin: '0 0 11px', font: `400 15px/1.65 ${FUENTE.ui}`,
                          color: '#C2BDC7',
                        }}>{p}</p>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <PieContacto texto="¿No está tu pregunta? Escríbenos a" correo="hola@rawstudio.biz" />

      <div style={{ marginTop: 20, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <Enlace a="/contacto" style={enlacePie}>Contacto</Enlace>
        <Enlace a="/terminos" style={enlacePie}>Términos y condiciones</Enlace>
      </div>
    </MarcoDocumento>
  )
}
