#!/bin/bash

# Setup OAuth client in Ory Hydra
# This script creates a pre-configured client for testing

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
  --redirect-uri http://localhost:5173/callback \
  --redirect-uri http://localhost:5173/silent-renew.html \
  --redirect-uri http://localhost:3001/callback \
  --token-endpoint-auth-method none \
  --skip-consent=false

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Client created successfully!"
  echo ""
  echo "Client ID: demo-client"
  echo "Redirect URIs:"
  echo "  - http://localhost:5173/callback (React/Vue demo)"
  echo "  - http://localhost:5173/silent-renew.html (Silent renewal)"
  echo "  - http://localhost:3001/callback (Vanilla demo)"
  echo ""
  echo "Configuration for your app:"
  echo "  authority: 'http://localhost:4444'"
  echo "  client_id: 'demo-client'"
  echo "  scope: 'openid profile email offline_access'"
  echo ""
else
  echo "❌ Failed to create client"
  echo "The client might already exist. To update it, run:"
  echo "  docker exec hydra hydra delete client demo-client --endpoint http://localhost:4445"
  echo "Then run this script again."
fi
