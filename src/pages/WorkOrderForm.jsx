import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateOrden, useEquipos, useTecnicos } from '../hooks/useApi'
import { useToast } from '../components/Toast'

export default function WorkOrderForm() {
  const navigate = useNavigate()
  const toast = useToast()
  const { data: equipos } = useEquipos()
  const { data: tecnicos } = useTecnicos()
  const createOrden = useCreateOrden()

  const [form, setForm] = useState({
    equipoId: '',
    tecnicoId: '',
    titulo: '',
    descripcion: '',
    prioridad: 'media',
    tipoMantenimiento: 'preventivo',
    fechaProgramada: '',
    estado: 'pendiente',
  })
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await createOrden.mutateAsync(form)
      toast.success('Orden de trabajo creada')
      navigate('/ordenes')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-6">Nueva Orden de Trabajo</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
            <input
              required
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
            <textarea
              rows={3}
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Equipo</label>
              <select
                value={form.equipoId}
                onChange={(e) => setForm({ ...form, equipoId: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Ninguno</option>
                {equipos?.map((eq) => (
                  <option key={eq.id} value={eq.id}>{eq.nombre} ({eq.codigo})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Técnico</label>
              <select
                required
                value={form.tecnicoId}
                onChange={(e) => setForm({ ...form, tecnicoId: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar técnico</option>
                {tecnicos?.filter((t) => t.activo).map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Prioridad</label>
              <select
                value={form.prioridad}
                onChange={(e) => setForm({ ...form, prioridad: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
              <select
                value={form.tipoMantenimiento}
                onChange={(e) => setForm({ ...form, tipoMantenimiento: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="preventivo">Preventivo</option>
                <option value="correctivo">Correctivo</option>
                <option value="predictivo">Predictivo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha Programada</label>
              <input
                type="date"
                required
                value={form.fechaProgramada}
                onChange={(e) => setForm({ ...form, fechaProgramada: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg w-full mb-2">{error}</p>
            )}
            <button
              type="submit"
              disabled={createOrden.isPending}
              className="bg-blue-600 text-white text-sm font-medium px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {createOrden.isPending ? 'Guardando...' : 'Crear Orden'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/ordenes')}
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
