import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useEquipos } from '../hooks/useApi'
import { estadoColors, estadoLabels, formatDate } from '../lib/constants'
import { SkeletonCard } from '../components/Skeleton'

export default function EquipmentList() {
  const { data: equipos, isLoading } = useEquipos()
  const [searchQuery, setSearchQuery] = useState('')

  if (isLoading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  )
  if (!equipos) return <div className="text-red-500">Error al cargar equipos</div>

  const filtrados = equipos.filter((e) =>
    !searchQuery || e.nombre.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div>
      <input
        type="text"
        placeholder="Buscar por nombre..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 w-full sm:w-48 mb-4"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtrados.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
            <span className="text-4xl mb-3">🔧</span>
            <p className="text-sm">No se encontraron equipos</p>
          </div>
        ) : filtrados.map((equipo) => (
          <Link
            key={equipo.id}
            to={`/equipos/${equipo.id}`}
            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-lg">
                ⚙️
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${estadoColors[equipo.estado]}`}>
                {estadoLabels[equipo.estado]}
              </span>
            </div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">{equipo.nombre}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{equipo.codigo}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">{equipo.ubicacion}</p>
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
              <p>Próx. mantenimiento: {formatDate(equipo.proximoMantenimiento)}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
