import { describe, it, expect } from 'vitest'
import { formatDate, estados, prioridades, estadosCompra, priorityColors, statusColors, statusCompraColors, estadoColors, estadoLabels } from '../constants'

describe('formatDate', () => {
  it('converts ISO date to DD/MM/YYYY', () => {
    expect(formatDate('2026-06-01')).toBe('01/06/2026')
  })

  it('handles null or undefined', () => {
    expect(formatDate(null)).toBe('')
    expect(formatDate(undefined)).toBe('')
  })

  it('handles empty string', () => {
    expect(formatDate('')).toBe('')
  })
})

describe('estados', () => {
  it('contains expected keys and labels', () => {
    expect(estados.pendiente).toBe('Pendiente')
    expect(estados.en_progreso).toBe('En Progreso')
    expect(estados.completada).toBe('Completada')
  })
})

describe('prioridades', () => {
  it('contains expected keys and labels', () => {
    expect(prioridades.urgente).toBe('Urgente')
    expect(prioridades.alta).toBe('Alta')
    expect(prioridades.media).toBe('Media')
    expect(prioridades.baja).toBe('Baja')
  })
})

describe('estadosCompra', () => {
  it('contains expected keys and labels', () => {
    expect(estadosCompra.pendiente).toBe('Pendiente')
    expect(estadosCompra.en_curso).toBe('En Curso')
    expect(estadosCompra.recibido).toBe('Recibido')
  })
})

describe('color maps', () => {
  it('priorityColors has all priorities', () => {
    expect(Object.keys(priorityColors)).toEqual(['urgente', 'alta', 'media', 'baja'])
  })

  it('statusColors has all states', () => {
    expect(Object.keys(statusColors)).toEqual(['pendiente', 'en_progreso', 'completada'])
  })

  it('statusCompraColors has all compra states', () => {
    expect(Object.keys(statusCompraColors)).toEqual(['pendiente', 'en_curso', 'recibido'])
  })

  it('estadoColors has all equipo estados', () => {
    expect(Object.keys(estadoColors)).toEqual(['operativo', 'averiado', 'mantenimiento'])
  })
})

describe('estadoLabels', () => {
  it('maps correctly', () => {
    expect(estadoLabels.operativo).toBe('Operativo')
    expect(estadoLabels.averiado).toBe('Averiado')
    expect(estadoLabels.mantenimiento).toBe('En Mantenimiento')
  })
})
