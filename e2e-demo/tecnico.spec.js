import { test, expect } from '@playwright/test'
import {
  reiniciar,
  montarOverlay,
  escena,
  cartela,
  cartelaContacto,
  irA,
  marcaVisible,
  escribirGuion,
  ingresar,
  TIMEOUT_NAVEGACION,
} from './ayuda.js'

// Los milisegundos de cada escena NO son una estimacion: son el largo real del
// audio de esa frase mas 350ms de aire, dividido por el RITMO de ayuda.js. La
// voz manda sobre el texto, no al revés. Si se cambia una frase hay que volver
// a medirla (ver la seccion de videos de AGENTS.md) antes de regrabar, o la
// voz se corta o la escena queda mirando al vacio.
//
// Este video no lleva el puente ("Hoy vas a ver el mantenimiento..."): esa frase
// le habla al director y al area de Calidad, y va en el video del admin, que es
// el primero. Si a este video lo ve alguien suelto, la entrada por el usuario ya
// dice de que se trata.
//
// Las dos ordenes que usa las siembra e2e-demo/preparar.mjs con el prefijo que
// e2e-demo/limpiar.mjs borra. Sin correr preparar antes de grabar, el tecnico
// solo tiene las suyas y esta escena no tiene nada que abrir.

test('video de presentacion: tecnico', async ({ page }) => {
  reiniciar()
  test.setTimeout(9 * 60 * 1000)

  // 20s por accion: sin esto un selector mal puesto se queda esperando el
  // timeout del test entero (9 min) en vez de fallar al toque.
  page.setDefaultTimeout(20000)

  await page.goto('/login', { timeout: TIMEOUT_NAVEGACION })
  await montarOverlay(page)

  // ---------------------------------------------------------------- portada
  await cartela(page, 'IMAE', 'Para el técnico, en el taller, desde el celular', 2800)

  // ----------------------------------------------------------------- ingreso
  // escena() y no leyenda(): la segunda solo pinta el texto y no lo anota en el
  // guion, asi que el audio de esa frase no tendria donde apoyarse.
  await escena(page, 'Cada uno entra con su usuario: el acceso es personal', 3110)
  await ingresar(page, process.env.E2E_TECNICO_EMAIL, process.env.E2E_TECNICO_PASSWORD)
  await marcaVisible(page, true)

  // -------------------------------------------------------------- dashboard
  // El tecnico ve los mismos cuatro tiles que el admin, pero con los numeros
  // que le tocan a el: el RLS le filtra las ordenes ajenas. Y abajo, en la
  // tarjeta de perfil, cuantas tiene asignadas.
  await expect(page.getByTestId('stat-pendientes')).toBeVisible()
  await expect(page.getByText('Órdenes asignadas a vos')).toBeVisible({ timeout: 20000 })
  await escena(page, 'El técnico ve el estado de SU trabajo, no el de todo el taller', 3320)

  // ---------------------------------------------------------------- ordenes
  // El buscador va con timeout explicito. La pagina carga el banner y el main
  // vacio mientras espera a Supabase, asi que 5s (el default de expect) se
  // quedan cortos cuando la red viene lenta y la grabacion se cae entera.
  await irA(page, 'Órdenes')
  await expect(page.getByPlaceholder('Buscar por título...')).toBeVisible({ timeout: 20000 })
  await escena(page, 'Solo las órdenes que tiene asignadas', 2400)

  // ------------------------------------------- detalle y avance del trabajo
  await page.getByPlaceholder('Buscar por título...').fill('Mantenimiento preventivo')
  const fila = page.locator('tbody tr', { hasText: 'Mantenimiento preventivo' }).first()
  await expect(fila).toBeVisible()
  await escena(page, 'Busca la suya y abre la ficha', 2130)
  await fila.locator('a:has-text("Ver detalle")').click()
  await expect(page.getByText('Fotos de avance')).toBeVisible({ timeout: 20000 })
  await marcaVisible(page, false)
  // Sin historial todavia: la orden la sembro preparar.mjs por API, y el log de
  // alta lo escribe la app. Por eso la frase no promete historial aqui: el
  // aparece mas abajo, despues de completar, que es cuando hay algo que mostrar.
  await escena(page, 'Ve el detalle completo de la orden que le toca', 2610)

  // ------------------------------------------------------- completar y anotar
  await marcaVisible(page, true)
  // El boton de una orden de trabajo es "Completar". El "Marcar En Curso" que
  // usa el E2E de compras es de PurchaseDetail, no de WorkOrderDetail.
  try {
    await page.click('button:has-text("Completar")')
    await expect(page.getByRole('button', { name: 'Completar' })).toHaveCount(0, { timeout: 15000 })
    // La espera es por la fila, no por un tiempo: el log va en un POST aparte del
    // que cambia el estado, asi que puede tardar mas. Sin esto la escena arranca
    // sobre una ficha sin historial y la frase no tiene nada que respaldar.
    await page.getByText('Historial de cambios').scrollIntoViewIfNeeded()
    await expect(
      page.locator('[data-testid="log-historial"]', { hasText: 'Estado cambiado' })
    ).toBeVisible({ timeout: 20000 })
    await marcaVisible(page, false)
    await escena(page, 'La marca como completada, y queda registrado quién lo completó y cuándo', 3710)
  } catch (e) {
    console.log(`  (no se pudo completar la orden: ${e.message})`)
  }

  // -------------------------------------------- permisos, a la vista misma
  // El label del select dice "(vos)". Ese par de parentesis ES la prueba: el
  // admin ve "Tecnico" con la lista completa, el tecnico ve "Tecnico (vos)" y
  // no puede asignarle la orden a otro.
  await irA(page, 'Órdenes')
  await page.getByText('+ Nueva Orden').click()
  await expect(page).toHaveURL('/ordenes/nueva')
  const selectTecnico = page.getByLabel('Técnico (vos)')
  await expect(selectTecnico).toBeVisible({ timeout: 20000 })
  await expect(selectTecnico.locator('option')).toHaveCount(2)
  await marcaVisible(page, true)
  await escena(page, 'Puede dar de alta una orden, pero no puede asignársela a otro ni cambiarle el estado', 3990)

  await page.getByLabel('Título').fill('Presentacion IMAE - Ajuste de mesa')
  await page.getByLabel('Descripción').fill('Ajuste de la mesa y verificación de paralelismo.')
  await selectTecnico.selectOption({ index: 1 })
  await page.getByLabel('Fecha Programada').fill('2026-10-20')
  await page.waitForTimeout(900)
  await escena(page, 'La carga en el momento, en el taller, sin volver a la oficina', 3280)

  await page.click('button:has-text("Crear Orden")')
  await expect(page).toHaveURL('/ordenes')
  await escena(page, 'Y ya está en el sistema', 1750)

  // ------------------------------------------------- se instala como una app
  // Va en try/catch y no directo. El cartel de instalacion es una hoja de la PWA
  // que la app abre sola cuando todavia no se descarta, y no hay forma de
  // apagarlo desde aca: se cae el paso y se avisa por log, en vez de perder el
  // video entero. Que ademas abra bien es otra cosa, no lo comprueba nadie.
  try {
    await page.locator('aside').getByRole('button', { name: 'Agregar a la pantalla' }).click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 15000 })
    await marcaVisible(page, false)
    await escena(page, 'Y se instala en el celular como una app, con icono propio', 3030)
    await page.keyboard.press('Escape')
  } catch (e) {
    console.log(`  (no se pudo abrir el cartel de instalacion: ${e.message})`)
  }

  // ----------------------------------------------------------------- cierre
  // La foto y los datos. La voz no los lee, por eso el ultimo paso del guion
  // queda en silencio. Los datos vienen de interno/contacto/datos.json, no de
  // este archivo: el spec se commitea y la app es publica.
  //
  // El respiro antes de la tarjeta lo verifica cartelaContacto().
  await marcaVisible(page, true)
  await page.waitForTimeout(700)
  await cartelaContacto(page, 4200)

  const { guion, srt } = escribirGuion('tecnico')
  console.log(`guion: ${guion}`)
  console.log(`srt: ${srt}`)
})