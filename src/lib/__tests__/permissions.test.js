import { describe, it, expect } from 'vitest'
import { puede, permisos, esSupervision } from '../permissions'

const ROLES = ['admin', 'supervisor', 'tecnico', 'operador']
const CAPACIDADES = Object.keys(
  permisos('admin')
)

describe('permissions', () => {
  it('admin y supervisor pueden todo', () => {
    for (const rol of ['admin', 'supervisor']) {
      for (const cap of CAPACIDADES) {
        expect(puede(rol, cap), `${rol} deberia poder ${cap}`).toBe(true)
      }
    }
  })

  it('el tecnico crea ordenes y completa, pero no edita campos ni borra', () => {
    expect(puede('tecnico', 'crearOrden')).toBe(true)
    expect(puede('tecnico', 'completarOrden')).toBe(true)
    expect(puede('tecnico', 'crearCompra')).toBe(true)
    expect(puede('tecnico', 'editarOrden')).toBe(false)
    expect(puede('tecnico', 'borrarOrden')).toBe(false)
    expect(puede('tecnico', 'borrarCompra')).toBe(false)
    expect(puede('tecnico', 'cambiarEstadoCompra')).toBe(false)
    expect(puede('tecnico', 'verReportes')).toBe(false)
  })

  it('el tecnico no ve todas las ordenes: el RLS le filtra las suyas', () => {
    expect(puede('tecnico', 'verTodasLasOrdenes')).toBe(false)
  })

  it('el operador es solo lectura', () => {
    for (const cap of CAPACIDADES) {
      if (cap === 'verTodasLasOrdenes') continue
      expect(puede('operador', cap), `operador no deberia poder ${cap}`).toBe(false)
    }
    expect(puede('operador', 'verTodasLasOrdenes')).toBe(true)
  })

  it('un rol desconocido no puede nada', () => {
    for (const cap of CAPACIDADES) {
      expect(puede('superadmin', cap)).toBe(false)
      expect(puede(undefined, cap)).toBe(false)
      expect(puede('', cap)).toBe(false)
    }
  })

  it('una capacidad inventada nunca da true', () => {
    for (const rol of ROLES) {
      expect(puede(rol, 'borrarTodo')).toBe(false)
    }
  })

  it('esSupervision solo reconoce admin y supervisor', () => {
    expect(esSupervision('admin')).toBe(true)
    expect(esSupervision('supervisor')).toBe(true)
    expect(esSupervision('tecnico')).toBe(false)
    expect(esSupervision('operador')).toBe(false)
    expect(esSupervision(undefined)).toBe(false)
  })

  it('todos los roles tienen entrada para todas las capacidades', () => {
    for (const rol of ROLES) {
      expect(Object.keys(permisos(rol)).sort()).toEqual([...CAPACIDADES].sort())
    }
  })
})
