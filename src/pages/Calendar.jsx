import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useOrdenes } from '../hooks/useApi'

const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export default function Calendar() {
  const { data: ordenes, isLoading } = useOrdenes()

  const hoy = useMemo(() => new Date(), [])
  const [year, month] = [hoy.getFullYear(), hoy.getMonth()]
  const diasEnMes = useMemo(() => new Date(year, month + 1, 0).getDate(), [year, month])
  const primerDia = useMemo(() => new Date(year, month, 1).getDay(), [year, month])

  const ordenesPorFecha = useMemo(() => {
    const map = {}
    if (!ordenes) return map
    ordenes.filter((o) => o.estado !== 'completada').forEach((o) => {
      const fecha = o.fechaProgramada
      if (!map[fecha]) map[fecha] = []
      map[fecha].push(o)
    })
    return map
  }, [ordenes])

  const celdas = useMemo(() => {
    const c = []
    for (let i = 0; i < primerDia; i++) {
      c.push(<div key={`empty-${i}`} className="min-h-0" />)
    }
    for (let dia = 1; dia <= diasEnMes; dia++) {
      const fechaStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
      const ordenesDelDia = (ordenesPorFecha[fechaStr] || []).filter(() => true)
      const esHoy = dia === hoy.getDate() && month === hoy.getMonth() && year === hoy.getFullYear()

      c.push(
        <div
          key={dia}
          className={`min-h-0 overflow-hidden p-1 md:p-1.5 border border-slate-100 rounded-lg ${esHoy ? 'bg-blue-50 ring-2 ring-blue-400' : ''}`}
        >
          <span className={`text-[11px] md:text-xs font-medium ${esHoy ? 'text-blue-700' : 'text-slate-500'}`}>{dia}</span>
          <div className="mt-1 space-y-1">
            {ordenesDelDia.slice(0, 3).map((o) => (
              <Link
                key={o.id}
                to={`/ordenes/${o.id}`}
                className={`block text-[10px] leading-tight px-1.5 py-0.5 rounded truncate ${
                  o.prioridad === 'urgente' ? 'bg-red-100 text-red-700' :
                  o.prioridad === 'alta' ? 'bg-amber-100 text-amber-700' :
                  'bg-blue-100 text-blue-700'
                }`}
              >
                {o.titulo}
              </Link>
            ))}
            {ordenesDelDia.length > 3 && (
              <p className="text-[10px] text-slate-400 px-1">+{ordenesDelDia.length - 3} más</p>
            )}
          </div>
        </div>
      )
    }
    for (let i = primerDia + diasEnMes; i < 42; i++) {
      c.push(<div key={`pad-${i}`} className="min-h-0" />)
    }
    return c
  }, [primerDia, diasEnMes, year, month, ordenesPorFecha, hoy])

  if (isLoading) return <div className="text-slate-500">Cargando calendario...</div>
  if (!ordenes) return <div className="text-red-500">Error al cargar calendario</div>

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <h3 className="text-base md:text-lg font-semibold text-slate-800">{meses[month]} {year}</h3>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1 shrink-0">
        {diasSemana.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-slate-500">{d}</div>
        ))}
      </div>
      <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-1 min-h-0">
        {celdas}
      </div>
    </div>
  )
}
