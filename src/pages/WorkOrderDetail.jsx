import { useParams, Link, useNavigate } from 'react-router-dom'
import { useOrden, useDeleteOrden, useCompletarOrden, useFotos, useLogs, useCreateLog } from '../hooks/useApi'
import { estados, prioridades, tiposMantenimiento, priorityColors, statusColors, formatDate, formatDateTime } from '../lib/constants'
import { accionLabels, campoLabels, valorDelLog } from '../lib/auditoria'
import { SkeletonCard } from '../components/Skeleton'
import { cargarPdf } from '../lib/pdf'
import { useToast } from '../components/Toast'
import PhotoGallery from '../components/PhotoGallery'
import LogHistory from '../components/LogHistory'
import { HiOutlineArrowLeft, HiOutlinePencil } from 'react-icons/hi2'
import { useAuth } from '../context/AuthContext'
import { puede } from '../lib/permissions'

export default function WorkOrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: orden, isLoading } = useOrden(id)
  const { data: fotos } = useFotos(id)
  const { data: logs } = useLogs(id)
  const deleteOrden = useDeleteOrden()
  const completarOrden = useCompletarOrden()
  const createLog = useCreateLog(id)
  const toast = useToast()
  const rol = useAuth().perfil?.rol

  if (isLoading) return <SkeletonCard />
  if (!orden) return <div className="text-slate-500">Orden no encontrada</div>

  const handleDelete = async () => {
    if (await toast.confirm('¿Eliminar esta orden de trabajo?')) {
      try {
        await deleteOrden.mutateAsync(id)
      } catch (err) {
        toast.error(err.message)
        return
      }
      toast.success('Orden eliminada')
      navigate('/ordenes')
    }
  }

  const loadImg = (url) => new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.width
      c.height = img.height
      c.getContext('2d').drawImage(img, 0, 0)
      resolve(c)
    }
    img.onerror = reject
    img.src = url
  })

  const generarPDF = async () => {
    const { jsPDF, autoTable } = await cargarPdf()
    const doc = new jsPDF()
    const estadoLabel = estados[orden.estado]
    const prioridadLabel = prioridades[orden.prioridad]
    const tipoLabel = tiposMantenimiento[orden.tipoMantenimiento]

    doc.setFontSize(18)
    doc.text('Orden de Trabajo', 14, 22)

    doc.setFontSize(10)
    doc.text(`N° ${orden.id}`, 14, 30)
    doc.text(`Fecha de creación: ${formatDateTime(orden.fechaCreacion)}`, 14, 36)

    doc.setFontSize(12)
    doc.text('Datos generales', 14, 48)

    autoTable(doc, {
      startY: 54,
      body: [
        ['Título', orden.titulo],
        ['Estado', estadoLabel],
        ['Prioridad', prioridadLabel],
        ['Tipo de mantenimiento', tipoLabel],
        ['Equipo', orden.equipoNombre],
        ['Técnico asignado', orden.tecnicoNombre],
        ['Fecha programada', formatDate(orden.fechaProgramada) || 'Sin programar'],
        ['Fecha de completación', orden.fechaCompletada ? formatDateTime(orden.fechaCompletada) : 'Pendiente'],
      ],
      theme: 'plain',
      styles: { fontSize: 10 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
    })

    doc.setFontSize(12)
    doc.text('Descripción', 14, doc.lastAutoTable.finalY + 12)

    doc.setFontSize(10)
    const descLines = doc.splitTextToSize(orden.descripcion, 180)
    doc.text(descLines, 14, doc.lastAutoTable.finalY + 20)

// El historial va en el PDF, y no solo en pantalla. Antes el componente ya traia
    // los logs (linea 18) y los mostraba en la ficha, pero el PDF los ignoraba: el
    // respaldo en papel llevaba las fotos y no llevaba QUIEN ni CUANDO. Para un area
    // de Calidad ese papel no era un registro, era una foto del estado.
    const historial = logs || []
    const pageH = doc.internal.pageSize.getHeight()

    // Un solo cursor que baja a medida que se escribe. Encadenar
    // doc.lastAutoTable.finalY en cada bloque hacia el PDF-illegible rapido: cada
    // seccion tiene que saber donde termino la anterior.
    let y = doc.lastAutoTable.finalY + 20 + descLines.length * 5

    if (historial.length > 0) {
      y += 8
      if (y > pageH - 60) {
        doc.addPage()
        y = 20
      }

      doc.setFontSize(12)
      doc.text('Historial de cambios', 14, y)
      y += 6

      autoTable(doc, {
        startY: y,
        // Los logs vienen del mas nuevo al mas viejo, que es como se leen en
        // pantalla. Acá se dan vuelta para que el papel se lea en orden de reloj.
        body: [...historial]
          .reverse()
          .map((log) => [
            formatDateTime(log.createdAt),
            log.usuarioNombre || '—',
            accionLabels[log.accion] || log.accion,
            log.campo ? campoLabels[log.campo] || log.campo : '',
            log.campo ? valorDelLog(log.campo, log.valorAnterior) : '',
            log.campo ? valorDelLog(log.campo, log.valorNuevo) : '',
          ]),
        head: [['Fecha y hora', 'Usuario', 'Acción', 'Campo', 'Anterior', 'Nuevo']],
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 26 },
          1: { cellWidth: 26 },
          4: { cellWidth: 28 },
          5: { cellWidth: 28 },
        },
      })

      y = doc.lastAutoTable.finalY
    }

    if (fotos && fotos.length > 0) {
      y += 8

      if (y > pageH - 40) {
        doc.addPage()
        y = 20
      }

      doc.setFontSize(12)
      doc.text('Fotos de avance', 14, y)
      y += 8

      const imgW = 85
      const imgH = 60
      const gap = 10

      for (let i = 0; i < fotos.length; i++) {
        const col = i % 2
        const row = Math.floor(i / 2)
        const x = 14 + col * (imgW + gap)
        let iy = y + row * (imgH + 14)

        if (iy + imgH > pageH - 20) {
          doc.addPage()
          iy = 20
        }

        try {
          const canvas = await loadImg(fotos[i].url)
          doc.addImage(canvas, 'JPEG', x, iy, imgW, imgH)

          if (fotos[i].descripcion) {
            doc.setFontSize(7)
            doc.text(fotos[i].descripcion, x, iy + imgH + 3, { maxWidth: imgW })
          }
        } catch {
          doc.setFontSize(8)
          doc.text('(Error al cargar imagen)', x, iy + imgH / 2)
        }
      }
    }

    // El pie dice de que registro salio este papel y cuando se genero. Sin eso,
    // un PDF suelto de una orden es indistinguible de cualquier otro: no se sabe
    // si es el actual o el de la semana pasada.
    doc.setFontSize(7)
    doc.text(
      `Documento generado por IMAE el ${formatDateTime(new Date().toISOString())} a partir del registro N° ${orden.id}`,
      14,
      doc.internal.pageSize.getHeight() - 8
    )

    doc.save(`orden_trabajo_${orden.id}.pdf`)
  }

  // Una orden completada queda congelada para el tecnico; supervision la sigue
  // pudiendo corregir.
  const editandoBloqueada = rol === 'tecnico' && orden.estado === 'completada'

  const handleCompletar = async () => {
    try {
      await completarOrden.mutateAsync({ id })
    } catch (err) {
      toast.error(err.message)
      return
    }
    // Se espera el log antes de avisar: con mutate() la peticion queda en vuelo y
    // se pierde si el usuario navega enseguida. El estado ya esta guardado, asi
    // que si el log falla no se deshace, pero hay que decirlo.
    await createLog
      .mutateAsync({ orden_id: id, accion: 'estado_cambiado', campo: 'estado', valor_anterior: orden.estado, valor_nuevo: 'completada' })
      .then(() => toast.success('Orden completada'))
      .catch(() => toast.error('La orden se completó, pero el cambio no quedó en el historial'))
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Link
          to="/ordenes"
          data-testid="volver-ordenes"
          className="inline-flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <HiOutlineArrowLeft className="w-4 h-4" aria-hidden="true" />
          Órdenes
        </Link>
        <span aria-hidden="true">·</span>
        <span className="text-slate-800 dark:text-slate-100">#{orden.id}</span>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-start gap-3 mb-6">
          <div className="flex-1">
            <h3 className="text-lg md:text-xl font-semibold text-slate-800 dark:text-slate-100">{orden.titulo}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Creada el {formatDate(orden.fechaCreacion)}</p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {puede(rol, 'editarOrden') && !editandoBloqueada && (
              <Link
                to={`/ordenes/${orden.id}/editar`}
                className="border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1"
              >
                <HiOutlinePencil className="w-3.5 h-3.5" aria-hidden="true" />
                Editar
              </Link>
            )}
            {orden.estado !== 'completada' && puede(rol, 'completarOrden') && (
              <button
                onClick={handleCompletar}
                disabled={completarOrden.isPending}
                className="bg-emerald-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                Completar
              </button>
            )}
            <button
              onClick={generarPDF}
              className="bg-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
            >
              PDF
            </button>
            {puede(rol, 'borrarOrden') && (
              <button
                onClick={handleDelete}
                className="border border-red-300 text-red-600 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
              >
                Eliminar
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-500 dark:text-slate-400 mb-1">Estado</p>
            <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full border ${statusColors[orden.estado]}`}>
              {estados[orden.estado]}
            </span>
          </div>
          <div>
            <p className="text-slate-500 dark:text-slate-400 mb-1">Prioridad</p>
            <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full border ${priorityColors[orden.prioridad]}`}>
              {prioridades[orden.prioridad]}
            </span>
          </div>
          <div>
            <p className="text-slate-500 mb-1">Equipo</p>
            <p className="font-medium text-slate-700 dark:text-slate-200">{orden.equipoNombre}</p>
          </div>
          <div>
            <p className="text-slate-500 mb-1">Técnico asignado</p>
            <p className="font-medium text-slate-700 dark:text-slate-200">{orden.tecnicoNombre}</p>
          </div>
          <div>
            <p className="text-slate-500 mb-1">Tipo de mantenimiento</p>
            <p className="font-medium text-slate-700">{tiposMantenimiento[orden.tipoMantenimiento]}</p>
          </div>
          <div>
            <p className="text-slate-500 mb-1">Fecha programada</p>
            <p className="font-medium text-slate-700">{formatDate(orden.fechaProgramada)}</p>
          </div>
          {orden.fechaCompletada && (
            <div className="col-span-2">
              <p className="text-slate-500 mb-1">Fecha de completación</p>
              <p className="font-medium text-slate-700">{formatDate(orden.fechaCompletada)}</p>
            </div>
          )}
          <div className="col-span-2">
<p className="text-slate-500 mb-1">Descripción</p>
      {/* Con testid porque el texto aparece dos veces en la pagina: en los datos
          y en el historial, que muestra el valor nuevo del cambio. Un assert por
          texto solo lo encuentra ambiguo. */}
      <p data-testid="orden-descripcion" className="text-slate-700 dark:text-slate-200">{orden.descripcion}</p>
          </div>
        </div>
      </div>

      <LogHistory logs={logs} />
      <PhotoGallery ordenId={id} />
    </div>
  )
}
