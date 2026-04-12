#!/bin/bash

# Setup OAuth client in Ory Hydra
# This script creates a pre-configured client for all web/ examples

echo "Setting up OAuth 2.0 client in Ory Hydra..."

# Wait for Hydra to be ready
echo "Waiting for Hydra to be ready..."
sleep 5

# Create the client
docker exec hydra \
  hydra create client \
  --endpoint http://localhost:4445 \
  --id demo-client \
  --name "OIDC Demo Application" \
  --grant-type authorization_code,refresh_token \
  --response-type code \
  --scope openid,profile,email,offline_access \
  --redirect-uri http://localhost:3001/callback \
  --redirect-uri http://localhost:3001/silent-renew.html \
  --redirect-uri http://localhost:5173/callback \
  --redirect-uri http://localhost:5173/silent-renew.html \
  --redirect-uri http://localhost:8080/callback.html \
  --redirect-uri http://localhost:8080/silent-renew.html \
  --token-endpoint-auth-method none \
  --skip-consent=false

if [ $? -eq 0 ]; then
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
  echo "Failed to create client."
  echo "The client might already exist. To recreate it, run:"
  echo "  docker exec hydra hydra delete client demo-client --endpoint http://localhost:4445"
  echo "Then run this script again."
fi
