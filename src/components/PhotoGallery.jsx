import { useState, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useFotos, useDeleteFoto } from '../hooks/useApi'
import { supabase } from '../lib/supabase'
import { uploadToCloudinary } from '../lib/cloudinary'
import { useAuth } from '../context/AuthContext'
import { useToast } from './Toast'
import { HiOutlineTrash, HiOutlineUpload, HiOutlineX } from 'react-icons/hi'
import { formatDate } from '../lib/constants'

export default function PhotoGallery({ ordenId }) {
  const { data: fotos, isLoading } = useFotos(ordenId)
  const deleteFoto = useDeleteFoto()
  const toast = useToast()
  const { perfil } = useAuth()
  const fileRef = useRef(null)
  const queryClient = useQueryClient()
  const [uploading, setUploading] = useState(false)
  const [lightbox, setLightbox] = useState(null)
  const [descripcion, setDescripcion] = useState('')

  const handleUpload = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const url = await uploadToCloudinary(file)

      const { data: { user } } = await supabase.auth.getUser()
      const { error: dbError } = await supabase
        .from('fotos_orden')
        .insert({ orden_id: parseInt(ordenId), url, nombre: file.name, descripcion: descripcion || null, created_by: user.id })
      if (dbError) throw dbError

      queryClient.invalidateQueries({ queryKey: ['fotos', ordenId] })
      setDescripcion('')
      toast.success('Foto agregada')
    } catch (err) {
      toast.error(err.message || 'Error al subir foto')
    } finally {
      setUploading(false)
      fileRef.current.value = ''
    }
  }, [ordenId, descripcion, queryClient, toast])

  const handleDelete = async (foto) => {
    if (!confirm('¿Eliminar esta foto?')) return
    try {
      await deleteFoto.mutateAsync(foto.id)
      toast.success('Foto eliminada')
    } catch (err) {
      toast.error(err.message || 'Error al eliminar foto')
    }
  }

  if (isLoading) return null

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-6">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-slate-700">Fotos de avance</h4>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Descripción (opcional)"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="text-xs border border-slate-300 rounded-lg px-2 py-1.5 w-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1 text-xs font-medium bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {uploading ? (
              'Subiendo...'
            ) : (
              <>
                <HiOutlineUpload className="w-4 h-4" />
                Agregar
              </>
            )}
          </button>
        </div>
      </div>

      {(!fotos || fotos.length === 0) ? (
        <p className="text-xs text-slate-400">No hay fotos todavía</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {fotos.map((foto) => (
            <div key={foto.id} className="relative group border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
              <button onClick={() => setLightbox(foto)} className="w-full">
                <img src={foto.url} alt={foto.nombre || ''} className="w-full h-28 object-cover" />
              </button>
              <div className="p-2">
                {foto.descripcion && (
                  <p className="text-[11px] text-slate-600 truncate">{foto.descripcion}</p>
                )}
                <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(foto.createdAt)}</p>
              </div>
              {(perfil?.rol === 'admin' || foto.createdBy === perfil?.id) && (
                <button
                  onClick={() => handleDelete(foto)}
                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <HiOutlineTrash className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <HiOutlineX className="w-6 h-6" />
          </button>
          <img
            src={lightbox.url}
            alt={lightbox.nombre || ''}
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          {lightbox.descripcion && (
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/60 px-4 py-2 rounded-lg">
              {lightbox.descripcion}
            </p>
          )}
        </div>
      )}
    </div>
  )
}