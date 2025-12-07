import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import './ApiTest.css'

function ApiTest() {
  const { isAuthenticated, getAccessToken } = useAuth()

  const [apiUrl, setApiUrl] = useState('https://jsonplaceholder.typicode.com/users/1')
  const [httpMethod, setHttpMethod] = useState('GET')
  const [isLoading, setIsLoading] = useState(false)
  const [response, setResponse] = useState(null)

  const testApi = async () => {
    if (!isAuthenticated()) {
      setResponse({
        error: 'Not authenticated. Please sign in first.'
      })
      return
    }

    setIsLoading(true)
    setResponse(null)

    try {
      const token = getAccessToken()

      const fetchResponse = await fetch(apiUrl, {
        method: httpMethod,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      // Get headers
      const headers = {}
      fetchResponse.headers.forEach((value, key) => {
        headers[key] = value
      })

      // Get body
      const contentType = fetchResponse.headers.get('content-type')
      let body
      if (contentType && contentType.includes('application/json')) {
        body = await fetchResponse.json()
      } else {
        body = await fetchResponse.text()
      }

      setResponse({
        status: fetchResponse.status,
        statusText: fetchResponse.statusText,
        headers,
        body,
      })

    } catch (error) {
      setResponse({
        error: error.message
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="api-test-page">
      <h2>API Test</h2>
      <p>Test authenticated API calls with your access token</p>

      <div className="card">
        <h3>Make an API Request</h3>
        <div className="form-group">
          <label htmlFor="api-url">API Endpoint URL:</label>
          <input
            type="text"
            id="api-url"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="https://api.example.com/endpoint"
          />
        </div>
        <div className="form-group">
          <label htmlFor="http-method">HTTP Method:</label>
          <select
            id="http-method"
            value={httpMethod}
            onChange={(e) => setHttpMethod(e.target.value)}
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>
        <button
          onClick={testApi}
          className="btn btn-primary"
          disabled={!isAuthenticated() || isLoading}
        >
          {isLoading ? 'Sending...' : 'Send Request'}
        </button>

        {!isAuthenticated() && (
          <div className="alert alert-warning mt-2">
            Please sign in to test API calls
          </div>
        )}
      </div>

      {response && (
        <div className="card">
          <h3>Response</h3>
          {response.error ? (
            <div className="alert alert-error">
              <strong>Error:</strong> {response.error}
            </div>
          ) : (
            <>
              <h4>Headers</h4>
              <pre>{JSON.stringify(response.headers, null, 2)}</pre>

              <h4>Body</h4>
              <pre>{JSON.stringify(response.body, null, 2)}</pre>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default ApiTest
