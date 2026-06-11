import { useState } from 'react'
import { useTecnicos } from '../hooks/useApi'
import { SkeletonCard } from '../components/Skeleton'

export default function Technicians() {
  const { data: tecnicos, isLoading } = useTecnicos()
  const [searchQuery, setSearchQuery] = useState('')

  if (isLoading) return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  )
  if (!tecnicos) return <div className="text-red-500">Error al cargar técnicos</div>

  const filtrados = tecnicos.filter((t) =>
    !searchQuery || t.nombre.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div>
      <input
        type="text"
        placeholder="Buscar por nombre..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 w-full sm:w-auto mb-4"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtrados.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
            <span className="text-4xl mb-3">👤</span>
            <p className="text-sm">No se encontraron técnicos</p>
          </div>
        ) : filtrados.map((tecnico) => (
          <div
            key={tecnico.id}
            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              {tecnico.avatarUrl ? (
                <img src={tecnico.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">
                  {tecnico.nombre.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </div>
              )}
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">{tecnico.nombre}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{tecnico.especialidad}</p>
              </div>
            </div>
            <div className="space-y-1 text-sm text-slate-500 dark:text-slate-400">
              <p>{tecnico.telefono}</p>
              <p className="text-slate-400 dark:text-slate-500">{tecnico.email}</p>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                tecnico.activo
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                {tecnico.activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
