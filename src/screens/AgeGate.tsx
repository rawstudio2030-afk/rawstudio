// Pantalla 01 — Puerta de edad
//
// Venia del deck de Claude Design y se conservo tal cual, incluido su texto en
// INGLES: era la primera pantalla que veia cualquiera, en un sitio que habla
// español de principio a fin. Traducida el 5 de noviembre de 2026.
//
// ---------- Y dos promesas que el producto no podia cumplir ----------
//
// Decia «SCREENSHOTS BLOCKED». No habia ningun mecanismo detras, y no puede
// haberlo: la web no permite impedir una captura de pantalla, en ningun
// navegador. Era una etiqueta y nada mas, puesta donde una creadora decide si
// entrar y dirigida justo a quien arriesga su imagen. Si alguien publica
// confiando en eso y su clip acaba circulando, la etiqueta es parte del
// problema. Fuera.
//
// En su lugar va algo que SI existe y hace el mismo trabajo: `MarcaDeAgua`
// pinta el @ de quien mira encima del video, en ClipDetail, siempre que no
// sea su propia autora. Eso si disuade de revender.
//
// Y el pie decia «We store a hash, not your face». Tambien era falso:
// Verificar.tsx sube la INE y el selfie a `supabase.storage.from(
// 'verificacion')` y guarda sus rutas. La cara SI se guarda; el hash de la
// CURP se guarda ademas, para no admitir dos veces a la misma persona. Lo que
// si es cierto —y es lo que ahora dice— es que ese bucket es privado y que su
// politica de lectura solo deja entrar a quien administra.
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSesion } from '../lib/sesion'
import { marcarEdad } from '../lib/edad'
import { supabase } from '../lib/supabase'
import PaginaCollins from '../components/PaginaCollins'
import Insignia18 from '../components/Insignia18'
import { COLOR, FUENTE } from '../lib/diseño'
import { Pulsable, Enlace } from '../components/Pulsable'

export default function AgeGate() {
  const nav = useNavigate()
  const { sesion, perfil, cargando, refrescarPerfil } = useSesion()

  // Si ya cruzo esta puerta, no se le vuelve a poner enfrente.
  useEffect(() => {
    if (cargando) return
    if (sesion && perfil?.adult_confirmed_at) nav('/clip', { replace: true })
  }, [cargando, sesion, perfil, nav])

  // Deja de ser decorativo: registra la autodeclaracion de mayoria de edad y,
  // si aun no hay sesion, manda a acceder antes de dejar ver nada.
  // Ojo: esto es autodeclaracion, no verificacion de identidad. Sirve como
  // registro de que se mostro la puerta, no como prueba legal de edad.
  const confirmarEdad = async () => {
    if (sesion) {
      await supabase
        .from('profiles')
        .update({ adult_confirmed_at: new Date().toISOString() })
        .eq('id', sesion.user.id)
      await refrescarPerfil()
      nav('/clip')
      return
    }
    // Sin sesion todavia: se guarda la constancia y se registra al abrir
    // cuenta, cuando ya existe una fila de perfil que actualizar.
    //
    // Y se va al CATALOGO, no a la puerta de acceso. Quien acaba de decir
    // «solo vengo a ver» y se topa con un formulario de registro se va: no
    // ha visto nada por lo que valga la pena dar un correo. Asi funciona
    // cualquier sitio de este giro —se mira primero y se paga despues—, y
    // aqui cada clip trae su propio muro cuando toca cobrar.
    marcarEdad()
    nav('/clip')
  }
  /* Modo marca: es lo primero que ve cualquiera. El salon de Collins fijo detras
   * y el aviso en una tarjeta champagne, con el octagono 18+ arriba.
   *
   * La cortina (`assets/cortina.jpg`) estuvo aqui; es un linograbado en lima y
   * magenta del lenguaje anterior de la marca y choca con el descenso. El
   * archivo sigue en el repo por si se quiere recuperar. */
  return (
    <PaginaCollins>
      <div style={{ display: 'flex', justifyContent: 'center' }}><Insignia18 /></div>

      <div className="tarjeta-acceso">
        {/* Bodoni Moda con interlineado 1: los acentos del español caben. Ver
            la nota de FUENTE.display. */}
        <h1 className="acceso-titulo">
          Demuestra<br />que eres<br /><span className="realce">mayor.</span>
        </h1>
        <p className="acceso-bajada">
          Todo lo que hay detrás de esta puerta se paga, es privado, y lo hacen personas que eligieron estar aquí.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <span style={{
            border: `1px solid ${COLOR.dinero}`, color: COLOR.dinero, borderRadius: 999, padding: '8px 12px',
            font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.3, textTransform: 'uppercase',
          }}>Tu @ sobre el video</span>
          <span style={{
            border: '1px solid rgba(243,235,226,.7)', color: COLOR.texto, borderRadius: 999, padding: '8px 12px',
            font: `700 10px/1 ${FUENTE.ui}`, letterSpacing: 1.3, textTransform: 'uppercase',
          }}>Prohibida la reventa</span>
        </div>

        <div style={{ display: 'grid', gap: 12, marginTop: 4 }}>
          <Pulsable al={confirmarEdad} className="btn-collins btn-collins-primario">Tengo 18 años o más</Pulsable>
          <Enlace a="/" className="btn-collins btn-collins-suave">Todavía no — sácame de aquí</Enlace>
        </div>

        <div style={{ font: `400 12px/1.5 ${FUENTE.ui}`, color: COLOR.textoSuave, textAlign: 'center' }}>
          Para cobrar te pediremos una identificación y una selfie. Se guardan en privado y solo las ve quien administra.
        </div>
      </div>
    </PaginaCollins>
  )
}
