# Vue 3 OIDC Demo Application

A complete, working Vue 3 application demonstrating OIDC authentication using the OIDC Client library.

## Features

✅ **Vue 3 Composition API** - Modern reactive patterns
✅ **Vite** - Fast build tool and dev server
✅ **Vue Router** - Client-side routing with auth guards
✅ **Auto Token Refresh** - Silent token renewal
✅ **Session Monitoring** - Track auth across tabs
✅ **User Profile** - Display user information and claims
✅ **API Testing** - Test authenticated API calls
✅ **Responsive Design** - Works on desktop and mobile

## Quick Start

### 1. Install Dependencies

```bash
cd vue-demo
npm install
```

### 2. Configure Your Identity Provider

Edit `src/auth/config.js` and update:

```javascript
export const oidcConfig = {
  authority: 'http://localhost:8080/realms/demo',  // Your IdP
  client_id: 'vue-demo',  // Your client ID
  redirect_uri: `${window.location.origin}/callback`,
  // ... other settings
}
```

### 3. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:5173`

## Local Testing with Keycloak

### Start Keycloak

```bash
docker run -p 8080:8080 \
  -e KEYCLOAK_ADMIN=admin \
  -e KEYCLOAK_ADMIN_PASSWORD=admin \
  quay.io/keycloak/keycloak:latest start-dev
```

### Configure Keycloak

1. Access `http://localhost:8080`
2. Login with admin/admin
3. Create a new realm "demo"
4. Create a client "vue-demo":
   - Client Protocol: `openid-connect`
   - Access Type: `public`
   - Valid Redirect URIs: `http://localhost:5173/*`
   - Web Origins: `http://localhost:5173`
5. Create a test user

## Project Structure

```
vue-demo/
├── public/
│   └── silent-renew.html    # Silent token renewal
├── src/
│   ├── assets/
│   │   └── main.css         # Global styles
│   ├── auth/
│   │   ├── config.js        # OIDC configuration
│   │   └── useAuth.js       # Auth composable
│   ├── components/
│   │   ├── LoginButton.vue  # Login/logout button
│   │   └── UserProfile.vue  # User profile display
│   ├── router/
│   │   └── index.js         # Vue Router config
│   ├── views/
│   │   ├── Home.vue         # Home page
│   │   ├── Profile.vue      # Profile page
│   │   ├── ApiTest.vue      # API testing page
│   │   └── Callback.vue     # OAuth callback
│   ├── App.vue              # Main app component
│   └── main.js              # App entry point
├── index.html               # HTML template
├── package.json             # Dependencies
├── vite.config.js           # Vite configuration
└── README.md                # This file
```

## Usage

### Authentication

The `useAuth()` composable provides all authentication methods:

```vue
<script setup>
import { useAuth } from '@/auth/useAuth'

const { user, loading, login, logout, isAuthenticated } = useAuth()
</script>

<template>
  <div v-if="isAuthenticated()">
    <p>Welcome, {{ user.profile.name }}</p>
    <button @click="logout">Logout</button>
  </div>
  <div v-else>
    <button @click="login">Login</button>
  </div>
</template>
```

### Protected Routes

Routes with `meta: { requiresAuth: true }` require authentication:

```javascript
{
  path: '/profile',
  component: Profile,
  meta: { requiresAuth: true },  // Protected route
}
```

### Making API Calls

```vue
<script setup>
import { useAuth } from '@/auth/useAuth'

const { getAccessToken } = useAuth()

async function callApi() {
  const token = getAccessToken()

  const response = await fetch('https://api.example.com/data', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  })

  return response.json()
}
</script>
```

## Configuration

### Development vs Production

The app automatically uses different configurations based on environment:

```javascript
// src/auth/config.js
if (import.meta.env.PROD) {
  // Production settings
  oidcConfig.authority = 'https://your-production-idp.com'
  oidcConfig.client_id = 'production-client-id'
}
```

### Environment Variables

Create `.env.local` for local overrides:

```env
VITE_AUTH_AUTHORITY=http://localhost:8080/realms/demo
VITE_AUTH_CLIENT_ID=vue-demo
```

Then use in config:

```javascript
authority: import.meta.env.VITE_AUTH_AUTHORITY || 'default-value'
```

## Building for Production

```bash
npm run build
```

Output will be in the `dist/` directory.

Preview production build:

```bash
npm run preview
```

## Troubleshooting

### Module not found: 'oidc-client'

Make sure you've linked the library:

```bash
# In oidc-client root directory
npm link

# In vue-demo directory
npm link oidc-client
```

Or install directly:

```bash
npm install ../../  # Points to oidc-client root
```

### CORS Errors

- Ensure your IdP allows `http://localhost:5173` in CORS settings
- Check "Allowed Origins" and "Web Origins" in your client configuration

### Redirect Loop

- Verify redirect URIs match exactly in both IdP and app config
- Check that you're using the same protocol (http/https)

### Token Not Refreshing

- Ensure `automaticSilentRenew: true` in config
- Verify `silent-renew.html` is accessible
- Check browser console for silent renew errors

## Learn More

- [Vue 3 Documentation](https://vuejs.org/)
- [Vite Documentation](https://vitejs.dev/)
- [OIDC Client Examples](../)
- [Security Best Practices](../security/)

## License

Same as parent OIDC Client library
