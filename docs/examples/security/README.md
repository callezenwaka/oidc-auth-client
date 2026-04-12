# Security Best Practices

Essential security guidelines for implementing OIDC authentication in production applications.

## Table of Contents

1. [Protocol Security](#protocol-security)
2. [Token Storage](#token-storage)
3. [HTTPS & Transport Security](#https--transport-security)
4. [Content Security Policy](#content-security-policy)
5. [Cross-Site Scripting (XSS) Prevention](#cross-site-scripting-xss-prevention)
6. [Cross-Site Request Forgery (CSRF) Prevention](#cross-site-request-forgery-csrf-prevention)
7. [Backend Token Validation](#backend-token-validation)
8. [Security Headers](#security-headers)
9. [Common Vulnerabilities](#common-vulnerabilities)
10. [Security Checklist](#security-checklist)

---

## 1. Protocol Security

### Use Authorization Code Flow with PKCE

✅ **DO**: Use Authorization Code flow with PKCE (Proof Key for Code Exchange)

```javascript
const config = {
  response_type: 'code',  // Authorization Code flow
  // PKCE is automatic in modern OIDC libraries
};
```

❌ **DON'T**: Use Implicit flow (deprecated and insecure)

```javascript
// INSECURE - Don't use!
const config = {
  response_type: 'id_token token',  // Implicit flow
};
```

### Request Minimal Scopes

```javascript
const config = {
  // Only request what you need
  scope: 'openid profile email',  // ✅ Good

  // Don't request unnecessary scopes
  // scope: 'openid profile email address phone ...',  // ❌ Bad
};
```

### Validate Redirect URIs

```javascript
// ✅ Exact match required
redirect_uri: 'https://example.com/callback',

// ❌ Wildcard redirects are dangerous
// redirect_uri: 'https://example.com/*',
```

---

## 2. Token Storage

### Browser Storage Comparison

| Storage | Security | Persistence | Scope | XSS Vulnerable |
|---------|----------|-------------|-------|----------------|
| sessionStorage | Medium | Session only | Same tab | Yes |
| localStorage | Medium | Permanent | All tabs | Yes |
| Memory | High | Page session | Same page | No |
| httpOnly Cookie | Highest | Configurable | Same domain | No |

### Recommended: sessionStorage (Default)

```javascript
const config = {
  // Default - stores in sessionStorage
  // Tokens cleared when tab closes
};
```

### Alternative: In-Memory Storage

```javascript
// Custom in-memory storage (most secure, but lost on refresh)
class InMemoryStorage {
  constructor() {
    this.storage = {};
  }

  getItem(key) {
    return this.storage[key] || null;
  }

  setItem(key, value) {
    this.storage[key] = value;
  }

  removeItem(key) {
    delete this.storage[key];
  }

  key(index) {
    const keys = Object.keys(this.storage);
    return keys[index] || null;
  }

  get length() {
    return Object.keys(this.storage).length;
  }
}

const config = {
  userStore: new InMemoryStorage(),
};
```

### DON'T Store Tokens in localStorage Long-Term

```javascript
// ❌ Bad - vulnerable to XSS
localStorage.setItem('access_token', token);

// ✅ Good - use library's storage mechanism
userManager.getUser();  // Uses configured storage
```

---

## 3. HTTPS & Transport Security

### Always Use HTTPS in Production

```javascript
// ✅ Production
const config = {
  authority: 'https://auth.example.com',
  redirect_uri: 'https://app.example.com/callback',
};

// ❌ Never use HTTP in production
// authority: 'http://auth.example.com',
```

### Enforce HTTPS Redirects

```javascript
// Redirect HTTP to HTTPS
if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
  location.replace(`https:${location.href.substring(location.protocol.length)}`);
}
```

### HSTS (HTTP Strict Transport Security)

```javascript
// Backend: Set HSTS header
app.use((req, res, next) => {
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );
  next();
});
```

---

## 4. Content Security Policy

### Implement CSP Headers

```javascript
// Backend: Set CSP header
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",  // Minimize unsafe-inline
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self' https://your-idp.com https://api.example.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self' https://your-idp.com",
    ].join('; ')
  );
  next();
});
```

### CSP for OIDC

```javascript
// Allow IdP domains
const csp = {
  'connect-src': [
    "'self'",
    'https://your-idp.com',  // IdP domain
    'https://api.example.com',  // Your API
  ],
  'frame-src': [
    'https://your-idp.com',  // For silent refresh iframe
  ],
};
```

---

## 5. Cross-Site Scripting (XSS) Prevention

### Sanitize User Input

```javascript
// ✅ Use a library for sanitization
import DOMPurify from 'dompurify';

function displayUserProfile(user) {
  const cleanName = DOMPurify.sanitize(user.profile.name);
  document.getElementById('name').textContent = cleanName;
}

// ❌ Don't inject unsanitized data
// document.getElementById('name').innerHTML = user.profile.name;
```

### Escape Output

```javascript
// React automatically escapes
function UserProfile({ user }) {
  return <div>{user.profile.name}</div>;  // ✅ Safe
}

// Vanilla JS - use textContent
element.textContent = user.profile.name;  // ✅ Safe
// element.innerHTML = user.profile.name;  // ❌ Unsafe
```

### Avoid Inline Scripts

```html
<!-- ❌ Bad -->
<script>
  var token = '<?= $access_token ?>';
</script>

<!-- ✅ Good - Use external scripts -->
<script src="/js/app.js"></script>
```

---

## 6. Cross-Site Request Forgery (CSRF) Prevention

### State Parameter Validation

The OIDC library automatically handles state parameter validation:

```javascript
// Automatic CSRF protection via state parameter
await userManager.signinRedirect();
// State is automatically generated and validated
```

### Additional CSRF Token for Forms

```javascript
// For forms that modify data
function generateCSRFToken() {
  const token = crypto.randomUUID();
  sessionStorage.setItem('csrf-token', token);
  return token;
}

function validateCSRFToken(token) {
  const stored = sessionStorage.getItem('csrf-token');
  return token === stored;
}

// Usage
<form onsubmit="return validateForm(this)">
  <input type="hidden" name="csrf_token" value={generateCSRFToken()} />
  <!-- form fields -->
</form>
```

---

## 7. Backend Token Validation

### ALWAYS Validate Tokens on Backend

```javascript
// Node.js/Express example
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const client = jwksClient({
  jwksUri: 'https://your-idp.com/.well-known/jwks.json',
  cache: true,
  rateLimit: true,
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
}

function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(
    token,
    getKey,
    {
      audience: process.env.CLIENT_ID,
      issuer: process.env.ISSUER,
      algorithms: ['RS256'],
    },
    (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid token' });
      }

      // Additional validation
      if (!validateClaims(decoded)) {
        return res.status(403).json({ error: 'Invalid claims' });
      }

      req.user = decoded;
      next();
    }
  );
}

function validateClaims(claims) {
  // Validate expiration
  if (claims.exp < Date.now() / 1000) {
    return false;
  }

  // Validate required claims
  if (!claims.sub || !claims.email) {
    return false;
  }

  // Additional custom validation
  return true;
}

// Apply to routes
app.get('/api/protected', verifyToken, (req, res) => {
  res.json({ user: req.user });
});
```

### Token Validation Checklist

- [ ] Signature validation (using JWKS)
- [ ] Issuer validation
- [ ] Audience validation
- [ ] Expiration validation
- [ ] Not-before validation
- [ ] Custom claims validation

---

## 8. Security Headers

### Essential Security Headers

```javascript
// Express.js middleware
app.use((req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );

  next();
});

// Or use helmet.js
const helmet = require('helmet');
app.use(helmet());
```

---

## 9. Common Vulnerabilities

### 1. Token Leakage via URL

❌ **DON'T**: Pass tokens in URL

```javascript
// INSECURE
window.location.href = `/api/data?token=${accessToken}`;
```

✅ **DO**: Use Authorization header

```javascript
fetch('/api/data', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
});
```

### 2. Token Leakage via Referer Header

```javascript
// Set referrer policy
<meta name="referrer" content="no-referrer">

// Or in fetch
fetch(url, {
  referrerPolicy: 'no-referrer',
});
```

### 3. Open Redirect Vulnerability

```javascript
// ✅ Validate return URLs
function isValidReturnUrl(url) {
  const allowedOrigins = [
    'https://example.com',
    'https://app.example.com',
  ];

  try {
    const parsed = new URL(url, window.location.origin);
    return allowedOrigins.includes(parsed.origin);
  } catch {
    return false;
  }
}

// Before redirect
const returnUrl = params.get('returnUrl');
if (returnUrl && isValidReturnUrl(returnUrl)) {
  window.location.href = returnUrl;
} else {
  window.location.href = '/';  // Safe default
}
```

### 4. Session Fixation

```javascript
// Generate new session after login
userManager.events.addUserLoaded(() => {
  // Clear any existing session data
  sessionStorage.removeItem('temp-data');

  // Generate new session identifier
  sessionStorage.setItem('session-id', crypto.randomUUID());
});
```

---

## 10. Security Checklist

### Development

- [ ] Use Authorization Code flow with PKCE
- [ ] Request minimal scopes
- [ ] Use HTTPS (even in dev with self-signed certs)
- [ ] Implement CSP headers
- [ ] Sanitize all user input
- [ ] Use secure token storage
- [ ] Validate redirect URIs
- [ ] Implement proper error handling (don't leak info)

### Production

- [ ] HTTPS everywhere (HSTS enabled)
- [ ] Validate tokens on backend
- [ ] Implement security headers
- [ ] Regular security audits
- [ ] Monitor for suspicious activity
- [ ] Implement rate limiting
- [ ] Use short token lifetimes
- [ ] Enable automatic token refresh
- [ ] Implement proper logout
- [ ] Regular dependency updates

### Testing

- [ ] Test XSS prevention
- [ ] Test CSRF protection
- [ ] Test token expiration handling
- [ ] Test session timeout
- [ ] Test unauthorized access
- [ ] Penetration testing
- [ ] Security scanning (Snyk, OWASP ZAP)

---

## Security Monitoring

### Log Security Events

```javascript
// Log authentication events
userManager.events.addUserLoaded((user) => {
  logSecurityEvent('user_login', {
    userId: user.profile.sub,
    timestamp: Date.now(),
    userAgent: navigator.userAgent,
  });
});

userManager.events.addAccessTokenExpired(() => {
  logSecurityEvent('token_expired', {
    timestamp: Date.now(),
  });
});

function logSecurityEvent(eventType, data) {
  // Send to your logging service
  fetch('/api/security-logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventType,
      ...data,
      ip: await getClientIP(),
    }),
  });
}
```

### Monitor for Anomalies

- Failed login attempts
- Multiple rapid token refreshes
- Unusual access patterns
- Geographic anomalies
- Token reuse attempts

---

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [OIDC Security Considerations](https://openid.net/specs/openid-connect-core-1_0.html#Security)
- [JWT Best Practices](https://curity.io/resources/learn/jwt-best-practices/)
