# Ory Hydra Setup for OIDC Client Testing

This directory contains a complete Ory Hydra setup for testing the OIDC client library locally.

## What's Included

- **Ory Hydra** - Certified OAuth 2.0 and OpenID Connect server
- **PostgreSQL** - Database for Hydra
- **Login/Consent UI** - Simple web interface for authentication flows
- **Pre-configured client** - Ready-to-use OAuth client

## Quick Start

### 1. Start Services

```bash
cd examples/provider-configs/ory-hydra
docker-compose up -d
```

This starts:
- Hydra on ports 4444 (public) and 4445 (admin)
- PostgreSQL on port 5432
- Login/Consent UI on port 3000

### 2. Create OAuth Client

```bash
chmod +x scripts/setup-client.sh
./scripts/setup-client.sh
```

This creates a client with ID `demo-client` configured for:
- Redirect URIs: `http://localhost:5173/callback`, `http://localhost:5173/silent-renew.html`
- Scopes: `openid profile email offline_access`
- Response type: `code` (Authorization Code Flow + PKCE)

### 3. Test with React/Vue Demo

Update the auth config in your demo app:

```javascript
// examples/react-demo/src/auth/config.js
export const oidcConfig = {
  authority: 'http://localhost:4444',
  client_id: 'demo-client',
  redirect_uri: 'http://localhost:5173/callback',
  silent_redirect_uri: 'http://localhost:5173/silent-renew.html',
  post_logout_redirect_uri: 'http://localhost:5173',
  response_type: 'code',
  scope: 'openid profile email offline_access',
  automaticSilentRenew: true,
  loadUserInfo: true,
}
```

Start the demo:

```bash
cd examples/react-demo
npm run dev
```

Click "Sign In" and use these test credentials:
- Email: `admin@example.com`, Password: `admin`
- Email: `user@example.com`, Password: `user`

## Useful Commands

### Check Status

```bash
./scripts/check-status.sh
```

### View Logs

```bash
# All services
docker-compose logs -f

# Hydra only
docker logs -f hydra

# Login UI only
docker logs -f hydra-login-consent
```

### Manage OAuth Clients

```bash
# List all clients
docker exec hydra hydra list clients --endpoint http://localhost:4445

# Get client details
docker exec hydra hydra get client demo-client --endpoint http://localhost:4445

# Delete client
docker exec hydra hydra delete client demo-client --endpoint http://localhost:4445

# Create new client
docker exec hydra hydra create client \
  --endpoint http://localhost:4445 \
  --id my-app \
  --name "My Application" \
  --grant-type authorization_code,refresh_token \
  --response-type code \
  --scope openid,profile,email \
  --redirect-uri http://localhost:3000/callback \
  --token-endpoint-auth-method none
```

### Token Introspection

```bash
# Introspect a token
docker exec hydra hydra introspect token \
  --endpoint http://localhost:4445 \
  YOUR_ACCESS_TOKEN
```

### OIDC Discovery

```bash
# Get OpenID configuration
curl http://localhost:4444/.well-known/openid-configuration | jq

# Get JWKS
curl http://localhost:4444/.well-known/jwks.json | jq
```

## Services

### Hydra Public API (Port 4444)

Used by your application for OAuth/OIDC flows:
- Authorization endpoint: `/oauth2/auth`
- Token endpoint: `/oauth2/token`
- Userinfo endpoint: `/userinfo`
- JWKS endpoint: `/.well-known/jwks.json`

### Hydra Admin API (Port 4445)

Used for management tasks (should NOT be publicly accessible in production):
- Create/update/delete clients
- Introspect tokens
- Revoke tokens
- Manage consent sessions

### Login/Consent UI (Port 3000)

Simple web UI that handles:
- User login
- Consent screen
- Logout

Visit http://localhost:3000 to see available test users.

## Project Structure

```
ory-hydra/
├── docker-compose.yml           # Docker services configuration
├── login-consent-ui/            # Login/Consent UI
│   ├── Dockerfile
│   ├── package.json
│   ├── server.js                # Express server
│   └── views/
│       ├── login.ejs            # Login page
│       ├── consent.ejs          # Consent page
│       └── index.ejs            # Home page
├── scripts/
│   ├── setup-client.sh          # Create OAuth client
│   └── check-status.sh          # Check service status
└── README.md
```

## Configuration

### Environment Variables

Edit `docker-compose.yml` to customize:

```yaml
environment:
  # Token lifetimes
  TTL_ACCESS_TOKEN: 1h
  TTL_REFRESH_TOKEN: 720h
  TTL_ID_TOKEN: 1h

  # CORS
  SERVE_PUBLIC_CORS_ALLOWED_ORIGINS: "http://localhost:5173"

  # Secrets (change in production!)
  SECRETS_SYSTEM: youReallyNeedToChangeThis
```

### Database

PostgreSQL credentials (change in production):
- User: `hydra`
- Password: `secret`
- Database: `hydra`

## Troubleshooting

### Port Already in Use

If ports 3000, 4444, 4445, or 5432 are already in use:

1. Stop conflicting services
2. Or edit `docker-compose.yml` to use different ports

### Client Already Exists

```bash
docker exec hydra hydra delete client demo-client --endpoint http://localhost:4445
./scripts/setup-client.sh
```

### Reset Everything

```bash
docker-compose down -v  # Remove all data
docker-compose up -d    # Start fresh
./scripts/setup-client.sh
```

### Login UI Not Loading

1. Check if container is running: `docker ps | grep hydra-login-consent`
2. Check logs: `docker logs hydra-login-consent`
3. Verify Hydra is configured with correct UI URLs

### Token Validation Fails

1. Check time sync: `docker exec hydra date`
2. Verify issuer: should be `http://localhost:4444`
3. Check JWKS endpoint: `curl http://localhost:4444/.well-known/jwks.json`

## Production Considerations

**This setup is for development only!** For production:

1. ✅ Use HTTPS with valid certificates
2. ✅ Secure the admin API (port 4445)
3. ✅ Use strong secrets (not `youReallyNeedToChangeThis`)
4. ✅ Build proper login UI with real user authentication
5. ✅ Use production-grade database
6. ✅ Implement proper session management
7. ✅ Add monitoring and logging
8. ✅ Configure rate limiting
9. ✅ Set up backups
10. ✅ Follow security best practices

See: https://www.ory.sh/hydra/docs/production

## Learn More

- [Ory Hydra Documentation](https://www.ory.sh/hydra/docs/)
- [OAuth 2.0 Spec](https://oauth.net/2/)
- [OpenID Connect Spec](https://openid.net/connect/)
- [OIDC Client Library](../../../README.md)

## License

MIT (Same as OIDC Client library)
