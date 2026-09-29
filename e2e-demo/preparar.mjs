// Prepara los datos para los videos de presentacion.
//
// Hace dos cosas, y solo con la cuenta de admin:
//   1. Borra las ordenes que dejaron los E2E de la suite. Los titulos arrancan
//      con "Test Order E2E", asi que el filtro no puede tocar nada real.
//   2. Crea dos ordenes con titulos de trabajo real, asignadas al tecnico de
//      E2E_TECNICO_ID. Sin esto el video del tecnico no tiene nada que mostrar:
//      sus unicas ordenes eran las de test.
//
// Es idempotente: se puede volver a correr sin duplicar.
//
//   node e2e-demo/preparar.mjs

import { pedir, sesion, emailAdmin, idTecnico } from './rest.js'

const MARCA = 'Presentacion IMAE'
const { email, password } = emailAdmin()
const TECNICO = idTecnico()

const { token, id: idAdmin } = await sesion(email, password)
console.log(`admin ${email} (${idAdmin})`)

// ---------------------------------------------------------------- 1. basura

const basura = await pedir('get', 'ordenes?titulo=like.Test%20Order%20E2E%25&select=id,titulo', undefined, token)

if (!basura.length) {
  console.log('basura: no hay ordenes de test, no borro nada')
} else {
  const ids = basura.map((o) => o.id)
  console.log(`basura: ${basura.length} orden(es) -> ${basura.map((o) => `#${o.id}`).join(', ')}`)

  // compras.orden_id NO tiene ON DELETE CASCADE (schema.sql:68), a diferencia de
  // fotos_orden y logs_orden que si lo tienen. Si alguna compra apunta a una de
  // estas ordenes el borrado revienta por FK.
  //
  // Y aca aparece lo que motivó este bloque: compras REALES colgadas de ordenes
  // de test. Rosarpin / Targuros del 8 estaba enlazada a la #124, que es basura.
  // Entonces no se puede borrar la orden sin tocar algo que sí importa, y no se
  // puede dejar la orden porque la basura sale en pantalla. La salida es
  // desvincular la compra (orden_id a null) y borrar la orden: la compra conserva
  // proveedor, articulo, cantidad y estado, y pierde un enlace que no significaba
  // nada porque la orden era un "#124 Test Order E2E".
  const compras = await pedir('get', `compras?orden_id=in.(${ids.join(',')})&select=id,proveedor,articulo,orden_id`, undefined, token)
  const esBasura = (c) => /E2E|Test/i.test(`${c.proveedor} ${c.articulo}`)

  if (compras.length) {
    const basuraCompras = compras.filter(esBasura)
    const reales = compras.filter((c) => !esBasura(c))

    for (const c of basuraCompras) {
      await pedir('delete', `compras?id=eq.${c.id}`, undefined, token)
      console.log(`  compra de test borrada: #${c.id} ${c.proveedor} / ${c.articulo}`)
    }
    for (const c of reales) {
      await pedir('patch', `compras?id=eq.${c.id}`, { orden_id: null }, token)
      console.log(`  compra real DESVINCULADA: #${c.id} ${c.proveedor} / ${c.articulo} (orden ${c.orden_id} -> null)`)
      console.log(`    para devolverla: PATCH compras?id=eq.${c.id} con {"orden_id": ${c.orden_id}}`)
    }
  }

  // fotos_orden y logs_orden se van por ON DELETE CASCADE. Las fotos no son
  // residuo de test, asi que se avisa antes en vez de perderlas en silencio.
  const fotos = await pedir('get', `fotos_orden?orden_id=in.(${ids.join(',')})&select=id,orden_id,descripcion`, undefined, token)
  if (fotos.length) {
    fotos.forEach((f) => console.log(`  OJO: la orden ${f.orden_id} tiene la foto #${f.id} ("${f.descripcion}") y se va por cascada`))
  }

  await pedir('delete', `ordenes?id=in.(${ids.join(',')})`, undefined, token)
  console.log('  borradas. El ON DELETE CASCADE se llevo logs; las fotos se avisaron arriba.')
}

// ------------------------------------------------------- 2. ordenes de demo

const previas = await pedir('get', `ordenes?titulo=like.${encodeURIComponent(`${MARCA} - `)}%25&select=id,titulo,created_by`, undefined, token)

if (previas.length) {
  // Se borran y se recrean en vez de intentar un UPDATE: el REST no tiene
  // permiso de UPDATE sobre ordenes ("permission denied for table ordenes"), la
  // app edita por una funcion. Asiademas el video del tecnico completa su
  // orden, y de esta forma cada corrida arranca siempre con los dos estados
  // base sin preparar nada a mano.
  const ids = previas.map((o) => o.id)
  const compras = await pedir('get', `compras?orden_id=in.(${ids.join(',')})&select=id`, undefined, token)
  if (compras.length) throw new Error(`Hay ${compras.length} compra(s) sobre ordenes de la demo, no las borro`)
  await pedir('delete', `ordenes?id=in.(${ids.join(',')})`, undefined, token)
  console.log(`demo: borradas ${previas.length} de la corrida previa -> ${ids.map((i) => `#${i}`).join(', ')}`)
}

{
  const equipos = await pedir('get', 'equipos?select=id,nombre', undefined, token)
  const porNombre = (n) => equipos.find((e) => e.nombre.toLowerCase().includes(n.toLowerCase()))?.id ?? null

  const nuevas = [
    {
      equipo_id: porNombre('Torno'),
      tecnico_id: TECNICO,
      titulo: `${MARCA} - Mantenimiento preventivo del torno`,
      descripcion: 'Revision general: lubricacion de guias, ajuste de backlash en el eje X y control de temperatura del husillo.',
      prioridad: 'alta',
      estado: 'pendiente',
      tipo_mantenimiento: 'preventivo',
      created_by: idAdmin,
    },
    {
      equipo_id: porNombre('Fresadora'),
      tecnico_id: TECNICO,
      titulo: `${MARCA} - Vibracion en el eje Y de la fresadora`,
      descripcion: 'El operario reporta vibracion al cortar en profundidad. Revisar husillo y bulones de la mesa.',
      prioridad: 'urgente',
      estado: 'en_progreso',
      tipo_mantenimiento: 'correctivo',
      created_by: idAdmin,
    },
  ]

  const creadas = await pedir('post', 'ordenes', nuevas, token)
  creadas.forEach((o) => console.log(`demo: creada #${o.id} ${o.titulo}`))
}

console.log('listo')
