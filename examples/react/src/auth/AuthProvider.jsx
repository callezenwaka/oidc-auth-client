import { useState, useEffect, useCallback } from 'react'
import { UserManager } from 'oidc-client'
import AuthContext from './AuthContext'
import { oidcConfig } from './config'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [userManager] = useState(() => new UserManager(oidcConfig))

  useEffect(() => {
    // Initialize auth state
    userManager.getUser().then(user => {
      setUser(user)
      setLoading(false)
    })

    // Event listeners
    const handleUserLoaded = (user) => {
      console.log('User loaded:', user)
      setUser(user)
      setError(null)
    }

    const handleUserUnloaded = () => {
      console.log('User unloaded')
      setUser(null)
    }

    const handleAccessTokenExpiring = () => {
      console.log('Access token expiring...')
    }

    const handleAccessTokenExpired = () => {
      console.log('Access token expired')
      setError('Your session has expired. Please log in again.')
      setUser(null)
    }

    const handleSilentRenewError = (err) => {
      console.error('Silent renew error:', err)
      setError('Failed to refresh session: ' + err.message)
    }

    userManager.events.addUserLoaded(handleUserLoaded)
    userManager.events.addUserUnloaded(handleUserUnloaded)
    userManager.events.addAccessTokenExpiring(handleAccessTokenExpiring)
    userManager.events.addAccessTokenExpired(handleAccessTokenExpired)
    userManager.events.addSilentRenewError(handleSilentRenewError)

    return () => {
      userManager.events.removeUserLoaded(handleUserLoaded)
      userManager.events.removeUserUnloaded(handleUserUnloaded)
      userManager.events.removeAccessTokenExpiring(handleAccessTokenExpiring)
      userManager.events.removeAccessTokenExpired(handleAccessTokenExpired)
      userManager.events.removeSilentRenewError(handleSilentRenewError)
    }
  }, [userManager])

  const login = useCallback(() => {
    return userManager.signinRedirect()
  }, [userManager])

  const logout = useCallback(() => {
    return userManager.signoutRedirect()
  }, [userManager])

  const handleCallback = useCallback(() => {
    return userManager.signinRedirectCallback()
  }, [userManager])

  const isAuthenticated = useCallback(() => {
    return user && !user.expired
  }, [user])

  const getAccessToken = useCallback(() => {
    return user?.access_token
  }, [user])

  const renewToken = useCallback(async () => {
    try {
      setLoading(true)
      await userManager.signinSilent()
    } catch (err) {
      console.error('Token renewal error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [userManager])

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    handleCallback,
    isAuthenticated,
    getAccessToken,
    renewToken,
    userManager,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
