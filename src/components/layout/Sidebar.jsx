import { NavLink, Link } from 'react-router-dom'
import { FiTool, FiSun, FiMoon } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'

const links = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/ordenes', label: 'Órdenes', icon: '📋' },
  { to: '/compras', label: 'Compras', icon: '🛒' },
  { to: '/equipos', label: 'Equipos', icon: '⚙️' },
  { to: '/tecnicos', label: 'Técnicos', icon: '👷' },
  { to: '/calendario', label: 'Calendario', icon: '📅' },
  { to: '/reportes', label: 'Reportes', icon: '📈' },
]

export default function Sidebar({ onClose }) {
  const { perfil, logout } = useAuth()
  const { dark, toggle } = useTheme()

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col h-full">
      <Link
        to="/"
        onClick={onClose}
        className="p-5 border-b border-slate-700 flex items-center justify-center hover:bg-blue-900/30 transition-colors"
      >
        <FiTool className="w-8 h-8 text-blue-400" />
      </Link>
      <nav className="flex-1 p-3 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-800 text-white'
                  : 'text-slate-300 hover:bg-blue-900/50 hover:text-white'
              }`
            }
          >
            <span className="text-lg">{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-4 py-2 border-t border-slate-700">
        <button
          onClick={toggle}
          className="flex items-center gap-3 w-full px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          {dark ? <FiSun className="w-4 h-4" /> : <FiMoon className="w-4 h-4" />}
          {dark ? 'Modo claro' : 'Modo oscuro'}
        </button>
      </div>
      <div className="p-4 border-t border-slate-700 space-y-2">
        {perfil && (
          <Link to="/perfil" onClick={onClose} className="flex items-center gap-3 hover:bg-slate-800 rounded-lg p-2 -mx-2 transition-colors">
            {perfil.avatar_url ? (
              <img src={perfil.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                {perfil.nombre.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="text-xs text-slate-400 min-w-0">
              <p className="text-sm text-white font-medium truncate">{perfil.nombre}</p>
              <p className="capitalize">{perfil.rol}</p>
            </div>
          </Link>
        )}
        <button
          onClick={() => { logout(); onClose?.() }}
          className="w-full text-xs text-slate-400 hover:text-white transition-colors text-left"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
