import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCompras } from '../hooks/useApi'
import { estadosCompra, statusCompraColors, formatDate } from '../lib/constants'
import { SkeletonTable } from '../components/Skeleton'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const pendientesPDF = (compras) => {
  const doc = new jsPDF()
  doc.setFontSize(18)
  doc.text('Compras Pendientes', 14, 22)

  doc.setFontSize(11)
  doc.text(`Total pendientes: ${compras.length}`, 14, 32)

  autoTable(doc, {
    startY: 40,
    head: [['ID', 'Artículo', 'Proveedor', 'Cantidad', 'Unidad', 'Solicitud', 'Entrega']],
    body: compras.map((c) => [
      `#${c.id}`,
      c.articulo,
      c.proveedor,
      c.cantidad,
      c.unidad,
      c.fechaSolicitud,
      c.fechaEntrega || '-',
    ]),
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235] },
    styles: { fontSize: 9 },
  })

  doc.save('compras_pendientes.pdf')
}

export default function Purchases() {
  const { data: compras, isLoading } = useCompras()
  const [filtroEstado, setFiltroEstado] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  if (isLoading) return <SkeletonTable rows={8} cols={8} />
  if (!compras) return <div className="text-red-500">Error al cargar compras</div>

  const filtradas = compras.filter((c) => {
    if (filtroEstado && c.estado !== filtroEstado) return false
    if (searchQuery && !c.articulo.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="Buscar por artículo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 w-full sm:w-48"
          />
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="text-sm border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            <option value="">Todos los estados</option>
            {Object.entries(estadosCompra).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          {filtroEstado === 'pendiente' && (
            <button
              onClick={() => pendientesPDF(filtradas)}
              className="bg-slate-700 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1.5"
            >
              PDF - Pendientes
            </button>
          )}
        </div>
        <Link
          to="/compras/nueva"
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Nueva Compra
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">ID</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Artículo</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Proveedor</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Cantidad</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Solicitud</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Entrega</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Estado</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600 dark:text-slate-300">Acción</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((compra) => (
              <tr key={compra.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">#{compra.id}</td>
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{compra.articulo}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{compra.proveedor}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{compra.cantidad} {compra.unidad}</td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatDate(compra.fechaSolicitud)}</td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{formatDate(compra.fechaEntrega) || '-'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full border ${statusCompraColors[compra.estado]}`}>
                    {estadosCompra[compra.estado]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link to={`/compras/${compra.id}`} className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                    Ver detalle
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtradas.length === 0 && (
          <p className="text-center text-slate-400 dark:text-slate-500 py-8">No se encontraron compras</p>
        )}
      </div>
    </div>
  )
}
