import { ref, readonly, onMounted } from 'vue'
import { UserManager } from 'oidc-client'
import { oidcConfig } from './config'

// Singleton UserManager instance
const userManager = new UserManager(oidcConfig)

// Reactive state
const user = ref(null)
const loading = ref(true)
const error = ref(null)

// Initialize authentication state
let initialized = false

export function useAuth() {
  const initialize = async () => {
    if (initialized) return
    initialized = true

    try {
      loading.value = true

      // Get current user
      const currentUser = await userManager.getUser()
      user.value = currentUser

      // Event handlers
      userManager.events.addUserLoaded((loadedUser) => {
        console.log('User loaded:', loadedUser)
        user.value = loadedUser
        error.value = null
      })

      userManager.events.addUserUnloaded(() => {
        console.log('User unloaded')
        user.value = null
      })

      userManager.events.addAccessTokenExpiring(() => {
        console.log('Access token expiring soon...')
      })

      userManager.events.addAccessTokenExpired(() => {
        console.log('Access token expired!')
        error.value = 'Your session has expired. Please log in again.'
      })

      userManager.events.addSilentRenewError((err) => {
        console.error('Silent renew error:', err)
        error.value = 'Failed to refresh session. Please log in again.'
      })

      userManager.events.addUserSignedOut(() => {
        console.log('User signed out')
        user.value = null
      })

    } catch (err) {
      console.error('Auth initialization error:', err)
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  onMounted(() => {
    initialize()
  })

  // Login methods
  const login = async () => {
    try {
      loading.value = true
      error.value = null
      await userManager.signinRedirect()
    } catch (err) {
      console.error('Login error:', err)
      error.value = err.message
      loading.value = false
    }
  }

  const loginPopup = async () => {
    try {
      loading.value = true
      error.value = null
      const loggedInUser = await userManager.signinPopup()
      console.log('Logged in via popup:', loggedInUser)
    } catch (err) {
      console.error('Popup login error:', err)
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  // Logout methods
  const logout = async () => {
    try {
      loading.value = true
      error.value = null
      await userManager.signoutRedirect()
    } catch (err) {
      console.error('Logout error:', err)
      error.value = err.message
      loading.value = false
    }
  }

  const logoutPopup = async () => {
    try {
      loading.value = true
      error.value = null
      await userManager.signoutPopup()
    } catch (err) {
      console.error('Popup logout error:', err)
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  // Callback handlers
  const handleCallback = async () => {
    try {
      loading.value = true
      error.value = null
      const callbackUser = await userManager.signinRedirectCallback()
      console.log('Callback user:', callbackUser)
      return callbackUser
    } catch (err) {
      console.error('Callback error:', err)
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  const handleSilentCallback = async () => {
    try {
      await userManager.signinSilentCallback()
    } catch (err) {
      console.error('Silent callback error:', err)
      throw err
    }
  }

  // Utility methods
  const isAuthenticated = () => {
    return user.value && !user.value.expired
  }

  const getAccessToken = () => {
    return user.value?.access_token
  }

  const renewToken = async () => {
    try {
      loading.value = true
      await userManager.signinSilent()
    } catch (err) {
      console.error('Token renewal error:', err)
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  return {
    // State (readonly to prevent external mutations)
    user: readonly(user),
    loading: readonly(loading),
    error: readonly(error),

    // Methods
    login,
    loginPopup,
    logout,
    logoutPopup,
    handleCallback,
    handleSilentCallback,
    isAuthenticated,
    getAccessToken,
    renewToken,

    // Direct access to userManager if needed
    userManager,
  }
}
