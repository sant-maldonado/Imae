import { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const toast = useToast()
  const [user, setUser] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)
  const vivo = useRef(true)
  const logoutPido = useRef(false)
  // En ref para no meter el toast en el array de deps del efecto de auth.
  const toastRef = useRef(null)
  useEffect(() => { toastRef.current = toast }, [toast])

  const cargarPerfil = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (!vivo.current) return
      setPerfil(error ? null : data)
    } catch {
      if (vivo.current) setPerfil(null)
    }
  }, [])

  useEffect(() => {
    vivo.current = true
    const safetyTimer = setTimeout(() => {
      if (vivo.current) setLoading(false)
    }, 15000)

    // getSession() devuelve lo que hay en localStorage SIN validarlo. El
    // getUser() si va al servidor: sin el, una sesion revocada (por ejemplo
    // tras un cambio de password) dejaba la app creyendo que estaba logueada
    // y todas las queries volvian con 0 filas por RLS, sin error visible.
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        if (!session) {
          if (vivo.current) {
            setUser(null)
            setLoading(false)
          }
          return
        }
        const { data: { user: verificado } } = await supabase.auth.getUser()
        if (vivo.current) setUser(verificado ?? null)
        if (verificado) await cargarPerfil(verificado.id)
        if (vivo.current) setLoading(false)
        clearTimeout(safetyTimer)
      })
      .catch(() => {
        if (vivo.current) setLoading(false)
        clearTimeout(safetyTimer)
      })

    // Sin esta suscripcion el contexto nunca se enteraba de que la sesion
    // habia muerto. Ojo: el callback corre con un lock interno de supabase-js,
    // por eso las llamadas async se difieran con setTimeout.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((evento, sesion) => {
      setTimeout(() => {
        if (!vivo.current) return

        if (evento === 'SIGNED_OUT') {
          const avisa = !logoutPido.current
          logoutPido.current = false
          setUser(null)
          setPerfil(null)
          if (avisa) toastRef.current?.error?.('Tu sesión expiró. Volvé a iniciar sesión.')
          return
        }

        if (sesion?.user) {
          setUser(sesion.user)
          cargarPerfil(sesion.user.id)
        }
      }, 0)
    })

    return () => {
      vivo.current = false
      clearTimeout(safetyTimer)
      subscription?.unsubscribe()
    }
  }, [cargarPerfil])

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    setUser(data.user)
    await cargarPerfil(data.user.id)
  }

  const register = async (email, password, nombre, especialidad, telefono) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre } },
    })
    if (error) throw error
    await supabase.from('tecnicos').insert({
      nombre,
      email,
      especialidad: especialidad || null,
      telefono: telefono || null,
      created_by: data.user.id,
    })
  }

  const refreshPerfil = async () => {
    if (!user) return
    const { data } = await supabase
      .from('perfiles')
      .select('*')
      .eq('id', user.id)
      .single()
    setPerfil(data)
  }

  const changePassword = async (currentPassword, newPassword) => {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })
    if (signInError) throw new Error('Contraseña actual incorrecta')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  }

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw error
  }

  const logout = async () => {
    logoutPido.current = true
    await supabase.auth.signOut()
    setUser(null)
    setPerfil(null)
  }

  return (
    <AuthContext.Provider value={{ user, perfil, loading, login, register, refreshPerfil, changePassword, resetPassword, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
