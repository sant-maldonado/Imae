import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useOrden, useEditarOrden, useCreateLog, useEquipos, useTecnicos } from '../hooks/useApi'
import { useToast } from '../components/Toast'
import { SkeletonCard } from '../components/Skeleton'
import { HiOutlineArrowLeft } from 'react-icons/hi2'
import { useAuth } from '../context/AuthContext'
import { camposEditados } from '../lib/auditoria'

const CAMPO = 'w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200'
const LABEL = 'block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1'

// El estado se inicializa desde la orden una sola vez: si el padre volviera a
// pasar otros datos, el formulario no se pisa. Por eso el form vive en un
// componente aparte en vez de recibir la orden como prop y leerla directo.
export default function WorkOrderEdit() {
  const { id } = useParams()
  const { data: orden, isLoading } = useOrden(id)

  if (isLoading) return <SkeletonCard />
  if (!orden) return <div className="text-slate-500">Orden no encontrada</div>

  return <FormOrden orden={orden} />
}

function FormOrden({ orden }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { data: equipos } = useEquipos()
  const { data: tecnicos } = useTecnicos()
  const { perfil } = useAuth()
  const editarOrden = useEditarOrden()
  const createLog = useCreateLog(id)

  const esTecnico = perfil?.rol === 'tecnico'
  // Una orden completada queda congelada para el tecnico. Supervision la sigue
  // pudiendo corregir: si algo quedo mal, es un error de carga de datos, no del
  // tecnico. El boton Editar tampoco se le muestra, asi que llega por URL.
  const bloqueada = esTecnico && orden.estado === 'completada'

  const [form, setForm] = useState({
    titulo: orden.titulo || '',
    descripcion: orden.descripcion || '',
    equipoId: orden.equipoId || '',
    tecnicoId: orden.tecnicoId || '',
    prioridad: orden.prioridad || 'media',
    tipoMantenimiento: orden.tipoMantenimiento || 'preventivo',
    fechaProgramada: orden.fechaProgramada || '',
  })
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (bloqueada) {
      setError('La orden está completada y ya no se puede editar.')
      return
    }
    // El tecnico no puede reasignar la orden, asi que tecnicoId no viaja en el
    // payload. El RLS lo rechaza igual: esto es para no mandar algo que va a
    // fallar.
    const data = { ...form }
    if (esTecnico) delete data.tecnicoId
    try {
      await editarOrden.mutateAsync({ id, data })
      // Un log por campo que realmente cambio. Si no cambio nada no se escribe
      // ninguno: un "Actualizada" sin detalle no prueba nada y ensucia el
      // historial, que es lo que Calidad va a leer.
      camposEditados(orden, data, { equipos, tecnicos }).forEach((cambio) => {
        createLog.mutate({ orden_id: id, accion: 'actualizada', ...cambio })
      })
      toast.success('Orden actualizada')
      navigate(`/ordenes/${id}`)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
        <Link
          to={`/ordenes/${id}`}
          data-testid="volver-detalle-orden"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 mb-4 transition-colors"
        >
          <HiOutlineArrowLeft className="w-4 h-4" aria-hidden="true" />
          Volver a la orden
        </Link>
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-6">
          Editar Orden #{orden.id}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="edit-titulo" className={LABEL}>Título</label>
            <input
              id="edit-titulo"
              type="text"
              required
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              className={CAMPO}
            />
          </div>

          <div>
            <label htmlFor="edit-descripcion" className={LABEL}>Descripción</label>
            <textarea
              id="edit-descripcion"
              rows={3}
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              className={CAMPO}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-equipo" className={LABEL}>Equipo</label>
              <select
                id="edit-equipo"
                value={form.equipoId}
                onChange={(e) => setForm({ ...form, equipoId: e.target.value })}
                className={CAMPO}
              >
                <option value="">Sin asignar</option>
                {equipos?.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.nombre} ({eq.codigo})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="edit-tecnico" className={LABEL}>Técnico</label>
              {esTecnico ? (
                <>
                  {/* Solo lectura: reasignar la orden es decision de supervision */}
                  <p className={`${CAMPO} bg-slate-100 dark:bg-slate-900 text-slate-500`}>
                    {orden.tecnicoNombre || 'Sin asignar'}
                  </p>
                  <p className="mt-1.5 text-xs text-slate-500">
                    Si necesitás pasarla a otro técnico, pedile a un supervisor.
                  </p>
                </>
              ) : (
                <select
                  id="edit-tecnico"
                  value={form.tecnicoId}
                  onChange={(e) => setForm({ ...form, tecnicoId: e.target.value })}
                  className={CAMPO}
                >
                  <option value="">Sin asignar</option>
                  {tecnicos?.filter((t) => t.activo).map((t) => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label htmlFor="edit-prioridad" className={LABEL}>Prioridad</label>
              <select
                id="edit-prioridad"
                value={form.prioridad}
                onChange={(e) => setForm({ ...form, prioridad: e.target.value })}
                className={CAMPO}
              >
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
            <div>
              <label htmlFor="edit-tipo" className={LABEL}>Tipo</label>
              <select
                id="edit-tipo"
                value={form.tipoMantenimiento}
                onChange={(e) => setForm({ ...form, tipoMantenimiento: e.target.value })}
                className={CAMPO}
              >
                <option value="preventivo">Preventivo</option>
                <option value="correctivo">Correctivo</option>
                <option value="predictivo">Predictivo</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="edit-fecha" className={LABEL}>Fecha Programada</label>
            <input
              id="edit-fecha"
              type="date"
              value={form.fechaProgramada}
              onChange={(e) => setForm({ ...form, fechaProgramada: e.target.value })}
              className={CAMPO}
            />
          </div>

          <div className="flex gap-3 pt-4">
            {(error || bloqueada) && (
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-3 py-2 rounded-lg w-full mb-2">
                {error || 'La orden está completada y ya no se puede editar.'}
              </p>
            )}
            <button
              type="submit"
              disabled={editarOrden.isPending || bloqueada}
              className="bg-blue-600 text-white text-sm font-medium px-6 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {editarOrden.isPending ? 'Guardando...' : 'Guardar Cambios'}
            </button>
            <Link
              to={`/ordenes/${id}`}
              className="border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium px-6 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
