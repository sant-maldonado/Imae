import { useEffect, useRef } from 'react'
import { FiDownload, FiMenu, FiMonitor, FiMoreVertical, FiShare2, FiSmartphone, FiX } from 'react-icons/fi'

// Los nombres de los items de menu cambian por idioma, asi que cada paso
// describe donde mirarlo ademas de citar la etiqueta.
const PASOS = {
  ios: [
    { n: 1, icono: FiShare2, texto: 'Tocá Compartir' },
    { n: 2, icono: FiSmartphone, texto: 'Elegí Agregar a pantalla de inicio' },
  ],
  android: [
    { n: 1, icono: FiMoreVertical, texto: 'Abrí el menú del navegador' },
    { n: 2, icono: FiSmartphone, texto: 'Elegí Agregar a pantalla de inicio' },
  ],
  mac: [
    { n: 1, icono: FiMenu, texto: 'Menú Archivo, arriba a la izquierda' },
    { n: 2, icono: FiMonitor, texto: 'Agregar al Dock' },
  ],
}

export default function InstallPrompt({ abierto, plataforma, evento, instalar, cerrar }) {
  const panel = useRef(null)

  useEffect(() => {
    if (!abierto) return
    // No se bloquea el scroll del body porque Layout ya lo maneja para el
    // drawer del sidebar y las dos capas se pisan al limpiar.
    const previo = document.activeElement
    panel.current?.focus()
    const alEscape = (e) => {
      if (e.key === 'Escape') cerrar()
    }
    document.addEventListener('keydown', alEscape)
    return () => {
      document.removeEventListener('keydown', alEscape)
      if (previo instanceof HTMLElement) previo.focus()
    }
  }, [abierto, cerrar])

  if (!abierto) return null

  const pasos = PASOS[plataforma] ?? []

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onClick={cerrar}
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
              Agregar IMAE a tu pantalla
            </p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Abrila desde el ícono, sin barra de navegador. Ocupa casi nada de espacio.
            </p>
          </div>
          <button
            onClick={cerrar}
            aria-label="Cerrar"
            className="-mr-1 -mt-1 shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {pasos.length > 0 && (
          <ol className="mt-4 space-y-2">
            {pasos.map((paso) => (
              <li
                key={paso.n}
                className="flex items-center gap-3 rounded-lg bg-slate-50 p-2.5 dark:bg-slate-700/50"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                  {paso.n}
                </span>
                <paso.icono className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-300" />
                <span className="text-sm text-slate-700 dark:text-slate-200">{paso.texto}</span>
              </li>
            ))}
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
              onClick={cerrar}
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
