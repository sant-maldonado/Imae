import { useParams, Link, useNavigate } from 'react-router-dom'
import { useOrden, useDeleteOrden, useUpdateOrden, useFotos } from '../hooks/useApi'
import { estados, prioridades, tiposMantenimiento, priorityColors, statusColors, formatDate } from '../lib/constants'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useToast } from '../components/Toast'
import PhotoGallery from '../components/PhotoGallery'

export default function WorkOrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: orden, isLoading } = useOrden(id)
  const { data: fotos } = useFotos(id)
  const deleteOrden = useDeleteOrden()
  const updateOrden = useUpdateOrden()
  const toast = useToast()

  if (isLoading) return <div className="text-slate-500">Cargando orden...</div>
  if (!orden) return <div className="text-slate-500">Orden no encontrada</div>

  const handleDelete = async () => {
    if (confirm('¿Eliminar esta orden de trabajo?')) {
      await deleteOrden.mutateAsync(id)
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
    const doc = new jsPDF()
    const estadoLabel = estados[orden.estado]
    const prioridadLabel = prioridades[orden.prioridad]
    const tipoLabel = tiposMantenimiento[orden.tipoMantenimiento]

    doc.setFontSize(18)
    doc.text('Orden de Trabajo', 14, 22)

    doc.setFontSize(10)
    doc.text(`N° ${orden.id}`, 14, 30)
    doc.text(`Fecha de creación: ${orden.fechaCreacion}`, 14, 36)

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
        ['Fecha programada', orden.fechaProgramada],
        ['Fecha de completación', orden.fechaCompletada || 'Pendiente'],
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

    if (fotos && fotos.length > 0) {
      let y = doc.lastAutoTable.finalY + 20 + descLines.length * 5 + 8
      const pageH = doc.internal.pageSize.getHeight()

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

    doc.save(`orden_trabajo_${orden.id}.pdf`)
  }

  const handleCompletar = async () => {
    await updateOrden.mutateAsync({
      id,
      data: { estado: 'completada', fechaCompletada: new Date().toISOString().split('T')[0] },
    })
    toast.success('Orden completada')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link to="/ordenes" className="hover:text-blue-600">Órdenes</Link>
        <span>/</span>
        <span className="text-slate-800">#{orden.id}</span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-start gap-3 mb-6">
          <div className="flex-1">
            <h3 className="text-lg md:text-xl font-semibold text-slate-800">{orden.titulo}</h3>
            <p className="text-sm text-slate-500 mt-1">Creada el {formatDate(orden.fechaCreacion)}</p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {orden.estado !== 'completada' && (
              <button
                onClick={handleCompletar}
                className="bg-emerald-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors"
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
            <button
              onClick={handleDelete}
              className="border border-red-300 text-red-600 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
            >
              Eliminar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-500 mb-1">Estado</p>
            <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full border ${statusColors[orden.estado]}`}>
              {estados[orden.estado]}
            </span>
          </div>
          <div>
            <p className="text-slate-500 mb-1">Prioridad</p>
            <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full border ${priorityColors[orden.prioridad]}`}>
              {prioridades[orden.prioridad]}
            </span>
          </div>
          <div>
            <p className="text-slate-500 mb-1">Equipo</p>
            <p className="font-medium text-slate-700">{orden.equipoNombre}</p>
          </div>
          <div>
            <p className="text-slate-500 mb-1">Técnico asignado</p>
            <p className="font-medium text-slate-700">{orden.tecnicoNombre}</p>
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
            <p className="text-slate-700">{orden.descripcion}</p>
          </div>
        </div>
      </div>

      <PhotoGallery ordenId={id} />
    </div>
  )
}
