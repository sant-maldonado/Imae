import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useOrdenes, useTecnicos } from '../hooks/useApi'
import { estados, prioridades, priorityColors, statusColors, formatDate } from '../lib/constants'
import { SkeletonTable } from '../components/Skeleton'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function WorkOrders() {
  const { data: ordenes, isLoading } = useOrdenes()
  const { data: tecnicos } = useTecnicos()
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroPrioridad, setFiltroPrioridad] = useState('')
  const [filtroTecnico, setFiltroTecnico] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const tecnicosMap = useMemo(() => {
    const map = {}
    tecnicos?.forEach((t) => { map[t.id] = t.nombre })
    return map
  }, [tecnicos])

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

  if (isLoading) return <SkeletonTable rows={8} cols={7} />
  if (!ordenes) return <div className="text-red-500">Error al cargar órdenes</div>

  const filtradas = ordenes.filter((o) => {
    if (filtroEstado && o.estado !== filtroEstado) return false
    if (filtroPrioridad && o.prioridad !== filtroPrioridad) return false
    if (filtroTecnico && o.tecnicoId !== Number(filtroTecnico)) return false
    if (searchQuery && !o.titulo.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="Buscar por título..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 w-full sm:w-48"
          />
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <option value="">Todos los estados</option>
            {Object.entries(estados).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            value={filtroPrioridad}
            onChange={(e) => setFiltroPrioridad(e.target.value)}
            className="text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <option value="">Todas las prioridades</option>
            {Object.entries(prioridades).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            value={filtroTecnico}
            onChange={(e) => setFiltroTecnico(e.target.value)}
            className="text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
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

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">ID</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Título</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Prioridad</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Técnico</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Estado</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Programada</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Acción</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((orden) => (
              <tr key={orden.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">#{orden.id}</td>
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{orden.titulo}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full border ${priorityColors[orden.prioridad]}`}>
                    {prioridades[orden.prioridad]}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{orden.tecnicoNombre || '-'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full border ${statusColors[orden.estado]}`}>
                    {estados[orden.estado]}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatDate(orden.fechaProgramada)}</td>
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
          <p className="text-center text-slate-400 dark:text-slate-500 py-8">No se encontraron órdenes</p>
        )}
      </div>
    </div>
  )
}
