import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { SkeletonSpinner } from '../components/Skeleton'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <SkeletonSpinner />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}
