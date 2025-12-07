/**
 * Axios Client with Interceptors
 *
 * This example shows how to use Axios interceptors to automatically
 * add authentication tokens and handle token refresh on 401 errors.
 */

import axios from 'axios'
import { UserManager } from 'oidc-client'

/**
 * Create an Axios client with OIDC authentication
 * @param {object} oidcConfig - OIDC configuration
 * @param {object} axiosConfig - Axios configuration
 * @returns {object} Configured Axios instance
 */
export function createAuthenticatedAxiosClient(oidcConfig, axiosConfig = {}) {
  const userManager = new UserManager(oidcConfig)

  // Create Axios instance
  const axiosInstance = axios.create({
    baseURL: axiosConfig.baseURL || 'https://api.example.com',
    timeout: axiosConfig.timeout || 30000,
    ...axiosConfig,
  })

  // Request interceptor: Add access token to requests
  axiosInstance.interceptors.request.use(
    async (config) => {
      try {
        const user = await userManager.getUser()

        if (user && !user.expired) {
          config.headers.Authorization = `Bearer ${user.access_token}`
        }

        return config
      } catch (error) {
        return Promise.reject(error)
      }
    },
    (error) => {
      return Promise.reject(error)
    }
  )

  // Response interceptor: Handle token refresh on 401
  axiosInstance.interceptors.response.use(
    (response) => {
      // If response is successful, just return it
      return response
    },
    async (error) => {
      const originalRequest = error.config

      // If error is 401 and we haven't retried yet
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true

        try {
          // Try to renew the token silently
          const user = await userManager.signinSilent()

          // Update the authorization header with new token
          originalRequest.headers.Authorization = `Bearer ${user.access_token}`

          // Retry the original request
          return axiosInstance(originalRequest)
        } catch (renewError) {
          // If renewal fails, redirect to login
          console.error('Token renewal failed:', renewError)

          // Clear user session
          await userManager.removeUser()

          // Optionally redirect to login
          // window.location.href = '/login'

          return Promise.reject(renewError)
        }
      }

      // For other errors, just reject
      return Promise.reject(error)
    }
  )

  return { axiosInstance, userManager }
}

/**
 * Example usage
 */
async function exampleUsage() {
  // Initialize authenticated Axios client
  const { axiosInstance, userManager } = createAuthenticatedAxiosClient(
    {
      authority: 'https://your-identity-provider.com',
      client_id: 'your-client-id',
      redirect_uri: 'http://localhost:3000/callback',
      silent_redirect_uri: 'http://localhost:3000/silent-renew.html',
      response_type: 'code',
      scope: 'openid profile email api',
      automaticSilentRenew: true,
    },
    {
      baseURL: 'https://api.example.com',
      timeout: 10000,
    }
  )

  try {
    // GET request
    const usersResponse = await axiosInstance.get('/users')
    console.log('Users:', usersResponse.data)

    // POST request
    const createResponse = await axiosInstance.post('/users', {
      name: 'John Doe',
      email: 'john@example.com'
    })
    console.log('Created user:', createResponse.data)

    // PUT request
    const updateResponse = await axiosInstance.put('/users/123', {
      name: 'John Updated'
    })
    console.log('Updated user:', updateResponse.data)

    // DELETE request
    const deleteResponse = await axiosInstance.delete('/users/123')
    console.log('Delete response:', deleteResponse.status)

    // Request with custom config
    const customResponse = await axiosInstance.get('/users/123', {
      headers: {
        'X-Custom-Header': 'value'
      },
      timeout: 5000
    })
    console.log('Custom request:', customResponse.data)

  } catch (error) {
    if (error.response) {
      // Server responded with error status
      console.error('API Error:', error.response.status, error.response.data)
    } else if (error.request) {
      // Request made but no response received
      console.error('Network Error: No response received')
    } else {
      // Error in request setup
      console.error('Error:', error.message)
    }
  }
}

// Run example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  exampleUsage()
}
