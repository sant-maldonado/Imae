import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-200 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-7xl font-bold text-slate-300 dark:text-slate-600 mb-4">404</h1>
        <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-2">Página no encontrada</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8">La ruta que buscás no existe o fue movida.</p>
        <Link
          to="/"
          className="inline-block bg-blue-600 text-white text-sm font-medium px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
