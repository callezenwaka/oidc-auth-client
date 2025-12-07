/**
 * Basic Authenticated API Call with Fetch
 *
 * This example demonstrates the simplest way to make an authenticated
 * API call using the fetch API and the OIDC Client library.
 */

import { UserManager } from 'oidc-client'

// OIDC Configuration
const config = {
  authority: 'https://your-identity-provider.com',
  client_id: 'your-client-id',
  redirect_uri: 'http://localhost:3000/callback',
  response_type: 'code',
  scope: 'openid profile email api',
  automaticSilentRenew: true,
}

// Initialize UserManager
const userManager = new UserManager(config)

/**
 * Make an authenticated API call
 * @param {string} url - API endpoint URL
 * @param {object} options - Fetch options
 * @returns {Promise<any>} - API response
 */
async function authenticatedFetch(url, options = {}) {
  // Get the current user (includes access token)
  const user = await userManager.getUser()

  if (!user || user.expired) {
    throw new Error('User is not authenticated or token has expired')
  }

  // Add Authorization header with Bearer token
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${user.access_token}`,
    'Content-Type': 'application/json',
  }

  // Make the API call
  const response = await fetch(url, {
    ...options,
    headers,
  })

  // Check if request was successful
  if (!response.ok) {
    throw new Error(`API call failed: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/**
 * Example usage
 */
async function exampleUsage() {
  try {
    // GET request
    const users = await authenticatedFetch('https://api.example.com/users')
    console.log('Users:', users)

    // POST request
    const newUser = await authenticatedFetch('https://api.example.com/users', {
      method: 'POST',
      body: JSON.stringify({
        name: 'John Doe',
        email: 'john@example.com'
      })
    })
    console.log('Created user:', newUser)

    // PUT request
    const updatedUser = await authenticatedFetch('https://api.example.com/users/123', {
      method: 'PUT',
      body: JSON.stringify({
        name: 'John Updated'
      })
    })
    console.log('Updated user:', updatedUser)

    // DELETE request
    await authenticatedFetch('https://api.example.com/users/123', {
      method: 'DELETE'
    })
    console.log('User deleted')

  } catch (error) {
    console.error('API Error:', error.message)
  }
}

// Export for use in other modules
export { authenticatedFetch, userManager }

// Run example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  exampleUsage()
}
