# OIDC Client Usage Examples

This directory contains comprehensive, production-ready examples for integrating the OIDC client library into real-world applications.

## 📚 Available Examples

### 1. Framework Examples

#### [Vanilla JavaScript SPA](./vanilla-spa/)
Complete single-page application with no framework dependencies.

**Features:**
- ✅ Pure vanilla JavaScript (ES6+)
- ✅ Client-side routing
- ✅ User profile display
- ✅ API testing interface
- ✅ Responsive design
- ✅ Auto token refresh
- ✅ Session monitoring

**Perfect for:**
- Learning OIDC basics
- Lightweight applications
- Framework-agnostic projects
- Understanding core concepts

[📖 View Full Example](./vanilla-spa/)

---

#### [Vue 3 Example](./vue-demo/)
Complete working Vue 3 application with Composition API and Vite.

**Features:**
- ✅ Composition API with `useAuth()` composable
- ✅ Vue Router integration with auth guards
- ✅ Automatic token renewal
- ✅ Session monitoring
- ✅ Login/Logout with redirect and popup modes
- ✅ Protected routes
- ✅ User profile and API testing pages
- ✅ Ready to run with `npm install && npm run dev`

**Perfect for:**
- Single Page Applications (SPA)
- Progressive Web Apps (PWA)
- Vue 3 + TypeScript projects (easily convertible)

[📖 View Full Example](./vue-demo/)

---

#### [React Example](./react-example/)
Modern React implementation with hooks and context API.

**Features:**
- ✅ React Hooks (useState, useEffect, useContext)
- ✅ Context API for global auth state
- ✅ React Router protected routes
- ✅ Custom `useAuth()` hook
- ✅ TypeScript ready
- ✅ Error boundaries

**Perfect for:**
- React 18+ applications
- Next.js projects
- TypeScript React apps

[📖 View Full Example](./react-example/)

---

### 2. Implementation Guides

#### [Making Authenticated API Calls](./api-examples/)
Complete guide for calling APIs with bearer tokens.

**Covered Topics:**
- ✅ Basic fetch with authentication
- ✅ HTTP client wrapper (fetch & axios)
- ✅ Automatic token refresh on 401
- ✅ Request/response interceptors
- ✅ Error handling patterns
- ✅ GraphQL integration
- ✅ Backend token validation
- ✅ Testing authenticated requests

[📖 View Full Guide](./api-examples/)

---

#### [Identity Provider Configurations](./provider-configs/)
Step-by-step setup for popular IdPs.

**Providers Covered:**
- ✅ Auth0
- ✅ Keycloak (local & production)
- ✅ Okta
- ✅ Azure AD / Microsoft
- ✅ Google Identity
- ✅ AWS Cognito
- ✅ Custom OIDC providers

[📖 View Full Guide](./provider-configs/)

---

#### [Advanced Features](./advanced-features/)
Advanced authentication patterns and techniques.

**Covered Topics:**
- ✅ Popup login/logout
- ✅ Silent authentication
- ✅ Session monitoring across tabs
- ✅ Multiple identity providers
- ✅ Custom state management
- ✅ Token introspection
- ✅ Logout strategies
- ✅ Cross-tab synchronization

[📖 View Full Guide](./advanced-features/)

---

#### [Security Best Practices](./security/)
Essential security guidelines for production.

**Covered Topics:**
- ✅ Protocol security (PKCE, scopes)
- ✅ Token storage strategies
- ✅ HTTPS & transport security
- ✅ Content Security Policy (CSP)
- ✅ XSS & CSRF prevention
- ✅ Backend token validation
- ✅ Security headers
- ✅ Common vulnerabilities
- ✅ Security monitoring

[📖 View Full Guide](./security/)

---

## 🚀 Quick Start for Local Testing

### 1. Link the OIDC Client Package

In the oidc-client root directory:
```bash
cd /path/to/oidc-client
npm link
```

### 2. Try the Vanilla JavaScript Example

```bash
cd examples/vanilla-spa

# Serve with Python
python -m http.server 8080

# OR with Node.js
npx http-server -p 8080

# OR with VS Code Live Server extension
```

