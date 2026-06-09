import { useTecnicos } from '../hooks/useApi'

export default function Technicians() {
  const { data: tecnicos, isLoading } = useTecnicos()

  if (isLoading) return <div className="text-slate-500">Cargando técnicos...</div>
  if (!tecnicos) return <div className="text-red-500">Error al cargar técnicos</div>

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tecnicos.map((tecnico) => (
          <div
            key={tecnico.id}
            className="bg-white rounded-xl border border-slate-200 p-5"
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
                <h3 className="font-semibold text-slate-800">{tecnico.nombre}</h3>
                <p className="text-xs text-slate-500">{tecnico.especialidad}</p>
              </div>
            </div>
            <div className="space-y-1 text-sm text-slate-500">
              <p>{tecnico.telefono}</p>
              <p className="text-slate-400">{tecnico.email}</p>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100">
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
