import { describe, it, expect } from 'vitest'
import { cargarPdf } from '../pdf'

describe('cargarPdf', () => {
  it('devuelve jsPDF y autoTable ya resueltos', async () => {
    const { jsPDF, autoTable } = await cargarPdf()

    // El interop de los dos paquetes es el riesgo real de este modulo:
    // jspdf-autotable es CommonJS, asi que si el .default no se resuelve
    // autoTable queda undefined y la exportacion revienta al primer click.
    expect(typeof jsPDF).toBe('function')
    expect(typeof autoTable).toBe('function')
  })

  it('permite construir un documento y aplicarle una tabla', async () => {
    const { jsPDF, autoTable } = await cargarPdf()

    const doc = new jsPDF()
    doc.text('Control de Mantenimiento', 14, 22)
    autoTable(doc, { head: [['ID']], body: [['#1']] })

    expect(doc.output('arraybuffer').byteLength).toBeGreaterThan(0)
  })

  it('cachea la promesa, para no volver a importar en cada exportacion', async () => {
    expect(cargarPdf()).toBe(cargarPdf())
  })
})
