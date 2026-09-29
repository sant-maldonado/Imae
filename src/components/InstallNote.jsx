import { FiDownload, FiMenu, FiMonitor, FiMoreVertical, FiShare2, FiSmartphone, FiX } from 'react-icons/fi'
import { PASOS } from '../lib/instalacion'

const ICONOS = {
  compartir: FiShare2,
  'tres-puntos': FiMoreVertical,
  movil: FiSmartphone,
  menu: FiMenu,
  monitor: FiMonitor,
}

// Variante pasiva del aviso de instalacion, para la pantalla de login. No es un
// dialogo: no tapa el formulario, no roba el foco y no atrapa la tecla Escape.
// Va inline debajo del form, que es donde web.dev pide poner la llamada a la
// accion en una pagina de login, y los tonos slate-900/60 sobre el slate-800 de
// la tarjeta para que se funda en vez de parecer un parche.
//
// El cierre es un descarte de verdad, no un cierre temporal: es el unico punto
// donde el usuario puede decir que no sin entrar a la app.
export default function InstallNote({ plataforma, evento, instalar, descartar }) {
  const pasos = PASOS[plataforma] ?? []

  return (
    <section
      aria-label="Instalar IMAE"
      className="mt-4 rounded-xl border border-slate-700 bg-slate-900/60 p-3"
    >
      <div className="flex items-start gap-2.5">
        <img src="/icons/icon-192.png" alt="" className="h-9 w-9 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-100">Instalá IMAE como app</p>
          <p className="mt-0.5 text-xs text-slate-400">
            Se abre desde un ícono, sin barra de navegador.
          </p>
        </div>
        <button
          onClick={descartar}
          aria-label="No mostrar de nuevo"
          title="No mostrar de nuevo"
          className="-mr-1 -mt-1 shrink-0 rounded-lg p-1 text-slate-500 transition-colors hover:bg-slate-700 hover:text-slate-200"
        >
          <FiX className="h-4 w-4" />
        </button>
      </div>

      {evento ? (
        <button
          onClick={instalar}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700"
        >
          <FiDownload className="h-3.5 w-3.5" />
          Instalar
        </button>
      ) : (
        pasos.length > 0 && (
          <ol className="mt-3 space-y-1.5">
            {pasos.map((paso) => {
              const Icono = ICONOS[paso.icono]
              return (
                <li key={paso.n} className="flex items-center gap-2 text-xs text-slate-300">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-700 text-[10px] font-semibold text-slate-200">
                    {paso.n}
                  </span>
                  {Icono && <Icono className="h-3.5 w-3.5 shrink-0 text-slate-500" />}
                  <span>{paso.texto}</span>
                </li>
              )
            })}
          </ol>
        )
      )}
    </section>
  )
}
