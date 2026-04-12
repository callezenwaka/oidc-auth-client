#!/bin/bash

# Setup OAuth client in Ory Hydra
# This script creates a pre-configured client for all web/ examples
# Uses the Admin REST API directly (Hydra v2 CLI dropped the --id flag)

echo "Setting up OAuth 2.0 client in Ory Hydra..."

# Wait for Hydra to be ready
echo "Waiting for Hydra to be ready..."
sleep 5

RESPONSE=$(curl -s -o /tmp/hydra-client.json -w "%{http_code}" \
  -X POST http://localhost:4445/admin/clients \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "demo-client",
    "client_name": "OIDC Demo Application",
    "grant_types": ["authorization_code", "refresh_token"],
    "response_types": ["code"],
    "scope": "openid profile email offline_access",
    "redirect_uris": [
      "http://localhost:3001/callback",
      "http://localhost:3001/silent-renew.html",
      "http://localhost:5173/callback",
      "http://localhost:5173/silent-renew.html",
      "http://localhost:8080/callback.html",
      "http://localhost:8080/silent-renew.html"
    ],
    "token_endpoint_auth_method": "none",
    "post_logout_redirect_uris": [
      "http://localhost:3001/",
      "http://localhost:5173/",
      "http://localhost:8080/"
    ],
    "skip_consent": false
  }')

if [ "$RESPONSE" = "201" ]; then
  echo ""
  echo "Client created successfully!"
  echo ""
  echo "Client ID:  demo-client"
  echo "Authority:  http://localhost:4444"
  echo ""
  echo "Redirect URIs registered:"
  echo "  React (port 3001): http://localhost:3001/callback"
  echo "  Vue   (port 5173): http://localhost:5173/callback"
  echo "  SPA   (port 8080): http://localhost:8080/callback.html"
  echo ""
  echo "Update authority and client_id in web/*/src/auth.ts (React/Vue)"
  echo "or web/spa/app.js before starting a web example."
  echo ""
else
  echo "Failed to create client (HTTP $RESPONSE)."
  echo "The client might already exist. To recreate it, run:"
  echo "  curl -s -X DELETE http://localhost:4445/admin/clients/demo-client"
  echo "Then run this script again."
  cat /tmp/hydra-client.json
  echo ""
fi
