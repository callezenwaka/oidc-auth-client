import { useState, useEffect } from 'react'
import type { User } from 'oidc-auth-client'
import { userManager } from './auth'

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [apiResult, setApiResult] = useState<string>('')

  useEffect(() => {
    // Step 3: Load current user on mount
    userManager.getUser().then(setUser)

    // Step 4: React to silent renewal outcomes
    userManager.events.addUserLoaded(setUser)
    userManager.events.addUserUnloaded(() => setUser(null))
    userManager.events.addSilentRenewError((err) => console.error('Silent renew error:', err))

    return () => {
      userManager.events.removeUserLoaded(setUser)
      userManager.events.removeUserUnloaded(() => setUser(null))
    }
  }, [])

  // Step 1: Login
  const login = () => userManager.signinRedirect()

  // Step 5: Logout
  const logout = () => userManager.signoutRedirect()

  // Step 3: Use token to call a protected API endpoint
  const callApi = async () => {
    if (!user) return
    const res = await fetch('http://localhost:4000/api/me', {
      headers: { Authorization: `Bearer ${user.access_token}` },
    })
    const data: unknown = await res.json()
    setApiResult(JSON.stringify(data, null, 2))
  }

  const authenticated = !!user && !user.expired

  return (
    <div>
      <header>
        <h1>oidc-auth-client</h1>
        {authenticated
          ? <button type="button" onClick={logout}>Sign Out</button>
          : <button type="button" onClick={login}>Sign In</button>
        }
      </header>

      <main>
        {!authenticated && (
          <p>Sign in to view your profile and call a protected API.</p>
        )}

        {authenticated && (
          <>
            <section>
              <h2>Profile</h2>
              <p><strong>Name:</strong> {user.profile.name as string}</p>
              <p><strong>Email:</strong> {user.profile.email as string}</p>
              <p><strong>Subject:</strong> {user.profile.sub}</p>
            </section>

            <section>
              <h2>API</h2>
              <button type="button" onClick={callApi}>Call GET /api/me</button>
              {apiResult && <pre>{apiResult}</pre>}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
