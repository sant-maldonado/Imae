import { useState, useRef } from 'react'
import { HiOutlineTrash, HiOutlinePhotograph } from 'react-icons/hi'

export default function PhotoUploader({ fotos, setFotos }) {
  const fileRef = useRef(null)
  const [previews, setPreviews] = useState([])

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const nuevos = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
      nombre: file.name,
      descripcion: '',
    }))

    setPreviews((prev) => [...prev, ...nuevos])
    setFotos((prev) => [...prev, ...nuevos])
    fileRef.current.value = ''
  }

  const removePreview = (idx) => {
    setPreviews((prev) => prev.filter((_, i) => i !== idx))
    setFotos((prev) => prev.filter((_, i) => i !== idx))
  }

  const setDescripcion = (idx, val) => {
    setPreviews((prev) => prev.map((p, i) => (i === idx ? { ...p, descripcion: val } : p)))
    setFotos((prev) => prev.map((p, i) => (i === idx ? { ...p, descripcion: val } : p)))
  }

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">Fotos de avance</label>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFiles}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 mb-3"
      >
        <HiOutlinePhotograph className="w-5 h-5" />
        Agregar fotos
      </button>
      {previews.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {previews.map((foto, i) => (
            <div key={i} className="relative group border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
              <img src={foto.url} alt="" className="w-full h-28 object-cover" />
              <input
                type="text"
                placeholder="Descripción opcional"
                value={foto.descripcion}
                onChange={(e) => setDescripcion(i, e.target.value)}
                className="w-full text-[11px] px-2 py-1 border-t border-slate-200 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => removePreview(i)}
                className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <HiOutlineTrash className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}