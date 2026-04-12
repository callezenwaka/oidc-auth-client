import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { userManager } from './auth'

// Step 2: Exchange the auth code for tokens and store the user
export default function Callback() {
  const navigate = useNavigate()
  const called = useRef(false)

  useEffect(() => {
    if (called.current) return
    called.current = true
    userManager.signinRedirectCallback()
      .then(() => navigate('/'))
      .catch(console.error)
  }, [navigate])

  return <p>Completing sign-in...</p>
}
