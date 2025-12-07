import { useAuth } from '../auth/AuthContext'
import './LoginButton.css'

function LoginButton() {
  const { user, loading, error, login, logout, isAuthenticated } = useAuth()

  const displayName = user?.profile?.name || user?.profile?.email || 'User'

  return (
    <div className="login-button">
      {!isAuthenticated() ? (
        <button
          onClick={login}
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? 'Loading...' : 'Sign In'}
        </button>
      ) : (
        <div className="user-menu">
          <span className="user-name">{displayName}</span>
          <button onClick={logout} className="btn btn-secondary">
            Sign Out
          </button>
        </div>
      )}

      {error && (
        <div className="alert alert-error mt-2">
          {error}
        </div>
      )}
    </div>
  )
}

export default LoginButton
