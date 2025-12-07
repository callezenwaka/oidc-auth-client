// OIDC Configuration
// Update these values with your Identity Provider settings

export const oidcConfig = {
  // Identity Provider
  authority: 'http://localhost:8080/realms/demo',  // Change to your IdP
  client_id: 'react-demo',  // Change to your client ID

  // Redirect URIs
  redirect_uri: `${window.location.origin}/callback`,
  post_logout_redirect_uri: `${window.location.origin}/`,
  silent_redirect_uri: `${window.location.origin}/silent-renew.html`,

  // OAuth/OIDC Settings
  response_type: 'code',
  scope: 'openid profile email',

  // Token Management
  automaticSilentRenew: true,
  accessTokenExpiringNotificationTime: 60,

  // Session Monitoring
  monitorSession: true,
  checkSessionInterval: 2000,

  // Security
  filterProtocolClaims: true,
  loadUserInfo: true,
}

// Environment-specific configuration
if (import.meta.env.PROD) {
  // Production settings
  oidcConfig.authority = 'https://your-production-idp.com'
  oidcConfig.client_id = 'production-client-id'
  oidcConfig.redirect_uri = 'https://your-app.com/callback'
  oidcConfig.post_logout_redirect_uri = 'https://your-app.com/'
  oidcConfig.silent_redirect_uri = 'https://your-app.com/silent-renew.html'
}
