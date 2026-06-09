import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, supabaseUrl } from '../lib/supabase'

const STORAGE_KEY = `sb-${supabaseUrl.match(/https:\/\/(.+)\.supabase/)[1]}-auth-token`

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      setLoading(false)
    }, 15000)

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        supabase
          .from('perfiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => setPerfil(data))
          .catch(() => setPerfil(null))
      }
      setLoading(false)
      clearTimeout(safetyTimer)
    }).catch(() => {
      setLoading(false)
      clearTimeout(safetyTimer)
    })

    return () => clearTimeout(safetyTimer)
  }, [])

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    setUser(data.user)
    const { data: perfilData } = await supabase
      .from('perfiles')
      .select('*')
      .eq('id', data.user.id)
      .single()
    setPerfil(perfilData)
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
