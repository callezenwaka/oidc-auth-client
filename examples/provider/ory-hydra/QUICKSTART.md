# Ory Hydra Quick Start Guide

Get up and running with Ory Hydra in 5 minutes!

## Prerequisites

- Docker and Docker Compose installed
- Ports 3000, 4444, 4445, 5432 available

## Steps

### 1. Start Ory Hydra

```bash
cd examples/provider-configs/ory-hydra
docker-compose up -d
```

Wait for services to start (~30 seconds).

### 2. Create OAuth Client

```bash
./scripts/setup-client.sh
```

You should see:
```
✅ Client created successfully!

Client ID: demo-client
```

### 3. Verify Setup

```bash
./scripts/check-status.sh
```

All services should show as "Up" or "healthy".

### 4. Test with Your App

#### Option A: React Demo

```bash
cd ../../../examples/react-demo
npm install
npm run dev
```

Update `src/auth/config.js`:
```javascript
export const oidcConfig = {
  authority: 'http://localhost:4444',
  client_id: 'demo-client',
  // ... rest stays the same
}
```

#### Option B: Vue Demo

```bash
cd ../../../examples/vue-demo
npm install
npm run dev
```

Update `src/auth/config.js` with the same settings.

### 5. Sign In

1. Open your app (usually http://localhost:5173)
2. Click "Sign In"
3. Use test credentials:
   - Email: `admin@example.com`
   - Password: `admin`
4. Grant consent
5. You're authenticated! 🎉

## Test Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@example.com | admin | Admin |
| user@example.com | user | User |

## Useful URLs

- **Login UI**: http://localhost:3000
- **OIDC Discovery**: http://localhost:4444/.well-known/openid-configuration
- **JWKS**: http://localhost:4444/.well-known/jwks.json

## Common Commands

```bash
# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Restart services
docker-compose restart

# Clean restart (removes all data)
docker-compose down -v
docker-compose up -d
./scripts/setup-client.sh
```

## Troubleshooting

### "Client already exists" error
```bash
docker exec hydra hydra delete client demo-client --endpoint http://localhost:4445
./scripts/setup-client.sh
```

### Services won't start
```bash
# Check what's using the ports
lsof -i :4444
lsof -i :3000

# Or change ports in docker-compose.yml
```

### Login screen doesn't appear
```bash
# Check logs
docker logs hydra-login-consent

# Restart login UI
docker-compose restart login-consent-ui
```

## Next Steps

- [Full README](README.md) - Complete documentation
- [Hydra Docs](https://www.ory.sh/hydra/docs/) - Learn more about Hydra
- [Provider Configs](../README.md) - Other identity providers

## Clean Up

When you're done testing:

```bash
# Stop services
docker-compose down

# Remove all data (optional)
docker-compose down -v
```

---

**Need help?** Check the [full documentation](README.md) or [troubleshooting section](README.md#troubleshooting).
