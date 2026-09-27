import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCompras, useEquipos, useOrdenes } from '../hooks/useApi'
import {
  HiOutlineBolt,
  HiOutlineChevronRight,
  HiOutlineClipboardDocumentList,
  HiOutlineExclamationTriangle,
  HiOutlinePlus,
  HiOutlineShoppingBag,
} from 'react-icons/hi2'
import { formatDate, priorityColors, prioridades } from '../lib/constants'
import { SkeletonCard } from '../components/Skeleton'

const MAX_PENDIENTES = 4

const rolLabel = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  tecnico: 'Técnico',
  operador: 'Operador',
}

const prioridadOrden = { urgente: 0, alta: 1, media: 2, baja: 3 }

const railPrioridad = {
  urgente: 'bg-red-500',
  alta: 'bg-amber-500',
  media: 'bg-blue-400',
  baja: 'bg-slate-300 dark:bg-slate-600',
}

// La animacion va inline para no tocar la clase compartida que tambien usa el
// Toast: el fillMode 'both' evita el destello entre frames durante el delay.
const stagger = (i) => ({ animationDelay: `${i * 60}ms`, animationFillMode: 'both' })

function fechaDeHoy() {
  const s = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function Dashboard() {
  const { user, perfil } = useAuth()
  const { data: ordenes, isLoading } = useOrdenes()
  const { data: equipos } = useEquipos()
  const { data: compras } = useCompras()

  const nombre = perfil?.nombre || user?.email?.split('@')[0] || 'Usuario'
  const email = user?.email || ''
  const rol = perfil?.rol || 'tecnico'
  const inicial = nombre.charAt(0).toUpperCase()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }
  if (!ordenes) return <div className="text-red-500">Error al cargar órdenes</div>

  const pendientes = ordenes.filter((o) => o.estado === 'pendiente')
  const averiados = (equipos || []).filter((e) => e.estado === 'averiado').length
  const comprasPendientes = (compras || []).filter((c) => c.estado === 'pendiente').length
  const misOrdenes = perfil?.rol === 'tecnico'
    ? ordenes.filter((o) => o.tecnicoId === perfil.id).length
    : null

  const destacadas = [...pendientes]
    .sort((a, b) => (prioridadOrden[a.prioridad] ?? 9) - (prioridadOrden[b.prioridad] ?? 9))
    .slice(0, MAX_PENDIENTES)
  const restantes = pendientes.length - destacadas.length

  const tiles = [
    {
      to: '/ordenes', testid: 'stat-pendientes', label: 'Órdenes pendientes',
      value: pendientes.length,
      icon: HiOutlineClipboardDocumentList,
      bar: 'bg-amber-400', num: 'text-amber-600 dark:text-amber-400',
      tone: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10',
    },
    {
      to: '/ordenes', testid: 'stat-en-progreso', label: 'Órdenes en progreso',
      value: ordenes.filter((o) => o.estado === 'en_progreso').length,
      icon: HiOutlineBolt,
      bar: 'bg-blue-400', num: 'text-blue-600 dark:text-blue-400',
      tone: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10',
    },
    {
      to: '/equipos', testid: 'stat-averiados', label: 'Equipos averiados',
      value: averiados,
      icon: HiOutlineExclamationTriangle,
      bar: 'bg-red-400', num: 'text-red-600 dark:text-red-400',
      tone: 'bg-red-50 text-red-600 dark:bg-red-500/10',
    },
    {
      to: '/compras', testid: 'stat-compras', label: 'Compras pendientes',
      value: comprasPendientes,
      icon: HiOutlineShoppingBag,
      bar: 'bg-violet-400', num: 'text-violet-600 dark:text-violet-400',
      tone: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10',
    },
  ]

  const resumen = pendientes.length === 0
    ? 'Sin órdenes pendientes. Todo al día.'
    : `${pendientes.length} ${pendientes.length === 1 ? 'orden espera' : 'órdenes esperan'} atención`

  return (
    <div className="space-y-4">
      <div
        className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 animate-slide-up"
        style={stagger(0)}
      >
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">{fechaDeHoy()}</p>
          <p className="mt-1 text-xl md:text-2xl font-semibold text-slate-800 dark:text-slate-100">{resumen}</p>
        </div>
        <Link
          to="/ordenes/nueva"
          data-testid="cta-nueva-orden"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all shrink-0"
        >
          <HiOutlinePlus className="w-5 h-5" />
          Nueva orden
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tiles.map((t, i) => (
          <Link
            key={t.testid}
            to={t.to}
            data-testid={t.testid}
            style={stagger(i + 1)}
            className="relative overflow-hidden bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 pt-6 hover:shadow-md hover:-translate-y-0.5 transition-all animate-slide-up"
          >
            <span className={`absolute inset-x-0 top-0 h-1 ${t.bar}`} />
            <div className={`w-10 h-10 rounded-lg ${t.tone} flex items-center justify-center`}>
              <t.icon className="w-5 h-5" />
            </div>
            <p className={`mt-3 text-3xl font-bold tabular-nums ${t.num}`}>{t.value}</p>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 mt-1">
              {t.label}
            </p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div
          className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 animate-slide-up"
          style={stagger(5)}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Órdenes pendientes</h2>
            <Link to="/ordenes" className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
              Ver todas →
            </Link>
          </div>

          {destacadas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
              <span className="text-4xl mb-3">🔧</span>
              <p className="text-sm">No hay órdenes pendientes</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {destacadas.map((o) => (
                <Link
                  key={o.id}
                  to={`/ordenes/${o.id}`}
                  data-testid="orden-pendiente"
                  className="relative flex items-center gap-3 pl-6 pr-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <span className={`absolute left-2 top-2 bottom-2 w-1 rounded-full ${railPrioridad[o.prioridad] || railPrioridad.baja}`} />
                  <span className="text-xs font-mono text-slate-400 dark:text-slate-500 shrink-0 w-8">#{o.id}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{o.titulo}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap text-xs text-slate-500 dark:text-slate-400">
                      {o.tecnicoNombre && <span>{o.tecnicoNombre}</span>}
                      {o.tecnicoNombre && o.fechaProgramada && (
                        <span className="text-slate-300 dark:text-slate-600">&middot;</span>
                      )}
                      {o.fechaProgramada && <span>{formatDate(o.fechaProgramada)}</span>}
                    </div>
                  </div>
                  {o.prioridad && (
                    <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border ${priorityColors[o.prioridad]}`}>
                      {prioridades[o.prioridad]}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}

          {restantes > 0 && (
            <p className="px-5 py-3 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700">
              + {restantes} {restantes === 1 ? 'orden más' : 'órdenes más'}
            </p>
          )}
        </div>

        <Link
          to="/perfil"
          data-testid="tarjeta-perfil"
          style={stagger(6)}
          className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col items-center text-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all animate-slide-up"
        >
          {perfil?.avatar_url ? (
            <img
              src={perfil.avatar_url}
              alt=""
              className="w-16 h-16 rounded-full object-cover shrink-0 ring-2 ring-slate-100 dark:ring-slate-700"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-2xl font-bold shrink-0">
              {inicial}
            </div>
          )}

          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 break-words">{nombre}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 break-all mt-0.5">{email}</p>
            <span className="inline-block mt-2 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 px-2.5 py-1 rounded-full">
              {rolLabel[rol] || rol}
            </span>
          </div>

          {misOrdenes !== null && (
            <div className="w-full pt-4 border-t border-slate-100 dark:border-slate-700">
              <p className="text-3xl font-bold tabular-nums text-slate-800 dark:text-slate-100">{misOrdenes}</p>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 mt-1">
                Órdenes asignadas a vos
              </p>
            </div>
          )}

          <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
            Ver mi perfil
            <HiOutlineChevronRight className="w-4 h-4" />
          </span>
        </Link>
      </div>
    </div>
  )
}
