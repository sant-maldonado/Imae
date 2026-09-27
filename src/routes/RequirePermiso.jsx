import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { puede } from '../lib/permissions'

// Segunda puerta despues de ProtectedRoute: le esconde la pagina a los roles que
// no la pueden usar. Esto es solo UX, el muro real es el RLS de
// interno/aplicar_rls_ordenes.sql. El que tipea la URL a mano vuelve al
// dashboard en vez de caer en una pagina que despues no va a poder guardar.
export default function RequirePermiso({ capacidad, children }) {
  const { perfil, loading } = useAuth()

  if (loading) return null
  if (!puede(perfil?.rol, capacidad)) return <Navigate to="/" replace />

  return children
}
