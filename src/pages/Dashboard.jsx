import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { HiOutlineClipboard, HiOutlineCalendar, HiOutlineCog, HiOutlineShoppingBag } from 'react-icons/hi2'

const quickLinks = [
  { to: '/ordenes', label: 'Ver Órdenes', icon: HiOutlineClipboard, color: 'bg-blue-600 hover:bg-blue-700' },
  { to: '/calendario', label: 'Calendario', icon: HiOutlineCalendar, color: 'bg-teal-600 hover:bg-teal-700' },
  { to: '/equipos', label: 'Equipos', icon: HiOutlineCog, color: 'bg-slate-700 hover:bg-slate-800' },
  { to: '/compras', label: 'Compras', icon: HiOutlineShoppingBag, color: 'bg-violet-600 hover:bg-violet-700' },
]

export default function Dashboard() {
  const { user, perfil } = useAuth()

  const nombre = perfil?.nombre || user?.email?.split('@')[0] || 'Usuario'
  const email = user?.email || ''
  const rol = perfil?.rol || 'tecnico'
  const inicial = nombre.charAt(0).toUpperCase()

  const rolLabel = {
    admin: 'Administrador',
    supervisor: 'Supervisor',
    tecnico: 'Técnico',
    operador: 'Operador',
  }

  return (
    <div className="min-h-full flex flex-col items-center justify-center">
      <div className="w-full max-w-md space-y-5">
        <div className="grid grid-cols-2 gap-3">
          {quickLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`${link.color} text-white rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-colors min-h-[90px]`}
            >
              <link.icon className="w-7 h-7" />
              <span className="text-sm font-medium">{link.label}</span>
            </Link>
          ))}
        </div>

        <Link to="/perfil" className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col sm:flex-row items-center gap-5 hover:border-blue-300 dark:hover:border-blue-500 transition-colors">
          {perfil?.avatar_url ? (
            <img src={perfil.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-bold shrink-0">
              {inicial}
            </div>
          )}
          <div className="text-center sm:text-left">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{nombre}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{email}</p>
            <span className="inline-block mt-1 text-xs font-medium bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full">
              {rolLabel[rol] || rol}
            </span>
          </div>
        </Link>
      </div>
    </div>
  )
}
