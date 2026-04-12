import express from 'express'
import { createRemoteJWKSet, jwtVerify } from 'jose'

// ─── Config ───────────────────────────────────────────────────────────────────

const AUTHORITY = process.env.AUTHORITY ?? 'https://your-idp.com'
const AUDIENCE  = process.env.AUDIENCE  ?? 'your-client-id'
const PORT      = process.env.PORT      ?? 4000

const JWKS = createRemoteJWKSet(new URL(`${AUTHORITY}/.well-known/jwks.json`))

// ─── App ──────────────────────────────────────────────────────────────────────

const app = express()
app.use(express.json())

// CORS — allow web/ examples running on any localhost port
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  if (req.method === 'OPTIONS') return res.sendStatus(200)
  next()
})

// ─── Middleware ───────────────────────────────────────────────────────────────

async function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'No token provided' })

  try {
    const { payload } = await jwtVerify(token, JWKS, { issuer: AUTHORITY, audience: AUDIENCE })
    req.claims = payload
    next()
  } catch (err) {
    res.status(401).json({ error: 'Invalid token', detail: err.message })
  }
}

function requireScope(...scopes) {
  return (req, res, next) => {
    const tokenScopes = (req.claims.scope ?? '').split(' ')
    if (scopes.every(s => tokenScopes.includes(s))) return next()
    res.status(403).json({ error: 'Insufficient scope', required: scopes })
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    const tokenRoles = req.claims.roles ?? []
    if (roles.some(r => tokenRoles.includes(r))) return next()
    res.status(403).json({ error: 'Insufficient role', required: roles })
  }
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

// Public — no auth
app.get('/api/public', (req, res) => {
  res.json({ message: 'Public endpoint — no authentication required' })
})

// Me — auth required, returns token claims
app.get('/api/me', authenticate, (req, res) => {
  const { sub, name, email, scope } = req.claims
  res.json({ sub, name, email, scope })
})

// Protected — auth + scope
app.get('/api/protected', authenticate, requireScope('read:data'), (req, res) => {
  res.json({ message: 'Protected data', user: req.claims.sub })
})

// Data — auth + write scope
app.post('/api/data', authenticate, requireScope('write:data'), (req, res) => {
  res.json({ message: 'Data written', body: req.body })
})

// Admin — auth + role
app.get('/api/admin', authenticate, requireRole('admin'), (req, res) => {
  res.json({ message: 'Admin data', user: req.claims.sub })
})

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`Authority: ${AUTHORITY}`)
})
