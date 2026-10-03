import { describe, it, expect } from 'vitest'
import { camposEditados, valorDesdeForm, valorDelLog } from '../auditoria'

const EQUIPOS = [{ id: 1, nombre: 'Torno CNC' }, { id: 2, nombre: 'Fresadora' }]
const TECNICOS = [{ id: 7, nombre: 'Marta López' }, { id: 8, nombre: 'Juan Pérez' }]

describe('valorDelLog', () => {
  it('traduce los enums con su label', () => {
    expect(valorDelLog('estado', 'completada')).toBe('Completada')
    expect(valorDelLog('prioridad', 'urgente')).toBe('Urgente')
    expect(valorDelLog('tipo_mantenimiento', 'preventivo')).toBe('Preventivo')
  })

  it('deja pasar lo que ya esta escrito', () => {
    expect(valorDelLog('tecnico', 'Marta López')).toBe('Marta López')
    expect(valorDelLog('titulo', 'Ajuste de mesa')).toBe('Ajuste de mesa')
  })

  it('no rompe con un valor vacio', () => {
    expect(valorDelLog('estado', null)).toBe('—')
    expect(valorDelLog('tecnico', undefined)).toBe('—')
  })

  it('muestra la fecha programada como fecha, no como ISO', () => {
    // El log guarda la fecha cruda porque es lo que viaja a la base, pero el
    // papel la tiene que mostrar como el resto de las fechas.
    expect(valorDelLog('fecha_programada', '2026-10-27')).toBe('27/10/2026')
    expect(valorDelLog('fecha_programada', '')).toBe('—')
  })
})

describe('valorDesdeForm', () => {
  it('resuelve los ids de equipo y tecnico a nombre', () => {
    const ctx = { equipos: EQUIPOS, tecnicos: TECNICOS }
    expect(valorDesdeForm('equipo', 2, ctx)).toBe('Fresadora')
    expect(valorDesdeForm('tecnico', 7, ctx)).toBe('Marta López')
  })

  it('dice Sin asignar cuando no hay ninguno', () => {
    const ctx = { equipos: EQUIPOS, tecnicos: TECNICOS }
    expect(valorDesdeForm('tecnico', '', ctx)).toBe('Sin asignar')
    expect(valorDesdeForm('equipo', null, ctx)).toBe('Sin asignar')
  })
})

describe('camposEditados', () => {
  const orden = {
    titulo: 'Ajuste de mesa',
    descripcion: 'Verificar paralelismo',
    equipoId: 1,
    tecnicoId: 7,
    prioridad: 'media',
    tipoMantenimiento: 'preventivo',
    fechaProgramada: '2026-10-20',
  }
  const ctx = { equipos: EQUIPOS, tecnicos: TECNICOS }

  it('devuelve solo lo que cambio, con los nombres resueltos', () => {
    const cambios = camposEditados(orden, { ...orden, prioridad: 'urgente', tecnicoId: 8 }, ctx)

    expect(cambios).toEqual([
      { campo: 'tecnico', valor_anterior: 'Marta López', valor_nuevo: 'Juan Pérez' },
      { campo: 'prioridad', valor_anterior: 'media', valor_nuevo: 'urgente' },
    ])
  })

  it('no devuelve nada si no cambio nada', () => {
    // Un "Actualizada" sin detalle no prueba que nadie rompio nada: solo ruido en
    // el historial que Calidad va a leer.
    expect(camposEditados(orden, { ...orden }, ctx)).toEqual([])
  })

  it('ignora los campos que no vinieron en el payload', () => {
    // Al tecnico se le saca el tecnicoId del payload a proposito porque no puede
    // reasignarse, con delete, o sea que la clave directamente no existe. Comparar
    // contra el form completo inventaria un cambio a "Sin asignar" que en
    // realidad no ocurrio. Este es exactamente el payload que recibe la pagina.
    const sinTecnico = { ...orden }
    delete sinTecnico.tecnicoId
    expect(camposEditados(orden, sinTecnico, ctx)).toEqual([])
  })

  it('trata null y cadena vacia como el mismo valor', () => {
    expect(camposEditados({ ...orden, tecnicoId: null }, { ...orden, tecnicoId: '' }, ctx)).toEqual([])
  })

  it('registra la reprogramacion de la fecha', () => {
    // La fecha es el campo que mas se toca en la practica: si reprogramar no
    // queda asentado, el historial no sirve para reconstruir cuando se prometio
    // intervene.
    expect(camposEditados(orden, { ...orden, fechaProgramada: '2026-10-27' }, ctx)).toEqual([
      { campo: 'fecha_programada', valor_anterior: '2026-10-20', valor_nuevo: '2026-10-27' },
    ])
  })
})