# React OIDC Demo Application

A complete React 18 application demonstrating authentication using the OIDC Client library.

> **📘 Using as Submodule**: This example is configured to work within the oidc-client repository. When using oidc-client as a Git submodule in your own project, see [../SUBMODULE_SETUP.md](../SUBMODULE_SETUP.md) for configuration details, including Vite alias setup.

## Features

- React 18 with Hooks and Context API
- React Router v6 with protected routes
- User authentication with OIDC/OAuth 2.0
- Silent token renewal
- Session monitoring
- Protected routes with automatic redirects
- User profile display
- Authenticated API calls
- Modern UI with responsive design

## Project Structure

```
react-demo/
├── public/
│   └── silent-renew.html       # Silent token renewal iframe
├── src/
│   ├── auth/
│   │   ├── config.js           # OIDC configuration
│   │   ├── AuthContext.jsx     # React Context definition
│   │   ├── AuthProvider.jsx    # Auth state management
│   │   └── ProtectedRoute.jsx  # Route guard component
│   ├── components/
│   │   ├── LoginButton.jsx     # Login/logout button
│   │   ├── LoginButton.css
│   │   ├── UserProfile.jsx     # User profile display
│   │   └── UserProfile.css
│   ├── pages/
│   │   ├── Home.jsx            # Public home page
│   │   ├── Home.css
│   │   ├── Profile.jsx         # Protected profile page
│   │   ├── ApiTest.jsx         # API testing page
│   │   ├── ApiTest.css
│   │   └── Callback.jsx        # OAuth callback handler
│   ├── App.jsx                 # Main app component
│   ├── App.css
│   ├── main.jsx                # Entry point
│   └── index.css               # Global styles
├── index.html
├── vite.config.js
└── package.json
```

## Prerequisites

- Node.js 16 or higher
- npm or yarn
- An OIDC-compliant identity provider (Auth0, Keycloak, Okta, etc.)

## Installation

1. Install dependencies:

```bash
npm install
```

2. Configure your OIDC settings in `src/auth/config.js`:

```javascript
export const oidcConfig = {
  authority: 'https://your-identity-provider.com',
  client_id: 'your-client-id',
  redirect_uri: 'http://localhost:5173/callback',
  silent_redirect_uri: 'http://localhost:5173/silent-renew.html',
  post_logout_redirect_uri: 'http://localhost:5173',
  response_type: 'code',
  scope: 'openid profile email',
  automaticSilentRenew: true,
  monitorSession: true
}
```

## Running the Application

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Build for Production

```bash
npm run build
```

Built files will be in the `dist/` directory.

## Usage

### Authentication Flow

1. Click "Sign In" to start the authentication flow
2. You'll be redirected to your identity provider
3. After successful authentication, you'll be redirected back to the app
4. The callback page processes the authorization code
5. You'll be redirected to your intended destination (or home)

### Protected Routes

The `/profile` and `/api-test` routes are protected. Unauthenticated users will be redirected to the home page with a message to sign in.

### Using the Auth Context

Access authentication state and methods in any component:

```javascript
import { useAuth } from '../auth/AuthContext'

function MyComponent() {
  const { user, isAuthenticated, login, logout, getAccessToken } = useAuth()

  if (!isAuthenticated()) {
    return <button onClick={login}>Sign In</button>
  }

  return (
    <div>
      <p>Welcome, {user.profile.name}!</p>
      <button onClick={logout}>Sign Out</button>
    </div>
  )
}
```

### Making Authenticated API Calls

```javascript
import { useAuth } from '../auth/AuthContext'

function ApiComponent() {
  const { getAccessToken } = useAuth()

  const fetchData = async () => {
    const token = getAccessToken()
    const response = await fetch('https://api.example.com/data', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    return response.json()
  }

  // Use fetchData in your component
}
```

## Identity Provider Setup

### Auth0

1. Create an application in Auth0 dashboard
2. Set Application Type to "Single Page Application"
3. Add allowed callback URLs:
   - `http://localhost:5173/callback`
   - `http://localhost:5173/silent-renew.html`
4. Add allowed logout URLs: `http://localhost:5173`
5. Add allowed web origins: `http://localhost:5173`

### Keycloak

1. Create a new client in your Keycloak realm
2. Set Access Type to "public"
3. Enable "Standard Flow"
4. Set Valid Redirect URIs:
   - `http://localhost:5173/callback`
   - `http://localhost:5173/silent-renew.html`
5. Set Web Origins: `http://localhost:5173`

See the `/examples/provider-configs/` directory for more provider-specific setup guides.

## Key Components

### AuthProvider

Manages authentication state and provides methods to child components:

- `user`: Current user object (null if not authenticated)
- `loading`: Loading state during initialization
- `error`: Error state if authentication fails
- `login()`: Start login flow
- `logout()`: Sign out user
- `isAuthenticated()`: Check if user is authenticated
- `getAccessToken()`: Get current access token
- `renewToken()`: Manually renew token
- `handleCallback()`: Process OAuth callback

### ProtectedRoute

Wraps protected components and redirects unauthenticated users:

```javascript
<Route path="/profile" element={
  <ProtectedRoute>
    <Profile />
  </ProtectedRoute>
} />
```

### Silent Token Renewal

Automatic token renewal happens in the background using an iframe. The `silent-renew.html` page handles the renewal callback.

Configuration:
```javascript
{
  automaticSilentRenew: true,
  silent_redirect_uri: 'http://localhost:5173/silent-renew.html'
}
```

## Troubleshooting

### Redirect Loop

If you experience a redirect loop:
1. Check that your redirect URIs match exactly in your IdP configuration
2. Verify the `redirect_uri` in `config.js` matches your dev server URL
3. Clear browser storage and cookies

### Token Not Refreshing

1. Ensure `automaticSilentRenew: true` in config
2. Check that `silent_redirect_uri` is correctly configured
3. Verify your IdP allows silent authentication (check cookies and session settings)

### CORS Errors

1. Add your localhost URL to allowed origins in your IdP
2. For Keycloak, set Web Origins to `*` or `http://localhost:5173`
3. For Auth0, add to Allowed Web Origins in application settings

### State Mismatch Errors

1. Ensure you're not opening multiple tabs during login
2. Check that cookies are enabled
3. Clear browser storage and try again

## Security Considerations

- Tokens are stored in memory (sessionStorage as fallback)
- PKCE (Proof Key for Code Exchange) is used for authorization
- Silent renewal happens automatically before token expiration
- Session monitoring detects logout from IdP
- All sensitive routes are protected with route guards

## Learn More

- [OIDC Client Documentation](../../README.md)
- [React Router Documentation](https://reactrouter.com/)
- [OpenID Connect Specification](https://openid.net/connect/)
- [OAuth 2.0 RFC](https://tools.ietf.org/html/rfc6749)

## License

MIT