Then visit `http://localhost:8080`

### 3. Configure Your Identity Provider

Edit `app.js` and update:
```javascript
const config = {
  authority: 'https://your-idp.com',
  client_id: 'your-client-id',
  // ...
};
```

### 4. Test the Authentication Flow

1. Click "Sign In"
2. Authenticate with your IdP
3. View your profile
4. Test API calls
5. Try logout

---

## 🔧 Local Identity Provider Setup

### Option 1: Keycloak (Recommended for local testing)

```bash
# Start Keycloak in Docker
docker run -p 8080:8080 \
  -e KEYCLOAK_ADMIN=admin \
  -e KEYCLOAK_ADMIN_PASSWORD=admin \
  quay.io/keycloak/keycloak:latest start-dev
```

**Setup steps:**
1. Access `http://localhost:8080`
2. Login with admin/admin
3. Create a new realm (e.g., "demo")
4. Create a client:
   - Client ID: `my-app`
   - Client Protocol: `openid-connect`
   - Access Type: `public`
   - Valid Redirect URIs: `http://localhost:8080/*`
   - Web Origins: `http://localhost:8080`
5. Create a test user with credentials

**Configuration:**
```javascript
const config = {
  authority: 'http://localhost:8080/realms/demo',
  client_id: 'my-app',
  redirect_uri: 'http://localhost:8080/callback.html',
  // ...
};
```

### Option 2: Cloud Providers (Free Tiers)

- **Auth0**: https://auth0.com
- **Okta**: https://developer.okta.com
- **Azure AD B2C**: https://azure.microsoft.com

See [Provider Configurations](./provider-configs/) for detailed setup.

---

## 📖 Learning Path

### Beginner
1. Start with [Vanilla JavaScript Example](./vanilla-spa/)
2. Configure [Keycloak locally](./provider-configs/)
3. Review [Security Basics](./security/)

### Intermediate
1. Choose your framework ([Vue](./vue-demo/) or [React](./react-example/))
2. Implement [Authenticated API Calls](./api-examples/)
3. Explore [Advanced Features](./advanced-features/)

### Production
1. Review all [Security Best Practices](./security/)
2. Configure production IdP
3. Implement monitoring and logging
4. Perform security audit

---

## 🐛 Troubleshooting

### CORS Issues
- Ensure your app's origin is whitelisted in IdP settings
- Check "Allowed Origins" and "Web Origins" settings

### Redirect Loop
- Verify redirect URIs match exactly (including trailing slashes)
- Check HTTP vs HTTPS protocol consistency

### Token Not Refreshing
- Ensure `automaticSilentRenew: true`
- Verify `silent-renew.html` is accessible
- Check if IdP supports iframe-based silent auth

### Import Errors (Local Development)
```bash
# In oidc-client directory
npm link

# In your app directory
npm link oidc-client
```

### Module Not Found
- Verify import paths match your project structure
- Check that `oidc-client` is in your `package.json`
- Try `npm install` again

---

## 💡 Tips & Best Practices

1. **Start Simple**: Begin with the vanilla JavaScript example
2. **Test Locally**: Use Keycloak Docker for easy local testing
3. **Security First**: Review security guide before production
4. **Token Validation**: Always validate tokens on your backend
5. **Error Handling**: Implement comprehensive error handling
6. **Monitoring**: Log authentication events for security

---

## 🤝 Contributing Examples

Have an example for another framework or use case? Contributions welcome!

1. Create a new directory with your example
2. Include a comprehensive README.md
3. Add working code snippets
4. Include setup and troubleshooting sections
5. Submit a Pull Request

---

## 📞 Need Help?

- Review the specific example READMEs
- Check the main [project README](../README.md)
- Browse [Security Best Practices](./security/)
- File an issue on GitHub

---

## 📦 Example Structure

```
examples/
├── README.md (this file)
├── vanilla-spa/          # Vanilla JS example
├── vue-demo/             # Vue 3 working app
├── react-example/        # React example
├── api-examples/         # API integration guide
├── provider-configs/     # IdP setup guides
├── advanced-features/    # Advanced patterns
└── security/             # Security best practices
```
