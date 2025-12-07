# Vanilla JavaScript SPA Example

A complete single-page application built with vanilla JavaScript demonstrating OIDC authentication.

## Features

✅ **No Framework Required** - Pure vanilla JavaScript
✅ **Complete Auth Flow** - Login, logout, token refresh
✅ **Protected Routes** - Client-side navigation with auth guards
✅ **User Profile** - Display user information and claims
✅ **API Testing** - Test authenticated API calls with bearer tokens
✅ **Auto Token Refresh** - Silent token renewal before expiration
✅ **Session Monitoring** - Track auth state across browser tabs
✅ **Responsive Design** - Works on desktop and mobile

## Files

- `index.html` - Main application page
- `app.js` - Application logic and OIDC integration
- `styles.css` - Styling
- `callback.html` - OAuth callback handler
- `silent-renew.html` - Silent token renewal page

## Quick Start

### 1. Configure Your Identity Provider

Edit `app.js` and update the configuration:

```javascript
const config = {
  authority: 'https://your-idp.com',
  client_id: 'your-client-id',
  redirect_uri: `${window.location.origin}/callback.html`,
  post_logout_redirect_uri: `${window.location.origin}/`,
  silent_redirect_uri: `${window.location.origin}/silent-renew.html`,
  response_type: 'code',
  scope: 'openid profile email',
  automaticSilentRenew: true,
};
```

### 2. Serve the Application

You need a local web server to run this example (file:// protocol won't work due to CORS).

**Option 1: Python**
```bash
# Python 3
python -m http.server 8080

# Python 2
python -m SimpleHTTPServer 8080
```

**Option 2: Node.js**
```bash
npx http-server -p 8080
```

**Option 3: VS Code**
Install the "Live Server" extension and click "Go Live"

### 3. Configure Your Identity Provider

In your IdP (Auth0, Keycloak, Okta, etc.), configure:

- **Redirect URI**: `http://localhost:8080/callback.html`
- **Logout URI**: `http://localhost:8080/`
- **Silent Renew URI**: `http://localhost:8080/silent-renew.html`
- **Allowed Origins**: `http://localhost:8080`

### 4. Test the Application

1. Open `http://localhost:8080` in your browser
2. Click "Sign In"
3. Authenticate with your IdP
4. Get redirected back to the app
5. View your profile
6. Test authenticated API calls

## Application Structure

### Main Application (index.html + app.js)

The app uses a simple SPA routing system:
- Home page with feature overview
- Profile page showing user information
- API Test page for testing authenticated requests

### Authentication Flow

```
1. User clicks "Sign In"
   ↓
2. Redirected to Identity Provider
   ↓
3. User authenticates
   ↓
4. Redirected to callback.html with auth code
   ↓
5. callback.html exchanges code for tokens
   ↓
6. Redirected back to main app
   ↓
7. User is logged in
```

### Token Refresh Flow

```
1. Token approaching expiration (60s before)
   ↓
2. Silent renew triggered
   ↓
3. Hidden iframe loads silent-renew.html
   ↓
4. New token obtained without user interaction
   ↓
5. User session continues seamlessly
```

## API Testing

The API Test page allows you to test authenticated API calls. It automatically:
- Adds the `Authorization: Bearer <token>` header
- Handles different HTTP methods (GET, POST, PUT, DELETE)
- Displays response headers and body
- Shows formatted JSON responses

### Example Test URLs

Test with these public APIs:
- `https://jsonplaceholder.typicode.com/users/1` (GET)
- `https://jsonplaceholder.typicode.com/posts` (GET)

For real API testing, use your own backend that validates JWT tokens.

## Customization

### Styling

All styles are in `styles.css`. The design uses a modern, clean aesthetic with:
- CSS Grid for layouts
- Flexbox for navigation
- Custom animations
- Responsive breakpoints

### Navigation

Add new pages by:

1. Create a template in `index.html`:
```html
<template id="my-page-template">
  <div class="page my-page">
    <h2>My Page</h2>
    <!-- Your content -->
  </div>
</template>
```

2. Add render function in `app.js`:
```javascript
function renderMyPage() {
  const template = document.getElementById('my-page-template');
  return template.content.cloneNode(true);
}
```

3. Update `updatePageContent()`:
```javascript
case 'my-page':
  content = renderMyPage();
  break;
```

4. Add navigation link:
```html
<a href="#my-page" class="nav-link" data-page="my-page">My Page</a>
```

## Security Notes

✅ **PKCE Flow** - Uses Authorization Code flow with PKCE
✅ **Token Storage** - Tokens stored in browser storage (sessionStorage by default)
✅ **Auto Cleanup** - Tokens cleared on logout
✅ **Silent Refresh** - Automatic token renewal without user interaction

⚠️ **Production Considerations**:
- Use HTTPS in production
- Implement Content Security Policy (CSP)
- Consider using httpOnly cookies for tokens (requires backend)
- Validate tokens on your backend
- Implement rate limiting

## Troubleshooting

### "Login failed" or redirect errors
- Check that redirect URIs match exactly in your IdP configuration
- Ensure your app is served over HTTP (not file://)
- Check browser console for detailed errors

### Silent renew not working
- Verify `silent-renew.html` is accessible at the configured URL
- Check that your IdP supports iframe-based silent renewal
- Some IdPs require specific settings for silent auth

### CORS errors
- Ensure your IdP allows your origin in CORS settings
- Check that all URLs use the same protocol (http/https)

### Token not refreshing
- Verify `automaticSilentRenew: true` in config
- Check that your IdP issued a refresh token
- Ensure `offline_access` scope is requested if needed

## Browser Compatibility

✅ Modern browsers (Chrome, Firefox, Safari, Edge)
✅ ES6 Modules required
⚠️ IE11 not supported (use transpilation if needed)

## Production Deployment

1. **Build Process**: Minify JavaScript and CSS
2. **Environment Config**: Use environment variables for IdP settings
3. **HTTPS**: Always use HTTPS in production
4. **CSP Headers**: Implement Content Security Policy
5. **Error Tracking**: Add error monitoring (Sentry, etc.)

## Next Steps

- Try the [React Example](../react-example/) for a framework-based approach
- Check [Security Best Practices](../security/) for production guidance
- Review [API Examples](../api-examples/) for backend integration patterns
