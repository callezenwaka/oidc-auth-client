#!/bin/bash

# Check Ory Hydra status and configuration

echo "🔍 Checking Ory Hydra Status..."
echo ""

# Check if containers are running
echo "=== Docker Containers ==="
docker ps --filter "name=hydra" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

# Check Hydra OIDC configuration
echo "=== OpenID Configuration ==="
curl -s http://localhost:4444/.well-known/openid-configuration | python3 -m json.tool 2>/dev/null || echo "Unable to fetch configuration. Is Hydra running?"
echo ""

# List OAuth clients
echo "=== OAuth 2.0 Clients ==="
docker exec hydra hydra list clients --endpoint http://localhost:4445 2>/dev/null || echo "Unable to list clients"
echo ""

# Get specific client details
echo "=== Demo Client Details ==="
docker exec hydra hydra get client demo-client --endpoint http://localhost:4445 2>/dev/null || echo "demo-client not found. Run setup-client.sh to create it."
echo ""

echo "=== Service URLs ==="
echo "Hydra Public API:  http://localhost:4444"
echo "Hydra Admin API:   http://localhost:4445"
echo "Login/Consent UI:  http://localhost:3000"
echo ""
echo "OIDC Discovery:    http://localhost:4444/.well-known/openid-configuration"
echo "JWKS:              http://localhost:4444/.well-known/jwks.json"
