/**
 * Auth Hook for React
 *
 * This is a simple placeholder for the auth context.
 * In a real application, this would come from your AuthProvider.
 * See /examples/react-demo/src/auth/AuthContext.jsx for full implementation.
 */

import { useContext } from 'react'
// import { AuthContext } from '../auth/AuthContext'

/**
 * Mock useAuth hook for demonstration
 * Replace this with your actual auth context hook
 */
export function useAuth() {
  // In a real app: return useContext(AuthContext)

  // Mock implementation for examples
  return {
    user: null,
    isAuthenticated: () => false,
    login: () => console.log('Login called'),
    logout: () => console.log('Logout called'),
    getAccessToken: async () => 'mock-access-token',
    renewToken: async () => console.log('Renew token called'),
  }
}
