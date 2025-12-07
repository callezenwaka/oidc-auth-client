import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import './Home.css'

function Home() {
  const { user, login, isAuthenticated } = useAuth()

  return (
    <div className="home">
      <h1>Welcome to React OIDC Demo</h1>
      <p className="subtitle">A complete example of OIDC authentication with React 18</p>

      <div className="card">
        <h3>Getting Started</h3>
        <ol>
          <li>Configure your Identity Provider in <code>src/auth/config.js</code></li>
          <li>Click "Sign In" to authenticate</li>
          <li>You'll be redirected to your identity provider</li>
          <li>After authentication, you'll be redirected back</li>
          <li>View your profile and test authenticated API calls</li>
        </ol>
      </div>

      <div className="features">
        <div className="feature-card">
          <h4>🔐 Secure Authentication</h4>
          <p>OAuth 2.0 / OpenID Connect protocol with PKCE</p>
        </div>
        <div className="feature-card">
          <h4>🔄 Auto Token Refresh</h4>
          <p>Silent token renewal before expiration</p>
        </div>
        <div className="feature-card">
          <h4>📊 Session Monitoring</h4>
          <p>Track authentication state across tabs</p>
        </div>
      </div>

      <div className="cta">
        {!isAuthenticated() ? (
          <button onClick={login} className="btn btn-primary btn-large">
            Get Started - Sign In
          </button>
        ) : (
          <>
            <p>Welcome back, {user?.profile?.name}!</p>
            <Link to="/profile" className="btn btn-primary btn-large">
              View Profile
            </Link>
          </>
        )}
      </div>
    </div>
  )
}

export default Home
