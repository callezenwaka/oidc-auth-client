/**
 * API Error Handling
 *
 * Comprehensive error handling for API calls including
 * custom error classes, retry logic, and error recovery.
 */

import { UserManager } from 'oidc-client'

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

/**
 * Network Error class
 */
export class NetworkError extends Error {
  constructor(message) {
    super(message)
    this.name = 'NetworkError'
  }
}

/**
 * Authentication Error class
 */
export class AuthenticationError extends Error {
  constructor(message) {
    super(message)
    this.name = 'AuthenticationError'
  }
}

/**
 * API Client with error handling
 */
export class ApiClient {
  constructor(config) {
    this.userManager = new UserManager(config.oidc)
    this.baseUrl = config.baseUrl || ''
    this.maxRetries = config.maxRetries || 3
    this.retryDelay = config.retryDelay || 1000
    this.retryableStatuses = config.retryableStatuses || [408, 429, 500, 502, 503, 504]
  }

  /**
   * Get access token with error handling
   */
  async getAccessToken() {
    try {
      const user = await this.userManager.getUser()

      if (!user) {
        throw new AuthenticationError('User not authenticated')
      }

      if (user.expired) {
        // Try to renew token
        try {
          const renewedUser = await this.userManager.signinSilent()
          return renewedUser.access_token
        } catch (renewError) {
          throw new AuthenticationError('Token expired and renewal failed')
        }
      }

      return user.access_token
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error
      }
      throw new AuthenticationError('Failed to get access token: ' + error.message)
    }
  }

  /**
   * Sleep utility for retry delays
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Make HTTP request with retries
   */
  async request(method, endpoint, options = {}, retryCount = 0) {
    try {
      const token = await this.getAccessToken()
      const url = this.baseUrl + endpoint

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        ...options,
      })

      // Parse response
      const contentType = response.headers.get('content-type')
      let data

      if (contentType && contentType.includes('application/json')) {
        data = await response.json()
      } else {
        data = await response.text()
      }

      // Handle errors
      if (!response.ok) {
        // Check if we should retry
        if (
          this.retryableStatuses.includes(response.status) &&
          retryCount < this.maxRetries
        ) {
          const delay = this.retryDelay * Math.pow(2, retryCount) // Exponential backoff
          console.log(`Retrying request (attempt ${retryCount + 1}/${this.maxRetries}) after ${delay}ms...`)
          await this.sleep(delay)
          return this.request(method, endpoint, options, retryCount + 1)
        }

        // Special handling for 401 (try token refresh once)
        if (response.status === 401 && retryCount === 0) {
          try {
            await this.userManager.signinSilent()
            return this.request(method, endpoint, options, retryCount + 1)
          } catch (renewError) {
            throw new AuthenticationError('Authentication failed: Token refresh unsuccessful')
          }
        }

        throw new ApiError(
          data.message || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          data
        )
      }

      return data

    } catch (error) {
      // Handle network errors
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        if (retryCount < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, retryCount)
          console.log(`Network error, retrying (attempt ${retryCount + 1}/${this.maxRetries}) after ${delay}ms...`)
          await this.sleep(delay)
          return this.request(method, endpoint, options, retryCount + 1)
        }
        throw new NetworkError('Network error: Unable to reach API')
      }

      // Re-throw known errors
      if (error instanceof ApiError || error instanceof AuthenticationError) {
        throw error
      }

      // Wrap unknown errors
      throw new Error('Unexpected error: ' + error.message)
    }
  }

  /**
   * GET request
   */
  get(endpoint, options = {}) {
    return this.request('GET', endpoint, options)
  }

  /**
   * POST request
   */
  post(endpoint, body, options = {}) {
    return this.request('POST', endpoint, { ...options, body })
  }

  /**
   * PUT request
   */
  put(endpoint, body, options = {}) {
    return this.request('PUT', endpoint, { ...options, body })
  }

  /**
   * DELETE request
   */
  delete(endpoint, options = {}) {
    return this.request('DELETE', endpoint, options)
  }
}

/**
 * Example usage with comprehensive error handling
 */
async function exampleUsage() {
  const client = new ApiClient({
    oidc: {
      authority: 'https://your-identity-provider.com',
      client_id: 'your-client-id',
      redirect_uri: 'http://localhost:3000/callback',
      silent_redirect_uri: 'http://localhost:3000/silent-renew.html',
      response_type: 'code',
      scope: 'openid profile email api',
    },
    baseUrl: 'https://api.example.com',
    maxRetries: 3,
    retryDelay: 1000,
  })

  try {
    // Make API call
    const users = await client.get('/users')
    console.log('Success:', users)

  } catch (error) {
    // Handle specific error types
    if (error instanceof AuthenticationError) {
      console.error('Authentication Error:', error.message)
      // Redirect to login page
      // window.location.href = '/login'

    } else if (error instanceof NetworkError) {
      console.error('Network Error:', error.message)
      // Show offline message to user
      // showOfflineMessage()

    } else if (error instanceof ApiError) {
      console.error('API Error:', error.message)
      console.error('Status:', error.status)
      console.error('Data:', error.data)

      // Handle specific status codes
      switch (error.status) {
        case 400:
          console.error('Bad request - check your data')
          break
        case 403:
          console.error('Forbidden - insufficient permissions')
          break
        case 404:
          console.error('Resource not found')
          break
        case 500:
          console.error('Server error - try again later')
          break
        default:
          console.error('Unexpected error')
      }

    } else {
      console.error('Unexpected error:', error.message)
    }
  }
}

// Run example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  exampleUsage()
}
