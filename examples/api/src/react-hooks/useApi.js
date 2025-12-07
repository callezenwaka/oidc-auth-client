/**
 * React Hooks for API Calls
 *
 * Custom React hooks for making authenticated API calls
 * with loading states, error handling, and automatic refetching.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from './useAuth' // Assuming useAuth hook from auth context

/**
 * Basic API hook
 * @param {string} url - API endpoint URL
 * @param {object} options - Fetch options
 * @returns {object} { data, loading, error, refetch }
 */
export function useApi(url, options = {}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { getAccessToken } = useAuth()

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const token = await getAccessToken()

      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [url, options, getAccessToken])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

/**
 * API hook with manual trigger
 * @param {string} url - API endpoint URL
 * @param {object} options - Fetch options
 * @returns {object} { data, loading, error, execute }
 */
export function useLazyApi(url, options = {}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { getAccessToken } = useAuth()

  const execute = useCallback(async (overrideOptions = {}) => {
    setLoading(true)
    setError(null)

    try {
      const token = await getAccessToken()
      const mergedOptions = { ...options, ...overrideOptions }

      const response = await fetch(url, {
        ...mergedOptions,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...mergedOptions.headers,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      setData(result)
      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [url, options, getAccessToken])

  return { data, loading, error, execute }
}

/**
 * API mutation hook (POST, PUT, DELETE)
 * @param {string} url - API endpoint URL
 * @param {string} method - HTTP method (POST, PUT, DELETE)
 * @returns {object} { data, loading, error, mutate }
 */
export function useMutation(url, method = 'POST') {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { getAccessToken } = useAuth()

  const mutate = useCallback(async (body, options = {}) => {
    setLoading(true)
    setError(null)

    try {
      const token = await getAccessToken()

      const response = await fetch(url, {
        method,
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers,
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      setData(result)
      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [url, method, getAccessToken])

  const reset = useCallback(() => {
    setData(null)
    setError(null)
    setLoading(false)
  }, [])

  return { data, loading, error, mutate, reset }
}

/**
 * Advanced API hook with caching and refetching
 * @param {string} url - API endpoint URL
 * @param {object} config - Configuration options
 * @returns {object} { data, loading, error, refetch, invalidate }
 */
export function useApiAdvanced(url, config = {}) {
  const {
    enabled = true,
    refetchInterval = null,
    cacheTime = 5 * 60 * 1000, // 5 minutes
    staleTime = 0,
    onSuccess,
    onError,
  } = config

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState(null)
  const { getAccessToken } = useAuth()

  const cacheRef = useRef(new Map())
  const lastFetchRef = useRef(null)
  const intervalRef = useRef(null)

  const fetchData = useCallback(async (force = false) => {
    // Check cache
    if (!force && cacheRef.current.has(url)) {
      const cached = cacheRef.current.get(url)
      const age = Date.now() - cached.timestamp

      if (age < staleTime) {
        setData(cached.data)
        setLoading(false)
        return cached.data
      }
    }

    setLoading(true)
    setError(null)

    try {
      const token = await getAccessToken()

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()

      // Update cache
      cacheRef.current.set(url, {
        data: result,
        timestamp: Date.now(),
      })

      // Clean old cache entries
      for (const [key, value] of cacheRef.current.entries()) {
        if (Date.now() - value.timestamp > cacheTime) {
          cacheRef.current.delete(key)
        }
      }

      setData(result)
      lastFetchRef.current = Date.now()

      if (onSuccess) {
        onSuccess(result)
      }

      return result
    } catch (err) {
      setError(err.message)

      if (onError) {
        onError(err)
      }

      throw err
    } finally {
      setLoading(false)
    }
  }, [url, getAccessToken, staleTime, cacheTime, onSuccess, onError])

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      fetchData()
    }
  }, [enabled, fetchData])

  // Refetch interval
  useEffect(() => {
    if (refetchInterval && enabled) {
      intervalRef.current = setInterval(() => {
        fetchData()
      }, refetchInterval)

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
      }
    }
  }, [refetchInterval, enabled, fetchData])

  const invalidate = useCallback(() => {
    cacheRef.current.delete(url)
    return fetchData(true)
  }, [url, fetchData])

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    invalidate,
  }
}

/**
 * Example Components
 */

// Example 1: Basic usage
export function UsersList() {
  const { data: users, loading, error, refetch } = useApi('https://api.example.com/users')

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div>
      <button onClick={refetch}>Refresh</button>
      <ul>
        {users?.map(user => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  )
}

// Example 2: Lazy loading
export function UserSearch() {
  const { data, loading, error, execute } = useLazyApi('https://api.example.com/users/search')

  const handleSearch = async (query) => {
    await execute({
      method: 'POST',
      body: JSON.stringify({ query })
    })
  }

  return (
    <div>
      <input
        type="text"
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search users..."
      />
      {loading && <div>Searching...</div>}
      {error && <div>Error: {error}</div>}
      {data && <div>Results: {JSON.stringify(data)}</div>}
    </div>
  )
}

// Example 3: Mutation
export function CreateUser() {
  const { data, loading, error, mutate } = useMutation('https://api.example.com/users', 'POST')

  const handleSubmit = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)

    try {
      await mutate({
        name: formData.get('name'),
        email: formData.get('email')
      })
      alert('User created successfully!')
    } catch (err) {
      console.error('Failed to create user:', err)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" placeholder="Name" required />
      <input name="email" type="email" placeholder="Email" required />
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create User'}
      </button>
      {error && <div>Error: {error}</div>}
      {data && <div>Created: {data.name}</div>}
    </form>
  )
}

// Example 4: Advanced usage with caching
export function Dashboard() {
  const { data: stats, loading, refetch } = useApiAdvanced(
    'https://api.example.com/stats',
    {
      refetchInterval: 30000, // Refetch every 30 seconds
      staleTime: 10000, // Consider data stale after 10 seconds
      cacheTime: 300000, // Keep cache for 5 minutes
      onSuccess: (data) => {
        console.log('Stats updated:', data)
      },
      onError: (error) => {
        console.error('Failed to fetch stats:', error)
      }
    }
  )

  if (loading) return <div>Loading dashboard...</div>

  return (
    <div>
      <h1>Dashboard</h1>
      <button onClick={() => refetch(true)}>Force Refresh</button>
      <pre>{JSON.stringify(stats, null, 2)}</pre>
    </div>
  )
}
