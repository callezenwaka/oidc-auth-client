import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { useAuth } from './auth/AuthContext'
import LoginButton from './components/LoginButton'
import ProtectedRoute from './auth/ProtectedRoute'

// Pages
import Home from './pages/Home'
import Profile from './pages/Profile'
import ApiTest from './pages/ApiTest'
import Callback from './pages/Callback'

import './App.css'

function AppContent() {
  return (
    <div className="app">
      <header>
        <nav className="navbar">
          <div className="nav-brand">
            <h1>React OIDC Demo</h1>
          </div>
          <div className="nav-links">
            <Link to="/">Home</Link>
            <Link to="/profile">Profile</Link>
            <Link to="/api-test">API Test</Link>
          </div>
          <div className="nav-auth">
            <LoginButton />
          </div>
        </nav>
      </header>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route path="/api-test" element={<ApiTest />} />
          <Route path="/callback" element={<Callback />} />
        </Routes>
      </main>

      <footer>
        <p>React + OIDC Client Demo</p>
      </footer>
    </div>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  )
}

export default App
