// Despierta produccion antes de que se abra la camara.
//
// El video arranca a grabarse en el momento en que se crea el contexto del
// navegador, antes de que el test haga nada. Si la instancia de Vercel esta
// dormida, el primer GET tarda: se midio 761 ms en frio contra 194 ms en
// caliente, y la diferencia en pantalla no es el HTML sino los segundos que la
// app tarda en pintar encima. En la grabacion del admin del 03/10 eso fueron
// 3,2 s de pantalla en blanco al principio, y nada mas en todo el video: el
// tecnico, grabado despues, no tuvo ninguno porque la instancia ya estaba
// despierta.
//
// Aca se la despierta antes y, si sigue tardando, se corta la corrida. Grabar
// contra una instancia dormida no tira la grabacion, pero tira los minutos:
// uno y medio de video que se van a repetir porque el blanco quedo al principio.
//
// El ORIGEN sale de la config del demo y no de aca, asi que no hay que
// cambiarlo en dos lugares.

import config from '../playwright.demo.config.js'

const ORIGEN = config.use.baseURL

// El primer pedido casi siempre es el lento, asi que el tope se aplica a cada
// intento y no solo al primero: si uno responde en 300 ms, la instancia esta
// despierta y no hace falta ser mas exigente con la siguiente.
const MAXIMO_ACEPTABLE = 400
const INTENTOS = 12
const PAUSA = 5000

const esperar = (ms) => new Promise((r) => setTimeout(r, ms))

async function medir() {
  const t0 = Date.now()
  const r = await fetch(`${ORIGEN}/login`, {
    headers: { 'user-agent': 'Mozilla/5.0' },
  })
  await r.text()
  if (!r.ok) throw new Error(`/login respondio ${r.status}`)
  return Date.now() - t0
}

// El chunk de entrada pesa 545 KB. Si no se pide antes, el navegador lo baja
// mientras la pagina ya esta pintando y la espera se corre para adentro.
async function calentarChunk() {
  const html = await (await fetch(ORIGEN, { headers: { 'user-agent': 'Mozilla/5.0' } })).text()
  const entradas = [...html.matchAll(/src="(\/assets\/[^"]+\.js)"/g)].map((m) => m[1])
  if (!entradas.length) return 0
  await (await fetch(`${ORIGEN}${entradas[0]}`, { headers: { 'user-agent': 'Mozilla/5.0' } })).text()
  return entradas.length
}

export default async function calentar() {
  console.log(`\ncalentando ${ORIGEN}`)

  let ultimo = Infinity
  for (let intento = 1; intento <= INTENTOS; intento++) {
    let ms
    try {
      ms = await medir()
    } catch (e) {
      console.log(`  ${intento}: ${e.message}`)
      await esperar(PAUSA)
      continue
    }
    console.log(`  ${intento}: ${ms} ms`)
    if (ms <= MAXIMO_ACEPTABLE) {
      const entradas = await calentarChunk()
      console.log(`  caliente en ${ms} ms (${entradas} chunk/s descargados)\n`)
      return
    }
    ultimo = ms
    await esperar(PAUSA)
  }

  throw new Error(
    `${ORIGEN} sigue tardando ${ultimo} ms despues de ${INTENTOS} intentos ` +
      `(tope ${MAXIMO_ACEPTABLE} ms). No grabo contra una instancia dormida: ` +
      `se espera unos minutos y se corre de nuevo.`
  )
}