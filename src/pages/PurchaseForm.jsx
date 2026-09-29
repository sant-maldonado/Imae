import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateCompra, useOrdenes } from '../hooks/useApi'
import { useToast } from '../components/Toast'

export default function PurchaseForm() {
  const navigate = useNavigate()
  const toast = useToast()
  const createCompra = useCreateCompra()
  const { data: ordenes } = useOrdenes()

  const [form, setForm] = useState({
    proveedor: '',
    articulo: '',
    cantidad: '',
    unidad: 'unidades',
    fechaEntrega: '',
    estado: 'pendiente',
    // '' y no null: es el value de la option "Sin vincular". React avisa cuando
    // un <select> controlado recibe null. El submit lo vuelve a null para la BD.
    ordenId: '',
  })
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await createCompra.mutateAsync({
        ...form,
        cantidad: Number(form.cantidad),
        ordenId: form.ordenId ? Number(form.ordenId) : null,
      })
      toast.success('Orden de compra creada')
      navigate('/compras')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-6">Nueva Orden de Compra</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="compra-proveedor" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Proveedor</label>
            <input
              id="compra-proveedor"
              required
              value={form.proveedor}
              onChange={(e) => setForm({ ...form, proveedor: e.target.value })}
              className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
              placeholder="Nombre del proveedor"
            />
          </div>

          <div>
            <label htmlFor="compra-articulo" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Artículo</label>
            <input
              id="compra-articulo"
              required
              value={form.articulo}
              onChange={(e) => setForm({ ...form, articulo: e.target.value })}
              className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
              placeholder="Descripción del artículo"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="compra-cantidad" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Cantidad</label>
              <input
                id="compra-cantidad"
                type="number"
                required
                min="1"
                value={form.cantidad}
                onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
              className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            />
          </div>
          <div>
            <label htmlFor="compra-unidad" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Unidad</label>
              <select
                id="compra-unidad"
                value={form.unidad}
                onChange={(e) => setForm({ ...form, unidad: e.target.value })}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
              >
                <option value="unidades">Unidades</option>
                <option value="litros">Litros</option>
                <option value="kgs">Kgs</option>
                <option value="metros">Metros</option>
                <option value="planchas">Planchas</option>
                <option value="juegos">Juegos</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="compra-orden" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Orden de trabajo vinculada</label>
            <select
              id="compra-orden"
              value={form.ordenId}
              onChange={(e) => setForm({ ...form, ordenId: e.target.value })}
              className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              <option value="">Sin vincular</option>
              {ordenes?.map((o) => (
                <option key={o.id} value={o.id}>#{o.id} — {o.titulo}</option>
              ))}
            </select>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Vincula la compra con la orden que la originó, para poder rastrear el repuesto hasta su equipo.
            </p>
          </div>

          <div>
            <label htmlFor="compra-fecha" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Fecha Estimada de Entrega</label>
            <input
              id="compra-fecha"
              type="date"
              value={form.fechaEntrega}
              onChange={(e) => setForm({ ...form, fechaEntrega: e.target.value })}
              className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            />
          </div>

          <div className="flex gap-3 pt-4">
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-3 py-2 rounded-lg w-full mb-2">{error}</p>
            )}
            <button
              type="submit"
              disabled={createCompra.isPending}
              className="bg-blue-600 text-white text-sm font-medium px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {createCompra.isPending ? 'Guardando...' : 'Crear Compra'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/compras')}
              className="border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium px-6 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
