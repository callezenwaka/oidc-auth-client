import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  if (!isAuthenticated()) {
    // Save intended destination
    sessionStorage.setItem('returnUrl', window.location.pathname)
    return <Navigate to="/" replace />
  }

  return children
}

export default ProtectedRoute
