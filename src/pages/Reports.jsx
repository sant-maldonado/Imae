import { useState, useMemo } from 'react'
import { useOrdenes, useEquipos, useTecnicos } from '../hooks/useApi'
import { tiposMantenimiento } from '../lib/constants'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const COLORS = ['#f59e0b', '#3b82f6', '#10b981']

export default function Reports() {
  const { data: ordenes } = useOrdenes()
  const { data: equipos } = useEquipos()
  const { data: tecnicos } = useTecnicos()

  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')

  const ordenesFiltradas = useMemo(() => {
    if (!ordenes) return []
    return ordenes.filter((o) => {
      if (fechaInicio && o.fechaProgramada < fechaInicio) return false
      if (fechaFin && o.fechaProgramada > fechaFin) return false
      return true
    })
  }, [ordenes, fechaInicio, fechaFin])

  const datosPorEstado = useMemo(() => {
    return [
      { name: 'Pendientes', value: ordenesFiltradas.filter((o) => o.estado === 'pendiente').length },
      { name: 'En Progreso', value: ordenesFiltradas.filter((o) => o.estado === 'en_progreso').length },
      { name: 'Completadas', value: ordenesFiltradas.filter((o) => o.estado === 'completada').length },
    ]
  }, [ordenesFiltradas])

  const datosPorTipo = useMemo(() => {
    return Object.entries(tiposMantenimiento).map(([tipo, label]) => {
      const delTipo = ordenesFiltradas.filter((o) => o.tipoMantenimiento === tipo)
      return {
        name: label,
        completadas: delTipo.filter((o) => o.estado === 'completada').length,
        sinCompletar: delTipo.filter((o) => o.estado !== 'completada').length,
      }
    })
  }, [ordenesFiltradas])

  const exportarCSV = () => {
    if (!ordenesFiltradas) return
    const headers = 'ID,Título,Estado,Prioridad,Tipo,Fecha Creación,Fecha Programada\n'
    const rows = ordenesFiltradas.map((o) =>
      `${o.id},"${o.titulo}",${o.estado},${o.prioridad},${o.tipoMantenimiento},${o.fechaCreacion},${o.fechaProgramada}`
    ).join('\n')
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'reporte_ordenes.csv'
    link.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Reportes</h3>
        <button
          onClick={exportarCSV}
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Exportar CSV
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <div>
          <label htmlFor="reporte-desde" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Desde</label>
          <input
            id="reporte-desde"
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
          />
        </div>
        <div>
          <label htmlFor="reporte-hasta" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Hasta</label>
          <input
            id="reporte-hasta"
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
          />
        </div>
        {(fechaInicio || fechaFin) && (
          <button
            onClick={() => { setFechaInicio(''); setFechaFin('') }}
            className="text-sm text-blue-600 hover:text-blue-700 mt-4"
          >
            Limpiar filtros
          </button>
        )}
        {ordenesFiltradas && (
          <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">
            {ordenesFiltradas.length} de {ordenes?.length || 0} órdenes
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Órdenes por Estado</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={datosPorEstado} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label>
                {datosPorEstado.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Órdenes por Tipo de Mantenimiento</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={datosPorTipo}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="completadas" name="Completadas" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="sinCompletar" name="Sin completar" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Resumen General</h4>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Total órdenes</span>
              <span className="font-medium text-slate-800 dark:text-slate-100">{ordenesFiltradas?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Equipos registrados</span>
              <span className="font-medium text-slate-800 dark:text-slate-100">{equipos?.length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Técnicos activos</span>
              <span className="font-medium text-slate-800 dark:text-slate-100">{tecnicos?.filter((t) => t.activo).length || 0}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
              <span className="text-slate-500 dark:text-slate-400">Órdenes completadas</span>
              <span className="font-medium text-emerald-600">{ordenesFiltradas?.filter((o) => o.estado === 'completada').length || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Órdenes pendientes</span>
              <span className="font-medium text-amber-600">{ordenesFiltradas?.filter((o) => o.estado === 'pendiente').length || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
