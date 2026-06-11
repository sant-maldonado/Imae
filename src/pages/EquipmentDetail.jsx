import { useParams, Link } from 'react-router-dom'
import { useEquipo, useOrdenes } from '../hooks/useApi'
import { estados, prioridades, estadoColors, estadoLabels, statusColors, formatDate } from '../lib/constants'
import { SkeletonCard } from '../components/Skeleton'

export default function EquipmentDetail() {
  const { id } = useParams()
  const { data: equipo, isLoading: loadingEquipo } = useEquipo(id)
  const { data: ordenes } = useOrdenes()

  if (loadingEquipo) return <SkeletonCard />
  if (!equipo) return <div className="text-slate-500">Equipo no encontrado</div>

  const ordenesEquipo = ordenes?.filter((o) => o.equipoId === Number(id)) || []

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-start gap-3 mb-4">
          <div className="flex-1">
            <h3 className="text-lg md:text-xl font-semibold text-slate-800 dark:text-slate-100">{equipo.nombre}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{equipo.codigo}</p>
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border shrink-0 ${estadoColors[equipo.estado]}`}>
            {estadoLabels[equipo.estado]}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-500 dark:text-slate-400">Ubicación</p>
            <p className="font-medium text-slate-700 dark:text-slate-200 mt-1">{equipo.ubicacion}</p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400">Último mantenimiento</p>
            <p className="font-medium text-slate-700 dark:text-slate-200 mt-1">{formatDate(equipo.ultimoMantenimiento)}</p>
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400">Próximo mantenimiento</p>
            <p className="font-medium text-slate-700 dark:text-slate-200 mt-1">{formatDate(equipo.proximoMantenimiento)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h4 className="font-semibold text-slate-700 dark:text-slate-200 mb-4">Historial de Órdenes</h4>
        {ordenesEquipo.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">Sin órdenes registradas</p>
        ) : (
          <div className="space-y-3">
            {ordenesEquipo.map((orden) => (
              <Link
                key={orden.id}
                to={`/ordenes/${orden.id}`}
                className="flex items-center justify-between gap-2 p-3 rounded-lg border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{orden.titulo}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{formatDate(orden.fechaProgramada)}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusColors[orden.estado]}`}>
                    {estados[orden.estado]}
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                    orden.prioridad === 'urgente' ? 'bg-red-100 text-red-700 border-red-200' :
                    orden.prioridad === 'alta' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                    orden.prioridad === 'media' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                    'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {prioridades[orden.prioridad]}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
