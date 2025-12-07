# API Examples - Working Code Samples

Complete working code examples for making authenticated HTTP requests using access tokens from the OIDC client.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Basic Fetch with Auth](#basic-fetch-with-auth)
3. [HTTP Client Wrapper](#http-client-wrapper)
4. [Axios Integration](#axios-integration)
5. [Error Handling](#error-handling)
6. [React Hooks](#react-hooks)
7. [Backend Validation](#backend-validation)
8. [Best Practices](#best-practices)

## Getting Started

Install dependencies:

```bash
npm install
```

Run examples:

```bash
# Basic fetch example
npm run demo:basic

# HTTP client wrapper
npm run demo:http-client

# Error handling demo
npm run demo:error-handling
```

## Project Structure

```
api-examples/
├── src/
│   ├── http-client/
│   │   ├── basic-fetch.js       # Simple authenticated fetch
│   │   └── http-client.js       # Complete HTTP client class
│   ├── axios-interceptors/
│   │   └── axios-client.js      # Axios with auto token refresh
│   ├── error-handling/
│   │   └── api-error-handler.js # Comprehensive error handling
│   ├── react-hooks/
│   │   ├── useApi.js            # React hooks for API calls
│   │   └── useAuth.js           # Auth hook placeholder
│   └── backend-validation/
│       ├── node-express.js      # Express JWT validation
│       └── package.json         # Backend dependencies
├── package.json
└── README.md
```

---

## 1. Basic Fetch with Auth

### Simple Example

```javascript
import { userManager } from './auth/config';

async function callApi(url) {
  // Get the current user (with access token)
  const user = await userManager.getUser();

  if (!user || user.expired) {
    throw new Error('User not authenticated');
  }

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${user.access_token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Usage
call Api('https://api.example.com/user/profile')
  .then(data => console.log(data))
  .catch(error => console.error(error));
```

---

## 2. HTTP Client Wrapper

### Complete Implementation

```javascript
// src/api/httpClient.js
import { userManager } from '../auth/config';

export class HttpClient {
  constructor(baseURL = '') {
    this.baseURL = baseURL;
  }

  async getAccessToken() {
    const user = await userManager.getUser();

    if (!user || user.expired) {
      throw new Error('Not authenticated');
    }

    return user.access_token;
  }

  async request(endpoint, options = {}) {
    const token = await this.getAccessToken();

    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    };

    const config = {
      ...options,
      headers,
    };

    // If body exists and is an object, stringify it
    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    const response = await fetch(url, config);

    // Handle 401 - token might be expired, try to refresh
    if (response.status === 401) {
      console.log('Got 401, attempting token refresh...');
      await userManager.signinSilent();

      // Retry the request with new token
      const newToken = await this.getAccessToken();
      headers.Authorization = `Bearer ${newToken}`;

      const retryResponse = await fetch(url, { ...config, headers });
      return this.handleResponse(retryResponse);
    }

    return this.handleResponse(response);
  }

  async handleResponse(response) {
    const contentType = response.headers.get('content-type');

    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const error = new Error(data.message || `HTTP ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  // Convenience methods
  get(endpoint, options) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, body, options) {
    return this.request(endpoint, { ...options, method: 'POST', body });
  }

  put(endpoint, body, options) {
    return this.request(endpoint, { ...options, method: 'PUT', body });
  }

  patch(endpoint, body, options) {
    return this.request(endpoint, { ...options, method: 'PATCH', body });
  }

  delete(endpoint, options) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

// Create instance
export const apiClient = new HttpClient('https://api.example.com');

// Usage
// GET request
const users = await apiClient.get('/users');

// POST request
const newUser = await apiClient.post('/users', {
  name: 'John Doe',
  email: 'john@example.com'
});

// PUT request
const updated = await apiClient.put('/users/123', {
  name: 'Jane Doe'
});

// DELETE request
await apiClient.delete('/users/123');
```

---

## 3. Axios Integration

### Axios HTTP Client with Interceptors

```javascript
// src/api/axiosClient.js
import axios from 'axios';
import { userManager } from '../auth/config';

const axiosClient = axios.create({
  baseURL: 'https://api.example.com',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add access token
axiosClient.interceptors.request.use(
  async (config) => {
    const user = await userManager.getUser();

    if (user && !user.expired) {
      config.headers.Authorization = `Bearer ${user.access_token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle 401 and refresh token
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Attempt silent token refresh
        await userManager.signinSilent();
        const user = await userManager.getUser();

        // Update authorization header
        originalRequest.headers.Authorization = `Bearer ${user.access_token}`;

        // Retry original request
        return axiosClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        console.error('Token refresh failed:', refreshError);
        await userManager.signinRedirect();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;

// Usage
import api from './api/axiosClient';

// GET
const users = await api.get('/users');

// POST
const newUser = await api.post('/users', {
  name: 'John Doe',
  email: 'john@example.com'
});

// Error handling
try {
  const data = await api.get('/protected');
  console.log(data);
} catch (error) {
  if (error.response) {
    console.error('Server error:', error.response.status);
  } else if (error.request) {
    console.error('Network error');
  } else {
    console.error('Error:', error.message);
  }
}
```

---

## 4. Error Handling

### Comprehensive Error Handler

```javascript
// src/api/errorHandler.js

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export function handleApiError(error) {
  // Network error
  if (!error.response) {
    return {
      message: 'Network error. Please check your connection.',
      type: 'network',
    };
  }

  const { status, data } = error.response;

  // Authentication errors
  if (status === 401) {
    return {
      message: 'Session expired. Please log in again.',
      type: 'auth',
    };
  }

  if (status === 403) {
    return {
      message: 'You do not have permission to access this resource.',
      type: 'permission',
    };
  }

  // Client errors
  if (status >= 400 && status < 500) {
    return {
      message: data.message || 'Invalid request.',
      type: 'client',
    };
  }

  // Server errors
  if (status >= 500) {
    return {
      message: 'Server error. Please try again later.',
      type: 'server',
    };
  }

  return {
    message: error.message || 'An unknown error occurred.',
    type: 'unknown',
  };
}

// Usage with React
import { useState } from 'react';
import { handleApiError } from './api/errorHandler';

function MyComponent() {
  const [error, setError] = useState(null);

  async function loadData() {
    try {
      const data = await apiClient.get('/data');
      setError(null);
      return data;
    } catch (err) {
      const errorInfo = handleApiError(err);
      setError(errorInfo.message);
      throw err;
    }
  }

  return (
    <div>
      {error && <div className="error">{error}</div>}
      {/* ... */}
    </div>
  );
}
```

---

## 5. React Hook for API Calls

```javascript
// src/hooks/useApi.js
import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/httpClient';

export function useApi(endpoint, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await apiClient.get(endpoint, options);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [endpoint, options]);

  useEffect(() => {
    if (options.manual) return;
    fetchData();
  }, [fetchData, options.manual]);

  const refetch = useCallback(() => {
    return fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
}

// Usage in Component
function UserList() {
  const { data: users, loading, error, refetch } = useApi('/users');

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <button onClick={refetch}>Refresh</button>
      {users.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  );
}
```

---

## 6. GraphQL Integration

```javascript
// src/api/graphqlClient.js
import { userManager } from '../auth/config';

export async function graphqlRequest(query, variables = {}) {
  const user = await userManager.getUser();

  if (!user || user.expired) {
    throw new Error('Not authenticated');
  }

  const response = await fetch('https://api.example.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${user.access_token}`,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  const result = await response.json();

  if (result.errors) {
    throw new Error(result.errors[0].message);
  }

  return result.data;
}

// Usage
const QUERY = `
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      name
      email
    }
  }
`;

const data = await graphqlRequest(QUERY, { id: '123' });
console.log(data.user);
```

---

## 7. Backend Token Validation

### Node.js/Express Example

```javascript
// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// JWKS client for fetching public keys
const client = jwksClient({
  jwksUri: 'https://your-idp.com/.well-known/jwks.json',
  cache: true,
  rateLimit: true,
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

// Middleware to verify JWT token
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(
    token,
    getKey,
    {
      audience: 'your-client-id',
      issuer: 'https://your-idp.com',
      algorithms: ['RS256'],
    },
    (err, decoded) => {
      if (err) {
        console.error('Token verification failed:', err);
        return res.status(403).json({ error: 'Invalid token' });
      }

      req.user = decoded;
      next();
    }
  );
}

// Usage in routes
app.get('/api/protected', authenticateToken, (req, res) => {
  res.json({
    message: 'This is protected data',
    user: req.user,
  });
});
```

---

## 8. Testing Authenticated Requests

```javascript
// tests/api.test.js
import { apiClient } from '../src/api/httpClient';
import { userManager } from '../src/auth/config';

// Mock the user manager
jest.mock('../src/auth/config');

describe('API Client', () => {
  beforeEach(() => {
    // Mock getUser to return a valid user
    userManager.getUser.mockResolvedValue({
      access_token: 'mock-token',
      expired: false,
    });

    // Mock fetch
    global.fetch = jest.fn();
  });

  it('should include authorization header', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: 'test' }),
      headers: new Headers({ 'content-type': 'application/json' }),
    });

    await apiClient.get('/test');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer mock-token',
        }),
      })
    );
  });

  it('should refresh token on 401', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: 'test' }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

    userManager.signinSilent.mockResolvedValue();
    userManager.getUser.mockResolvedValue({
      access_token: 'new-token',
      expired: false,
    });

    const result = await apiClient.get('/test');

    expect(userManager.signinSilent).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
```

---

## Working Code Examples

All examples above have corresponding working code files in the `src/` directory:

### 1. Basic Fetch ([src/http-client/basic-fetch.js](src/http-client/basic-fetch.js))

Simple authenticated fetch example with:
- Token retrieval from UserManager
- Bearer token authentication
- Basic error handling
- GET, POST, PUT, DELETE examples

### 2. HTTP Client Class ([src/http-client/http-client.js](src/http-client/http-client.js))

Complete HTTP client implementation with:
- Automatic token management
- Token refresh before expiration
- Base URL configuration
- Request/response interceptors
- Type-safe error handling
- Convenience methods (get, post, put, patch, delete)

### 3. Axios Interceptors ([src/axios-interceptors/axios-client.js](src/axios-interceptors/axios-client.js))

Axios client with:
- Request interceptor for auto token injection
- Response interceptor for 401 handling
- Automatic token refresh on expiration
- Retry logic
- Full TypeScript support

### 4. Error Handling ([src/error-handling/api-error-handler.js](src/error-handling/api-error-handler.js))

Comprehensive error handling with:
- Custom error classes (ApiError, NetworkError, AuthenticationError)
- Retry logic with exponential backoff
- Network failure detection
- Status-specific error handling
- Configurable retry attempts

### 5. React Hooks ([src/react-hooks/useApi.js](src/react-hooks/useApi.js))

Production-ready React hooks:
- `useApi()` - Auto-fetch with loading/error states
- `useLazyApi()` - Manual trigger for API calls
- `useMutation()` - POST/PUT/DELETE operations
- `useApiAdvanced()` - Caching, refetching, polling
- Complete component examples

### 6. Backend Validation ([src/backend-validation/node-express.js](src/backend-validation/node-express.js))

Express.js middleware for:
- JWT token validation with JWKS
- Scope-based authorization
- Role-based access control
- CORS configuration
- Error handling
- Complete API server example

---

## Best Practices

1. **Always validate tokens on backend** - Never trust client-side tokens
2. **Use HTTPS** - Protect tokens in transit
3. **Handle token expiration** - Implement automatic refresh logic
4. **Implement retry logic** - For transient failures
5. **Rate limiting** - Respect API rate limits
6. **Error handling** - Provide meaningful error messages
7. **Loading states** - Show loading indicators during API calls
8. **Caching** - Cache responses when appropriate
9. **Request cancellation** - Cancel requests when components unmount

---

## Common Patterns

### Pattern 1: Optimistic Updates
```javascript
async function updateUser(id, data) {
  // Optimistically update UI
  setUser(data);

  try {
    await apiClient.put(`/users/${id}`, data);
  } catch (error) {
    // Revert on error
    setUser(previousUser);
    throw error;
  }
}
```

### Pattern 2: Polling
```javascript
useEffect(() => {
  const interval = setInterval(() => {
    apiClient.get('/status').then(setStatus);
  }, 5000);

  return () => clearInterval(interval);
}, []);
```

### Pattern 3: Batch Requests
```javascript
async function batchRequest(requests) {
  return Promise.all(
    requests.map(({ endpoint, method, data }) =>
      apiClient[method](endpoint, data)
    )
  );
}
```

---

## Running the Backend Example

The backend validation example includes a complete Express server:

```bash
cd src/backend-validation
npm install
npm start
```

The server will start on `http://localhost:4000` with the following protected endpoints:

- `GET /api/public` - Public endpoint (no auth)
- `GET /api/protected` - Basic authentication required
- `GET /api/admin/users` - Requires `read:users` and `admin` scopes
- `POST /api/admin/settings` - Requires `admin` or `superuser` role
- `GET /api/me` - Returns current user info

Test with curl:

```bash
# Public endpoint
curl http://localhost:4000/api/public

# Protected endpoint (requires token)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:4000/api/protected
```

---

## Learn More

- See [/examples/react-demo](../react-demo) for a complete React application
- See [/examples/vue-demo](../vue-demo) for a complete Vue application
- See [/examples/provider-configs](../provider-configs) for IdP setup guides
- See [/examples/advanced-features](../advanced-features) for advanced patterns
- See [/examples/security](../security) for security best practices
