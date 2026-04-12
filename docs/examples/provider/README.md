# Identity Provider Configurations

Complete configuration guides for popular identity providers with the OIDC client library.

## Table of Contents

1. [Ory Hydra](#ory-hydra) ⭐ **Recommended for Local Testing**
2. [Auth0](#auth0)
3. [Keycloak](#keycloak)
4. [Okta](#okta)
5. [Azure AD (Microsoft)](#azure-ad-microsoft)
6. [Google Identity](#google-identity)
7. [AWS Cognito](#aws-cognito)
8. [Custom OIDC Provider](#custom-oidc-provider)

---

## Ory Hydra

**Best for:** Local development, testing, and learning OIDC/OAuth 2.0 flows.

Ory Hydra is a certified OpenID Connect and OAuth 2.0 server that's perfect for local testing. It's lightweight, standards-compliant, and easy to run with Docker.

### Quick Start with Docker Compose

1. **Create the setup** (already included in this directory):

```bash
cd examples/provider-configs/ory-hydra
docker-compose up -d
```

This will start:
- Ory Hydra (OAuth 2.0/OIDC server) on `http://localhost:4444`
- PostgreSQL (database for Hydra)
- A simple consent/login UI on `http://localhost:3000`

2. **The client is pre-configured** with these credentials:
   - Client ID: `demo-client`
   - Redirect URI: `http://localhost:5173/callback`
   - Silent Redirect: `http://localhost:5173/silent-renew.html`

### Configuration

```javascript
import { UserManager } from 'oidc-auth-client';

const config = {
  // Ory Hydra public endpoint
  authority: 'http://localhost:4444',
  client_id: 'demo-client',

  // Redirect URIs
  redirect_uri: 'http://localhost:5173/callback',
  post_logout_redirect_uri: 'http://localhost:5173',
  silent_redirect_uri: 'http://localhost:5173/silent-renew.html',

  // OAuth/OIDC settings
  response_type: 'code',
  scope: 'openid profile email offline_access',

  // Token management
  automaticSilentRenew: true,
  loadUserInfo: true,
  filterProtocolClaims: true,

  // Ory Hydra specific
  extraQueryParams: {
    // Optional: force consent screen
    // prompt: 'consent',
  },
};

const userManager = new UserManager(config);
```

### Manual Setup (without Docker Compose)

If you prefer to run Hydra manually:

```bash
# 1. Start PostgreSQL
docker run -d \
  --name hydra-postgres \
  -e POSTGRES_USER=hydra \
  -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_DB=hydra \
  -p 5432:5432 \
  postgres:14-alpine

# 2. Run migrations
docker run --rm -it \
  --network host \
  oryd/hydra:v2.2 \
  migrate sql -e --yes \
  postgres://hydra:secret@localhost:5432/hydra?sslmode=disable

# 3. Start Hydra
docker run -d \
  --name hydra \
  --network host \
  -e DSN=postgres://hydra:secret@localhost:5432/hydra?sslmode=disable \
  -e URLS_SELF_ISSUER=http://localhost:4444 \
  -e URLS_CONSENT=http://localhost:3000/consent \
  -e URLS_LOGIN=http://localhost:3000/login \
  oryd/hydra:v2.2 serve all --dev

# 4. Create OAuth client
docker exec hydra \
  hydra create client \
  --endpoint http://localhost:4445 \
  --id demo-client \
  --name "Demo Application" \
  --grant-type authorization_code,refresh_token \
  --response-type code \
  --scope openid,profile,email,offline_access \
  --redirect-uri http://localhost:5173/callback \
  --redirect-uri http://localhost:5173/silent-renew.html \
  --token-endpoint-auth-method none
```

### Environment Variables

```bash
# .env
VITE_HYDRA_AUTHORITY=http://localhost:4444
VITE_HYDRA_CLIENT_ID=demo-client
```

```javascript
// config.js
const config = {
  authority: import.meta.env.VITE_HYDRA_AUTHORITY || 'http://localhost:4444',
  client_id: import.meta.env.VITE_HYDRA_CLIENT_ID || 'demo-client',
  // ... other settings
};
```

### Testing the Setup

1. Start your application (e.g., React demo):
```bash
cd examples/react-demo
npm run dev
```

2. Click "Sign In" - you'll be redirected to the Hydra login UI
3. Use any credentials (Hydra dev mode accepts anything)
4. Grant consent on the consent screen
5. You'll be redirected back with an authorization code
6. The app will exchange it for tokens automatically

### Checking Hydra Status

```bash
# View Hydra logs
docker logs -f hydra

# Check if Hydra is running
curl http://localhost:4444/.well-known/openid-configuration

# List OAuth clients
docker exec hydra hydra list clients --endpoint http://localhost:4445

# Introspect a token (requires token)
docker exec hydra hydra introspect token --endpoint http://localhost:4445 YOUR_TOKEN
```

### Managing Clients

```bash
# Create a new client
docker exec hydra hydra create client \
  --endpoint http://localhost:4445 \
  --id my-new-client \
  --secret my-secret \
  --grant-type authorization_code,refresh_token \
  --response-type code \
  --scope openid,profile,email \
  --redirect-uri http://localhost:3000/callback

# Delete a client
docker exec hydra hydra delete client demo-client --endpoint http://localhost:4445

# Update client
docker exec hydra hydra update client demo-client \
  --endpoint http://localhost:4445 \
  --scope openid,profile,email,custom_scope
```

### Production Considerations

For production use of Ory Hydra:

1. **Use proper database**: PostgreSQL, MySQL, or CockroachDB
2. **Enable TLS/HTTPS**: Configure proper certificates
3. **Secure admin endpoint**: Port 4445 should not be publicly accessible
4. **Custom login/consent UI**: Build your own UI instead of using the example
5. **Use secrets manager**: Store credentials securely (Vault, AWS Secrets Manager)
6. **Configure proper CORS**: Restrict allowed origins
7. **Enable monitoring**: Use Prometheus metrics endpoint

```javascript
// Production config example
const config = {
  authority: 'https://auth.yourdomain.com',
  client_id: 'production-client-id',
  redirect_uri: 'https://app.yourdomain.com/callback',
  // ... other production settings
};
```

### Troubleshooting

**Connection refused errors:**
- Ensure Hydra container is running: `docker ps | grep hydra`
- Check Hydra logs: `docker logs hydra`
- Verify PostgreSQL is running: `docker ps | grep postgres`

**Login UI not showing:**
- Check that consent/login URLs are configured correctly
- Verify the login UI service is running
- Check Hydra environment variables: `URLS_CONSENT` and `URLS_LOGIN`

**Token validation fails:**
- Verify issuer matches: Check `http://localhost:4444/.well-known/openid-configuration`
- Ensure time synchronization (tokens have expiry)
- Check client configuration: `docker exec hydra hydra get client demo-client --endpoint http://localhost:4445`

**CORS errors:**
- Add allowed origins in your login/consent UI
- Ensure redirect URIs match exactly in client configuration

### Advantages of Ory Hydra for Testing

✅ **Fully OIDC certified** - Implements the spec correctly
✅ **Runs locally** - No external dependencies or accounts needed
✅ **Fast setup** - Docker Compose gets you running in seconds
✅ **No rate limits** - Test as much as you want
✅ **Open source** - Free to use and inspect
✅ **Production-ready** - Can scale from dev to production
✅ **Well documented** - Extensive docs at https://www.ory.sh/hydra/docs/

---

## Auth0

### Setup

1. Create an Auth0 account at https://auth0.com
2. Create a new Application (Single Page Application)
3. Configure settings:
   - **Allowed Callback URLs**: `http://localhost:3000/callback`
   - **Allowed Logout URLs**: `http://localhost:3000`
   - **Allowed Web Origins**: `http://localhost:3000`
   - **Allowed Origins (CORS)**: `http://localhost:3000`

### Configuration

```javascript
import { UserManager } from 'oidc-auth-client';

const config = {
  authority: 'https://YOUR_DOMAIN.auth0.com',
  client_id: 'YOUR_CLIENT_ID',
  redirect_uri: 'http://localhost:3000/callback',
  post_logout_redirect_uri: 'http://localhost:3000',
  silent_redirect_uri: 'http://localhost:3000/silent-renew.html',

  response_type: 'code',
  scope: 'openid profile email',

  automaticSilentRenew: true,
  loadUserInfo: true,
  filterProtocolClaims: true,

  // Auth0 specific
  extraQueryParams: {
    audience: 'YOUR_API_IDENTIFIER', // Optional: for API access
  },
};

const userManager = new UserManager(config);
```

### Environment-Specific Config

```javascript
// .env
REACT_APP_AUTH0_DOMAIN=your-tenant.auth0.com
REACT_APP_AUTH0_CLIENT_ID=your-client-id
REACT_APP_AUTH0_AUDIENCE=https://your-api.com

// config.js
const config = {
  authority: `https://${process.env.REACT_APP_AUTH0_DOMAIN}`,
  client_id: process.env.REACT_APP_AUTH0_CLIENT_ID,
  extraQueryParams: {
    audience: process.env.REACT_APP_AUTH0_AUDIENCE,
  },
};
```

### Testing

```bash
# Example Auth0 tenant
authority: 'https://dev-abc123.us.auth0.com'
client_id: 'aBc123XyZ456'
```

---

## Keycloak

### Setup (Local Development)

1. Run Keycloak with Docker:
```bash
docker run -p 8080:8080 \
  -e KEYCLOAK_ADMIN=admin \
  -e KEYCLOAK_ADMIN_PASSWORD=admin \
  quay.io/keycloak/keycloak:latest start-dev
```

2. Access admin console: `http://localhost:8080`
3. Create a new Realm (e.g., "demo")
4. Create a Client:
   - **Client ID**: `my-app`
   - **Client Protocol**: `openid-connect`
   - **Access Type**: `public`
   - **Valid Redirect URIs**: `http://localhost:3000/*`
   - **Web Origins**: `http://localhost:3000`

### Configuration

```javascript
const config = {
  authority: 'http://localhost:8080/realms/demo',
  client_id: 'my-app',
  redirect_uri: 'http://localhost:3000/callback',
  post_logout_redirect_uri: 'http://localhost:3000',
  silent_redirect_uri: 'http://localhost:3000/silent-renew.html',

  response_type: 'code',
  scope: 'openid profile email',

  automaticSilentRenew: true,
  loadUserInfo: true,

  // Keycloak specific
  metadata: {
    end_session_endpoint: 'http://localhost:8080/realms/demo/protocol/openid-connect/logout',
  },
};
```

### Production Configuration

```javascript
const config = {
  authority: 'https://keycloak.example.com/realms/production',
  client_id: 'production-app',
  // ... other settings
};
```

---

## Okta

### Setup

1. Create an Okta Developer account at https://developer.okta.com
2. Create a new App Integration
3. Choose "OIDC - OpenID Connect"
4. Select "Single-Page Application"
5. Configure:
   - **Sign-in redirect URIs**: `http://localhost:3000/callback`
   - **Sign-out redirect URIs**: `http://localhost:3000`
   - **Trusted Origins**: Add `http://localhost:3000` for CORS

### Configuration

```javascript
const config = {
  authority: 'https://YOUR_DOMAIN.okta.com/oauth2/default',
  client_id: 'YOUR_CLIENT_ID',
  redirect_uri: 'http://localhost:3000/callback',
  post_logout_redirect_uri: 'http://localhost:3000',
  silent_redirect_uri: 'http://localhost:3000/silent-renew.html',

  response_type: 'code',
  scope: 'openid profile email',

  automaticSilentRenew: true,
  loadUserInfo: true,

  // Okta specific
  extraQueryParams: {
    // Optional: request offline access for refresh tokens
    // prompt: 'consent',
  },
};
```

### Custom Authorization Server

```javascript
// For custom authorization server
const config = {
  authority: 'https://YOUR_DOMAIN.okta.com/oauth2/aus8abc123',
  // ... other settings
};
```

---

## Azure AD (Microsoft)

### Setup

1. Go to Azure Portal → Azure Active Directory
2. Register a new Application
3. Configure:
   - **Redirect URI**: `http://localhost:3000/callback` (SPA)
   - **Logout URL**: `http://localhost:3000`
   - Enable "ID tokens" in Authentication
   - Add API permissions (Microsoft Graph, etc.)

### Configuration

```javascript
const config = {
  authority: 'https://login.microsoftonline.com/YOUR_TENANT_ID/v2.0',
  client_id: 'YOUR_CLIENT_ID',
  redirect_uri: 'http://localhost:3000/callback',
  post_logout_redirect_uri: 'http://localhost:3000',
  silent_redirect_uri: 'http://localhost:3000/silent-renew.html',

  response_type: 'code',
  scope: 'openid profile email',

  automaticSilentRenew: true,
  loadUserInfo: false, // Azure AD doesn't have UserInfo endpoint by default

  // Azure AD specific
  extraQueryParams: {
    // Optional: for specific Azure AD features
    domain_hint: 'organizations', // or 'consumers', 'common'
  },
};
```

### Multi-Tenant Configuration

```javascript
// For multi-tenant apps
const config = {
  authority: 'https://login.microsoftonline.com/common/v2.0',
  // or 'organizations' for work/school accounts only
  // or 'consumers' for personal Microsoft accounts only
};
```

### Azure AD B2C

```javascript
const config = {
  authority: 'https://YOUR_TENANT.b2clogin.com/YOUR_TENANT.onmicrosoft.com/B2C_1_SIGNIN',
  client_id: 'YOUR_CLIENT_ID',
  known_authorities: ['YOUR_TENANT.b2clogin.com'],
  // ... other settings
};
```

---

## Google Identity

### Setup

1. Go to Google Cloud Console
2. Create a new Project or select existing
3. Enable Google Identity Services
4. Create OAuth 2.0 Client ID (Web application)
5. Add Authorized redirect URIs: `http://localhost:3000/callback`

### Configuration

```javascript
const config = {
  authority: 'https://accounts.google.com',
  client_id: 'YOUR_CLIENT_ID.apps.googleusercontent.com',
  redirect_uri: 'http://localhost:3000/callback',
  post_logout_redirect_uri: 'http://localhost:3000',

  response_type: 'code',
  scope: 'openid profile email',

  automaticSilentRenew: true,
  loadUserInfo: true,

  // Google specific
  extraQueryParams: {
    // Optional
    access_type: 'offline', // for refresh tokens
    prompt: 'consent', // force consent screen for refresh token
  },

  // Google uses different metadata structure
  metadataSeed: {
    issuer: 'https://accounts.google.com',
    authorization_endpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    token_endpoint: 'https://oauth2.googleapis.com/token',
    userinfo_endpoint: 'https://openidconnect.googleapis.com/v1/userinfo',
    jwks_uri: 'https://www.googleapis.com/oauth2/v3/certs',
  },
};
```

---

## AWS Cognito

### Setup

1. Create a User Pool in AWS Cognito
2. Create an App Client (Public client, no secret)
3. Configure Hosted UI:
   - Add Callback URL: `http://localhost:3000/callback`
   - Add Sign out URL: `http://localhost:3000`
   - Add OAuth 2.0 Grants: Authorization code grant
   - Add OAuth Scopes: openid, profile, email

### Configuration

```javascript
const config = {
  authority: 'https://cognito-idp.REGION.amazonaws.com/USER_POOL_ID',
  // OR use Cognito domain
  // authority: 'https://YOUR_DOMAIN.auth.REGION.amazoncognito.com',

  client_id: 'YOUR_APP_CLIENT_ID',
  redirect_uri: 'http://localhost:3000/callback',
  post_logout_redirect_uri: 'http://localhost:3000',

  response_type: 'code',
  scope: 'openid profile email',

  automaticSilentRenew: true,
  loadUserInfo: true,

  // Cognito specific
  metadataSeed: {
    issuer: 'https://cognito-idp.REGION.amazonaws.com/USER_POOL_ID',
    authorization_endpoint: 'https://YOUR_DOMAIN.auth.REGION.amazoncognito.com/oauth2/authorize',
    token_endpoint: 'https://YOUR_DOMAIN.auth.REGION.amazoncognito.com/oauth2/token',
    userinfo_endpoint: 'https://YOUR_DOMAIN.auth.REGION.amazoncognito.com/oauth2/userInfo',
    end_session_endpoint: 'https://YOUR_DOMAIN.auth.REGION.amazoncognito.com/logout',
    jwks_uri: 'https://cognito-idp.REGION.amazonaws.com/USER_POOL_ID/.well-known/jwks.json',
  },
};
```

---

## Custom OIDC Provider

### Configuration for Any OIDC-Compliant Provider

```javascript
const config = {
  // Required
  authority: 'https://your-idp.com',
  client_id: 'your-client-id',
  redirect_uri: 'http://localhost:3000/callback',

  // OAuth/OIDC settings
  response_type: 'code',
  scope: 'openid profile email',

  // Optional but recommended
  post_logout_redirect_uri: 'http://localhost:3000',
  silent_redirect_uri: 'http://localhost:3000/silent-renew.html',

  // Token management
  automaticSilentRenew: true,
  accessTokenExpiringNotificationTime: 60,

  // User info
  loadUserInfo: true,
  filterProtocolClaims: true,

  // Session monitoring
  monitorSession: true,
  checkSessionInterval: 2000,

  // Manual metadata (if .well-known/openid-configuration not available)
  metadata: {
    issuer: 'https://your-idp.com',
    authorization_endpoint: 'https://your-idp.com/oauth2/authorize',
    token_endpoint: 'https://your-idp.com/oauth2/token',
    userinfo_endpoint: 'https://your-idp.com/oauth2/userinfo',
    end_session_endpoint: 'https://your-idp.com/oauth2/logout',
    jwks_uri: 'https://your-idp.com/oauth2/jwks',
    revocation_endpoint: 'https://your-idp.com/oauth2/revoke',
  },
};
```

---

## Environment Configuration Pattern

### Multi-Environment Setup

```javascript
// config/auth.js
const configs = {
  development: {
    authority: 'http://localhost:8080/realms/demo',
    client_id: 'dev-client',
    redirect_uri: 'http://localhost:3000/callback',
  },
  staging: {
    authority: 'https://staging-auth.example.com',
    client_id: 'staging-client',
    redirect_uri: 'https://staging.example.com/callback',
  },
  production: {
    authority: 'https://auth.example.com',
    client_id: 'prod-client',
    redirect_uri: 'https://example.com/callback',
  },
};

const env = process.env.NODE_ENV || 'development';

export const oidcConfig = {
  ...configs[env],

  // Common settings
  response_type: 'code',
  scope: 'openid profile email',
  automaticSilentRenew: true,
  loadUserInfo: true,
  filterProtocolClaims: true,

  // Environment-specific overrides
  ...(process.env.REACT_APP_AUTH_AUTHORITY && {
    authority: process.env.REACT_APP_AUTH_AUTHORITY,
  }),
  ...(process.env.REACT_APP_AUTH_CLIENT_ID && {
    client_id: process.env.REACT_APP_AUTH_CLIENT_ID,
  }),
};
```

---

## Troubleshooting

### Common Issues

**CORS Errors**
- Ensure your app's origin is whitelisted in IdP settings
- Check both "Allowed Origins" and "Allowed Web Origins"

**Redirect URI Mismatch**
- URIs must match exactly (including trailing slashes)
- Check both HTTP/HTTPS protocols

**Token Not Refreshing**
- Verify silent_redirect_uri is accessible
- Check if IdP supports iframe-based silent auth
- Some IdPs require `offline_access` scope for refresh tokens

**401 Unauthorized**
- Verify access token is being sent correctly
- Check token hasn't expired
- Ensure backend is validating against correct JWKS endpoint

### Testing Checklist

- [ ] Can log in successfully
- [ ] Redirect back to app after login
- [ ] User profile data loads correctly
- [ ] Access token is included in API requests
- [ ] Silent token refresh works
- [ ] Can log out successfully
- [ ] Session persists across page reloads
- [ ] Works in incognito/private mode
