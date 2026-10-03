import { describe, it, expect } from 'vitest'
import { formatDate, formatDateTime, estados, prioridades, estadosCompra, priorityColors, statusColors, statusCompraColors, estadoColors, estadoLabels } from '../constants'

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

  it('drops the time from a TIMESTAMPTZ value', () => {
    expect(formatDate('2026-09-27T19:46:29.524591+00:00')).toBe('27/09/2026')
  })
})

describe('formatDateTime', () => {
  // La hora es la local del que mira, asi que el esperado se arma con el mismo
  // Date: si el test fija un numero, falla en cualquier maquina que no este en
  // la misma zona horaria.
  const dos = (n) => String(n).padStart(2, '0')
  const esperado = (iso) => {
    const d = new Date(iso)
    return `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()} ${dos(d.getHours())}:${dos(d.getMinutes())}`
  }

  it('usa el mismo dd/mm/aaaa que formatDate y le suma la hora local', () => {
    const iso = '2026-09-27T19:46:29.524591+00:00'
    expect(formatDateTime(iso)).toBe(esperado(iso))
  })

  it('no usa hora de 12 ni ano de dos cifras, que en un papel junto a formatDate parece otra fuente', () => {
    const salida = formatDateTime('2026-09-27T19:46:29.524591+00:00')
    expect(salida).not.toMatch(/a\. m\./)
    expect(salida).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/)
  })

  it('cae a formatDate cuando el valor no trae hora', () => {
    expect(formatDateTime('2026-06-01')).toBe('01/06/2026')
  })

  it('handles null or undefined', () => {
    expect(formatDateTime(null)).toBe('')
    expect(formatDateTime(undefined)).toBe('')
    expect(formatDateTime('')).toBe('')
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
