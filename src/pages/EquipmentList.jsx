import { Link } from 'react-router-dom'
import { useEquipos } from '../hooks/useMockData'

const estadoColors = {
  operativo: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  averiado: 'bg-red-100 text-red-700 border-red-200',
  mantenimiento: 'bg-amber-100 text-amber-700 border-amber-200',
}

const estadoLabels = {
  operativo: 'Operativo',
  averiado: 'Averiado',
  mantenimiento: 'En Mantenimiento',
}

export default function EquipmentList() {
  const { data: equipos, isLoading } = useEquipos()

  if (isLoading) return <div className="text-slate-500">Cargando equipos...</div>
  if (!equipos) return <div className="text-red-500">Error al cargar equipos</div>

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {equipos.map((equipo) => (
          <Link
            key={equipo.id}
            to={`/equipos/${equipo.id}`}
            className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-lg">
                ⚙️
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${estadoColors[equipo.estado]}`}>
                {estadoLabels[equipo.estado]}
              </span>
            </div>
            <h3 className="font-semibold text-slate-800">{equipo.nombre}</h3>
            <p className="text-xs text-slate-500 mt-1">{equipo.codigo}</p>
            <p className="text-xs text-slate-400 mt-2">{equipo.ubicacion}</p>
            <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
              <p>Próx. mantenimiento: {equipo.proximoMantenimiento}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
