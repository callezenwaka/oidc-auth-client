/**
 * HTTP Client Wrapper Class
 *
 * A reusable HTTP client class that handles authentication,
 * token refresh, and common API patterns.
 */

import { UserManager } from 'oidc-client'

export class HttpClient {
  constructor(config) {
    this.userManager = new UserManager(config)
    this.baseUrl = config.apiBaseUrl || ''
    this.defaultHeaders = config.defaultHeaders || {}
  }

  /**
   * Get the current access token
   * @returns {Promise<string>} Access token
   */
  async getAccessToken() {
    const user = await this.userManager.getUser()

    if (!user) {
      throw new Error('User not authenticated')
    }

    // Check if token is expired or about to expire (within 60 seconds)
    const expiresIn = user.expires_at - Math.floor(Date.now() / 1000)
    if (expiresIn < 60) {
      // Token expired or expiring soon, try to renew
      try {
        const renewedUser = await this.userManager.signinSilent()
        return renewedUser.access_token
      } catch (error) {
        throw new Error('Failed to renew token: ' + error.message)
      }
    }

    return user.access_token
  }

  /**
   * Build headers for the request
   * @param {object} customHeaders - Additional headers
   * @returns {Promise<object>} Headers object
   */
  async buildHeaders(customHeaders = {}) {
    const token = await this.getAccessToken()

    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...this.defaultHeaders,
      ...customHeaders,
    }
  }

  /**
   * Build full URL
   * @param {string} endpoint - API endpoint
   * @returns {string} Full URL
   */
  buildUrl(endpoint) {
    // Handle absolute URLs
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      return endpoint
    }

    // Ensure baseUrl and endpoint are properly joined
    const base = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`

    return `${base}${path}`
  }

  /**
   * Make an HTTP request
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {object} options - Request options
   * @returns {Promise<any>} Response data
   */
  async request(method, endpoint, options = {}) {
    const { body, headers: customHeaders, ...fetchOptions } = options

    try {
      const url = this.buildUrl(endpoint)
      const headers = await this.buildHeaders(customHeaders)

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        ...fetchOptions,
      })

      // Handle different response types
      const contentType = response.headers.get('content-type')
      let data

      if (contentType && contentType.includes('application/json')) {
        data = await response.json()
      } else {
        data = await response.text()
      }

      // Check if request was successful
      if (!response.ok) {
        const error = new Error(data.message || `HTTP ${response.status}: ${response.statusText}`)
        error.status = response.status
        error.data = data
        throw error
      }

      return data

    } catch (error) {
      // Re-throw with additional context
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to reach API')
      }
      throw error
    }
  }

  /**
   * GET request
   * @param {string} endpoint - API endpoint
   * @param {object} options - Request options
   * @returns {Promise<any>} Response data
   */
  get(endpoint, options = {}) {
    return this.request('GET', endpoint, options)
  }

  /**
   * POST request
   * @param {string} endpoint - API endpoint
   * @param {object} body - Request body
   * @param {object} options - Request options
   * @returns {Promise<any>} Response data
   */
  post(endpoint, body, options = {}) {
    return this.request('POST', endpoint, { ...options, body })
  }

  /**
   * PUT request
   * @param {string} endpoint - API endpoint
   * @param {object} body - Request body
   * @param {object} options - Request options
   * @returns {Promise<any>} Response data
   */
  put(endpoint, body, options = {}) {
    return this.request('PUT', endpoint, { ...options, body })
  }

  /**
   * PATCH request
   * @param {string} endpoint - API endpoint
   * @param {object} body - Request body
   * @param {object} options - Request options
   * @returns {Promise<any>} Response data
   */
  patch(endpoint, body, options = {}) {
    return this.request('PATCH', endpoint, { ...options, body })
  }

  /**
   * DELETE request
   * @param {string} endpoint - API endpoint
   * @param {object} options - Request options
   * @returns {Promise<any>} Response data
   */
  delete(endpoint, options = {}) {
    return this.request('DELETE', endpoint, options)
  }
}

/**
 * Example usage
 */
async function exampleUsage() {
  // Initialize HTTP client with OIDC config
  const client = new HttpClient({
    authority: 'https://your-identity-provider.com',
    client_id: 'your-client-id',
    redirect_uri: 'http://localhost:3000/callback',
    response_type: 'code',
    scope: 'openid profile email api',
    apiBaseUrl: 'https://api.example.com',
    defaultHeaders: {
      'X-App-Version': '1.0.0'
    }
  })

  try {
    // GET request
    const users = await client.get('/users')
    console.log('Users:', users)

    // POST request
    const newUser = await client.post('/users', {
      name: 'John Doe',
      email: 'john@example.com'
    })
    console.log('Created user:', newUser)

    // PUT request
    const updatedUser = await client.put('/users/123', {
      name: 'John Updated'
    })
    console.log('Updated user:', updatedUser)

    // PATCH request
    const patchedUser = await client.patch('/users/123', {
      email: 'newemail@example.com'
    })
    console.log('Patched user:', patchedUser)

    // DELETE request
    await client.delete('/users/123')
    console.log('User deleted')

    // Custom headers for specific request
    const data = await client.get('/users', {
      headers: {
        'X-Custom-Header': 'value'
      }
    })
    console.log('Data with custom headers:', data)

  } catch (error) {
    console.error('API Error:', error.message)
    if (error.status) {
      console.error('Status code:', error.status)
    }
  }
}

// Run example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  exampleUsage()
}
