import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useOrdenes, useTecnicos } from '../hooks/useMockData'
import { estados, prioridades } from '../lib/constants'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const priorityColors = {
  urgente: 'bg-red-100 text-red-700 border-red-200',
  alta: 'bg-amber-100 text-amber-700 border-amber-200',
  media: 'bg-blue-100 text-blue-700 border-blue-200',
  baja: 'bg-slate-100 text-slate-700 border-slate-200',
}

const statusColors = {
  pendiente: 'bg-amber-50 text-amber-700 border-amber-200',
  en_progreso: 'bg-blue-50 text-blue-700 border-blue-200',
  completada: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

export default function WorkOrders() {
  const { data: ordenes, isLoading } = useOrdenes()
  const { data: tecnicos } = useTecnicos()
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroPrioridad, setFiltroPrioridad] = useState('')
  const [filtroTecnico, setFiltroTecnico] = useState('')

  const tecnicosMap = {}
  tecnicos?.forEach((t) => { tecnicosMap[t.id] = t.nombre })

  const pendientesTecnico = useMemo(() => {
    if (!filtroTecnico || !ordenes) return []
    return ordenes.filter((o) => o.tecnicoId === Number(filtroTecnico) && o.estado === 'pendiente')
  }, [filtroTecnico, ordenes])

  const generarPDFPendientes = () => {
    const doc = new jsPDF()
    const nombreTecnico = tecnicosMap[Number(filtroTecnico)] || 'Técnico'

    doc.setFontSize(18)
    doc.text('Órdenes Pendientes', 14, 22)

    doc.setFontSize(11)
    doc.text(`Técnico: ${nombreTecnico}`, 14, 32)
    doc.text(`Total pendientes: ${pendientesTecnico.length}`, 14, 40)

    autoTable(doc, {
      startY: 48,
      head: [['ID', 'Título', 'Prioridad', 'Fecha Prog.', 'Descripción']],
      body: pendientesTecnico.map((o) => [
        `#${o.id}`,
        o.titulo,
        prioridades[o.prioridad],
        o.fechaProgramada,
        o.descripcion.length > 60 ? o.descripcion.slice(0, 60) + '...' : o.descripcion,
      ]),
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 9 },
    })

    doc.save(`ordenes_pendientes_${filtroTecnico}.pdf`)
  }

  if (isLoading) return <div className="text-slate-500">Cargando órdenes...</div>
  if (!ordenes) return <div className="text-red-500">Error al cargar órdenes</div>

  const filtradas = ordenes.filter((o) => {
    if (filtroEstado && o.estado !== filtroEstado) return false
    if (filtroPrioridad && o.prioridad !== filtroPrioridad) return false
    if (filtroTecnico && o.tecnicoId !== Number(filtroTecnico)) return false
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700"
          >
            <option value="">Todos los estados</option>
            {Object.entries(estados).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            value={filtroPrioridad}
            onChange={(e) => setFiltroPrioridad(e.target.value)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700"
          >
            <option value="">Todas las prioridades</option>
            {Object.entries(prioridades).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            value={filtroTecnico}
            onChange={(e) => setFiltroTecnico(e.target.value)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700"
          >
            <option value="">Todos los técnicos</option>
            {tecnicos?.filter((t) => t.activo).map((t) => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          {filtroTecnico && (
            <button
              onClick={generarPDFPendientes}
              className="bg-slate-700 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5"
            >
              PDF - Pendientes
            </button>
          )}
          <Link
            to="/ordenes/nueva"
            className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Nueva Orden
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 font-medium text-slate-600">ID</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Título</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Prioridad</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Técnico</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Estado</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Programada</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Acción</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((orden) => (
              <tr key={orden.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-500">#{orden.id}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{orden.titulo}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full border ${priorityColors[orden.prioridad]}`}>
                    {prioridades[orden.prioridad]}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{orden.tecnicoNombre || '-'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full border ${statusColors[orden.estado]}`}>
                    {estados[orden.estado]}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">{orden.fechaProgramada}</td>
                <td className="px-4 py-3">
                  <Link to={`/ordenes/${orden.id}`} className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                    Ver detalle
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtradas.length === 0 && (
          <p className="text-center text-slate-400 py-8">No se encontraron órdenes</p>
        )}
      </div>
    </div>
  )
}
