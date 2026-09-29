// Red de seguridad de la demo. Los specs borran en camara lo que crean, pero
// si uno se corta a mitad de camino el registro queda vivo en la base real.
//
// Borra SOLO lo que tiene el prefijo "Presentacion IMAE - ". Un filtro por
// prefijo no puede tocar una orden real: si mañana el cliente tiene una orden
// que se llame asi, el script se para y avisa en vez de borrarla.
//
//   node e2e-demo/limpiar.mjs
//   node e2e-demo/limpiar.mjs --si     (solo lista, no borra)

import { pedir, sesion, emailAdmin } from './rest.js'

const MARCA = 'Presentacion IMAE - '
const soloListar = process.argv.includes('--si')

const { email, password } = emailAdmin()
const { token, id: idAdmin } = await sesion(email, password)

const huerfanas = await pedir('get', `ordenes?titulo=like.${encodeURIComponent(MARCA)}%25&select=id,titulo,created_by`, undefined, token)

if (!huerfanas.length) {
  console.log('no queda nada de la demo')
  process.exit(0)
}

console.log(`${huerfanas.length} registro(s) de la demo:`)
huerfanas.forEach((o) => console.log(`  #${o.id} ${o.titulo}`))

if (soloListar) {
  console.log('(--si: no borro nada)')
  process.exit(0)
}

// Una orden de la demo se creo en el video como admin y otra como tecnico. La
// del admin se borro en camara, asi que cualquier que quede es de una corrida
// cortada. Se avisar las de otro autor, por si alguno se creo a mano.
for (const o of huerfanas) {
  if (o.created_by && o.created_by !== idAdmin) {
    console.log(`  #${o.id} la creo ${o.created_by} (no es la cuenta admin)`)
  }
}

// compras.orden_id no tiene ON DELETE CASCADE (schema.sql:68).
const compras = await pedir('get', `compras?orden_id=in.(${huerfanas.map((o) => o.id).join(',')})&select=id,proveedor,articulo,orden_id`, undefined, token)
if (compras.length) {
  console.log(`hay ${compras.length} compra(s) vinculadas, no borro nada:`)
  compras.forEach((c) => console.log(`  #${c.id} ${c.proveedor} / ${c.articulo} -> orden ${c.orden_id}`))
  process.exit(1)
}

await pedir('delete', `ordenes?id=in.(${huerfanas.map((o) => o.id).join(',')})`, undefined, token)
console.log('borradas')
