import { test, expect } from '@playwright/test'
import {
  login,
  loginComoTecnico,
  loginComoOperador,
  hayCredencialesDeTecnico,
  hayCredencialesDeOperador,
  idDeTecnicoE2E,
  migracionDePermisosAplicada,
} from './helpers'

// Guards de UI por rol. Estos tests no dependen del RLS: pasan igual antes de
// aplicarlo, porque la UI oculta lo que el rol no puede tocar. Lo que el RLS
// agrega es que el tecnico tampoco pueda hacerlo por API, y eso se verifica a
// mano en el SQL Editor.

const SELLO = Date.now()
const MARCA_EDITAR = `Test Order E2E editar ${SELLO}`

async function crearOrden(page, titulo, tecnicoId) {
  await page.goto('/ordenes/nueva')
  await page.getByLabel('Título').fill(titulo)
  await page.getByLabel('Descripción').fill('E2E edicion')
  // Por value y no por index: el index depende de cuantos tecnicos hay cargados
  // y de cuantos estan activos, y eso cambia con cada alta.
  await page.getByLabel('Técnico').selectOption(tecnicoId)
  await page.getByLabel('Fecha Programada').fill('2026-12-01')
  await page.click('button:has-text("Crear Orden")')
  await expect(page).toHaveURL('/ordenes')
}

async function abrirOrden(page, titulo) {
  await page.goto('/ordenes')
  await page.getByPlaceholder('Buscar por título...').fill(titulo)
  await page.locator('tbody tr', { hasText: titulo }).locator('a:has-text("Ver detalle")').click()
  await expect(page).toHaveURL(/\/ordenes\/\d+$/)
}

// El id sale de la URL de la fila, no del listado: asi el test no depende del
// orden en que la base los devuelva.
async function ordenIdDeTitulo(page, titulo) {
  await page.goto('/ordenes')
  await page.getByPlaceholder('Buscar por título...').fill(titulo)
  const link = page.locator('tbody tr', { hasText: titulo }).locator('a:has-text("Ver detalle")')
  await expect(link).toHaveCount(1)
  const href = await link.getAttribute('href')
  return Number(href.split('/').pop())
}

// Cuantas filas tiene la lista. Con la paginacion de la app esto solo cuenta
// la pagina visible, asi que sirve para comparar admin vs tecnico y no como
// conteo absoluto.
async function contarOrdenes(page) {
  await page.goto('/ordenes')
  await page.locator('tbody').waitFor()
  return page.locator('tbody tr').count()
}

