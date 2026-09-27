import { describe, it, expect } from 'vitest'
import { miTecnicoId, tecnicoNoResuelto } from '../identidad'

const TECNICOS = [
  { id: 1, nombre: 'Carlos', email: 'tec@imaemantenimiento.com' },
  { id: 10, nombre: 'Yo', email: 'YO@imaemantenimiento.com' },
  { id: 11, nombre: 'Beto', email: 'beto@imaemantenimiento.com' },
]

describe('miTecnicoId', () => {
  it('resuelve la ficha por email, como hace mi_tecnico_id() del RLS', () => {
    expect(miTecnicoId(TECNICOS, { email: 'tec@imaemantenimiento.com' })).toBe(1)
    expect(miTecnicoId(TECNICOS, { email: 'beto@imaemantenimiento.com' })).toBe(11)
  })

  it('ignora mayusculas, del mismo modo que el lower() de las dos partes', () => {
    expect(miTecnicoId(TECNICOS, { email: 'yo@imaemantenimiento.com' })).toBe(10)
    expect(miTecnicoId(TECNICOS, { email: 'YO@IMAE MANTENIMIENTO.COM'.replace(' ', '') })).toBe(10)
  })

  it('devuelve null si el email no esta en la tabla', () => {
    expect(miTecnicoId(TECNICOS, { email: 'nadie@imaemantenimiento.com' })).toBeNull()
  })

  it('no explota con datos a medias', () => {
    expect(miTecnicoId(undefined, { email: 'tec@imaemantenimiento.com' })).toBeNull()
    expect(miTecnicoId(TECNICOS, undefined)).toBeNull()
    expect(miTecnicoId(TECNICOS, {})).toBeNull()
    // una ficha sin email no deberia matchear contra undefined
    expect(miTecnicoId([{ id: 5, nombre: 'Sin mail' }], { email: 'x@y.com' })).toBeNull()
  })
})

describe('tecnicoNoResuelto', () => {
  it('avisa cuando un rol tecnico no tiene ficha', () => {
    expect(tecnicoNoResuelto(TECNICOS, { rol: 'tecnico', email: 'nadie@imaemantenimiento.com' })).toBe(true)
    expect(tecnicoNoResuelto([], { rol: 'tecnico', email: 'tec@imaemantenimiento.com' })).toBe(true)
  })

  it('no se activa si la ficha esta o si el rol no es tecnico', () => {
    expect(tecnicoNoResuelto(TECNICOS, { rol: 'tecnico', email: 'tec@imaemantenimiento.com' })).toBe(false)
    expect(tecnicoNoResuelto(TECNICOS, { rol: 'admin', email: 'nadie@imaemantenimiento.com' })).toBe(false)
    expect(tecnicoNoResuelto(undefined, undefined)).toBe(false)
  })
})
