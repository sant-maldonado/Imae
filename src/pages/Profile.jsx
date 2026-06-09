import { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { HiOutlineLockClosed } from 'react-icons/hi2'
import { useToast } from '../components/Toast'

function resizeImage(file, maxSize) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let { width, height } = img
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width)
            width = maxSize
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height)
            height = maxSize
          }
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(resolve, 'image/jpeg', 0.8)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

export default function Profile() {
  const { user, perfil, refreshPerfil, changePassword } = useAuth()
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [showPassForm, setShowPassForm] = useState(false)
  const [currentPass, setCurrentPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [passError, setPassError] = useState('')
  const [passSuccess, setPassSuccess] = useState('')
  const [passLoading, setPassLoading] = useState(false)
  const toast = useToast()

  const nombre = perfil?.nombre || user?.email?.split('@')[0] || 'Usuario'
  const email = user?.email || ''
  const rol = perfil?.rol || 'tecnico'
  const inicial = nombre.charAt(0).toUpperCase()
  const avatarUrl = perfil?.avatar_url

  const rolLabel = {
    admin: 'Administrador',
    supervisor: 'Supervisor',
    tecnico: 'Técnico',
    operador: 'Operador',
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPassError('')
    setPassSuccess('')
    if (newPass !== confirmPass) {
      setPassError('Las contraseñas no coinciden')
      return
    }
    if (newPass.length < 6) {
      setPassError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setPassLoading(true)
    try {
      await changePassword(currentPass, newPass)
      setPassSuccess('Contraseña actualizada')
      toast.success('Contraseña actualizada')
      setCurrentPass('')
      setNewPass('')
      setConfirmPass('')
      setShowPassForm(false)
    } catch (err) {
      setPassError(err.message)
    } finally {
      setPassLoading(false)
    }
  }

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const resized = await resizeImage(file, 200)
      const fileName = `${user.id}.jpg`

      const { error: uploadError } = await supabase.storage.from('avatares').upload(fileName, resized, { upsert: true })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('avatares').getPublicUrl(fileName)

      const { error: updateError } = await supabase.from('perfiles').update({ avatar_url: publicUrl }).eq('id', user.id)
      if (updateError) throw updateError

      await refreshPerfil()
    } catch (err) {
      toast.error(err.message || 'Error al subir la foto')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-semibold text-slate-800">Mi Perfil</h1>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={nombre}
                className="w-24 h-24 rounded-full object-cover border-4 border-slate-100"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-blue-600 text-white flex items-center justify-center text-3xl font-bold border-4 border-slate-100">
                {inicial}
              </div>
            )}
            {uploading && (
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                <svg className="animate-spin w-6 h-6 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            )}
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {uploading ? 'Subiendo...' : avatarUrl ? 'Cambiar foto' : 'Subir foto'}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-500 mb-0.5">Nombre</label>
            <p className="text-sm font-medium text-slate-800">{nombre}</p>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-0.5">Email</label>
            <p className="text-sm text-slate-600">{email}</p>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-0.5">Rol</label>
            <span className="inline-block text-xs font-medium bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full">
              {rolLabel[rol] || rol}
            </span>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <button
          onClick={() => setShowPassForm(!showPassForm)}
          className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
        >
          <HiOutlineLockClosed className="w-5 h-5" />
          {showPassForm ? 'Cancelar' : 'Cambiar contraseña'}
        </button>

        {showPassForm && (
          <form onSubmit={handleChangePassword} className="mt-4 space-y-3">
            <div>
              <label className="block text-xs text-slate-500 mb-0.5">Contraseña actual</label>
              <input
                type="password"
                required
                value={currentPass}
                onChange={(e) => setCurrentPass(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-0.5">Nueva contraseña</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-0.5">Confirmar nueva contraseña</label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {passError && <p className="text-xs text-red-500">{passError}</p>}
            {passSuccess && <p className="text-xs text-emerald-600">{passSuccess}</p>}

            <button
              type="submit"
              disabled={passLoading}
              className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {passLoading ? 'Actualizando...' : 'Actualizar contraseña'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
