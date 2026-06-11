import { useLogs } from '../hooks/useApi'
import { formatDate } from '../lib/constants'

const accionLabels = {
  creada: 'Creada',
  actualizada: 'Actualizada',
  estado_cambiado: 'Estado cambiado',
  eliminada: 'Eliminada',
}

const campoLabels = {
  estado: 'Estado',
  prioridad: 'Prioridad',
}

export default function LogHistory({ ordenId }) {
  const { data: logs } = useLogs(ordenId)

  if (!logs || logs.length === 0) return null

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 md:p-6">
      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Historial de cambios</h4>
      <div className="space-y-2">
        {logs.map((log) => (
          <div key={log.id} className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-medium text-slate-600 dark:text-slate-300">{accionLabels[log.accion] || log.accion}</span>
              {log.campo && (
                <> — {campoLabels[log.campo] || log.campo}: <span className="text-slate-400">{log.valorAnterior}</span> → <span className="text-slate-600 dark:text-slate-300">{log.valorNuevo}</span></>
              )}
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                {formatDate(log.createdAt)} — {log.usuarioNombre}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
