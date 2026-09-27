import { test, expect } from '@playwright/test'
import {
  login,
  loginComoTecnico,
  loginComoOperador,
  hayCredencialesDeTecnico,
  hayCredencialesDeOperador,
  migracionDePermisosAplicada,
} from './helpers'

// Guards de UI por rol. Estos tests no dependen del RLS: pasan igual antes de
// aplicarlo, porque la UI oculta lo que el rol no puede tocar. Lo que el RLS
// agrega es que el tecnico tampoco pueda hacerlo por API, y eso se verifica a
// mano en el SQL Editor.

const SELLO = Date.now()
const MARCA_EDITAR = `Test Order E2E editar ${SELLO}`

async function crearOrden(page, titulo) {
  await page.goto('/ordenes/nueva')
  await page.getByLabel('Título').fill(titulo)
  await page.getByLabel('Descripción').fill('E2E edicion')
  await page.getByLabel('Técnico').selectOption({ index: 1 })
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

  test('el tecnico completa pero no edita ni borra', async ({ page }) => {
    test.skip(!hayCredencialesDeTecnico(), 'Faltan E2E_TECNICO_* en el .env')
    await loginComoTecnico(page)

    // Reportes le queda oculto en el menu y la URL rebota
    await expect(page.getByText('Reportes')).toHaveCount(0)
    await page.goto('/reportes')
    await expect(page).toHaveURL('/')

    await page.goto('/ordenes')
    await page.locator('tbody tr a:has-text("Ver detalle")').first().click()
    await expect(page).toHaveURL(/\/ordenes\/\d+$/)

    await expect(page.getByText('Editar', { exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Eliminar' })).toHaveCount(0)
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
})
