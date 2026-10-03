import { formatDateTime } from '../lib/constants'
import { accionLabels, campoLabels, valorDelLog } from '../lib/auditoria'

export default function LogHistory({ logs }) {
  if (!logs || logs.length === 0) return null

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 md:p-6">
      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Historial de cambios</h4>
      <div className="space-y-2">
        {logs.map((log) => (
          // Con testid porque el texto de cada fila se repite en la pagina: el
          // label del dato que cambio esta mas arriba, asi que un assert por
          // texto ("Fecha programada") matchea los dos y falla por ambiguedad.
          <div
            key={log.id}
            data-testid="log-historial"
            className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-medium text-slate-600 dark:text-slate-300">{accionLabels[log.accion] || log.accion}</span>
              {log.campo && (
                <> — {campoLabels[log.campo] || log.campo}: <span className="text-slate-400">{valorDelLog(log.campo, log.valorAnterior)}</span> → <span className="text-slate-600 dark:text-slate-300">{valorDelLog(log.campo, log.valorNuevo)}</span></>
              )}
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                {formatDateTime(log.createdAt)} — {log.usuarioNombre}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}