test.describe('permisos por rol', () => {
  test('el admin edita una orden y la borra', async ({ page }) => {
    // Editar va por la funcion actualizar_orden, que todavia no esta creada.
    test.skip(
      !migracionDePermisosAplicada(),
      'Setear E2E_PERMISOS=1 despues de aplicar interno/aplicar_rls_ordenes.sql'
    )
    await login(page)
    await crearOrden(page, MARCA_EDITAR)
    await abrirOrden(page, MARCA_EDITAR)

    await page.click('a:has-text("Editar")')
    await expect(page).toHaveURL(/\/ordenes\/\d+\/editar$/)

    const titulo = page.getByLabel('Título')
    await expect(titulo).toHaveValue(MARCA_EDITAR)
    await titulo.fill(`${MARCA_EDITAR} editado`)
    await page.getByRole('button', { name: 'Guardar Cambios' }).click()

    await expect(page).toHaveURL(/\/ordenes\/\d+$/)
    await expect(page.getByRole('heading', { name: `${MARCA_EDITAR} editado` })).toBeVisible()

    await page.click('button:has-text("Eliminar")')
    await page.click('button:has-text("Aceptar")')
    await expect(page).toHaveURL('/ordenes')
  })

  test('el operador no puede crear, completar, editar ni borrar', async ({ page }) => {
    test.skip(!hayCredencialesDeOperador(), 'Faltan E2E_OPERADOR_* en el .env')
    await loginComoOperador(page)
    await page.goto('/ordenes')
    await page.locator('tbody tr a:has-text("Ver detalle")').first().click()
    await expect(page).toHaveURL(/\/ordenes\/\d+$/)

    await expect(page.getByRole('button', { name: 'Completar' })).toHaveCount(0)
    await expect(page.getByText('Editar', { exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Eliminar' })).toHaveCount(0)
    // Pero si puede leer y exportar
    await expect(page.getByRole('button', { name: 'PDF' })).toBeVisible()
  })

  test('el operador no ve los CTA de alta', async ({ page }) => {
    test.skip(!hayCredencialesDeOperador(), 'Faltan E2E_OPERADOR_* en el .env')
    await loginComoOperador(page)

    await expect(page.getByTestId('cta-nueva-orden')).toHaveCount(0)
    await page.goto('/ordenes')
    await expect(page.getByText('+ Nueva Orden')).toHaveCount(0)
    await page.goto('/compras')
    await expect(page.getByText('+ Nueva Compra')).toHaveCount(0)
  })

  test('el operador no entra a Reportes', async ({ page }) => {
    test.skip(!hayCredencialesDeOperador(), 'Faltan E2E_OPERADOR_* en el .env')
    await loginComoOperador(page)

    await page.goto('/reportes')
    await expect(page).toHaveURL('/')
  })

  test('el tecnico no entra a Reportes', async ({ page }) => {
    test.skip(!hayCredencialesDeTecnico(), 'Faltan E2E_TECNICO_* en el .env')
    await loginComoTecnico(page)

    // Reportes le queda oculto en el menu y la URL rebota
    await expect(page.getByText('Reportes')).toHaveCount(0)
    await page.goto('/reportes')
    await expect(page).toHaveURL('/')

    // Lo de "no borra" no se afirma aca a proposito: necesita una orden en su
    // lista, y despues del RLS el tecnico puede no tener ninguna. Va en el test
    // gated, que crea la suya y sabe que existe.
  })

  test('el tecnico si puede crear ordenes y compras', async ({ page }) => {
    test.skip(!hayCredencialesDeTecnico(), 'Faltan E2E_TECNICO_* en el .env')
    await loginComoTecnico(page)

    await page.goto('/ordenes')
    await expect(page.getByText('+ Nueva Orden')).toBeVisible()
    await page.goto('/compras')
    await expect(page.getByText('+ Nueva Compra')).toBeVisible()
    // Necesita poder generar la lista, asi que entra al formulario. Esperamos
    // el heading y no solo la URL: asi el form finishes de cargar y no queda un
    // fetch en vuelo cuando Playwright cierra el contexto.
    await page.click('a:has-text("+ Nueva Compra")')
    await expect(page).toHaveURL('/compras/nueva')
    await expect(page.getByRole('heading', { name: 'Nueva Orden de Compra' })).toBeVisible()
  })

  test('el tecnico no ve el item Tecnicos ni entra a la pagina', async ({ page }) => {
    test.skip(!hayCredencialesDeTecnico(), 'Faltan E2E_TECNICO_* en el .env')
    await loginComoTecnico(page)

    await expect(page.getByText('Técnicos')).toHaveCount(0)
    await page.goto('/tecnicos')
    await expect(page).toHaveURL('/')
  })

  test('el select de tecnico del alta solo ofrece su propio nombre', async ({ page }) => {
    test.skip(!hayCredencialesDeTecnico(), 'Faltan E2E_TECNICO_* en el .env')
    await loginComoTecnico(page)

    await page.goto('/ordenes/nueva')
    const select = page.getByLabel('Técnico (vos)')
    await expect(select).toBeVisible()
    // El select se pinta con "Sin asignar" solo y las fichas se agregan cuando
    // resuelve la query de tecnicos. Contar apenas aparece el select da un
    // falso 0 y el test falla segun cuanta tarde la red.
    const opciones = select.locator('option')
    await expect(opciones).toHaveCount(2)
    // El RLS no le deja asignar a otro, asi que el select no ofrece mas que
    // su propia ficha. Con otra seria la cuenta ajena expuesta en el propio HTML.
    await expect(opciones.nth(0)).toHaveText('Sin asignar')
    await expect(opciones.nth(1)).not.toHaveText('Sin asignar')
  })

  test('el tecnico edita su propia orden y no puede cambiar el tecnico', async ({ browser }) => {
    // Editar va por la funcion actualizar_orden, que todavia no esta creada.
    test.skip(
      !migracionDePermisosAplicada(),
      'Setear E2E_PERMISOS=1 despues de aplicar interno/aplicar_rls_ordenes.sql'
    )
    test.skip(!hayCredencialesDeTecnico(), 'Faltan E2E_TECNICO_* en el .env')

    // Tres logins mas un alta y un borrado. Con el default de 30s de Playwright
    // se va al timeout a mitad de camino y deja la orden huerfana.
    test.setTimeout(120000)

    const baseURL = test.info().project.use.baseURL
    const idTecnico = idDeTecnicoE2E()
    const titulo = `Test Order E2E permisos ${SELLO}`

    // Un contexto por rol en vez de un test con tres logins. El logout de la
    // app dispara supabase.auth.signOut() sin await, asi que el goto siguiente
    // corre contra la sesion vieja y /login redirige al dashboard. Con
    // contextos no hay logout que sincronizar y cada rol entra con localStorage
    // limpio.
    const ctxAdmin = await browser.newContext({ baseURL })
    const admin = await ctxAdmin.newPage()
    let ordenId

    try {
      await login(admin)
      // Cuantas ve el admin: el termino de comparacion para el scoping de abajo.
      const veAdmin = await contarOrdenes(admin)

      await crearOrden(admin, titulo, String(idTecnico))
      ordenId = await ordenIdDeTitulo(admin, titulo)

      const ctxTecnico = await browser.newContext({ baseURL })
      const tec = await ctxTecnico.newPage()
      await loginComoTecnico(tec)

      // El RLS deberia recortar la lista del tecnico. Comparar contra la del
      // admin en vez de contra un numero fijo: si ve menos que el admin, el
      // scoping esta funcionando, y el test no se rompe cada vez que cargan una
      // orden. Sin el RLS los dos ven las mismas y esto falla, que es lo que
      // distingue un run con migracion de uno sin ella.
      const veTecnico = await contarOrdenes(tec)
      expect(veTecnico).toBeGreaterThanOrEqual(1)
      expect(veTecnico).toBeLessThan(veAdmin)

      await abrirOrden(tec, titulo)

      // Borrar nunca, para ningun estado.
      await expect(tec.getByRole('button', { name: 'Eliminar' })).toHaveCount(0)

      await tec.click('a:has-text("Editar")')
      await expect(tec).toHaveURL(new RegExp(`/ordenes/${ordenId}/editar$`))

      // El tecnico asignado no es editable: se muestra como texto
      await expect(tec.getByLabel('Técnico')).toHaveCount(0)
      await expect(tec.getByText(/pedile a un supervisor/i)).toBeVisible()

      await tec.getByLabel('Descripción').fill('Editada por el tecnico en el E2E')
      await tec.getByRole('button', { name: 'Guardar Cambios' }).click()

      await expect(tec).toHaveURL(new RegExp(`/ordenes/${ordenId}$`))
      await expect(tec.getByText('Editada por el tecnico en el E2E')).toBeVisible()

      await ctxTecnico.close()
    } finally {
      // El tecnico no puede borrar, asi que la limpieza la hace el admin. Sin
      // esto cada corrida deja una orden huerfana en la base real.
      if (ordenId !== undefined) {
        const ctxLimpieza = await browser.newContext({ baseURL })
        const limp = await ctxLimpieza.newPage()
        await login(limp)
        await limp.goto(`/ordenes/${ordenId}`)
        await limp.click('button:has-text("Eliminar")')
        await limp.click('button:has-text("Aceptar")')
        await expect(limp).toHaveURL('/ordenes')
        await ctxLimpieza.close()
      }
      await ctxAdmin.close()
    }
  })
})
