import express from 'express'
import { createRemoteJWKSet, jwtVerify } from 'jose'

// ─── Config ───────────────────────────────────────────────────────────────────

const AUTHORITY        = process.env.AUTHORITY        ?? 'https://your-idp.com'
const AUDIENCE         = process.env.AUDIENCE         // optional — set for Auth0/Okta/Keycloak; leave unset for Hydra
const INTROSPECTION_URL = process.env.INTROSPECTION_URL // optional — set for Hydra opaque tokens
const PORT             = process.env.PORT             ?? 4000

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
    if (INTROSPECTION_URL) {
      // Token introspection — works with opaque and JWT tokens (e.g. Ory Hydra)
      const resp = await fetch(INTROSPECTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token }),
      })
      const data = await resp.json()
      if (!data.active) return res.status(401).json({ error: 'Invalid or expired token' })
      req.claims = data
    } else {
      // JWT validation — works with providers that issue JWTs directly (Auth0, Okta, Keycloak)
      const options = { issuer: AUTHORITY }
      if (AUDIENCE) options.audience = AUDIENCE
      const { payload } = await jwtVerify(token, JWKS, options)
      req.claims = payload
    }
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
app.get('/api/public', (_, res) => {
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

// ─── Production hardening ─────────────────────────────────────────────────────
//
// In production, point post_logout_redirect_uri at a server route rather than
// directly at the SPA so you can send Clear-Site-Data, which guarantees the
// browser wipes storage and cookies even if the client-side signout is
// interrupted (e.g. tab closed mid-flow).
//
// UserManager config:
//   post_logout_redirect_uri: `${window.location.origin}/api/logout/complete`
//
// app.get('/api/logout/complete', (_, res) => {
//   res.set('Clear-Site-Data', '"storage", "cookies"')
//   res.redirect('http://localhost:3001/')   // or your SPA origin
// })

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`Authority:   ${AUTHORITY}`)
  console.log(`Validation:  ${INTROSPECTION_URL ? `introspection (${INTROSPECTION_URL})` : 'JWT (JWKS)'}`)
})
