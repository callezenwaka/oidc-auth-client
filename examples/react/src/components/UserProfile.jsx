import { useAuth } from '../auth/AuthContext'
import './UserProfile.css'

function UserProfile() {
  const { user, loading, login, isAuthenticated, renewToken } = useAuth()

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading user profile...</p>
      </div>
    )
  }

  if (!isAuthenticated()) {
    return (
      <div className="card text-center">
        <p>Please sign in to view your profile</p>
        <button onClick={login} className="btn btn-primary mt-2">
          Sign In
        </button>
      </div>
    )
  }

  const expiresAt = user?.expires_at
    ? new Date(user.expires_at * 1000).toLocaleString()
    : 'N/A'

  const tokenPreview = user?.access_token
    ? user.access_token.substring(0, 50) + '...'
    : 'N/A'

  return (
    <div className="user-profile">
      <h2>User Profile</h2>

      <div className="card">
        <h3>Basic Information</h3>
        <dl>
          <dt>Name:</dt>
          <dd>{user?.profile?.name || 'N/A'}</dd>

          <dt>Email:</dt>
          <dd>{user?.profile?.email || 'N/A'}</dd>

          <dt>Username:</dt>
          <dd>{user?.profile?.preferred_username || 'N/A'}</dd>

          <dt>Subject:</dt>
          <dd>{user?.profile?.sub || 'N/A'}</dd>
        </dl>
      </div>

      <div className="card">
        <h3>Token Information</h3>
        <dl>
          <dt>Token Type:</dt>
          <dd>{user?.token_type}</dd>

          <dt>Expires At:</dt>
          <dd>{expiresAt}</dd>

          <dt>Scopes:</dt>
          <dd>{user?.scope}</dd>

          <dt>Access Token (first 50 chars):</dt>
          <dd><code>{tokenPreview}</code></dd>
        </dl>

        <button onClick={renewToken} className="btn btn-primary mt-2">
          Refresh Token
        </button>
      </div>

      <div className="card">
        <h3>All Claims</h3>
        <pre>{JSON.stringify(user?.profile, null, 2)}</pre>
      </div>
    </div>
  )
}

export default UserProfile
