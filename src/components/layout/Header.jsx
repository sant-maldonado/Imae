import { useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const titles = {
  '/': 'Dashboard',
  '/ordenes': 'Órdenes de Trabajo',
  '/compras': 'Compras',
  '/equipos': 'Equipos',
  '/tecnicos': 'Técnicos',
  '/calendario': 'Calendario',
  '/reportes': 'Reportes',
}

export default function Header({ onToggleSidebar }) {
  const location = useLocation()
  const basePath = '/' + location.pathname.split('/')[1]
  const title = titles[basePath] || 'Control de Mantenimiento'
  const { perfil } = useAuth()

  return (
    <header className="h-16 bg-slate-200 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 flex items-center justify-between px-3 md:px-6">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-2 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0"
          aria-label="Abrir menú"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h2 className="text-lg md:text-xl font-semibold text-slate-800 dark:text-slate-100 truncate">{title}</h2>
      </div>
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        <span className="text-xs md:text-sm text-slate-500 dark:text-slate-400 hidden sm:block">{perfil?.nombre || 'Usuario'}</span>
        <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs md:text-sm font-medium">
          {perfil?.nombre?.charAt(0).toUpperCase() || 'U'}
        </div>
      </div>
    </header>
  )
}
