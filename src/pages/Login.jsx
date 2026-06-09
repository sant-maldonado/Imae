import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { user, login, register, resetPassword } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate('/')
  }, [user, navigate])
  const [esRegistro, setEsRegistro] = useState(false)
  const [esReset, setEsReset] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [especialidad, setEspecialidad] = useState('')
  const [telefono, setTelefono] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (esReset) {
        await resetPassword(email)
        setError('Revisá tu email. Te enviamos el link para restablecer la contraseña.')
      } else if (esRegistro) {
        await register(email, password, nombre, especialidad, telefono)
        setEsRegistro(false)
        setError('Registro exitoso. Ya podés iniciar sesión.')
      } else {
        await login(email, password)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl p-8 w-full max-w-sm border border-slate-700">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white">Control de Mantenimiento</h1>
          <p className="text-sm text-slate-400 mt-1">
            {esReset ? 'Restablecer contraseña' : esRegistro ? 'Crear cuenta' : 'Iniciar sesión'}
          </p>
        </div>

        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-4">
          {esRegistro && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Nombre</label>
                <input
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Tu nombre"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Especialidad</label>
                <select
                  required
                  value={especialidad}
                  onChange={(e) => setEspecialidad(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="" disabled>Seleccionar especialidad</option>
                  <option value="Mecánica">Mecánica</option>
                  <option value="Eléctrica">Eléctrica</option>
                  <option value="Electrónica">Electrónica</option>
                  <option value="Hidráulica">Hidráulica</option>
                  <option value="Neumática">Neumática</option>
                  <option value="Instrumentación">Instrumentación</option>
                  <option value="General">General</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Teléfono</label>
                <input
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+54 11 5555-5555"
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="email@ejemplo.com"
            />
          </div>
          {!esReset && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Contraseña</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••"
              />
            </div>
          )}

          {error && (
            <p className={`text-sm ${error.includes('exitoso') ? 'text-emerald-400' : 'text-red-400'}`}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Procesando...' : esReset ? 'Enviar link' : esRegistro ? 'Crear cuenta' : 'Ingresar'}
          </button>
        </form>

        <div className="mt-4 flex flex-col items-center gap-2">
          {!esReset && (
            <button
              onClick={() => { setEsReset(true); setEsRegistro(false); setError(''); setPassword('') }}
              className="text-xs text-slate-400 hover:text-slate-300 transition-colors"
            >
              Olvidé mi contraseña
            </button>
          )}
          <button
            onClick={() => { setEsRegistro(!esRegistro); setEsReset(false); setError(''); setPassword('') }}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            {esReset ? 'Volver al inicio' : esRegistro ? 'Ya tengo cuenta' : 'Crear cuenta nueva'}
          </button>
        </div>
      </div>
    </div>
  )
}
