import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { Loading } from './ui.jsx'

export default function ProtectedRoute({ children, role = null }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <Loading label="Проверяем доступ…" />
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (role && user.role !== role) {
    return <Navigate to="/" replace />
  }

  return children
}