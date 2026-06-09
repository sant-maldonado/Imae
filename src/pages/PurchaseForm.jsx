import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateCompra } from '../hooks/useApi'
import { useToast } from '../components/Toast'

export default function PurchaseForm() {
  const navigate = useNavigate()
  const toast = useToast()
  const createCompra = useCreateCompra()

  const [form, setForm] = useState({
    proveedor: '',
    articulo: '',
    cantidad: '',
    unidad: 'unidades',
    fechaEntrega: '',
    estado: 'pendiente',
    ordenId: null,
  })
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await createCompra.mutateAsync({
        ...form,
        cantidad: Number(form.cantidad),
      })
      toast.success('Orden de compra creada')
      navigate('/compras')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-6">Nueva Orden de Compra</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Proveedor</label>
            <input
              required
              value={form.proveedor}
              onChange={(e) => setForm({ ...form, proveedor: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nombre del proveedor"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Artículo</label>
            <input
              required
              value={form.articulo}
              onChange={(e) => setForm({ ...form, articulo: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Descripción del artículo"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cantidad</label>
              <input
                type="number"
                required
                min="1"
                value={form.cantidad}
                onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unidad</label>
              <select
                value={form.unidad}
                onChange={(e) => setForm({ ...form, unidad: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Estimada de Entrega</label>
            <input
              type="date"
              value={form.fechaEntrega}
              onChange={(e) => setForm({ ...form, fechaEntrega: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg w-full mb-2">{error}</p>
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
              className="border border-slate-300 text-slate-700 text-sm font-medium px-6 py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
