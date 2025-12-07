/**
 * Backend Token Validation with Node.js/Express
 *
 * This example shows how to validate JWT access tokens
 * on the backend using Express middleware.
 */

import express from 'express'
import jwt from 'jsonwebtoken'
import jwksClient from 'jwks-rsa'

/**
 * Create JWKS client to fetch public keys from identity provider
 */
const client = jwksClient({
  jwksUri: 'https://your-identity-provider.com/.well-known/jwks.json',
  cache: true,
  cacheMaxAge: 86400000, // 24 hours
  rateLimit: true,
  jwksRequestsPerMinute: 10
})

/**
 * Get signing key from JWKS
 */
function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err)
      return
    }
    const signingKey = key.publicKey || key.rsaPublicKey
    callback(null, signingKey)
  })
}

/**
 * Verify JWT token
 */
async function verifyToken(token, options = {}) {
  return new Promise((resolve, reject) => {
    // First, decode to get the header
    const decoded = jwt.decode(token, { complete: true })

    if (!decoded) {
      reject(new Error('Invalid token'))
      return
    }

    // Get the signing key
    getKey(decoded.header, (err, signingKey) => {
      if (err) {
        reject(err)
        return
      }

      // Verify the token
      jwt.verify(token, signingKey, {
        audience: options.audience || 'your-api-identifier',
        issuer: options.issuer || 'https://your-identity-provider.com',
        algorithms: ['RS256'],
        ...options
      }, (err, decoded) => {
        if (err) {
          reject(err)
          return
        }
        resolve(decoded)
      })
    })
  })
}

/**
 * Express middleware to validate access tokens
 */
export function authenticateToken(options = {}) {
  return async (req, res, next) => {
    // Get token from Authorization header
    const authHeader = req.headers.authorization
    const token = authHeader && authHeader.split(' ')[1] // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Access denied',
        message: 'No token provided'
      })
    }

    try {
      // Verify the token
      const decoded = await verifyToken(token, options)

      // Attach user info to request
      req.user = decoded
      req.token = token

      next()
    } catch (error) {
      console.error('Token verification failed:', error)

      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Token expired',
          message: 'Your session has expired. Please login again.'
        })
      }

      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          error: 'Invalid token',
          message: 'The provided token is invalid.'
        })
      }

      return res.status(500).json({
        error: 'Authentication error',
        message: 'Failed to authenticate token.'
      })
    }
  }
}

/**
 * Middleware to check for specific scopes
 */
export function requireScopes(...requiredScopes) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      })
    }

    const scopes = req.user.scope ? req.user.scope.split(' ') : []

    const hasRequiredScopes = requiredScopes.every(scope =>
      scopes.includes(scope)
    )

    if (!hasRequiredScopes) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `Required scopes: ${requiredScopes.join(', ')}`,
        userScopes: scopes
      })
    }

    next()
  }
}

/**
 * Middleware to check user roles
 */
export function requireRoles(...requiredRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User not authenticated'
      })
    }

    // Roles might be in different claims depending on IdP
    const roles = req.user.roles || req.user['https://your-app.com/roles'] || []

    const hasRequiredRole = requiredRoles.some(role =>
      roles.includes(role)
    )

    if (!hasRequiredRole) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `Required roles: ${requiredRoles.join(', ')}`,
        userRoles: roles
      })
    }

    next()
  }
}

/**
 * Example Express app setup
 */
const app = express()

// Parse JSON bodies
app.use(express.json())

// CORS middleware (if needed)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }

  next()
})

// Public endpoint (no authentication required)
app.get('/api/public', (req, res) => {
  res.json({ message: 'This is a public endpoint' })
})

// Protected endpoint (authentication required)
app.get('/api/protected',
  authenticateToken({
    audience: 'your-api-identifier',
    issuer: 'https://your-identity-provider.com'
  }),
  (req, res) => {
    res.json({
      message: 'This is a protected endpoint',
      user: {
        sub: req.user.sub,
        email: req.user.email,
        name: req.user.name
      }
    })
  }
)

// Endpoint requiring specific scopes
app.get('/api/admin/users',
  authenticateToken(),
  requireScopes('read:users', 'admin'),
  (req, res) => {
    res.json({
      message: 'User list',
      users: [
        { id: 1, name: 'John Doe' },
        { id: 2, name: 'Jane Smith' }
      ]
    })
  }
)

// Endpoint requiring specific roles
app.post('/api/admin/settings',
  authenticateToken(),
  requireRoles('admin', 'superuser'),
  (req, res) => {
    res.json({
      message: 'Settings updated',
      settings: req.body
    })
  }
)

// User info endpoint
app.get('/api/me',
  authenticateToken(),
  (req, res) => {
    res.json({
      user: req.user,
      token: {
        iat: new Date(req.user.iat * 1000).toISOString(),
        exp: new Date(req.user.exp * 1000).toISOString()
      }
    })
  }
)

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err)

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
})

// Start server
const PORT = process.env.PORT || 4000

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`)
  console.log('Protected endpoints:')
  console.log('  GET  /api/protected')
  console.log('  GET  /api/admin/users')
  console.log('  POST /api/admin/settings')
  console.log('  GET  /api/me')
})

export { app, authenticateToken, requireScopes, requireRoles, verifyToken }
