import { useEffect, useRef } from 'react'
import { FiDownload, FiMenu, FiMonitor, FiMoreVertical, FiShare2, FiSmartphone, FiX } from 'react-icons/fi'
import { PASOS } from '../lib/instalacion'

// La lib guarda los nombres de los iconos y no los componentes, para no
// atarla a react-icons y poder testearla sin renderizar nada.
const ICONOS = {
  compartir: FiShare2,
  'tres-puntos': FiMoreVertical,
  movil: FiSmartphone,
  menu: FiMenu,
  monitor: FiMonitor,
}

export default function InstallPrompt({ abierto, plataforma, evento, instalar, cerrarTemporal, descartar }) {
  const panel = useRef(null)

  useEffect(() => {
    if (!abierto) return
    // No se bloquea el scroll del body porque Layout ya lo maneja para el
    // drawer del sidebar y las dos capas se pisan al limpiar.
    const previo = document.activeElement
    panel.current?.focus()
    const alEscape = (e) => {
      if (e.key === 'Escape') cerrarTemporal()
    }
    document.addEventListener('keydown', alEscape)
    return () => {
      document.removeEventListener('keydown', alEscape)
      if (previo instanceof HTMLElement) previo.focus()
    }
  }, [abierto, cerrarTemporal])

  if (!abierto) return null

  const pasos = PASOS[plataforma] ?? []

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onClick={cerrarTemporal}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-instalar"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="sheet-enter w-full max-w-sm rounded-t-2xl bg-white p-5 shadow-xl outline-none dark:bg-slate-800 sm:rounded-2xl"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-600 sm:hidden" />

        <div className="flex items-start gap-3">
          <img src="/icons/icon-192.png" alt="" className="h-14 w-14 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1">
            <p
              id="titulo-instalar"
              className="text-base font-semibold text-slate-900 dark:text-slate-100"
            >
              Instala IMAE como app
            </p>
          </div>
          <button
            onClick={descartar}
            aria-label="No mostrar de nuevo"
            title="No mostrar de nuevo"
            className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {pasos.length > 0 && (
          <ol className="mt-4 space-y-2">
            {pasos.map((paso) => {
              const Icono = ICONOS[paso.icono]
              return (
                <li
                  key={paso.n}
                  className="flex items-center gap-3 rounded-lg bg-slate-50 p-2.5 dark:bg-slate-700/50"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                    {paso.n}
                  </span>
                  {Icono && <Icono className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-300" />}
                  <span className="text-sm text-slate-700 dark:text-slate-200">{paso.texto}</span>
                </li>
              )
            })}
          </ol>
        )}

        <div className="mt-5">
          {evento ? (
            <button
              onClick={instalar}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              <FiDownload className="h-4 w-4" />
              Instalar
            </button>
          ) : (
            <button
              onClick={descartar}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Entendido
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
