import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

function Callback() {
  const navigate = useNavigate()
  const { handleCallback } = useAuth()
  const [processing, setProcessing] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function processCallback() {
      try {
        await handleCallback()
        // Redirect to intended page or home
        const returnUrl = sessionStorage.getItem('returnUrl') || '/'
        sessionStorage.removeItem('returnUrl')
        navigate(returnUrl)
      } catch (err) {
        setError(err.message || 'Failed to complete login')
        setProcessing(false)
      }
    }

    processCallback()
  }, [handleCallback, navigate])

  if (error) {
    return (
      <div className="callback-page">
        <div className="card text-center">
          <div className="alert alert-error">
            <h2>Login Error</h2>
            <p>{error}</p>
          </div>
          <button onClick={() => navigate('/')} className="btn btn-primary">
            Go to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="callback-page">
      {processing && (
        <div className="loading">
          <div className="spinner"></div>
          <h2>Processing login...</h2>
          <p>Please wait while we complete your authentication.</p>
        </div>
      )}
    </div>
  )
}

export default Callback
