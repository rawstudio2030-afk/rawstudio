// Pruebas del menu del bot. Sin red y sin permisos:
//   deno test supabase/functions/_shared/menuBot.prueba.ts
import {
  COMANDOS, PANTALLAS, guiaPorClave, pantalla, pantallaDeBoton, pantallaDeComando,
  type Boton,
} from './menuBot.ts'

const SITIOS = ['https://rawstudio.biz', 'https://rawstudio.mx']

function afirmar(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const botones = (sitio: string): { id: string; b: Boton }[] =>
  PANTALLAS.flatMap((id) => pantalla(id, sitio).teclado.inline_keyboard.flat().map((b) => ({ id, b })))

Deno.test('ningun boton lleva a una pantalla o guia que no existe', () => {
  for (const sitio of SITIOS) {
    for (const { id, b } of botones(sitio)) {
      if ('callback_data' in b) {
        const d = b.callback_data
        const ok = d.startsWith('guia:') ? guiaPorClave(d, sitio) !== null : pantallaDeBoton(d) !== null
        afirmar(ok, `${id}: «${b.text}» lleva a «${d}», que no existe`)
      }
    }
  }
})

Deno.test('callback_data cabe en los 64 bytes de Telegram y los enlaces son https', () => {
  for (const sitio of SITIOS) {
    for (const { id, b } of botones(sitio)) {
      if ('callback_data' in b) {
        afirmar(new TextEncoder().encode(b.callback_data).length <= 64, `${id}: callback_data largo`)
      } else {
        afirmar(b.url.startsWith('https://'), `${id}: «${b.text}» no es https`)
        afirmar(b.url.startsWith(sitio), `${id}: «${b.text}» no sale de la direccion del sitio`)
      }
      afirmar(b.text.length > 0 && b.text.length <= 64, `${id}: texto de boton vacio o largo`)
    }
  }
})

Deno.test('toda pantalla que no es el inicio tiene camino de vuelta', () => {
  for (const id of PANTALLAS) {
    if (id === 'inicio') continue
    const vuelve = pantalla(id, SITIOS[0]).teclado.inline_keyboard.flat()
      .some((b) => 'callback_data' in b && b.callback_data === 'm:inicio')
    afirmar(vuelve, `${id} no tiene boton para volver al inicio`)
  }
})

Deno.test('el inicio llega a todas las demas pantallas', () => {
  const destinos = new Set(
    pantalla('inicio', SITIOS[0]).teclado.inline_keyboard.flat()
      .flatMap((b) => ('callback_data' in b ? [pantallaDeBoton(b.callback_data)] : [])),
  )
  for (const id of PANTALLAS) if (id !== 'inicio') afirmar(destinos.has(id), `el inicio no llega a ${id}`)
})

Deno.test('los textos usan el host del sitio y no escriben ninguno aparte', () => {
  afirmar(pantalla('consultas', 'https://rawstudio.biz').texto.includes('rawstudio.biz'), 'falta .biz')
  afirmar(pantalla('consultas', 'https://rawstudio.mx').texto.includes('rawstudio.mx'), 'falta .mx')
  afirmar(!pantalla('consultas', 'https://rawstudio.mx').texto.includes('rawstudio.biz'), 'se coló .biz')
})

Deno.test('pantallaDeBoton: lista blanca estricta', () => {
  afirmar(pantallaDeBoton('m:inicio') === 'inicio', 'm:inicio')
  afirmar(pantallaDeBoton('guias') === 'guias', 'el boton viejo «guias» debe seguir sirviendo')
  for (const malo of ['m:', 'm:../x', 'm:constructor', 'm:__proto__', 'M:inicio', 'inicio', '', 'guia:12', 42, null, undefined, {}]) {
    afirmar(pantallaDeBoton(malo) === null, `debia rechazar ${JSON.stringify(malo)}`)
  }
})

Deno.test('guiaPorClave: solo las seis, con caption y sin parse_mode', () => {
  for (const k of ['12', '13', '14', '15-17', 'sola', 'pareja']) {
    const g = guiaPorClave(`guia:${k}`, SITIOS[0])
    afirmar(g && g.archivo.endsWith('.pdf') && g.caption.length > 0 && g.caption.length <= 1024, `guia ${k}`)
  }
  for (const malo of ['guia:', 'guia:../../etc', 'guia:constructor', 'guia:toString', 'guia:99', '12', 5, null]) {
    afirmar(guiaPorClave(malo, SITIOS[0]) === null, `debia rechazar ${JSON.stringify(malo)}`)
  }
  afirmar(guiaPorClave('guia:sola', SITIOS[1])!.caption.includes('https://rawstudio.mx/#/creadoras'), 'caption sin el sitio')
})

Deno.test('pantallaDeComando', () => {
  afirmar(pantallaDeComando('/guias') === 'guias', '/guias')
  afirmar(pantallaDeComando('/guias@RawStudios_bot') === 'guias', '/guias@bot')
  afirmar(pantallaDeComando('/AYUDA') === 'inicio', '/AYUDA')
  afirmar(pantallaDeComando('/consultas') === 'consultas', '/consultas')
  afirmar(pantallaDeComando('/start') === null, '/start lo maneja el bot (codigo de vinculacion)')
  afirmar(pantallaDeComando('/otro') === null, '/otro')
  afirmar(pantallaDeComando('/guias algo mas') === null, 'un comando con texto detras no es el comando')
  afirmar(pantallaDeComando('hola') === null, 'texto suelto')
})

Deno.test('COMANDOS: validos para setMyCommands y todos atendidos', () => {
  const vistos = new Set<string>()
  for (const c of COMANDOS) {
    afirmar(/^[a-z0-9_]{1,32}$/.test(c.command), `comando invalido: ${c.command}`)
    afirmar(c.description.length >= 3 && c.description.length <= 256, `descripcion invalida: ${c.command}`)
    afirmar(!vistos.has(c.command), `comando repetido: ${c.command}`)
    vistos.add(c.command)
    afirmar(c.command === 'start' || pantallaDeComando(`/${c.command}`) !== null, `/${c.command} no tiene pantalla`)
  }
})
